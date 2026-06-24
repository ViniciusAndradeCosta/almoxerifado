import cron from 'node-cron';
import { processarEmailsDePedidos, processarEmailsDeNotasFiscais } from '../services/emailReaderService.js';

let rodando = false;

export const startEmailReader = () => {
  // Roda a cada 5 minutos — pedidos e NF em sequência no mesmo ciclo
  cron.schedule('*/5 * * * *', async () => {
    if (rodando) {
      console.log('[Cron] Ciclo anterior ainda em andamento. Pulando.');
      return;
    }
    rodando = true;
    try {
      console.log('[Cron] Verificando e-mails de pedidos...');
      await processarEmailsDePedidos();
      console.log('[Cron] Verificando e-mails de notas fiscais...');
      await processarEmailsDeNotasFiscais();
    } catch(e) {
      console.error('[Cron] Erro no ciclo:', e.message);
    } finally {
      rodando = false;
    }
  });

  console.log('[E-mail Scheduler] Iniciado. Verificação a cada 5 minutos.');
};

// Exporta as funções para execução manual via rota de teste
export { processarEmailsDeNotasFiscais, processarEmailsDePedidos };