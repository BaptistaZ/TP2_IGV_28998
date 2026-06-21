// Rotas de estado do serviço.
// São montadas em /api no router principal.

const express = require('express');
const ctrl = require('../controllers/freguesias.controller');

const router = express.Router();

router.get('/health', ctrl.health);

module.exports = router;