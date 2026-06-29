import app from './server.js';

// PORT é injetada pela hospedagem (Render, etc.). HOST 0.0.0.0 aceita conexões externas.
const host = process.env.HOST || '0.0.0.0';
const port = process.env.PORT || 3000;

app.listen(port, host, () => {
    console.log(`Server running on http://${host}:${port}`);
});
