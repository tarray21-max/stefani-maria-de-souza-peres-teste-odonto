import { supabase } from "@/integrations/supabase/client";

/**
 * MESCLA a estrutura (perguntas customizadas, blocos, abas, ordens, itens desativados,
 * matriz de serviços e overrides) de uma clínica origem para várias clínicas destino,
 * SEM apagar dados já existentes no destino. As respostas (`responses`) da origem
 * são replicadas para os itens equivalentes do destino.
 *
 * Regras de merge:
 * - custom_items: combina por (category + título normalizado). Se já existir no destino,
 *   apenas preenche campos vazios (norma/observação/penalidade/risco/peso). Não sobrescreve.
 * - service_matrix_items: combina por default_key (defaults) ou (área + nome normalizado).
 *   Preserva norma/observação/categorias já preenchidas no destino.
 * - service_matrix_item_images: só copia para itens recém-criados (evita duplicar imagens).
 * - checklist_blocks: combina por (category + nome normalizado). Faz união dos item_ids
 *   (mantém os existentes e anexa novos no fim).
 * - item_overrides / item_positions / disabled_items: insere apenas quando ainda não existem
 *   no destino para aquele item_id.
 * - client_ui_prefs: só aplica quando o destino não tem preferências definidas.
 */
const norm = (s: unknown) => String(s ?? "").trim().toLowerCase();

