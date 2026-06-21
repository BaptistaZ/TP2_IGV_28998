// Registo de camadas e controlo de visibilidade.
// Centraliza as camadas disponíveis no painel esquerdo.

let registoCamadas = [];

function registarCamadas() {
  registoCamadas = [
    { id: 'freguesias',    nome: 'Freguesias (limites)',      tipo: 'backend', visivel: true,  obter: async () => camadaFreguesias },
    { id: 'freguesiasWMS', nome: 'Etiquetas de freguesias',   tipo: 'wms',     visivel: false, obter: async () => criarWMS(CONFIG.LAYERS.freguesiasWMS) },
    { id: 'subseccoesWMS', nome: 'Densidade populacional',    tipo: 'wms',     visivel: false, obter: async () => criarWMS(CONFIG.LAYERS.subseccoesWMS) },
    { id: 'alojamento',    nome: 'Alojamento Local (pontos)', tipo: 'backend', visivel: false, obter: async () => await criarCamadaAL() },
    { id: 'dem',           nome: 'Relevo / DEM (raster)',     tipo: 'raster',  visivel: false, obter: async () => await criarCamadaDEM() },
  ];

  const cont = document.getElementById('lista-camadas');
  cont.innerHTML = '';

  // Cria os controlos visuais de cada camada no painel.
  registoCamadas.forEach((c) => {
    const id = `cam-${c.id}`;

    const linha = document.createElement('label');
    linha.className = 'camada' + (c.visivel ? ' on' : '');

    linha.innerHTML =
      `<span class="glifo">${GLIFOS_CAMADA[c.id] || ''}</span>` +
      `<span class="rotulo"><span class="nome">${c.nome}</span></span>` +
      `<span class="switch"><input type="checkbox" id="${id}" ${c.visivel ? 'checked' : ''}>` +
      `<span class="trilho"></span><span class="puxador"></span></span>`;

    const chk = linha.querySelector('input');

    chk.addEventListener('change', () => {
      linha.classList.toggle('on', chk.checked);
      alternarCamada(c, chk.checked);
    });

    cont.appendChild(linha);

    if (c.visivel) alternarCamada(c, true);
  });
}

async function alternarCamada(c, ligar) {
  try {
    if (ligar) {
      // Cria a camada apenas na primeira ativação.
      if (!c._layer) {
        marcarCarga(c, true);
        c._layer = await c.obter();
        marcarCarga(c, false);
      }

      if (c._layer && !map.hasLayer(c._layer)) {
        c._layer.addTo(map);

        if (c.tipo === 'backend' && c.id === 'freguesias') {
          c._layer.bringToFront();
        }
      }
    } else if (c._layer && map.hasLayer(c._layer)) {
      map.removeLayer(c._layer);
    }
  } catch (err) {
    marcarCarga(c, false);
    console.error('Falha ao alternar camada', c.id, err);

    const chk = document.getElementById(`cam-${c.id}`);

    if (chk) {
      chk.checked = false;
      chk.closest('.camada').classList.remove('on');
    }

    toast(`Não foi possível carregar “${c.nome}”.`, 'erro');
  }
}

function marcarCarga(c, ativo) {
  const chk = document.getElementById(`cam-${c.id}`);

  if (!chk) return;

  const glifo = chk.closest('.camada').querySelector('.glifo');

  if (!glifo) return;

  // Substitui temporariamente o ícone da camada por um indicador de carregamento.
  if (ativo) {
    glifo.dataset.html = glifo.innerHTML;
    glifo.innerHTML = '<span class="spin" style="width:12px;height:12px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;display:block;animation:rodar .7s linear infinite"></span>';
  } else if (glifo.dataset.html) {
    glifo.innerHTML = glifo.dataset.html;
    delete glifo.dataset.html;
  }
}

function criarWMS(nomeCamada) {
  const camada = L.tileLayer.wms(`${CONFIG.GEOSERVER}/wms`, {
    layers: nomeCamada,
    format: 'image/png',
    transparent: true,
    version: '1.1.0',
    tiled: true,
  });

  let carregouAlgumTile = false;
  let avisado = false;

  camada.on('tileload', () => {
    carregouAlgumTile = true;
  });

  // Mostra aviso apenas se a camada WMS não conseguir carregar qualquer tile.
  camada.on('tileerror', () => {
    setTimeout(() => {
      if (!carregouAlgumTile && !avisado) {
        avisado = true;
        toast(`Não foi possível carregar a camada WMS “${nomeCamada}”.`, 'erro', 6000);
      }
    }, 1200);
  });

  return camada;
}