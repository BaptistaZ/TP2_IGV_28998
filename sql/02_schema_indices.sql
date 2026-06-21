-- Índices espaciais para acelerar consultas com ST_Intersects, ST_DWithin,
-- ST_Within, ST_Touches, ST_Intersection e operações semelhantes.
CREATE INDEX IF NOT EXISTS idx_municipios_geom        ON municipios       USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_freguesias_geom        ON freguesias       USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_subseccoes_geom        ON subseccoes       USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_alojamento_local_geom  ON alojamento_local USING GIST (geom);

-- Índice espacial sobre a extensão dos tiles raster do DEM.
CREATE INDEX IF NOT EXISTS idx_dem_rast_conv ON dem USING GIST (ST_ConvexHull(rast));

-- Índices alfanuméricos usados nos filtros principais da aplicação.
CREATE INDEX IF NOT EXISTS idx_freguesias_dtmnfr   ON freguesias (dtmnfr);
CREATE INDEX IF NOT EXISTS idx_subseccoes_dtmnfr21 ON subseccoes (dtmnfr21);
CREATE INDEX IF NOT EXISTS idx_al_dtmnfr           ON alojamento_local (dtmnfr);
CREATE INDEX IF NOT EXISTS idx_al_modalidade       ON alojamento_local (modalidade);

-- Atualiza estatísticas internas do PostgreSQL para melhorar o plano das queries.
ANALYZE municipios;
ANALYZE freguesias;
ANALYZE subseccoes;
ANALYZE alojamento_local;
ANALYZE dem;