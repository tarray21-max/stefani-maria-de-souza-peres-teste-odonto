/** Aplica máscara de CNPJ: XX.XXX.XXX/XXXX-XX */
export function formatCNPJ(raw: string | null | undefined): string {
  if (!raw) return "";
  const d = String(raw).replace(/\D/g, "").slice(0, 14);
  const parts = [
    d.slice(0, 2),
    d.slice(2, 5),
    d.slice(5, 8),
    d.slice(8, 12),
    d.slice(12, 14),
  ];
  let out = parts[0];
  if (d.length > 2) out += "." + parts[1];
  if (d.length > 5) out += "." + parts[2];
  if (d.length > 8) out += "/" + parts[3];
  if (d.length > 12) out += "-" + parts[4];
  return out;
}

/** Aplica máscara de telefone BR: (XX) XXXX-XXXX ou (XX) XXXXX-XXXX */
export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return "";
  const d = String(raw).replace(/\D/g, "").slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
