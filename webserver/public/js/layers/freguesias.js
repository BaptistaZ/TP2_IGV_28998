// Camada de freguesias.
// Carrega os limites, preenche seletores e gere a seleção/consulta de freguesia.

async function carregarFreguesias() {
  try {
    const geojson = await pedirJSON(`${CONFIG.API}/freguesias`);

    camadaFreguesias = L.geoJSON(geojson, {
      style: estiloFreguesia,
      onEachFeature: (feature, layer) => {
        layer.on('click', (e) => onCliqueFreguesia(e, feature, layer));

        layer.on('mouseover', () => {
          if (freguesiaAtiva?.layer !== layer) layer.setStyle(estiloFreguesiaHover());
        });

        layer.on('mouseout', () => {
          if (freguesiaAtiva?.layer !== layer) layer.setStyle(estiloRepousoFreguesia(layer));
        });
      },
    });

    popularSelectFreguesias(geojson);

    const n = (geojson.features || []).length;
  } catch (err) {
    console.error('Erro ao carregar freguesias', err);
    toast('Não foi possível carregar as freguesias a partir do backend.', 'erro');
  }
}

let listaFreguesias = [];

function popularSelectFreguesias(geojson) {
  const sel = document.getElementById('select-freguesia');

  // Ordena as freguesias alfabeticamente antes de preencher os seletores.
  const feats = (geojson.features || [])
    .map((f) => f.properties)
    .sort((a, b) => String(a.freguesia).localeCompare(String(b.freguesia), 'pt'));

  feats.forEach((p) => {
    const opt = document.createElement('option');
    opt.value = p.dtmnfr;
    opt.textContent = p.freguesia;
    sel.appendChild(opt);
  });

  listaFreguesias = feats.map((p) => ({
    dtmnfr: p.dtmnfr,
    freguesia: p.freguesia,
  }));

  const selCmp = document.getElementById('comparar-add');

  if (selCmp) {
    feats.forEach((p) => {
      const o = document.createElement('option');
      o.value = p.dtmnfr;
      o.textContent = p.freguesia;
      selCmp.appendChild(o);
    });
  }

  sel.addEventListener('change', () => {
    dtmnfrSelecionada = sel.value || null;

    if (dtmnfrSelecionada) {
      consultarFreguesia(dtmnfrSelecionada);
    } else {
      limparSelecaoFreguesia();
    }
  });

  const btnLimpar = document.getElementById('btn-limpar-freguesia');

  if (btnLimpar) {
    btnLimpar.addEventListener('click', () => {
      sel.value = '';
      limparSelecaoFreguesia();
    });
  }
}

function limparSelecaoFreguesia() {
  dtmnfrSelecionada = null;

  if (freguesiaAtiva?.layer) {
    freguesiaAtiva.layer.setStyle(estiloRepousoFreguesia(freguesiaAtiva.layer));
  }

  freguesiaAtiva = null;

  if (freguesiaDemLayer) {
    map.removeLayer(freguesiaDemLayer);
    freguesiaDemLayer = null;
  }

  esconder('consulta-resultado');

  const btnLimpar = document.getElementById('btn-limpar-freguesia');

  if (btnLimpar) {
    btnLimpar.classList.add('oculto');
  }

  estadoBarra('pronto');
}

function marcarFreguesiaEscolhida(ha) {
  const btnLimpar = document.getElementById('btn-limpar-freguesia');

  if (btnLimpar) {
    btnLimpar.classList.toggle('oculto', !ha);
  }
}

function onCliqueFreguesia(e, feature, layer) {
  // Ignora cliques em freguesias quando outra ferramenta de mapa está ativa.
  if (
    modoClique === 'knn' ||
    modoClique === 'buffer' ||
    medicaoAtiva ||
    areaMedicaoAtiva ||
    perfilAtivo
  ) {
    return;
  }

  L.DomEvent.stopPropagation(e);

  if (freguesiaAtiva?.layer) {
    freguesiaAtiva.layer.setStyle(estiloRepousoFreguesia(freguesiaAtiva.layer));
  }

  layer.setStyle(estiloFreguesiaAtiva());

  freguesiaAtiva = {
    dtmnfr: feature.properties.dtmnfr,
    layer,
  };

  const sel = document.getElementById('select-freguesia');

  sel.value = feature.properties.dtmnfr;
  dtmnfrSelecionada = feature.properties.dtmnfr;

  garantirPainelDir();
  ativarAba('consulta');
  consultarFreguesia(feature.properties.dtmnfr);
}