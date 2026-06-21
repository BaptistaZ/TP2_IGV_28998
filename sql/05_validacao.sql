\echo '== Contagens =='
SELECT 'municipios'       AS tabela, count(*) FROM municipios
UNION ALL SELECT 'freguesias',       count(*) FROM freguesias
UNION ALL SELECT 'subseccoes',       count(*) FROM subseccoes
UNION ALL SELECT 'alojamento_local', count(*) FROM alojamento_local
UNION ALL SELECT 'dem (tiles)',      count(*) FROM dem;

\echo '== SRID das geometrias (esperado 3763) =='
SELECT 'freguesias' AS t, ST_SRID(geom) FROM freguesias LIMIT 1;
SELECT 'subseccoes' AS t, ST_SRID(geom) FROM subseccoes LIMIT 1;
SELECT 'alojamento_local' AS t, ST_SRID(geom) FROM alojamento_local LIMIT 1;

\echo '== SRID e dimensao do raster (esperado 3763) =='
SELECT ST_SRID(rast) AS srid, ST_Width(rast) AS w, ST_Height(rast) AS h FROM dem LIMIT 1;

\echo '== Populacao total do concelho (soma das subseccoes) =='
SELECT SUM(n_individuos) AS populacao_total FROM subseccoes;

\echo '== Estatisticas globais do DEM =='
SELECT (stats).min, (stats).max, round((stats).mean::numeric,1) AS media
FROM (SELECT ST_SummaryStats(ST_Union(rast)) AS stats FROM dem) s;

\echo '== Geometrias invalidas (deve ser 0) =='
SELECT 'freguesias' AS t, count(*) FROM freguesias WHERE NOT ST_IsValid(geom)
UNION ALL SELECT 'subseccoes', count(*) FROM subseccoes WHERE NOT ST_IsValid(geom);