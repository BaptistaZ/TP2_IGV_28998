// Repositório de censos BGRI 2021.
// Agrega indicadores censitários por freguesia através de JOIN espacial.

const { query } = require('../db/pool');

async function getCensosFreguesia(dtmnfr) {
  // Usa ST_Contains + ST_PointOnSurface para associar subsecções à freguesia correta.
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

  const r = await query(sql, [dtmnfr]);

  return r.rows[0] || null;
}

async function getIndicadoresFreguesias() {
  // Indicadores agregados usados pela coropleta configurável no frontend.
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

  const r = await query(sql);

  return r.rows.map((x) => ({
    dtmnfr: x.dtmnfr,
    freguesia: x.freguesia,
    area_km2: Number(x.area_km2),
    populacao: Number(x.populacao),
    edificios: Number(x.edificios),
    alojamentos: Number(x.alojamentos),
    idosos: Number(x.idosos),
    idosos_pct: Number(x.idosos_pct),
    densidade: Number(x.densidade),
  }));
}

async function compararFreguesias(ids) {
  // Devolve indicadores lado a lado para as freguesias selecionadas.
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

  const r = await query(sql, [ids]);

  return r.rows.map((x) => ({
    dtmnfr: x.dtmnfr,
    freguesia: x.freguesia,
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

module.exports = {
  getCensosFreguesia,
  getIndicadoresFreguesias,
  compararFreguesias,
};