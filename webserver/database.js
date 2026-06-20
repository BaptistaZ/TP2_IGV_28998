const { Pool } = require('pg');

class Database {
  constructor() {
    this.pool = new Pool({
      host: process.env.PGHOST || 'localhost',
      port: parseInt(process.env.PGPORT || '5432', 10),
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || 'postgres',
      database: process.env.PGDATABASE || 'igv',
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    this.pool.on('error', (err) => {
      console.error('Erro inesperado num cliente do pool PostgreSQL:', err.message);
    });
  }

  async query(text, params) {
    return this.pool.query(text, params);
  }

  async close() {
    await this.pool.end();
  }

  async testConnection() {
    const r = await this.query('SELECT postgis_version() AS v;');
    return r.rows[0].v;
  }

  async getFreguesias() {
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
    const r = await this.query(sql);
    return r.rows[0].geojson;
  }

  async getFreguesiaDemStats(dtmnfr) {
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
    const r = await this.query(sql, [dtmnfr]);
    return r.rows[0] || null;
  }

  async getCensosFreguesia(dtmnfr) {
    const sql = `
      WITH fr AS (SELECT geom FROM freguesias WHERE dtmnfr = $1)
      SELECT
        COALESCE(SUM(s.n_individuos),0)            AS populacao,
        COALESCE(SUM(s.n_individuos_h),0)          AS homens,
        COALESCE(SUM(s.n_individuos_m),0)          AS mulheres,
        COALESCE(SUM(s.n_individuos_0_14),0)       AS jovens_0_14,
        COALESCE(SUM(s.n_individuos_15_24),0)      AS jovens_15_24,
        COALESCE(SUM(s.n_individuos_25_64),0)      AS adultos_25_64,
        COALESCE(SUM(s.n_individuos_65_ou_mais),0) AS idosos_65,
        COALESCE(SUM(s.n_edificios_classicos),0)   AS edificios,
        COALESCE(SUM(s.n_alojamentos_total),0)     AS alojamentos,
        COUNT(s.*)                                 AS n_subseccoes
      FROM subseccoes s, fr
      WHERE ST_Contains(fr.geom, ST_PointOnSurface(s.geom));`;
    const r = await this.query(sql, [dtmnfr]);
    return r.rows[0] || null;
  }

  async getFreguesiaInfo(dtmnfr) {
    const sql = `
      SELECT dtmnfr, freguesia, municipio,
             round(area_ha::numeric,1) AS area_ha,
             round((area_ha/100.0)::numeric,2) AS area_km2
      FROM freguesias WHERE dtmnfr = $1;`;
    const r = await this.query(sql, [dtmnfr]);
    return r.rows[0] || null;
  }

  async getFreguesiaDemTiff(dtmnfr) {
    const sql = `
      WITH fr AS (SELECT geom FROM freguesias WHERE dtmnfr = $1)
      SELECT ST_AsTIFF(ST_Union(ST_Clip(r.rast, fr.geom, true))) AS tif
      FROM dem r, fr
      WHERE ST_Intersects(r.rast, fr.geom);`;
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SET LOCAL postgis.gdal_enabled_drivers = 'ENABLE_ALL'");
      const r = await client.query(sql, [dtmnfr]);
      await client.query('COMMIT');
      if (r.rows.length === 0 || !r.rows[0].tif) return null;
      return r.rows[0].tif; // Buffer (bytea)
    } catch (err) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      throw err;
    } finally {
      client.release();
    }
  }

  async getAlojamento(dtmnfr) {
    const filtro = dtmnfr ? 'WHERE dtmnfr = $1' : '';
    const params = dtmnfr ? [dtmnfr] : [];
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
    const r = await this.query(sql, params);
    return r.rows[0].geojson;
  }

  async getInfoAtPoint(lon, lat) {
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
    const r = await this.query(sql, [lon, lat]);
    return r.rows[0] || null;
  }

  async getAlProximos(lon, lat, raio) {
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
    const r = await this.query(sql, [lon, lat, raio]);
    if (r.rows.length === 0) {
      return { geojson: { type: 'FeatureCollection', features: [] }, total: 0 };
    }
    return r.rows[0];
  }

  async analiseArea(geojsonGeometry) {
    const geo = JSON.stringify(geojsonGeometry);
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
    const r = await this.query(sql, [geo]);
    return r.rows[0] || null;
  }

  async analiseElegivel(geojsonGeometry, cotaMin, usarAl, distAl) {
    const geo = JSON.stringify(geojsonGeometry);
    const cota = Number(cotaMin);
    const dist = Number(distAl);
    if (!Number.isFinite(cota) || !Number.isFinite(dist)) {
      throw new Error('Parametros cotaMin/distAl invalidos');
    }

    const interseccaoBuffer = usarAl
      ? `ST_Intersection(base.g, COALESCE((SELECT g FROM buffer_al), ST_GeomFromText('POLYGON EMPTY',3763)))`
      : `base.g`;

    const sql = `
      WITH area AS (
        SELECT ST_MakeValid(ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON($1),4326),3763)) AS g
      ),
      clip AS (
        SELECT ST_Union(ST_Clip(r.rast, a.g, true)) AS rast
        FROM dem r, area a
        WHERE ST_Intersects(r.rast, a.g)
      ),
      zona_cota AS (
        SELECT ST_Union(dp.geom) AS g
        FROM clip,
        LATERAL ST_DumpAsPolygons(
          ST_MapAlgebra(clip.rast, 1, '2BUI',
            'CASE WHEN [rast.val] >= ${cota} THEN 1 ELSE 0 END')
        ) AS dp
        WHERE dp.val = 1
      ),
      buffer_al AS (
        SELECT ST_Union(ST_Buffer(x.geom, $2)) AS g
        FROM alojamento_local x, area a
        WHERE ST_DWithin(x.geom, a.g, $2)
      ),
      base AS (
        SELECT ST_Intersection(
                 COALESCE((SELECT g FROM zona_cota), ST_GeomFromText('POLYGON EMPTY',3763)),
                 (SELECT g FROM area)
               ) AS g
      ),
      eleg AS (
        SELECT ST_CollectionExtract(ST_MakeValid(${interseccaoBuffer}), 3) AS g
        FROM base
      )
      SELECT
        round((ST_Area(g)/1e6)::numeric,3)   AS area_km2_elegivel,
        ST_AsGeoJSON(ST_Transform(g,4326))   AS geojson
      FROM eleg;`;
    const r = await this.query(sql, [geo, dist]);
    const row = r.rows[0] || { area_km2_elegivel: 0, geojson: null };
    return {
      area_km2_elegivel: row.area_km2_elegivel || 0,
      geojson: row.geojson ? JSON.parse(row.geojson) : null,
    };
  }

  async getNumVizinhos(bgri) {
    const sql = `
      SELECT count(b.id) AS contagem
      FROM subseccoes a
      JOIN subseccoes b ON ST_Touches(a.geom, b.geom)
      WHERE a.bgri2021 = $1 AND a.id <> b.id;`;
    const r = await this.query(sql, [bgri]);
    if (r.rows.length === 0) return null;
    return parseInt(r.rows[0].contagem, 10);
  }

  async getBuffer(bgri, dist) {
    const sql = `
      SELECT ST_AsGeoJSON(ST_Transform(ST_Buffer(geom, $2), 4326)) AS buffer
      FROM subseccoes
      WHERE bgri2021 = $1;`;
    const r = await this.query(sql, [bgri, dist]);
    if (r.rows.length === 0 || !r.rows[0].buffer) return null;
    return JSON.parse(r.rows[0].buffer);
  }
}

module.exports = Database;