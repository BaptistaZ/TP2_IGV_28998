// Análise multicritério de elegibilidade.
// Combina critérios de cota, declive e proximidade a Alojamento Local.

function ligarControlosCriterios() {
  const rngCota = document.getElementById('rng-cota');
  const lblCota = document.getElementById('lbl-cota');

  rngCota.addEventListener('input', () => (lblCota.textContent = rngCota.value));

  const rngDist = document.getElementById('rng-dist');
  const lblDist = document.getElementById('lbl-dist');

  rngDist.addEventListener('input', () => (lblDist.textContent = rngDist.value));

  const rngDeclive = document.getElementById('rng-declive');
  const lblDeclive = document.getElementById('lbl-declive');

  if (rngDeclive) {
    rngDeclive.addEventListener('input', () => (lblDeclive.textContent = rngDeclive.value));
  }
}

async function executarElegibilidade() {
  if (!areaDesenhada) {
    toast('Desenha primeiro uma área no mapa.', 'info');
    return;
  }

  const cotaMin = parseFloat(document.getElementById('rng-cota').value);
  const distAl = parseFloat(document.getElementById('rng-dist').value);
  const usarAl = document.getElementById('chk-al').checked;
  const decliveMax = parseFloat(document.getElementById('rng-declive').value);
  const usarDeclive = document.getElementById('chk-declive').checked;
  const btn = document.getElementById('btn-executar-eleg');

  try {
    carregarBotao(btn, true, 'A analisar…');
    estadoBarra('a executar elegibilidade…');

    // Envia a área desenhada e os critérios selecionados para análise no backend.
    const r = await postJSON(`${CONFIG.API}/analise/elegivel`, {
      geometry: areaDesenhada,
      cota_min: cotaMin,
      dist_al: distAl,
      usar_al: usarAl,
      declive_max: decliveMax,
      usar_declive: usarDeclive,
    });

    txt('ce-area', r.area_km2_elegivel != null ? Number(r.area_km2_elegivel).toFixed(3) : '0');

    if (elegivelLayer) {
      map.removeLayer(elegivelLayer);
      elegivelLayer = null;
    }

    ultimoElegivelGeoJSON = r.geojson || null;

    // Desenha no mapa a zona que cumpre os critérios, caso exista.
    if (r.geojson) {
      elegivelLayer = L.geoJSON(r.geojson, {
        style: {
          color: '#5cc98a',
          weight: 1.4,
          fillColor: '#5cc98a',
          fillOpacity: 0.45,
        },
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
  if (!ultimoElegivelGeoJSON) {
    toast('Não há resultado para exportar.', 'info');
    return;
  }

  // Exporta o último resultado de elegibilidade como ficheiro GeoJSON.
  const blob = new Blob([JSON.stringify(ultimoElegivelGeoJSON, null, 2)], { type: 'application/geo+json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');

  a.href = url;
  a.download = 'area_elegivel.geojson';

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
  toast('GeoJSON exportado.', 'ok');
}

