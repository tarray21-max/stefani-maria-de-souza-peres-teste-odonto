import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ClientInput = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().trim().min(1).max(200),
  cnpj: z.string().trim().max(32).optional().nullable(),
  profissional_responsavel: z.string().trim().max(200).optional().nullable(),
  area: z.enum(["odontologia", "medicina"]),
  especialidade: z.string().trim().max(200).optional().nullable(),
  endereco: z.string().trim().max(500).optional().nullable(),
  telefone: z.string().trim().max(40).optional().nullable(),
  tipo_contrato: z.enum(["assessoria_odontologica", "regularizacao_sanitaria"]),
});

export const listClients = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return { clients: data ?? [] };
  });

export const upsertClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => ClientInput.parse(v))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.id) {
      const { data: row, error } = await supabase
        .from("clients")
        .update({
          nome: data.nome,
          cnpj: data.cnpj ?? null,
          profissional_responsavel: data.profissional_responsavel ?? null,
          area: data.area,
          especialidade: data.especialidade ?? null,
          endereco: data.endereco ?? null,
          telefone: data.telefone ?? null,
          tipo_contrato: data.tipo_contrato,
        })
        .eq("id", data.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return { client: row };
    }
    const { data: row, error } = await supabase
      .from("clients")
      .insert({
        owner_id: userId,
        nome: data.nome,
        cnpj: data.cnpj ?? null,
        profissional_responsavel: data.profissional_responsavel ?? null,
        area: data.area,
        especialidade: data.especialidade ?? null,
        endereco: data.endereco ?? null,
        telefone: data.telefone ?? null,
        tipo_contrato: data.tipo_contrato,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { client: row };
  });

export const getResponses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ clientId: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("responses")
      .select("item_id, answer, quality, justification")
      .eq("client_id", data.clientId);
    if (error) throw new Error(error.message);
    return { responses: rows ?? [] };
  });

const SaveResponse = z.object({
  clientId: z.string().uuid(),
  itemId: z.string().min(1).max(200),
  answer: z.enum(["sim", "nao", "na"]).nullable(),
  quality: z.enum(["bom", "ruim"]).nullable(),
  justification: z.string().max(4000).nullable(),
});

export const saveResponse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => SaveResponse.parse(v))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("responses").upsert(
      {
        client_id: data.clientId,
        item_id: data.itemId,
        answer: data.answer,
        quality: data.quality,
        justification: data.justification,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "client_id,item_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const resetResponses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) =>
    z
      .object({
        clientId: z.string().uuid(),
        justification: z.string().trim().min(20).max(2000),
      })
      .parse(v),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error: logError } = await supabase.from("reset_log").insert({
      client_id: data.clientId,
      user_id: userId,
      justification: data.justification,
    });
    if (logError) throw new Error(logError.message);
    const { error } = await supabase
      .from("responses")
      .delete()
      .eq("client_id", data.clientId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
