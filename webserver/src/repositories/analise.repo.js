// Repositório de análise espacial.
// Agrupa consultas PostGIS para informação por ponto, áreas, elegibilidade e subsecções.

const { query } = require('../db/pool');

async function getInfoAtPoint(lon, lat) {
  // Converte o ponto recebido em WGS84 para EPSG:3763 e cruza com os temas disponíveis.
  const sql = `
    WITH p AS (
      SELECT ST_Transform(ST_SetSRID(ST_MakePoint($1,$2),4326),3763) AS g
    )
    SELECT
      (SELECT freguesia FROM freguesias f, p WHERE ST_Contains(f.geom, p.g) LIMIT 1) AS freguesia,
      (SELECT bgri2021  FROM subseccoes s, p WHERE ST_Contains(s.geom, p.g) LIMIT 1) AS subseccao,
      (SELECT n_individuos FROM subseccoes s, p WHERE ST_Contains(s.geom, p.g) LIMIT 1) AS populacao_subseccao,
      (SELECT round(ST_Value(r.rast, p.g)::numeric,1)
         FROM dem r, p WHERE ST_Intersects(r.rast, p.g) LIMIT 1) AS cota,
      (SELECT count(*) FROM alojamento_local al, p WHERE ST_DWithin(al.geom, p.g, 500)) AS al_500m;`;

  const r = await query(sql, [lon, lat]);

  return r.rows[0] || null;
}

async function analiseArea(geojsonGeometry) {
  const geo = JSON.stringify(geojsonGeometry);

  // Calcula estatísticas dos temas que intersectam a área desenhada.
  const sql = `
    WITH area AS (
      SELECT ST_MakeValid(ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON($1),4326),3763)) AS g
    ),
    pop AS (
      SELECT COALESCE(SUM(
               s.n_individuos
               * ST_Area(ST_Intersection(s.geom, a.g))
               / NULLIF(ST_Area(s.geom),0)
             ),0) AS populacao_estimada
      FROM subseccoes s, area a
      WHERE ST_Intersects(s.geom, a.g)
    ),
    al_mod AS (
      SELECT x.modalidade, count(*) AS n
      FROM alojamento_local x, area a
      WHERE ST_Within(x.geom, a.g)
      GROUP BY x.modalidade
      ORDER BY n DESC
    ),
    cota AS (
      SELECT ST_SummaryStats(ST_Union(ST_Clip(r.rast, a.g, true))) AS stats
      FROM dem r, area a
      WHERE ST_Intersects(r.rast, a.g)
    ),
    fregs AS (
      SELECT array_agg(DISTINCT f.freguesia ORDER BY f.freguesia) AS lista
      FROM freguesias f, area a
      WHERE ST_Intersects(f.geom, a.g)
    )
    SELECT
      round((ST_Area((SELECT g FROM area))/1e6)::numeric,3)        AS area_km2,
      round((SELECT populacao_estimada FROM pop)::numeric,0)       AS populacao_estimada,
      COALESCE((SELECT SUM(n) FROM al_mod),0)                      AS n_alojamentos,
      COALESCE((SELECT jsonb_agg(jsonb_build_object('modalidade',modalidade,'n',n)) FROM al_mod),'[]'::jsonb) AS alojamentos_por_modalidade,
      round(((SELECT (stats).min  FROM cota))::numeric,1)          AS cota_min,
      round(((SELECT (stats).max  FROM cota))::numeric,1)          AS cota_max,
      round(((SELECT (stats).mean FROM cota))::numeric,1)          AS cota_media,
      COALESCE((SELECT lista FROM fregs), ARRAY[]::text[])         AS freguesias;`;

  const r = await query(sql, [geo]);

  return r.rows[0] || null;
}

