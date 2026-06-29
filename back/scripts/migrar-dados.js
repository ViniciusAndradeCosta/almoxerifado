import prisma from "../src/database/client.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Papa from "papaparse";

// ============================================================================
// Migração do sistema antigo -> novo.
//
// Lê os CSVs em scripts/dados/ e popula o banco. Por padrão roda em DRY-RUN
// (apenas analisa e conta, NÃO grava nada). Para aplicar de verdade — o que
// APAGA todos os dados atuais EXCETO os usuários (login/senha) e importa os
// CSVs — rode com a flag --apply:
//
//   npm run migrar            (dry-run: só relatório)
//   npm run migrar -- --apply (aplica: apaga tudo menos User e importa)
//
// Arquivos esperados em scripts/dados/:
//   funcionarios.csv  estoque.csv  armarios-novo.csv  saidas.csv  relatorio.csv
// ============================================================================

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DADOS = path.join(__dirname, "dados");
const APPLY = process.argv.includes("--apply");

function lerCsv(nome) {
  const txt = fs.readFileSync(path.join(DADOS, nome), "utf8").replace(/^﻿/, "");
  return Papa.parse(txt, { header: true, delimiter: ";", skipEmptyLines: true }).data;
}
function parseDataBR(s) {
  if (!s) return null;
  s = String(s).trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) { const d = new Date(s); return isNaN(+d) ? null : d; }
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) { const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])); return isNaN(+d) ? null : d; }
  const d = new Date(s); return isNaN(+d) ? null : d;
}
function intOrNull(s) { const n = parseInt(String(s ?? "").replace(/[^\d-]/g, ""), 10); return isNaN(n) ? null : n; }
function norm(s) { return String(s ?? "").normalize("NFD").replace(/\p{Mn}/gu, "").toUpperCase().replace(/\s+/g, " ").trim(); }

async function limpar() {
  // Ordem segura por dependências de chave estrangeira. User é preservado.
  await prisma.invoice.deleteMany({});
  await prisma.withdrawal.deleteMany({});
  await prisma.stockEntry.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.discardedItem.deleteMany({});
  await prisma.laundryRecord.deleteMany({});
  await prisma.allWithdrawal.deleteMany({});
  await prisma.cabinet.deleteMany({});
  await prisma.item.deleteMany({});
  await prisma.employee.deleteMany({});
}

