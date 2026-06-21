import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORTA = 3999;
const BASE = `http://localhost:${PORTA}`;

let servidor;

before(async () => {
  const cwd = path.join(__dirname, '..', 'webserver');

  // Arranca o servidor Express numa porta própria para os testes.
  servidor = spawn('node', ['server.js'], {
    cwd,
    env: { ...process.env, PORT: String(PORTA) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  // Aguarda pela mensagem de arranque antes de executar os pedidos HTTP.
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('servidor nao arrancou a tempo')), 8000);

    servidor.stdout.on('data', (d) => {
      if (String(d).includes('a correr')) {
        clearTimeout(t);
        resolve();
      }
    });

    servidor.on('error', reject);
  });
});

after(() => {
  // Garante que o processo criado para os testes é terminado.
  if (servidor) servidor.kill('SIGTERM');
});

test('GET /api/freguesias/:dtmnfr invalido devolve 400', async () => {
  const r = await fetch(`${BASE}/api/freguesias/abc`);

  assert.equal(r.status, 400);

  const c = await r.json();
  assert.ok(c.erro);
});

test('GET /api/info sem lat/lng devolve 400', async () => {
  const r = await fetch(`${BASE}/api/info`);

  assert.equal(r.status, 400);
});

test('GET /api/al/proximos com raio fora do limite devolve 400', async () => {
  const r = await fetch(`${BASE}/api/al/proximos?lat=41.7&lng=-8.8&raio=999999`);

  assert.equal(r.status, 400);
});

test('POST /api/analise/area sem geometria devolve 400', async () => {
  const r = await fetch(`${BASE}/api/analise/area`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });

  assert.equal(r.status, 400);
});

test('POST /api/analise/elegivel com cota_min absurda devolve 400', async () => {
  const r = await fetch(`${BASE}/api/analise/elegivel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-8.8, 41.7],
          [-8.7, 41.7],
          [-8.7, 41.8],
          [-8.8, 41.7],
        ]],
      },
      cota_min: 99999,
    }),
  });

  assert.equal(r.status, 400);
});

test('rota desconhecida da API devolve 404 em JSON', async () => {
  const r = await fetch(`${BASE}/api/nao-existe`);

  assert.equal(r.status, 404);

  const c = await r.json();
  assert.ok(c.erro);
});