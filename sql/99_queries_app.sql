SELECT jsonb_build_object(
  'type','FeatureCollection',
  'features', jsonb_agg(
    jsonb_build_object(
      'type','Feature',
      'geometry', ST_AsGeoJSON(ST_Transform(geom,4326))::jsonb,
      'properties', jsonb_build_object(
        'dtmnfr', dtmnfr, 'freguesia', freguesia, 'area_ha', area_ha)
    )
  )
) AS geojson
FROM freguesias;

WITH fr AS (
  SELECT geom FROM freguesias WHERE dtmnfr = '160928'
)
SELECT
  round((s.stats).min::numeric, 1)   AS cota_min,
  round((s.stats).max::numeric, 1)   AS cota_max,
  round((s.stats).mean::numeric, 1)  AS cota_media,
  round((s.stats).stddev::numeric,1) AS cota_desvio,
  (s.stats).count                    AS n_pixeis
FROM fr,
LATERAL (
  SELECT ST_SummaryStats(ST_Union(ST_Clip(r.rast, fr.geom, true))) AS stats
  FROM dem r
  WHERE ST_Intersects(r.rast, fr.geom)
) s;

SELECT
  SUM(n_individuos)            AS populacao,
  SUM(n_individuos_h)          AS homens,
  SUM(n_individuos_m)          AS mulheres,
  SUM(n_individuos_0_14)       AS jovens_0_14,
  SUM(n_individuos_15_24)      AS jovens_15_24,
  SUM(n_individuos_25_64)      AS adultos_25_64,
  SUM(n_individuos_65_ou_mais) AS idosos_65,
  SUM(n_edificios_classicos)   AS edificios,
  SUM(n_alojamentos_total)     AS alojamentos
FROM subseccoes
WHERE dtmnfr21 = '160928';

WITH fr AS (SELECT geom FROM freguesias WHERE dtmnfr = '160928')
SELECT ST_AsTIFF(ST_Union(ST_Clip(r.rast, fr.geom, true))) AS tif
FROM dem r, fr
WHERE ST_Intersects(r.rast, fr.geom);

WITH p AS (SELECT ST_Transform(ST_SetSRID(ST_MakePoint(-8.83, 41.69),4326),3763) AS g)
SELECT al.nrrnal, al.denominacao, al.modalidade,
       round(ST_Distance(al.geom, p.g)::numeric,0) AS dist_m,
       ST_AsGeoJSON(ST_Transform(al.geom,4326))::jsonb AS geometry
FROM alojamento_local al, p
WHERE ST_DWithin(al.geom, p.g, 500)
ORDER BY dist_m;

WITH area AS (
  SELECT ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(:'area_geojson'),4326),3763) AS g
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
al AS (
  SELECT count(*) AS n_al
  FROM alojamento_local x, area a
  WHERE ST_Within(x.geom, a.g)
),
cota AS (
  SELECT ST_SummaryStats(ST_Union(ST_Clip(r.rast, a.g, true))) AS stats
  FROM dem r, area a
  WHERE ST_Intersects(r.rast, a.g)
)
SELECT
  round((ST_Area((SELECT g FROM area))/1e6)::numeric,3) AS area_km2,
  round((SELECT populacao_estimada FROM pop)::numeric,0) AS populacao_estimada,
  (SELECT n_al FROM al)                                  AS n_alojamentos,
  round(((cota.stats).min)::numeric,1)                   AS cota_min,
  round(((cota.stats).max)::numeric,1)                   AS cota_max,
  round(((cota.stats).mean)::numeric,1)                  AS cota_media
FROM cota;

WITH area AS (
  SELECT ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(:'area_geojson'),4326),3763) AS g
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
            ST_Reclass(clip.rast, 1,
                       '-9999-' || :cota_min || '):0, [' || :cota_min || '-9000:1',
                       '2BUI', 0)
          ) AS dp
  WHERE dp.val = 1
),
buffer_al AS (
  SELECT ST_Union(ST_Buffer(x.geom, :dist_al)) AS g
  FROM alojamento_local x, area a
  WHERE ST_DWithin(x.geom, a.g, :dist_al)
),
elegivel AS (
  SELECT ST_Intersection(
           ST_Intersection(zc.g, (SELECT g FROM area)),
           COALESCE(b.g, ST_GeomFromText('POLYGON EMPTY',3763))
         ) AS g
  FROM zona_cota zc LEFT JOIN buffer_al b ON true
)
SELECT
  round((ST_Area(g)/1e6)::numeric,3) AS area_km2_elegivel,
  ST_AsGeoJSON(ST_Transform(g,4326)) AS geojson
FROM elegivel;

SELECT count(b.id) AS n_vizinhos
FROM subseccoes a
JOIN subseccoes b ON ST_Touches(a.geom, b.geom)
WHERE a.bgri2021 = '160928XXXXX' AND a.id <> b.id;

SELECT ST_AsGeoJSON(ST_Transform(ST_Buffer(geom, 500), 4326)) AS buffer
FROM subseccoes
WHERE bgri2021 = '160928XXXXX';
