import { buscarAlertas } from "../services/alertService.js";
import { enviarEmailAlerta } from "../services/emailService.js";
import prisma from "../database/client.js";

const HORARIO_RESUMO = 8;
const INTERVALO_VERIFICACAO_MS = 5 * 60 * 1000;

let estadoAnterior = {};
let resumoEnviadoHoje = false;
let ultimoDiaEnvio = null;

function getAlertasComoMapa(alertas) {
  const mapa = {};
  alertas.critico.forEach((a) => { mapa[a.itemId] = "CRITICO"; });
  alertas.alerta.forEach((a) => { mapa[a.itemId] = "ALERTA"; });
  alertas.atencao.forEach((a) => { mapa[a.itemId] = "ATENCAO"; });
  return mapa;
}

function filtrarNovosAlertas(alertas) {
  const novos = { critico: [], alerta: [], atencao: [] };

  alertas.critico.forEach((a) => {
    if (estadoAnterior[a.itemId] !== "CRITICO") novos.critico.push(a);
  });
  alertas.alerta.forEach((a) => {
    if (estadoAnterior[a.itemId] !== "ALERTA") novos.alerta.push(a);
  });
  alertas.atencao.forEach((a) => {
    if (estadoAnterior[a.itemId] !== "ATENCAO") novos.atencao.push(a);
  });

  return novos;
}

async function detectarNormalizados(estadoAtual) {
  const normalizados = [];

  for (const [itemIdStr, nivelAnterior] of Object.entries(estadoAnterior)) {
    const itemId = Number(itemIdStr);
    const nivelAtual = estadoAtual[itemId];

    // Se estava em alerta e agora não está mais (voltou para OK)
    if (!nivelAtual) {
      try {
        const item = await prisma.item.findUnique({ where: { id: itemId } });
        if (item) {
          normalizados.push({
            itemId: item.id,
            itemName: item.name,
            itemType: item.type,
            itemSector: item.sector,
            estoqueAtual: item.quantity,
            margemSeguranca: item.minStock || 0,
            nivelAnterior,
          });
        }
      } catch (error) {
        console.error(`[Scheduler] Erro ao buscar item ${itemId}:`, error.message);
      }
    }
  }

  return normalizados;
}

async function enviarEmailNormalizado(normalizados) {
  const destinatario = process.env.EMAIL_DESTINATARIO;
  if (!destinatario || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;

  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.default.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  let html = `
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
      <h2 style="color: #198754; border-bottom: 2px solid #198754; padding-bottom: 10px;">
        ✅ Estoque Normalizado — Almoxarifado
      </h2>
      <p>Os seguintes itens voltaram ao nível seguro:</p>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="background-color: #198754; color: white;">
            <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Item</th>
            <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Tipo</th>
            <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Setor</th>
            <th style="padding: 8px; text-align: center; border: 1px solid #ddd;">Estoque Atual</th>
            <th style="padding: 8px; text-align: center; border: 1px solid #ddd;">Margem</th>
            <th style="padding: 8px; text-align: center; border: 1px solid #ddd;">Estava em</th>
          </tr>
        </thead>
        <tbody>
  `;

  const nivelLabel = { CRITICO: "Crítico", ALERTA: "Alerta", ATENCAO: "Atenção" };

  normalizados.forEach((item) => {
    html += `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${item.itemName}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${item.itemType}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${item.itemSector}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center; color: #198754; font-weight: bold;">${item.estoqueAtual}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.margemSeguranca}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${nivelLabel[item.nivelAnterior] || item.nivelAnterior}</td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
      <hr style="border: 1px solid #eee; margin-top: 30px;">
      <p style="color: #666; font-size: 12px;">
        Este é um alerta automático do Sistema de Almoxarifado.<br>
        Enviado em: ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
      </p>
    </div>
  `;

  const mailOptions = {
    from: `"Almoxarifado - Alertas" <${process.env.EMAIL_USER}>`,
    to: destinatario,
    subject: `✅ Estoque Normalizado: ${normalizados.length} item(ns) voltaram ao nível seguro`,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email] Normalização enviada para ${destinatario} — ID: ${info.messageId}`);
  } catch (error) {
    console.error("[Email] Erro ao enviar normalização:", error.message);
  }
}

async function verificarAlertas() {
  try {
    const agora = new Date();
    const horaAtual = agora.getHours();
    const diaAtual = agora.toDateString();

    const resultado = await buscarAlertas();
    const estadoAtual = getAlertasComoMapa(resultado.alertas);

    // RESUMO DIÁRIO às 8h
    if (horaAtual >= HORARIO_RESUMO && ultimoDiaEnvio !== diaAtual && !resumoEnviadoHoje) {
      if (resultado.totalAlertas > 0) {
        console.log(`[Scheduler] Enviando resumo diário (${resultado.totalAlertas} alertas)...`);
        await enviarEmailAlerta(resultado.alertas, "📋 Resumo Diário de Estoque");
        console.log("[Scheduler] Resumo diário enviado com sucesso.");
      } else {
        console.log("[Scheduler] Resumo diário: nenhum alerta ativo.");
      }
      resumoEnviadoHoje = true;
      ultimoDiaEnvio = diaAtual;
    }

    if (ultimoDiaEnvio !== diaAtual) {
      resumoEnviadoHoje = false;
    }

    // VERIFICAÇÕES QUE DEPENDEM DO ESTADO ANTERIOR
    if (Object.keys(estadoAnterior).length > 0) {
      // Alerta imediato para NOVOS alertas
      const novos = filtrarNovosAlertas(resultado.alertas);
      const totalNovos = novos.critico.length + novos.alerta.length + novos.atencao.length;

      if (totalNovos > 0) {
        console.log(`[Scheduler] ${totalNovos} novo(s) alerta(s) detectado(s). Enviando e-mail imediato...`);
        await enviarEmailAlerta(novos, "🚨 Novo Alerta de Estoque");
        console.log("[Scheduler] Alerta imediato enviado com sucesso.");
      }

      // E-mail de normalização para itens que SAÍRAM do alerta
      const normalizados = await detectarNormalizados(estadoAtual);
      if (normalizados.length > 0) {
        console.log(`[Scheduler] ${normalizados.length} item(ns) normalizado(s). Enviando e-mail...`);
        await enviarEmailNormalizado(normalizados);
        console.log("[Scheduler] E-mail de normalização enviado com sucesso.");
      }
    } else {
      console.log("[Scheduler] Primeira verificação — registrando estado inicial dos alertas.");
    }

    estadoAnterior = estadoAtual;

  } catch (error) {
    console.error("[Scheduler] Erro na verificação:", error.message);
  }
}

export function iniciarScheduler() {
  console.log(`[Scheduler] Iniciado. Resumo diário às ${HORARIO_RESUMO}h. Verificação a cada 5 min.`);

  setTimeout(() => {
    verificarAlertas();
  }, 15000);

  setInterval(() => {
    verificarAlertas();
  }, INTERVALO_VERIFICACAO_MS);
}