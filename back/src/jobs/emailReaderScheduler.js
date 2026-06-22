import cron from 'node-cron';
import { processarEmailsDePedidos, processarEmailsDeNotasFiscais } from '../services/emailReaderService.js';

export const startEmailReader = () => {
    // Roda os dois em sequência para evitar conexões IMAP simultâneas
    cron.schedule('*/1 * * * *', async () => {
        console.log('[Cron] Verificando novos e-mails de pedidos...');
        await processarEmailsDePedidos();

        console.log('[Cron] Verificando novos e-mails de notas fiscais...');
        await processarEmailsDeNotasFiscais();
    });

    console.log('[Cron] Leitor de e-mails iniciado (pedidos + NF: 1min, sequencial).');
};