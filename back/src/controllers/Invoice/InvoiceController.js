import prisma from "../../database/client.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { extrairDadosNotaFiscal } from "../../services/invoiceExtractorService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, "../../../uploads/invoices");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ── Normalizador Inteligente ──
// Remove acentos, pontuações, espaços duplos e deixa tudo maiúsculo.
function normalizarTexto(texto) {
  if (!texto) return '';
  return String(texto)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Tira acentos
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
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "Nenhum arquivo enviado." });
    }

    const { supplier, invoiceNumber, invoiceDate, notes, stockEntryId } = req.body;
    const filePath = path.join(UPLOAD_DIR, req.file.filename);

    let extraido = { supplier: null, invoiceNumber: null, invoiceDate: null, itens: [], confidence: {} };
    if (req.file.mimetype === "application/pdf") {
      extraido = await extrairDadosNotaFiscal(filePath);
    }

    const fornecedorFinal = (supplier && supplier.trim()) || extraido.supplier || null;
    const numeroFinal     = (invoiceNumber && invoiceNumber.trim()) || extraido.invoiceNumber || null;
    const dataFinal       = invoiceDate ? new Date(invoiceDate) : (extraido.invoiceDate ? new Date(extraido.invoiceDate) : null);

    const invoice = await prisma.invoice.create({
      data: {
        fileName: req.file.originalname,
        filePath: req.file.filename,
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
    if (req.file) {
      const filePath = path.join(UPLOAD_DIR, req.file.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
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

    const filePath = path.join(UPLOAD_DIR, req.file.filename);

    let extraido = { supplier: null, invoiceNumber: null, invoiceDate: null, itens: [], confidence: {} };
    if (req.file.mimetype === "application/pdf") {
      extraido = await extrairDadosNotaFiscal(filePath);
    }

    fs.unlinkSync(filePath);

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
    if (req.file) {
      const filePath = path.join(UPLOAD_DIR, req.file.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
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

    const filePath = path.join(UPLOAD_DIR, invoice.filePath);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Arquivo não encontrado no servidor." });

    res.download(filePath, invoice.fileName);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// DELETE /invoices/:id
export async function deleteInvoice(req, res) {
  try {
    const invoice = await prisma.invoice.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!invoice) return res.status(404).json({ error: "Nota fiscal não encontrada." });

    const filePath = path.join(UPLOAD_DIR, invoice.filePath);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await prisma.invoice.delete({ where: { id: parseInt(req.params.id) } });

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}