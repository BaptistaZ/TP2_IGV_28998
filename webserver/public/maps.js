let map;                      
let drawnItems;               
let drawControl;              
let areaDesenhada = null;     

let camadaFreguesias = null;  
let freguesiaAtiva = null;    
let dtmnfrSelecionada = null; 

let demLayer = null;         
let freguesiaDemLayer = null; 
let elegivelLayer = null;     

let ultimoElegivelGeoJSON = null; 

let chartEtaria = null;       
let chartModalidade = null;   

const CORES_MODALIDADE = {
  'Estabelecimento de hospedagem': '#e3a857',
  'Apartamento': '#6ea8e6',
  'Moradia': '#5cc98a',
  'Quartos': '#c98ad6',
};
function corModalidade(m) {
  return CORES_MODALIDADE[m] || '#9fb2bf';
}

const COR = {
  gesso: '#eef4f8', bruma: '#9fb2bf', nevoa: '#647889',
  linha: '#21323f', latao: '#e3a857', ciano: '#58c4c4',
};

const ICO = {
  info:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
  ok:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>',
  erro:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></svg>',
  fechar:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  vazio: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9 12 4l9 5-9 5-9-5Z"/><path d="m3 14 9 5 9-5"/></svg>',
};

const GLIFOS_CAMADA = {
  freguesias:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z"/><path d="M9 3v15M15 6v15"/></svg>',
  freguesiasWMS: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V5h16v2M9 20h6M12 5v15"/></svg>',
  subseccoesWMS: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg>',
  alojamento:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>',
  dem:           '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m3 20 6-10 4 6 3-4 5 8z"/></svg>',
};

async function initApp() {
  criarMapa();
  criarDesenhoEMedicao();
  ligarAbas();
  ligarControlosCriterios();
  ligarBotoesAnalise();
  ligarChrome();
  ligarFerramentasMapa();   // medir área + perfil de elevação
  ligarProximidade();       // alojamentos mais próximos + buffer
  ligarComparar();          // comparador de freguesias
  ligarCoropleta();         // coropleta configurável

  await verificarLigacao();
  await carregarFreguesias();

  registarCamadas();
  renderBases();
  renderLegenda();

  map.on('click', onCliqueMapa);
}

const basesDef = [
  {
    id: 'positron',
    nome: 'Cartográfico (claro)',
    camada: L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap, &copy; CARTO',
    }),
  },
  {
    id: 'dark',
    nome: 'Cartográfico (escuro)',
    camada: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap, &copy; CARTO',
    }),
  },
  {
    id: 'osm',
    nome: 'OpenStreetMap',
    camada: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }),
  },
  {
    id: 'esri',
    nome: 'Satélite (Esri)',
    camada: L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 19, attribution: 'Tiles &copy; Esri' }
    ),
  },
];
let baseAtiva = basesDef[0];

function criarMapa() {
  map = L.map('mapa', {
    center: CONFIG.MAPA.centro,
    zoom: CONFIG.MAPA.zoom,
    minZoom: CONFIG.MAPA.zoomMin,
    maxZoom: CONFIG.MAPA.zoomMax,
    zoomControl: true,
  });
  baseAtiva.camada.addTo(map);
  L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map);

  map.on('mousemove', (e) => atualizarCoordenadas(e.latlng));
  map.on('zoomend moveend', atualizarEstadoMapa);
  atualizarEstadoMapa();
}

function renderBases() {
  const cont = document.getElementById('lista-bases');
  cont.innerHTML = '';
  basesDef.forEach((b) => {
    const linha = document.createElement('label');
    linha.className = 'base-opt';
    linha.innerHTML =
      `<input type="radio" name="base" ${b === baseAtiva ? 'checked' : ''}>` +
      `<span class="marca-radio"></span>` +
      `<span class="nome">${b.nome}</span>`;
    linha.querySelector('input').addEventListener('change', () => trocarBase(b));
    cont.appendChild(linha);
  });
}

function trocarBase(b) {
  if (b === baseAtiva) return;
  map.removeLayer(baseAtiva.camada);
  b.camada.addTo(map);
  b.camada.bringToBack(); // manter as bases por baixo dos overlays
  baseAtiva = b;
}

function criarDesenhoEMedicao() {
  drawnItems = new L.FeatureGroup();
  map.addLayer(drawnItems);

  drawControl = new L.Control.Draw({
    position: 'topleft',
    draw: {
      polygon: {
        allowIntersection: false,
        showArea: true,
        shapeOptions: { color: '#e3a857', weight: 2, fillColor: '#e3a857', fillOpacity: 0.08 },
        metric: true,
      },
      rectangle: { shapeOptions: { color: '#e3a857', weight: 2, fillColor: '#e3a857', fillOpacity: 0.08 } },
      polyline: {
        shapeOptions: { color: '#58c4c4', weight: 3 },
        metric: true,
      },
      circle: false,
      circlemarker: false,
      marker: false,
    },
    edit: { featureGroup: drawnItems, remove: true },
  });
  map.addControl(drawControl);

  map.on(L.Draw.Event.CREATED, (e) => {
    const layer = e.layer;
    if (tipoDesenho === 'medir') {     // veio do botão "medir área"
      aoCriarAreaMedida(layer);
      desligarMedicaoArea();
      return;
    }
    if (e.layerType === 'polygon' || e.layerType === 'rectangle') {
      limparAreasPoligono();         // so mantemos uma area de analise de cada vez
      drawnItems.addLayer(layer);
      areaDesenhada = layer.toGeoJSON().geometry;
      toast('Área desenhada. Já podes executar a análise.', 'ok');
    }
  });
}

let tipoDesenho = null; // 'analise' | 'medir' (qual o destino do próximo polígono)

function formatarDistancia(metros) {
  return metros >= 1000 ? `${(metros / 1000).toFixed(2)} km` : `${Math.round(metros)} m`;
}

function limparAreasPoligono() {
  const aRemover = [];
  drawnItems.eachLayer((l) => { if (l instanceof L.Polygon) aRemover.push(l); });
  aRemover.forEach((l) => drawnItems.removeLayer(l));
}

let desenhoAreaAtivo = null;
function iniciarDesenhoArea() {
  garantirPainelDir(); // o resultado aparece no painel direito
  if (medicaoAtiva) cancelarMedicao();
  if (perfilAtivo) cancelarPerfil();
  if (areaMedicaoAtiva) cancelarMedicaoArea();
  if (desenhoAreaAtivo) desenhoAreaAtivo.disable();
  tipoDesenho = 'analise';
  desenhoAreaAtivo = new L.Draw.Polygon(map, drawControl.options.draw.polygon);
  desenhoAreaAtivo.enable();
  toast('Clica no mapa para desenhar a área. Duplo clique termina, Esc cancela.', 'info', 5000);
}

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
  medLinha = L.polyline([], { color: '#58c4c4', weight: 3, opacity: 0.95 }).addTo(map);
  document.getElementById('btn-medir')?.classList.add('ativo');
  L.DomUtil.addClass(map.getContainer(), 'a-medir');
  map.doubleClickZoom.disable();
  map.on('click', adicionarPontoMedicao);
  map.on('mousemove', moverMedicao);
  map.on('dblclick', terminarMedicaoDblclick);
  toast('Clica para marcar pontos. Duplo clique, Esc ou o botão terminam.', 'info', 4500);
  estadoBarra('medição ativa');
}

function adicionarPontoMedicao(e) {
  medPontos.push(e.latlng);
  medLinha.setLatLngs(medPontos);
  L.circleMarker(e.latlng, { radius: 3.5, color: '#0b1620', weight: 1.5, fillColor: '#58c4c4', fillOpacity: 1 }).addTo(medMarcadores);
  atualizarTooltipMedicao(e.latlng);
}

