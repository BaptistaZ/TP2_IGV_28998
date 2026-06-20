# Problemas e soluções

Registo honesto das decisões e dos obstáculos técnicos, com a forma como foram resolvidos.
Serve de apoio à defesa e a quem quiser perceber o porquê de certas escolhas.

## 1. Sistema de coordenadas: 3763 para cálculo, 4326 para o mapa

O Leaflet trabalha em graus (EPSG:4326), mas distâncias e áreas em graus não fazem sentido
direto. A opção foi guardar tudo em **EPSG:3763** (metros) e converter para 4326 só na
saída, com `ST_Transform`.

Vantagem: `ST_DWithin`, `ST_Buffer`, `ST_Distance` e `ST_Area` recebem e devolvem metros e
metros quadrados sem qualquer conversão manual. Os pontos clicados no mapa chegam em 4326 e
são convertidos para 3763 antes de cruzar com os dados (`ST_Transform(ST_SetSRID(...,4326),3763)`).

## 2. Cota acima de um limite: ST_MapAlgebra em vez de ST_Reclass

Para isolar as zonas com cota acima de um valor, havia duas vias em raster:
`ST_Reclass` ou `ST_MapAlgebra`. Escolheu-se `ST_MapAlgebra` com uma expressão
`CASE WHEN [rast.val] >= cota THEN 1 ELSE 0 END`, por ser mais legível e por permitir o
limite dinâmico vindo do slider. Depois `ST_DumpAsPolygons` vetoriza os pixéis a 1.

Risco de injeção: a cota é embebida na expressão (não pode ir como parâmetro `$n` dentro da
string do map algebra). Por isso é validada como número no servidor antes de entrar na
query. A distância do buffer e a geometria continuam a ir como parâmetros normais.

## 3. Robustez na defesa: backend GeoJSON além do GeoServer

O enunciado pede publicação no GeoServer, e isso está feito (workspace, camadas WMS e SLD).
Mas o GeoServer demora a arrancar e a sua configuração REST pode falhar numa máquina nova,
o que seria mau no momento da defesa.

Solução: as camadas críticas (freguesias e alojamento local) também são servidas pelo
backend Express em GeoJSON. O mapa funciona mesmo que o GeoServer ainda não esteja pronto,
e as camadas WMS do GeoServer entram por cima quando disponíveis. Assim cumpre-se o
requisito e garante-se uma demonstração estável. Se uma camada WMS falhar, o frontend
mostra um aviso em vez de partir.

## 4. DEM recortado por tamanho

O SRTM completo é pesado de mais para um trabalho que tem de ser entregue em ZIP sem
bibliotecas. O DEM foi recortado ao concelho com 2 km de margem e otimizado (deflate,
tiles), ficando em cerca de 0,7 MB. Mantém resolução de 25 m, suficiente para as
estatísticas de cota e para a análise de elegibilidade.

## 5. Ambiente de desenvolvimento sem GDAL nem PostGIS a correr

A preparação foi feita num ambiente sem GDAL de linha de comandos e sem PostGIS ativo. Os
dados originais foram processados em Python (`geopandas`, `rasterio`, `pyproj`, `shapely`)
para gerar o GeoPackage e o GeoTIFF já prontos.

Consequência prática: não foi possível correr as queries SQL contra um PostGIS real neste
ambiente. A validação do código fez-se por outra via (ver `docs/testes.md`): verificação de
sintaxe de todo o JavaScript e testes às rotas Express com a base de dados ausente, que
confirmam a validação de parâmetros e os códigos de erro. As queries seguem a sintaxe dos
tutoriais e a documentação do PostGIS. Convém validá-las uma vez no ambiente final com
`sql/05_validacao.sql` e o smoke test.

## 6. Importação de dados reprodutível

Para que a importação seja simples e repetível em qualquer máquina, separou-se em scripts
pequenos: `03_importar_vetorial.sh` (ogr2ogr do GeoPackage) e `04_importar_raster.sh`
(raster2pgsql dentro do container). O raster é carregado via `docker compose exec`, o que
evita ter de instalar o `raster2pgsql` no host.

## 7. CORS entre frontend, backend e GeoServer

O frontend consome o backend e também o GeoServer (WMS). Para evitar problemas de origem
cruzada, o Express ativa CORS e o GeoServer é arrancado com as variáveis de ambiente de
CORS ativas no `docker-compose.yml`.

## 8. Dois ZIPs de entrega

A entrega académica não pode incluir bibliotecas, mas o projeto técnico tem valor com tudo
incluído. Resolveu-se com dois alvos no `package.json`:
`zip:submission` gera o `IGV_<aluno>.zip` (apresentação, vídeo e código sem `node_modules`)
e `zip:full` gera o `igv-geoportal-tecnico.zip` (tudo, sem `node_modules`). O número de
aluno entra pela variável de ambiente `ALUNO`.
