// Tema partilhado dos gráficos Chart.js.
// Centraliza estilos de legenda, eixos e tooltips usados nos vários gráficos.

function temaGrafico({ legenda = true, eixoY = false } = {}) {
  return {
    responsive: true,
    plugins: {
      legend: legenda
        ? {
            labels: {
              color: COR.bruma,
              font: { family: 'Inter' },
            },
          }
        : { display: false },
      tooltip: tooltipTema(),
    },
    scales: {
      x: {
        grid: {
          color: COR.linha,
          drawBorder: false,
        },
        ticks: {
          color: COR.bruma,
          font: {
            family: 'JetBrains Mono',
            size: 11,
          },
        },
      },
      y: eixoY
        ? {
            beginAtZero: true,
            grid: {
              color: COR.linha,
              drawBorder: false,
            },
            ticks: {
              color: COR.nevoa,
              font: {
                family: 'JetBrains Mono',
                size: 10,
              },
            },
          }
        : { display: false },
    },
  };
}

function tooltipTema() {
  // Configuração visual comum das tooltips dos gráficos.
  return {
    backgroundColor: '#152634',
    borderColor: '#2c4153',
    borderWidth: 1,
    titleColor: COR.gesso,
    bodyColor: COR.bruma,
    titleFont: { family: 'Space Grotesk' },
    bodyFont: { family: 'JetBrains Mono', size: 12 },
    padding: 10,
    cornerRadius: 8,
    displayColors: true,
    boxPadding: 4,
  };
}