async function main() {
  const funcs   = lerCsv("funcionarios.csv");
  const itens   = lerCsv("estoque.csv");
  const cabs    = lerCsv("armarios-novo.csv");
  const saidas  = lerCsv("saidas.csv");
  const relat   = lerCsv("relatorio.csv");

  const funcsValidos = funcs.filter(r => (r.NOME || "").trim());
  const itensValidos = itens.filter(r => (r.NOME || "").trim());
  const cabsValidos  = cabs.filter(r => parseInt(r.NUMERO));
  const saidasValidas = saidas.filter(r => (r["Nome do Item"] || "").trim() && (r["Nome do Funcionário"] || "").trim());
  const relatValidos  = relat.filter(r => (r.ITEM || "").trim());

  console.log("=== ANÁLISE DOS CSVs ===");
  console.log(`Funcionários:     ${funcsValidos.length}`);
  console.log(`Itens (estoque):  ${itensValidos.length}`);
  console.log(`Armários:         ${cabsValidos.length}`);
  console.log(`Saídas ativas:    ${saidasValidas.length}`);
  console.log(`Relatório (hist): ${relatValidos.length}`);

  // Análise de correspondência por nome (sem gravar)
  const nomesItens = new Set(itensValidos.map(r => norm(r.NOME)));
  const nomesFuncs = new Set(funcsValidos.map(r => norm(r.NOME)));
  const itensFaltando = new Set(saidasValidas.filter(r => !nomesItens.has(norm(r["Nome do Item"]))).map(r => norm(r["Nome do Item"])));
  const funcsFaltando = new Set(saidasValidas.filter(r => !nomesFuncs.has(norm(r["Nome do Funcionário"]))).map(r => norm(r["Nome do Funcionário"])));
  console.log(`\nNas saídas: itens não encontrados no estoque (serão criados): ${itensFaltando.size}`);
  console.log(`Nas saídas: funcionários não encontrados (serão criados): ${funcsFaltando.size}`);

  if (!APPLY) {
    console.log("\n[DRY-RUN] Nada foi gravado. Rode com '-- --apply' para aplicar (APAGA tudo menos usuários).");
    await prisma.$disconnect();
    return;
  }

  // ───────────────────── APLICAÇÃO ─────────────────────
  const usuarios = await prisma.user.count();
  console.log(`\n[APPLY] Apagando todos os dados EXCETO ${usuarios} usuário(s)...`);
  await limpar();

  // 1) Funcionários
  const empMap = new Map();
  for (const r of funcsValidos) {
    const emp = await prisma.employee.create({
      data: {
        name: r.NOME.trim(), company: (r.EMPRESA || "").trim(), role: (r.CARGO || "").trim(),
        department: (r.DEPARTAMENTO || "").trim(), admissionDate: parseDataBR(r.ADMISSAO) || new Date(),
        shirt_size: (r["CAMISA"] || "").trim() || null, pants_size: intOrNull(r["CALÇA"]), shoes_size: intOrNull(r["CALÇADO"]),
      },
    });
    if (!empMap.has(norm(emp.name))) empMap.set(norm(emp.name), emp.id);
  }
  console.log(`✓ Funcionários: ${empMap.size}`);

  // 2) Itens
  const itemMap = new Map();
  for (const r of itensValidos) {
    const it = await prisma.item.create({
      data: {
        name: r.NOME.trim(), quantity: intOrNull(r.QUANTIDADE) || 0, type: (r.TIPO || "").trim() || "OUTRO",
        sector: (r.SETOR || "").trim() || "GERAL", size: (r.TAMANHO || "").trim() || null, ean: (r.EAN || "").trim() || null,
      },
    });
    if (!itemMap.has(norm(it.name))) itemMap.set(norm(it.name), it.id);
  }
  console.log(`✓ Itens: ${itemMap.size}`);

  // 3) Armários
  let cabsCriados = 0;
  for (const r of cabsValidos) {
    const numero = parseInt(r.NUMERO);
    try {
      await prisma.cabinet.create({
        data: { number: numero, size: (r.TAMANHO || "").trim(), sector: (r.SETOR || "").trim(), situation: (r.SITUACAO || "Disponivel").trim(), date: parseDataBR(r.DATA), name: null },
      });
      cabsCriados++;
    } catch { /* número duplicado */ }
  }
  console.log(`✓ Armários: ${cabsCriados}`);

  // Garante item/funcionário existentes (cria a partir dos dados denormalizados se faltar)
  async function garantirItem(nome, tipo, setor, tam, ean) {
    const k = norm(nome);
    if (itemMap.has(k)) return itemMap.get(k);
    const it = await prisma.item.create({ data: { name: nome.trim(), quantity: 0, type: (tipo || "").trim() || "OUTRO", sector: (setor || "").trim() || "GERAL", size: (tam || "").trim() || null, ean: (ean || "").trim() || null } });
    itemMap.set(k, it.id);
    return it.id;
  }
  async function garantirFunc(nome, cargo, empresa, depto) {
    const k = norm(nome);
    if (empMap.has(k)) return empMap.get(k);
    const e = await prisma.employee.create({ data: { name: nome.trim(), company: (empresa || "").trim(), role: (cargo || "").trim(), department: (depto || "").trim(), admissionDate: new Date() } });
    empMap.set(k, e.id);
    return e.id;
  }

  // 4) Saídas ativas -> Withdrawal (+ log em AllWithdrawal)
  let nSaidas = 0;
  for (const r of saidasValidas) {
    const itemId = await garantirItem(r["Nome do Item"], r["Tipo do Item"], r["Setor do Item"], r["Tamanho do Item"], r["EAN do Item"]);
    const employeeId = await garantirFunc(r["Nome do Funcionário"], r["Cargo do Funcionário"], r["Empresa do Funcionário"], r["Departamento do Funcionário"]);
    const quantity = intOrNull(r.Quantidade) || 1;
    const data = parseDataBR(r["Data de Saída"]) || new Date();
    const w = await prisma.withdrawal.create({ data: { itemId, employeeId, quantity, withdrawalDate: data, origemPeca: "NOVA" } });
    await prisma.allWithdrawal.create({
      data: {
        idWithdrawal: intOrNull(r.ID) || w.id, withdrawalDate: data, itemId, itemName: (r["Nome do Item"] || "").trim(),
        itemType: (r["Tipo do Item"] || "").trim(), itemSector: (r["Setor do Item"] || "").trim(),
        itemSize: (r["Tamanho do Item"] || "").trim() || null, itemEan: (r["EAN do Item"] || "").trim() || null,
        quantity, employeeName: (r["Nome do Funcionário"] || "").trim(), employeeId,
        employeeRole: (r["Cargo do Funcionário"] || "").trim(), employeeCompany: (r["Empresa do Funcionário"] || "").trim(),
        employeeDepartment: (r["Departamento do Funcionário"] || "").trim(), tipoMovimento: "SAIDA",
      },
    });
    nSaidas++;
    if (nSaidas % 500 === 0) console.log(`  ... ${nSaidas} saídas`);
  }
  console.log(`✓ Saídas ativas: ${nSaidas}`);

  // 5) Relatório histórico -> AllWithdrawal
  let nRelat = 0, idSeq = 1;
  const lote = [];
  for (const r of relatValidos) {
    const itemId = itemMap.get(norm(r.ITEM)) || 0;
    const employeeId = empMap.get(norm(r.FUNCIONARIO)) || 0;
    lote.push({
      idWithdrawal: idSeq++, withdrawalDate: parseDataBR(r.DATA) || new Date(), itemId, itemName: (r.ITEM || "").trim(),
      itemType: (r.TIPO || "").trim(), itemSector: (r.SETOR || "").trim(), itemSize: null, itemEan: null,
      quantity: intOrNull(r.QUANTIDADE) || 1, employeeName: (r.FUNCIONARIO || "").trim(), employeeId,
      employeeRole: "", employeeCompany: "", employeeDepartment: (r.DEPARTAMENTO || "").trim(), tipoMovimento: "SAIDA",
    });
    if (lote.length >= 1000) { await prisma.allWithdrawal.createMany({ data: lote.splice(0) }); nRelat += 1000; console.log(`  ... ${nRelat} histórico`); }
  }
  if (lote.length) { nRelat += lote.length; await prisma.allWithdrawal.createMany({ data: lote }); }
  console.log(`✓ Histórico (relatório): ${nRelat}`);

  console.log("\n✅ Migração concluída! Usuários preservados.");
  await prisma.$disconnect();
}

main().catch(async e => { console.error("❌ Erro:", e); await prisma.$disconnect(); process.exit(1); });
