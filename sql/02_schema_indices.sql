CREATE INDEX IF NOT EXISTS idx_municipios_geom        ON municipios       USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_freguesias_geom        ON freguesias       USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_subseccoes_geom        ON subseccoes       USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_alojamento_local_geom  ON alojamento_local USING GIST (geom);

CREATE INDEX IF NOT EXISTS idx_dem_rast_conv ON dem USING GIST (ST_ConvexHull(rast));

CREATE INDEX IF NOT EXISTS idx_freguesias_dtmnfr   ON freguesias (dtmnfr);
CREATE INDEX IF NOT EXISTS idx_subseccoes_dtmnfr21 ON subseccoes (dtmnfr21);
CREATE INDEX IF NOT EXISTS idx_al_dtmnfr           ON alojamento_local (dtmnfr);
CREATE INDEX IF NOT EXISTS idx_al_modalidade       ON alojamento_local (modalidade);

ANALYZE municipios;
ANALYZE freguesias;
ANALYZE subseccoes;
ANALYZE alojamento_local;
ANALYZE dem;
