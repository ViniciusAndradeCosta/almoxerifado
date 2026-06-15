import prisma from "../database/client.js";

// Envia peças para a lavanderia (TRANSACIONAL)
// Decrementa o estoque temporariamente e cria o registro.
export async function enviarParaLavanderia({ itemId, quantity, expectedReturn, laundryName, sentBy, notes, sendDate, tipo }) {
  const itmId = Number(itemId);
  const qty = Number(quantity);
  const tipoEnvio = (tipo || "ESTOQUE").toUpperCase(); // ESTOQUE ou FUNCIONARIO

  if (!["ESTOQUE", "FUNCIONARIO"].includes(tipoEnvio)) {
    throw { status: 400, message: "Tipo inválido. Use: ESTOQUE ou FUNCIONARIO." };
  }

  if (!Number.isInteger(qty) || qty <= 0) {
    throw { status: 400, message: "Quantidade inválida." };
  }

  return prisma.$transaction(async (tx) => {
    const item = await tx.item.findUnique({ where: { id: itmId } });
    if (!item) {
      throw { status: 400, message: "Item não encontrado." };
    }

    // Só valida e decrementa estoque se for do tipo ESTOQUE
    if (tipoEnvio === "ESTOQUE") {
      if (item.quantity < qty) {
        throw {
          status: 400,
          message: `Estoque insuficiente. Disponível: ${item.quantity}, tentando enviar: ${qty}.`,
        };
      }
    }

    const dataEnvio = sendDate ? new Date(sendDate) : new Date();
    if (isNaN(dataEnvio.getTime())) {
      throw { status: 400, message: "Data de envio inválida." };
    }

    let dataRetornoPrevisto = null;
    if (expectedReturn) {
      dataRetornoPrevisto = new Date(expectedReturn);
      if (isNaN(dataRetornoPrevisto.getTime())) {
        throw { status: 400, message: "Data de retorno previsto inválida." };
      }
    }

    const record = await tx.laundryRecord.create({
      data: {
        itemId: itmId,
        quantity: qty,
        status: "ENVIADA",
        sendDate: dataEnvio,
        expectedReturn: dataRetornoPrevisto,
        laundryName: tipoEnvio, // Reutiliza o campo para guardar o tipo
        sentBy: sentBy || null,
        notes: notes || null,
      },
    });

    let updatedItem = item;
    if (tipoEnvio === "ESTOQUE") {
      updatedItem = await tx.item.update({
        where: { id: itmId },
        data: { quantity: { decrement: qty } },
      });
    }

    return { record, item: updatedItem, tipo: tipoEnvio };
  });
}

// Registra retorno da lavanderia (TRANSACIONAL)
// Incrementa o estoque de volta e atualiza o registro.
export async function retornarDaLavanderia(recordId, { quantityReturned, returnDate, notes }) {
  const recId = Number(recordId);

  return prisma.$transaction(async (tx) => {
    const record = await tx.laundryRecord.findUnique({
      where: { id: recId },
    });

    if (!record) {
      throw { status: 404, message: "Registro de lavanderia não encontrado." };
    }

    if (record.status === "RETORNADA") {
      throw { status: 400, message: "Este lote já foi retornado." };
    }

    const tipoEnvio = record.laundryName; // ESTOQUE ou FUNCIONARIO
    const qtyReturn = quantityReturned !== undefined ? Number(quantityReturned) : record.quantity;

    if (!Number.isInteger(qtyReturn) || qtyReturn <= 0) {
      throw { status: 400, message: "Quantidade de retorno inválida." };
    }

    if (qtyReturn > record.quantity) {
      throw {
        status: 400,
        message: `Quantidade de retorno (${qtyReturn}) maior que a enviada (${record.quantity}).`,
      };
    }

    const dataRetorno = returnDate ? new Date(returnDate) : new Date();

    const updatedRecord = await tx.laundryRecord.update({
      where: { id: recId },
      data: {
        status: "RETORNADA",
        returnDate: dataRetorno,
        notes: notes ? `${record.notes || ""} | Retorno: ${notes}` : record.notes,
      },
    });

    let updatedItem = await tx.item.findUnique({ where: { id: record.itemId } });
    let discardRecord = null;
    const perdas = record.quantity - qtyReturn;

    // Só mexe no estoque se for do tipo ESTOQUE
    if (tipoEnvio === "ESTOQUE") {
      updatedItem = await tx.item.update({
        where: { id: record.itemId },
        data: { quantity: { increment: qtyReturn } },
      });

      if (perdas > 0) {
        discardRecord = await tx.discardedItem.create({
          data: {
            itemId: record.itemId,
            quantity: perdas,
            reason: "DANO",
            notes: `Perda na lavanderia (registro #${recId}). Enviadas: ${record.quantity}, retornaram: ${qtyReturn}.`,
            discardedBy: "Sistema (lavanderia)",
            discardDate: dataRetorno,
          },
        });
      }
    }

    return { record: updatedRecord, item: updatedItem, perdas, discardRecord, tipo: tipoEnvio };
  });
}

// Busca peças que estão na lavanderia (pendentes de retorno)
export async function pecasNaLavanderia() {
  const pendentes = await prisma.laundryRecord.findMany({
    where: { status: "ENVIADA" },
    orderBy: { sendDate: "asc" },
    include: {
      item: {
        select: { name: true, type: true, sector: true, size: true },
      },
    },
  });

  // Identifica atrasados (passou da data prevista de retorno)
  const hoje = new Date();
  const resultado = pendentes.map((r) => {
    const atrasado = r.expectedReturn && new Date(r.expectedReturn) < hoje;
    const diasNaLavanderia = Math.floor((hoje - new Date(r.sendDate)) / (1000 * 60 * 60 * 24));
    return {
      ...r,
      atrasado,
      diasNaLavanderia,
    };
  });

  const totalPecas = resultado.reduce((acc, r) => acc + r.quantity, 0);
  const totalAtrasados = resultado.filter((r) => r.atrasado).length;

  return {
    totalRegistros: resultado.length,
    totalPecas,
    totalAtrasados,
    registros: resultado,
  };
}

//Resumo geral da lavanderia
export async function resumoLavanderia(dataInicio, dataFim) {
  const filtroData = {};
  if (dataInicio) filtroData.gte = new Date(dataInicio);
  if (dataFim) {
    const fim = new Date(dataFim);
    fim.setHours(23, 59, 59, 999);
    filtroData.lte = fim;
  }

  const where = {};
  if (dataInicio || dataFim) {
    where.sendDate = filtroData;
  }

  const registros = await prisma.laundryRecord.findMany({
    where,
    include: {
      item: {
        select: { name: true, type: true, sector: true, size: true },
      },
    },
    orderBy: { sendDate: "desc" },
  });

  const enviadas = registros.filter((r) => r.status === "ENVIADA");
  const retornadas = registros.filter((r) => r.status === "RETORNADA");

  return {
    totalRegistros: registros.length,
    pendentes: enviadas.length,
    retornadas: retornadas.length,
    totalPecasEnviadas: registros.reduce((acc, r) => acc + r.quantity, 0),
    registros,
  };
}