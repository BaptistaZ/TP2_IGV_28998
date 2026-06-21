// Controllers de estado do serviço e de freguesias.
// Disponibiliza health check, limites administrativos, censos, DEM e declive.

const db = require('../db/pool');
const freguesiasRepo = require('../repositories/freguesias.repo');
const censosRepo = require('../repositories/censos.repo');
const demRepo = require('../repositories/dem.repo');
const { isDtmnfr } = require('../validators');

async function health(req, res) {
  try {
    const v = await db.testConnection();

    res.json({
      ok: true,
      postgis: v,
    });
  } catch (err) {
    res.status(503).json({
      ok: false,
      erro: 'Sem ligacao a base de dados',
      detalhe: err.message,
    });
  }
}

async function listar(req, res, next) {
  try {
    // Devolve as freguesias em GeoJSON para visualização no frontend.
    res.json(await freguesiasRepo.getFreguesias());
  } catch (err) {
    next(err);
  }
}

async function detalhe(req, res, next) {
  try {
    const dtmnfr = req.params.dtmnfr;

    if (!isDtmnfr(dtmnfr)) {
      return res.status(400).json({ erro: 'dtmnfr deve ter 6 digitos' });
    }

    const info = await freguesiasRepo.getFreguesiaInfo(dtmnfr);

    if (!info) {
      return res.status(404).json({ erro: 'Freguesia nao encontrada' });
    }

    // Junta informação administrativa, censos e estatísticas de relevo.
    const [censos, dem] = await Promise.all([
      censosRepo.getCensosFreguesia(dtmnfr),
      demRepo.getFreguesiaDemStats(dtmnfr),
    ]);

    res.json({
      info,
      censos,
      dem,
    });
  } catch (err) {
    next(err);
  }
}

async function demStats(req, res, next) {
  try {
    const dtmnfr = req.params.dtmnfr;

    if (!isDtmnfr(dtmnfr)) {
      return res.status(400).json({ erro: 'dtmnfr deve ter 6 digitos' });
    }

    const dem = await demRepo.getFreguesiaDemStats(dtmnfr);

    if (!dem || dem.n_pixeis === null) {
      return res.status(404).json({ erro: 'Sem dados de relevo para esta freguesia' });
    }

    res.json(dem);
  } catch (err) {
    next(err);
  }
}

async function demTiff(req, res, next) {
  try {
    const dtmnfr = req.params.dtmnfr;

    if (!isDtmnfr(dtmnfr)) {
      return res.status(400).json({ erro: 'dtmnfr deve ter 6 digitos' });
    }

    const tif = await demRepo.getFreguesiaDemTiff(dtmnfr);

    if (!tif) {
      return res.status(404).json({ erro: 'DEM nao encontrado para a freguesia' });
    }

    // Envia o GeoTIFF diretamente para ser interpretado no frontend.
    res.setHeader('Content-Type', 'image/tiff');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(tif);
  } catch (err) {
    next(err);
  }
}

async function decliveStats(req, res, next) {
  try {
    const dtmnfr = req.params.dtmnfr;

    if (!isDtmnfr(dtmnfr)) {
      return res.status(400).json({ erro: 'dtmnfr deve ter 6 digitos' });
    }

    const stats = await demRepo.getFreguesiaDecliveStats(dtmnfr);

    if (!stats) {
      return res.status(404).json({ erro: 'Sem dados de declive para esta freguesia' });
    }

    res.json(stats);
  } catch (err) {
    next(err);
  }
}

async function decliveTiff(req, res, next) {
  try {
    const dtmnfr = req.params.dtmnfr;

    if (!isDtmnfr(dtmnfr)) {
      return res.status(400).json({ erro: 'dtmnfr deve ter 6 digitos' });
    }

    const tif = await demRepo.getFreguesiaDecliveTiff(dtmnfr);

    if (!tif) {
      return res.status(404).json({ erro: 'Declive nao disponivel para a freguesia' });
    }

    // Envia o raster de declive em formato GeoTIFF.
    res.setHeader('Content-Type', 'image/tiff');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(tif);
  } catch (err) {
    next(err);
  }
}

async function demConcelhoTiff(req, res, next) {
  try {
    const tif = await demRepo.getConcelhoDemTiff();

    if (!tif) {
      return res.status(404).json({ erro: 'DEM nao encontrado para o concelho' });
    }

    // Envia o DEM do concelho completo para a camada raster global.
    res.setHeader('Content-Type', 'image/tiff');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(tif);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  health,
  listar,
  detalhe,
  demStats,
  demTiff,
  decliveStats,
  decliveTiff,
  demConcelhoTiff,
};