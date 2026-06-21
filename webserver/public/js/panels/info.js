// Clique-info no mapa e consulta de freguesia.
// Gere o modo de clique atual e apresenta informação pontual ou dados agregados.

let modoClique = 'info'; // 'info' | 'knn' | 'buffer'

async function onCliqueMapa(e) {
  if (medicaoAtiva || perfilAtivo) return;

  if (modoClique === 'knn') {
    executarKnn(e.latlng);
    return;
  }

  if (modoClique === 'buffer') {
    executarBuffer(e.latlng);
    return;
  }

  try {
    const { lat, lng } = e.latlng;

    const aberto = L.popup({ className: 'pop-carga' })
      .setLatLng(e.latlng)
      .setContent('<div class="pop-titulo">A consultar ponto…</div>')
      .openOn(map);

    // Consulta informação espacial do ponto clicado.
    const info = await pedirJSON(`${CONFIG.API}/info?lat=${lat}&lng=${lng}`);

    const linhas = [`<div class="pop-titulo">Informação do ponto</div>`];

    const L_ = (k, v) =>
      `<div class="pop-linha"><span class="k">${k}</span><span class="v">${v}</span></div>`;

    linhas.push(L_('Freguesia', escaparHtml(info.freguesia || '·')));

    if (info.subseccao) {
      linhas.push(L_('Subsecção (BGRI)', escaparHtml(info.subseccao)));
    }

    if (info.populacao_subseccao != null) {
      linhas.push(L_('Pop. da subsecção', info.populacao_subseccao));
    }

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

    // Obtém informação administrativa, censitária e de relevo da freguesia.
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

    // Sincroniza a seleção do painel com a freguesia destacada no mapa.
    if (camadaFreguesias) {
      camadaFreguesias.eachLayer((l) => {
        if (l.feature?.properties?.dtmnfr === dtmnfr) {
          if (freguesiaAtiva?.layer && freguesiaAtiva.layer !== l) {
            freguesiaAtiva.layer.setStyle(estiloRepousoFreguesia(freguesiaAtiva.layer));
          }

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

  // Evita sobreposição de gráficos ao consultar várias freguesias.
  if (chartEtaria) chartEtaria.destroy();

  chartEtaria = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['0-14', '15-24', '25-64', '65+'],
      datasets: [{
        label: 'Indivíduos',
        data: [
          c.jovens_0_14,
          c.jovens_15_24,
          c.adultos_25_64,
          c.idosos_65,
        ].map(Number),
        backgroundColor: ['#6ea8e6', '#5cc98a', '#e3a857', '#e8746b'],
        borderRadius: 5,
        borderSkipped: false,
        maxBarThickness: 46,
      }],
    },
    options: temaGrafico({ legenda: false, eixoY: true }),
  });
}