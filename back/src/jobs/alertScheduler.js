import { buscarAlertas } from "../services/alertService.js";
import { enviarEmailAlerta } from "../services/emailService.js";
import { criarTransporter } from "../config/email.js";
import prisma from "../database/client.js";

const HORARIO_RESUMO = 8;
const DIA_SEMANA_RESUMO = 1; // 0=Domingo, 1=Segunda, 2=Terça... — resumo toda segunda-feira
const INTERVALO_VERIFICACAO_MS = 2 * 60 * 1000;

// null = primeira execução ainda não aconteceu
let estadoAnterior = null;
let ultimaSemanaResumo = null; // armazena ano-semana (ex: "2026-W25") do último resumo enviado

// Calcula o número da semana ISO do ano para uma data
function getSemanaISO(data) {
  const d = new Date(Date.UTC(data.getFullYear(), data.getMonth(), data.getDate()));
  const diaSemana = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - diaSemana);
  const inicioAno = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const semana = Math.ceil((((d - inicioAno) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${semana}`;
}

const transporter = criarTransporter();

function getAlertasComoMapa(alertas) {
  const mapa = {};
  alertas.critico.forEach((a) => { mapa[a.itemId] = "CRITICO"; });
  alertas.alerta.forEach((a)  => { mapa[a.itemId] = "ALERTA";  });
  alertas.atencao.forEach((a) => { mapa[a.itemId] = "ATENCAO"; });
  return mapa;
}

function detectarMudancas(alertasAtuais) {
  const novos = { critico: [], alerta: [], atencao: [] };
  alertasAtuais.critico.forEach((a) => {
    if (estadoAnterior[a.itemId] !== "CRITICO") novos.critico.push(a);
  });
  alertasAtuais.alerta.forEach((a) => {
    if (estadoAnterior[a.itemId] !== "ALERTA") novos.alerta.push(a);
  });
  alertasAtuais.atencao.forEach((a) => {
    if (estadoAnterior[a.itemId] !== "ATENCAO") novos.atencao.push(a);
  });
  return novos;
}

async function detectarNormalizados(mapaAtual) {
  const normalizados = [];
  for (const [itemIdStr, nivelAnterior] of Object.entries(estadoAnterior)) {
    const itemId = Number(itemIdStr);
    if (!mapaAtual[itemId]) {
      try {
        const item = await prisma.item.findUnique({ where: { id: itemId } });
        if (item) {
          normalizados.push({
            itemName: item.name,
            itemType: item.type,
            itemSector: item.sector,
            estoqueAtual: item.quantity,
            margemSeguranca: item.minStock || 0,
            nivelAnterior,
          });
        }
      } catch (err) {
        console.error(`[Scheduler] Erro ao buscar item ${itemId}:`, err.message);
      }
    }
  }
  return normalizados;
}

async function enviarEmailNormalizado(normalizados) {
  const destinatario = process.env.EMAIL_DESTINATARIO;
  if (!destinatario || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;

  const nivelLabel = { CRITICO: "Crítico 🔴", ALERTA: "Alerta 🟠", ATENCAO: "Atenção 🟡" };

  const itensHtml = normalizados.map((item, i) => `
    <tr style="background:${i % 2 === 0 ? "#f0fff4" : "#fff"}">
      <td style="padding:10px 14px;border:1px solid #e0e0e0;font-family:Arial,sans-serif;font-size:13px;font-weight:700">${item.itemName}</td>
      <td style="padding:10px 14px;border:1px solid #e0e0e0;font-family:Arial,sans-serif;font-size:13px">${item.itemType}</td>
      <td style="padding:10px 14px;border:1px solid #e0e0e0;font-family:Arial,sans-serif;font-size:13px">${item.itemSector}</td>
      <td style="padding:10px 14px;border:1px solid #e0e0e0;font-family:Arial,sans-serif;font-size:13px;text-align:center;font-weight:800;color:#198754">${item.estoqueAtual}</td>
      <td style="padding:10px 14px;border:1px solid #e0e0e0;font-family:Arial,sans-serif;font-size:13px;text-align:center">${item.margemSeguranca}</td>
      <td style="padding:10px 14px;border:1px solid #e0e0e0;font-family:Arial,sans-serif;font-size:13px;text-align:center">${nivelLabel[item.nivelAnterior] || item.nivelAnterior}</td>
    </tr>`).join("");

  const ts = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;background:#f4f4f4;padding:20px">
      <div style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
        <div style="background:#1A1A1A;padding:22px 28px;border-radius:8px 8px 0 0">
          <table style="width:100%;border-collapse:collapse"><tr>
            <td style="vertical-align:middle">
              <table style="border-collapse:collapse"><tr>
                <td style="vertical-align:middle;padding-right:14px">
                  <div style="background:#198754;width:5px;height:40px;border-radius:3px"></div>
                </td>
                <td style="vertical-align:middle">
                  <div style="color:#fff;font-size:17px;font-weight:800;font-family:Arial,sans-serif">✅ Estoque Normalizado</div>
                  <div style="color:#999;font-size:12px;margin-top:3px;font-family:Arial,sans-serif">Hiper Comercial Monlevade — Almoxarifado</div>
                </td>
              </tr></table>
            </td>
            <td style="text-align:right;vertical-align:middle">
              <div style="background:#198754;color:#fff;padding:6px 16px;border-radius:5px;font-size:13px;font-weight:800;font-family:Arial,sans-serif">${normalizados.length} item${normalizados.length !== 1 ? "s" : ""}</div>
            </td>
          </tr></table>
        </div>
        <div style="padding:24px 28px">
          <p style="font-family:Arial,sans-serif;font-size:13px;color:#555;margin:0 0 20px">Os seguintes itens <strong>voltaram ao nível seguro</strong> de estoque:</p>
          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr style="background:#198754">
                <th style="padding:10px 14px;text-align:left;border:1px solid #1a7a4a;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#fff">Item</th>
                <th style="padding:10px 14px;text-align:left;border:1px solid #1a7a4a;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#fff">Tipo</th>
                <th style="padding:10px 14px;text-align:left;border:1px solid #1a7a4a;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#fff">Setor</th>
                <th style="padding:10px 14px;text-align:center;border:1px solid #1a7a4a;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#fff">Estoque</th>
                <th style="padding:10px 14px;text-align:center;border:1px solid #1a7a4a;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#fff">Margem</th>
                <th style="padding:10px 14px;text-align:center;border:1px solid #1a7a4a;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#fff">Estava em</th>
              </tr>
            </thead>
            <tbody>${itensHtml}</tbody>
          </table>
        </div>
        <div style="background:#1A1A1A;padding:14px 28px;border-top:3px solid #198754">
          <table style="width:100%;border-collapse:collapse"><tr>
            <td><div style="color:#fff;font-size:13px;font-weight:800;font-family:Arial,sans-serif">Hiper Comercial Monlevade</div>
            <div style="color:#666;font-size:11px;font-family:Arial,sans-serif;margin-top:2px">Sistema de Almoxarifado · Email automático</div></td>
            <td style="text-align:right;vertical-align:middle"><div style="color:#555;font-size:11px;font-family:Arial,sans-serif">${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</div></td>
          </tr></table>
        </div>
      </div>
    </div>`;

  try {
    const info = await transporter.sendMail({
      from: `"Almoxarifado Hiper" <${process.env.EMAIL_USER}>`,
      to: destinatario,
      subject: `✅ Estoque Normalizado — ${normalizados.length} item(ns) voltaram ao OK [${ts}]`,
      html,
    });
    console.log(`[Email] Normalização enviada — ID: ${info.messageId}`);
  } catch (err) {
    console.error("[Email] Erro ao enviar normalização:", err.message);
  }
}

async function verificarAlertas() {
  const agora = new Date();
  console.log(`[Scheduler] Verificando às ${agora.toLocaleTimeString("pt-BR")}...`);

  try {
    const horaAtual = agora.getHours();
    const diaAtual  = agora.toDateString();

    const resultado = await buscarAlertas();
    const mapaAtual = getAlertasComoMapa(resultado.alertas);

    // ── RESUMO DIÁRIO às 8h — apenas uma vez por dia ──
    // ── RESUMO SEMANAL toda segunda-feira às 8h ──
    const diaSemanaAtual = agora.getDay(); // 0=Dom, 1=Seg, 2=Ter...
    const semanaAtual = getSemanaISO(agora);

    if (diaSemanaAtual === DIA_SEMANA_RESUMO && horaAtual >= HORARIO_RESUMO && ultimaSemanaResumo !== semanaAtual) {
      ultimaSemanaResumo = semanaAtual; // marca ANTES para não duplicar mesmo em caso de erro
      const dataFormatada = agora.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
      const horaFormatada = agora.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });

      if (resultado.totalAlertas > 0) {
        console.log(`[Scheduler] Enviando resumo semanal (${resultado.totalAlertas} alertas)...`);
        await enviarEmailAlerta(
          resultado.alertas,
          `📋 Resumo Semanal ${dataFormatada} — Estoque Almoxarifado [${horaFormatada}]`
        );
        console.log("[Scheduler] Resumo semanal enviado.");
      } else {
        console.log("[Scheduler] Resumo semanal: estoque saudável, sem alertas.");
      }
    }

    // ── PRIMEIRA EXECUÇÃO: registra estado sem enviar nada ──
    if (estadoAnterior === null) {
      estadoAnterior = mapaAtual;
      const total = Object.keys(mapaAtual).length;
      console.log(`[Scheduler] Estado inicial registrado. ${total} item(ns) em alerta no momento.`);
      return;
    }

    // ── DETECÇÃO DE NOVAS TRANSIÇÕES DE ESTADO ──
    const novos = detectarMudancas(resultado.alertas);
    const totalNovos = novos.critico.length + novos.alerta.length + novos.atencao.length;

    if (totalNovos > 0) {
      const ts = agora.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
      const tipoAlerta = novos.critico.length > 0
        ? "Estoque Zerado"
        : novos.alerta.length > 0
          ? "Abaixo da Margem"
          : "Atenção";

      console.log(`[Scheduler] ${totalNovos} transição(ões) detectada(s). Enviando alerta imediato...`);
      await enviarEmailAlerta(
        novos,
        `🚨 Alerta Imediato — ${tipoAlerta} — Almoxarifado [${ts}]`
      );
      console.log("[Scheduler] Alerta imediato enviado.");
    }

    // ── DETECÇÃO DE NORMALIZAÇÃO ──
    const normalizados = await detectarNormalizados(mapaAtual);
    if (normalizados.length > 0) {
      console.log(`[Scheduler] ${normalizados.length} item(ns) normalizado(s). Enviando email...`);
      await enviarEmailNormalizado(normalizados);
      console.log("[Scheduler] Email de normalização enviado.");
    }

    if (totalNovos === 0 && normalizados.length === 0) {
      console.log("[Scheduler] Nenhuma mudança de estado detectada.");
    }

    // Atualiza estado para próxima comparação
    estadoAnterior = mapaAtual;

  } catch (error) {
    console.error("[Scheduler] Erro na verificação:", error.message);
  }
}

export function iniciarScheduler() {
  console.log(`[Scheduler] Iniciado. Resumo semanal toda segunda-feira às ${HORARIO_RESUMO}h. Verificação a cada ${INTERVALO_VERIFICACAO_MS / 60000} min.`);
  // Primeira verificação em 15s (só registra estado inicial)
  setTimeout(verificarAlertas, 15000);
  // Verificações subsequentes
  setInterval(verificarAlertas, INTERVALO_VERIFICACAO_MS);
}