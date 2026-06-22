import { ImapFlow } from 'imapflow';
import nodemailer from 'nodemailer';
import { simpleParser } from 'mailparser';
import prisma from '../database/client.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { extrairDadosNotaFiscal } from './invoiceExtractorService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '../../uploads/invoices');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ── Cria cliente IMAP ──
function criarClienteImap(tag = 'IMAP') {
  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    logger: false,
  });
  client.on('error', err => console.error(`[${tag}] Erro de rede:`, err.message));
  return client;
}

// ── Função auxiliar para normalizar strings (remover acentos e espaços extras) ──
function normalizarTexto(texto) {
  if (!texto) return '';
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .toUpperCase()
    .trim();
}

// ── Lê e-mails de PEDIDOS (assunto: NOVO PEDIDO) ──
export async function processarEmailsDePedidos() {
  const client = criarClienteImap('E-mail Reader Pedidos');

  try {
    await client.connect();
    let lock = await client.getMailboxLock('INBOX');
    try {
      const messages = await client.search({ seen: false, subject: 'NOVO PEDIDO' });
      if (!messages.length) return;

      for (const seq of messages) {
        const message = await client.fetchOne(seq, { source: true });
        const parsed = await simpleParser(message.source);
        const texto = parsed.text || '';
        const orderData = extrairDadosDoEmail(texto);
        if (orderData.items.length > 0) {
          const newOrder = await criarPedidoNoBanco(orderData);
          if (newOrder) {
            console.log(`[E-mail Reader] Pedido #${newOrder.id} criado via e-mail.`);
          }
        }
        await client.messageFlagsAdd(seq, ['\\Seen']);
      }
    } finally {
      lock.release();
    }
    await client.logout();
  } catch (error) {
    console.error('[E-mail Reader] Erro ao ler e-mails de pedidos:', error.message);
  }
}

// ── Lê e-mails com NOTA FISCAL em anexo (assunto: NOTA FISCAL ou NF-e) ──
export async function processarEmailsDeNotasFiscais() {
  const client = criarClienteImap('E-mail Reader NF');

  try {
    await client.connect();
    let lock = await client.getMailboxLock('INBOX');
    try {
      // Busca e-mails não lidos com assuntos comuns de NF
      const messages = await client.search({
        seen: false,
        or: [
          { subject: 'NOTA FISCAL' },
          { subject: 'NF-e' },
          { subject: 'DANFE' },
          { subject: 'NF ' },
        ],
      });

      if (!messages.length) {
        console.log('[E-mail Reader NF] Nenhum e-mail de nota fiscal não lido.');
        return;
      }

      let salvos = 0;

      for (const seq of messages) {
        try {
          const message = await client.fetchOne(seq, { source: true });
          const parsed = await simpleParser(message.source);

          // Verifica se tem anexo PDF
          const anexosPDF = (parsed.attachments || []).filter(att =>
            att.contentType === 'application/pdf' ||
            (att.filename || '').toLowerCase().endsWith('.pdf')
          );

          if (anexosPDF.length === 0) {
            // Sem PDF — marca como lido e passa
            await client.messageFlagsAdd(seq, ['\\Seen']);
            continue;
          }

          for (const anexo of anexosPDF) {
            const nomeUnico = `email-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`;
            const caminhoArquivo = path.join(UPLOAD_DIR, nomeUnico);

            // Salva o PDF no disco
            fs.writeFileSync(caminhoArquivo, anexo.content);

            // Extrai dados automaticamente do PDF
            let extraido = { supplier: null, invoiceNumber: null, invoiceDate: null, itens: [] };
            try {
              extraido = await extrairDadosNotaFiscal(caminhoArquivo);
            } catch (e) {
              console.error('[E-mail Reader NF] Falha na extração do PDF:', e.message);
            }

            // Usa o assunto do e-mail como fallback para fornecedor
            const fornecedor = extraido.supplier ||
              parsed.from?.value?.[0]?.name ||
              parsed.from?.value?.[0]?.address ||
              null;

            // Salva no banco
            await prisma.invoice.create({
              data: {
                fileName: anexo.filename || `nota-fiscal-email-${Date.now()}.pdf`,
                filePath: nomeUnico,
                fileType: 'application/pdf',
                fileSize: anexo.content.length,
                supplier: fornecedor,
                invoiceNumber: extraido.invoiceNumber || null,
                invoiceDate: extraido.invoiceDate ? new Date(extraido.invoiceDate) : null,
                notes: `Importado automaticamente via e-mail de: ${parsed.from?.text || 'remetente desconhecido'}`,
              },
            });

            salvos++;
            console.log(`[E-mail Reader NF] Nota fiscal salva: ${anexo.filename} (Fornecedor: ${fornecedor}, NF: ${extraido.invoiceNumber})`);

            // ── Entrada automática no estoque pelos itens da NF ──
            if (extraido.itens && extraido.itens.length > 0) {
              let entradasCriadas = 0;
              const todosItens = await prisma.item.findMany({ select: { id: true, name: true } });
              
              for (const itemNF of extraido.itens) {
                const descNormalizadaNF = normalizarTexto(itemNF.descricao);
                
                // Casamento de nome mais inteligente ignorando acentos
                const itemBanco = todosItens.find(i => 
                  descNormalizadaNF.includes(normalizarTexto(i.name))
                ) || null;

                if (itemBanco) {
                  const dataEntrada = extraido.invoiceDate ? new Date(extraido.invoiceDate) : new Date();
                  await prisma.$transaction([
                    prisma.stockEntry.create({
                      data: {
                        itemId: itemBanco.id,
                        quantity: itemNF.quantidade,
                        entryDate: dataEntrada,
                        supplier: fornecedor,
                        notes: `Entrada automática via NF-e ${extraido.invoiceNumber || ''}`.trim(),
                      },
                    }),
                    prisma.item.update({
                      where: { id: itemBanco.id },
                      data: { quantity: { increment: itemNF.quantidade } },
                    }),
                  ]);
                  entradasCriadas++;
                  console.log(`[E-mail Reader NF] Entrada: ${itemNF.quantidade}x "${itemBanco.name}" (NF: ${extraido.invoiceNumber})`);
                } else {
                  console.warn(`[E-mail Reader NF] Item não encontrado no banco: "${itemNF.descricao}" — entrada ignorada.`);
                }
              }
              if (entradasCriadas > 0) {
                console.log(`[E-mail Reader NF] ${entradasCriadas}/${extraido.itens.length} item(ns) dado(s) entrada no estoque automaticamente.`);
              }
            }
          }

          await client.messageFlagsAdd(seq, ['\\Seen']);
        } catch (err) {
          console.error(`[E-mail Reader NF] Erro ao processar mensagem ${seq}:`, err.message);
        }
      }

      console.log(`[E-mail Reader NF] ${salvos} nota(s) fiscal(is) importada(s).`);
    } finally {
      lock.release();
    }
    await client.logout();
  } catch (error) {
    console.error('[E-mail Reader NF] Erro geral:', error.message);
  }
}

