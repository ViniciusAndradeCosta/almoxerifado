import prisma from "../../database/client.js";
import { extrairDadosNotaFiscal } from "../../services/invoiceExtractorService.js";
import { getStorageProvider, getProviderByName } from "../../services/storage/index.js";

// ── Normalizador Inteligente ──
// Remove acentos, pontuações, espaços duplos e deixa tudo maiúsculo.
function normalizarTexto(texto) {
  if (!texto) return '';
  return String(texto)
    .normalize("NFD")
    .replace(/\p{Mn}/gu, "") // Tira acentos (marcas combinantes)
    .replace(/[^a-zA-Z0-9\s]/g, "")  // Tira pontuações e caracteres especiais
    .toUpperCase()
    .replace(/\s+/g, " ")            // Tira espaços duplos
    .trim();
}

// ── Busca de Item Flexível ──
async function buscarItemNoBanco(descricaoNF) {
  const todosItens = await prisma.item.findMany({ select: { id: true, name: true } });
  const descNF = normalizarTexto(descricaoNF);

  return todosItens.find(item => {
    const nomeBanco = normalizarTexto(item.name);
    // Verifica se a Nota tem o nome do Banco, OU se o Banco tem o nome da Nota
    return descNF.includes(nomeBanco) || nomeBanco.includes(descNF);
  }) || null;
}

// POST /invoices/upload
export async function uploadInvoice(req, res) {
  let savedKey = null;
  let savedProvider = null;
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "Nenhum arquivo enviado." });
    }

    const { supplier, invoiceNumber, invoiceDate, notes, stockEntryId } = req.body;

    // Extrai dados diretamente do buffer (sem tocar no disco).
    let extraido = { supplier: null, invoiceNumber: null, invoiceDate: null, itens: [], confidence: {} };
    if (req.file.mimetype === "application/pdf") {
      extraido = await extrairDadosNotaFiscal(req.file.buffer);
    }

    const fornecedorFinal = (supplier && supplier.trim()) || extraido.supplier || null;
    const numeroFinal     = (invoiceNumber && invoiceNumber.trim()) || extraido.invoiceNumber || null;
    const dataFinal       = invoiceDate ? new Date(invoiceDate) : (extraido.invoiceDate ? new Date(extraido.invoiceDate) : null);

    // Salva o arquivo no provider configurado (local ou SharePoint).
    const storage = getStorageProvider();
    const { storageKey, provider } = await storage.save({
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
    });
    savedKey = storageKey;
    savedProvider = provider;

    const invoice = await prisma.invoice.create({
      data: {
        fileName: req.file.originalname,
        filePath: storageKey,
        storageProvider: provider,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        supplier: fornecedorFinal,
        invoiceNumber: numeroFinal,
        invoiceDate: dataFinal,
        notes: notes || null,
        stockEntryId: stockEntryId ? parseInt(stockEntryId) : null,
      },
    });

    const entradasRealizadas = [];
    const entradasIgnoradas  = [];

    if (extraido.itens && extraido.itens.length > 0) {
      for (const itemNF of extraido.itens) {
        const itemBanco = await buscarItemNoBanco(itemNF.descricao);

        if (itemBanco) {
          await prisma.$transaction([
            prisma.stockEntry.create({
              data: {
                itemId:    itemBanco.id,
                quantity:  itemNF.quantidade,
                entryDate: dataFinal || new Date(),
                supplier:  fornecedorFinal,
                notes:     `Entrada automática via NF-e ${numeroFinal || ""}`.trim(),
              },
            }),
            prisma.item.update({
              where: { id: itemBanco.id },
              data:  { quantity: { increment: itemNF.quantidade } },
            }),
          ]);
          entradasRealizadas.push({
            descricao:  itemNF.descricao,
            quantidade: itemNF.quantidade,
            itemId:     itemBanco.id,
            itemName:   itemBanco.name,
          });
        } else {
          entradasIgnoradas.push({ descricao: itemNF.descricao, quantidade: itemNF.quantidade });
        }
      }
    }

    return res.status(201).json({
      success: true,
      invoice,
      extraido: {
        supplier:      extraido.supplier,
        invoiceNumber: extraido.invoiceNumber,
        invoiceDate:   extraido.invoiceDate,
        confidence:    extraido.confidence,
        itens:         extraido.itens || [],
        textoCompleto: extraido.textoCompleto,
        usouExtracao: {
          supplier:      !supplier      && !!extraido.supplier,
          invoiceNumber: !invoiceNumber && !!extraido.invoiceNumber,
          invoiceDate:   !invoiceDate   && !!extraido.invoiceDate,
        },
      },
      estoque: {
        entradasRealizadas,
        entradasIgnoradas,
        total: entradasRealizadas.length,
      },
    });
  } catch (error) {
    // Se o arquivo já foi salvo mas algo falhou depois, remove para não deixar lixo.
    if (savedKey) {
      try { await getProviderByName(savedProvider).delete(savedKey); } catch { /* ignora */ }
    }
    return res.status(500).json({ success: false, error: error.message });
  }
}

// POST /invoices/extract
export async function extractInvoiceData(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "Nenhum arquivo enviado." });
    }

    // Apenas extrai os dados do buffer; nada é persistido.
    let extraido = { supplier: null, invoiceNumber: null, invoiceDate: null, itens: [], confidence: {} };
    if (req.file.mimetype === "application/pdf") {
      extraido = await extrairDadosNotaFiscal(req.file.buffer);
    }

    return res.json({
      success:       true,
      supplier:      extraido.supplier,
      invoiceNumber: extraido.invoiceNumber,
      invoiceDate:   extraido.invoiceDate,
      itens:         extraido.itens || [],
      confidence:    extraido.confidence,
      textoCompleto: extraido.textoCompleto
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

// GET /invoices
export async function getInvoices(req, res) {
  try {
    const invoices = await prisma.invoice.findMany({
      orderBy: { uploadedAt: "desc" },
      include: { stockEntry: { include: { item: { select: { name: true } } } } },
    });
    return res.json(invoices);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// GET /invoices/:id/download
export async function downloadInvoice(req, res) {
  try {
    const invoice = await prisma.invoice.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!invoice) return res.status(404).json({ error: "Nota fiscal não encontrada." });

    const provider = getProviderByName(invoice.storageProvider);
    const buffer = await provider.getBuffer(invoice.filePath);
    if (!buffer) return res.status(404).json({ error: "Arquivo não encontrado no armazenamento." });

    res.set("Content-Type", invoice.fileType || "application/octet-stream");
    res.set("Content-Disposition", `attachment; filename="${encodeURIComponent(invoice.fileName)}"`);
    return res.send(buffer);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// DELETE /invoices/:id
export async function deleteInvoice(req, res) {
  try {
    const invoice = await prisma.invoice.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!invoice) return res.status(404).json({ error: "Nota fiscal não encontrada." });

    try {
      await getProviderByName(invoice.storageProvider).delete(invoice.filePath);
    } catch (e) {
      console.warn(`[Invoice] Falha ao remover arquivo do armazenamento: ${e.message}`);
    }

    await prisma.invoice.delete({ where: { id: parseInt(req.params.id) } });

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
