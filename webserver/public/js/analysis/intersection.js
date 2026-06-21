// Interseção por área desenhada.
// Calcula estatísticas espaciais e apresenta o gráfico de modalidades de Alojamento Local.

async function executarInterseccao() {
  if (!areaDesenhada) {
    toast('Desenha primeiro uma área no mapa.', 'info');
    return;
  }

  try {
    estadoBarra('a calcular interseção…');

    // Envia a geometria desenhada para o backend calcular os indicadores da área.
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

  // Remove o gráfico anterior antes de desenhar novos resultados.
  if (chartModalidade) chartModalidade.destroy();

  let labels = lista.map((x) => x.modalidade || '·');
  let valores = lista.map((x) => Number(x.n));
  let cores = labels.map((m) => corModalidade(m));

  // Mantém o gráfico visível mesmo quando não existem alojamentos na área.
  if (labels.length === 0) {
    labels = ['Sem alojamento local'];
    valores = [1];
    cores = ['#2c4153'];
  }

  chartModalidade = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: valores,
        backgroundColor: cores,
        borderColor: '#0b1620',
        borderWidth: 2,
        hoverOffset: 6,
      }],
    },
    options: {
      responsive: true,
      cutout: '62%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: COR.bruma,
            font: { family: 'Inter', size: 11 },
            boxWidth: 12,
            padding: 12,
            usePointStyle: true,
          },
        },
        tooltip: tooltipTema(),
      },
    },
  });
}