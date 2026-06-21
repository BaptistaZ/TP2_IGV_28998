// Repositório de limites administrativos.
// Consulta freguesias e respetivas propriedades base.

const { query } = require('../db/pool');

async function getFreguesias() {
  // Devolve todas as freguesias como FeatureCollection GeoJSON em EPSG:4326.
  const sql = `
    SELECT jsonb_build_object(
      'type','FeatureCollection',
      'features', COALESCE(jsonb_agg(
        jsonb_build_object(
          'type','Feature',
          'geometry', ST_AsGeoJSON(ST_Transform(geom,4326))::jsonb,
          'properties', jsonb_build_object(
            'dtmnfr', dtmnfr,
            'freguesia', freguesia,
            'area_ha', area_ha)
        ) ORDER BY freguesia
      ), '[]'::jsonb)
    ) AS geojson
    FROM freguesias;`;

  const r = await query(sql);

  return r.rows[0].geojson;
}

async function getFreguesiaInfo(dtmnfr) {
  // Devolve informação administrativa e área da freguesia indicada.
  const sql = `
    SELECT dtmnfr, freguesia, municipio,
           round(area_ha::numeric,1) AS area_ha,
           round((area_ha/100.0)::numeric,2) AS area_km2
    FROM freguesias WHERE dtmnfr = $1;`;

  const r = await query(sql, [dtmnfr]);

  return r.rows[0] || null;
}

module.exports = {
  getFreguesias,
  getFreguesiaInfo,
};