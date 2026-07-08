import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useClients, contractLabel, type ClientRow } from "@/lib/client-context";
import { CHECKLIST, CATEGORIES, type Category } from "@/lib/checklist-data";
import { formatCNPJ, formatPhone } from "@/lib/format";
import { SERVICOS_TCLE_POP, serviceSlug } from "@/lib/services-data";
import { toast } from "sonner";

const CATEGORY_LABEL: Record<Category, string> = {
  documentacao: "Documentação",
  infraestrutura: "Infraestrutura",
  procedimentos: "Procedimentos",
  higienizacao: "Higienização",
  cme: "CME",
  tcle_pop: "TCLE × POP",
};

const STATUS_LABEL: Record<string, string> = { sim: "Sim", nao: "Não", na: "N/A" };
const QUALITY_LABEL: Record<string, string> = { bom: "Bom", ruim: "Ruim" };

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",;\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCSV(headers: string[], rows: (string | number | null)[][]): string {
  const lines = [headers.map(csvEscape).join(";")];
  for (const r of rows) lines.push(r.map(csvEscape).join(";"));
  // BOM para Excel abrir com acentuação correta
  return "\ufeff" + lines.join("\r\n");
}

function enderecoFull(c: ClientRow): string {
  return [
    [c.logradouro, c.numero].filter(Boolean).join(", "),
    c.complemento,
    c.bairro,
    [c.cidade, c.estado].filter(Boolean).join(" / "),
    c.cep ? `CEP ${c.cep}` : null,
  ].filter(Boolean).join(" — ");
}

function especialidadesFull(c: ClientRow): string {
  const esps = (c.especialidades ?? []).map((e, i) => {
    const n = (c.especialidades_numeros ?? [])[i];
    return n ? `${e} (${n})` : e;
  });
  return esps.join(" | ");
}

interface FetchedClient {
  responses: Array<Record<string, unknown>>;
  customItems: Array<Record<string, unknown>>;
  overrides: Array<Record<string, unknown>>;
  disabled: string[];
  matrixItems: Array<Record<string, unknown>>;
}

async function fetchClientData(clientId: string): Promise<FetchedClient> {
  const [r, c, o, d, m] = await Promise.all([
    supabase.from("responses").select("item_id, answer, quality, justification, validity_date, validity_indeterminate").eq("client_id", clientId),
    supabase.from("custom_items").select("id, category, title, weight, norma, observacao").eq("client_id", clientId),
    supabase.from("item_overrides").select("item_id, title, weight, norma, observacao").eq("client_id", clientId),
    supabase.from("disabled_items").select("item_id").eq("client_id", clientId),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from("service_matrix_items").select("id, name, is_default, default_key, disabled, norma, observacao, position").eq("client_id", clientId),
  ]);
  return {
    responses: (r.data ?? []) as Array<Record<string, unknown>>,
    customItems: (c.data ?? []) as Array<Record<string, unknown>>,
    overrides: (o.data ?? []) as Array<Record<string, unknown>>,
    disabled: ((d.data ?? []) as Array<{ item_id: string }>).map((x) => x.item_id),
    matrixItems: (m.data ?? []) as Array<Record<string, unknown>>,
  };
}

