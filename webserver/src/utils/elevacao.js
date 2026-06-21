// Ganho de elevação acumulado.
// Soma apenas os troços em que a cota aumenta ao longo do perfil.

function ganhoAcumulado(cotas) {
  let ganho = 0;

  for (let i = 1; i < cotas.length; i++) {
    const d = cotas[i] - cotas[i - 1];

    if (d > 0) {
      ganho += d;
    }
  }

  return Math.round(ganho);
}

module.exports = {
  ganhoAcumulado,
};