// Controller de análise espacial.
// Gere consultas pontuais, interseção por área, elegibilidade e perfil de elevação.

const analiseRepo = require('../repositories/analise.repo');
const demRepo = require('../repositories/dem.repo');
const { numero } = require('../utils/numero');

async function info(req, res, next) {
  try {
    const lon = numero(req.query.lng, NaN);
    const lat = numero(req.query.lat, NaN);

    if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
      return res.status(400).json({ erro: 'Parametros lat e lng sao obrigatorios' });
    }

    // Consulta informação espacial no ponto clicado no mapa.
    res.json(await analiseRepo.getInfoAtPoint(lon, lat));
  } catch (err) {
    next(err);
  }
}

async function area(req, res, next) {
  try {
    const geometry = req.body && req.body.geometry;

    if (!geometry || !geometry.type) {
      return res.status(400).json({ erro: 'Falta a geometria (GeoJSON) no corpo do pedido' });
    }

    // Calcula estatísticas dos temas que intersectam a área desenhada.
    res.json(await analiseRepo.analiseArea(geometry));
  } catch (err) {
    next(err);
  }
}

async function elegivel(req, res, next) {
  try {
    const b = req.body || {};
    const geometry = b.geometry;

    if (!geometry || !geometry.type) {
      return res.status(400).json({ erro: 'Falta a geometria (GeoJSON) no corpo do pedido' });
    }

    const cotaMin = numero(b.cota_min, 200);
    const distAl = numero(b.dist_al, 500);
    const decliveMax = numero(b.declive_max, 15);
    const usarAl = b.usar_al !== false;
    const usarDeclive = b.usar_declive === true;

    if (cotaMin < -100 || cotaMin > 3000) {
      return res.status(400).json({ erro: 'cota_min fora do intervalo aceitavel' });
    }

    if (distAl <= 0 || distAl > 5000) {
      return res.status(400).json({ erro: 'dist_al deve estar entre 1 e 5000 metros' });
    }

    if (decliveMax < 0 || decliveMax > 90) {
      return res.status(400).json({ erro: 'declive_max deve estar entre 0 e 90 graus' });
    }

    // Executa a análise multicritério com os filtros definidos pelo utilizador.
    res.json(await analiseRepo.analiseElegivel(
      geometry,
      cotaMin,
      usarAl,
      distAl,
      usarDeclive,
      decliveMax
    ));
  } catch (err) {
    next(err);
  }
}

async function perfil(req, res, next) {
  try {
    const b = req.body || {};
    const geometry = b.geometry;

    if (!geometry || geometry.type !== 'LineString') {
      return res.status(400).json({ erro: 'Falta uma geometria LineString (GeoJSON) no corpo do pedido' });
    }

    const n = numero(b.n, 120);

    // Amostra o DEM ao longo da linha enviada pelo frontend.
    res.json(await demRepo.getPerfilElevacao(geometry, n));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  info,
  area,
  elegivel,
  perfil,
};