// ── Cria transporter SMTP (Gmail) ──
function criarTransporter() {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

// ── Envia e-mail de confirmação de pedido ──
export async function enviarEmailPedido(pedido, destinatario) {
  const transporter = criarTransporter();

  const itensHtml = (pedido.items || [])
    .map(
      (it) =>
        `<tr>
          <td style="padding:6px 10px;border:1px solid #ddd">${it.itemName || it.name}</td>
          <td style="padding:6px 10px;border:1px solid #ddd;text-align:center">${it.itemSize || it.size || '—'}</td>
          <td style="padding:6px 10px;border:1px solid #ddd;text-align:center">${it.quantity || it.qty}</td>
        </tr>`
    )
    .join('');

  const dataFormatada = new Date(pedido.orderDate || Date.now()).toLocaleDateString('pt-BR');

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#2563eb">Novo Pedido #${pedido.id}</h2>
      <p><strong>Data:</strong> ${dataFormatada}</p>
      ${pedido.supplier ? `<p><strong>Fornecedor:</strong> ${pedido.supplier}</p>` : ''}
      ${pedido.notes ? `<p><strong>Observações:</strong> ${pedido.notes}</p>` : ''}
      <h3 style="margin-top:20px">Itens do Pedido</h3>
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="background:#f3f4f6">
            <th style="padding:8px 10px;border:1px solid #ddd;text-align:left">Item</th>
            <th style="padding:8px 10px;border:1px solid #ddd">Tamanho</th>
            <th style="padding:8px 10px;border:1px solid #ddd">Qtd</th>
          </tr>
        </thead>
        <tbody>${itensHtml}</tbody>
      </table>
      <p style="margin-top:20px;color:#6b7280;font-size:12px">
        Este e-mail foi gerado automaticamente pelo sistema de almoxarifado.
      </p>
    </div>
  `;

  const dest = destinatario || process.env.EMAIL_PEDIDOS_DEST || process.env.EMAIL_USER;

  await transporter.sendMail({
    from: `"Almoxarifado" <${process.env.EMAIL_USER}>`,
    to: dest,
    subject: `NOVO PEDIDO #${pedido.id} — ${dataFormatada}`,
    html,
    text: `Novo Pedido #${pedido.id}\nData: ${dataFormatada}\nFornecedor: ${pedido.supplier || '—'}\nItens:\n${(pedido.items || []).map(it => `- ${it.itemName || it.name} | Qtd: ${it.quantity || it.qty} | Tam: ${it.itemSize || it.size || '—'}`).join('\n')}`,
  });

  console.log(`[E-mail Sender] E-mail do pedido #${pedido.id} enviado para ${dest}.`);
}

