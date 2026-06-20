# Instruções de execução

Guia completo para instalar, carregar os dados e correr o geoportal.

## 1. Pré-requisitos

- **Docker Desktop** (inclui o `docker compose`). É o caminho recomendado.
- **GDAL** no sistema para a importação vetorial com `ogr2ogr`. Vem com o **QGIS**; no
  Windows usar a *OSGeo4W Shell*. O `raster2pgsql` corre dentro do container, por isso não
  é preciso GDAL no host para o raster.
- Em alternativa ao Docker: **Node.js 20** e um **PostGIS** acessível, ajustando as
  variáveis em `webserver/.env`.

## 2. Subir a infraestrutura

```bash
cp docker/.env.example docker/.env
docker compose -f docker/docker-compose.yml up -d
```

Sobem três serviços:

| Serviço | Porta | Descrição |
|---|---|---|
| `igv-db` | 5432 | PostgreSQL + PostGIS |
| `igv-geoserver` | 8080 | GeoServer (com CORS ativado) |
| `igv-web` | 3000 | Webserver Express (faz `npm install` no arranque) |

Confirmar que a base de dados está pronta:

```bash
docker compose -f docker/docker-compose.yml exec db pg_isready -U postgres -d igv
```

## 3. Extensões e índices

```bash
docker compose -f docker/docker-compose.yml exec -T db \
  psql -U postgres -d igv -f /sql/01_extensoes.sql

docker compose -f docker/docker-compose.yml exec -T db \
  psql -U postgres -d igv -f /sql/02_schema_indices.sql
```

O `02_schema_indices.sql` cria os índices espaciais (GIST) e alfanuméricos. Pode ser
corrido **depois** da importação se preferir (os índices ficam sobre tabelas já com dados).

## 4. Importar dados

### Vetorial (GeoPackage → PostGIS)

```bash
# precisa de GDAL/ogr2ogr no host
bash sql/03_importar_vetorial.sh
```

Importa as quatro camadas de `data/processed/viana.gpkg`: `municipios`, `freguesias`,
`subseccoes`, `alojamento_local`. Todas ficam em EPSG:3763, com a geometria na coluna `geom`
e a chave em `id`.

Alternativa pelo **QGIS**: *Database → DB Manager → Import layer/file*, escolhendo a ligação
PostGIS e o GeoPackage, mantendo o SRID 3763.

### Raster (DEM → PostGIS)

```bash
bash sql/04_importar_raster.sh
```

Corre o `raster2pgsql` dentro do container, em tiles de 100×100, para a tabela `dem`.

### Validação

```bash
docker compose -f docker/docker-compose.yml exec -T db \
  psql -U postgres -d igv -f /sql/05_validacao.sql
```

Deve devolver 1 município, 30 freguesias, 1240 subsecções, 518 pontos de alojamento local e
metadados do raster.

## 5. Publicar no GeoServer

Automático (REST):

```bash
bash scripts/publicar_geoserver.sh
```

Cria o workspace `igv`, a ligação PostGIS (`host=db`), publica as camadas, carrega os SLD de
`geoserver/sld/` e define-os como estilo por defeito; publica ainda o DEM como *coverage*.

Manual (UI em `http://localhost:8080/geoserver`, `admin`/`geoserver`): ver
[`arquitetura.md`](arquitetura.md#publicação-no-geoserver-passo-a-passo).

## 6. Abrir o geoportal

```
http://localhost:3000
```

O indicador no canto superior direito mostra o estado da ligação ao backend/PostGIS.

## Correr o backend sem Docker

```bash
cp webserver/.env.example webserver/.env   # ajustar PGHOST, etc.
npm run install:web
npm start                                   # http://localhost:3000
```

## Paragem e limpeza

```bash
docker compose -f docker/docker-compose.yml down        # parar
docker compose -f docker/docker-compose.yml down -v     # parar e apagar volumes (BD + GeoServer)
```

## Resolução de problemas

- **WMS não aparece, mas as freguesias sim**: o GeoServer não está a responder ou as camadas
  não foram publicadas. As camadas de freguesias e alojamento local vêm do backend e
  funcionam sem GeoServer; as camadas WMS dependem do passo 5.
- **Erro de CORS no browser**: confirmar que o GeoServer subiu com `CORS_ENABLED=true` (já
  está no `docker-compose.yml`).
- **`ogr2ogr: command not found`**: instalar o GDAL/QGIS ou importar pelo DB Manager do QGIS.
- **Análises devolvem erro**: precisam de PostGIS com os dados carregados (passos 3 e 4).
