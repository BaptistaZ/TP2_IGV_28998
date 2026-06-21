// Abas do painel de análise.
// Controla a navegação entre os diferentes modos de consulta e análise espacial.

function ligarAbas() {
  document.querySelectorAll('.aba').forEach((btn) => {
    btn.addEventListener('click', () => ativarAba(btn.dataset.aba));
  });
}

function ativarAba(nome) {
  // Atualiza o estado visual e acessível dos botões das abas.
  document.querySelectorAll('.aba').forEach((b) => {
    const on = b.dataset.aba === nome;

    b.classList.toggle('ativa', on);
    b.setAttribute('aria-selected', on ? 'true' : 'false');
  });

  // Mostra apenas o painel de conteúdo correspondente à aba ativa.
  document.querySelectorAll('.conteudo-aba').forEach((s) =>
    s.classList.toggle('ativa', s.id === `aba-${nome}`)
  );
}