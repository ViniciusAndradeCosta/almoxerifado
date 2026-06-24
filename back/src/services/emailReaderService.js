import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import prisma from '../database/client.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { extrairDadosNotaFiscal } from './invoiceExtractorService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '../../uploads/invoices');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

function criarClienteImap(tag) {
  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    logger: false,
  });
  client.on('error', err => console.error(`[${tag}] Aviso de rede no IMAP:`, err.message));
  return client;
}

// Remove acentos e padroniza o texto para evitar falhas no casamento de strings
function normalizarTexto(texto) {
  if (!texto) return '';
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

export async function processarEmailsDePedidos() {
  const client = criarClienteImap('E-mail Reader');
  try {
    await client.connect();
    let lock = await client.getMailboxLock('INBOX');
    try {
      const messages = await client.search({ seen: false, subject: 'NOVO PEDIDO' });
      if (messages.length === 0) return;

      for (const seq of messages) {
        const message = await client.fetchOne(seq, { source: true }, { uid: false });
        await client.messageFlagsRemove(seq, ['\\Seen']).catch(()=>{});
        const parsed = await simpleParser(message.source);
        const text = parsed.text;
        if (!text) continue;

        const orderData = extrairDadosDoEmail(text);
        if (orderData.items.length > 0) {
          const createdOrder = await criarPedidoNoBanco(orderData);
          if (createdOrder) {
            await client.messageFlagsAdd(seq, ['\\Seen']);
            console.log(`[E-mail Reader] Pedido #${createdOrder.id} gerado com sucesso via e-mail!`);
          }
        }
      }
    } finally {
      lock.release();
    }
    await client.logout();
  } catch (error) {
    console.error('[E-mail Reader] Erro ao ler e-mails:', error);
  }
}

export async function processarEmailsDeNotasFiscais() {
  const client = criarClienteImap('E-mail Reader NF');
  try {
    await client.connect();
    let lock = await client.getMailboxLock('INBOX');
    try {
      // Busca diretamente por assunto no servidor IMAP — não baixa a caixa inteira
      // Faz uma busca por cada palavra-chave e une os resultados sem duplicatas
      const PALAVRAS_NF = ['NOTA FISCAL', 'NF-E', 'DANFE', 'FATURA', 'INVOICE'];
      const seqSet = new Set();

      for (const palavra of PALAVRAS_NF) {
        try {
          const resultados = await client.search({ seen: false, subject: palavra });
          resultados.forEach(seq => seqSet.add(seq));
        } catch (e) { /* ignora falhas em buscas individuais */ }
      }

      const messages = [...seqSet].sort((a, b) => a - b);
      console.log(`[E-mail Reader NF] E-mails de NF não lidos encontrados: ${messages.length}`);

      if (!messages.length) {
        console.log('[E-mail Reader NF] Nenhum e-mail de NF não lido.');
        return;
      }

      for (const seq of messages) {
        try {
          const message = await client.fetchOne(seq, { source: true }, { uid: false });
          await client.messageFlagsRemove(seq, ['\\Seen']).catch(()=>{});
          const parsed = await simpleParser(message.source);
          console.log(`[E-mail Reader NF] Processando: "${parsed.subject}" — ${parsed.attachments?.length || 0} anexo(s)`);

          const anexosPDF = (parsed.attachments || []).filter(att =>
            att.contentType === 'application/pdf' ||
            att.contentType === 'application/octet-stream' ||
            (att.filename || '').toLowerCase().endsWith('.pdf')
          );

          if (anexosPDF.length === 0) {
            await client.messageFlagsAdd(seq, ['\\Seen']);
            continue;
          }

          for (const anexo of anexosPDF) {
            const nomeUnico = `email-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`;
            const caminhoArquivo = path.join(UPLOAD_DIR, nomeUnico);
            fs.writeFileSync(caminhoArquivo, anexo.content);

            let extraido = { supplier: null, invoiceNumber: null, invoiceDate: null, itens: [] };
            try {
              extraido = await extrairDadosNotaFiscal(caminhoArquivo);
            } catch (e) {
              console.error('[E-mail Reader NF] Falha na extração do PDF:', e.message);
            }

            const fornecedor = extraido.supplier || parsed.from?.value?.[0]?.name || null;

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

            if (extraido.itens && extraido.itens.length > 0) {
              const todosItens = await prisma.item.findMany({ select: { id: true, name: true } });
              for (const itemNF of extraido.itens) {
                const descNormalizadaNF = normalizarTexto(itemNF.descricao);
                const itemBanco = todosItens.find(i => descNormalizadaNF.includes(normalizarTexto(i.name))) || null;

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
                  console.log(`[E-mail Reader NF] Entrada: ${itemNF.quantidade}x "${itemBanco.name}" automatizada.`);
                }
              }
            }
          }
          await client.messageFlagsAdd(seq, ['\\Seen']);
        } catch (err) {
          console.error(`[E-mail Reader NF] Erro na mensagem ${seq}:`, err.message);
        }
      }
    } finally {
      lock.release();
    }
    await client.logout();
  } catch (error) {
    console.error('[E-mail Reader NF] Erro geral:', error.message);
  }
}

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

      orderItems.push(dbItem
        ? { itemId: dbItem.id, itemName: dbItem.name, itemType: dbItem.type, itemSize: dbItem.size, quantity: extractedItem.qty }
        : { itemName: extractedItem.name, itemSize: extractedItem.size, quantity: extractedItem.qty }
      );
    }
    if (orderItems.length === 0) return null;
    return await prisma.order.create({
      data: { orderDate: new Date(), supplier: orderData.supplier || null, notes: orderData.notes || null, status: 'PENDENTE', items: { create: orderItems } },
    });
  } catch (err) {
    console.error('[E-mail Reader] Erro ao gravar pedido:', err);
    return null;
  }
}