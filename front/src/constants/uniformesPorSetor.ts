// uniformesPorSetor.ts
// Gerado automaticamente a partir da planilha UNIFORME_E_EPIS_POR_SETOR.xlsx
// Fonte: RH / Almoxarifado — Hiper Comercial Monlevade

export interface ItemUniforme {
  nome: string;
  qtde: number;
  ca?: string; // Certificado de Aprovação (EPIs)
}

export interface KitSetor {
  epis: ItemUniforme[];
  uniformes: ItemUniforme[];
}

export const UNIFORMES_POR_SETOR: Record<string, KitSetor> = {
  "APRENDIZ": {
    epis: [
      { nome: "CALÇADO TIPO BOTINA VULCAFLEX", qtde: 1, ca: "43377" },
    ],
    uniformes: [],
  },
  "FRENTE DE CAIXA": {
    epis: [
      { nome: "CALÇADO PRETO 50F61", qtde: 1, ca: "47110" },
      { nome: "CALÇADO TIPO BOTINA VULCAFLEX", qtde: 1, ca: "43377" },
    ],
    uniformes: [
      { nome: "CAMISA", qtde: 3 },
      { nome: "CALÇA", qtde: 2 },
      { nome: "MOLETON", qtde: 1 },
    ],
  },
  "ATENDENTE DO SETOR DE FRIOS": {
    epis: [
      { nome: "AVENTAL TRANSPARENTE", qtde: 1, ca: "16553" },
      { nome: "JAPONA BRANCA", qtde: 2, ca: "28160" },
      { nome: "CALÇADO STICK SHOE W.BRANCO", qtde: 1, ca: "39848" },
      { nome: "BOTA BRANCA COTURNO", qtde: 1, ca: "32163" },
      { nome: "CALÇA PARA FRIO", qtde: 1, ca: "28157" },
      { nome: "CAPUZ OU BALACLAVA", qtde: 1, ca: "10979" },
      { nome: "LUVA MALHA DE AÇO", qtde: 1, ca: "12203" },
      { nome: "LUVA PARA FRIO", qtde: 1, ca: "41784" },
      { nome: "MEIAO BRANCO", qtde: 2 },
    ],
    uniformes: [
      { nome: "CAMISA", qtde: 3 },
      { nome: "CALÇA", qtde: 2 },
      { nome: "MOLETON", qtde: 1 },
      { nome: "TOUCA TELADA PRETA", qtde: 2 },
      { nome: "AVENTAL SUBLIMADO", qtde: 1 },
    ],
  },
  "REPOSITOR DE FRIOS": {
    epis: [
      { nome: "BOTA BRANCA COTURNO", qtde: 1, ca: "32163" },
      { nome: "JAPONA BRANCA", qtde: 1, ca: "28160" },
      { nome: "CALÇA PARA FRIO", qtde: 2, ca: "28157" },
      { nome: "CAPUZ OU BALACLAVA", qtde: 2, ca: "10979" },
      { nome: "LUVA PARA FRIO", qtde: 2, ca: "41784" },
      { nome: "MEIAO BRANCO", qtde: 2 },
    ],
    uniformes: [
      { nome: "CAMISA", qtde: 3 },
      { nome: "CALÇA", qtde: 2 },
      { nome: "MOLETON", qtde: 1 },
    ],
  },
  "HORTIFRUTI": {
    epis: [
      { nome: "CALÇADO PRETO 50F61", qtde: 1, ca: "47110" },
      { nome: "CALÇADO TIPO BOTINA VULCAFLEX", qtde: 1, ca: "43377" },
      { nome: "LUVA MALHA DE AÇO", qtde: 1, ca: "13764" },
    ],
    uniformes: [
      { nome: "CAMISA", qtde: 3 },
      { nome: "CALÇA", qtde: 2 },
      { nome: "MOLETON", qtde: 1 },
      { nome: "BONE VERDE", qtde: 2 },
    ],
  },
  "LIMPEZA": {
    epis: [
      { nome: "AVENTAL TRANSPARENTE", qtde: 1, ca: "16553" },
      { nome: "CALÇADO STICKY", qtde: 1, ca: "39848" },
      { nome: "BOTA CANO LONGO MARLUVAS", qtde: 1, ca: "40754" },
      { nome: "LUVA NITRILICA VERDE", qtde: 1, ca: "32069" },
      { nome: "ÓCULOS DE PROTEÇÃO", qtde: 1, ca: "6136" },
      { nome: "LUVA NITRILICA AZUL", qtde: 1, ca: "42997" },
      { nome: "MASCARA COM VALVULA", qtde: 1 },
    ],
    uniformes: [
      { nome: "CAMISA", qtde: 3 },
      { nome: "CALÇA", qtde: 2 },
      { nome: "MOLETON", qtde: 1 },
      { nome: "TOUCA TELADA PRETA", qtde: 2 },
    ],
  },
  "MANUTENÇÃO": {
    epis: [
      { nome: "CALÇADO TIPO BOTINA MARLUVAS", qtde: 1, ca: "41419" },
      { nome: "LUVA DE RASPA", qtde: 1, ca: "36843" },
      { nome: "MANGOTE DE RASPA", qtde: 1 },
      { nome: "MASCARA DE SOLDA", qtde: 1, ca: "6135" },
      { nome: "ÓCULOS DE PROTEÇÃO", qtde: 1, ca: "6136" },
      { nome: "PROTETOR AUDITIVO", qtde: 1, ca: "5745" },
      { nome: "RESPIRADOR COM VALVULA PFF2", qtde: 1, ca: "5657" },
      { nome: "AVENTAL DE RASPA", qtde: 1 },
      { nome: "LUVA DE VAQUETA", qtde: 1, ca: "11711" },
    ],
    uniformes: [
      { nome: "CAMISA", qtde: 3 },
      { nome: "CALÇA", qtde: 2 },
      { nome: "MOLETON", qtde: 1 },
    ],
  },
  "PADARIA": {
    epis: [
      { nome: "AVENTAL TERMICO RIO VALLEY", qtde: 1, ca: "37995" },
      { nome: "AVENTAL TRANSPARENTE", qtde: 1, ca: "16553" },
      { nome: "SAPATO STICKY SHOE BRANCO", qtde: 1, ca: "39848" },
      { nome: "LUVA TERMICA KOMBAT", qtde: 1, ca: "39334" },
      { nome: "MANGOTE LONA", qtde: 1, ca: "38734" },
      { nome: "JAPONA BRANCA", qtde: 1, ca: "28160" },
      { nome: "BOTA BRANCA COTURNO", qtde: 1, ca: "32163" },
      { nome: "CALÇA PARA FRIO", qtde: 1, ca: "28157" },
      { nome: "CAPUZ OU BALACLAVA", qtde: 1, ca: "10979" },
      { nome: "LUVA PARA FRIO", qtde: 1, ca: "41784" },
      { nome: "MEIAO BRANCO", qtde: 1 },
    ],
    uniformes: [
      { nome: "CAMISA", qtde: 3 },
      { nome: "CALÇA", qtde: 3 },
      { nome: "MOLETON", qtde: 1 },
      { nome: "TOUCA TELADA BRANCA", qtde: 2 },
    ],
  },
  "REPOSIÇÃO": {
    epis: [
      { nome: "CALÇADO PRETO 50F61", qtde: 1, ca: "47110" },
      { nome: "CALÇADO TIPO BOTINA MARLUVAS", qtde: 1, ca: "41419" },
      { nome: "ESTILETE PROFISSIONAL 18MM", qtde: 1 },
    ],
    uniformes: [
      { nome: "CAMISA", qtde: 3 },
      { nome: "CALÇA", qtde: 3 },
      { nome: "MOLETON", qtde: 1 },
    ],
  },
  "RECICLAGEM": {
    epis: [
      { nome: "AVENTAL TRANSPARENTE", qtde: 1, ca: "16553" },
      { nome: "CALÇADO TIPO BOTINA VULCAFLEX", qtde: 1, ca: "43377" },
      { nome: "LUVA DE VAQUETA PROCIPA", qtde: 1, ca: "11711" },
    ],
    uniformes: [
      { nome: "CAMISA", qtde: 3 },
      { nome: "CALÇA", qtde: 3 },
      { nome: "MOLETON", qtde: 1 },
    ],
  },
  "SUSHI": {
    epis: [
      { nome: "CALÇADO STICKY", qtde: 1, ca: "39848" },
      { nome: "JAPONA BRANCA", qtde: 1, ca: "28160" },
      { nome: "BOTA BRANCA COTURNO", qtde: 1, ca: "32163" },
      { nome: "CALÇA PARA FRIO", qtde: 1, ca: "28157" },
      { nome: "CAPUZ OU BALACLAVA", qtde: 1, ca: "10979" },
      { nome: "LUVA PARA FRIO", qtde: 1, ca: "41784" },
      { nome: "MEIAO BRANCO", qtde: 1 },
    ],
    uniformes: [
      { nome: "DOLMA", qtde: 3 },
      { nome: "CALÇA", qtde: 3 },
      { nome: "MOLETON", qtde: 1 },
    ],
  },
  "TRANSPORTE": {
    epis: [
      { nome: "CALÇADO TIPO BOTINA MARLUVAS", qtde: 1, ca: "41419" },
      { nome: "JAPONA NYLON AZUL", qtde: 1, ca: "28160" },
      { nome: "PROTETOR SOLAR", qtde: 1 },
    ],
    uniformes: [
      { nome: "CAMISA", qtde: 3 },
      { nome: "CALÇA", qtde: 2 },
      { nome: "MOLETON", qtde: 1 },
    ],
  },
  "SEGURANÇA": {
    epis: [
      { nome: "CALÇADO PRETO 50F61", qtde: 1, ca: "47110" },
      { nome: "CALÇADO TIPO BOTINA VULCAFLEX", qtde: 1, ca: "43377" },
      { nome: "PROTETOR SOLAR", qtde: 1 },
    ],
    uniformes: [
      { nome: "CAMISA", qtde: 3 },
      { nome: "CALÇA", qtde: 2 },
      { nome: "MOLETON", qtde: 1 },
      { nome: "COLETE", qtde: 2 },
      { nome: "BONE", qtde: 2 },
    ],
  },
  "DEPOSITO": {
    epis: [
      { nome: "CALÇADO TIPO BOTINA MARLUVAS", qtde: 1, ca: "41419" },
      { nome: "ESTILETE PROFISSIONAL 18MM", qtde: 1 },
    ],
    uniformes: [
      { nome: "CAMISA", qtde: 3 },
      { nome: "CALÇA", qtde: 2 },
      { nome: "MOLETON", qtde: 1 },
    ],
  },
  "AÇOUGUE": {
    epis: [
      { nome: "AVENTAL TRANSPARENTE", qtde: 1, ca: "42326" },
      { nome: "JAPONA BRANCA", qtde: 1, ca: "28160" },
      { nome: "BOTA BRANCA COTURNO", qtde: 1, ca: "32163" },
      { nome: "CALÇA PARA FRIO", qtde: 1, ca: "28157" },
      { nome: "BOTA CANO LONGO MARLUVAS", qtde: 1, ca: "40754" },
      { nome: "LUVA MALHA DE AÇO", qtde: 1, ca: "13764" },
      { nome: "CAPUZ OU BALACLAVA", qtde: 1, ca: "10979" },
      { nome: "LUVA PARA FRIO", qtde: 1, ca: "41784" },
      { nome: "MEIAO BRANCO", qtde: 1 },
      { nome: "AVENTAL MALHA DE AÇO", qtde: 1 },
    ],
    uniformes: [
      { nome: "CAMISA", qtde: 3 },
      { nome: "CALÇA", qtde: 3 },
      { nome: "MOLETON", qtde: 1 },
      { nome: "BONE BRANCO", qtde: 2 },
    ],
  },
  "HIPERLANCHES": {
    epis: [
      { nome: "CALÇADO STICKY SHOE PRETO", qtde: 1, ca: "39848" },
      { nome: "LUVA MALHA DE AÇO", qtde: 1, ca: "13764" },
      { nome: "AVENTAL TERMICO KOMBAT", qtde: 2, ca: "27624" },
      { nome: "AVENTAL TRANSPARENTE", qtde: 1, ca: "16553" },
      { nome: "LUVA TÉRMICA GRAFATEX", qtde: 2, ca: "37292" },
      { nome: "JAPONA BRANCA", qtde: 1, ca: "28160" },
      { nome: "BOTA BRANCA COTURNO", qtde: 1, ca: "32163" },
      { nome: "CALÇA PARA FRIO", qtde: 1, ca: "28157" },
      { nome: "CAPUZ OU BALACLAVA", qtde: 1, ca: "10979" },
      { nome: "LUVA PARA FRIO", qtde: 1, ca: "41784" },
      { nome: "MEIAO BRANCO", qtde: 1 },
    ],
    uniformes: [
      { nome: "CAMISA", qtde: 3 },
      { nome: "CALÇA", qtde: 2 },
      { nome: "MOLETON", qtde: 1 },
      { nome: "TOUCA TELADA PRETA", qtde: 2 },
    ],
  },
};

// Retorna os setores disponíveis em ordem alfabética
export const SETORES_DISPONIVEIS = Object.keys(UNIFORMES_POR_SETOR).sort();