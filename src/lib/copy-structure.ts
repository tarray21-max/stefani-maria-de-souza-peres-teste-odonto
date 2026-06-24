import { supabase } from "@/integrations/supabase/client";

/**
 * Copia a estrutura (perguntas customizadas, blocos, abas, ordens, itens desativados,
 * matriz de serviços e overrides) de uma clínica origem para várias clínicas destino,
 * SEM tocar nas respostas (`responses`).
 *
 * Estratégia: para cada tabela, deleta os registros do destino e reinsere copiando
 * da origem (com novos UUIDs onde for PK). Respostas permanecem porque usam `item_id`
 * (que mapeamos para novos UUIDs nas perguntas customizadas — então respostas a
 * perguntas customizadas SÃO perdidas no destino; as respostas a itens padrão
 * permanecem).
 */
export async function copyClientStructure(sourceId: string, targetIds: string[]) {
  if (!targetIds.length) return { copied: 0 };

  // 1. Buscar tudo da origem
  const [customRes, blocksRes, overridesRes, positionsRes, disabledRes, smRes, smImgRes, prefsRes] = await Promise.all([
    supabase.from("custom_items").select("*").eq("client_id", sourceId),
    supabase.from("checklist_blocks").select("*").eq("client_id", sourceId),
    supabase.from("item_overrides").select("*").eq("client_id", sourceId),
    supabase.from("item_positions").select("*").eq("client_id", sourceId),
    supabase.from("disabled_items").select("*").eq("client_id", sourceId),
    (supabase as any).from("service_matrix_items").select("*").eq("client_id", sourceId),
    (supabase as any).from("service_matrix_item_images").select("item_id,path").eq("client_id", sourceId),
    supabase.from("client_ui_prefs" as never).select("tab_labels, tab_order").eq("client_id", sourceId).maybeSingle(),
  ]);

  const srcCustom = (customRes.data ?? []) as Array<Record<string, unknown>>;
  const srcBlocks = (blocksRes.data ?? []) as Array<Record<string, unknown>>;
  const srcOverrides = (overridesRes.data ?? []) as Array<Record<string, unknown>>;
  const srcPositions = (positionsRes.data ?? []) as Array<Record<string, unknown>>;
  const srcDisabled = (disabledRes.data ?? []) as Array<Record<string, unknown>>;
  const srcServiceMatrix = (smRes.data ?? []) as Array<Record<string, unknown>>;
  const srcSmImages = (smImgRes.data ?? []) as Array<{ item_id: string; path: string }>;
  const srcPrefs = (prefsRes.data ?? null) as { tab_labels?: unknown; tab_order?: unknown } | null;

  const imagesByItem = new Map<string, string[]>();
  for (const r of srcSmImages) {
    const arr = imagesByItem.get(r.item_id) ?? [];
    arr.push(r.path);
    imagesByItem.set(r.item_id, arr);
  }

  for (const targetId of targetIds) {
    // 2. Mapear custom_items antigo → novo
    const customIdMap = new Map<string, string>();
    const newCustomRows = srcCustom.map((c) => {
      const newId = crypto.randomUUID();
      customIdMap.set(c.id as string, newId);
      return {
        id: newId,
        client_id: targetId,
        category: c.category,
        title: c.title,
        weight: c.weight,
        norma: c.norma,
        observacao: c.observacao,
        penalidade: c.penalidade,
        risco: c.risco,
      };
    });

    // Mapeia service_matrix_items antigo → novo (UUIDs gerados aqui)
    const smIdMap = new Map<string, string>();
    const newServiceMatrix = srcServiceMatrix.map((s) => {
      const newId = crypto.randomUUID();
      smIdMap.set(s.id as string, newId);
      return {
        id: newId,
        client_id: targetId,
        name: s.name,
        area: s.area,
        categories: s.categories ?? [],
        position: s.position,
        disabled: s.disabled,
        default_key: s.default_key,
        is_default: s.is_default,
        norma: s.norma ?? "",
        observacao: s.observacao ?? "",
      };
    });

    // 3. Reescrever item_ids em blocks (custom_items e service_matrix_items)
    const remapItemId = (id: string): string => {
      if (id.startsWith("c_")) {
        const orig = id.slice(2);
        const next = customIdMap.get(orig);
        return next ? `c_${next}` : id;
      }
      const sm = smIdMap.get(id);
      if (sm) return sm;
      return id;
    };
    const newBlocks = srcBlocks.map((b) => ({
      id: crypto.randomUUID(),
      client_id: targetId,
      category: b.category,
      name: b.name,
      position: b.position,
      item_ids: ((b.item_ids as string[]) ?? []).map(remapItemId),
    }));

    const newPositions = srcPositions.map((p) => ({
      client_id: targetId,
      item_id: remapItemId(p.item_id as string),
      position: p.position,
    }));

    const newDisabled = srcDisabled.map((d) => ({
      client_id: targetId,
      item_id: d.item_id,
    }));

    const newOverrides = srcOverrides.map((o) => ({
      client_id: targetId,
      item_id: o.item_id,
      title: o.title, weight: o.weight, norma: o.norma,
      observacao: o.observacao, penalidade: o.penalidade, risco: o.risco,
    }));

    // 4. Limpar destino (estrutura — não responses)
    await Promise.all([
      supabase.from("custom_items").delete().eq("client_id", targetId),
      supabase.from("checklist_blocks").delete().eq("client_id", targetId),
      supabase.from("item_overrides").delete().eq("client_id", targetId),
      supabase.from("item_positions").delete().eq("client_id", targetId),
      supabase.from("disabled_items").delete().eq("client_id", targetId),
      (supabase as any).from("service_matrix_item_images").delete().eq("client_id", targetId),
      (supabase as any).from("service_matrix_items").delete().eq("client_id", targetId),
    ]);

    // 5. Inserir cópias
    if (newCustomRows.length) await supabase.from("custom_items").insert(newCustomRows as never);
    if (newServiceMatrix.length) await (supabase as any).from("service_matrix_items").insert(newServiceMatrix);
    if (newBlocks.length) await supabase.from("checklist_blocks").insert(newBlocks as never);
    if (newOverrides.length) await supabase.from("item_overrides").insert(newOverrides as never);
    if (newPositions.length) await supabase.from("item_positions").insert(newPositions as never);
    if (newDisabled.length) await supabase.from("disabled_items").insert(newDisabled as never);

    // 5b. Copiar imagens dos itens da matriz (download + reupload)
    for (const [oldItemId, paths] of imagesByItem.entries()) {
      const newItemId = smIdMap.get(oldItemId);
      if (!newItemId) continue;
      for (const path of paths) {
        try {
          const dl = await supabase.storage.from("checklist-images").download(path);
          if (dl.error || !dl.data) continue;
          const ext = path.split(".").pop() || "bin";
          const newPath = `${targetId}/service-items/${newItemId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          const up = await supabase.storage.from("checklist-images").upload(newPath, dl.data, { upsert: false, contentType: dl.data.type });
          if (up.error) continue;
          await (supabase as any).from("service_matrix_item_images").insert({
            client_id: targetId, item_id: newItemId, path: newPath,
          });
        } catch { /* ignore */ }
      }
    }

    // 6. UI prefs
    if (srcPrefs) {
      await supabase.from("client_ui_prefs" as never).upsert({
        client_id: targetId,
        tab_labels: srcPrefs.tab_labels ?? {},
        tab_order: srcPrefs.tab_order ?? [],
        updated_at: new Date().toISOString(),
      } as never, { onConflict: "client_id" });
    }
  }

  return { copied: targetIds.length };
}
