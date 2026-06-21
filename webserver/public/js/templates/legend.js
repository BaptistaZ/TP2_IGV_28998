// Legenda do painel esquerdo.
// Apresenta a simbologia principal das camadas disponíveis no mapa.

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
  `;
}