async function analiseElegivel(geojsonGeometry, cotaMin, usarAl, distAl, usarDeclive, decliveMax) {
  const geo = JSON.stringify(geojsonGeometry);
  const cota = Number(cotaMin);
  const dist = Number(distAl);
  const declive = Number(decliveMax);

  if (!Number.isFinite(cota) || !Number.isFinite(dist) || !Number.isFinite(declive)) {
    throw new Error('Parametros invalidos na analise de elegibilidade');
  }

  // CTEs construídas conforme os critérios ativos na interface.
  const ctes = [
    `area AS (SELECT ST_MakeValid(ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON($1),4326),3763)) AS g)`,
    `clip AS (SELECT ST_Union(ST_Clip(r.rast, a.g, true)) AS rast FROM dem r, area a WHERE ST_Intersects(r.rast, a.g))`,
    `zona_cota AS (SELECT ST_Union(dp.geom) AS g FROM clip, LATERAL ST_DumpAsPolygons(ST_MapAlgebra(clip.rast,1,'2BUI','CASE WHEN [rast.val] >= ${cota} THEN 1 ELSE 0 END')) AS dp WHERE dp.val = 1)`,
  ];

  if (usarDeclive) {
    ctes.push(`zona_declive AS (SELECT ST_Union(dp.geom) AS g FROM clip, LATERAL ST_DumpAsPolygons(ST_MapAlgebra(ST_Slope(clip.rast,1,'32BF','DEGREES'),1,'2BUI','CASE WHEN [rast.val] <= ${declive} THEN 1 ELSE 0 END')) AS dp WHERE dp.val = 1)`);
  }

  if (usarAl) {
    ctes.push(`zona_buffer AS (SELECT ST_Union(ST_Buffer(x.geom, $2)) AS g FROM alojamento_local x, area a WHERE ST_DWithin(x.geom, a.g, $2))`);
  }

  ctes.push(`base AS (SELECT ST_Intersection(COALESCE((SELECT g FROM zona_cota), ST_GeomFromText('POLYGON EMPTY',3763)), (SELECT g FROM area)) AS g)`);

  let expr = `(SELECT g FROM base)`;

  // Combina os critérios ativos por interseção espacial.
  if (usarDeclive) {
    expr = `ST_Intersection(${expr}, COALESCE((SELECT g FROM zona_declive), ST_GeomFromText('POLYGON EMPTY',3763)))`;
  }

  if (usarAl) {
    expr = `ST_Intersection(${expr}, COALESCE((SELECT g FROM zona_buffer), ST_GeomFromText('POLYGON EMPTY',3763)))`;
  }

  ctes.push(`eleg AS (SELECT ST_CollectionExtract(ST_MakeValid(${expr}), 3) AS g)`);

  const sql = `WITH ${ctes.join(',\n      ')}
    SELECT round((ST_Area(g)/1e6)::numeric,3) AS area_km2_elegivel,
           ST_AsGeoJSON(ST_Transform(g,4326)) AS geojson
    FROM eleg;`;

  const params = usarAl ? [geo, dist] : [geo];

  const r = await query(sql, params);
  const row = r.rows[0] || { area_km2_elegivel: 0, geojson: null };

  return {
    area_km2_elegivel: row.area_km2_elegivel || 0,
    geojson: row.geojson ? JSON.parse(row.geojson) : null,
  };
}

async function getNumVizinhos(bgri) {
  // Conta subsecções que tocam a subsecção indicada.
  const sql = `
    SELECT count(b.id) AS contagem
    FROM subseccoes a
    JOIN subseccoes b ON ST_Touches(a.geom, b.geom)
    WHERE a.bgri2021 = $1 AND a.id <> b.id;`;

  const r = await query(sql, [bgri]);

  if (r.rows.length === 0) return null;

  return parseInt(r.rows[0].contagem, 10);
}

async function getBuffer(bgri, dist) {
  // Gera o buffer da subsecção e devolve a geometria em WGS84/GeoJSON.
  const sql = `
    SELECT ST_AsGeoJSON(ST_Transform(ST_Buffer(geom, $2), 4326)) AS buffer
    FROM subseccoes
    WHERE bgri2021 = $1;`;

  const r = await query(sql, [bgri, dist]);

  if (r.rows.length === 0 || !r.rows[0].buffer) return null;

  return JSON.parse(r.rows[0].buffer);
}

module.exports = {
  getInfoAtPoint,
  analiseArea,
  analiseElegivel,
  getNumVizinhos,
  getBuffer,
};