import app from './server.js';

const host = process.env.HOST;
const port = process.env.PORT;

app.listen(port, host, () => {
    console.log(`Server running on http:/${host}:${port}`);
});
