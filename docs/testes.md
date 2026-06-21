# Testes

O projeto tem dois conjuntos de testes, ambos em Node.js sem dependências extra. Servem
para validar o backend antes de uma demonstração.

## 1. Testes de rotas (`test/rotas.test.mjs`)

Usam o runner nativo `node:test`. Arrancam o servidor Express numa porta de teste (3999) e
verificam o comportamento das rotas **com a base de dados ausente**. Não precisam de
PostGIS. Confirmam:

- que parâmetros inválidos devolvem `400` (por exemplo, `dtmnfr` sem 6 dígitos, falta de
  geometria no corpo, raio ou distância fora do intervalo);
- que uma rota de API inexistente devolve `404`;
- que a validação acontece antes de qualquer acesso à base de dados.

Correr:

```bash
npm test
```

Resultado esperado: 6 testes a passar. Isto valida a camada de entrada (validação,
encaminhamento e códigos de erro) de forma determinística.

## 2. Smoke test (`test/smoke.mjs`)

Faz pedidos reais às rotas contra um servidor já a correr, com a base de dados ligada e os
dados importados. Serve para confirmar, de ponta a ponta, que as análises respondem. Cada
rota é marcada como PASS ou FAIL.

Correr (com a infraestrutura no ar e os dados importados):

```bash
npm start            # num terminal
npm run test:smoke   # noutro terminal
```

A variável `BASE` permite apontar para outro endereço:

```bash
BASE=http://localhost:3000 node test/smoke.mjs
```

O smoke test cobre, entre outras: `GET /api/health`, `GET /api/freguesias`,
`GET /api/freguesias/:dtmnfr`, `GET /api/info`, `GET /api/alojamento_local` e as duas
análises por POST.

## 3. Verificação de sintaxe

Todo o JavaScript foi validado com:

```bash
# backend modular (ponto de entrada + camadas em src/)
node --check webserver/server.js
find webserver/src -name '*.js' -exec node --check {} \;

# frontend modular (todos os modulos em public/js/)
find webserver/public/js -name '*.js' -exec node --check {} \;
```

## O que não foi testado neste ambiente

As queries SQL não foram executadas contra um PostGIS real durante o desenvolvimento,
porque o ambiente não tinha a base de dados ativa. Foram escritas segundo a sintaxe dos
tutoriais e a documentação do PostGIS. Recomenda-se, no ambiente final:

1. subir a infraestrutura e importar os dados;
2. correr `sql/05_validacao.sql` para confirmar as contagens (1 / 30 / 1240 / 518) e o
   SRID;
3. correr o smoke test.

Com estes três passos fica validado o caminho completo, dos dados ao mapa.
