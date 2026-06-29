import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from './routes/routes.js';
import { iniciarScheduler } from './jobs/alertScheduler.js';
import { startEmailReader } from './jobs/emailReaderScheduler.js';

const app = express();

// Cabeçalhos de segurança HTTP.
app.use(helmet());

// CORS: em produção, defina CORS_ORIGIN com a(s) origem(ns) permitida(s),
// separadas por vírgula (ex: "https://meuapp.vercel.app").
// Sem a variável, libera tudo (apenas para desenvolvimento).
const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : '*';
app.use(cors({ origin: corsOrigins }));

app.use(express.json());
app.use(routes);

// Jobs de e-mail (alertas de estoque + importação automática de pedidos/NF).
// Só iniciam quando explicitamente habilitados, evitando ruído/erros quando
// as credenciais de e-mail não estão configuradas ou no free tier que hiberna.
if (process.env.ENABLE_EMAIL_JOBS === 'true') {
    iniciarScheduler();
    startEmailReader();
    console.log('[Server] Jobs de e-mail habilitados (ENABLE_EMAIL_JOBS=true).');
} else {
    console.log('[Server] Jobs de e-mail desabilitados (defina ENABLE_EMAIL_JOBS=true para ativar).');
}

export default app;
