import nodemailer from 'nodemailer';

// ============================================================================
// Configuração central de e-mail (IMAP de leitura + SMTP de envio).
//
// Suporta DOIS provedores de forma transparente, escolhidos por env:
//   EMAIL_PROVIDER=outlook  (padrão)  -> Microsoft 365 / Outlook (usado pela empresa)
//   EMAIL_PROVIDER=gmail              -> Gmail (útil para testes)
//
// Você pode ainda sobrescrever host/porta individualmente via
// EMAIL_IMAP_HOST / EMAIL_IMAP_PORT / EMAIL_IMAP_SECURE e os equivalentes SMTP,
// caso use outro provedor. Nenhum host fica fixo no código.
// ============================================================================

// Presets prontos para os dois provedores suportados.
const PRESETS = {
  outlook: {
    imap: { host: 'outlook.office365.com', port: 993, secure: true },
    smtp: { host: 'smtp.office365.com', port: 587, secure: false }, // 587 = STARTTLS
  },
  gmail: {
    imap: { host: 'imap.gmail.com', port: 993, secure: true },
    smtp: { host: 'smtp.gmail.com', port: 587, secure: false },
  },
};

function getPreset() {
  const nome = (process.env.EMAIL_PROVIDER || 'outlook').toLowerCase();
  return PRESETS[nome] || PRESETS.outlook;
}

// ── Configuração IMAP (leitura de e-mails de pedidos/NF) ──
export function getImapConfig() {
  const preset = getPreset();
  return {
    host: process.env.EMAIL_IMAP_HOST || preset.imap.host,
    port: parseInt(process.env.EMAIL_IMAP_PORT || String(preset.imap.port), 10),
    secure: process.env.EMAIL_IMAP_SECURE ? process.env.EMAIL_IMAP_SECURE === 'true' : preset.imap.secure,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  };
}

// ── Configuração SMTP (envio de alertas/pedidos) ──
export function getSmtpConfig() {
  const preset = getPreset();
  return {
    host: process.env.EMAIL_SMTP_HOST || preset.smtp.host,
    port: parseInt(process.env.EMAIL_SMTP_PORT || String(preset.smtp.port), 10),
    // 587 usa STARTTLS (secure=false); 465 usa SSL direto (secure=true).
    secure: process.env.EMAIL_SMTP_SECURE ? process.env.EMAIL_SMTP_SECURE === 'true' : preset.smtp.secure,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  };
}

// ── Factory do transporter Nodemailer ──
export function criarTransporter() {
  return nodemailer.createTransport(getSmtpConfig());
}

// Indica se as credenciais mínimas de e-mail estão configuradas.
export function emailConfigurado() {
  return Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);
}
