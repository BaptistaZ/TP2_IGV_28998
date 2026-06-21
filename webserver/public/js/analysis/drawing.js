// Desenho de áreas no mapa.
// Serve de base às análises por interseção, critérios e medição de área.

function criarDesenhoEMedicao() {
  drawnItems = new L.FeatureGroup();
  map.addLayer(drawnItems);

  // Controlo Leaflet Draw usado para polígonos, retângulos e linhas.
  drawControl = new L.Control.Draw({
    position: 'topleft',
    draw: {
      polygon: {
        allowIntersection: false,
        showArea: true,
        shapeOptions: {
          color: '#e3a857',
          weight: 2,
          fillColor: '#e3a857',
          fillOpacity: 0.08,
        },
        metric: true,
      },
      rectangle: {
        shapeOptions: {
          color: '#e3a857',
          weight: 2,
          fillColor: '#e3a857',
          fillOpacity: 0.08,
        },
      },
      polyline: {
        shapeOptions: {
          color: '#58c4c4',
          weight: 3,
        },
        metric: true,
      },
      circle: false,
      circlemarker: false,
      marker: false,
    },
    edit: {
      featureGroup: drawnItems,
      remove: true,
    },
  });

  map.addControl(drawControl);

  // Encaminha a geometria desenhada para medição ou para análise espacial.
  map.on(L.Draw.Event.CREATED, (e) => {
    const layer = e.layer;

    if (tipoDesenho === 'medir') {
      aoCriarAreaMedida(layer);
      desligarMedicaoArea();
      return;
    }

    if (e.layerType === 'polygon' || e.layerType === 'rectangle') {
      limparAreasPoligono();
      drawnItems.addLayer(layer);
      areaDesenhada = layer.toGeoJSON().geometry;
      toast('Área desenhada. Já podes executar a análise.', 'ok');
    }
  });
}

// Indica se o próximo polígono desenhado será usado para análise ou medição.
let tipoDesenho = null; // 'analise' | 'medir'

function formatarDistancia(metros) {
  return metros >= 1000 ? `${(metros / 1000).toFixed(2)} km` : `${Math.round(metros)} m`;
}

function limparAreasPoligono() {
  const aRemover = [];

  drawnItems.eachLayer((l) => {
    if (l instanceof L.Polygon) aRemover.push(l);
  });

  aRemover.forEach((l) => drawnItems.removeLayer(l));
}

let desenhoAreaAtivo = null;

function iniciarDesenhoArea() {
  garantirPainelDir();

  // Garante que só uma ferramenta interativa está ativa de cada vez.
  if (medicaoAtiva) cancelarMedicao();
  if (perfilAtivo) cancelarPerfil();
  if (areaMedicaoAtiva) cancelarMedicaoArea();
  if (desenhoAreaAtivo) desenhoAreaAtivo.disable();

  tipoDesenho = 'analise';

  desenhoAreaAtivo = new L.Draw.Polygon(map, drawControl.options.draw.polygon);
  desenhoAreaAtivo.enable();

  toast('Clica no mapa para desenhar a área. Duplo clique termina, Esc cancela.', 'info', 5000);
}