function moverMedicao(e) {
  if (!medicaoAtiva || medPontos.length === 0) return;
  const ult = medPontos[medPontos.length - 1];
  if (medFantasma) medFantasma.setLatLngs([ult, e.latlng]);
  else medFantasma = L.polyline([ult, e.latlng], { color: '#58c4c4', weight: 1.5, opacity: 0.55, dashArray: '3,6' }).addTo(map);
  atualizarTooltipMedicao(e.latlng);
}

function comprimentoMedicao(extra) {
  let total = 0;
  for (let i = 1; i < medPontos.length; i++) total += medPontos[i - 1].distanceTo(medPontos[i]);
  if (extra && medPontos.length) total += medPontos[medPontos.length - 1].distanceTo(extra);
  return total;
}

function atualizarTooltipMedicao(pos) {
  const total = comprimentoMedicao(medicaoAtiva ? pos : null);
  if (!medTooltip) medTooltip = L.tooltip({ permanent: true, direction: 'right', className: 'tt-medicao', offset: [12, 0] });
  medTooltip.setLatLng(pos).setContent(formatarDistancia(total));
  if (!map.hasLayer(medTooltip)) medTooltip.addTo(map);
}

function terminarMedicaoDblclick(e) {
  if (e?.originalEvent) L.DomEvent.stop(e.originalEvent);
  terminarMedicao();
}

function terminarMedicao() {
  if (!medicaoAtiva) return;
  desligarMedicao();
  if (medFantasma) { map.removeLayer(medFantasma); medFantasma = null; }
  if (medPontos.length < 2) {
    limparMedicao();
    toast('Medição cancelada. São precisos pelo menos dois pontos.', 'info');
    estadoBarra('pronto');
    return;
  }
  const total = comprimentoMedicao(null);
  const ult = medPontos[medPontos.length - 1];
  if (medTooltip) { map.removeLayer(medTooltip); medTooltip = null; }
  const tt = L.tooltip({ permanent: true, direction: 'top', className: 'tt-medicao fixa', offset: [0, -6] })
    .setLatLng(ult).setContent(`Distância: ${formatarDistancia(total)}`);
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
  [medLinha, medFantasma, medMarcadores, medTooltip].forEach((l) => { if (l && map.hasLayer(l)) map.removeLayer(l); });
  if (medLinha?._ttTotal && map.hasLayer(medLinha._ttTotal)) map.removeLayer(medLinha._ttTotal);
  medLinha = medFantasma = medMarcadores = medTooltip = null;
  medPontos = [];
}

function limparArea() {
  limparAreasPoligono();
  areaDesenhada = null;
  if (elegivelLayer) { map.removeLayer(elegivelLayer); elegivelLayer = null; }
  ultimoElegivelGeoJSON = null;
  esconder('interseccao-resultado');
  esconder('criterios-resultado');
  toast('Área e resultados limpos.', 'info');
}

let registoCamadas = [];

function registarCamadas() {
  registoCamadas = [
    { id: 'freguesias',    nome: 'Freguesias (limites)',               tipo: 'backend', visivel: true,  obter: async () => camadaFreguesias },
    { id: 'freguesiasWMS', nome: 'Etiquetas de freguesias',            tipo: 'wms',     visivel: false, obter: async () => criarWMS(CONFIG.LAYERS.freguesiasWMS) },
    { id: 'subseccoesWMS', nome: 'Densidade populacional',             tipo: 'wms',     visivel: false, obter: async () => criarWMS(CONFIG.LAYERS.subseccoesWMS) },
    { id: 'alojamento',    nome: 'Alojamento Local (pontos)',          tipo: 'backend', visivel: false, obter: async () => await criarCamadaAL() },
    { id: 'dem',           nome: 'Relevo / DEM (raster)',              tipo: 'raster',  visivel: false, obter: async () => criarWMS(CONFIG.LAYERS.demWMS) },
  ];

  const cont = document.getElementById('lista-camadas');
  cont.innerHTML = '';
  registoCamadas.forEach((c) => {
    const id = `cam-${c.id}`;
    const tipoLabel = c.tipo === 'wms' ? 'WMS · GeoServer' : c.tipo === 'raster' ? 'Raster · GeoServer' : 'Vetorial · API';
    const linha = document.createElement('label');
    linha.className = 'camada' + (c.visivel ? ' on' : '');
    linha.innerHTML =
      `<span class="glifo">${GLIFOS_CAMADA[c.id] || ''}</span>` +
      `<span class="rotulo"><span class="nome">${c.nome}</span><span class="tipo">${tipoLabel}</span></span>` +
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
      if (!c._layer) {
        marcarCarga(c, true);
        c._layer = await c.obter();
        marcarCarga(c, false);
      }
      if (c._layer && !map.hasLayer(c._layer)) {
        c._layer.addTo(map);
        if (c.tipo === 'backend' && c.id === 'freguesias') c._layer.bringToFront();
      }
    } else if (c._layer && map.hasLayer(c._layer)) {
      map.removeLayer(c._layer);
    }
  } catch (err) {
    marcarCarga(c, false);
    console.error('Falha ao alternar camada', c.id, err);
    
    const chk = document.getElementById(`cam-${c.id}`);
    if (chk) { chk.checked = false; chk.closest('.camada').classList.remove('on'); }
    toast(`Não foi possível carregar “${c.nome}”.`, 'erro');
  }
}

function marcarCarga(c, ativo) {
  const chk = document.getElementById(`cam-${c.id}`);
  if (!chk) return;
  const glifo = chk.closest('.camada').querySelector('.glifo');
  if (!glifo) return;
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
    layers: nomeCamada, format: 'image/png', transparent: true, version: '1.1.0', tiled: true,
  });
  let avisado = false;
  camada.on('tileerror', () => {
    if (!avisado) {
      avisado = true;
      toast('GeoServer indisponível para esta camada WMS. Confirma que o serviço está a correr.', 'erro', 6000);
    }
  });
  return camada;
}

async function carregarFreguesias() {
  try {
    const geojson = await pedirJSON(`${CONFIG.API}/freguesias`);
    camadaFreguesias = L.geoJSON(geojson, {
      style: estiloFreguesia,
      onEachFeature: (feature, layer) => {
        layer.on('click', (e) => onCliqueFreguesia(e, feature, layer));
        layer.on('mouseover', () => { if (freguesiaAtiva?.layer !== layer) layer.setStyle(estiloFreguesiaHover()); });
        layer.on('mouseout',  () => { if (freguesiaAtiva?.layer !== layer) layer.setStyle(estiloRepousoFreguesia(layer)); });
      },
    });
    popularSelectFreguesias(geojson);
    const n = (geojson.features || []).length;
    marcarConta('painel-esq', `${n} freg.`);
  } catch (err) {
    console.error('Erro ao carregar freguesias', err);
    toast('Não foi possível carregar as freguesias a partir do backend.', 'erro');
  }
}

function estiloFreguesia()      { return { color: '#6ea8e6', weight: 1.1, fillColor: '#6ea8e6', fillOpacity: 0.05 }; }
function estiloFreguesiaHover() { return { color: '#9bc2f0', weight: 1.8, fillColor: '#6ea8e6', fillOpacity: 0.12 }; }
function estiloFreguesiaAtiva() { return { color: '#e3a857', weight: 2.6, fillColor: '#e3a857', fillOpacity: 0.14 }; }

// Estilo de repouso de uma freguesia: mantém a cor da coropleta se estiver ativa.
function estiloRepousoFreguesia(layer) {
  if (coropletaAtiva && coropletaQuebras && indicadoresCache) {
    const dt = layer?.feature?.properties?.dtmnfr;
    const reg = indicadoresCache.find((d) => d.dtmnfr === dt);
    if (reg) {
      const cor = corDaClasse(Number(reg[coropletaAtiva]), coropletaQuebras);
      return { color: '#1c3242', weight: 1, fillColor: cor, fillOpacity: 0.78 };
    }
  }
  return estiloFreguesia();
}

let listaFreguesias = [];

