import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Pasta separada para os arquivos do MOCK, para não se misturarem com o provider 'local'.
const MOCK_DIR = path.join(__dirname, '../../../uploads/sharepoint-mock');

// ============================================================================
// Provider de armazenamento no SharePoint (Microsoft 365 / Microsoft Graph).
//
// Funciona em DOIS modos automáticos:
//   • REAL  — quando todas as credenciais SHAREPOINT_* estão definidas, usa o
//             Microsoft Graph (autenticação app-only / client credentials).
//   • MOCK  — quando faltam credenciais, guarda os arquivos localmente
//             (pasta sharepoint-mock) para o sistema continuar funcionando.
//
// Ou seja: o código real JÁ ESTÁ PRONTO. Quando o TI entregar as credenciais,
// basta preencher as variáveis de ambiente (ver .env.example) e definir
// STORAGE_PROVIDER=sharepoint — nenhuma outra alteração de código é necessária.
//
// Variáveis de ambiente (modo real):
//   SHAREPOINT_TENANT_ID, SHAREPOINT_CLIENT_ID, SHAREPOINT_CLIENT_SECRET,
//   SHAREPOINT_DRIVE_ID, SHAREPOINT_FOLDER (ex: "NotasFiscais")
//   (SHAREPOINT_SITE_ID é opcional; útil só se preferir resolver o drive por site)
// ============================================================================

const GRAPH = 'https://graph.microsoft.com/v1.0';

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

// Retorna true quando as credenciais mínimas do modo real estão presentes.
function credenciaisPresentes() {
  const c = getConfig();
  return Boolean(c.tenantId && c.clientId && c.clientSecret && c.driveId);
}

function garantirDiretorioMock() {
  if (!fs.existsSync(MOCK_DIR)) fs.mkdirSync(MOCK_DIR, { recursive: true });
}

// ── Cache simples do token de acesso (renova ~1 min antes de expirar) ──
let tokenCache = { value: null, expiresAt: 0 };

// Autenticação app-only (client credentials flow).
async function getAccessToken() {
  if (tokenCache.value && Date.now() < tokenCache.expiresAt) {
    return tokenCache.value;
  }
  const { tenantId, clientId, clientSecret } = getConfig();
  const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  });

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!resp.ok) {
    throw new Error(`[SharePoint] Falha ao obter token (${resp.status}): ${await resp.text()}`);
  }

  const json = await resp.json();
  tokenCache = {
    value: json.access_token,
    expiresAt: Date.now() + Math.max(0, (json.expires_in - 60)) * 1000,
  };
  return tokenCache.value;
}

async function authHeaders() {
  return { Authorization: `Bearer ${await getAccessToken()}` };
}

// Codifica cada segmento do caminho preservando as barras.
function encodePath(p) {
  return p.split('/').filter(Boolean).map(encodeURIComponent).join('/');
}

export const sharepointProvider = {
  name: 'sharepoint',

  // Salva o buffer no SharePoint (ou no mock) e devolve a chave do item.
  async save({ buffer, originalName, mimeType }) {
    if (!credenciaisPresentes()) {
      // ── MOCK ──
      garantirDiretorioMock();
      const ext = path.extname(originalName || '');
      const storageKey = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
      fs.writeFileSync(path.join(MOCK_DIR, storageKey), buffer);
      console.warn(`[SharePoint MOCK] "${originalName}" salvo localmente como ${storageKey} (configure SHAREPOINT_* para usar o SharePoint real).`);
      return { storageKey, provider: 'sharepoint' };
    }

    // ── REAL (Microsoft Graph): upload simples por PUT .../content ──
    const { driveId, folder } = getConfig();
    const nome = `${Date.now()}-${originalName || 'arquivo'}`;
    const caminho = encodePath(`${folder}/${nome}`);
    const url = `${GRAPH}/drives/${driveId}/root:/${caminho}:/content`;

    const resp = await fetch(url, {
      method: 'PUT',
      headers: { ...(await authHeaders()), 'Content-Type': mimeType || 'application/octet-stream' },
      body: buffer,
    });

    if (!resp.ok) {
      throw new Error(`[SharePoint] Falha no upload (${resp.status}): ${await resp.text()}`);
    }

    const item = await resp.json();
    // A chave de armazenamento é o ID do item no drive.
    return { storageKey: item.id, provider: 'sharepoint' };
  },

  // Baixa o conteúdo do arquivo. Retorna Buffer ou null se não existir.
  async getBuffer(storageKey) {
    if (!credenciaisPresentes()) {
      const filePath = path.join(MOCK_DIR, storageKey);
      if (!fs.existsSync(filePath)) return null;
      return fs.readFileSync(filePath);
    }

    const { driveId } = getConfig();
    const url = `${GRAPH}/drives/${driveId}/items/${storageKey}/content`;
    const resp = await fetch(url, { headers: await authHeaders() });

    if (resp.status === 404) return null;
    if (!resp.ok) {
      throw new Error(`[SharePoint] Falha no download (${resp.status}): ${await resp.text()}`);
    }
    return Buffer.from(await resp.arrayBuffer());
  },

  // Verifica se o arquivo existe.
  async exists(storageKey) {
    if (!credenciaisPresentes()) {
      return fs.existsSync(path.join(MOCK_DIR, storageKey));
    }
    const { driveId } = getConfig();
    const resp = await fetch(`${GRAPH}/drives/${driveId}/items/${storageKey}`, {
      headers: await authHeaders(),
    });
    return resp.ok;
  },

  // Remove o arquivo (não falha se já não existir).
  async delete(storageKey) {
    if (!credenciaisPresentes()) {
      const filePath = path.join(MOCK_DIR, storageKey);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return true;
    }

    const { driveId } = getConfig();
    const resp = await fetch(`${GRAPH}/drives/${driveId}/items/${storageKey}`, {
      method: 'DELETE',
      headers: await authHeaders(),
    });
    if (!resp.ok && resp.status !== 404) {
      throw new Error(`[SharePoint] Falha ao excluir (${resp.status}): ${await resp.text()}`);
    }
    return true;
  },
};
