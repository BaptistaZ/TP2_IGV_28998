// Acesso à API.
// Centraliza pedidos GET e POST em JSON e normaliza mensagens de erro.

async function pedirJSON(url) {
  const resp = await fetch(url);

  if (!resp.ok) {
    let detalhe = '';

    try {
      detalhe = (await resp.json()).erro || '';
    } catch (_) {}

    throw new Error(`${resp.status} ${detalhe}`);
  }

  return resp.json();
}

async function postJSON(url, corpo) {
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  });

  if (!resp.ok) {
    let detalhe = '';

    try {
      detalhe = (await resp.json()).erro || '';
    } catch (_) {}

    throw new Error(`${resp.status} ${detalhe}`);
  }

  return resp.json();
}