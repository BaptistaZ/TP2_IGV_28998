// Ligação dos botões da interface.
// Associa ações aos botões de análise, painéis, medição e ecrã inteiro.

function ligarBotoesAnalise() {
  document.getElementById('btn-ver-dem').addEventListener('click', verRelevoFreguesia);
  document.getElementById('btn-ver-declive').addEventListener('click', verDecliveFreguesia);

  document.getElementById('btn-desenhar-area').addEventListener('click', iniciarDesenhoArea);
  document.getElementById('btn-limpar-area').addEventListener('click', limparArea);

  document.getElementById('btn-desenhar-area2').addEventListener('click', iniciarDesenhoArea);
  document.getElementById('btn-limpar-area2').addEventListener('click', limparArea);

  document.getElementById('btn-executar-eleg').addEventListener('click', executarElegibilidade);
  document.getElementById('btn-exportar').addEventListener('click', exportarElegivel);

  // Depois de desenhar uma área, executa automaticamente a interseção quando essa aba está ativa.
  map.on(L.Draw.Event.CREATED, () => {
    const eraMedir = tipoDesenho === 'medir';

    desenhoAreaAtivo = null;
    tipoDesenho = null;

    if (eraMedir) return;

    const ativa = document.querySelector('.aba.ativa');

    if (ativa?.dataset.aba === 'interseccao') {
      executarInterseccao();
    }
  });

  map.on('draw:drawstop', () => {
    desenhoAreaAtivo = null;
  });

  // Tecla Escape cancela a ferramenta interativa atualmente ativa.
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;

    if (medicaoAtiva) {
      cancelarMedicao();
      toast('Medição cancelada.', 'info');
      return;
    }

    if (perfilAtivo) {
      cancelarPerfil();
      toast('Perfil cancelado.', 'info');
      return;
    }

    if (areaMedicaoAtiva) {
      cancelarMedicaoArea();
      toast('Medição de área cancelada.', 'info');
      return;
    }

    if (modoClique !== 'info') {
      activarModoClique('info');
      toast('Ferramenta desativada.', 'info');
      return;
    }

    if (desenhoAreaAtivo) {
      desenhoAreaAtivo.disable();
      desenhoAreaAtivo = null;
      tipoDesenho = null;
      toast('Desenho cancelado.', 'info');
    }
  });
}

function ligarChrome() {
  const app = document.getElementById('app');

  // Alterna o painel esquerdo e reajusta o tamanho do mapa.
  ligarToggle('btn-esq', () => {
    const fechado = app.classList.toggle('sem-esq');

    document.getElementById('btn-esq').classList.toggle('ativo', !fechado);
    apos(() => map.invalidateSize());
  });

  // Alterna o painel direito e reajusta o tamanho do mapa.
  ligarToggle('btn-dir', () => {
    const fechado = app.classList.toggle('sem-dir');

    document.getElementById('btn-dir').classList.toggle('ativo', !fechado);
    apos(() => map.invalidateSize());
  });

  document.getElementById('btn-medir').addEventListener('click', () => {
    if (medicaoAtiva) {
      terminarMedicao();
      return;
    }

    if (medLinha) {
      limparMedicao();
      estadoBarra('pronto');
      return;
    }

    iniciarMedicao();
  });

  document.getElementById('btn-cheio').addEventListener('click', alternarEcraInteiro);

  document.addEventListener('fullscreenchange', () => {
    document.getElementById('btn-cheio').classList.toggle('ativo', !!document.fullscreenElement);
    apos(() => map.invalidateSize());
  });
}

function ligarToggle(id, fn) {
  const el = document.getElementById(id);

  if (el) {
    el.addEventListener('click', fn);
  }
}

function garantirPainelDir() {
  const app = document.getElementById('app');

  // Reabre o painel direito quando uma ação precisa de mostrar resultados.
  if (app.classList.contains('sem-dir')) {
    app.classList.remove('sem-dir');
    document.getElementById('btn-dir').classList.add('ativo');
    apos(() => map.invalidateSize());
  }
}

function alternarEcraInteiro() {
  const alvo = document.getElementById('mapa');

  if (!document.fullscreenElement) {
    (alvo.requestFullscreen || alvo.webkitRequestFullscreen)?.call(alvo);
  } else {
    document.exitFullscreen?.();
  }
}