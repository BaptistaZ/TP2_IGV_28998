// Rotas de Alojamento Local.
// São montadas em /api no router principal.

const express = require('express');
const ctrl = require('../controllers/alojamento.controller');

const router = express.Router();

router.get('/alojamento_local', ctrl.listar);
router.get('/al/proximos', ctrl.proximos);
router.get('/al/mais-proximos', ctrl.maisProximos);

module.exports = router;