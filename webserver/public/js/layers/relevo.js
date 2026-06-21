// Relevo (DEM) recortado para a freguesia selecionada.

async function verRelevoFreguesia() {
  if (!dtmnfrSelecionada) {
    toast('Escolhe primeiro uma freguesia.', 'info');
    return;
  }

  const btn = document.getElementById('btn-ver-dem');

  try {
    carregarBotao(btn, true, 'A carregar relevo…');
    estadoBarra('a recortar DEM…');

    // Carrega o GeoTIFF do DEM recortado no backend para a freguesia ativa.
    const resp = await fetch(`${CONFIG.API}/freguesias/${dtmnfrSelecionada}/dem.tif`);

    if (!resp.ok) {
      let detalhe = '';

      try {
        detalhe = (await resp.json()).detalhe || (await resp.json()).erro || '';
      } catch (_) {}

      throw new Error(detalhe || `DEM indisponível (${resp.status})`);
    }

    const buffer = await resp.arrayBuffer();
    const georaster = await parseGeoraster(buffer);

    const maximo = Math.round(georaster.maxs[0]) || 800;

    const rainbow = new Rainbow();
    rainbow.setNumberRange(1, Math.max(2, maximo));
    rainbow.setSpectrum('#2c6e49', '#88a93a', '#e3c14f', '#c97d3a', '#f4ede4');

    if (freguesiaDemLayer) {
      map.removeLayer(freguesiaDemLayer);
    }

    // Converte valores de altitude em cores e adiciona o raster ao mapa.
    freguesiaDemLayer = new GeoRasterLayer({
      georaster,
      opacity: 0.88,
      resolution: 256,
      pixelValuesToColorFn: (vals) => {
        const v = vals[0];

        if (v === null || v === undefined || v <= -100) return null;

        return '#' + rainbow.colourAt(Math.round(Math.max(1, v)));
      },
    });

    freguesiaDemLayer.addTo(map);

    if (freguesiaDemLayer.getBounds) {
      map.fitBounds(freguesiaDemLayer.getBounds(), { padding: [30, 30] });
    }

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