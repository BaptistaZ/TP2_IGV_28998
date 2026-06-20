# Guia para a defesa

Apoio para a apresentação oral. Tem uma ordem sugerida de demonstração, o mapeamento aos
requisitos do enunciado e respostas curtas para as perguntas mais prováveis.

## Ordem sugerida de demonstração (cerca de 6 a 8 minutos)

1. **Abrir o geoportal** em `http://localhost:3000`. Mostrar a topbar, o painel de camadas
   à esquerda e o painel de análise à direita.
2. **Mapas base.** Trocar entre OSM, CartoDB Positron e Esri World Imagery.
3. **Camadas.** Ligar e desligar freguesias, subsecções, alojamento local e DEM. Mostrar a
   legenda a atualizar.
4. **Info por clique.** Clicar no mapa e mostrar o popup com freguesia, subsecção, cota e
   alojamentos a 500 m.
5. **Consulta de freguesia.** Clicar numa freguesia e mostrar, na aba Consulta, os censos,
   o gráfico etário e as estatísticas de cota (mín., máx., média). Carregar em ver o DEM da
   freguesia.
6. **Interseção de área.** Desenhar um polígono, executar a análise e mostrar os KPIs:
   população estimada, alojamentos por modalidade (gráfico), cota e freguesias
   intersectadas.
7. **Elegibilidade.** Com a área desenhada, definir a cota e a distância nos sliders e
   executar. Mostrar a zona elegível pintada no mapa e a área em km². Exportar em GeoJSON.
8. **GeoServer.** Mostrar as camadas WMS com SLD por cima (freguesias com rótulos,
   subsecções coropléticas) e referir que o backend serve as mesmas camadas em GeoJSON para
   robustez.
9. **Medição.** Medir uma distância e uma área com a ferramenta de desenho.

## Mapeamento aos requisitos do enunciado

| Requisito (Opção 2) | Onde está |
|---|---|
| Base de dados PostGIS | PostgreSQL 16 + PostGIS 3.4, vetorial e raster |
| Publicar no GeoServer | Workspace `igv`, camadas WMS, SLD, DEM como coverage |
| Temas vetoriais e raster no mapa | Freguesias, subsecções, AL e DEM |
| Controlo de visibilidade | Painel de camadas com toggles |
| Seleção de mapa base | OSM, CartoDB, Esri |
| Interseção de temas (≥1) | Análise de área e análise de elegibilidade |
| Delimitar área + análise com ≥2 temas | Polígono desenhado cruza censos, AL, relevo e freguesias |
| Info por clique (valorizado) | `GET /api/info` com popup |
| SLD e simbologia por atributo (valorizado) | 4 SLD, subsecções coropléticas por população |
| Rótulos (valorizado) | SLD das freguesias |
| Medição (valorizado) | Leaflet.draw |
| Buffers (valorizado) | Análise de elegibilidade e exemplo de subsecção |
| Gráficos e tabelas (valorizado) | Chart.js (etário e modalidades), KPIs |

## Perguntas prováveis e respostas curtas

**Porquê EPSG:3763 e não 4326 na base de dados?**
Para calcular distâncias e áreas em metros sem conversões. Converte-se para 4326 só na
saída para o Leaflet.

**Como funciona a análise de elegibilidade?**
Dentro da área desenhada, classifico o raster com `ST_MapAlgebra` para isolar a cota acima
do limite, vetorizo com `ST_DumpAsPolygons`, faço um buffer dos alojamentos com `ST_Buffer`
e cruzo as duas com `ST_Intersection`. O resultado é a zona que cumpre os dois critérios.

**A cota vem de um slider e entra na query. Há risco de injeção?**
Não. A cota e a distância são validadas como números no servidor antes de entrarem na
expressão. A geometria e a distância do buffer vão como parâmetros `$n`.

**Porque tens as freguesias no GeoServer e também no backend?**
O GeoServer cumpre o requisito de publicação. O backend serve as mesmas camadas em GeoJSON
para a demonstração ser estável mesmo que o GeoServer demore a arrancar. As camadas WMS
entram por cima quando estão prontas.

**Como estimas a população dentro de uma área desenhada?**
Por ponderação de área: para cada subsecção que intersecta a área, somo a população
multiplicada pela fração da subsecção que cai dentro.

**Porque é que o DEM está recortado?**
Para o ZIP ficar leve e a demonstração rápida. Recortei ao concelho com 2 km de margem,
mantendo 25 m de resolução.

**As estatísticas de cota de uma freguesia, como são calculadas?**
`ST_Clip` recorta o raster ao limite da freguesia, `ST_Union` junta os tiles e
`ST_SummaryStats` devolve mínimo, máximo, média e desvio.

**Onde está a interseção de temas pedida?**
Em duas funcionalidades: a análise de área (cruza quatro temas) e a elegibilidade (cruza
raster e vetorial).

## Riscos no dia e como contornar

- **GeoServer ainda a arrancar:** o mapa funciona pelo backend; esperar e voltar a ligar a
  camada WMS.
- **Sem ligação à base de dados:** `GET /api/health` indica o estado; subir o container
  `db` e reimportar se necessário.
- **Polígono inválido ao desenhar:** as queries usam `ST_MakeValid`, mas convém desenhar
  polígonos simples na demonstração.
