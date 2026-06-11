import prisma from "../database/client.js";
import {
  JANELA_ANALISE_DIAS,
  MESES_COBERTURA_PADRAO,
  MESES_COBERTURA_ESCRITORIO,
  MESES_COBERTURA_LIMPEZA,
  FATOR_ATENCAO,
} from "../config/businessRules.js";

// Calcula a cobertura em meses de acordo com o setor
function getCoberturaDoSetor(sector) {
  const sectorUpper = (sector || "").toUpperCase();
  if (sectorUpper === "ESCRITORIO") return MESES_COBERTURA_ESCRITORIO;
  if (sectorUpper === "LIMPEZA") return MESES_COBERTURA_LIMPEZA;
  return MESES_COBERTURA_PADRAO;
}

// Gera sugestões de pedido baseadas no histórico de entradas e saídas
export async function gerarSugestoes() {
  const dataLimite = new Date();
  dataLimite.setDate(dataLimite.getDate() - JANELA_ANALISE_DIAS);

  // Busca todas as saídas no período de análise
  const saidas = await prisma.allWithdrawal.findMany({
    where: { withdrawalDate: { gte: dataLimite } },
  });

  // Busca todas as entradas no período de análise
  const entradas = await prisma.stockEntry.findMany({
    where: { entryDate: { gte: dataLimite } },
  });

  // Busca todos os itens com estoque atual e margem de segurança
  const itens = await prisma.item.findMany();

  // Agrupa saídas por item
  const saidasPorItem = {};
  saidas.forEach((s) => {
    if (!saidasPorItem[s.itemId]) {
      saidasPorItem[s.itemId] = {
        itemName: s.itemName,
        itemType: s.itemType,
        itemSector: s.itemSector,
        totalSaidas: 0,
      };
    }
    saidasPorItem[s.itemId].totalSaidas += s.quantity;
  });

  // Agrupa entradas por item
  const entradasPorItem = {};
  entradas.forEach((e) => {
    if (!entradasPorItem[e.itemId]) {
      entradasPorItem[e.itemId] = { totalEntradas: 0 };
    }
    entradasPorItem[e.itemId].totalEntradas += e.quantity;
  });

  // Monta a sugestão para cada item que teve movimentação
  const mesesNaJanela = JANELA_ANALISE_DIAS / 30;

  const sugestoes = itens.map((item) => {
    const dadosSaida = saidasPorItem[item.id] || { totalSaidas: 0 };
    const dadosEntrada = entradasPorItem[item.id] || { totalEntradas: 0 };

    const totalSaidas = dadosSaida.totalSaidas;
    const totalEntradas = dadosEntrada.totalEntradas;
    const mediaMensalSaida = totalSaidas / mesesNaJanela;
    const mediaMensalEntrada = totalEntradas / mesesNaJanela;

    const coberturaMeses = getCoberturaDoSetor(item.sector);
    const estoqueIdeal = Math.ceil(mediaMensalSaida * coberturaMeses);

    // Margem de segurança configurada no item
    const margemSeguranca = item.minStock || 0;

    // Estoque alvo = o maior entre o estoque ideal e a margem de segurança
    const estoqueAlvo = Math.max(estoqueIdeal, margemSeguranca);

    // Sugestão = quanto falta para atingir o estoque alvo
    const sugestaoQuantidade = Math.max(0, estoqueAlvo - item.quantity);

    const limiteAtencao = margemSeguranca > 0 ? Math.ceil(margemSeguranca * FATOR_ATENCAO) : 0;

    let status = "OK";
    if (item.quantity === 0) {
      status = "SEM_ESTOQUE";
    } else if (margemSeguranca > 0 && item.quantity <= margemSeguranca) {
      status = "ABAIXO_MARGEM";
    } else if (limiteAtencao > 0 && item.quantity <= limiteAtencao) {
      status = "ATENCAO";
    } else if (item.quantity < estoqueIdeal) {
      status = "ESTOQUE_BAIXO";
    }

    return {
      itemId: item.id,
      itemName: item.name,
      itemType: item.type,
      itemSector: item.sector,
      itemSize: item.size || null,
      estoqueAtual: item.quantity,
      margemSeguranca,
      totalSaidas,
      totalEntradas,
      mediaMensalSaida: parseFloat(mediaMensalSaida.toFixed(2)),
      mediaMensalEntrada: parseFloat(mediaMensalEntrada.toFixed(2)),
      coberturaMeses,
      estoqueIdeal,
      estoqueAlvo,
      sugestaoQuantidade,
      status,
    };
  });

  //Ordena: itens que precisam de reposição primeiro, depois por urgência
  const ordemStatus = { SEM_ESTOQUE: 0, ABAIXO_MARGEM: 1, ATENCAO: 2, ESTOQUE_BAIXO: 3, OK: 4 };
  sugestoes.sort((a, b) => {
    const ordemA = ordemStatus[a.status] ?? 99;
    const ordemB = ordemStatus[b.status] ?? 99;
    if (ordemA !== ordemB) return ordemA - ordemB;
    return b.sugestaoQuantidade - a.sugestaoQuantidade;
  });

  //Resumo geral
  const precisamReposicao = sugestoes.filter((s) => s.sugestaoQuantidade > 0);

    return {
      parametros: {
        janelaAnaliseDias: JANELA_ANALISE_DIAS,
        mesesCoberturaPadrao: MESES_COBERTURA_PADRAO,
        fatorAtencao: FATOR_ATENCAO,
      },
      resumo: {
        totalItens: sugestoes.length,
        itensPrecisamReposicao: precisamReposicao.length,
        itensSemEstoque: sugestoes.filter((s) => s.status === "SEM_ESTOQUE").length,
        itensAbaixoMargem: sugestoes.filter((s) => s.status === "ABAIXO_MARGEM").length,
        itensAtencao: sugestoes.filter((s) => s.status === "ATENCAO").length,
        itensEstoqueBaixo: sugestoes.filter((s) => s.status === "ESTOQUE_BAIXO").length,
      },
    sugestoes,
  };
}

//Atualiza a margem de segurança de um item
export async function atualizarMargemSeguranca(itemId, minStock) {
  const itmId = Number(itemId);
  const margem = Number(minStock);

  if (!Number.isInteger(margem) || margem < 0) {
    throw { status: 400, message: "Margem de segurança inválida (deve ser inteiro >= 0)." };
  }

  const item = await prisma.item.findUnique({ where: { id: itmId } });
  if (!item) {
    throw { status: 404, message: "Item não encontrado." };
  }

  return prisma.item.update({
    where: { id: itmId },
    data: { minStock: margem },
  });
}

//Atualiza margem de segurança em lote (por setor ou tipo)
export async function atualizarMargemEmLote(filtro, minStock) {
  const margem = Number(minStock);

  if (!Number.isInteger(margem) || margem < 0) {
    throw { status: 400, message: "Margem de segurança inválida." };
  }

  const where = {};
  if (filtro.sector) where.sector = filtro.sector;
  if (filtro.type) where.type = filtro.type;

  if (Object.keys(where).length === 0) {
    throw { status: 400, message: "Informe pelo menos um filtro (sector ou type)." };
  }

  const result = await prisma.item.updateMany({
    where,
    data: { minStock: margem },
  });

  return { atualizados: result.count, margem };
}