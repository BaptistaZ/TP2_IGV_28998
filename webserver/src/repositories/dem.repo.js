// Repositório de relevo.
// Agrupa operações sobre DEM raster, declive e perfil de elevação.

const { query, queryComGdal } = require('../db/pool');
const { ganhoAcumulado } = require('../utils/elevacao');

async function getFreguesiaDemStats(dtmnfr) {
  // Calcula estatísticas de altitude para o DEM recortado à freguesia.
  const sql = `
    WITH fr AS (SELECT geom FROM freguesias WHERE dtmnfr = $1)
    SELECT
      round((s.stats).min::numeric, 1)    AS cota_min,
      round((s.stats).max::numeric, 1)    AS cota_max,
      round((s.stats).mean::numeric, 1)   AS cota_media,
      round((s.stats).stddev::numeric, 1) AS cota_desvio,
      (s.stats).count                     AS n_pixeis
    FROM fr,
    LATERAL (
      SELECT ST_SummaryStats(ST_Union(ST_Clip(r.rast, fr.geom, true))) AS stats
      FROM dem r
      WHERE ST_Intersects(r.rast, fr.geom)
    ) s;`;

  const r = await query(sql, [dtmnfr]);

  return r.rows[0] || null;
}

async function getFreguesiaDemTiff(dtmnfr) {
  // Devolve o DEM recortado à freguesia como GeoTIFF.
  const sql = `
    WITH fr AS (SELECT geom FROM freguesias WHERE dtmnfr = $1)
    SELECT ST_AsTIFF(ST_Union(ST_Clip(r.rast, fr.geom, true))) AS tif
    FROM dem r, fr
    WHERE ST_Intersects(r.rast, fr.geom);`;

  const r = await queryComGdal(sql, [dtmnfr]);

  if (r.rows.length === 0 || !r.rows[0].tif) return null;

  return r.rows[0].tif;
}

async function getFreguesiaDecliveTiff(dtmnfr) {
  // Calcula o declive em graus a partir do DEM e devolve o resultado como GeoTIFF.
  const sql = `
    WITH fr AS (SELECT geom FROM freguesias WHERE dtmnfr = $1),
    recorte AS (
      SELECT ST_Union(ST_Clip(r.rast, fr.geom, true)) AS rast
      FROM dem r, fr WHERE ST_Intersects(r.rast, fr.geom)
    )
    SELECT ST_AsTIFF(ST_Slope(rast, 1, '32BF', 'DEGREES')) AS tif
    FROM recorte WHERE rast IS NOT NULL;`;

  const r = await queryComGdal(sql, [dtmnfr]);

  if (r.rows.length === 0 || !r.rows[0].tif) return null;

  return r.rows[0].tif;
}

async function getFreguesiaDecliveStats(dtmnfr) {
  // Calcula estatísticas de declive para a freguesia.
  const sql = `
    WITH fr AS (SELECT geom FROM freguesias WHERE dtmnfr = $1),
    recorte AS (
      SELECT ST_Union(ST_Clip(r.rast, fr.geom, true)) AS rast
      FROM dem r, fr WHERE ST_Intersects(r.rast, fr.geom)
    )
    SELECT
      round((s.stats).min::numeric, 1)  AS declive_min,
      round((s.stats).max::numeric, 1)  AS declive_max,
      round((s.stats).mean::numeric, 1) AS declive_media
    FROM recorte, LATERAL (SELECT ST_SummaryStats(ST_Slope(rast,1,'32BF','DEGREES')) AS stats) s
    WHERE rast IS NOT NULL;`;

  const r = await queryComGdal(sql, [dtmnfr]);

  return r.rows[0] || null;
}

async function getPerfilElevacao(lineGeoJSON, n) {
  const geo = JSON.stringify(lineGeoJSON);

  // Limita o número de amostras para manter a resposta leve.
  const amostras = Math.max(2, Math.min(300, parseInt(n, 10) || 100));

  // Interpola pontos ao longo da linha e consulta a cota do DEM em cada ponto.
  const sql = `
    WITH linha AS (
      SELECT ST_MakeValid(ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON($1),4326),3763)) AS g
    ),
    comprimento AS (SELECT ST_Length(g) AS c FROM linha),
    pontos AS (
      SELECT i,
             ST_LineInterpolatePoint(l.g, i::float / ($2 - 1)) AS pt,
             (SELECT c FROM comprimento) * i::float / ($2 - 1) AS dist
      FROM linha l, generate_series(0, $2 - 1) AS i
    )
    SELECT
      round(p.dist::numeric, 1) AS dist,
      (SELECT round(ST_Value(r.rast, p.pt)::numeric, 1)
         FROM dem r WHERE ST_Intersects(r.rast, p.pt) LIMIT 1) AS cota
    FROM pontos p
    ORDER BY p.dist;`;

  const r = await query(sql, [geo, amostras]);

  const pontos = r.rows.map((x) => ({
    dist: Number(x.dist),
    cota: x.cota != null ? Number(x.cota) : null,
  }));

  const cotas = pontos.map((p) => p.cota).filter((v) => v != null);

  return {
    pontos,
    comprimento_m: pontos.length ? pontos[pontos.length - 1].dist : 0,
    cota_min: cotas.length ? Math.min(...cotas) : null,
    cota_max: cotas.length ? Math.max(...cotas) : null,
    ganho_m: ganhoAcumulado(cotas),
  };
}

async function getConcelhoDemTiff() {
  // Devolve o DEM recortado ao limite do concelho como GeoTIFF.
  const sql = `
    WITH concelho AS (
      SELECT ST_Union(geom) AS geom
      FROM municipios
    ),
    recorte AS (
      SELECT ST_Union(ST_Clip(r.rast, concelho.geom, true)) AS rast
      FROM dem r, concelho
      WHERE ST_Intersects(r.rast, concelho.geom)
    )
    SELECT ST_AsTIFF(rast) AS tif
    FROM recorte
    WHERE rast IS NOT NULL;
  `;

  const r = await queryComGdal(sql);

  if (r.rows.length === 0 || !r.rows[0].tif) return null;

  return r.rows[0].tif;
}

module.exports = {
  getFreguesiaDemStats,
  getFreguesiaDemTiff,
  getFreguesiaDecliveTiff,
  getFreguesiaDecliveStats,
  getPerfilElevacao,
  getConcelhoDemTiff,
};