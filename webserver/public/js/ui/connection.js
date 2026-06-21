// Indicador de ligação ao servidor.
// Verifica o estado da API e atualiza o aviso no topo da interface.

async function verificarLigacao() {
  const el = document.getElementById('estado-ligacao');
  const txtEl = el.querySelector('.txt');

  try {
    const r = await pedirJSON(`${CONFIG.API}/health`);

    if (r.ok) {
      el.className = 'estado lig';
      txtEl.textContent = 'ligado';
    } else {
      el.className = 'estado erro';
      txtEl.textContent = 'sem base de dados';
    }
  } catch (err) {
    el.className = 'estado erro';
    txtEl.textContent = 'servidor offline';
  }
}