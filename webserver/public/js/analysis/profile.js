// Perfil de elevação ao longo de uma linha desenhada no mapa.

let perfilAtivo = false;
let perfilPontos = [];
let perfilLinha = null;
let perfilFantasma = null;
let perfilMarcadores = null;
let chartPerfil = null;
let perfilDlg = null;

function iniciarPerfil() {
  if (medicaoAtiva) cancelarMedicao();
  if (areaMedicaoAtiva) cancelarMedicaoArea();
  if (modoClique !== 'info') activarModoClique('info');

  perfilAtivo = true;
  perfilPontos = [];

  perfilMarcadores = L.featureGroup().addTo(map);
  perfilLinha = L.polyline([], {
    color: '#e3a857',
    weight: 3,
    opacity: 0.95,
  }).addTo(map);

  document.getElementById('btn-perfil').classList.add('ativo');
  L.DomUtil.addClass(map.getContainer(), 'a-medir');

  map.doubleClickZoom.disable();

  // Eventos temporários usados para desenhar a linha do perfil.
  map.on('click', perfilAddPonto);
  map.on('mousemove', perfilMove);
  map.on('dblclick', perfilTerminarDbl);

  estadoBarra('perfil: a desenhar linha');
  toast('Clica para traçar a linha. Duplo clique termina, Esc cancela.', 'info', 4800);
}

function perfilAddPonto(e) {
  perfilPontos.push(e.latlng);
  perfilLinha.setLatLngs(perfilPontos);

  L.circleMarker(e.latlng, {
    radius: 3,
    color: '#0b1620',
    weight: 1.4,
    fillColor: '#e3a857',
    fillOpacity: 1,
  }).addTo(perfilMarcadores);
}

function perfilMove(e) {
  if (!perfilAtivo || perfilPontos.length === 0) return;

  const ult = perfilPontos[perfilPontos.length - 1];

  // Linha temporária entre o último ponto confirmado e a posição atual do cursor.
  if (perfilFantasma) {
    perfilFantasma.setLatLngs([ult, e.latlng]);
  } else {
    perfilFantasma = L.polyline([ult, e.latlng], {
      color: '#e3a857',
      weight: 1.5,
      opacity: 0.5,
      dashArray: '3,6',
    }).addTo(map);
  }
}

function perfilTerminarDbl(e) {
  if (e?.originalEvent) L.DomEvent.stop(e.originalEvent);
  terminarPerfil();
}

function desligarPerfilEventos() {
  map.off('click', perfilAddPonto);
  map.off('mousemove', perfilMove);
  map.off('dblclick', perfilTerminarDbl);

  setTimeout(() => map.doubleClickZoom.enable(), 300);

  document.getElementById('btn-perfil').classList.remove('ativo');
  L.DomUtil.removeClass(map.getContainer(), 'a-medir');

  if (perfilFantasma) {
    map.removeLayer(perfilFantasma);
    perfilFantasma = null;
  }
}

async function terminarPerfil() {
  if (!perfilAtivo) return;

  perfilAtivo = false;
  desligarPerfilEventos();

  if (perfilPontos.length < 2) {
    limparPerfil();
    toast('Perfil cancelado. São precisos pelo menos dois pontos.', 'info');
    estadoBarra('pronto');
    return;
  }

  const geometry = {
    type: 'LineString',
    coordinates: perfilPontos.map((p) => [p.lng, p.lat]),
  };

  try {
    estadoBarra('a amostrar o relevo…');

    // Envia a linha para o backend calcular as cotas ao longo do percurso.
    const r = await postJSON(`${CONFIG.API}/perfil-elevacao`, { geometry, n: 140 });

    mostrarPerfil(r);
    estadoBarra('pronto');
  } catch (err) {
    console.error('Erro no perfil de elevação', err);
    estadoBarra('erro no perfil');
    toast(`Não foi possível obter o perfil: ${err.message}`, 'erro', 6000);
  }
}

function cancelarPerfil() {
  perfilAtivo = false;
  desligarPerfilEventos();
  limparPerfil();
  estadoBarra('pronto');
}

function limparPerfil() {
  [perfilLinha, perfilFantasma, perfilMarcadores].forEach((l) => {
    if (l && map.hasLayer(l)) map.removeLayer(l);
  });

  perfilLinha = perfilFantasma = perfilMarcadores = null;
  perfilPontos = [];
}

function mostrarPerfil(r) {
  // Cria o painel flutuante apenas na primeira utilização.
  if (!perfilDlg) {
    perfilDlg = document.createElement('div');
    perfilDlg.id = 'perfil-dlg';
    perfilDlg.className = 'perfil-dlg';

    perfilDlg.innerHTML =
      `<div class="perfil-cab"><span class="t">Perfil de elevação</span>` +
      `<button class="perfil-fechar" aria-label="Fechar">${ICO.fechar}</button></div>` +
      `<div class="perfil-stats" id="perfil-stats"></div>` +
      `<div class="perfil-grafico"><canvas id="grafico-perfil"></canvas></div>`;

    document.getElementById('mapa').appendChild(perfilDlg);
    perfilDlg.querySelector('.perfil-fechar').addEventListener('click', fecharPerfil);
  }

  perfilDlg.classList.remove('oculto');

  document.getElementById('perfil-stats').innerHTML =
    `<span><b>${formatarDistancia(r.comprimento_m)}</b> percurso</span>` +
    `<span><b>${r.cota_min ?? '·'}</b> – <b>${r.cota_max ?? '·'} m</b></span>` +
    `<span><b>${r.ganho_m ?? '·'} m</b> de subida</span>`;

  const ctx = document.getElementById('grafico-perfil');

  // Evita sobreposição de gráficos entre medições sucessivas.
  if (chartPerfil) chartPerfil.destroy();

  chartPerfil = new Chart(ctx, {
    type: 'line',
    data: {
      labels: r.pontos.map((p) => Math.round(p.dist)),
      datasets: [{
        label: 'Cota (m)',
        data: r.pontos.map((p) => p.cota),
        borderColor: '#e3a857',
        backgroundColor: 'rgba(227,168,87,.18)',
        fill: true,
        tension: 0.25,
        pointRadius: 0,
        borderWidth: 2,
        spanGaps: true,
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
          title: {
            display: true,
            text: 'distância (m)',
            color: COR.nevoa,
            font: { size: 10 },
          },
          grid: { color: COR.linha },
          ticks: {
            color: COR.bruma,
            maxTicksLimit: 7,
            font: { family: 'JetBrains Mono', size: 10 },
          },
        },
        y: {
          title: {
            display: true,
            text: 'cota (m)',
            color: COR.nevoa,
            font: { size: 10 },
          },
          grid: { color: COR.linha },
          ticks: {
            color: COR.bruma,
            font: { family: 'JetBrains Mono', size: 10 },
          },
        },
      },
    },
  });
}

function perfilTemResultadoVisivel() {
  return Boolean(
    (perfilLinha && map.hasLayer(perfilLinha)) ||
    (perfilMarcadores && map.hasLayer(perfilMarcadores)) ||
    (perfilDlg && !perfilDlg.classList.contains('oculto'))
  );
}

function fecharPerfil() {
  if (perfilDlg) perfilDlg.classList.add('oculto');
  limparPerfil();
}

