// Camadas de Alojamento Local e DEM.
// Cria overlays vetoriais e raster usados no painel de camadas.

async function criarCamadaAL() {
  const geojson = await pedirJSON(`${CONFIG.API}/alojamento_local`);

  return L.geoJSON(geojson, {
    pointToLayer: (feature, latlng) =>
      L.circleMarker(latlng, {
        radius: 5,
        color: '#0b1620',
        weight: 1.5,
        fillColor: corModalidade(feature.properties.modalidade),
        fillOpacity: 0.95,
      }),

    onEachFeature: (feature, layer) => {
      const p = feature.properties || {};

      const popupHtml =
        `<div class="pop-titulo">${escaparHtml(p.denominacao || 'Alojamento Local')}</div>` +
        `<div class="pop-linha"><strong>Modalidade:</strong> ${escaparHtml(p.modalidade || '—')}</div>` +
        `<div class="pop-linha"><strong>Freguesia:</strong> ${escaparHtml(p.freguesia || '—')}</div>`;

      layer.on('click', async (e) => {
        L.DomEvent.stopPropagation(e);

        // Em modo KNN ou buffer, o clique no alojamento funciona como ponto de análise.
        if (modoClique === 'knn') {
          await executarKnn(e.latlng);
          return;
        }

        if (modoClique === 'buffer') {
          await executarBuffer(e.latlng);
          return;
        }

        L.popup()
          .setLatLng(e.latlng)
          .setContent(popupHtml)
          .openOn(map);
      });
    },
  });
}

async function criarCamadaDEM() {
  const resp = await fetch(CONFIG.DEM_TIF);

  if (!resp.ok) {
    throw new Error('GeoTIFF do DEM indisponível');
  }

  const buffer = await resp.arrayBuffer();
  const georaster = await parseGeoraster(buffer);

  const maximo = Math.round(georaster.maxs[0]) || 800;

  const rainbow = new Rainbow();
  rainbow.setNumberRange(1, Math.max(2, maximo));
  rainbow.setSpectrum('#2c6e49', '#88a93a', '#e3c14f', '#c97d3a', '#f4ede4');

  // Converte valores de altitude do raster em cores para visualização no mapa.
  return new GeoRasterLayer({
    georaster,
    opacity: 0.78,
    resolution: 256,
    pixelValuesToColorFn: (vals) => {
      const v = vals[0];

      if (v === null || v === undefined || v <= -100 || v <= 0) return null;

      return '#' + rainbow.colourAt(Math.round(v));
    },
  });
}