function popularSelectFreguesias(geojson) {
  const sel = document.getElementById('select-freguesia');
  const feats = (geojson.features || [])
    .map((f) => f.properties)
    .sort((a, b) => String(a.freguesia).localeCompare(String(b.freguesia), 'pt'));
  feats.forEach((p) => {
    const opt = document.createElement('option');
    opt.value = p.dtmnfr;
    opt.textContent = p.freguesia;
    sel.appendChild(opt);
  });

  listaFreguesias = feats.map((p) => ({ dtmnfr: p.dtmnfr, freguesia: p.freguesia }));
  const selCmp = document.getElementById('comparar-add');
  if (selCmp) {
    feats.forEach((p) => {
      const o = document.createElement('option');
      o.value = p.dtmnfr; o.textContent = p.freguesia;
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
  if (freguesiaAtiva?.layer) freguesiaAtiva.layer.setStyle(estiloRepousoFreguesia(freguesiaAtiva.layer));
  freguesiaAtiva = null;
  if (freguesiaDemLayer) { map.removeLayer(freguesiaDemLayer); freguesiaDemLayer = null; }
  esconder('consulta-resultado');
  const btnLimpar = document.getElementById('btn-limpar-freguesia');
  if (btnLimpar) btnLimpar.classList.add('oculto');
  estadoBarra('pronto');
}

function marcarFreguesiaEscolhida(ha) {
  const btnLimpar = document.getElementById('btn-limpar-freguesia');
  if (btnLimpar) btnLimpar.classList.toggle('oculto', !ha);
}

function onCliqueFreguesia(e, feature, layer) {
  if (medicaoAtiva) return; 
  L.DomEvent.stopPropagation(e); 
  if (freguesiaAtiva?.layer) freguesiaAtiva.layer.setStyle(estiloRepousoFreguesia(freguesiaAtiva.layer));
  layer.setStyle(estiloFreguesiaAtiva());
  freguesiaAtiva = { dtmnfr: feature.properties.dtmnfr, layer };

  const sel = document.getElementById('select-freguesia');
  sel.value = feature.properties.dtmnfr;
  dtmnfrSelecionada = feature.properties.dtmnfr;
  garantirPainelDir();
  ativarAba('consulta');
  consultarFreguesia(feature.properties.dtmnfr);
}

async function criarCamadaAL() {
  const geojson = await pedirJSON(`${CONFIG.API}/alojamento_local`);
  return L.geoJSON(geojson, {
    pointToLayer: (feature, latlng) =>
      L.circleMarker(latlng, {
        radius: 5, color: '#0b1620', weight: 1.5,
        fillColor: corModalidade(feature.properties.modalidade), fillOpacity: 0.95,
      }),
    onEachFeature: (feature, layer) => {
      const p = feature.properties;
      layer.bindPopup(
        `<div class="pop-titulo">${escaparHtml(p.denominacao || 'Alojamento Local')}</div>` +
        `<div class="pop-linha"><span class="k">Modalidade</span><span class="v">${escaparHtml(p.modalidade || '·')}</span></div>` +
        `<div class="pop-linha"><span class="k">Utentes</span><span class="v">${p.nr_utentes ?? '·'}</span></div>` +
        `<div class="pop-linha"><span class="k">Freguesia</span><span class="v">${escaparHtml(p.freguesia || '·')}</span></div>`
      );
    },
  });
}

async function criarCamadaDEM() {
  const resp = await fetch(CONFIG.DEM_TIF);
  if (!resp.ok) throw new Error('GeoTIFF do DEM indisponível');
  const buffer = await resp.arrayBuffer();
  const georaster = await parseGeoraster(buffer);

  const maximo = Math.round(georaster.maxs[0]) || 800;
  const rainbow = new Rainbow();
  rainbow.setNumberRange(1, Math.max(2, maximo));
  rainbow.setSpectrum('#2c6e49', '#88a93a', '#e3c14f', '#c97d3a', '#f4ede4'); 

  return new GeoRasterLayer({
    georaster, opacity: 0.78, resolution: 256,
    pixelValuesToColorFn: (vals) => {
      const v = vals[0];
      if (v === null || v === undefined || v <= -100 || v <= 0) return null;
      return '#' + rainbow.colourAt(Math.round(v));
    },
  });
}

let modoClique = 'info'; // 'info' | 'knn' | 'buffer'

async function onCliqueMapa(e) {
  if (medicaoAtiva || perfilAtivo) return; // medição e perfil usam o clique
  if (modoClique === 'knn')    { executarKnn(e.latlng); return; }
  if (modoClique === 'buffer') { executarBuffer(e.latlng); return; }
  try {
    const { lat, lng } = e.latlng;
    const aberto = L.popup({ className: 'pop-carga' })
      .setLatLng(e.latlng)
      .setContent('<div class="pop-titulo">A consultar ponto…</div>')
      .openOn(map);

    const info = await pedirJSON(`${CONFIG.API}/info?lat=${lat}&lng=${lng}`);
    const linhas = [`<div class="pop-titulo">Informação do ponto</div>`];
    const L_ = (k, v) => `<div class="pop-linha"><span class="k">${k}</span><span class="v">${v}</span></div>`;
    linhas.push(L_('Freguesia', escaparHtml(info.freguesia || '·')));
    if (info.subseccao) linhas.push(L_('Subsecção (BGRI)', escaparHtml(info.subseccao)));
    if (info.populacao_subseccao != null) linhas.push(L_('Pop. da subsecção', info.populacao_subseccao));
    linhas.push(L_('Cota do terreno', info.cota != null ? info.cota + ' m' : '·'));
    linhas.push(L_('Aloj. Local a 500 m', info.al_500m ?? 0));

    aberto.setContent(linhas.join(''));
  } catch (err) {
    console.error('Erro no clique-info', err);
    map.closePopup();
    toast('Não foi possível obter informação para este ponto.', 'erro');
  }
}

async function consultarFreguesia(dtmnfr) {
  try {
    estadoBarra('a consultar freguesia…');
    const dados = await pedirJSON(`${CONFIG.API}/freguesias/${dtmnfr}`);
    const { info, censos, dem } = dados;

    txt('consulta-nome', info.freguesia);
    txt('consulta-area', `${info.area_km2} km²`);

    txt('kpi-populacao', formatarNumero(censos.populacao));
    txt('kpi-edificios', formatarNumero(censos.edificios));
    txt('kpi-alojamentos', formatarNumero(censos.alojamentos));

    txt('kpi-cota-max', dem?.cota_max != null ? dem.cota_max + ' m' : '·');
    txt('kpi-cota-min', dem?.cota_min != null ? dem.cota_min + ' m' : '·');
    txt('kpi-cota-media', dem?.cota_media != null ? dem.cota_media + ' m' : '·');

    desenharGraficoEtaria(censos);
    mostrar('consulta-resultado', true);
    marcarFreguesiaEscolhida(true);
    estadoBarra('pronto');

    if (camadaFreguesias) {
      camadaFreguesias.eachLayer((l) => {
        if (l.feature?.properties?.dtmnfr === dtmnfr) {
          if (freguesiaAtiva?.layer && freguesiaAtiva.layer !== l) freguesiaAtiva.layer.setStyle(estiloRepousoFreguesia(freguesiaAtiva.layer));
          l.setStyle(estiloFreguesiaAtiva());
          freguesiaAtiva = { dtmnfr, layer: l };
          map.fitBounds(l.getBounds(), { padding: [30, 30] });
        }
      });
    }
  } catch (err) {
    console.error('Erro ao consultar freguesia', err);
    estadoBarra('erro na consulta');
    toast('Não foi possível obter os dados da freguesia.', 'erro');
  }
}

function desenharGraficoEtaria(c) {
  const ctx = document.getElementById('grafico-etaria');
  if (chartEtaria) chartEtaria.destroy();
  chartEtaria = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['0-14', '15-24', '25-64', '65+'],
      datasets: [{
        label: 'Indivíduos',
        data: [c.jovens_0_14, c.jovens_15_24, c.adultos_25_64, c.idosos_65].map(Number),
        backgroundColor: ['#6ea8e6', '#5cc98a', '#e3a857', '#e8746b'],
        borderRadius: 5,
        borderSkipped: false,
        maxBarThickness: 46,
      }],
    },
    options: temaGrafico({ legenda: false, eixoY: true }),
  });
}

