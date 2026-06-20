# Análises implementadas

O enunciado da Opção 2 pede, no mínimo, uma funcionalidade de interseção de temas e a
delimitação de uma área com análise espacial sobre dois ou mais temas. O geoportal cobre
isso e acrescenta consultas por clique, proximidade e estatísticas. Esta página explica
cada análise, com a operação PostGIS que a sustenta.

A correspondência entre o que o utilizador faz no mapa, a rota REST e o método de
`database.js` é a seguinte.

| Análise | Interação | Rota | Método |
|---|---|---|---|
| Consulta de freguesia | Clique numa freguesia | `GET /api/freguesias/:dtmnfr` | `getFreguesiaInfo` + `getCensosFreguesia` + `getFreguesiaDemStats` |
| Estatísticas do relevo | Mostrar cota da freguesia | `GET /api/freguesias/:dtmnfr/dem` | `getFreguesiaDemStats` |
| Info por clique | Clique no mapa | `GET /api/info` | `getInfoAtPoint` |
| Alojamento próximo | Clique + raio | `GET /api/al/proximos` | `getAlProximos` |
| Interseção de área | Desenhar polígono | `POST /api/analise/area` | `analiseArea` |
| Elegibilidade | Desenhar polígono + critérios | `POST /api/analise/elegivel` | `analiseElegivel` |
| Vizinhos (tutorial) | Clique em subsecção | `GET /api/subseccoes/:bgri/vizinhos` | `getNumVizinhos` |
| Buffer (tutorial) | Duplo clique em subsecção | `GET /api/subseccoes/:bgri/buffer` | `getBuffer` |

## 1. Consulta de uma freguesia (alfanumérica + relevo)

Ao clicar numa freguesia, o geoportal mostra os censos agregados e as estatísticas de cota
no interior do seu limite. É a interseção do tema vetorial freguesias com o tema censos
(BGRI) e com o raster (DEM).

A população é agregada somando as subsecções da freguesia:

```sql
SELECT SUM(n_individuos) AS populacao, SUM(n_individuos_h) AS homens, ...
FROM subseccoes
WHERE dtmnfr21 = $1;
```

As estatísticas de cota usam `ST_Clip` para recortar o raster ao polígono da freguesia,
`ST_Union` para juntar os tiles e `ST_SummaryStats` para obter mínimo, máximo, média e
desvio:

```sql
SELECT ST_SummaryStats(ST_Union(ST_Clip(r.rast, fr.geom, true)))
FROM dem r WHERE ST_Intersects(r.rast, fr.geom);
```

Esta é exatamente a sugestão do enunciado: selecionar uma freguesia e apresentar máximo,
mínimo e média das cotas no interior do seu limite. No frontend, a repartição etária vai
para um gráfico Chart.js.

Existe ainda `GET /api/freguesias/:dtmnfr/dem.tif`, que devolve o DEM recortado à freguesia
em GeoTIFF (`ST_AsTIFF`). O frontend carrega-o no GeoRasterLayer e pinta a altitude com a
RainbowVis, replicando a abordagem do Tutorial 4.

## 2. Informação por clique no mapa

Um clique em qualquer ponto devolve, de uma só vez, a freguesia, a subsecção, a cota do
terreno e o número de alojamentos a 500 m. O ponto é construído em 4326 e convertido para
3763 para cruzar com os temas:

```sql
WITH p AS (SELECT ST_Transform(ST_SetSRID(ST_MakePoint($1,$2),4326),3763) AS g)
SELECT
  (SELECT freguesia FROM freguesias f, p WHERE ST_Contains(f.geom, p.g)),
  (SELECT ST_Value(r.rast, p.g) FROM dem r, p WHERE ST_Intersects(r.rast, p.g)),
  (SELECT count(*) FROM alojamento_local al, p WHERE ST_DWithin(al.geom, p.g, 500));
```

Operações em jogo: `ST_Contains` (ponto em polígono), `ST_Value` (valor do raster no
ponto) e `ST_DWithin` (proximidade em metros).

## 3. Proximidade: alojamento local num raio

A partir de um clique e de um raio em metros, lista os alojamentos locais dentro do raio,
ordenados por distância, já em GeoJSON 4326. Usa `ST_DWithin` para o filtro e
`ST_Distance` para a distância de cada um.

## 4. Interseção de área (vários temas)

O utilizador desenha um polígono e o geoportal cruza-o com três temas ao mesmo tempo:

- **Censos:** população estimada por ponderação de área. Para cada subsecção que intersecta
  a área, conta-se a fração da subsecção que cai dentro:

  ```sql
  SUM(s.n_individuos * ST_Area(ST_Intersection(s.geom, area)) / ST_Area(s.geom))
  ```

- **Alojamento local:** contagem por modalidade dos alojamentos dentro da área
  (`ST_Within`), que alimenta um gráfico de anel no frontend.
- **Relevo:** estatísticas de cota na área (`ST_Clip` + `ST_Union` + `ST_SummaryStats`).
- **Freguesias:** lista das freguesias intersectadas (`ST_Intersects`).

O resultado vem num único objeto com a área em km², a população estimada, o total e a
repartição de alojamentos, as estatísticas de cota e a lista de freguesias. Isto satisfaz
o requisito de análise espacial envolvendo dois ou mais temas numa área delimitada.

## 5. Elegibilidade (raster + vetorial)

É a análise mais completa e segue o exemplo do mockup do enunciado. Dentro da área
desenhada, encontra as zonas que cumprem dois critérios em simultâneo:

1. **Cota acima de um limite**, definido por um slider.
2. **A menos de X metros de um alojamento local** (opcional, ligado por defeito).

O critério da cota é resolvido em raster com `ST_MapAlgebra`, classificando cada pixel a 1
ou 0, e depois vetorizado com `ST_DumpAsPolygons`:

```sql
ST_MapAlgebra(rast, 1, '2BUI',
  'CASE WHEN [rast.val] >= <cota> THEN 1 ELSE 0 END')
```

O critério da proximidade é um buffer dos alojamentos (`ST_Buffer`). A zona elegível é a
interseção das duas (`ST_Intersection`), recortada à área desenhada. O resultado volta como
GeoJSON 4326 e é pintado no mapa, com a área elegível em km² e um botão para exportar.

Nota de segurança: a cota e a distância são validadas como números no servidor antes de
entrarem na expressão de map algebra, pelo que não há risco de injeção de SQL. A geometria
e a distância do buffer vão como parâmetros (`$1`, `$2`).

## 6. Exemplos dos tutoriais (vizinhos e buffer)

Para manter a ligação direta às aulas, estão implementados os dois exemplos dos tutoriais:
o número de subsecções vizinhas (`ST_Touches`) e o buffer de uma subsecção
(`ST_Buffer` + `ST_Transform`), acessíveis por clique e duplo clique.

## Operações PostGIS usadas (resumo)

Vetorial: `ST_Contains`, `ST_Within`, `ST_Intersects`, `ST_Intersection`, `ST_Touches`,
`ST_DWithin`, `ST_Distance`, `ST_Buffer`, `ST_Area`, `ST_Union`, `ST_MakeValid`,
`ST_CollectionExtract`, `ST_Transform`, `ST_AsGeoJSON`.

Raster: `ST_Clip`, `ST_Union`, `ST_SummaryStats`, `ST_Value`, `ST_MapAlgebra`,
`ST_DumpAsPolygons`, `ST_AsTIFF`.
