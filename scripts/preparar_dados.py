#!/usr/bin/env python3
"""

Prepara os dados originais do trabalho para utilização no geoportal.

Entrada esperada:
  - ZIPs originais em ./dados_originais ou na pasta indicada por --origem.

Saídas geradas:
  - data/processed/viana.gpkg
  - webserver/public/geotiff/dem_vc_25m.tif

Todas as camadas vetoriais ficam em EPSG:3763 (PT-TM06/ETRS89).
O concelho usado é Viana do Castelo, identificado pelo código 1609.

Uso:
  python scripts/preparar_dados.py --origem ./dados_originais
"""

import argparse
import zipfile
from pathlib import Path

import geopandas as gpd
import rasterio
from rasterio.mask import mask as rio_mask


CONCELHO = "1609"       # Código administrativo de Viana do Castelo
CRS_ALVO = "EPSG:3763"  # PT-TM06/ETRS89
BUFFER_DEM_M = 2000    # Margem adicional, em metros, para recorte do DEM


def descomprimir(origem: Path, destino: Path):
    """Descomprime todos os ficheiros ZIP da pasta de origem."""
    destino.mkdir(parents=True, exist_ok=True)

    for z in origem.glob("*.zip"):
        print(f">> a descomprimir {z.name}")
        with zipfile.ZipFile(z) as zf:
            zf.extractall(destino)


