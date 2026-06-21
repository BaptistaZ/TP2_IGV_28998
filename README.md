# Geoportal Analítico — Viana do Castelo

Projeto desenvolvido no âmbito do Trabalho Prático de Informação Geográfica e Visualização.

A aplicação consiste num geoportal Web para análise espacial no concelho de Viana do Castelo, integrando dados geográficos, informação censitária, alojamento local, relevo e ferramentas interativas de análise.

## Objetivo

O objetivo principal é disponibilizar uma aplicação Web SIG que permita visualizar, consultar e analisar dados geográficos através de uma interface interativa baseada em mapas.

## Funcionalidades principais

* Visualização de mapas base.
* Controlo de camadas geográficas.
* Visualização de limites de freguesias.
* Camadas WMS publicadas através do GeoServer.
* Consulta de indicadores por freguesia.
* Coropletas por população, densidade, edifícios e alojamentos.
* Visualização de dados de Alojamento Local.
* Visualização de relevo / DEM.
* Comparação entre freguesias.
* Análise de proximidade a alojamentos locais.
* Criação de áreas de influência.
* Interseção espacial por área desenhada.
* Análise por critérios espaciais.
* Exportação de resultados em GeoJSON.
* Medição de distância e área.
* Perfil de elevação.

## Tecnologias utilizadas

* Leaflet
* JavaScript
* HTML / CSS
* Node.js / Express
* PostgreSQL / PostGIS
* GeoServer
* Docker

## Estrutura geral

```text
docker/        Configuração dos serviços Docker
webserver/     Aplicação Web e servidor Express
sql/           Scripts SQL e preparação da base de dados
scripts/       Scripts auxiliares
docs/          Documentação de apoio
test/          Testes e validações
```

## Execução

Para iniciar a aplicação:

```bash
docker compose -f docker/docker-compose.yml up -d
```

Depois de os serviços iniciarem, a aplicação fica disponível em:

```text
http://localhost:3000
```

O GeoServer fica disponível em:

```text
http://localhost:8080/geoserver
```

## Serviços principais

* `web`: servidor da aplicação Web.
* `db`: base de dados PostgreSQL/PostGIS.
* `geoserver`: publicação de camadas geográficas.

## Validação rápida

Para verificar se o backend está operacional:

```bash
curl http://localhost:3000/api/health
```

Resposta esperada:

```json
{
  "ok": true
}
```

## Notas

Este projeto foi desenvolvido com foco na integração entre dados geográficos, serviços Web e visualização interativa em ambiente Web SIG.
