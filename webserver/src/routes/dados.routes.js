// Rotas de dados auxiliares.
// São montadas em /api e servem indicadores, comparação e operações sobre subsecções.

const express = require('express');
const ctrl = require('../controllers/dados.controller');

const router = express.Router();

router.get('/indicadores', ctrl.indicadores);
router.get('/comparar', ctrl.comparar);
router.get('/subseccoes/:bgri/vizinhos', ctrl.vizinhos);
router.get('/subseccoes/:bgri/buffer', ctrl.buffer);

module.exports = router;