// Ferramentas de mapa: medição de área geodésica e ativação do perfil de elevação.

function ligarFerramentasMapa() {
  document.getElementById('btn-medir-area').addEventListener('click', () => {
    if (areaMedicaoAtiva) {
      cancelarMedicaoArea();
      return;
    }

    if (camadaAreaMedida) {
      limparMedicaoArea();
      estadoBarra('pronto');
      return;
    }

    iniciarMedicaoArea();
  });

  document.getElementById('btn-perfil').addEventListener('click', () => {
    if (perfilAtivo) {
      cancelarPerfil();
      return;
    }

    if (perfilTemResultadoVisivel()) {
      fecharPerfil();
      estadoBarra('pronto');
      return;
    }

    iniciarPerfil();
  });
}

// Medição de área através de polígono desenhado no mapa.
let areaMedicaoAtiva = false;
let areaMedHandler = null;
let camadaAreaMedida = null;

function iniciarMedicaoArea() {
  if (medicaoAtiva) cancelarMedicao();
  if (perfilAtivo) cancelarPerfil();
  if (modoClique !== 'info') activarModoClique('info');

  areaMedicaoAtiva = true;
  tipoDesenho = 'medir';

  document.getElementById('btn-medir-area').classList.add('ativo');
  estadoBarra('medicao de area ativa');

  areaMedHandler = new L.Draw.Polygon(map, {
    allowIntersection: false,
    showArea: true,
    shapeOptions: {
      color: '#58c4c4',
      weight: 2,
      fillColor: '#58c4c4',
      fillOpacity: 0.12,
    },
    metric: true,
  });

  areaMedHandler.enable();

  toast('Desenha o polígono. Duplo clique fecha, Esc cancela.', 'info', 4500);
}

function aoCriarAreaMedida(layer) {
  if (camadaAreaMedida) map.removeLayer(camadaAreaMedida);

  camadaAreaMedida = layer;
  layer.addTo(map);

  const latlngs = layer.getLatLngs()[0];
  const area = areaGeodesica(latlngs);
  const perimetro = perimetroLatLngs(latlngs);

  const txtArea = area >= 1e6
    ? `${(area / 1e6).toFixed(3)} km²`
    : `${Math.round(area).toLocaleString('pt-PT')} m²`;

  const ha = area / 1e4;

  layer.bindTooltip(
    `<b>Área:</b> ${txtArea}<br><b>${ha.toFixed(2)} ha</b><br><b>Perímetro:</b> ${formatarDistancia(perimetro)}`,
    {
      permanent: true,
      direction: 'center',
      className: 'tt-medicao fixa',
    }
  ).openTooltip();

  toast(`Área medida: ${txtArea}. Carrega no botão para limpar.`, 'ok', 5000);
}

function perimetroLatLngs(latlngs) {
  let p = 0;

  for (let i = 0; i < latlngs.length; i++) {
    p += latlngs[i].distanceTo(latlngs[(i + 1) % latlngs.length]);
  }

  return p;
}

function areaGeodesica(latlngs) {
  // Usa a função do Leaflet Draw quando disponível.
  if (window.L && L.GeometryUtil && typeof L.GeometryUtil.geodesicArea === 'function') {
    return Math.abs(L.GeometryUtil.geodesicArea(latlngs));
  }

  // Fallback: cálculo aproximado por fórmula esférica.
  const R = 6378137;
  const rad = (d) => (d * Math.PI) / 180;
  const n = latlngs.length;

  if (n < 3) return 0;

  let area = 0;

  for (let i = 0; i < n; i++) {
    const p1 = latlngs[i];
    const p2 = latlngs[(i + 1) % n];

    area += rad(p2.lng - p1.lng) *
      (2 + Math.sin(rad(p1.lat)) + Math.sin(rad(p2.lat)));
  }

  return Math.abs((area * R * R) / 2);
}

function desligarMedicaoArea() {
  areaMedicaoAtiva = false;

  document.getElementById('btn-medir-area').classList.remove('ativo');

  if (areaMedHandler) {
    areaMedHandler.disable();
    areaMedHandler = null;
  }

  estadoBarra('pronto');
}

function cancelarMedicaoArea() {
  desligarMedicaoArea();
  limparMedicaoArea();
}

function limparMedicaoArea() {
  if (camadaAreaMedida) {
    map.removeLayer(camadaAreaMedida);
    camadaAreaMedida = null;
  }
}