export async function copyClientStructure(sourceId: string, targetIds: string[]) {
  if (!targetIds.length) return { copied: 0 };

  // 1. Origem
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

  const srcCustom = (customRes.data ?? []) as Array<Record<string, any>>;
  const srcBlocks = (blocksRes.data ?? []) as Array<Record<string, any>>;
  const srcOverrides = (overridesRes.data ?? []) as Array<Record<string, any>>;
  const srcPositions = (positionsRes.data ?? []) as Array<Record<string, any>>;
  const srcDisabled = (disabledRes.data ?? []) as Array<Record<string, any>>;
  const srcServiceMatrix = (smRes.data ?? []) as Array<Record<string, any>>;
  const srcSmImages = (smImgRes.data ?? []) as Array<{ item_id: string; path: string }>;
  const srcPrefs = (prefsRes.data ?? null) as { tab_labels?: any; tab_order?: any } | null;

  const imagesByItem = new Map<string, string[]>();
  for (const r of srcSmImages) {
    const arr = imagesByItem.get(r.item_id) ?? [];
    arr.push(r.path);
    imagesByItem.set(r.item_id, arr);
  }

  for (const targetId of targetIds) {
    // 2. Destino atual
    const [dCustomRes, dBlocksRes, dOverridesRes, dPositionsRes, dDisabledRes, dSmRes, dSmImgRes, dPrefsRes] = await Promise.all([
      supabase.from("custom_items").select("*").eq("client_id", targetId),
      supabase.from("checklist_blocks").select("*").eq("client_id", targetId),
      supabase.from("item_overrides").select("*").eq("client_id", targetId),
      supabase.from("item_positions").select("*").eq("client_id", targetId),
      supabase.from("disabled_items").select("item_id").eq("client_id", targetId),
      (supabase as any).from("service_matrix_items").select("*").eq("client_id", targetId),
      (supabase as any).from("service_matrix_item_images").select("item_id").eq("client_id", targetId),
      supabase.from("client_ui_prefs" as never).select("tab_labels, tab_order").eq("client_id", targetId).maybeSingle(),
    ]);

    const dstCustom = (dCustomRes.data ?? []) as Array<Record<string, any>>;
    const dstBlocks = (dBlocksRes.data ?? []) as Array<Record<string, any>>;
    const dstOverrides = (dOverridesRes.data ?? []) as Array<Record<string, any>>;
    const dstPositions = (dPositionsRes.data ?? []) as Array<Record<string, any>>;
    const dstDisabledSet = new Set(((dDisabledRes.data ?? []) as Array<{ item_id: string }>).map((d) => d.item_id));
    const dstServiceMatrix = (dSmRes.data ?? []) as Array<Record<string, any>>;
    const dstImagesSet = new Set(((dSmImgRes.data ?? []) as Array<{ item_id: string }>).map((d) => d.item_id));
    const dstPrefs = (dPrefsRes.data ?? null) as { tab_labels?: any; tab_order?: any } | null;

    // 3. Map de custom_items: origem → destino (id), mesclando por (category + título)
    const customKey = (c: Record<string, any>) => `${norm(c.category)}::${norm(c.title)}`;
    const dstCustomByKey = new Map(dstCustom.map((c) => [customKey(c), c]));
    const customIdMap = new Map<string, string>();
    const newCustomRows: Array<Record<string, any>> = [];
    const customPatches: Array<{ id: string; patch: Record<string, any> }> = [];

    for (const c of srcCustom) {
      const existing = dstCustomByKey.get(customKey(c));
      if (existing) {
        customIdMap.set(c.id, existing.id);
        const patch: Record<string, any> = {};
        for (const k of ["norma", "observacao", "penalidade"]) {
          if (!norm(existing[k]) && norm(c[k])) patch[k] = c[k];
        }
        if ((existing.weight ?? null) == null && c.weight != null) patch.weight = c.weight;
        if (!norm(existing.risco) && norm(c.risco)) patch.risco = c.risco;
        if (Object.keys(patch).length) customPatches.push({ id: existing.id, patch });
      } else {
        const newId = crypto.randomUUID();
        customIdMap.set(c.id, newId);
        newCustomRows.push({
          id: newId, client_id: targetId,
          category: c.category, title: c.title, weight: c.weight,
          norma: c.norma, observacao: c.observacao, penalidade: c.penalidade, risco: c.risco,
        });
      }
    }

    // 4. service_matrix_items: por default_key (defaults) ou (area + nome)
    const smKey = (s: Record<string, any>) =>
      s.is_default && s.default_key ? `dk::${s.default_key}` : `nm::${norm(s.area)}::${norm(s.name)}`;
    const dstSmByKey = new Map(dstServiceMatrix.map((s) => [smKey(s), s]));
    const smIdMap = new Map<string, string>();
    const newServiceMatrix: Array<Record<string, any>> = [];
    const smPatches: Array<{ id: string; patch: Record<string, any> }> = [];
    const newlyCreatedSm = new Set<string>();

    for (const s of srcServiceMatrix) {
      const existing = dstSmByKey.get(smKey(s));
      if (existing) {
        smIdMap.set(s.id, existing.id);
        const patch: Record<string, any> = {};
        if (!norm(existing.norma) && norm(s.norma)) patch.norma = s.norma;
        if (!norm(existing.observacao) && norm(s.observacao)) patch.observacao = s.observacao;
        const existCats: string[] = Array.isArray(existing.categories) ? existing.categories : [];
        const srcCats: string[] = Array.isArray(s.categories) ? s.categories : [];
        if (existCats.length === 0 && srcCats.length > 0) patch.categories = srcCats;
        if (Object.keys(patch).length) smPatches.push({ id: existing.id, patch });
      } else {
        const newId = crypto.randomUUID();
        smIdMap.set(s.id, newId);
        newlyCreatedSm.add(s.id);
        newServiceMatrix.push({
          id: newId, client_id: targetId,
          name: s.name, area: s.area, categories: s.categories ?? [],
          position: s.position, disabled: s.disabled,
          default_key: s.default_key, is_default: s.is_default,
          norma: s.norma ?? "", observacao: s.observacao ?? "",
        });
      }
    }

    const remapItemId = (id: string): string => {
      if (typeof id !== "string") return id;
      if (id.startsWith("c_")) {
        const orig = id.slice(2);
        const next = customIdMap.get(orig);
        return next ? `c_${next}` : id;
      }
      const serviceCustomMatch = id.match(/^srv_(tcle|pop)_custom_(.+)$/);
      if (serviceCustomMatch) {
        const [, kind, orig] = serviceCustomMatch;
        const next = smIdMap.get(orig);
        return next ? `srv_${kind}_custom_${next}` : id;
      }
      const sm = smIdMap.get(id);
      return sm ?? id;
    };

    // 5. Blocos: merge por (category + nome)
    const blockKey = (b: Record<string, any>) => `${norm(b.category)}::${norm(b.name)}`;
    const dstBlocksByKey = new Map(dstBlocks.map((b) => [blockKey(b), b]));
    const newBlocks: Array<Record<string, any>> = [];
    const blockPatches: Array<{ id: string; item_ids: string[] }> = [];

    for (const b of srcBlocks) {
      const remappedIds = ((b.item_ids as string[]) ?? []).map(remapItemId);
      const existing = dstBlocksByKey.get(blockKey(b));
      if (existing) {
        const existIds: string[] = Array.isArray(existing.item_ids) ? existing.item_ids : [];
        const merged = [...existIds];
        for (const id of remappedIds) if (!merged.includes(id)) merged.push(id);
        if (merged.length !== existIds.length) blockPatches.push({ id: existing.id, item_ids: merged });
      } else {
        newBlocks.push({
          id: crypto.randomUUID(),
          client_id: targetId,
          category: b.category,
          name: b.name,
          position: b.position,
          item_ids: remappedIds,
        });
      }
    }

    // 6. Overrides: só insere se destino não tiver; preenche campos vazios se tiver
    const dstOverridesByItem = new Map(dstOverrides.map((o) => [o.item_id, o]));
    const newOverrides: Array<Record<string, any>> = [];
    const overridePatches: Array<{ item_id: string; patch: Record<string, any> }> = [];
    for (const o of srcOverrides) {
      const existing = dstOverridesByItem.get(o.item_id);
      if (existing) {
        const patch: Record<string, any> = {};
        for (const k of ["title", "norma", "observacao", "penalidade", "risco"]) {
          if (!norm(existing[k]) && norm(o[k])) patch[k] = o[k];
        }
        if ((existing.weight ?? null) == null && o.weight != null) patch.weight = o.weight;
        if (Object.keys(patch).length) overridePatches.push({ item_id: o.item_id, patch });
      } else {
        newOverrides.push({
          client_id: targetId, item_id: o.item_id,
          title: o.title, weight: o.weight, norma: o.norma,
          observacao: o.observacao, penalidade: o.penalidade, risco: o.risco,
        });
      }
    }

    // 7. Positions: só insere para itens que ainda não têm posição no destino
    const dstPositionItems = new Set(dstPositions.map((p) => p.item_id));
    const newPositions = srcPositions
      .map((p) => ({ client_id: targetId, item_id: remapItemId(p.item_id), position: p.position }))
      .filter((p) => !dstPositionItems.has(p.item_id));

    // 8. Disabled items: união
    const newDisabled = srcDisabled
      .map((d) => ({ client_id: targetId, item_id: d.item_id }))
      .filter((d) => !dstDisabledSet.has(d.item_id));

    // 9. Aplicar inserts
    if (newCustomRows.length) await supabase.from("custom_items").insert(newCustomRows as never);
    if (newServiceMatrix.length) await (supabase as any).from("service_matrix_items").insert(newServiceMatrix);
    if (newBlocks.length) await supabase.from("checklist_blocks").insert(newBlocks as never);
    if (newOverrides.length) await supabase.from("item_overrides").insert(newOverrides as never);
    if (newPositions.length) await supabase.from("item_positions").insert(newPositions as never);
    if (newDisabled.length) await supabase.from("disabled_items").insert(newDisabled as never);

    // 9b. Aplicar patches (preencher campos vazios)
    for (const { id, patch } of customPatches) {
      await supabase.from("custom_items").update(patch as never).eq("id", id);
    }
    for (const { id, patch } of smPatches) {
      await (supabase as any).from("service_matrix_items").update(patch).eq("id", id);
    }
    for (const { id, item_ids } of blockPatches) {
      await supabase.from("checklist_blocks").update({ item_ids } as never).eq("id", id);
    }
    for (const { item_id, patch } of overridePatches) {
      await supabase.from("item_overrides").update(patch as never).eq("client_id", targetId).eq("item_id", item_id);
    }

    // 10. Imagens: copiar apenas para itens recém-criados (evita duplicar)
    for (const [oldItemId, paths] of imagesByItem.entries()) {
      if (!newlyCreatedSm.has(oldItemId)) continue;
      const newItemId = smIdMap.get(oldItemId);
      if (!newItemId || dstImagesSet.has(newItemId)) continue;
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

    // 10b. Respostas: replicar todas as respostas da origem para o destino (upsert).
    //      item_ids customizados/matriz são remapeados para os novos IDs no destino.
    const { data: srcResponses, error: srcResponsesError } = await supabase
      .from("responses")
      .select("item_id, answer, quality, justification, validity_date, validity_indeterminate")
      .eq("client_id", sourceId);
    if (srcResponsesError) throw srcResponsesError;
    const responseRows = ((srcResponses ?? []) as Array<Record<string, any>>).map((r) => ({
      client_id: targetId,
      item_id: remapItemId(r.item_id as string),
      answer: r.answer,
      quality: r.quality,
      justification: r.justification,
      validity_date: r.validity_date,
      validity_indeterminate: r.validity_indeterminate,
    }));
    if (responseRows.length) {
      const chunk = 500;
      for (let i = 0; i < responseRows.length; i += chunk) {
        const { error } = await supabase
          .from("responses")
          .upsert(responseRows.slice(i, i + chunk) as never, { onConflict: "client_id,item_id" });
        if (error) throw error;
      }
    }

    // 11. UI prefs: aplicar somente se o destino não tem preferências ainda
    if (srcPrefs && !dstPrefs) {
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
