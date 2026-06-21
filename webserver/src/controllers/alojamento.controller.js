// Controller de Alojamento Local.
// Expõe a camada de pontos, a pesquisa por raio e os alojamentos mais próximos.

const alojamentoRepo = require('../repositories/alojamento.repo');
const { numero } = require('../utils/numero');
const { isDtmnfr } = require('../validators');

async function listar(req, res, next) {
  try {
    const dtmnfr = req.query.dtmnfr;

    if (dtmnfr && !isDtmnfr(dtmnfr)) {
      return res.status(400).json({ erro: 'dtmnfr deve ter 6 digitos' });
    }

    res.json(await alojamentoRepo.getAlojamento(dtmnfr || null));
  } catch (err) {
    next(err);
  }
}

async function proximos(req, res, next) {
  try {
    const lon = numero(req.query.lng, NaN);
    const lat = numero(req.query.lat, NaN);
    const raio = numero(req.query.raio, 500);

    if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
      return res.status(400).json({ erro: 'Parametros lat e lng sao obrigatorios' });
    }

    if (raio <= 0 || raio > 5000) {
      return res.status(400).json({ erro: 'raio deve estar entre 1 e 5000 metros' });
    }

    // Pesquisa alojamentos dentro do raio definido a partir do ponto recebido.
    res.json(await alojamentoRepo.getAlProximos(lon, lat, raio));
  } catch (err) {
    next(err);
  }
}

async function maisProximos(req, res, next) {
  try {
    const lon = numero(req.query.lng, NaN);
    const lat = numero(req.query.lat, NaN);
    const n = numero(req.query.n, 5);

    if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
      return res.status(400).json({ erro: 'Parametros lat e lng sao obrigatorios' });
    }

    // Pesquisa os N alojamentos mais próximos do ponto recebido.
    res.json(await alojamentoRepo.getAlMaisProximos(lon, lat, n));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listar,
  proximos,
  maisProximos,
};