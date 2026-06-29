import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Mantém o mesmo diretório usado historicamente (back/uploads/invoices).
const UPLOAD_DIR = path.join(__dirname, '../../../uploads/invoices');

function garantirDiretorio() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

// Provider de armazenamento em disco local.
// ATENÇÃO: em hospedagens com filesystem efêmero (ex: Render free), os arquivos
// são perdidos a cada reinício/deploy. Use apenas em desenvolvimento; em produção
// prefira o provider 'sharepoint'.
export const localProvider = {
  name: 'local',

  // Salva um buffer em disco e devolve a chave (nome do arquivo).
  async save({ buffer, originalName }) {
    garantirDiretorio();
    const ext = path.extname(originalName || '');
    const storageKey = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
    fs.writeFileSync(path.join(UPLOAD_DIR, storageKey), buffer);
    return { storageKey, provider: 'local' };
  },

  // Lê o conteúdo de um arquivo previamente salvo.
  async getBuffer(storageKey) {
    const filePath = path.join(UPLOAD_DIR, storageKey);
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath);
  },

  // Verifica se o arquivo existe.
  async exists(storageKey) {
    return fs.existsSync(path.join(UPLOAD_DIR, storageKey));
  },

  // Remove o arquivo (não falha se já não existir).
  async delete(storageKey) {
    const filePath = path.join(UPLOAD_DIR, storageKey);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return true;
  },
};
