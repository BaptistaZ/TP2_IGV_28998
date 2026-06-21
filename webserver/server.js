const express = require('express');
const path = require('path');
const cors = require('cors');
const Database = require('./database');

const app = express();
const port = process.env.PORT || 3000;

const db = new Database();

app.use(cors());
app.use(express.json({ limit: '5mb' })); 
app.use(express.static(path.join(__dirname, 'public')));

function numero(valor, defeito) {
  const n = parseFloat(valor);
  return Number.isFinite(n) ? n : defeito;
}

app.get('/api/health', async (req, res, next) => {
  try {
    const v = await db.testConnection();
    res.json({ ok: true, postgis: v });
  } catch (err) {
    res.status(503).json({ ok: false, erro: 'Sem ligacao a base de dados', detalhe: err.message });
  }
});

app.get('/api/freguesias', async (req, res, next) => {
  try {
    res.json(await db.getFreguesias());
  } catch (err) { next(err); }
});

app.get('/api/freguesias/:dtmnfr', async (req, res, next) => {
  try {
    const dtmnfr = req.params.dtmnfr;
    if (!/^\d{6}$/.test(dtmnfr)) {
      return res.status(400).json({ erro: 'dtmnfr deve ter 6 digitos' });
    }
    const info = await db.getFreguesiaInfo(dtmnfr);
    if (!info) return res.status(404).json({ erro: 'Freguesia nao encontrada' });
    const [censos, dem] = await Promise.all([
      db.getCensosFreguesia(dtmnfr),
      db.getFreguesiaDemStats(dtmnfr),
    ]);
    res.json({ info, censos, dem });
  } catch (err) { next(err); }
});

app.get('/api/freguesias/:dtmnfr/dem', async (req, res, next) => {
  try {
    const dtmnfr = req.params.dtmnfr;
    if (!/^\d{6}$/.test(dtmnfr)) {
      return res.status(400).json({ erro: 'dtmnfr deve ter 6 digitos' });
    }
    const dem = await db.getFreguesiaDemStats(dtmnfr);
    if (!dem || dem.n_pixeis === null) {
      return res.status(404).json({ erro: 'Sem dados de relevo para esta freguesia' });
    }
    res.json(dem);
  } catch (err) { next(err); }
});

app.get('/api/freguesias/:dtmnfr/dem.tif', async (req, res, next) => {
  try {
    const dtmnfr = req.params.dtmnfr;
    if (!/^\d{6}$/.test(dtmnfr)) {
      return res.status(400).json({ erro: 'dtmnfr deve ter 6 digitos' });
    }
    const tif = await db.getFreguesiaDemTiff(dtmnfr);
    if (!tif) return res.status(404).json({ erro: 'DEM nao encontrado para a freguesia' });
    res.setHeader('Content-Type', 'image/tiff');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(tif);
  } catch (err) { next(err); }
});

app.get('/api/alojamento_local', async (req, res, next) => {
  try {
    const dtmnfr = req.query.dtmnfr;
    if (dtmnfr && !/^\d{6}$/.test(dtmnfr)) {
      return res.status(400).json({ erro: 'dtmnfr deve ter 6 digitos' });
    }
    res.json(await db.getAlojamento(dtmnfr || null));
  } catch (err) { next(err); }
});

app.get('/api/info', async (req, res, next) => {
  try {
    const lon = numero(req.query.lng, NaN);
    const lat = numero(req.query.lat, NaN);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
      return res.status(400).json({ erro: 'Parametros lat e lng sao obrigatorios' });
    }
    res.json(await db.getInfoAtPoint(lon, lat));
  } catch (err) { next(err); }
});

app.get('/api/al/proximos', async (req, res, next) => {
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
    res.json(await db.getAlProximos(lon, lat, raio));
  } catch (err) { next(err); }
});

app.post('/api/analise/area', async (req, res, next) => {
  try {
    const geometry = req.body && req.body.geometry;
    if (!geometry || !geometry.type) {
      return res.status(400).json({ erro: 'Falta a geometria (GeoJSON) no corpo do pedido' });
    }
    res.json(await db.analiseArea(geometry));
  } catch (err) { next(err); }
});

app.post('/api/analise/elegivel', async (req, res, next) => {
  try {
    const b = req.body || {};
    const geometry = b.geometry;
    if (!geometry || !geometry.type) {
      return res.status(400).json({ erro: 'Falta a geometria (GeoJSON) no corpo do pedido' });
    }
    const cotaMin = numero(b.cota_min, 200);
    const distAl = numero(b.dist_al, 500);
    const decliveMax = numero(b.declive_max, 15);
    const usarAl = b.usar_al !== false; // por defeito true
    const usarDeclive = b.usar_declive === true; // por defeito false
    if (cotaMin < -100 || cotaMin > 3000) {
      return res.status(400).json({ erro: 'cota_min fora do intervalo aceitavel' });
    }
    if (distAl <= 0 || distAl > 5000) {
      return res.status(400).json({ erro: 'dist_al deve estar entre 1 e 5000 metros' });
    }
    if (decliveMax < 0 || decliveMax > 90) {
      return res.status(400).json({ erro: 'declive_max deve estar entre 0 e 90 graus' });
    }
    const resultado = await db.analiseElegivel(geometry, cotaMin, usarAl, distAl, usarDeclive, decliveMax);
    res.json(resultado);
  } catch (err) { next(err); }
});

