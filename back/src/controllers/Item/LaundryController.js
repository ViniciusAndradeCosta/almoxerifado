import prisma from "../../database/client.js";
import { enviarParaLavanderia, retornarDaLavanderia, pecasNaLavanderia, resumoLavanderia } from "../../services/laundryService.js";

// POST /laundry/send — envia peças para lavanderia
export async function sendToLaundry(req, res) {
  const { itemId, quantity, expectedReturn, laundryName, sentBy, notes, sendDate, tipo } = req.body;

  try {
    const result = await enviarParaLavanderia({ itemId, quantity, expectedReturn, laundryName, sentBy, notes, sendDate, tipo });
    return res.status(201).json({
      success: true,
      record: result.record,
      item: result.item,
      message: "Peças enviadas para a lavanderia (estoque atualizado).",
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      error: error.message || "Erro ao enviar para lavanderia.",
    });
  }
}

// POST /laundry/return/:id — registra retorno da lavanderia
export async function returnFromLaundry(req, res) {
  const { id } = req.params;
  const { quantityReturned, returnDate, notes } = req.body;

  try {
    const result = await retornarDaLavanderia(id, { quantityReturned, returnDate, notes });
    return res.json({
      success: true,
      record: result.record,
      item: result.item,
      perdas: result.perdas,
      discardRecord: result.discardRecord,
      message: result.perdas > 0
        ? `Retorno registrado. ${result.perdas} peça(s) perdida(s) registrada(s) como descarte.`
        : "Retorno registrado com sucesso (estoque restaurado).",
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      error: error.message || "Erro ao registrar retorno.",
    });
  }
}

// GET /laundry/pending — peças atualmente na lavanderia
export async function getPending(req, res) {
  try {
    const result = await pecasNaLavanderia();
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// GET /laundry/all — histórico completo
export async function getLaundryHistory(req, res) {
  const { dataInicio, dataFim } = req.query;

  try {
    const result = await resumoLavanderia(dataInicio, dataFim);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// GET /laundry/:id — busca um registro específico
export async function getLaundryRecord(req, res) {
  const { id } = req.params;

  try {
    const record = await prisma.laundryRecord.findUnique({
      where: { id: parseInt(id) },
      include: {
        item: {
          select: { name: true, type: true, sector: true, size: true },
        },
      },
    });

    if (!record) {
      return res.status(404).json({ error: "Registro não encontrado." });
    }

    return res.json(record);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}