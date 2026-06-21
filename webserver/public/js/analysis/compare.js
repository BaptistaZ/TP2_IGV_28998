// Comparador de freguesias.
// Gere a seleção de freguesias, a tabela comparativa e o gráfico.

let comparaSel = [];
let dadosComparar = [];
let chartComparar = null;

const LINHAS_COMP = [
  ['Área (km²)', 'area_km2'],
  ['População', 'populacao'],
  ['Densidade (hab/km²)', 'densidade'],
  ['Edifícios', 'edificios'],
  ['Aloj. familiares', 'alojamentos'],
  ['0-14 anos', 'jovens_0_14'],
  ['15-24 anos', 'jovens_15_24'],
  ['25-64 anos', 'adultos_25_64'],
  ['65+ anos', 'idosos_65'],
];

const ROTULO_METRICA = {
  populacao: 'População',
  densidade: 'Densidade (hab/km²)',
  alojamentos: 'Aloj. familiares',
  edificios: 'Edifícios',
  area_km2: 'Área (km²)',
};

function ligarComparar() {
  const add = document.getElementById('comparar-add');

  // Adiciona freguesias à seleção, evitando duplicados e limitando a quatro.
  add.addEventListener('change', () => {
    const dt = add.value;
    add.value = '';

    if (!dt || comparaSel.includes(dt)) return;

    if (comparaSel.length >= 4) {
      toast('Máximo de quatro freguesias.', 'info');
      return;
    }

    comparaSel.push(dt);
    renderChips();
  });

  document.getElementById('btn-comparar').addEventListener('click', executarComparar);

  document.getElementById('comparar-metrica').addEventListener('change', () => {
    if (dadosComparar.length) desenharGraficoComparar();
  });
}

function nomeFreguesia(dt) {
  const f = listaFreguesias.find((x) => x.dtmnfr === dt);
  return f ? f.freguesia : dt;
}

function renderChips() {
  const cont = document.getElementById('comparar-chips');

  // Renderiza as freguesias selecionadas como chips removíveis.
  cont.innerHTML = comparaSel.map((dt) =>
    `<span class="chip" data-dt="${dt}">${escaparHtml(nomeFreguesia(dt))}<button aria-label="Remover">${ICO.fechar}</button></span>`
  ).join('');

  cont.querySelectorAll('.chip button').forEach((b) => {
    b.addEventListener('click', () => {
      comparaSel = comparaSel.filter((x) => x !== b.closest('.chip').dataset.dt);
      renderChips();
    });
  });
}

async function executarComparar() {
  if (comparaSel.length < 2) {
    toast('Escolhe pelo menos duas freguesias.', 'info');
    return;
  }

  const btn = document.getElementById('btn-comparar');

  try {
    carregarBotao(btn, true, 'A comparar…');
    estadoBarra('a comparar freguesias…');

    dadosComparar = await pedirJSON(`${CONFIG.API}/comparar?ids=${comparaSel.join(',')}`);

    desenharTabelaComparar();
    desenharGraficoComparar();

    mostrar('comparar-resultado', true);
    estadoBarra('pronto');
  } catch (err) {
    console.error('Erro ao comparar', err);
    estadoBarra('erro na comparação');
    toast(`Não foi possível comparar: ${err.message}`, 'erro');
  } finally {
    carregarBotao(btn, false);
  }
}

function desenharTabelaComparar() {
  const tab = document.getElementById('comparar-tabela');

  const thead = '<tr><th>Indicador</th>' +
    dadosComparar.map((d) => `<th>${escaparHtml(d.freguesia)}</th>`).join('') +
    '</tr>';

  const linhas = LINHAS_COMP.map(([rotulo, chave]) => {
    const cels = dadosComparar.map((d) => `<td class="mono">${formatarNumero(d[chave])}</td>`).join('');
    return `<tr><td class="ind">${rotulo}</td>${cels}</tr>`;
  }).join('');

  tab.innerHTML = `<thead>${thead}</thead><tbody>${linhas}</tbody>`;
}

function desenharGraficoComparar() {
  const metrica = document.getElementById('comparar-metrica').value;
  const ctx = document.getElementById('grafico-comparar');

  // Evita sobreposição de gráficos quando a métrica é alterada.
  if (chartComparar) chartComparar.destroy();

  const cores = ['#e3a857', '#58c4c4', '#6ea8e6', '#5cc98a'];

  chartComparar = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: dadosComparar.map((d) => d.freguesia),
      datasets: [{
        label: ROTULO_METRICA[metrica] || metrica,
        data: dadosComparar.map((d) => Number(d[metrica])),
        backgroundColor: dadosComparar.map((_, i) => cores[i % cores.length]),
        borderRadius: 5,
        borderSkipped: false,
        maxBarThickness: 60,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: tooltipTema(),
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: COR.bruma, font: { size: 10 } },
        },
        y: {
          beginAtZero: true,
          grid: { color: COR.linha },
          ticks: {
            color: COR.nevoa,
            font: { family: 'JetBrains Mono', size: 10 },
          },
        },
      },
    },
  });
}