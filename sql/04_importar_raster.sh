#!/usr/bin/env bash
set -euo pipefail

PGUSER="${POSTGRES_USER:-postgres}"
PGDATABASE="${POSTGRES_DB:-igv}"
TIF="/geotiff/dem_vc_25m.tif"

echo ">> A importar raster ${TIF} para a tabela public.dem ..."

docker compose -f docker/docker-compose.yml exec -T db \
  sh -c "raster2pgsql -s 3763 -I -C -M -t 100x100 -d ${TIF} public.dem | psql -U ${PGUSER} -d ${PGDATABASE}"

echo ">> Raster importado. A confirmar metadados:"
docker compose -f docker/docker-compose.yml exec -T db \
  psql -U "${PGUSER}" -d "${PGDATABASE}" -c \
  "SELECT count(*) AS n_tiles FROM dem;"
