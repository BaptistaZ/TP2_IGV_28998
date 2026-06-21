// Ponto de entrada do backend Express.
// Monta middleware, rotas da API, ficheiros estáticos e arranque do servidor.

const path = require('path');
const express = require('express');
const cors = require('cors');

const { port } = require('./src/config/env');
const apiRoutes = require('./src/routes');
const { errorHandler } = require('./src/middleware/errorHandler');
const db = require('./src/db/pool');

const app = express();

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Rotas da API do geoportal.
app.use('/api', apiRoutes);

// Middleware final para tratamento centralizado de erros.
app.use(errorHandler);

const server = app.listen(port, () => {
  console.log(`Servidor IGV a correr em http://localhost:${port}`);
});

// Encerramento controlado do servidor e da ligação à base de dados.
function encerrar() {
  console.log('\nA encerrar o servidor...');

  server.close(async () => {
    try {
      await db.close();
    } catch (_) {}

    process.exit(0);
  });
}

process.on('SIGINT', encerrar);
process.on('SIGTERM', encerrar);

module.exports = app;