async function verRelevoFreguesia() {
  if (!dtmnfrSelecionada) { toast('Escolhe primeiro uma freguesia.', 'info'); return; }
  const btn = document.getElementById('btn-ver-dem');
  try {
    carregarBotao(btn, true, 'A carregar relevo…');
    estadoBarra('a recortar DEM…');
    const resp = await fetch(`${CONFIG.API}/freguesias/${dtmnfrSelecionada}/dem.tif`);
    if (!resp.ok) {
      let detalhe = '';
      try { detalhe = (await resp.json()).detalhe || (await resp.json()).erro || ''; } catch (_) {}
      throw new Error(detalhe || `DEM indisponível (${resp.status})`);
    }
    const buffer = await resp.arrayBuffer();
    const georaster = await parseGeoraster(buffer);

    const maximo = Math.round(georaster.maxs[0]) || 800;
    const rainbow = new Rainbow();
    rainbow.setNumberRange(1, Math.max(2, maximo));
    rainbow.setSpectrum('#2c6e49', '#88a93a', '#e3c14f', '#c97d3a', '#f4ede4');

    if (freguesiaDemLayer) map.removeLayer(freguesiaDemLayer);
    freguesiaDemLayer = new GeoRasterLayer({
      georaster, opacity: 0.88, resolution: 256,
      pixelValuesToColorFn: (vals) => {
        const v = vals[0];
        if (v === null || v === undefined || v <= -100) return null;
        return '#' + rainbow.colourAt(Math.round(Math.max(1, v)));
      },
    });
    freguesiaDemLayer.addTo(map);
    if (freguesiaDemLayer.getBounds) map.fitBounds(freguesiaDemLayer.getBounds(), { padding: [30, 30] });
    estadoBarra('pronto');
    toast('Relevo da freguesia carregado no mapa.', 'ok');
  } catch (err) {
    console.error('Erro ao carregar DEM da freguesia', err);
    estadoBarra('erro no DEM');
    toast(`Não foi possível carregar o relevo: ${err.message}`, 'erro', 6000);
  } finally {
    carregarBotao(btn, false);
  }
}

async function executarInterseccao() {
  if (!areaDesenhada) { toast('Desenha primeiro uma área no mapa.', 'info'); return; }
  try {
    estadoBarra('a calcular interseção…');
    const r = await postJSON(`${CONFIG.API}/analise/area`, { geometry: areaDesenhada });

    txt('ia-area', r.area_km2 != null ? Number(r.area_km2).toFixed(2) : '·');
    txt('ia-populacao', formatarNumero(r.populacao_estimada));
    txt('ia-al', formatarNumero(r.n_alojamentos));
    txt('ia-cota-max', r.cota_max != null ? r.cota_max + ' m' : '·');
    txt('ia-cota-min', r.cota_min != null ? r.cota_min + ' m' : '·');
    txt('ia-cota-media', r.cota_media != null ? r.cota_media + ' m' : '·');
    txt('ia-freguesias', (r.freguesias && r.freguesias.length) ? r.freguesias.join(', ') : '·');

    desenharGraficoModalidade(r.alojamentos_por_modalidade || []);
    mostrar('interseccao-resultado', true);
    estadoBarra('pronto');
  } catch (err) {
    console.error('Erro na analise de area', err);
    estadoBarra('erro na interseção');
    toast('Falha ao calcular as estatísticas da área (requer PostGIS).', 'erro');
  }
}

function desenharGraficoModalidade(lista) {
  const ctx = document.getElementById('grafico-modalidade');
  if (chartModalidade) chartModalidade.destroy();
  let labels = lista.map((x) => x.modalidade || '·');
  let valores = lista.map((x) => Number(x.n));
  let cores = labels.map((m) => corModalidade(m));
  if (labels.length === 0) { labels = ['Sem alojamento local']; valores = [1]; cores = ['#2c4153']; }

  chartModalidade = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data: valores, backgroundColor: cores, borderColor: '#0b1620', borderWidth: 2, hoverOffset: 6 }] },
    options: {
      responsive: true,
      cutout: '62%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: COR.bruma, font: { family: 'Inter', size: 11 }, boxWidth: 12, padding: 12, usePointStyle: true },
        },
        tooltip: tooltipTema(),
      },
    },
  });
}

function ligarControlosCriterios() {
  const rngCota = document.getElementById('rng-cota');
  const lblCota = document.getElementById('lbl-cota');
  rngCota.addEventListener('input', () => (lblCota.textContent = rngCota.value));

  const rngDist = document.getElementById('rng-dist');
  const lblDist = document.getElementById('lbl-dist');
  rngDist.addEventListener('input', () => (lblDist.textContent = rngDist.value));

  const rngDeclive = document.getElementById('rng-declive');
  const lblDeclive = document.getElementById('lbl-declive');
  if (rngDeclive) rngDeclive.addEventListener('input', () => (lblDeclive.textContent = rngDeclive.value));
}

async function executarElegibilidade() {
  if (!areaDesenhada) { toast('Desenha primeiro uma área no mapa.', 'info'); return; }
  const cotaMin = parseFloat(document.getElementById('rng-cota').value);
  const distAl = parseFloat(document.getElementById('rng-dist').value);
  const usarAl = document.getElementById('chk-al').checked;
  const decliveMax = parseFloat(document.getElementById('rng-declive').value);
  const usarDeclive = document.getElementById('chk-declive').checked;
  const btn = document.getElementById('btn-executar-eleg');

  try {
    carregarBotao(btn, true, 'A analisar…');
    estadoBarra('a executar elegibilidade…');
    const r = await postJSON(`${CONFIG.API}/analise/elegivel`, {
      geometry: areaDesenhada, cota_min: cotaMin, dist_al: distAl, usar_al: usarAl,
      declive_max: decliveMax, usar_declive: usarDeclive,
    });

    txt('ce-area', r.area_km2_elegivel != null ? Number(r.area_km2_elegivel).toFixed(3) : '0');

    if (elegivelLayer) { map.removeLayer(elegivelLayer); elegivelLayer = null; }
    ultimoElegivelGeoJSON = r.geojson || null;

    if (r.geojson) {
      elegivelLayer = L.geoJSON(r.geojson, {
        style: { color: '#5cc98a', weight: 1.4, fillColor: '#5cc98a', fillOpacity: 0.45 },
      }).addTo(map);
      if (elegivelLayer.getBounds && elegivelLayer.getBounds().isValid()) {
        map.fitBounds(elegivelLayer.getBounds(), { padding: [30, 30] });
      }
    }
    mostrar('criterios-resultado', true);
    estadoBarra('pronto');

    if (!r.geojson || Number(r.area_km2_elegivel) === 0) {
      toast('Nenhuma zona cumpre os critérios na área desenhada.', 'info');
    } else {
      toast(`Área elegível: ${Number(r.area_km2_elegivel).toFixed(3)} km².`, 'ok');
    }
  } catch (err) {
    console.error('Erro na analise de elegibilidade', err);
    estadoBarra('erro na elegibilidade');
    toast('Falha na análise de elegibilidade (requer PostGIS com raster).', 'erro');
  } finally {
    carregarBotao(btn, false);
  }
}