// ── Envia e-mail de alerta de estoque ──
export async function enviarEmailAlerta(alertas, assunto) {
  const destinatario = process.env.EMAIL_DESTINATARIO;
  if (!destinatario || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('[E-mail Alerta] Variáveis de ambiente EMAIL_DESTINATARIO, EMAIL_USER ou EMAIL_PASS não configuradas.');
    return;
  }

  const transporter = criarTransporter();

  const corNivel = { critico: '#dc3545', alerta: '#fd7e14', atencao: '#ffc107' };
  const labelNivel = { critico: '🔴 Crítico', alerta: '🟠 Alerta', atencao: '🟡 Atenção' };
  const bgNivel = { critico: '#fff5f5', alerta: '#fff8f0', atencao: '#fffdf0' };

  function renderSecao(lista, nivel) {
    if (!lista || lista.length === 0) return '';
    const cor = corNivel[nivel];
    const label = labelNivel[nivel];
    const bg = bgNivel[nivel];

    const linhas = lista.map((item, i) => `
      <tr style="background:${i % 2 === 0 ? bg : '#fff'}">
        <td style="padding:10px 14px;border:1px solid #e0e0e0;font-family:Arial,sans-serif;font-size:13px;font-weight:700">${item.itemName}</td>
        <td style="padding:10px 14px;border:1px solid #e0e0e0;font-family:Arial,sans-serif;font-size:13px">${item.itemType || '—'}</td>
        <td style="padding:10px 14px;border:1px solid #e0e0e0;font-family:Arial,sans-serif;font-size:13px">${item.itemSector || '—'}</td>
        <td style="padding:10px 14px;border:1px solid #e0e0e0;font-family:Arial,sans-serif;font-size:13px;text-align:center;font-weight:800;color:${cor}">${item.estoqueAtual ?? '—'}</td>
        <td style="padding:10px 14px;border:1px solid #e0e0e0;font-family:Arial,sans-serif;font-size:13px;text-align:center">${item.margemSeguranca ?? item.minStock ?? '—'}</td>
      </tr>`).join('');

    return `
      <div style="margin-bottom:24px">
        <div style="background:${cor};color:#fff;padding:8px 14px;border-radius:5px 5px 0 0;font-family:Arial,sans-serif;font-size:13px;font-weight:800">
          ${label} — ${lista.length} item${lista.length !== 1 ? 'ns' : ''}
        </div>
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="background:${cor}22">
              <th style="padding:9px 14px;text-align:left;border:1px solid #e0e0e0;font-family:Arial,sans-serif;font-size:12px;font-weight:700">Item</th>
              <th style="padding:9px 14px;text-align:left;border:1px solid #e0e0e0;font-family:Arial,sans-serif;font-size:12px;font-weight:700">Tipo</th>
              <th style="padding:9px 14px;text-align:left;border:1px solid #e0e0e0;font-family:Arial,sans-serif;font-size:12px;font-weight:700">Setor</th>
              <th style="padding:9px 14px;text-align:center;border:1px solid #e0e0e0;font-family:Arial,sans-serif;font-size:12px;font-weight:700">Estoque</th>
              <th style="padding:9px 14px;text-align:center;border:1px solid #e0e0e0;font-family:Arial,sans-serif;font-size:12px;font-weight:700">Margem</th>
            </tr>
          </thead>
          <tbody>${linhas}</tbody>
        </table>
      </div>`;
  }

  const totalAlertas = (alertas.critico?.length || 0) + (alertas.alerta?.length || 0) + (alertas.atencao?.length || 0);
  const corDestaque = alertas.critico?.length > 0 ? '#dc3545' : alertas.alerta?.length > 0 ? '#fd7e14' : '#ffc107';

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;background:#f4f4f4;padding:20px">
      <div style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">

        <div style="background:#1A1A1A;padding:22px 28px;border-radius:8px 8px 0 0">
          <table style="width:100%;border-collapse:collapse"><tr>
            <td style="vertical-align:middle">
              <table style="border-collapse:collapse"><tr>
                <td style="vertical-align:middle;padding-right:14px">
                  <div style="background:${corDestaque};width:5px;height:40px;border-radius:3px"></div>
                </td>
                <td style="vertical-align:middle">
                  <div style="color:#fff;font-size:17px;font-weight:800;font-family:Arial,sans-serif">⚠️ Alerta de Estoque</div>
                  <div style="color:#999;font-size:12px;margin-top:3px;font-family:Arial,sans-serif">Hiper Comercial Monlevade — Almoxarifado</div>
                </td>
              </tr></table>
            </td>
            <td style="text-align:right;vertical-align:middle">
              <div style="background:${corDestaque};color:#fff;padding:6px 16px;border-radius:5px;font-size:13px;font-weight:800;font-family:Arial,sans-serif">
                ${totalAlertas} item${totalAlertas !== 1 ? 'ns' : ''}
              </div>
            </td>
          </tr></table>
        </div>

        <div style="padding:24px 28px">
          <p style="font-family:Arial,sans-serif;font-size:13px;color:#555;margin:0 0 20px">
            Os seguintes itens requerem atenção imediata:
          </p>
          ${renderSecao(alertas.critico, 'critico')}
          ${renderSecao(alertas.alerta, 'alerta')}
          ${renderSecao(alertas.atencao, 'atencao')}
        </div>

        <div style="background:#1A1A1A;padding:14px 28px;border-top:3px solid ${corDestaque}">
          <table style="width:100%;border-collapse:collapse"><tr>
            <td>
              <div style="color:#fff;font-size:13px;font-weight:800;font-family:Arial,sans-serif">Hiper Comercial Monlevade</div>
              <div style="color:#666;font-size:11px;font-family:Arial,sans-serif;margin-top:2px">Sistema de Almoxarifado · E-mail automático</div>
            </td>
            <td style="text-align:right;vertical-align:middle">
              <div style="color:#555;font-size:11px;font-family:Arial,sans-serif">${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</div>
            </td>
          </tr></table>
        </div>

      </div>
    </div>`;

  const info = await transporter.sendMail({
    from: `"Almoxarifado Hiper" <${process.env.EMAIL_USER}>`,
    to: destinatario,
    subject: assunto,
    html,
  });

  console.log(`[E-mail Alerta] Enviado — ID: ${info.messageId}`);
}

// ── Parser de pedidos por e-mail (mantido) ──
function extrairDadosDoEmail(texto) {
  const lines = texto.split('\n').map(l => l.trim());
  let supplier = '', notes = '', parsingItems = false;
  const items = [];

  for (const line of lines) {
    if (line.toUpperCase().startsWith('FORNECEDOR:')) {
      supplier = line.substring(line.indexOf(':') + 1).trim();
    } else if (line.toUpperCase().startsWith('OBS:')) {
      notes = line.substring(line.indexOf(':') + 1).trim();
    } else if (line.toUpperCase() === 'ITENS:') {
      parsingItems = true;
    } else if (parsingItems && line.startsWith('-')) {
      const parts = line.substring(1).split('|').map(p => p.trim());
      const itemName = parts[0];
      let qty = 1, size = null;
      for (let i = 1; i < parts.length; i++) {
        const partUpper = parts[i].toUpperCase();
        if (partUpper.startsWith('QTD:') || partUpper.startsWith('QUANTIDADE:')) {
          const match = partUpper.match(/\d+/);
          if (match) qty = parseInt(match[0], 10);
        } else if (partUpper.startsWith('TAM:') || partUpper.startsWith('TAMANHO:')) {
          const sep = parts[i].split(':');
          if (sep.length > 1) size = sep[1].trim();
        }
      }
      if (itemName) items.push({ name: itemName, qty, size });
    }
  }
  return { supplier, notes, items };
}

async function criarPedidoNoBanco(orderData) {
  try {
    const orderItems = [];
    for (const extractedItem of orderData.items) {
      const dbItem = await prisma.item.findFirst({
        where: {
          name: { equals: extractedItem.name, mode: 'insensitive' },
          ...(extractedItem.size ? { size: { equals: extractedItem.size, mode: 'insensitive' } } : {}),
        },
      });
      orderItems.push({
        ...(dbItem ? { itemId: dbItem.id, itemName: dbItem.name, itemType: dbItem.type, itemSize: dbItem.size } : { itemName: extractedItem.name, itemSize: extractedItem.size }),
        quantity: extractedItem.qty,
      });
    }
    if (!orderItems.length) return null;
    return await prisma.order.create({
      data: { orderDate: new Date(), supplier: orderData.supplier || null, notes: orderData.notes || null, status: 'PENDENTE', items: { create: orderItems } },
    });
  } catch (err) {
    console.error('[E-mail Reader] Erro ao gravar pedido:', err.message);
    return null;
  }
}