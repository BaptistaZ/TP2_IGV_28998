// Estilos das feições de freguesia.
// Define os estilos base, hover, ativo e repouso com suporte à coropleta.

function estiloFreguesia() {
  return {
    color: '#6ea8e6',
    weight: 1.1,
    fillColor: '#6ea8e6',
    fillOpacity: 0.05,
  };
}

function estiloFreguesiaHover() {
  return {
    color: '#9bc2f0',
    weight: 1.8,
    fillColor: '#6ea8e6',
    fillOpacity: 0.12,
  };
}

function estiloFreguesiaAtiva() {
  return {
    color: '#e3a857',
    weight: 2.6,
    fillColor: '#e3a857',
    fillOpacity: 0.14,
  };
}

function estiloRepousoFreguesia(layer) {
  // Quando a coropleta está ativa, repõe a cor correspondente à classe da freguesia.
  if (coropletaAtiva && coropletaQuebras && indicadoresCache) {
    const dt = layer?.feature?.properties?.dtmnfr;
    const reg = indicadoresCache.find((d) => d.dtmnfr === dt);

    if (reg) {
      const cor = corDaClasse(Number(reg[coropletaAtiva]), coropletaQuebras);

      return {
        color: '#1c3242',
        weight: 1,
        fillColor: cor,
        fillOpacity: 0.78,
      };
    }
  }

  return estiloFreguesia();
}