function exportarElegivel() {
  if (!ultimoElegivelGeoJSON) { toast('Não há resultado para exportar.', 'info'); return; }
  const blob = new Blob([JSON.stringify(ultimoElegivelGeoJSON, null, 2)], { type: 'application/geo+json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'area_elegivel.geojson';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('GeoJSON exportado.', 'ok');
}

// =====================================================================
// FERRAMENTAS DE MAPA: medir area e perfil de elevacao
// =====================================================================

function ligarFerramentasMapa() {
  document.getElementById('btn-medir-area').addEventListener('click', () => {
    if (areaMedicaoAtiva) { cancelarMedicaoArea(); return; }
    if (camadaAreaMedida) { limparMedicaoArea(); estadoBarra('pronto'); return; }
    iniciarMedicaoArea();
  });
  document.getElementById('btn-perfil').addEventListener('click', () => {
    if (perfilAtivo) { cancelarPerfil(); return; }
    iniciarPerfil();
  });
}

// ---- Medir area (poligono, area geodesica) ----
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
    allowIntersection: false, showArea: true,
    shapeOptions: { color: '#58c4c4', weight: 2, fillColor: '#58c4c4', fillOpacity: 0.12 },
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
  const area = areaGeodesica(latlngs); // m2
  const perimetro = perimetroLatLngs(latlngs);
  const txtArea = area >= 1e6 ? `${(area / 1e6).toFixed(3)} km²` : `${Math.round(area).toLocaleString('pt-PT')} m²`;
  const ha = area / 1e4;
  layer.bindTooltip(
    `<b>Área:</b> ${txtArea}<br><b>${ha.toFixed(2)} ha</b><br><b>Perímetro:</b> ${formatarDistancia(perimetro)}`,
    { permanent: true, direction: 'center', className: 'tt-medicao fixa' }
  ).openTooltip();
  toast(`Área medida: ${txtArea}. Carrega no botão para limpar.`, 'ok', 5000);
}

function perimetroLatLngs(latlngs) {
  let p = 0;
  for (let i = 0; i < latlngs.length; i++) p += latlngs[i].distanceTo(latlngs[(i + 1) % latlngs.length]);
  return p;
}

// Área geodésica em m². Usa o leaflet-draw quando disponível; senão, fórmula esférica.
function areaGeodesica(latlngs) {
  if (window.L && L.GeometryUtil && typeof L.GeometryUtil.geodesicArea === 'function') {
    return Math.abs(L.GeometryUtil.geodesicArea(latlngs));
  }
  const R = 6378137, rad = (d) => (d * Math.PI) / 180, n = latlngs.length;
  if (n < 3) return 0;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const p1 = latlngs[i], p2 = latlngs[(i + 1) % n];
    area += rad(p2.lng - p1.lng) * (2 + Math.sin(rad(p1.lat)) + Math.sin(rad(p2.lat)));
  }
  return Math.abs((area * R * R) / 2);
}

function desligarMedicaoArea() {
  areaMedicaoAtiva = false;
  document.getElementById('btn-medir-area').classList.remove('ativo');
  if (areaMedHandler) { areaMedHandler.disable(); areaMedHandler = null; }
  estadoBarra('pronto');
}

function cancelarMedicaoArea() { desligarMedicaoArea(); limparMedicaoArea(); }
function limparMedicaoArea() { if (camadaAreaMedida) { map.removeLayer(camadaAreaMedida); camadaAreaMedida = null; } }

// ---- Perfil de elevacao ----
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
  perfilLinha = L.polyline([], { color: '#e3a857', weight: 3, opacity: 0.95 }).addTo(map);
  document.getElementById('btn-perfil').classList.add('ativo');
  L.DomUtil.addClass(map.getContainer(), 'a-medir');
  map.doubleClickZoom.disable();
  map.on('click', perfilAddPonto);
  map.on('mousemove', perfilMove);
  map.on('dblclick', perfilTerminarDbl);
  estadoBarra('perfil: a desenhar linha');
  toast('Clica para traçar a linha. Duplo clique termina, Esc cancela.', 'info', 4800);
}

function perfilAddPonto(e) {
  perfilPontos.push(e.latlng);
  perfilLinha.setLatLngs(perfilPontos);
  L.circleMarker(e.latlng, { radius: 3, color: '#0b1620', weight: 1.4, fillColor: '#e3a857', fillOpacity: 1 }).addTo(perfilMarcadores);
}

