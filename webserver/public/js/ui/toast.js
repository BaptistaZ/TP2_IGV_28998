// Notificações temporárias da interface.

let toastSeq = 0;

function toast(texto, tipo = 'info', duracao = 3800) {
  const cont = document.getElementById('toasts');

  if (!cont) return;

  const id = `toast-${++toastSeq}`;
  const el = document.createElement('div');

  el.className = `toast ${tipo}`;
  el.id = id;

  el.innerHTML =
    `<span class="ico">${ICO[tipo] || ICO.info}</span>` +
    `<span class="corpo">${escaparHtml(texto)}</span>` +
    `<button class="fechar" aria-label="Fechar">${ICO.fechar}</button>`;

  el.querySelector('.fechar').addEventListener('click', () => removerToast(el));

  cont.appendChild(el);

  // Mantém no máximo quatro notificações visíveis em simultâneo.
  while (cont.children.length > 4) {
    removerToast(cont.firstElementChild, true);
  }

  if (duracao > 0) {
    setTimeout(() => removerToast(el), duracao);
  }
}

function removerToast(el, imediato) {
  if (!el || !el.parentNode) return;

  if (imediato) {
    el.remove();
    return;
  }

  el.classList.add('sai');
  setTimeout(() => el.remove(), 260);
}