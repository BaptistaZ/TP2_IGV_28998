// Rotas de freguesias.
// São montadas em /api/freguesias no router principal.

const express = require('express');
const ctrl = require('../controllers/freguesias.controller');

const router = express.Router();

router.get('/', ctrl.listar);
router.get('/concelho/dem.tif', ctrl.demConcelhoTiff);

router.get('/:dtmnfr', ctrl.detalhe);
router.get('/:dtmnfr/dem', ctrl.demStats);
router.get('/:dtmnfr/dem.tif', ctrl.demTiff);
router.get('/:dtmnfr/declive', ctrl.decliveStats);
router.get('/:dtmnfr/declive.tif', ctrl.decliveTiff);

module.exports = router;