function perfilMove(e) {
  if (!perfilAtivo || perfilPontos.length === 0) return;
  const ult = perfilPontos[perfilPontos.length - 1];
  if (perfilFantasma) perfilFantasma.setLatLngs([ult, e.latlng]);
  else perfilFantasma = L.polyline([ult, e.latlng], { color: '#e3a857', weight: 1.5, opacity: 0.5, dashArray: '3,6' }).addTo(map);
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
  if (perfilFantasma) { map.removeLayer(perfilFantasma); perfilFantasma = null; }
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
  const geometry = { type: 'LineString', coordinates: perfilPontos.map((p) => [p.lng, p.lat]) };
  try {
    estadoBarra('a amostrar o relevo…');
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
  [perfilLinha, perfilFantasma, perfilMarcadores].forEach((l) => { if (l && map.hasLayer(l)) map.removeLayer(l); });
  perfilLinha = perfilFantasma = perfilMarcadores = null;
  perfilPontos = [];
}

function mostrarPerfil(r) {
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
  if (chartPerfil) chartPerfil.destroy();
  chartPerfil = new Chart(ctx, {
    type: 'line',
    data: {
      labels: r.pontos.map((p) => Math.round(p.dist)),
      datasets: [{
        label: 'Cota (m)', data: r.pontos.map((p) => p.cota),
        borderColor: '#e3a857', backgroundColor: 'rgba(227,168,87,.18)',
        fill: true, tension: 0.25, pointRadius: 0, borderWidth: 2, spanGaps: true,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: tooltipTema() },
      scales: {
        x: { title: { display: true, text: 'distância (m)', color: COR.nevoa, font: { size: 10 } },
             grid: { color: COR.linha }, ticks: { color: COR.bruma, maxTicksLimit: 7, font: { family: 'JetBrains Mono', size: 10 } } },
        y: { title: { display: true, text: 'cota (m)', color: COR.nevoa, font: { size: 10 } },
             grid: { color: COR.linha }, ticks: { color: COR.bruma, font: { family: 'JetBrains Mono', size: 10 } } },
      },
    },
  });
}

function fecharPerfil() {
  if (perfilDlg) perfilDlg.classList.add('oculto');
  limparPerfil();
}

// =====================================================================
// PROXIMIDADE: alojamentos mais proximos (KNN) e area de influencia
// =====================================================================

let knnCamada = null;
let bufferCamada = null;

function ligarProximidade() {
  document.getElementById('rng-knn').addEventListener('input', (e) => txt('lbl-knn', e.target.value));
  document.getElementById('rng-raio').addEventListener('input', (e) => txt('lbl-raio', e.target.value));
  document.getElementById('btn-knn').addEventListener('click', () => activarModoClique(modoClique === 'knn' ? 'info' : 'knn'));
  document.getElementById('btn-buffer').addEventListener('click', () => activarModoClique(modoClique === 'buffer' ? 'info' : 'buffer'));
}

function activarModoClique(novo) {
  modoClique = novo;
  document.getElementById('btn-knn').classList.toggle('ativo', novo === 'knn');
  document.getElementById('btn-buffer').classList.toggle('ativo', novo === 'buffer');
  if (novo === 'info') {
    L.DomUtil.removeClass(map.getContainer(), 'a-clicar');
    estadoBarra('pronto');
  } else {
    if (medicaoAtiva) cancelarMedicao();
    if (perfilAtivo) cancelarPerfil();
    if (areaMedicaoAtiva) cancelarMedicaoArea();
    L.DomUtil.addClass(map.getContainer(), 'a-clicar');
    estadoBarra(novo === 'knn' ? 'clica para encontrar os mais próximos' : 'clica para definir o centro do raio');
    toast('Clica num ponto do mapa.', 'info', 3000);
  }
}

async function executarKnn(latlng) {
  const n = parseInt(document.getElementById('rng-knn').value, 10);
  try {
    estadoBarra('a procurar mais próximos…');
    const lista = await pedirJSON(`${CONFIG.API}/al/mais-proximos?lat=${latlng.lat}&lng=${latlng.lng}&n=${n}`);
    if (knnCamada) map.removeLayer(knnCamada);
    knnCamada = L.featureGroup().addTo(map);
    L.circleMarker(latlng, { radius: 6, color: '#0b1620', weight: 2, fillColor: '#e3a857', fillOpacity: 1 }).addTo(knnCamada);
    lista.forEach((al, i) => {
      const pt = L.latLng(al.lat, al.lon);
      L.polyline([latlng, pt], { color: '#58c4c4', weight: 1.4, opacity: 0.7, dashArray: '4,5' }).addTo(knnCamada);
      L.circleMarker(pt, { radius: 5, color: '#0b1620', weight: 1.5, fillColor: corModalidade(al.modalidade), fillOpacity: 0.95 })
        .bindTooltip(`${i + 1}. ${escaparHtml(al.denominacao || 'AL')} · ${formatarDistancia(al.dist_m)}`, { direction: 'top' })
        .addTo(knnCamada);
    });
    if (knnCamada.getBounds().isValid()) map.fitBounds(knnCamada.getBounds(), { padding: [40, 40] });
    document.getElementById('knn-lista').innerHTML = lista.length ? lista.map((al, i) =>
      `<div class="prox-item"><span class="n">${i + 1}</span>` +
      `<span class="d"><span class="nm">${escaparHtml(al.denominacao || 'Alojamento Local')}</span>` +
      `<span class="sb">${escaparHtml(al.freguesia || '')}</span></span>` +
      `<span class="m mono">${formatarDistancia(al.dist_m)}</span></div>`
    ).join('') : '<div class="prox-vazio">Sem alojamentos.</div>';
    mostrar('knn-resultado', true);
    garantirPainelDir(); ativarAba('proximidade');
    estadoBarra('pronto');
  } catch (err) {
    console.error('Erro no KNN', err);
    estadoBarra('erro na procura');
    toast(`Não foi possível encontrar os mais próximos: ${err.message}`, 'erro', 6000);
  }
}

async function executarBuffer(latlng) {
  const raio = parseInt(document.getElementById('rng-raio').value, 10);
  try {
    estadoBarra('a calcular área de influência…');
    const r = await pedirJSON(`${CONFIG.API}/al/proximos?lat=${latlng.lat}&lng=${latlng.lng}&raio=${raio}`);
    if (bufferCamada) map.removeLayer(bufferCamada);
    bufferCamada = L.featureGroup().addTo(map);
    L.circle(latlng, { radius: raio, color: '#e3a857', weight: 1.6, fillColor: '#e3a857', fillOpacity: 0.08 }).addTo(bufferCamada);
    L.circleMarker(latlng, { radius: 5, color: '#0b1620', weight: 2, fillColor: '#e3a857', fillOpacity: 1 }).addTo(bufferCamada);
    const feats = (r.geojson && r.geojson.features) || [];
    feats.forEach((f) => {
      const c = f.geometry.coordinates;
      L.circleMarker([c[1], c[0]], { radius: 4.5, color: '#0b1620', weight: 1.4, fillColor: corModalidade(f.properties.modalidade), fillOpacity: 0.95 })
        .bindTooltip(`${escaparHtml(f.properties.denominacao || 'AL')} · ${f.properties.dist_m} m`, { direction: 'top' })
        .addTo(bufferCamada);
    });
    if (bufferCamada.getBounds().isValid()) map.fitBounds(bufferCamada.getBounds(), { padding: [30, 30] });
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
    garantirPainelDir(); ativarAba('proximidade');
    estadoBarra('pronto');
  } catch (err) {
    console.error('Erro no buffer', err);
    estadoBarra('erro na área de influência');
    toast(`Não foi possível calcular a área de influência: ${err.message}`, 'erro', 6000);
  }
}

// =====================================================================
// DECLIVE de uma freguesia (derivado do DEM)
// =====================================================================

async function verDecliveFreguesia() {
  if (!dtmnfrSelecionada) { toast('Escolhe primeiro uma freguesia.', 'info'); return; }
  const btn = document.getElementById('btn-ver-declive');
  try {
    carregarBotao(btn, true, 'A calcular declive…');
    estadoBarra('a calcular declive…');
    pedirJSON(`${CONFIG.API}/freguesias/${dtmnfrSelecionada}/declive`)
      .then((s) => {
        txt('kpi-declive-max', s.declive_max != null ? s.declive_max + '°' : '·');
        txt('kpi-declive-media', s.declive_media != null ? s.declive_media + '°' : '·');
        mostrar('declive-stats', true);
      }).catch(() => {});

    const resp = await fetch(`${CONFIG.API}/freguesias/${dtmnfrSelecionada}/declive.tif`);
    if (!resp.ok) {
      let detalhe = '';
      try { detalhe = (await resp.json()).detalhe || (await resp.json()).erro || ''; } catch (_) {}
      throw new Error(detalhe || `Declive indisponível (${resp.status})`);
    }
    const buffer = await resp.arrayBuffer();
    const georaster = await parseGeoraster(buffer);
    const rainbow = new Rainbow();
    rainbow.setNumberRange(0, 45);
    rainbow.setSpectrum('#1a9850', '#a6d96a', '#fee08b', '#f46d43', '#a50026');

    if (freguesiaDemLayer) { map.removeLayer(freguesiaDemLayer); freguesiaDemLayer = null; }
    freguesiaDemLayer = new GeoRasterLayer({
      georaster, opacity: 0.85, resolution: 256,
      pixelValuesToColorFn: (vals) => {
        const v = vals[0];
        if (v === null || v === undefined || v < 0) return null;
        return '#' + rainbow.colourAt(Math.min(45, Math.round(v)));
      },
    });
    freguesiaDemLayer.addTo(map);
    if (freguesiaDemLayer.getBounds) map.fitBounds(freguesiaDemLayer.getBounds(), { padding: [30, 30] });
    estadoBarra('pronto');
    toast('Declive carregado (verde = plano, vermelho = íngreme).', 'ok', 5000);
  } catch (err) {
    console.error('Erro ao carregar declive', err);
    estadoBarra('erro no declive');
    toast(`Não foi possível carregar o declive: ${err.message}`, 'erro', 6000);
  } finally {
    carregarBotao(btn, false);
  }
}

// =====================================================================
// COROPLETA configuravel das freguesias
// =====================================================================

let indicadoresCache = null;
let coropletaAtiva = null;
let coropletaQuebras = null;

const COROPLETA_INFO = {
  populacao:   { titulo: 'População',                     sufixo: '' },
  densidade:   { titulo: 'Densidade (hab/km²)',           sufixo: '' },
  idosos_pct:  { titulo: 'Índice de envelhecimento (%)',  sufixo: '%' },
  edificios:   { titulo: 'Edifícios',                     sufixo: '' },
  alojamentos: { titulo: 'Alojamentos familiares',        sufixo: '' },
};
const COROPLETA_CORES = ['#f1eef6', '#bdc9e1', '#74a9cf', '#2b8cbe', '#045a8d'];

function ligarCoropleta() {
  const sel = document.getElementById('select-coropleta');
  if (sel) sel.addEventListener('change', () => aplicarCoropleta(sel.value));
}

async function aplicarCoropleta(variavel) {
  if (!variavel) { limparCoropleta(); return; }
  try {
    if (!indicadoresCache) {
      estadoBarra('a carregar indicadores…');
      indicadoresCache = await pedirJSON(`${CONFIG.API}/indicadores`);
      estadoBarra('pronto');
    }
    coropletaAtiva = variavel;
    const valores = indicadoresCache.map((d) => Number(d[variavel])).filter((v) => Number.isFinite(v));
    const quebras = quantis(valores, 5);
    coropletaQuebras = quebras;
    const porDtmnfr = {};
    indicadoresCache.forEach((d) => { porDtmnfr[d.dtmnfr] = Number(d[variavel]); });
    if (camadaFreguesias) {
      camadaFreguesias.eachLayer((l) => {
        if (freguesiaAtiva?.layer === l) return;
        const cor = corDaClasse(porDtmnfr[l.feature?.properties?.dtmnfr], quebras);
        l.setStyle({ color: '#1c3242', weight: 1, fillColor: cor, fillOpacity: 0.78 });
      });
      camadaFreguesias.bringToFront();
    }
    renderCoropletaLegenda(variavel, quebras);
  } catch (err) {
    console.error('Erro na coropleta', err);
    toast(`Não foi possível aplicar a coropleta: ${err.message}`, 'erro');
  }
}

function limparCoropleta() {
  coropletaAtiva = null;
  coropletaQuebras = null;
  if (camadaFreguesias) camadaFreguesias.eachLayer((l) => { if (freguesiaAtiva?.layer !== l) l.setStyle(estiloFreguesia()); });
  const leg = document.getElementById('coropleta-legenda');
  if (leg) { leg.classList.add('oculto'); leg.innerHTML = ''; }
}

function quantis(valores, n) {
  const ord = [...valores].sort((a, b) => a - b);
  if (ord.length === 0) return [0, 0, 0, 0];
  const q = [];
  for (let i = 1; i < n; i++) {
    const pos = (ord.length - 1) * (i / n);
    const base = Math.floor(pos);
    const resto = pos - base;
    q.push(ord[base] + (ord[Math.min(base + 1, ord.length - 1)] - ord[base]) * resto);
  }
  return q;
}

function corDaClasse(v, quebras) {
  if (!Number.isFinite(v)) return '#26323b';
  let i = 0;
  while (i < quebras.length && v > quebras[i]) i++;
  return COROPLETA_CORES[Math.min(i, COROPLETA_CORES.length - 1)];
}

function renderCoropletaLegenda(variavel, quebras) {
  const cont = document.getElementById('coropleta-legenda');
  if (!cont) return;
  const info = COROPLETA_INFO[variavel] || { titulo: variavel, sufixo: '' };
  const fmt = (x) => Math.round(x).toLocaleString('pt-PT');
  let linhas = '';
  for (let i = 0; i < COROPLETA_CORES.length; i++) {
    let intervalo;
    if (i === 0) intervalo = `&lt; ${fmt(quebras[0])}${info.sufixo}`;
    else if (i === COROPLETA_CORES.length - 1) intervalo = `&ge; ${fmt(quebras[quebras.length - 1])}${info.sufixo}`;
    else intervalo = `${fmt(quebras[i - 1])} – ${fmt(quebras[i])}${info.sufixo}`;
    linhas += `<div class="cl-item"><span class="cl-cor" style="background:${COROPLETA_CORES[i]}"></span>${intervalo}</div>`;
  }
  cont.innerHTML = `<div class="cl-titulo">${escaparHtml(info.titulo)}</div>${linhas}`;
  cont.classList.remove('oculto');
}

// =====================================================================
// COMPARADOR de freguesias
// =====================================================================

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
  populacao: 'População', densidade: 'Densidade (hab/km²)',
  alojamentos: 'Aloj. familiares', edificios: 'Edifícios', area_km2: 'Área (km²)',
};

function ligarComparar() {
  const add = document.getElementById('comparar-add');
  add.addEventListener('change', () => {
    const dt = add.value; add.value = '';
    if (!dt || comparaSel.includes(dt)) return;
    if (comparaSel.length >= 4) { toast('Máximo de quatro freguesias.', 'info'); return; }
    comparaSel.push(dt);
    renderChips();
  });
  document.getElementById('btn-comparar').addEventListener('click', executarComparar);
  document.getElementById('comparar-metrica').addEventListener('change', () => { if (dadosComparar.length) desenharGraficoComparar(); });
}

function nomeFreguesia(dt) {
  const f = listaFreguesias.find((x) => x.dtmnfr === dt);
  return f ? f.freguesia : dt;
}

function renderChips() {
  const cont = document.getElementById('comparar-chips');
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
  if (comparaSel.length < 2) { toast('Escolhe pelo menos duas freguesias.', 'info'); return; }
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
  const thead = '<tr><th>Indicador</th>' + dadosComparar.map((d) => `<th>${escaparHtml(d.freguesia)}</th>`).join('') + '</tr>';
  const linhas = LINHAS_COMP.map(([rotulo, chave]) => {
    const cels = dadosComparar.map((d) => `<td class="mono">${formatarNumero(d[chave])}</td>`).join('');
    return `<tr><td class="ind">${rotulo}</td>${cels}</tr>`;
  }).join('');
  tab.innerHTML = `<thead>${thead}</thead><tbody>${linhas}</tbody>`;
}

function desenharGraficoComparar() {
  const metrica = document.getElementById('comparar-metrica').value;
  const ctx = document.getElementById('grafico-comparar');
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
        borderRadius: 5, borderSkipped: false, maxBarThickness: 60,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: tooltipTema() },
      scales: {
        x: { grid: { display: false }, ticks: { color: COR.bruma, font: { size: 10 } } },
        y: { beginAtZero: true, grid: { color: COR.linha }, ticks: { color: COR.nevoa, font: { family: 'JetBrains Mono', size: 10 } } },
      },
    },
  });
}


