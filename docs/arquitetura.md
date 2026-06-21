# Arquitetura

## Visão geral

```
   Browser (Chrome)
   ┌─────────────────────────────────────────────┐
   │  Leaflet 1.9.4  +  Leaflet.draw              │
   │  GeoRasterLayer + RainbowVis  +  Chart.js    │
   └───────┬───────────────────────────┬──────────┘
           │ REST (GeoJSON 4326)        │ WMS/WFS
           ▼                            ▼
   ┌────────────────┐           ┌────────────────┐
   │  Express (Node)│           │   GeoServer    │
   │  /api/...      │           │  estilos SLD   │
   └───────┬────────┘           └───────┬────────┘
           │ SQL (pg)                   │ JDBC
           ▼                            ▼
   ┌──────────────────────────────────────────────┐
   │      PostgreSQL + PostGIS (vetorial + raster) │
   │   freguesias · subseccoes · alojamento_local  │
   │   municipios · dem (raster em tiles)          │
   └──────────────────────────────────────────────┘
```

## Componentes

**PostGIS** guarda os dados e faz a análise espacial pesada (interseções, recortes de
raster, estatísticas zonais, buffers). Todas as geometrias estão em EPSG:3763.

**GeoServer** publica as camadas como WMS/WFS e aplica a simbologia SLD (contornos e labels
das freguesias, coroplético das subsecções por população, pontos do alojamento local por
modalidade, rampa de cores do DEM). Demonstra a publicação cartográfica e a simbologia por
atributo exigidas pelo enunciado.

**Express** expõe serviços REST próprios que correm as consultas no PostGIS e devolvem o
resultado já em EPSG:4326 (GeoJSON), ou imagens GeoTIFF no caso do relevo recortado. Usa um
*pool* de ligações (`pg.Pool`) partilhado, em vez de abrir uma ligação por pedido.

**Leaflet** desenha os mapas base, os overlays e os resultados das análises, gere o controlo
de camadas e o desenho/medição de áreas.

## Organização do código

O backend está separado por camadas dentro de `webserver/src/`, com o `server.js`
reduzido ao arranque da aplicação (monta middleware e rotas).

```
webserver/
  server.js              ponto de entrada (middleware, rotas, arranque)
  src/
    config/env.js        configuracao a partir de variaveis de ambiente
    db/pool.js           pool pg + helpers de consulta (inclui modo GDAL)
    repositories/        SQL por dominio (freguesias, censos, alojamento, dem, analise)
    controllers/         validacao de entrada e resposta HTTP
    routes/              definicao dos endpoints (agregados em routes/index.js)
    middleware/          tratamento de erros e 404 da API
    validators/          validacoes reutilizaveis
    utils/               auxiliares (numeros, elevacao)
```

O fluxo de um pedido é `routes → controllers → repositories → db/pool`. Os
controllers validam a entrada e tratam a resposta; os repositories contêm o SQL e
devolvem dados já em EPSG:4326.

O frontend está dividido por responsabilidade em `webserver/public/js/`. São
scripts clássicos carregados por ordem no `index.html`, que partilham o mesmo
âmbito global: o estado vive em `state/state.js` e o arranque em `app.js`.

```
public/
  index.html
  css/estilos.css
  js/
    config/     CONFIG (endpoints da API e do GeoServer)
    state/      estado global e constantes visuais
    api/        acesso a API (GET/POST JSON)
    map/        mapa base e barra de estado
    styles/     estilos das feicoes de freguesia
    layers/     freguesias, overlays, relevo, declive, coropleta
    panels/     clique-info, consulta e abas
    analysis/   desenho, medicao, perfil, proximidade, intersecao, criterios, comparacao
    charts/     tema dos graficos
    templates/  legenda
    ui/         botoes, toasts, indicador de ligacao
    utils/      DOM e formatacao
```

## Porquê duas vias para os dados (backend e GeoServer)

As camadas de **freguesias** e **alojamento local** são servidas pelo backend em GeoJSON.
Assim continuam a funcionar mesmo que o GeoServer não esteja a responder, o que torna a
demonstração mais robusta, e permitem interação direta no cliente (clique, seleção, popups).

As mesmas freguesias e as **subsecções** estão também publicadas como **WMS no GeoServer**,
para cumprir o requisito de publicação cartográfica e mostrar a simbologia SLD (labels e
coroplético por atributo). O utilizador liga/desliga cada uma no painel de camadas.

## Sistemas de coordenadas

Os dados originais e a base de dados usam **EPSG:3763**. O Leaflet trabalha em
**EPSG:4326 / Web Mercator**. A conversão é feita no momento de devolver dados ao cliente,
com `ST_Transform(geom, 4326)` nas consultas e `ST_Transform(..., 3763)` quando um polígono
desenhado pelo utilizador (que chega em 4326) precisa de ser cruzado com os dados.

## Serviços REST (backend)

| Método | Rota | Devolve |
|---|---|---|
| GET | `/api/health` | estado da ligação + versão do PostGIS |
| GET | `/api/freguesias` | FeatureCollection das freguesias |
| GET | `/api/freguesias/:dtmnfr` | info + censos agregados + estatísticas de cota |
| GET | `/api/freguesias/:dtmnfr/dem` | estatísticas do DEM no limite |
| GET | `/api/freguesias/:dtmnfr/dem.tif` | DEM recortado à freguesia (GeoTIFF) |
| GET | `/api/alojamento_local` | FeatureCollection dos pontos (filtro opcional por freguesia) |
| GET | `/api/info?lat&lng` | freguesia, subsecção, cota e nº de AL a 500 m do ponto |
| GET | `/api/al/proximos?lat&lng&raio` | AL dentro de um raio |
| POST | `/api/analise/area` | estatísticas multi-tema da área desenhada |
| POST | `/api/analise/elegivel` | zonas elegíveis (cota + proximidade a AL) + área |
| GET | `/api/subseccoes/:bgri/vizinhos` | nº de subsecções vizinhas (exemplo das aulas) |
| GET | `/api/subseccoes/:bgri/buffer?dist` | buffer de uma subsecção (exemplo das aulas) |

## Operações PostGIS usadas

- `ST_Transform` para mudar de SRC.
- `ST_Intersects`, `ST_Within`, `ST_Contains`, `ST_Touches`, `ST_DWithin` para relações
  espaciais.
- `ST_Intersection`, `ST_Buffer`, `ST_Union` para geometria derivada.
- `ST_Clip`, `ST_SummaryStats`, `ST_Value` para análise zonal sobre o raster.
- `ST_MapAlgebra` + `ST_DumpAsPolygons` para vetorizar as zonas com cota acima do limite na
  análise de elegibilidade.
- `ST_AsTIFF` para devolver o DEM recortado ao frontend.

## Publicação no GeoServer (passo a passo)

Pela UI em `http://localhost:8080/geoserver`:

1. **Workspace**: criar `igv`.
2. **Store**: *New data source → PostGIS*, ligação a `db:5432`, base `igv`, utilizador
   `postgres`. (O host é `db` porque o GeoServer está na mesma rede Docker que a base.)
3. **Layers**: publicar `freguesias`, `subseccoes`, `alojamento_local`, com SRS `EPSG:3763`
   e recalcular as *bounding boxes*.
4. **Styles**: importar os ficheiros de `geoserver/sld/` e associar cada um à camada
   respetiva como estilo por defeito.
5. **Raster**: *New data source → GeoTIFF*, apontando para `file:/geotiff/dem_vc_25m.tif`,
   publicar a camada `dem` e associar o estilo `dem`.

O script `scripts/publicar_geoserver.sh` faz tudo isto pela API REST.
