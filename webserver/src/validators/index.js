// Validações simples reutilizadas pelas rotas.

const RE_DTMNFR = /^\d{6}$/;

function isDtmnfr(valor) {
  // Valida códigos de freguesia DTMNFR com exatamente 6 dígitos.
  return RE_DTMNFR.test(valor);
}

module.exports = {
  isDtmnfr,
};