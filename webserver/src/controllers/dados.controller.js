// Controller de dados auxiliares.
// Disponibiliza indicadores, comparação de freguesias e operações sobre subsecções.

const censosRepo = require('../repositories/censos.repo');
const analiseRepo = require('../repositories/analise.repo');
const { numero } = require('../utils/numero');
const { isDtmnfr } = require('../validators');

async function indicadores(req, res, next) {
  try {
    // Indicadores agregados por freguesia usados na coropleta.
    res.json(await censosRepo.getIndicadoresFreguesias());
  } catch (err) {
    next(err);
  }
}

async function comparar(req, res, next) {
  try {
    const ids = String(req.query.ids || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (ids.length === 0) {
      return res.status(400).json({ erro: 'Indica pelo menos um dtmnfr no parametro ids' });
    }

    if (ids.some((id) => !isDtmnfr(id))) {
      return res.status(400).json({ erro: 'Todos os dtmnfr devem ter 6 digitos' });
    }

    if (ids.length > 6) {
      return res.status(400).json({ erro: 'Maximo de 6 freguesias para comparar' });
    }

    // Compara indicadores censitários e territoriais das freguesias indicadas.
    res.json(await censosRepo.compararFreguesias(ids));
  } catch (err) {
    next(err);
  }
}

async function vizinhos(req, res, next) {
  try {
    // Conta as subsecções vizinhas da subsecção BGRI indicada.
    const n = await analiseRepo.getNumVizinhos(req.params.bgri);

    if (n === null) {
      return res.status(404).json({ erro: 'Subseccao nao encontrada' });
    }

    res.json({
      bgri: req.params.bgri,
      n_vizinhos: n,
    });
  } catch (err) {
    next(err);
  }
}

async function buffer(req, res, next) {
  try {
    const dist = numero(req.query.dist, 500);

    if (dist <= 0 || dist > 5000) {
      return res.status(400).json({ erro: 'dist deve estar entre 1 e 5000 metros' });
    }

    // Gera a área de influência da subsecção BGRI para a distância definida.
    const buf = await analiseRepo.getBuffer(req.params.bgri, dist);

    if (!buf) {
      return res.status(404).json({ erro: 'Subseccao nao encontrada' });
    }

    res.json(buf);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  indicadores,
  comparar,
  vizinhos,
  buffer,
};