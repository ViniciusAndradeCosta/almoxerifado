import fs from "fs";
import pdfParse from "pdf-parse/lib/pdf-parse.js";

// Extrai fornecedor, número da NF, data de emissão e itens de um PDF de DANFE/NF-e.
// Testado com o layout real: todo o conteúdo de cada item aparece em UMA ÚNICA LINHA
// após extração por pdf-parse:
//   "2000000000003 BLUSA DE MOLETOM 61052000 0102 5101 UN 145,000 68,00 9.860,00 ..."
export async function extrairDadosNotaFiscal(filePath) {
  const resultado = {
    supplier: null,
    invoiceNumber: null,
    invoiceDate: null,
    itens: [],
    confidence: {},
  };

  try {
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer);
    const texto = pdfData.text;

    // textoLimpo: usado para campos simples (número, data, fornecedor)
    const textoLimpo = texto.replace(/\s+/g, " ").trim();

    resultado.textoCompleto = texto.slice(0, 3000); // para debug

    // ── Número da NF-e ──
    // Na NF real aparece como "Nº 135" ou "N° 135" ou "NF-e Nº 135"
    // O padrão mais confiável é buscar o número que aparece logo após "Nº" no cabeçalho
    const padroesNumero = [
      /NF-?e\s*N[°º]\s*(\d{1,9})/i,          // "NF-e Nº 135"
      /N[°º]\s*(\d{1,9})\s*S[ée]rie/i,        // "Nº 135 Série"
      /N[°º]\s*(\d{1,9})/i,                    // "Nº 135" (genérico, último recurso)
    ];
    for (const padrao of padroesNumero) {
      const match = textoLimpo.match(padrao);
      if (match) {
        resultado.invoiceNumber = match[1];
        resultado.confidence.invoiceNumber = "alta";
        break;
      }
    }

    // ── Data de Emissão ──
    // Na NF real: "DATA DE EMISSÃO 18/05/2026"
    const padroesData = [
      /DATA\s*D[EA]\s*EMISS[ÃA]O\s*(\d{2}\/\d{2}\/\d{4})/i,
      /EMISS[ÃA]O\s*(\d{2}\/\d{2}\/\d{4})/i,
    ];
    for (const padrao of padroesData) {
      const match = textoLimpo.match(padrao);
      if (match) {
        const [dia, mes, ano] = match[1].split("/");
        resultado.invoiceDate = `${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
        resultado.confidence.invoiceDate = "alta";
        break;
      }
    }
    // Fallback: primeira data dd/mm/yyyy encontrada no texto
    if (!resultado.invoiceDate) {
      const matchGenerico = textoLimpo.match(/(\d{2}\/\d{2}\/\d{4})/);
      if (matchGenerico) {
        const [dia, mes, ano] = matchGenerico[1].split("/");
        resultado.invoiceDate = `${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
        resultado.confidence.invoiceDate = "baixa";
      }
    }

    // ── Fornecedor (Razão Social do emitente) ──
    // Na NF real: "RECEBEMOS DE MIRAGE UNIFORMES LTDA OS PRODUTOS..."
    const padroesFornecedor = [
      /RECEBEMOS\s+DE\s+(.+?)\s+OS\s+PRODUTOS/i,
      /([A-ZÀ-Ú][A-ZÀ-Ú0-9\s\.\-&]{4,60}(?:LTDA|EIRELI|S\/A|S\.A\.|ME|EPP))\s*(?:Rua|Av\.|Avenida|CNPJ)/i,
    ];
    for (const padrao of padroesFornecedor) {
      const match = textoLimpo.match(padrao);
      if (match) {
        resultado.supplier = match[1].trim().replace(/\s+/g, " ");
        resultado.confidence.supplier = "média";
        break;
      }
    }

    // ── Itens do Produto ──
    //
    // PROBLEMA IDENTIFICADO COM A NF REAL:
    // O título da seção no DANFE é "DADOS DO PRODUTO/SERVIÇO" (com "/SERVIÇO"),
    // e o pdf-parse coloca TUDO de cada item em UMA ÚNICA LINHA:
    //
    //   "2000000000003 BLUSA DE MOLETOM 61052000 0102 5101 UN 145,000 68,00 9.860,00 0,00 ..."
    //
    // Estratégia:
    // 1. Extrair o bloco entre "DADOS DO PRODUTO" e "CALCULO DO ISSQN" (ou "DADOS ADICIONAIS")
    // 2. Dentro do bloco, varrer linha a linha
    // 3. Em cada linha, aplicar regex que captura código + descrição + unidade + quantidade
    //    tudo de uma vez, pois estão na mesma linha.
    try {
      // Aceita "DADOS DO PRODUTO" com ou sem "/SERVIÇO" e com ou sem acento
      const blocoMatch = texto.match(
        /DADOS\s+DO\s+PRODUTO(?:\/SERVI[ÇC]O)?\s*[\s\S]*?(?=CALCULO\s+DO\s+ISSQN|C[AÁ]LCULO\s+DO\s+IMPOSTO|DADOS\s+ADICIONAIS)/i
      );

      if (blocoMatch) {
        const linhas = blocoMatch[0].split("\n").map(l => l.trim()).filter(Boolean);

        for (const linha of linhas) {
          // Cada item começa com código numérico de 6–20 dígitos.
          // Depois vem descrição livre, depois NCM (8 dígitos), CST, CFOP,
          // unidade (UN/PC/PAR/CX/KG/MT etc.) e quantidade.
          //
          // Regex em duas etapas:
          // 1. Confirma que a linha tem um código de produto no início
          // 2. Captura descrição e quantidade

          // Passo 1: a linha começa com código numérico longo?
          const mCodigo = linha.match(/^(\d{6,20})\s+(.+)$/);
          if (!mCodigo) continue;

          const restoLinha = mCodigo[2]; // tudo após o código

          // Passo 2: dentro do resto, captura descrição (tudo antes do NCM de 8 dígitos)
          // e depois busca unidade + quantidade
          // Formato: "BLUSA DE MOLETOM 61052000 0102 5101 UN 145,000 68,00 ..."
          const mItem = restoLinha.match(
            /^(.+?)\s+\d{8}\s+\d{4}\s+\d{4}\s+(UN|PC|PAR|CX|KG|MT|M2|LT|GL|PÇ|PEC)\s+([\d\.,]+)/i
          );

          if (mItem) {
            const descricao  = mItem[1].trim();
            const qtdStr     = mItem[3].replace(/\./g, "").replace(",", ".");
            const quantidade = parseFloat(qtdStr);

            if (!isNaN(quantidade) && quantidade > 0) {
              resultado.itens.push({ descricao, quantidade: Math.round(quantidade) });
            }
          } else {
            // Fallback: NCM pode ter formatação diferente; tenta capturar só por unidade + quantidade
            const mFallback = restoLinha.match(
              /^(.+?)\s+(?:UN|PC|PAR|CX|KG|MT|M2|LT|GL|PÇ|PEC)\s+([\d\.,]+)/i
            );
            if (mFallback) {
              const descricao  = mFallback[1].trim();
              const qtdStr     = mFallback[2].replace(/\./g, "").replace(",", ".");
              const quantidade = parseFloat(qtdStr);
              if (!isNaN(quantidade) && quantidade > 0) {
                resultado.itens.push({ descricao, quantidade: Math.round(quantidade) });
              }
            }
          }
        }

        resultado.confidence.itens = resultado.itens.length > 0 ? "alta" : "nenhum";
      } else {
        // Bloco não encontrado — loga para diagnóstico
        console.warn("[extrairDadosNotaFiscal] Bloco 'DADOS DO PRODUTO' não encontrado.");
        console.warn("[extrairDadosNotaFiscal] Primeiros 1500 chars do PDF:\n", texto.slice(0, 1500));
        resultado.confidence.itens = "nenhum";
      }
    } catch (e) {
      console.warn("[extrairDadosNotaFiscal] Erro ao extrair itens:", e.message);
    }

    return resultado;
  } catch (error) {
    console.error("[extrairDadosNotaFiscal] Erro ao processar PDF:", error.message);
    return resultado;
  }
}