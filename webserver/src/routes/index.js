// Agregador de rotas da API.
// Todas estas rotas são montadas sob /api no server.js.

const express = require('express');
const { notFoundApi } = require('../middleware/errorHandler');

const health = require('./health.routes');
const freguesias = require('./freguesias.routes');
const alojamento = require('./alojamento.routes');
const analise = require('./analise.routes');
const dados = require('./dados.routes');

const router = express.Router();

router.use(health);
router.use('/freguesias', freguesias);
router.use(alojamento);
router.use(analise);
router.use(dados);

// Resposta 404 para qualquer endpoint /api não reconhecido.
router.use(notFoundApi);

module.exports = router;