app.get('/api/subseccoes/:bgri/vizinhos', async (req, res, next) => {
  try {
    const bgri = req.params.bgri;
    const n = await db.getNumVizinhos(bgri);
    if (n === null) return res.status(404).json({ erro: 'Subseccao nao encontrada' });
    res.json({ bgri, n_vizinhos: n });
  } catch (err) { next(err); }
});

app.get('/api/subseccoes/:bgri/buffer', async (req, res, next) => {
  try {
    const bgri = req.params.bgri;
    const dist = numero(req.query.dist, 500);
    if (dist <= 0 || dist > 5000) {
      return res.status(400).json({ erro: 'dist deve estar entre 1 e 5000 metros' });
    }
    const buffer = await db.getBuffer(bgri, dist);
    if (!buffer) return res.status(404).json({ erro: 'Subseccao nao encontrada' });
    res.json(buffer);
  } catch (err) { next(err); }
});

// ---- Funcionalidades de analise espacial ----

// Perfil de elevacao ao longo de uma linha desenhada
app.post('/api/perfil-elevacao', async (req, res, next) => {
  try {
    const b = req.body || {};
    const geometry = b.geometry;
    if (!geometry || geometry.type !== 'LineString') {
      return res.status(400).json({ erro: 'Falta uma geometria LineString (GeoJSON) no corpo do pedido' });
    }
    const n = numero(b.n, 120);
    res.json(await db.getPerfilElevacao(geometry, n));
  } catch (err) { next(err); }
});

// Alojamentos locais mais proximos de um ponto (KNN)
app.get('/api/al/mais-proximos', async (req, res, next) => {
  try {
    const lon = numero(req.query.lng, NaN);
    const lat = numero(req.query.lat, NaN);
    const n = numero(req.query.n, 5);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
      return res.status(400).json({ erro: 'Parametros lat e lng sao obrigatorios' });
    }
    res.json(await db.getAlMaisProximos(lon, lat, n));
  } catch (err) { next(err); }
});

// Declive (graus) de uma freguesia, derivado do DEM, em GeoTIFF
app.get('/api/freguesias/:dtmnfr/declive.tif', async (req, res, next) => {
  try {
    const dtmnfr = req.params.dtmnfr;
    if (!/^\d{6}$/.test(dtmnfr)) {
      return res.status(400).json({ erro: 'dtmnfr deve ter 6 digitos' });
    }
    const tif = await db.getFreguesiaDecliveTiff(dtmnfr);
    if (!tif) return res.status(404).json({ erro: 'Declive nao disponivel para a freguesia' });
    res.setHeader('Content-Type', 'image/tiff');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(tif);
  } catch (err) { next(err); }
});

// Estatisticas de declive de uma freguesia
app.get('/api/freguesias/:dtmnfr/declive', async (req, res, next) => {
  try {
    const dtmnfr = req.params.dtmnfr;
    if (!/^\d{6}$/.test(dtmnfr)) {
      return res.status(400).json({ erro: 'dtmnfr deve ter 6 digitos' });
    }
    const stats = await db.getFreguesiaDecliveStats(dtmnfr);
    if (!stats) return res.status(404).json({ erro: 'Sem dados de declive para esta freguesia' });
    res.json(stats);
  } catch (err) { next(err); }
});

// Indicadores por freguesia (coropleta configuravel)
app.get('/api/indicadores', async (req, res, next) => {
  try {
    res.json(await db.getIndicadoresFreguesias());
  } catch (err) { next(err); }
});

// Comparar varias freguesias (lista de dtmnfr separada por virgulas)
app.get('/api/comparar', async (req, res, next) => {
  try {
    const ids = String(req.query.ids || '').split(',').map((s) => s.trim()).filter(Boolean);
    if (ids.length === 0) {
      return res.status(400).json({ erro: 'Indica pelo menos um dtmnfr no parametro ids' });
    }
    if (ids.some((id) => !/^\d{6}$/.test(id))) {
      return res.status(400).json({ erro: 'Todos os dtmnfr devem ter 6 digitos' });
    }
    if (ids.length > 6) {
      return res.status(400).json({ erro: 'Maximo de 6 freguesias para comparar' });
    }
    res.json(await db.compararFreguesias(ids));
  } catch (err) { next(err); }
});

app.use('/api', (req, res) => {
  res.status(404).json({ erro: 'Rota da API nao encontrada' });
});

app.use((err, req, res, next) => {
  console.error('Erro na rota', req.method, req.originalUrl, '->', err.message);
  res.status(500).json({ erro: 'Erro interno do servidor', detalhe: err.message });
});

const server = app.listen(port, () => {
  console.log(`Servidor IGV a correr em http://localhost:${port}`);
});

function encerrar() {
  console.log('\nA encerrar o servidor...');
  server.close(async () => {
    try { await db.close(); } catch (_) {}
    process.exit(0);
  });
}
process.on('SIGINT', encerrar);
process.on('SIGTERM', encerrar);

module.exports = app;