def encontrar(destino: Path, *padroes: str) -> Path:
    """Procura recursivamente o primeiro ficheiro que corresponda aos padrões indicados."""
    for p in padroes:
        achados = list(destino.rglob(p))
        if achados:
            return achados[0]

    raise FileNotFoundError(f"nao encontrei nenhum de {padroes} em {destino}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--origem", default="./dados_originais", type=Path)
    ap.add_argument("--trabalho", default="./_tmp_dados", type=Path)
    args = ap.parse_args()

    raiz = Path(__file__).resolve().parent.parent

    out_gpkg = raiz / "data" / "processed" / "viana.gpkg"
    out_tif = raiz / "webserver" / "public" / "geotiff" / "dem_vc_25m.tif"

    out_gpkg.parent.mkdir(parents=True, exist_ok=True)
    out_tif.parent.mkdir(parents=True, exist_ok=True)

    descomprimir(args.origem, args.trabalho)

    # ------------------------------------------------------------------ CAOP
    # Limites administrativos: município e freguesias de Viana do Castelo.
    caop = encontrar(args.trabalho, "*CAOP*.gpkg", "*Continente*.gpkg")
    print(f">> CAOP: {caop}")

    municipios = gpd.read_file(caop, layer="cont_municipios").to_crs(CRS_ALVO)
    freguesias = gpd.read_file(caop, layer="cont_freguesias").to_crs(CRS_ALVO)

    col_mun = "dtmn" if "dtmn" in municipios.columns else _coluna_codigo(municipios)
    municipios = municipios[municipios[col_mun].astype(str).str.startswith(CONCELHO)].copy()

    col_freg = "dtmnfr" if "dtmnfr" in freguesias.columns else _coluna_codigo(freguesias)
    freguesias = freguesias[freguesias[col_freg].astype(str).str.startswith(CONCELHO)].copy()

    municipios = _renomear(municipios, {
        col_mun: "dtmn",
        "municipio": "municipio",
        "distrito": "distrito",
        "area_ha": "area_ha",
        "perimetro_km": "perimetro_km",
    })

    freguesias = _renomear(freguesias, {
        col_freg: "dtmnfr",
        "freguesia": "freguesia",
        "municipio": "municipio",
        "area_ha": "area_ha",
        "perimetro_km": "perimetro_km",
    })

    # ------------------------------------------------------------------ BGRI
    # Subsecções estatísticas e atributos censitários.
    bgri = encontrar(args.trabalho, "*BGRI*1609*.gpkg", "*BGRI*.gpkg")
    print(f">> BGRI: {bgri}")

    sub = gpd.read_file(bgri).to_crs(CRS_ALVO)
    sub.columns = [c.lower() for c in sub.columns]

    campos_sub = {
        "bgri2021": "bgri2021",
        "dtmnfr21": "dtmnfr21",
        "secnum21": "secnum21",
        "ssnum21": "ssnum21",
        "n_edificios_classicos": "n_edificios_classicos",
        "n_alojamentos_total": "n_alojamentos_total",
        "n_individuos": "n_individuos",
        "n_individuos_h": "n_individuos_h",
        "n_individuos_m": "n_individuos_m",
        "n_individuos_0_14": "n_individuos_0_14",
        "n_individuos_15_24": "n_individuos_15_24",
        "n_individuos_25_64": "n_individuos_25_64",
        "n_individuos_65_ou_mais": "n_individuos_65_ou_mais",
    }

    presentes = {k: v for k, v in campos_sub.items() if k in sub.columns}
    subseccoes = sub[list(presentes.keys()) + ["geometry"]].rename(columns=presentes)

    # ------------------------------------------------------------------ Alojamento Local
    # Pontos de alojamento local filtrados ao concelho de Viana do Castelo.
    al_shp = encontrar(args.trabalho, "*Alojamento*Local*.shp", "*lojamento*.shp")
    print(f">> Alojamento Local: {al_shp}")

    al = gpd.read_file(al_shp).to_crs(CRS_ALVO)
    al.columns = [c.lower() for c in al.columns]

    col_al = "dtmnfr" if "dtmnfr" in al.columns else _coluna_codigo(al)
    al = al[al[col_al].astype(str).str.startswith(CONCELHO)].copy()

    mapa_al = {
        "nrrnal": "nrrnal",
        "denominaca": "denominacao",
        "denominacao": "denominacao",
        "modalidade": "modalidade",
        "nrutentes": "nr_utentes",
        "nr_utentes": "nr_utentes",
        "dataabertu": "data_abertura",
        "endereco": "endereco",
        col_al: "dtmnfr",
        "freguesia": "freguesia",
        "concelho": "concelho",
    }

    presentes_al = {k: v for k, v in mapa_al.items() if k in al.columns}
    alojamento = al[list(dict.fromkeys(presentes_al.keys())) + ["geometry"]].rename(columns=presentes_al)

    # ------------------------------------------------------------------ GeoPackage
    # Exportação das camadas finais usadas pela base de dados e pelo geoportal.
    print(f">> a gravar {out_gpkg}")

    municipios.to_file(out_gpkg, layer="municipios", driver="GPKG")
    freguesias.to_file(out_gpkg, layer="freguesias", driver="GPKG")
    subseccoes.to_file(out_gpkg, layer="subseccoes", driver="GPKG")
    alojamento.to_file(out_gpkg, layer="alojamento_local", driver="GPKG")

    print(
        f"   municipios={len(municipios)} freguesias={len(freguesias)} "
        f"subseccoes={len(subseccoes)} alojamento_local={len(alojamento)}"
    )

    # ------------------------------------------------------------------ DEM
    # Recorte do modelo digital de elevação ao concelho, com margem adicional.
    dem = encontrar(args.trabalho, "dem_srtm_pt_25m.tif", "*srtm*.tif", "*.tif")
    print(f">> DEM origem: {dem}")

    limite = municipios.to_crs(CRS_ALVO).geometry.union_all().buffer(BUFFER_DEM_M)

    with rasterio.open(dem) as src:
        recorte, transform = rio_mask(src, [limite.__geo_interface__], crop=True)
        perfil = src.profile.copy()

    perfil.update(
        height=recorte.shape[1],
        width=recorte.shape[2],
        transform=transform,
        compress="deflate",
        tiled=True,
        blockxsize=256,
        blockysize=256,
    )

    with rasterio.open(out_tif, "w", **perfil) as dst:
        dst.write(recorte)

    print(f">> DEM recortado gravado em {out_tif} ({recorte.shape[2]}x{recorte.shape[1]} pixeis)")
    print(">> Concluido.")


def _coluna_codigo(gdf):
    """Identifica a coluna de código administrativo quando o nome não é fixo."""
    for c in gdf.columns:
        cl = c.lower()
        if cl in ("dtmnfr", "dtmn", "dico", "codigo"):
            return c

    raise KeyError("nao consegui identificar a coluna de codigo administrativo")


def _renomear(gdf, mapa):
    """Seleciona as colunas disponíveis e normaliza os respetivos nomes."""
    presentes = {k: v for k, v in mapa.items() if k in gdf.columns}
    return gdf[list(dict.fromkeys(presentes.keys())) + ["geometry"]].rename(columns=presentes)


if __name__ == "__main__":
    main()