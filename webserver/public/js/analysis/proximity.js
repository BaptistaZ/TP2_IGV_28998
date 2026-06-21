// Proximidade: alojamentos mais próximos (KNN) e área de influência.

let knnCamada = null;
let bufferCamada = null;

function ligarProximidade() {
  document.getElementById('rng-knn').addEventListener('input', (e) => txt('lbl-knn', e.target.value));
  document.getElementById('rng-raio').addEventListener('input', (e) => txt('lbl-raio', e.target.value));

  document.getElementById('btn-knn').addEventListener('click', () => {
    activarModoClique(modoClique === 'knn' ? 'info' : 'knn');
  });

  document.getElementById('btn-buffer').addEventListener('click', () => {
    activarModoClique(modoClique === 'buffer' ? 'info' : 'buffer');
  });

  const btnLimpar = document.getElementById('btn-limpar-proximidade');

  if (btnLimpar) {
    btnLimpar.addEventListener('click', limparProximidade);
  }
}

function activarModoClique(novo) {
  modoClique = novo;

  document.getElementById('btn-knn').classList.toggle('ativo', novo === 'knn');
  document.getElementById('btn-buffer').classList.toggle('ativo', novo === 'buffer');

  if (novo === 'info') {
    L.DomUtil.removeClass(map.getContainer(), 'a-clicar');
    estadoBarra('pronto');
    return;
  }

  // Garante que só uma ferramenta interativa fica ativa de cada vez.
  if (medicaoAtiva) cancelarMedicao();
  if (perfilAtivo) cancelarPerfil();
  if (areaMedicaoAtiva) cancelarMedicaoArea();

  L.DomUtil.addClass(map.getContainer(), 'a-clicar');

  estadoBarra(
    novo === 'knn'
      ? 'clica para encontrar os mais próximos'
      : 'clica para definir o centro do raio'
  );

  toast('Clica num ponto do mapa.', 'info', 3000);
}

function limparProximidade() {
  if (knnCamada) {
    map.removeLayer(knnCamada);
    knnCamada = null;
  }

  if (bufferCamada) {
    map.removeLayer(bufferCamada);
    bufferCamada = null;
  }

  activarModoClique('info');

  const knnResultado = document.getElementById('knn-resultado');
  const bufferResultado = document.getElementById('buffer-resultado');
  const knnLista = document.getElementById('knn-lista');
  const bufferLista = document.getElementById('buffer-lista');
  const bufferConta = document.getElementById('buffer-conta');

  if (knnLista) knnLista.innerHTML = '';
  if (bufferLista) bufferLista.innerHTML = '';
  if (bufferConta) bufferConta.textContent = '·';

  if (knnResultado) knnResultado.classList.add('oculto');
  if (bufferResultado) bufferResultado.classList.add('oculto');

  estadoBarra('pronto');
  toast('Resultados de proximidade limpos.', 'info', 2500);
}

