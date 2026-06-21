// Declive derivado do DEM para a freguesia selecionada.

async function verDecliveFreguesia() {
  if (!dtmnfrSelecionada) {
    toast('Escolhe primeiro uma freguesia.', 'info');
    return;
  }

  const btn = document.getElementById('btn-ver-declive');

  try {
    carregarBotao(btn, true, 'A calcular declive…');
    estadoBarra('a calcular declive…');

    // Carrega estatísticas do declive para atualizar os KPIs no painel.
    pedirJSON(`${CONFIG.API}/freguesias/${dtmnfrSelecionada}/declive`)
      .then((s) => {
        txt('kpi-declive-max', s.declive_max != null ? s.declive_max + '°' : '·');
        txt('kpi-declive-media', s.declive_media != null ? s.declive_media + '°' : '·');
        mostrar('declive-stats', true);
      })
      .catch(() => {});

    // Carrega o GeoTIFF de declive calculado no backend.
    const resp = await fetch(`${CONFIG.API}/freguesias/${dtmnfrSelecionada}/declive.tif`);

    if (!resp.ok) {
      let detalhe = '';

      try {
        detalhe = (await resp.json()).detalhe || (await resp.json()).erro || '';
      } catch (_) {}

      throw new Error(detalhe || `Declive indisponível (${resp.status})`);
    }

    const buffer = await resp.arrayBuffer();
    const georaster = await parseGeoraster(buffer);

    const rainbow = new Rainbow();
    rainbow.setNumberRange(0, 45);
    rainbow.setSpectrum('#1a9850', '#a6d96a', '#fee08b', '#f46d43', '#a50026');

    if (freguesiaDemLayer) {
      map.removeLayer(freguesiaDemLayer);
      freguesiaDemLayer = null;
    }

    // Representa o declive com escala verde-amarelo-vermelho.
    freguesiaDemLayer = new GeoRasterLayer({
      georaster,
      opacity: 0.85,
      resolution: 256,
      pixelValuesToColorFn: (vals) => {
        const v = vals[0];

        if (v === null || v === undefined || v < 0) return null;

        return '#' + rainbow.colourAt(Math.min(45, Math.round(v)));
      },
    });

    freguesiaDemLayer.addTo(map);

    if (freguesiaDemLayer.getBounds) {
      map.fitBounds(freguesiaDemLayer.getBounds(), { padding: [30, 30] });
    }

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