function ligarAbas() {
  document.querySelectorAll('.aba').forEach((btn) => {
    btn.addEventListener('click', () => ativarAba(btn.dataset.aba));
  });
}

function ativarAba(nome) {
  document.querySelectorAll('.aba').forEach((b) => {
    const on = b.dataset.aba === nome;
    b.classList.toggle('ativa', on);
    b.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  document.querySelectorAll('.conteudo-aba').forEach((s) =>
    s.classList.toggle('ativa', s.id === `aba-${nome}`)
  );
}

function ligarBotoesAnalise() {
  document.getElementById('btn-ver-dem').addEventListener('click', verRelevoFreguesia);
  document.getElementById('btn-ver-declive').addEventListener('click', verDecliveFreguesia);

  document.getElementById('btn-desenhar-area').addEventListener('click', iniciarDesenhoArea);
  document.getElementById('btn-limpar-area').addEventListener('click', limparArea);

  document.getElementById('btn-desenhar-area2').addEventListener('click', iniciarDesenhoArea);
  document.getElementById('btn-limpar-area2').addEventListener('click', limparArea);

  document.getElementById('btn-executar-eleg').addEventListener('click', executarElegibilidade);
  document.getElementById('btn-exportar').addEventListener('click', exportarElegivel);

  map.on(L.Draw.Event.CREATED, () => {
    const eraMedir = (tipoDesenho === 'medir');
    desenhoAreaAtivo = null;
    tipoDesenho = null;
    if (eraMedir) return; // a medição de área já foi tratada no outro handler
    const ativa = document.querySelector('.aba.ativa');
    if (ativa?.dataset.aba === 'interseccao') executarInterseccao();
  });
  map.on('draw:drawstop', () => { desenhoAreaAtivo = null; });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (medicaoAtiva)         { cancelarMedicao(); toast('Medição cancelada.', 'info'); return; }
    if (perfilAtivo)          { cancelarPerfil(); toast('Perfil cancelado.', 'info'); return; }
    if (areaMedicaoAtiva)     { cancelarMedicaoArea(); toast('Medição de área cancelada.', 'info'); return; }
    if (modoClique !== 'info') { activarModoClique('info'); toast('Ferramenta desativada.', 'info'); return; }
    if (desenhoAreaAtivo) {
      desenhoAreaAtivo.disable();
      desenhoAreaAtivo = null;
      tipoDesenho = null;
      toast('Desenho cancelado.', 'info');
    }
  });
}

function ligarChrome() {
  const app = document.getElementById('app');

  ligarToggle('btn-esq', () => {
    const fechado = app.classList.toggle('sem-esq');
    document.getElementById('btn-esq').classList.toggle('ativo', !fechado);
    apos(() => map.invalidateSize());
  });
  ligarToggle('btn-dir', () => {
    const fechado = app.classList.toggle('sem-dir');
    document.getElementById('btn-dir').classList.toggle('ativo', !fechado);
    apos(() => map.invalidateSize());
  });

  document.getElementById('btn-medir').addEventListener('click', () => {
    if (medicaoAtiva) { terminarMedicao(); return; }
    if (medLinha) { limparMedicao(); estadoBarra('pronto'); return; } // limpa a medição anterior
    iniciarMedicao();
  });

  document.getElementById('btn-cheio').addEventListener('click', alternarEcraInteiro);
  document.addEventListener('fullscreenchange', () => {
    document.getElementById('btn-cheio').classList.toggle('ativo', !!document.fullscreenElement);
    apos(() => map.invalidateSize());
  });
}

