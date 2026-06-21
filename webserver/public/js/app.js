// Orquestrador da aplicação.
// Inicializa mapa, controlos, camadas e eventos principais quando a página carrega.

async function initApp() {
  criarMapa();
  criarDesenhoEMedicao();

  // Liga os controlos da interface e das ferramentas de análise.
  ligarAbas();
  ligarControlosCriterios();
  ligarBotoesAnalise();
  ligarChrome();
  ligarFerramentasMapa();
  ligarProximidade();
  ligarComparar();
  ligarCoropleta();

  // Verifica a API e carrega os dados base necessários ao geoportal.
  await verificarLigacao();
  await carregarFreguesias();

  // Preenche painéis e regista camadas depois dos dados principais estarem disponíveis.
  registarCamadas();
  renderBases();
  renderLegenda();

  map.on('click', onCliqueMapa);
}