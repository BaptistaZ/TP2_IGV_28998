// Conversão numérica segura.
// Devolve o valor convertido ou o valor por defeito quando a conversão falha.

function numero(valor, defeito) {
  const n = parseFloat(valor);

  return Number.isFinite(n) ? n : defeito;
}

module.exports = {
  numero,
};