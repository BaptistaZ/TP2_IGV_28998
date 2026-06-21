// Utilitários de DOM e formatação.
// Centraliza operações simples usadas por vários módulos do frontend.

function txt(id, valor) {
  const el = document.getElementById(id);

  if (el) {
    el.textContent = valor;
  }
}

function mostrar(id, animar) {
  const el = document.getElementById(id);

  if (!el) return;

  el.classList.remove('oculto');

  if (animar) {
    el.classList.remove('entra');
    void el.offsetWidth;
    el.classList.add('entra');
  }
}

function esconder(id) {
  const el = document.getElementById(id);

  if (el) {
    el.classList.add('oculto');
  }
}

function marcarConta(painelId, texto) {
  const cab = document.querySelector(`#${painelId} .painel-cab`);

  if (!cab) return;

  let conta = cab.querySelector('.conta');

  if (!conta) {
    conta = document.createElement('span');
    conta.className = 'conta';
    cab.appendChild(conta);
  }

  conta.textContent = texto;
}

function carregarBotao(btn, ativo, textoCarga) {
  if (!btn) return;

  if (ativo) {
    btn.disabled = true;
    btn.dataset.html = btn.innerHTML;
    btn.innerHTML = `<span class="spin"></span>${textoCarga ? escaparHtml(textoCarga) : ''}`;
  } else if (btn.dataset.html) {
    btn.disabled = false;
    btn.innerHTML = btn.dataset.html;
    delete btn.dataset.html;
  }
}

function apos(fn, ms = 380) {
  setTimeout(fn, ms);
}

function formatarNumero(n) {
  const v = Number(n);

  if (!Number.isFinite(v)) return '·';

  return v.toLocaleString('pt-PT');
}

function escaparHtml(s) {
  // Escapa texto antes de o inserir em HTML gerado por JavaScript.
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}