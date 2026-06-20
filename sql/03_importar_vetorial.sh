#!/usr/bin/env bash
set -euo pipefail

PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-postgres}"
PGPASSWORD="${PGPASSWORD:-postgres}"
PGDATABASE="${PGDATABASE:-igv}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GPKG="${SCRIPT_DIR}/../data/processed/viana.gpkg"

PG="PG:host=${PGHOST} port=${PGPORT} user=${PGUSER} password=${PGPASSWORD} dbname=${PGDATABASE}"

echo ">> A importar a partir de: ${GPKG}"
test -f "${GPKG}" || { echo "ERRO: nao encontrei ${GPKG}"; exit 1; }

import_layer () {
  local src_layer="$1"; local dst_table="$2"; local geom_type="$3"
  echo ">> ${src_layer} -> ${dst_table} (${geom_type})"
  ogr2ogr -f PostgreSQL "${PG}" "${GPKG}" "${src_layer}" \
    -nln "${dst_table}" \
    -nlt "${geom_type}" \
    -lco GEOMETRY_NAME=geom \
    -lco FID=id \
    -lco PRECISION=NO \
    -t_srs EPSG:3763 \
    -overwrite --config PG_USE_COPY YES
}

import_layer municipios       municipios       MULTIPOLYGON
import_layer freguesias        freguesias       MULTIPOLYGON
import_layer subseccoes        subseccoes       MULTIPOLYGON
import_layer alojamento_local  alojamento_local POINT

echo ">> Importacao vetorial concluida."
