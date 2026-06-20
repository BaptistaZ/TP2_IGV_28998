#!/usr/bin/env bash

set -euo pipefail

GS_URL="${GS_URL:-http://localhost:8080/geoserver}"
GS_USER="${GS_USER:-admin}"
GS_PASS="${GS_PASS:-geoserver}"
WS="${WS:-igv}"
STORE="${STORE:-igv_postgis}"

PG_HOST="${PG_HOST:-db}"
PG_PORT="${PG_PORT:-5432}"
PG_DB="${PG_DB:-igv}"
PG_USER="${PG_USER:-postgres}"
PG_PASS="${PG_PASS:-postgres}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SLD_DIR="${SCRIPT_DIR}/../geoserver/sld"

AUTH=(-u "${GS_USER}:${GS_PASS}")
H_XML=(-H "Content-Type: text/xml")
H_JSON=(-H "Content-Type: application/json")
H_SLD=(-H "Content-Type: application/vnd.ogc.sld+xml")

echo ">> 1) workspace ${WS}"
curl -sS "${AUTH[@]}" "${H_XML[@]}" -X POST \
  -d "<workspace><name>${WS}</name></workspace>" \
  "${GS_URL}/rest/workspaces" || echo "   (workspace ja existe?)"

echo ">> 2) datastore PostGIS ${STORE}"
curl -sS "${AUTH[@]}" "${H_XML[@]}" -X POST \
  -d "<dataStore>
        <name>${STORE}</name>
        <connectionParameters>
          <entry key=\"host\">${PG_HOST}</entry>
          <entry key=\"port\">${PG_PORT}</entry>
          <entry key=\"database\">${PG_DB}</entry>
          <entry key=\"user\">${PG_USER}</entry>
          <entry key=\"passwd\">${PG_PASS}</entry>
          <entry key=\"dbtype\">postgis</entry>
          <entry key=\"schema\">public</entry>
          <entry key=\"Expose primary keys\">true</entry>
        </connectionParameters>
      </dataStore>" \
  "${GS_URL}/rest/workspaces/${WS}/datastores"
echo

publicar_camada () {
  local tabela="$1"; local titulo="$2"; local srs="EPSG:3763"
  echo ">> publicar camada ${tabela}"
  curl -sS "${AUTH[@]}" "${H_XML[@]}" -X POST \
    -d "<featureType>
          <name>${tabela}</name>
          <title>${titulo}</title>
          <srs>${srs}</srs>
          <enabled>true</enabled>
        </featureType>" \
    "${GS_URL}/rest/workspaces/${WS}/datastores/${STORE}/featuretypes" \
    || echo "   (camada ${tabela} ja existe?)"
}

publicar_camada freguesias       "Freguesias de Viana do Castelo"
publicar_camada subseccoes       "Subseccoes BGRI 2021"
publicar_camada alojamento_local "Alojamento Local"

carregar_estilo () {
  local nome="$1"; local ficheiro="$2"
  echo ">> estilo ${nome}"
  
  curl -sS "${AUTH[@]}" "${H_XML[@]}" -X POST \
    -d "<style><name>${nome}</name><filename>${nome}.sld</filename></style>" \
    "${GS_URL}/rest/workspaces/${WS}/styles" >/dev/null || true
  # enviar o conteudo SLD
  curl -sS "${AUTH[@]}" "${H_SLD[@]}" -X PUT \
    --data-binary "@${ficheiro}" \
    "${GS_URL}/rest/workspaces/${WS}/styles/${nome}"
}

definir_estilo_defeito () {
  local camada="$1"; local estilo="$2"
  curl -sS "${AUTH[@]}" "${H_XML[@]}" -X PUT \
    -d "<layer><defaultStyle><name>${WS}:${estilo}</name></defaultStyle></layer>" \
    "${GS_URL}/rest/layers/${WS}:${camada}"
}

echo ">> 3) estilos SLD"
carregar_estilo freguesias            "${SLD_DIR}/freguesias.sld"
carregar_estilo subseccoes_densidade  "${SLD_DIR}/subseccoes_densidade.sld"
carregar_estilo alojamento_local      "${SLD_DIR}/alojamento_local.sld"
carregar_estilo dem                   "${SLD_DIR}/dem.sld"

echo ">> 4) associar estilos as camadas"
definir_estilo_defeito freguesias       freguesias
definir_estilo_defeito subseccoes       subseccoes_densidade
definir_estilo_defeito alojamento_local alojamento_local

echo ">> 5) DEM como coverage (GeoTIFF em /geotiff dentro do container)"
curl -sS "${AUTH[@]}" "${H_XML[@]}" -X POST \
  -d "<coverageStore>
        <name>dem</name>
        <workspace>${WS}</workspace>
        <type>GeoTIFF</type>
        <enabled>true</enabled>
        <url>file:/geotiff/dem_vc_25m.tif</url>
      </coverageStore>" \
  "${GS_URL}/rest/workspaces/${WS}/coveragestores" || echo "   (coveragestore ja existe?)"

curl -sS "${AUTH[@]}" "${H_XML[@]}" -X POST \
  -d "<coverage>
        <name>dem</name>
        <title>Modelo Digital do Terreno (25 m)</title>
        <srs>EPSG:3763</srs>
        <enabled>true</enabled>
      </coverage>" \
  "${GS_URL}/rest/workspaces/${WS}/coveragestores/dem/coverages" \
  || echo "   (coverage dem ja existe?)"

definir_estilo_defeito dem dem || true

echo ">> Publicacao concluida. Ver em ${GS_URL}/web (Camadas)."
