// Rotas de análise espacial.
// São montadas em /api no router principal.

const express = require('express');
const ctrl = require('../controllers/analise.controller');

const router = express.Router();

router.get('/info', ctrl.info);
router.post('/analise/area', ctrl.area);
router.post('/analise/elegivel', ctrl.elegivel);
router.post('/perfil-elevacao', ctrl.perfil);

module.exports = router;