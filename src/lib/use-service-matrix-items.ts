import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SERVICOS_TCLE_POP, serviceSlug } from "@/lib/services-data";

export type ServiceArea = "medica" | "odontologica" | "ambas";

export type ServiceCategory =
  | "medicos"
  | "cirurgioes_dentistas"
  | "cirurgioes_dentistas_especialistas"
  | "biomedicos"
  | "farmaceuticos"
  | "enfermeiros"
  | "fisioterapeutas";

export const SERVICE_CATEGORY_OPTIONS: { value: ServiceCategory; label: string }[] = [
  { value: "medicos", label: "Médicos" },
  { value: "cirurgioes_dentistas", label: "Cirurgiões-dentistas" },
  { value: "cirurgioes_dentistas_especialistas", label: "Cirurgiões-dentistas especialistas" },
  { value: "biomedicos", label: "Biomédicos" },
  { value: "farmaceuticos", label: "Farmacêuticos" },
  { value: "enfermeiros", label: "Enfermeiros" },
  { value: "fisioterapeutas", label: "Fisioterapeutas" },
];

export const SERVICE_CATEGORY_LABELS: Record<ServiceCategory, string> = Object.fromEntries(
  SERVICE_CATEGORY_OPTIONS.map((o) => [o.value, o.label]),
) as Record<ServiceCategory, string>;

export interface ServiceMatrixItem {
  id: string;
  name: string;
  area: ServiceArea;
  categories: ServiceCategory[];
  isDefault: boolean;
  defaultKey: string | null;
  position: number;
}

interface ServiceMatrixRow {
  id: string;
  name: string;
  area: ServiceArea;
  categories: string[] | null;
  is_default: boolean;
  default_key: string | null;
  disabled: boolean;
  position: number;
}

const defaultItems = SERVICOS_TCLE_POP.map((name, index): ServiceMatrixItem => ({
  id: `default:${serviceSlug(name)}`,
  name,
  area: "ambas",
  categories: [],
  isDefault: true,
  defaultKey: serviceSlug(name),
  position: index,
}));

export function serviceAnswerId(kind: "tcle" | "pop", item: ServiceMatrixItem) {
  return item.isDefault && item.defaultKey ? `srv_${kind}_${item.defaultKey}` : `srv_${kind}_custom_${item.id}`;
}

export function useServiceMatrixItems(clientId: string | null) {
  const [rows, setRows] = useState<ServiceMatrixRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    if (!clientId) { setRows([]); setLoaded(true); return; }
    const { data, error } = await (supabase as any)
      .from("service_matrix_items")
      .select("id,name,area,categories,is_default,default_key,disabled,position")
      .eq("client_id", clientId)
      .order("position", { ascending: true });
    if (!error) setRows((data ?? []) as ServiceMatrixRow[]);
    setLoaded(true);
  }, [clientId]);

  useEffect(() => {
    refresh();
    if (!clientId) return;
    const ch = supabase
      .channel(`service-matrix-${clientId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "service_matrix_items", filter: `client_id=eq.${clientId}` }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [clientId, refresh]);

  const items = useMemo(() => {
    const byDefault = new Map(rows.filter((r) => r.is_default && r.default_key).map((r) => [r.default_key!, r]));
    const mergedDefaults = defaultItems.flatMap((item) => {
      const override = item.defaultKey ? byDefault.get(item.defaultKey) : undefined;
      if (override?.disabled) return [];
      return [{
        ...item,
        id: override?.id ?? item.id,
        name: override?.name ?? item.name,
        area: override?.area ?? item.area,
        categories: (override?.categories ?? []) as ServiceCategory[],
        position: override?.position ?? item.position,
      }];
    });
    const custom = rows
      .filter((r) => !r.is_default && !r.disabled)
      .map((r): ServiceMatrixItem => ({
        id: r.id,
        name: r.name,
        area: r.area,
        categories: (r.categories ?? []) as ServiceCategory[],
        isDefault: false,
        defaultKey: null,
        position: r.position,
      }));
    return [...mergedDefaults, ...custom].sort((a, b) => a.position - b.position || a.name.localeCompare(b.name, "pt-BR"));
  }, [rows]);

  const addItem = useCallback(async (name: string, categories: ServiceCategory[]) => {
    if (!clientId) throw new Error("Cadastre uma clínica.");
    const maxPosition = items.reduce((max, item) => Math.max(max, item.position), -1);
    const { error } = await (supabase as any).from("service_matrix_items").insert({
      client_id: clientId,
      name,
      area: "ambas",
      categories,
      is_default: false,
      position: maxPosition + 1,
    });
    if (error) throw error;
    await refresh();
  }, [clientId, items, refresh]);

  const updateItem = useCallback(async (item: ServiceMatrixItem, name: string, categories: ServiceCategory[]) => {
    if (!clientId) throw new Error("Cadastre uma clínica.");
    const payload = item.isDefault
      ? { id: item.id.startsWith("default:") ? undefined : item.id, client_id: clientId, name, area: item.area, categories, is_default: true, default_key: item.defaultKey, disabled: false, position: item.position }
      : { id: item.id, client_id: clientId, name, area: item.area, categories, is_default: false, default_key: null, disabled: false, position: item.position };
    const { error } = await (supabase as any).from("service_matrix_items").upsert(payload, { onConflict: item.isDefault ? "client_id,default_key" : "id" });
    if (error) throw error;
    await refresh();
  }, [clientId, refresh]);

  const deleteItem = useCallback(async (item: ServiceMatrixItem) => {
    if (!clientId) throw new Error("Cadastre uma clínica.");
    const error = item.isDefault
      ? (await (supabase as any).from("service_matrix_items").upsert({
          id: item.id.startsWith("default:") ? undefined : item.id,
          client_id: clientId,
          name: item.name,
          area: item.area,
          categories: item.categories,
          is_default: true,
          default_key: item.defaultKey,
          disabled: true,
          position: item.position,
        }, { onConflict: "client_id,default_key" })).error
      : (await (supabase as any).from("service_matrix_items").delete().eq("id", item.id)).error;
    if (error) throw error;
    await refresh();
  }, [clientId, refresh]);

  const reorderItems = useCallback(async (orderedItems: ServiceMatrixItem[]) => {
    if (!clientId) return;
    const rowsToSave = orderedItems.map((item, position) => ({
      id: item.id.startsWith("default:") ? undefined : item.id,
      client_id: clientId,
      name: item.name,
      area: item.area,
      categories: item.categories,
      is_default: item.isDefault,
      default_key: item.defaultKey,
      disabled: false,
      position,
    }));
    const defaultRows = rowsToSave.filter((row) => row.is_default);
    const customRows = rowsToSave.filter((row) => !row.is_default);
    if (defaultRows.length) {
      const { error } = await (supabase as any).from("service_matrix_items").upsert(defaultRows, { onConflict: "client_id,default_key" });
      if (error) throw error;
    }
    if (customRows.length) {
      const { error } = await (supabase as any).from("service_matrix_items").upsert(customRows, { onConflict: "id" });
      if (error) throw error;
    }
    await refresh();
  }, [clientId, refresh]);

  return { items, loaded, refresh, addItem, updateItem, deleteItem, reorderItems };
}
