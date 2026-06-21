// Mapa base Leaflet e seletor de mapas de fundo.

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
      {
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri',
      }
    ),
  },
];

let baseAtiva = basesDef[0];

function criarMapa() {
  // Inicializa o mapa Leaflet com a vista definida na configuração global.
  map = L.map('mapa', {
    center: CONFIG.MAPA.centro,
    zoom: CONFIG.MAPA.zoom,
    minZoom: CONFIG.MAPA.zoomMin,
    maxZoom: CONFIG.MAPA.zoomMax,
    zoomControl: true,
  });

  baseAtiva.camada.addTo(map);

  L.control.scale({
    imperial: false,
    position: 'bottomleft',
  }).addTo(map);

  // Atualiza informação de coordenadas, zoom e escala na barra inferior.
  map.on('mousemove', (e) => atualizarCoordenadas(e.latlng));
  map.on('zoomend moveend', atualizarEstadoMapa);

  atualizarEstadoMapa();
}

function renderBases() {
  const cont = document.getElementById('lista-bases');
  cont.innerHTML = '';

  // Cria o seletor visual dos mapas base disponíveis.
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
  b.camada.bringToBack();

  baseAtiva = b;
}