function ligarToggle(id, fn) {
  const el = document.getElementById(id);
  if (el) el.addEventListener('click', fn);
}

function garantirPainelDir() {
  const app = document.getElementById('app');
  if (app.classList.contains('sem-dir')) {
    app.classList.remove('sem-dir');
    document.getElementById('btn-dir').classList.add('ativo');
    apos(() => map.invalidateSize());
  }
}

function alternarEcraInteiro() {
  const alvo = document.getElementById('mapa');
  if (!document.fullscreenElement) {
    (alvo.requestFullscreen || alvo.webkitRequestFullscreen)?.call(alvo);
  } else {
    document.exitFullscreen?.();
  }
}

function atualizarCoordenadas(latlng) {
  txt('be-lat', latlng.lat.toFixed(5));
  txt('be-lng', latlng.lng.toFixed(5));
}

function atualizarEstadoMapa() {
  if (!map) return;
  txt('be-zoom', map.getZoom().toFixed(0));
  txt('be-escala', `1:${formatarNumero(Math.round(escalaAproximada()))}`);
}

function escalaAproximada() {
  const centro = map.getCenter();
  const metrosPorPixel = (40075016.686 * Math.abs(Math.cos(centro.lat * Math.PI / 180))) / Math.pow(2, map.getZoom() + 8);
  return metrosPorPixel * 96 * 39.3701; // ~96 dpi
}

function estadoBarra(texto) { txt('be-msg', texto); }

function renderLegenda() {
  const cont = document.getElementById('legenda');
  cont.innerHTML = `
    <div class="leg-grupo">Limites</div>
    <div class="leg-item"><span class="leg-linha" style="border-color:#6ea8e6"></span> Freguesias</div>
    <div class="leg-item"><span class="leg-linha" style="border-color:#e3a857"></span> Freguesia selecionada</div>

    <div class="leg-grupo">Densidade populacional (WMS)</div>
    <div class="leg-item"><span class="leg-cor" style="background:#fee5d9"></span> &lt; 50 hab.</div>
    <div class="leg-item"><span class="leg-cor" style="background:#fb6a4a"></span> 150 – 300 hab.</div>
    <div class="leg-item"><span class="leg-cor" style="background:#a50f15"></span> &ge; 600 hab.</div>

    <div class="leg-grupo">Alojamento Local</div>
    ${Object.entries(CORES_MODALIDADE)
      .map(([m, c]) => `<div class="leg-item"><span class="leg-ponto" style="background:${c};color:${c}"></span> ${m}</div>`)
      .join('')}

    <div class="leg-grupo">Relevo / DEM (altitude)</div>
    <div class="leg-gradiente" style="background:linear-gradient(90deg,#f7fcf0,#bae4bc,#7bccc4,#43a2ca,#0868ac,#084081)"></div>
    <div class="leg-escala"><span>0 m</span><span>850 m</span></div>

    <div class="leg-fonte">Fonte: PostGIS + GeoServer (SLD)<br>Projeção de dados: EPSG&#58;3763</div>
  `;
}

async function verificarLigacao() {
  const el = document.getElementById('estado-ligacao');
  const txtEl = el.querySelector('.txt');
  try {
    const r = await pedirJSON(`${CONFIG.API}/health`);
    if (r.ok) { el.className = 'estado lig'; txtEl.textContent = 'ligado'; }
    else { el.className = 'estado erro'; txtEl.textContent = 'sem base de dados'; }
  } catch (err) {
    el.className = 'estado erro';
    txtEl.textContent = 'servidor offline';
  }
}

function temaGrafico({ legenda = true, eixoY = false } = {}) {
  return {
    responsive: true,
    plugins: {
      legend: legenda ? { labels: { color: COR.bruma, font: { family: 'Inter' } } } : { display: false },
      tooltip: tooltipTema(),
    },
    scales: {
      x: {
        grid: { color: COR.linha, drawBorder: false },
        ticks: { color: COR.bruma, font: { family: 'JetBrains Mono', size: 11 } },
      },
      y: eixoY ? {
        beginAtZero: true,
        grid: { color: COR.linha, drawBorder: false },
        ticks: { color: COR.nevoa, font: { family: 'JetBrains Mono', size: 10 } },
      } : { display: false },
    },
  };
}

function tooltipTema() {
  return {
    backgroundColor: '#152634',
    borderColor: '#2c4153',
    borderWidth: 1,
    titleColor: COR.gesso,
    bodyColor: COR.bruma,
    titleFont: { family: 'Space Grotesk' },
    bodyFont: { family: 'JetBrains Mono', size: 12 },
    padding: 10,
    cornerRadius: 8,
    displayColors: true,
    boxPadding: 4,
  };
}

let toastSeq = 0;
function toast(texto, tipo = 'info', duracao = 3800) {
  const cont = document.getElementById('toasts');
  if (!cont) return;
  const id = `toast-${++toastSeq}`;
  const el = document.createElement('div');
  el.className = `toast ${tipo}`;
  el.id = id;
  el.innerHTML =
    `<span class="ico">${ICO[tipo] || ICO.info}</span>` +
    `<span class="corpo">${escaparHtml(texto)}</span>` +
    `<button class="fechar" aria-label="Fechar">${ICO.fechar}</button>`;
  el.querySelector('.fechar').addEventListener('click', () => removerToast(el));
  cont.appendChild(el);
  // limitar a 4 toasts visiveis
  while (cont.children.length > 4) removerToast(cont.firstElementChild, true);
  if (duracao > 0) setTimeout(() => removerToast(el), duracao);
}
function removerToast(el, imediato) {
  if (!el || !el.parentNode) return;
  if (imediato) { el.remove(); return; }
  el.classList.add('sai');
  setTimeout(() => el.remove(), 260);
}

async function pedirJSON(url) {
  const resp = await fetch(url);
  if (!resp.ok) {
    let detalhe = '';
    try { detalhe = (await resp.json()).erro || ''; } catch (_) {}
    throw new Error(`${resp.status} ${detalhe}`);
  }
  return resp.json();
}

async function postJSON(url, corpo) {
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  });
  if (!resp.ok) {
    let detalhe = '';
    try { detalhe = (await resp.json()).erro || ''; } catch (_) {}
    throw new Error(`${resp.status} ${detalhe}`);
  }
  return resp.json();
}

function txt(id, valor) {
  const el = document.getElementById(id);
  if (el) el.textContent = valor;
}
function mostrar(id, animar) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('oculto');
  if (animar) { el.classList.remove('entra'); void el.offsetWidth; el.classList.add('entra'); }
}
function esconder(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('oculto');
}
function marcarConta(painelId, texto) {
  const cab = document.querySelector(`#${painelId} .painel-cab`);
  if (!cab) return;
  let conta = cab.querySelector('.conta');
  if (!conta) { conta = document.createElement('span'); conta.className = 'conta'; cab.appendChild(conta); }
  conta.textContent = texto;
}

function carregarBotao(btn, ativo, textoCarga) {
  if (!btn) return;
  if (ativo) {
    btn.disabled = true;
    btn.dataset.html = btn.innerHTML;
    btn.innerHTML = `<span class="spin"></span>${textoCarga ? escaparHtml(textoCarga) : ''}`;
  } else if (btn.dataset.html) {
    btn.disabled = false;
    btn.innerHTML = btn.dataset.html;
    delete btn.dataset.html;
  }
}

function apos(fn, ms = 380) { setTimeout(fn, ms); }

function formatarNumero(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '·';
  return v.toLocaleString('pt-PT');
}

function escaparHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}