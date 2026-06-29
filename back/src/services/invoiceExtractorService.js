import fs from "fs";
import pdfParse from "pdf-parse/lib/pdf-parse.js";

// Extrai fornecedor, número da NF, data de emissão e itens de um PDF de DANFE/NF-e.
// Aceita tanto um caminho de arquivo (string) quanto um Buffer com o conteúdo do PDF.
export async function extrairDadosNotaFiscal(entrada) {
  const resultado = {
    supplier: null,
    invoiceNumber: null,
    invoiceDate: null,
    itens: [],
    confidence: {},
  };

  try {
    const dataBuffer = Buffer.isBuffer(entrada) ? entrada : fs.readFileSync(entrada);
    const pdfData = await pdfParse(dataBuffer);
    const texto = pdfData.text;

    const textoLimpo = texto.replace(/\s+/g, " ").trim();
    resultado.textoCompleto = texto.slice(0, 3000); // Para debug

    // ── Número da NF-e ──
    const padroesNumero = [
      /NF-?e\s*N[°º]\s*(\d{1,9})/i,          
      /N[°º]\s*(\d{1,9})\s*S[ée]rie/i,        
      /N[°º]\s*(\d{1,9})/i,                   
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
    if (!resultado.invoiceDate) {
      const matchGenerico = textoLimpo.match(/(\d{2}\/\d{2}\/\d{4})/);
      if (matchGenerico) {
        const [dia, mes, ano] = matchGenerico[1].split("/");
        resultado.invoiceDate = `${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
        resultado.confidence.invoiceDate = "baixa";
      }
    }

    // ── Fornecedor (Razão Social do emitente) ──
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
    try {
      const linhas = texto.split("\n").map(l => l.trim());
      let linhaAnterior = "";

      for (let i = 0; i < linhas.length; i++) {
        const linha = linhas[i];
        if (!linha) continue;

        let descricaoEncontrada = null;
        let quantidadeEncontrada = null;

        // PADRÃO 4: Texto 100% Aglutinado (Exclusivo para notas como a da Mirage)
        // Ex: 2000000000003BLUSA DE MOLETOM6105200001025101UN145,00068,009...
        const m4 = linha.match(/^(\d+)?(.*?)\d{8}\d{6,8}(UN|UNID|UND|PC|P[CÇ]S?|PAR|CX|KG|MT|M2|LT|GL|PR|CJ|PCT|KIT|JG)(\d+,\d{2,4})/i);

        if (m4 && m4[2].trim().length > 3) {
          descricaoEncontrada = m4[2].trim();
          quantidadeEncontrada = parseFloat(m4[4].replace(/\./g, "").replace(",", "."));
        } else {
          // Padrão 1: Tenta QTD depois da Unidade (ex: UN 10,00)
          const m1 = linha.match(/(.*)\b(UN|UNID|UND|PC|P[CÇ]S?|PAR|CX|KG|MT|M2|LT|GL|PR|CJ|PCT|KIT|JG)\b\s+([\d\.,]+)/i);
          if (m1) {
            descricaoEncontrada = m1[1].trim();
            quantidadeEncontrada = parseFloat(m1[3].replace(/\./g, "").replace(",", "."));
          } else {
            // Padrão 2: Tenta QTD antes da Unidade (ex: 10,00 UN)
            const m2 = linha.match(/(.*)\b([\d\.,]+)\s+\b(UN|UNID|UND|PC|P[CÇ]S?|PAR|CX|KG|MT|M2|LT|GL|PR|CJ|PCT|KIT|JG)\b/i);
            if (m2) {
              descricaoEncontrada = m2[1].trim();
              quantidadeEncontrada = parseFloat(m2[2].replace(/\./g, "").replace(",", "."));
            } else {
              // Padrão 3: Sem sigla de unidade impressa
              const m3 = linha.match(/(.*?)\b(\d{8})\b\s+(?:\d{2,4}\s+){1,2}([\d\.,]+)\s+[\d\.,]+\s+[\d\.,]+/);
              if (m3) {
                descricaoEncontrada = m3[1].trim();
                quantidadeEncontrada = parseFloat(m3[3].replace(/\./g, "").replace(",", "."));
              }
            }
          }
        }

        if (descricaoEncontrada !== null && !isNaN(quantidadeEncontrada) && quantidadeEncontrada > 0) {
          
          // MÁGICA: Se a linha quebrou no meio da palavra, pesca o resto da linha de cima
          if (!/[a-zA-Z]{3,}/.test(descricaoEncontrada) && linhaAnterior) {
            descricaoEncontrada = linhaAnterior + " " + descricaoEncontrada;
          }
          
          // Limpa NCMs, códigos soltos e lixo numérico que tenha ficado
          const descricaoLimpa = descricaoEncontrada
            .replace(/\b\d{4,15}\b/g, "")
            .replace(/^[0-9]+/, "")
            .replace(/\s+/g, " ")
            .trim();

          if (descricaoLimpa.length > 3) {
            resultado.itens.push({ descricao: descricaoLimpa, quantidade: Math.round(quantidadeEncontrada) });
          }
        }
        
        if (linha.trim().length > 0) {
          linhaAnterior = linha;
        }
      }

      resultado.confidence.itens = resultado.itens.length > 0 ? "alta" : "nenhum";
      
    } catch (e) {
      console.warn("[extrairDadosNotaFiscal] Erro ao extrair itens:", e.message);
    }

    return resultado;
  } catch (error) {
    console.error("[extrairDadosNotaFiscal] Erro ao processar PDF:", error.message);
    return resultado;
  }
}