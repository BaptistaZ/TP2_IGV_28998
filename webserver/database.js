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

  async analiseElegivel(geojsonGeometry, cotaMin, usarAl, distAl, usarDeclive, decliveMax) {
    const geo = JSON.stringify(geojsonGeometry);
    const cota = Number(cotaMin);
    const dist = Number(distAl);
    const declive = Number(decliveMax);
    if (!Number.isFinite(cota) || !Number.isFinite(dist) || !Number.isFinite(declive)) {
      throw new Error('Parametros invalidos na analise de elegibilidade');
    }

    // Constroi as CTEs apenas para os criterios ativos (evita calcular o
    // declive quando nao e pedido). Os criterios sao combinados por intersecao.
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
    if (usarDeclive) expr = `ST_Intersection(${expr}, COALESCE((SELECT g FROM zona_declive), ST_GeomFromText('POLYGON EMPTY',3763)))`;
    if (usarAl)      expr = `ST_Intersection(${expr}, COALESCE((SELECT g FROM zona_buffer), ST_GeomFromText('POLYGON EMPTY',3763)))`;
    ctes.push(`eleg AS (SELECT ST_CollectionExtract(ST_MakeValid(${expr}), 3) AS g)`);

    const sql = `WITH ${ctes.join(',\n      ')}
      SELECT round((ST_Area(g)/1e6)::numeric,3) AS area_km2_elegivel,
             ST_AsGeoJSON(ST_Transform(g,4326)) AS geojson
      FROM eleg;`;
    const params = usarAl ? [geo, dist] : [geo]; // $2 só existe quando o buffer é usado
    const r = await this.query(sql, params);
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

  // ===================================================================
  // FUNCIONALIDADES DE ANALISE ESPACIAL
  // ===================================================================

  // Executa uma query com os drivers GDAL ativos (necessario para
  // ST_AsTIFF / ST_Slope, que escrevem raster). Usa SET LOCAL numa
  // transacao, por isso funciona mesmo sem reconfigurar a base.
  async queryComGdal(sql, params) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SET LOCAL postgis.gdal_enabled_drivers = 'ENABLE_ALL'");
      const r = await client.query(sql, params);
      await client.query('COMMIT');
      return r;
    } catch (err) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      throw err;
    } finally {
      client.release();
    }
  }

  // 1) Perfil de elevacao ao longo de uma linha (amostra n pontos do DEM)
  async getPerfilElevacao(lineGeoJSON, n) {
    const geo = JSON.stringify(lineGeoJSON);
    const amostras = Math.max(2, Math.min(300, parseInt(n, 10) || 100));
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
    const r = await this.query(sql, [geo, amostras]);
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

  // 2) Alojamentos locais mais proximos de um ponto (KNN via operador <->)
  async getAlMaisProximos(lon, lat, n) {
    const k = Math.max(1, Math.min(20, parseInt(n, 10) || 5));
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
    const r = await this.query(sql, [lon, lat, k]);
    return r.rows.map((x) => ({
      lon: Number(x.lon), lat: Number(x.lat),
      denominacao: x.denominacao, modalidade: x.modalidade, freguesia: x.freguesia,
      dist_m: Number(x.dist_m),
    }));
  }

  // 5) Declive (graus) de uma freguesia, derivado do DEM, em GeoTIFF
  async getFreguesiaDecliveTiff(dtmnfr) {
    const sql = `
      WITH fr AS (SELECT geom FROM freguesias WHERE dtmnfr = $1),
      recorte AS (
        SELECT ST_Union(ST_Clip(r.rast, fr.geom, true)) AS rast
        FROM dem r, fr WHERE ST_Intersects(r.rast, fr.geom)
      )
      SELECT ST_AsTIFF(ST_Slope(rast, 1, '32BF', 'DEGREES')) AS tif
      FROM recorte WHERE rast IS NOT NULL;`;
    const r = await this.queryComGdal(sql, [dtmnfr]);
    if (r.rows.length === 0 || !r.rows[0].tif) return null;
    return r.rows[0].tif;
  }

  // Estatisticas de declive de uma freguesia (min/max/media em graus)
  async getFreguesiaDecliveStats(dtmnfr) {
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
    const r = await this.queryComGdal(sql, [dtmnfr]);
    return r.rows[0] || null;
  }

  // 6) Indicadores por freguesia (para a coropleta configuravel)
  async getIndicadoresFreguesias() {
    const sql = `
      SELECT
        f.dtmnfr, f.freguesia,
        round((f.area_ha/100.0)::numeric, 2)                  AS area_km2,
        COALESCE(SUM(s.n_individuos),0)                       AS populacao,
        COALESCE(SUM(s.n_edificios_classicos),0)              AS edificios,
        COALESCE(SUM(s.n_alojamentos_total),0)                AS alojamentos,
        COALESCE(SUM(s.n_individuos_65_ou_mais),0)            AS idosos,
        CASE WHEN SUM(s.n_individuos) > 0
             THEN round(100.0*SUM(s.n_individuos_65_ou_mais)/SUM(s.n_individuos),1)
             ELSE 0 END                                       AS idosos_pct,
        CASE WHEN f.area_ha > 0
             THEN round((COALESCE(SUM(s.n_individuos),0)/(f.area_ha/100.0))::numeric,1)
             ELSE 0 END                                       AS densidade
      FROM freguesias f
      LEFT JOIN subseccoes s ON ST_Contains(f.geom, ST_PointOnSurface(s.geom))
      GROUP BY f.dtmnfr, f.freguesia, f.area_ha
      ORDER BY f.freguesia;`;
    const r = await this.query(sql);
    return r.rows.map((x) => ({
      dtmnfr: x.dtmnfr, freguesia: x.freguesia,
      area_km2: Number(x.area_km2),
      populacao: Number(x.populacao),
      edificios: Number(x.edificios),
      alojamentos: Number(x.alojamentos),
      idosos: Number(x.idosos),
      idosos_pct: Number(x.idosos_pct),
      densidade: Number(x.densidade),
    }));
  }

  // 7) Comparar varias freguesias (indicadores lado a lado)
  async compararFreguesias(ids) {
    const sql = `
      SELECT
        f.dtmnfr, f.freguesia,
        round((f.area_ha/100.0)::numeric, 2)       AS area_km2,
        COALESCE(SUM(s.n_individuos),0)            AS populacao,
        COALESCE(SUM(s.n_individuos_0_14),0)       AS jovens_0_14,
        COALESCE(SUM(s.n_individuos_15_24),0)      AS jovens_15_24,
        COALESCE(SUM(s.n_individuos_25_64),0)      AS adultos_25_64,
        COALESCE(SUM(s.n_individuos_65_ou_mais),0) AS idosos_65,
        COALESCE(SUM(s.n_edificios_classicos),0)   AS edificios,
        COALESCE(SUM(s.n_alojamentos_total),0)     AS alojamentos,
        CASE WHEN f.area_ha > 0
             THEN round((COALESCE(SUM(s.n_individuos),0)/(f.area_ha/100.0))::numeric,1)
             ELSE 0 END                            AS densidade
      FROM freguesias f
      LEFT JOIN subseccoes s ON ST_Contains(f.geom, ST_PointOnSurface(s.geom))
      WHERE f.dtmnfr = ANY($1)
      GROUP BY f.dtmnfr, f.freguesia, f.area_ha
      ORDER BY f.freguesia;`;
    const r = await this.query(sql, [ids]);
    return r.rows.map((x) => ({
      dtmnfr: x.dtmnfr, freguesia: x.freguesia,
      area_km2: Number(x.area_km2),
      populacao: Number(x.populacao),
      jovens_0_14: Number(x.jovens_0_14),
      jovens_15_24: Number(x.jovens_15_24),
      adultos_25_64: Number(x.adultos_25_64),
      idosos_65: Number(x.idosos_65),
      edificios: Number(x.edificios),
      alojamentos: Number(x.alojamentos),
      densidade: Number(x.densidade),
    }));
  }
}

// Ganho de elevacao acumulado (soma das subidas) ao longo de um perfil
function ganhoAcumulado(cotas) {
  let ganho = 0;
  for (let i = 1; i < cotas.length; i++) {
    const d = cotas[i] - cotas[i - 1];
    if (d > 0) ganho += d;
  }
  return Math.round(ganho);
}

module.exports = Database;