export function ExportAllDataButton() {
  const { clients } = useClients();
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    if (!clients.length) {
      toast.error("Nenhuma clínica cadastrada.");
      return;
    }
    setBusy(true);
    try {
      const headers = [
        "clinica_id", "clinica", "responsavel_tecnico", "cnpj", "contrato", "telefone", "endereco", "especialidades",
        "categoria", "item_id", "item_titulo", "norma", "peso",
        "status", "qualidade", "justificativa", "validade", "validade_indeterminada",
      ];
      const rows: (string | number | null)[][] = [];

      const all = await Promise.all(clients.map(async (c) => ({ client: c, data: await fetchClientData(c.id) })));

      for (const { client, data } of all) {
        const respMap = new Map<string, Record<string, unknown>>();
        for (const r of data.responses) respMap.set(r.item_id as string, r);
        const overrideMap = new Map<string, Record<string, unknown>>();
        for (const o of data.overrides) overrideMap.set(o.item_id as string, o);
        const disabledSet = new Set(data.disabled);

        const clientBase = [
          client.id,
          client.nome,
          client.profissional_responsavel ?? "",
          formatCNPJ(client.cnpj),
          contractLabel(client),
          formatPhone(client.telefone),
          enderecoFull(client),
          especialidadesFull(client),
        ];

        // 1) Itens padrão (checklist) — aplicando overrides e ignorando desabilitados
        for (const it of CHECKLIST) {
          if (disabledSet.has(it.id)) continue;
          const ov = overrideMap.get(it.id);
          const title = (ov?.title as string | null) ?? it.title;
          const norma = (ov?.norma as string | null) ?? it.norma ?? "";
          const weight = (ov?.weight as number | null) ?? it.weight;
          const r = respMap.get(it.id);
          rows.push([
            ...clientBase,
            CATEGORY_LABEL[it.category],
            it.id,
            title,
            norma,
            weight,
            r?.answer ? STATUS_LABEL[r.answer as string] ?? String(r.answer) : "",
            r?.quality ? QUALITY_LABEL[r.quality as string] ?? String(r.quality) : "",
            (r?.justification as string | null) ?? "",
            (r?.validity_date as string | null) ?? "",
            r?.validity_indeterminate ? "Sim" : "",
          ]);
        }

        // 2) Itens customizados
        for (const ci of data.customItems) {
          const itemId = `c_${ci.id}`;
          const r = respMap.get(itemId);
          const cat = ci.category as Category;
          rows.push([
            ...clientBase,
            CATEGORY_LABEL[cat] ?? String(cat),
            itemId,
            (ci.title as string) ?? "",
            (ci.norma as string | null) ?? "",
            (ci.weight as number) ?? 6,
            r?.answer ? STATUS_LABEL[r.answer as string] ?? String(r.answer) : "",
            r?.quality ? QUALITY_LABEL[r.quality as string] ?? String(r.quality) : "",
            (r?.justification as string | null) ?? "",
            (r?.validity_date as string | null) ?? "",
            r?.validity_indeterminate ? "Sim" : "",
          ]);
        }

        // 3) TCLE × POP (matriz de serviços) — defaults + customizados
        const matrixByDefault = new Map<string, Record<string, unknown>>();
        const disabledDefaults = new Set<string>();
        const customMatrix: Record<string, unknown>[] = [];
        for (const m of data.matrixItems) {
          if (m.is_default && m.default_key) {
            if (m.disabled) disabledDefaults.add(m.default_key as string);
            else matrixByDefault.set(m.default_key as string, m);
          } else if (!m.disabled) {
            customMatrix.push(m);
          }
        }

        const emitMatrix = (name: string, norma: string, tcleId: string, popId: string) => {
          for (const [kind, id] of [["TCLE", tcleId], ["POP", popId]] as const) {
            const r = respMap.get(id);
            rows.push([
              ...clientBase,
              `TCLE × POP — ${kind}`,
              id,
              name,
              norma,
              6,
              r?.answer ? STATUS_LABEL[r.answer as string] ?? String(r.answer) : "",
              r?.quality ? QUALITY_LABEL[r.quality as string] ?? String(r.quality) : "",
              (r?.justification as string | null) ?? "",
              (r?.validity_date as string | null) ?? "",
              r?.validity_indeterminate ? "Sim" : "",
            ]);
          }
        };

        for (const svc of SERVICOS_TCLE_POP) {
          const key = serviceSlug(svc);
          if (disabledDefaults.has(key)) continue;
          const ov = matrixByDefault.get(key);
          const name = (ov?.name as string) ?? svc;
          const norma = (ov?.norma as string | null) ?? "";
          emitMatrix(name, norma, `srv_tcle_${key}`, `srv_pop_${key}`);
        }
        for (const cm of customMatrix) {
          const id = cm.id as string;
          emitMatrix(
            (cm.name as string) ?? "",
            (cm.norma as string | null) ?? "",
            `srv_tcle_custom_${id}`,
            `srv_pop_custom_${id}`,
          );
        }
      }

      const csv = toCSV(headers, rows);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `maturidade-export-${stamp}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Exportadas ${clients.length} clínica(s) e ${rows.length} linhas.`);
    } catch (e) {
      console.error("[export] falhou", e);
      toast.error("Falha ao exportar dados.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={busy} title="Exportar todos os dados de todas as clínicas para CSV">
      {busy ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Download className="w-4 h-4 mr-1.5" />}
      Exportar todos os dados (CSV)
    </Button>
  );
}
