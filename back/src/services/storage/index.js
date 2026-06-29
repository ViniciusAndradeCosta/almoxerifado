import { localProvider } from './localProvider.js';
import { sharepointProvider } from './sharepointProvider.js';

// ============================================================================
// Factory de armazenamento de arquivos (notas fiscais).
//
// Seleciona o provider conforme a variável de ambiente STORAGE_PROVIDER:
//   STORAGE_PROVIDER=local       -> disco local (desenvolvimento)
//   STORAGE_PROVIDER=sharepoint  -> SharePoint da empresa (mock até as credenciais)
//
// Todos os providers implementam a MESMA interface:
//   save({ buffer, originalName, mimeType }) -> { storageKey, provider }
//   getBuffer(storageKey) -> Buffer | null
//   exists(storageKey)    -> boolean
//   delete(storageKey)    -> boolean
// ============================================================================

const PROVIDERS = {
  local: localProvider,
  sharepoint: sharepointProvider,
};

// Provider configurado para SALVAR novos arquivos.
export function getStorageProvider() {
  const nome = (process.env.STORAGE_PROVIDER || 'local').toLowerCase();
  const provider = PROVIDERS[nome];
  if (!provider) {
    console.warn(`[Storage] STORAGE_PROVIDER="${nome}" inválido. Usando 'local'.`);
    return PROVIDERS.local;
  }
  return provider;
}

// Provider correspondente a um arquivo JÁ existente (com base no campo
// invoice.storageProvider). Garante que arquivos antigos sejam lidos/excluídos
// pelo provider correto mesmo após trocar o STORAGE_PROVIDER padrão.
export function getProviderByName(nome) {
  return PROVIDERS[(nome || 'local').toLowerCase()] || PROVIDERS.local;
}
