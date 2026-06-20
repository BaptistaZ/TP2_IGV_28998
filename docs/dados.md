# Dados usados

Todos os dados são públicos e referem-se ao concelho de Viana do Castelo (código de
município `1609`). Foram filtrados a este concelho para manter a base de dados leve e o
geoportal rápido na defesa.

O sistema de coordenadas de armazenamento é **EPSG:3763** (PT-TM06 / ETRS89), o mesmo
usado nas aulas. Sempre que os dados vão para o Leaflet são convertidos para **EPSG:4326**
com `ST_Transform`.

## Resumo das camadas

| Camada (tabela) | Geometria | Registos | Origem |
|---|---|---|---|
| `municipios` | Polígono | 1 | CAOP 2025 |
| `freguesias` | Polígono | 30 | CAOP 2025 |
| `subseccoes` | Polígono | 1240 | BGRI 2021 |
| `alojamento_local` | Ponto | 518 | Registo Nacional de Alojamento Local |
| `dem` | Raster | 1 cobertura (em tiles) | SRTM 25 m |

## Origem de cada conjunto

**Limites administrativos (CAOP 2025).** Carta Administrativa Oficial de Portugal, da
Direção-Geral do Território. Dela saíram o limite do município e as 30 freguesias do
concelho. Campos relevantes: `dtmnfr` (código da freguesia, 6 dígitos), `freguesia`,
`municipio`, `distrito`, mais `area_ha` e `perimetro_km` calculados.

**Censos / BGRI 2021.** Base Geográfica de Referenciação de Informação do INE, ao nível da
subsecção estatística. Traz as variáveis de população e edificado por subsecção:
`n_individuos`, repartição por sexo (`n_individuos_h`, `n_individuos_m`), repartição por
escalões etários (`0_14`, `15_24`, `25_64`, `65_ou_mais`), `n_edificios_classicos` e
`n_alojamentos_total`. A chave da subsecção é `bgri2021` e o código de freguesia é
`dtmnfr21`.

**Alojamento Local.** Registo Nacional de Alojamento Local (Turismo de Portugal), em
pontos. Filtrado às freguesias do concelho (`dtmnfr` a começar por `1609`). Campos:
`nrrnal` (número de registo), `denominacao`, `modalidade`, `nr_utentes`, `data_abertura`,
`endereco`, `freguesia`, `concelho`. As modalidades predominantes são estabelecimento de
hospedagem, apartamento, moradia e quartos.

**DEM (SRTM 25 m).** Modelo Digital do Terreno em raster, resolução de 25 m. Recortado ao
concelho com uma margem de 2 km, para reduzir o tamanho do ficheiro. O recorte final tem
954 × 1151 pixéis, em EPSG:3763, com compressão deflate e organização em tiles. Os valores
de altitude vão de cerca de -15 m a 820 m.

## Processamento aplicado

Os ficheiros originais (zips de CAOP, BGRI, alojamento local e SRTM) foram processados uma
única vez para produzir dois artefactos prontos a importar:

1. **GeoPackage** `data/processed/viana.gpkg` (cerca de 3,3 MB), com as quatro camadas
   vetoriais já filtradas, reprojetadas para EPSG:3763 e com os nomes de campo em
   minúsculas. A geometria chama-se `geom` em todas as tabelas.
2. **GeoTIFF** `webserver/public/geotiff/dem_vc_25m.tif` (cerca de 0,7 MB), o DEM já
   recortado e otimizado.

O script `scripts/preparar_dados.py` reproduz este processamento a partir dos dados
originais (usa `geopandas` e `rasterio`). Não é preciso correr de novo, porque os
artefactos já estão incluídos. Só é útil se quiser regenerar a partir das fontes:

```bash
python scripts/preparar_dados.py --origem /caminho/para/dados_originais
```

## Como entram na base de dados

- **Vetorial:** `ogr2ogr` lê o GeoPackage e cria as quatro tabelas no PostGIS, forçando
  `-t_srs EPSG:3763`, `GEOMETRY_NAME=geom` e `FID=id`. Ver `sql/03_importar_vetorial.sh`.
- **Raster:** `raster2pgsql` carrega o GeoTIFF na tabela `dem`, em tiles de 100 × 100.
  Ver `sql/04_importar_raster.sh`.

A validação das contagens (1 município, 30 freguesias, 1240 subsecções, 518 alojamentos e
o SRID correto) está em `sql/05_validacao.sql`.

## Nota sobre o sistema de coordenadas

As geometrias ficam em metros (EPSG:3763), o que é importante: permite usar distâncias e
áreas diretamente em metros e metros quadrados nas funções `ST_DWithin`, `ST_Buffer`,
`ST_Distance` e `ST_Area`, sem conversões. Só a saída para o mapa é que passa a graus
(EPSG:4326), que é o que o Leaflet espera.