async function executarKnn(latlng) {
  const n = parseInt(document.getElementById('rng-knn').value, 10);

  try {
    estadoBarra('a procurar mais próximos…');

    // Pesquisa os N alojamentos locais mais próximos do ponto clicado.
    const lista = await pedirJSON(
      `${CONFIG.API}/al/mais-proximos?lat=${latlng.lat}&lng=${latlng.lng}&n=${n}`
    );

    if (knnCamada) map.removeLayer(knnCamada);

    knnCamada = L.featureGroup().addTo(map);

    L.circleMarker(latlng, {
      radius: 6,
      color: '#0b1620',
      weight: 2,
      fillColor: '#e3a857',
      fillOpacity: 1,
    }).addTo(knnCamada);

    lista.forEach((al, i) => {
      const pt = L.latLng(al.lat, al.lon);

      L.polyline([latlng, pt], {
        color: '#58c4c4',
        weight: 1.4,
        opacity: 0.7,
        dashArray: '4,5',
      }).addTo(knnCamada);

      L.circleMarker(pt, {
        radius: 5,
        color: '#0b1620',
        weight: 1.5,
        fillColor: corModalidade(al.modalidade),
        fillOpacity: 0.95,
      })
        .bindTooltip(
          `${i + 1}. ${escaparHtml(al.denominacao || 'AL')} · ${formatarDistancia(al.dist_m)}`,
          { direction: 'top' }
        )
        .addTo(knnCamada);
    });

    if (knnCamada.getBounds().isValid()) {
      map.fitBounds(knnCamada.getBounds(), { padding: [40, 40] });
    }

    document.getElementById('knn-lista').innerHTML = lista.length
      ? lista.map((al, i) =>
          `<div class="prox-item"><span class="n">${i + 1}</span>` +
          `<span class="d"><span class="nm">${escaparHtml(al.denominacao || 'Alojamento Local')}</span>` +
          `<span class="sb">${escaparHtml(al.freguesia || '')}</span></span>` +
          `<span class="m mono">${formatarDistancia(al.dist_m)}</span></div>`
        ).join('')
      : '<div class="prox-vazio">Sem alojamentos.</div>';

    mostrar('knn-resultado', true);
    garantirPainelDir();
    ativarAba('proximidade');
  } catch (err) {
    console.error('Erro no KNN', err);
    toast(`Não foi possível encontrar os mais próximos: ${err.message}`, 'erro', 6000);
  } finally {
    if (modoClique === 'knn') {
      L.DomUtil.addClass(map.getContainer(), 'a-clicar');
      estadoBarra('clica noutro ponto para recalcular ou carrega novamente para terminar');
    }
  }
}

async function executarBuffer(latlng) {
  const raio = parseInt(document.getElementById('rng-raio').value, 10);

  try {
    estadoBarra('a calcular área de influência…');

    // Pesquisa alojamentos locais dentro do raio escolhido.
    const r = await pedirJSON(
      `${CONFIG.API}/al/proximos?lat=${latlng.lat}&lng=${latlng.lng}&raio=${raio}`
    );

    if (bufferCamada) map.removeLayer(bufferCamada);

    bufferCamada = L.featureGroup().addTo(map);

    L.circle(latlng, {
      radius: raio,
      color: '#e3a857',
      weight: 1.6,
      fillColor: '#e3a857',
      fillOpacity: 0.08,
    }).addTo(bufferCamada);

    L.circleMarker(latlng, {
      radius: 5,
      color: '#0b1620',
      weight: 2,
      fillColor: '#e3a857',
      fillOpacity: 1,
    }).addTo(bufferCamada);

    const feats = (r.geojson && r.geojson.features) || [];

    feats.forEach((f) => {
      const c = f.geometry.coordinates;

      L.circleMarker([c[1], c[0]], {
        radius: 4.5,
        color: '#0b1620',
        weight: 1.4,
        fillColor: corModalidade(f.properties.modalidade),
        fillOpacity: 0.95,
      })
        .bindTooltip(
          `${escaparHtml(f.properties.denominacao || 'AL')} · ${f.properties.dist_m} m`,
          { direction: 'top' }
        )
        .addTo(bufferCamada);
    });

    if (bufferCamada.getBounds().isValid()) {
      map.fitBounds(bufferCamada.getBounds(), { padding: [30, 30] });
    }

    txt('buffer-conta', formatarNumero(r.total || 0));

    document.getElementById('buffer-lista').innerHTML = feats.length
      ? feats.map((f) =>
          `<div class="prox-item"><span class="p" style="background:${corModalidade(f.properties.modalidade)}"></span>` +
          `<span class="d"><span class="nm">${escaparHtml(f.properties.denominacao || 'Alojamento Local')}</span>` +
          `<span class="sb">${escaparHtml(f.properties.modalidade || '')}</span></span>` +
          `<span class="m mono">${f.properties.dist_m} m</span></div>`
        ).join('')
      : '<div class="prox-vazio">Nenhum alojamento local neste raio.</div>';

    mostrar('buffer-resultado', true);
    garantirPainelDir();
    ativarAba('proximidade');
  } catch (err) {
    console.error('Erro no buffer', err);
    toast(`Não foi possível calcular a área de influência: ${err.message}`, 'erro', 6000);
  } finally {
    if (modoClique === 'buffer') {
      L.DomUtil.addClass(map.getContainer(), 'a-clicar');
      estadoBarra('clica noutro ponto para recalcular ou carrega novamente para terminar');
    }
  }
}
