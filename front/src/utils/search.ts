// Busca pela ORDEM das letras digitadas: o nome (ou qualquer palavra dele)
// deve COMEÇAR com o texto buscado. Assim, digitar "A" não traz "CAMISA"
// (que tem 'a' no meio), mas traz "AVENTAL"; digitar "POLO" traz
// "CAMISA POLO BRANCA" (palavra que começa com "polo").
export function matchPrefixo(nome: string | null | undefined, query: string): boolean {
  const q = (query || "").toLowerCase().trim();
  if (!q) return false;
  const n = (nome || "").toLowerCase();
  return n.startsWith(q) || n.split(/\s+/).some((p) => p.startsWith(q));
}
