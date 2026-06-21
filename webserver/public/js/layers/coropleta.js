// Coropleta configurável das freguesias.
// Aplica cores às freguesias com base em indicadores agregados.

let indicadoresCache = null;
let coropletaAtiva = null;
let coropletaQuebras = null;

const COROPLETA_INFO = {
  populacao:   { titulo: 'População',                    sufixo: '' },
  densidade:   { titulo: 'Densidade (hab/km²)',          sufixo: '' },
  idosos_pct:  { titulo: 'Índice de envelhecimento (%)', sufixo: '%' },
  edificios:   { titulo: 'Edifícios',                    sufixo: '' },
  alojamentos: { titulo: 'Alojamentos familiares',       sufixo: '' },
};

const COROPLETA_CORES = ['#f1eef6', '#bdc9e1', '#74a9cf', '#2b8cbe', '#045a8d'];

function ligarCoropleta() {
  const sel = document.getElementById('select-coropleta');

  if (sel) {
    sel.addEventListener('change', () => aplicarCoropleta(sel.value));
  }
}

async function aplicarCoropleta(variavel) {
  if (!variavel) {
    limparCoropleta();
    return;
  }

  try {
    // Carrega os indicadores apenas uma vez e reutiliza-os nas trocas de variável.
    if (!indicadoresCache) {
      estadoBarra('a carregar indicadores…');
      indicadoresCache = await pedirJSON(`${CONFIG.API}/indicadores`);
      estadoBarra('pronto');
    }

    coropletaAtiva = variavel;

    const valores = indicadoresCache
      .map((d) => Number(d[variavel]))
      .filter((v) => Number.isFinite(v));

    const quebras = quantis(valores, 5);
    coropletaQuebras = quebras;

    const porDtmnfr = {};

    indicadoresCache.forEach((d) => {
      porDtmnfr[d.dtmnfr] = Number(d[variavel]);
    });

    // Atualiza o estilo das freguesias, preservando a freguesia ativa.
    if (camadaFreguesias) {
      camadaFreguesias.eachLayer((l) => {
        if (freguesiaAtiva?.layer === l) return;

        const cor = corDaClasse(porDtmnfr[l.feature?.properties?.dtmnfr], quebras);

        l.setStyle({
          color: '#1c3242',
          weight: 1,
          fillColor: cor,
          fillOpacity: 0.78,
        });
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

  if (camadaFreguesias) {
    camadaFreguesias.eachLayer((l) => {
      if (freguesiaAtiva?.layer !== l) l.setStyle(estiloFreguesia());
    });
  }

  const leg = document.getElementById('coropleta-legenda');

  if (leg) {
    leg.classList.add('oculto');
    leg.innerHTML = '';
  }
}

function quantis(valores, n) {
  const ord = [...valores].sort((a, b) => a - b);

  if (ord.length === 0) return [0, 0, 0, 0];

  const q = [];

  // Calcula as quebras usadas para distribuir os valores pelas classes de cor.
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

  while (i < quebras.length && v > quebras[i]) {
    i++;
  }

  return COROPLETA_CORES[Math.min(i, COROPLETA_CORES.length - 1)];
}

function renderCoropletaLegenda(variavel, quebras) {
  const cont = document.getElementById('coropleta-legenda');

  if (!cont) return;

  const info = COROPLETA_INFO[variavel] || { titulo: variavel, sufixo: '' };
  const fmt = (x) => Math.round(x).toLocaleString('pt-PT');

  let linhas = '';

  // Constrói a legenda com os intervalos correspondentes às classes da coropleta.
  for (let i = 0; i < COROPLETA_CORES.length; i++) {
    let intervalo;

    if (i === 0) {
      intervalo = `&lt; ${fmt(quebras[0])}${info.sufixo}`;
    } else if (i === COROPLETA_CORES.length - 1) {
      intervalo = `&ge; ${fmt(quebras[quebras.length - 1])}${info.sufixo}`;
    } else {
      intervalo = `${fmt(quebras[i - 1])} – ${fmt(quebras[i])}${info.sufixo}`;
    }

    linhas += `<div class="cl-item"><span class="cl-cor" style="background:${COROPLETA_CORES[i]}"></span>${intervalo}</div>`;
  }

  cont.innerHTML = `<div class="cl-titulo">${escaparHtml(info.titulo)}</div>${linhas}`;
  cont.classList.remove('oculto');
}