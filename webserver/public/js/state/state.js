// Estado global partilhado e constantes visuais.
// Reúne referências principais do mapa, camadas, resultados e elementos gráficos.

let map;
let drawnItems;
let drawControl;
let areaDesenhada = null;

let camadaFreguesias = null;
let freguesiaAtiva = null;
let dtmnfrSelecionada = null;

let demLayer = null;
let freguesiaDemLayer = null;
let elegivelLayer = null;

let ultimoElegivelGeoJSON = null;

let chartEtaria = null;
let chartModalidade = null;

// Cores usadas para distinguir modalidades de Alojamento Local.
const CORES_MODALIDADE = {
  'Estabelecimento de hospedagem': '#e3a857',
  'Apartamento': '#6ea8e6',
  'Moradia': '#5cc98a',
  'Quartos': '#c98ad6',
};

function corModalidade(m) {
  return CORES_MODALIDADE[m] || '#9fb2bf';
}

// Paleta visual principal usada em gráficos e interface.
const COR = {
  gesso: '#eef4f8',
  bruma: '#9fb2bf',
  nevoa: '#647889',
  linha: '#21323f',
  latao: '#e3a857',
  ciano: '#58c4c4',
};

// Ícones SVG reutilizados em notificações, botões e componentes da interface.
const ICO = {
  info:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
  ok:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>',
  erro:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></svg>',
  fechar:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  vazio: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9 12 4l9 5-9 5-9-5Z"/><path d="m3 14 9 5 9-5"/></svg>',
};

// Glifos associados às camadas apresentadas no painel esquerdo.
const GLIFOS_CAMADA = {
  freguesias:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z"/><path d="M9 3v15M15 6v15"/></svg>',
  freguesiasWMS: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V5h16v2M9 20h6M12 5v15"/></svg>',
  subseccoesWMS: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg>',
  alojamento:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>',
  dem:           '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m3 20 6-10 4 6 3-4 5 8z"/></svg>',
};