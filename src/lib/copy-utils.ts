import { supabase } from "@/integrations/supabase/client";

/* ===================== Service Matrix (TCLE×POP) ===================== */

async function copyServiceImages(sourceItemId: string, targetItemId: string, targetClientId: string) {
  const { data } = await (supabase as any)
    .from("service_matrix_item_images")
    .select("path")
    .eq("item_id", sourceItemId);
  const rows = (data ?? []) as { path: string }[];
  for (const r of rows) {
    try {
      // Download original and re-upload under new path (so each row has its own object)
      const dl = await supabase.storage.from("checklist-images").download(r.path);
      if (dl.error || !dl.data) continue;
      const ext = r.path.split(".").pop() || "bin";
      const newPath = `${targetClientId}/service-items/${targetItemId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const up = await supabase.storage.from("checklist-images").upload(newPath, dl.data, { upsert: false, contentType: dl.data.type });
      if (up.error) continue;
      await (supabase as any).from("service_matrix_item_images").insert({
        client_id: targetClientId, item_id: targetItemId, path: newPath,
      });
    } catch { /* ignore individual image failures */ }
  }
}

/** Copies a service matrix item (as a NEW custom row) into target client. Returns new uuid. */
export async function copyServiceItem(opts: {
  sourceItemId: string;
  targetClientId: string;
  targetBlockId?: string | null;
}): Promise<string> {
  const { sourceItemId, targetClientId, targetBlockId } = opts;
  const { data: src, error } = await (supabase as any)
    .from("service_matrix_items")
    .select("name,area,categories,norma,observacao")
    .eq("id", sourceItemId)
    .maybeSingle();
  if (error) throw error;
  if (!src) throw new Error("Procedimento de origem não encontrado.");

  // Compute next position in target
  const { data: maxRow } = await (supabase as any)
    .from("service_matrix_items")
    .select("position")
    .eq("client_id", targetClientId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextPos = ((maxRow?.position as number | undefined) ?? -1) + 1;

  const newName = src.name as string;
  const { data: inserted, error: insErr } = await (supabase as any)
    .from("service_matrix_items")
    .insert({
      client_id: targetClientId,
      name: newName,
      area: src.area ?? "ambas",
      categories: src.categories ?? [],
      is_default: false,
      default_key: null,
      disabled: false,
      position: nextPos,
      norma: src.norma ?? "",
      observacao: src.observacao ?? "",
    })
    .select("id")
    .single();
  if (insErr) throw insErr;
  const newId = inserted.id as string;

  // Copy images (best effort)
  await copyServiceImages(sourceItemId, newId, targetClientId);

  // Optionally attach to a target block
  if (targetBlockId) {
    const { data: blk } = await (supabase as any)
      .from("checklist_blocks")
      .select("item_ids")
      .eq("id", targetBlockId)
      .maybeSingle();
    const ids = (blk?.item_ids ?? []) as string[];
    if (!ids.includes(newId)) {
      await (supabase as any)
        .from("checklist_blocks")
        .update({ item_ids: [...ids, newId] })
        .eq("id", targetBlockId);
    }
  }
  return newId;
}

/** Copy an entire service-matrix block (and its items) into target client. */
export async function copyServiceBlock(opts: {
  sourceBlockId: string;
  targetClientId: string;
  category: string;
}): Promise<void> {
  const { sourceBlockId, targetClientId, category } = opts;
  const { data: blk, error } = await (supabase as any)
    .from("checklist_blocks")
    .select("name,item_ids")
    .eq("id", sourceBlockId)
    .maybeSingle();
  if (error) throw error;
  if (!blk) throw new Error("Bloco não encontrado.");

  // Determine next block position in target
  const { data: posRow } = await (supabase as any)
    .from("checklist_blocks")
    .select("position")
    .eq("client_id", targetClientId)
    .eq("category", category)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextPos = ((posRow?.position as number | undefined) ?? -1) + 1;

  const newBlockId = (typeof crypto !== "undefined" && "randomUUID" in crypto)
    ? crypto.randomUUID()
    : `b_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const newIds: string[] = [];
  for (const itemId of (blk.item_ids ?? []) as string[]) {
    try {
      const id = await copyServiceItem({ sourceItemId: itemId, targetClientId });
      newIds.push(id);
    } catch { /* skip on failure */ }
  }

  await (supabase as any).from("checklist_blocks").insert({
    id: newBlockId,
    client_id: targetClientId,
    category,
    name: `${blk.name as string} (cópia)`,
    item_ids: newIds,
    position: nextPos,
  });
}

/* ===================== Checklist ===================== */

async function copyChecklistImages(sourceItemId: string, targetItemId: string, targetClientId: string) {
  const { data } = await supabase
    .from("item_images")
    .select("path")
    .eq("item_id", sourceItemId);
  const rows = (data ?? []) as { path: string }[];
  for (const r of rows) {
    try {
      const dl = await supabase.storage.from("checklist-images").download(r.path);
      if (dl.error || !dl.data) continue;
      const ext = r.path.split(".").pop() || "jpg";
      const newPath = `${targetClientId}/${targetItemId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const up = await supabase.storage.from("checklist-images").upload(newPath, dl.data, { upsert: false, contentType: dl.data.type });
      if (up.error) continue;
      await supabase.from("item_images").insert({ client_id: targetClientId, item_id: targetItemId, path: newPath });
    } catch { /* ignore */ }
  }
}

/**
 * Copia uma pergunta do checklist:
 *  - se for customizada (`c_<uuid>`): cria nova `custom_items` no destino.
 *  - se for padrão: remove de `disabled_items` no destino (basta "habilitá-la") e
 *    copia o override (se existir) para o destino.
 * Em ambos os casos, anexa ao bloco destino se informado.
 * Retorna o `item_id` final no destino.
 */
export async function copyChecklistItem(opts: {
  sourceItemId: string;
  sourceClientId: string;
  targetClientId: string;
  category: string;
  targetBlockId?: string | null;
}): Promise<string> {
  const { sourceItemId, sourceClientId, targetClientId, category, targetBlockId } = opts;
  let finalId = sourceItemId;

  if (sourceItemId.startsWith("c_")) {
    const customId = sourceItemId.slice(2);
    const { data: src, error } = await supabase
      .from("custom_items")
      .select("title,weight,norma,observacao,penalidade,risco,category")
      .eq("id", customId)
      .maybeSingle();
    if (error) throw error;
    if (!src) throw new Error("Pergunta de origem não encontrada.");
    const { data: inserted, error: insErr } = await supabase
      .from("custom_items")
      .insert({
        client_id: targetClientId,
        category: (src as any).category ?? category,
        title: (src as any).title,
        weight: (src as any).weight ?? 6,
        norma: (src as any).norma,
        observacao: (src as any).observacao,
        penalidade: (src as any).penalidade,
        risco: (src as any).risco,
      })
      .select("id")
      .single();
    if (insErr) throw insErr;
    finalId = `c_${(inserted as { id: string }).id}`;
    await copyChecklistImages(sourceItemId, finalId, targetClientId);
  } else {
    // Default item: ensure not disabled at target, copy override if present
    await supabase.from("disabled_items").delete().eq("client_id", targetClientId).eq("item_id", sourceItemId);
    const { data: ov } = await supabase
      .from("item_overrides")
      .select("title,weight,norma,observacao,penalidade,risco")
      .eq("client_id", sourceClientId)
      .eq("item_id", sourceItemId)
      .maybeSingle();
    if (ov) {
      await supabase.from("item_overrides").upsert({
        client_id: targetClientId,
        item_id: sourceItemId,
        ...(ov as object),
      }, { onConflict: "client_id,item_id" });
    }
    await copyChecklistImages(sourceItemId, sourceItemId, targetClientId);
    finalId = sourceItemId;
  }

  if (targetBlockId) {
    const { data: blk } = await (supabase as any)
      .from("checklist_blocks")
      .select("item_ids")
      .eq("id", targetBlockId)
      .maybeSingle();
    const ids = (blk?.item_ids ?? []) as string[];
    if (!ids.includes(finalId)) {
      await (supabase as any).from("checklist_blocks").update({ item_ids: [...ids, finalId] }).eq("id", targetBlockId);
    }
  }
  return finalId;
}

/** Copia um bloco inteiro do checklist (cria novo bloco no destino e copia cada pergunta). */
export async function copyChecklistBlock(opts: {
  sourceBlockId: string;
  sourceClientId: string;
  targetClientId: string;
  category: string;
}): Promise<void> {
  const { sourceBlockId, sourceClientId, targetClientId, category } = opts;
  const { data: blk, error } = await (supabase as any)
    .from("checklist_blocks")
    .select("name,item_ids")
    .eq("id", sourceBlockId)
    .maybeSingle();
  if (error) throw error;
  if (!blk) throw new Error("Bloco não encontrado.");

  const { data: posRow } = await (supabase as any)
    .from("checklist_blocks")
    .select("position")
    .eq("client_id", targetClientId)
    .eq("category", category)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextPos = ((posRow?.position as number | undefined) ?? -1) + 1;

  const newBlockId = (typeof crypto !== "undefined" && "randomUUID" in crypto)
    ? crypto.randomUUID()
    : `b_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const newIds: string[] = [];
  for (const itemId of (blk.item_ids ?? []) as string[]) {
    try {
      const id = await copyChecklistItem({ sourceItemId: itemId, sourceClientId, targetClientId, category });
      newIds.push(id);
    } catch { /* skip */ }
  }

  await (supabase as any).from("checklist_blocks").insert({
    id: newBlockId,
    client_id: targetClientId,
    category,
    name: `${blk.name as string} (cópia)`,
    item_ids: newIds,
    position: nextPos,
  });
}

/* ===================== Helpers ===================== */

export interface BlockOption { id: string; name: string }

export async function listBlocks(clientId: string, category: string): Promise<BlockOption[]> {
  const { data } = await (supabase as any)
    .from("checklist_blocks")
    .select("id,name,position")
    .eq("client_id", clientId)
    .eq("category", category)
    .order("position", { ascending: true });
  return ((data ?? []) as { id: string; name: string }[]).map((r) => ({ id: r.id, name: r.name }));
}
