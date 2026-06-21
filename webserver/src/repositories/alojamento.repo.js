// Repositório de Alojamento Local.
// Agrupa as consultas PostGIS sobre os pontos RNAL.

const { query } = require('../db/pool');

async function getAlojamento(dtmnfr) {
  const filtro = dtmnfr ? 'WHERE dtmnfr = $1' : '';
  const params = dtmnfr ? [dtmnfr] : [];

  // Devolve os alojamentos como FeatureCollection GeoJSON, com filtro opcional por freguesia.
  const sql = `
    SELECT jsonb_build_object(
      'type','FeatureCollection',
      'features', COALESCE(jsonb_agg(
        jsonb_build_object(
          'type','Feature',
          'geometry', ST_AsGeoJSON(ST_Transform(geom,4326))::jsonb,
          'properties', jsonb_build_object(
            'nrrnal', nrrnal,
            'denominacao', denominacao,
            'modalidade', modalidade,
            'nr_utentes', nr_utentes,
            'freguesia', freguesia,
            'endereco', endereco)
        )
      ), '[]'::jsonb)
    ) AS geojson
    FROM alojamento_local ${filtro};`;

  const r = await query(sql, params);

  return r.rows[0].geojson;
}

async function getAlProximos(lon, lat, raio) {
  // Converte o ponto recebido em WGS84 para EPSG:3763 e pesquisa dentro do raio.
  const sql = `
    WITH p AS (
      SELECT ST_Transform(ST_SetSRID(ST_MakePoint($1,$2),4326),3763) AS g
    )
    SELECT jsonb_build_object(
      'type','FeatureCollection',
      'features', COALESCE(jsonb_agg(
        jsonb_build_object(
          'type','Feature',
          'geometry', ST_AsGeoJSON(ST_Transform(t.geom,4326))::jsonb,
          'properties', jsonb_build_object(
            'denominacao', t.denominacao,
            'modalidade', t.modalidade,
            'dist_m', round(t.dist::numeric,0))
        ) ORDER BY t.dist
      ), '[]'::jsonb)
    ) AS geojson,
    count(*) AS total
    FROM (
      SELECT al.geom, al.denominacao, al.modalidade,
             ST_Distance(al.geom, p.g) AS dist
      FROM alojamento_local al, p
      WHERE ST_DWithin(al.geom, p.g, $3)
    ) t, p
    GROUP BY p.g;`;

  const r = await query(sql, [lon, lat, raio]);

  if (r.rows.length === 0) {
    return {
      geojson: {
        type: 'FeatureCollection',
        features: [],
      },
      total: 0,
    };
  }

  return r.rows[0];
}

async function getAlMaisProximos(lon, lat, n) {
  // Limita o número de resultados para evitar pedidos excessivos.
  const k = Math.max(1, Math.min(20, parseInt(n, 10) || 5));

  // Usa o operador espacial <-> para ordenar por proximidade ao ponto.
  const sql = `
    WITH p AS (
      SELECT ST_Transform(ST_SetSRID(ST_MakePoint($1,$2),4326),3763) AS g
    )
    SELECT
      ST_X(ST_Transform(al.geom,4326)) AS lon,
      ST_Y(ST_Transform(al.geom,4326)) AS lat,
      al.denominacao, al.modalidade, al.freguesia,
      round(ST_Distance(al.geom, p.g)::numeric, 0) AS dist_m
    FROM alojamento_local al, p
    ORDER BY al.geom <-> p.g
    LIMIT $3;`;

  const r = await query(sql, [lon, lat, k]);

  return r.rows.map((x) => ({
    lon: Number(x.lon),
    lat: Number(x.lat),
    denominacao: x.denominacao,
    modalidade: x.modalidade,
    freguesia: x.freguesia,
    dist_m: Number(x.dist_m),
  }));
}

module.exports = {
  getAlojamento,
  getAlProximos,
  getAlMaisProximos,
};