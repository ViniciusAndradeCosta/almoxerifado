// Configurações centrais das regras de negócio do almoxarifado.
// Mudar o valor aqui reflete em todo o sistema.

export const LIMITE_DIAS_SAIDA = 20; // retroatividade máxima da data de saída (em dias)

// ===== CONFIGURAÇÕES DE SUGESTÃO DE PEDIDO (Bloco 5) =====
export const JANELA_ANALISE_DIAS = 90;          // Período de análise do consumo (em dias)
export const MESES_COBERTURA_PADRAO = 3;        // Para quantos meses o estoque deve cobrir
export const MESES_COBERTURA_ESCRITORIO = 1;    // Cobertura para itens de ESCRITORIO
export const MESES_COBERTURA_LIMPEZA = 1;       // Cobertura para itens de LIMPEZA
export const FATOR_ATENCAO = 1.5;              // Multiplicador da margem para nível ATENÇÃO (ex: margem 30 × 1.5 = aviso em 45)