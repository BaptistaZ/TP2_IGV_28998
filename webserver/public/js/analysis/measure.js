// Medição de distâncias no mapa e limpeza de áreas/resultados.

let medicaoAtiva = false;
let medPontos = [];
let medLinha = null;
let medFantasma = null;
let medMarcadores = null;
let medTooltip = null;

function iniciarMedicao() {
  medicaoAtiva = true;
  medPontos = [];

  medMarcadores = L.featureGroup().addTo(map);
  medLinha = L.polyline([], {
    color: '#58c4c4',
    weight: 3,
    opacity: 0.95,
  }).addTo(map);

  document.getElementById('btn-medir')?.classList.add('ativo');
  L.DomUtil.addClass(map.getContainer(), 'a-medir');

  map.doubleClickZoom.disable();

  // Eventos temporários usados enquanto a ferramenta de medição está ativa.
  map.on('click', adicionarPontoMedicao);
  map.on('mousemove', moverMedicao);
  map.on('dblclick', terminarMedicaoDblclick);

  toast('Clica para marcar pontos. Duplo clique, Esc ou o botão terminam.', 'info', 4500);
  estadoBarra('medição ativa');
}

function adicionarPontoMedicao(e) {
  medPontos.push(e.latlng);
  medLinha.setLatLngs(medPontos);

  L.circleMarker(e.latlng, {
    radius: 3.5,
    color: '#0b1620',
    weight: 1.5,
    fillColor: '#58c4c4',
    fillOpacity: 1,
  }).addTo(medMarcadores);

  atualizarTooltipMedicao(e.latlng);
}

function moverMedicao(e) {
  if (!medicaoAtiva || medPontos.length === 0) return;

  const ult = medPontos[medPontos.length - 1];

  // Linha temporária entre o último ponto confirmado e o cursor.
  if (medFantasma) {
    medFantasma.setLatLngs([ult, e.latlng]);
  } else {
    medFantasma = L.polyline([ult, e.latlng], {
      color: '#58c4c4',
      weight: 1.5,
      opacity: 0.55,
      dashArray: '3,6',
    }).addTo(map);
  }

  atualizarTooltipMedicao(e.latlng);
}

function comprimentoMedicao(extra) {
  let total = 0;

  for (let i = 1; i < medPontos.length; i++) {
    total += medPontos[i - 1].distanceTo(medPontos[i]);
  }

  if (extra && medPontos.length) {
    total += medPontos[medPontos.length - 1].distanceTo(extra);
  }

  return total;
}

function atualizarTooltipMedicao(pos) {
  const total = comprimentoMedicao(medicaoAtiva ? pos : null);

  if (!medTooltip) {
    medTooltip = L.tooltip({
      permanent: true,
      direction: 'right',
      className: 'tt-medicao',
      offset: [12, 0],
    });
  }

  medTooltip.setLatLng(pos).setContent(formatarDistancia(total));

  if (!map.hasLayer(medTooltip)) {
    medTooltip.addTo(map);
  }
}

function terminarMedicaoDblclick(e) {
  if (e?.originalEvent) L.DomEvent.stop(e.originalEvent);
  terminarMedicao();
}

function terminarMedicao() {
  if (!medicaoAtiva) return;

  desligarMedicao();

  if (medFantasma) {
    map.removeLayer(medFantasma);
    medFantasma = null;
  }

  if (medPontos.length < 2) {
    limparMedicao();
    toast('Medição cancelada. São precisos pelo menos dois pontos.', 'info');
    estadoBarra('pronto');
    return;
  }

  const total = comprimentoMedicao(null);
  const ult = medPontos[medPontos.length - 1];

  if (medTooltip) {
    map.removeLayer(medTooltip);
    medTooltip = null;
  }

  // Tooltip final fixo com a distância total medida.
  const tt = L.tooltip({
    permanent: true,
    direction: 'top',
    className: 'tt-medicao fixa',
    offset: [0, -6],
  })
    .setLatLng(ult)
    .setContent(`Distância: ${formatarDistancia(total)}`);

  tt.addTo(map);

  if (medLinha) medLinha._ttTotal = tt;

  toast(`Distância total: ${formatarDistancia(total)}. Carrega em medir outra vez para limpar.`, 'ok', 5000);
  estadoBarra('pronto');
}

function desligarMedicao() {
  medicaoAtiva = false;

  map.off('click', adicionarPontoMedicao);
  map.off('mousemove', moverMedicao);
  map.off('dblclick', terminarMedicaoDblclick);

  setTimeout(() => map.doubleClickZoom.enable(), 300);

  document.getElementById('btn-medir')?.classList.remove('ativo');
  L.DomUtil.removeClass(map.getContainer(), 'a-medir');
}

function cancelarMedicao() {
  if (!medicaoAtiva) return;

  desligarMedicao();
  limparMedicao();
  estadoBarra('pronto');
}

function limparMedicao() {
  [medLinha, medFantasma, medMarcadores, medTooltip].forEach((l) => {
    if (l && map.hasLayer(l)) map.removeLayer(l);
  });

  if (medLinha?._ttTotal && map.hasLayer(medLinha._ttTotal)) {
    map.removeLayer(medLinha._ttTotal);
  }

  medLinha = medFantasma = medMarcadores = medTooltip = null;
  medPontos = [];
}

function limparArea() {
  limparAreasPoligono();
  areaDesenhada = null;

  if (elegivelLayer) {
    map.removeLayer(elegivelLayer);
    elegivelLayer = null;
  }

  ultimoElegivelGeoJSON = null;

  esconder('interseccao-resultado');
  esconder('criterios-resultado');

  toast('Área e resultados limpos.', 'info');
}