import { criarTransporter } from '../config/email.js';

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