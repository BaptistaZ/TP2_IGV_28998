const BASE = process.env.BASE || 'http://localhost:3000';

let pass = 0;
let fail = 0;

function ok(cond, nome, extra = '') {
  if (cond) {
    pass++;
    console.log(`  PASS  ${nome}`);
  } else {
    fail++;
    console.log(`  FAIL  ${nome} ${extra}`);
  }
}

async function getJSON(caminho) {
  const r = await fetch(`${BASE}${caminho}`);
  const corpo = await r.json().catch(() => null);

  return { status: r.status, corpo };
}

async function postJSON(caminho, dados) {
  const r = await fetch(`${BASE}${caminho}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados),
  });

  const corpo = await r.json().catch(() => null);

  return { status: r.status, corpo };
}

// Polígono simples em EPSG:4326 usado nos testes de análise espacial.
const areaTeste = {
  type: 'Polygon',
  coordinates: [[
    [-8.85, 41.68],
    [-8.78, 41.68],
    [-8.78, 41.72],
    [-8.85, 41.72],
    [-8.85, 41.68],
  ]],
};

async function main() {
  console.log(`Smoke tests em ${BASE}\n`);

  // Verificação inicial: se falhar, os restantes testes não são executados.
  try {
    const h = await getJSON('/api/health');
    ok(h.status === 200 && h.corpo && h.corpo.ok, '/api/health responde ok', JSON.stringify(h.corpo));
  } catch (e) {
    ok(false, '/api/health (servidor ligado?)', e.message);
    return resumo();
  }

  {
    const r = await getJSON('/api/freguesias');
    const n = r.corpo && r.corpo.features ? r.corpo.features.length : 0;

    ok(r.status === 200 && n === 30, `/api/freguesias devolve 30 freguesias (${n})`);
  }

  {
    const r = await getJSON('/api/freguesias/160924');

    ok(r.status === 200 && r.corpo && r.corpo.info, '/api/freguesias/:dtmnfr devolve info+censos+dem');
  }

  {
    const r = await getJSON('/api/freguesias/abc');

    ok(r.status === 400, '/api/freguesias/abc rejeita dtmnfr invalido (400)');
  }

  {
    const r = await getJSON('/api/alojamento_local');
    const n = r.corpo && r.corpo.features ? r.corpo.features.length : 0;

    ok(r.status === 200 && n > 0, `/api/alojamento_local devolve pontos (${n})`);
  }

  {
    const r = await getJSON('/api/info?lat=41.694&lng=-8.832');

    ok(r.status === 200 && r.corpo && 'freguesia' in r.corpo, '/api/info devolve dados do ponto');
  }

  {
    const r = await getJSON('/api/info');

    ok(r.status === 400, '/api/info sem lat/lng rejeita (400)');
  }

  {
    const r = await postJSON('/api/analise/area', { geometry: areaTeste });

    ok(r.status === 200 && r.corpo && 'area_km2' in r.corpo, '/api/analise/area calcula estatisticas');
  }

  {
    const r = await postJSON('/api/analise/area', {});

    ok(r.status === 400, '/api/analise/area sem geometria rejeita (400)');
  }

  {
    const r = await postJSON('/api/analise/elegivel', {
      geometry: areaTeste,
      cota_min: 100,
      dist_al: 500,
      usar_al: true,
    });

    ok(r.status === 200 && r.corpo && 'area_km2_elegivel' in r.corpo, '/api/analise/elegivel devolve area + geojson');
  }

  resumo();
}

function resumo() {
  console.log(`\nResultado: ${pass} PASS, ${fail} FAIL`);
  process.exit(fail === 0 ? 0 : 1);
}

main();