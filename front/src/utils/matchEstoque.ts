// Forma mínima de um item de estoque aceita pelas funções de cruzamento.
type EstoqueLike = { name: string; size?: string | null; quantity?: number };

// Normaliza para comparação: sem acentos, maiúsculas, espaços únicos.
function normaliza(s: string | null | undefined): string {
  return (s || "")
    .normalize("NFD")
    .replace(/\p{Mn}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const GEN_M = ["MASCULINO", "MASCULINA"];
const GEN_F = ["FEMININO", "FEMININA"];
// Conectores ignorados no casamento (podem não existir no nome do estoque).
const STOP = new Set(["OU", "DE", "DA", "DO", "E", "COM"]);

// Detecta o gênero embutido no nome do item de estoque (ou null se for unissex).
function generoDoItem(nomeNorm: string): "M" | "F" | null {
  const palavras = nomeNorm.split(" ");
  if (GEN_M.some((g) => palavras.includes(g))) return "M";
  if (GEN_F.some((g) => palavras.includes(g))) return "F";
  return null;
}

// ============================================================================
// Cruza o nome GENÉRICO de um item de kit (ex: "CAMISA SOCIAL PRETA") com os
// itens REAIS do estoque (ex: "CAMISA SOCIAL FEMININA PRETA PP"), considerando:
//   1) todas as PALAVRAS do kit presentes no nome do estoque (match por token
//      exato — "CALÇA" não casa com "CALÇADO");
//   2) TAMANHO (coluna size do estoque == tamanho do funcionário);
//   3) GÊNERO — se o nome do estoque indica gênero, tem que bater com o do
//      funcionário; itens sem gênero no nome são unissex e sempre passam.
// ============================================================================
export function casarItensKit<T extends EstoqueLike>(
  kitNome: string,
  estoque: T[],
  opts: { tamanho?: string | number | null; genero?: string | null } = {}
): T[] {
  const tokensKit = normaliza(kitNome).split(" ").filter((t) => t && !STOP.has(t));
  if (tokensKit.length === 0) return [];
  const tam = opts.tamanho != null && opts.tamanho !== "" ? normaliza(String(opts.tamanho)) : null;
  const genero = opts.genero ? String(opts.genero).toUpperCase() : null;

  return estoque.filter((item) => {
    const nome = normaliza(item.name);
    const palavras = nome.split(" ");

    // 1) todas as palavras do kit presentes (como palavra inteira)
    if (!tokensKit.every((t) => palavras.includes(t))) return false;

    // 2) tamanho
    if (tam && normaliza(String(item.size ?? "")) !== tam) return false;

    // 3) gênero
    const g = generoDoItem(nome);
    if (g && genero && g !== genero) return false;

    return true;
  });
}

// Retorna o melhor candidato (ou null). Prioriza o que tem gênero explícito
// igual ao do funcionário e, em empate, o de maior estoque.
export function melhorItemKit<T extends EstoqueLike>(
  kitNome: string,
  estoque: T[],
  opts: { tamanho?: string | number | null; genero?: string | null } = {}
): T | null {
  const candidatos = casarItensKit(kitNome, estoque, opts);
  if (candidatos.length === 0) return null;
  const genero = opts.genero ? String(opts.genero).toUpperCase() : null;
  return candidatos.sort((a, b) => {
    const ga = generoDoItem(normaliza(a.name)) === genero ? 1 : 0;
    const gb = generoDoItem(normaliza(b.name)) === genero ? 1 : 0;
    if (ga !== gb) return gb - ga;
    return (b.quantity || 0) - (a.quantity || 0);
  })[0];
}
