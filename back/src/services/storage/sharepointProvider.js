import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Pasta separada para os arquivos do MOCK, para não se misturarem com o provider 'local'.
const MOCK_DIR = path.join(__dirname, '../../../uploads/sharepoint-mock');

// ============================================================================
// Provider de armazenamento no SharePoint (Microsoft 365).
//
// >>> ESTADO ATUAL: MOCK <<<
// Enquanto a empresa não fornece as credenciais do SharePoint, este provider
// guarda os arquivos localmente (pasta sharepoint-mock) mas expõe EXATAMENTE a
// mesma interface do provider real. Assim, o restante do sistema já funciona e,
// quando as credenciais chegarem, basta implementar os trechos marcados com
// [GRAPH] abaixo — nenhum outro arquivo do projeto precisará mudar.
//
// Variáveis de ambiente necessárias para o modo real (ver .env.example):
//   SHAREPOINT_TENANT_ID, SHAREPOINT_CLIENT_ID, SHAREPOINT_CLIENT_SECRET,
//   SHAREPOINT_SITE_ID (ou SHAREPOINT_SITE_URL), SHAREPOINT_DRIVE_ID,
//   SHAREPOINT_FOLDER (ex: "NotasFiscais")
// ============================================================================

function getConfig() {
  return {
    tenantId: process.env.SHAREPOINT_TENANT_ID,
    clientId: process.env.SHAREPOINT_CLIENT_ID,
    clientSecret: process.env.SHAREPOINT_CLIENT_SECRET,
    siteId: process.env.SHAREPOINT_SITE_ID,
    driveId: process.env.SHAREPOINT_DRIVE_ID,
    folder: process.env.SHAREPOINT_FOLDER || 'NotasFiscais',
  };
}

// Retorna true quando todas as credenciais reais estão presentes.
function credenciaisPresentes() {
  const c = getConfig();
  return Boolean(c.tenantId && c.clientId && c.clientSecret && c.driveId);
}

function garantirDiretorioMock() {
  if (!fs.existsSync(MOCK_DIR)) fs.mkdirSync(MOCK_DIR, { recursive: true });
}

// ─────────────────────────────────────────────────────────────────────────
// [GRAPH] Autenticação (client credentials flow) — implementar no modo real.
// async function getAccessToken() {
//   const { tenantId, clientId, clientSecret } = getConfig();
//   const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
//   const body = new URLSearchParams({
//     client_id: clientId,
//     client_secret: clientSecret,
//     scope: 'https://graph.microsoft.com/.default',
//     grant_type: 'client_credentials',
//   });
//   const resp = await fetch(url, { method: 'POST', body });
//   const json = await resp.json();
//   return json.access_token;
// }
// ─────────────────────────────────────────────────────────────────────────

export const sharepointProvider = {
  name: 'sharepoint',

  async save({ buffer, originalName }) {
    if (credenciaisPresentes()) {
      // [GRAPH] Modo real:
      //   const token = await getAccessToken();
      //   const { driveId, folder } = getConfig();
      //   const nome = `${Date.now()}-${originalName}`;
      //   const url = `https://graph.microsoft.com/v1.0/drives/${driveId}/root:/${folder}/${nome}:/content`;
      //   const resp = await fetch(url, {
      //     method: 'PUT',
      //     headers: { Authorization: `Bearer ${token}`, 'Content-Type': mimeType },
      //     body: buffer,
      //   });
      //   const item = await resp.json();
      //   return { storageKey: item.id, provider: 'sharepoint' };
      throw new Error('[SharePoint] Credenciais presentes, mas a integração real ainda não foi implementada. Veja os trechos [GRAPH] em sharepointProvider.js.');
    }

    // MOCK: guarda localmente e avisa nos logs.
    garantirDiretorioMock();
    const ext = path.extname(originalName || '');
    const storageKey = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
    fs.writeFileSync(path.join(MOCK_DIR, storageKey), buffer);
    console.warn(`[SharePoint MOCK] Arquivo "${originalName}" salvo localmente como ${storageKey} (configure SHAREPOINT_* para usar o SharePoint real).`);
    return { storageKey, provider: 'sharepoint' };
  },

  async getBuffer(storageKey) {
    if (credenciaisPresentes()) {
      // [GRAPH] Modo real:
      //   const token = await getAccessToken();
      //   const { driveId } = getConfig();
      //   const url = `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${storageKey}/content`;
      //   const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      //   return Buffer.from(await resp.arrayBuffer());
      throw new Error('[SharePoint] Download real ainda não implementado. Veja [GRAPH] em sharepointProvider.js.');
    }
    const filePath = path.join(MOCK_DIR, storageKey);
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath);
  },

  async exists(storageKey) {
    if (credenciaisPresentes()) return true; // [GRAPH] consultar metadados do item
    return fs.existsSync(path.join(MOCK_DIR, storageKey));
  },

  async delete(storageKey) {
    if (credenciaisPresentes()) {
      // [GRAPH] Modo real:
      //   const token = await getAccessToken();
      //   const { driveId } = getConfig();
      //   const url = `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${storageKey}`;
      //   await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      //   return true;
      throw new Error('[SharePoint] Exclusão real ainda não implementada. Veja [GRAPH] em sharepointProvider.js.');
    }
    const filePath = path.join(MOCK_DIR, storageKey);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return true;
  },
};
