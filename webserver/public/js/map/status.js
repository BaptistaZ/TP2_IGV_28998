// Barra de estado.
// Atualiza coordenadas, zoom, escala aproximada e mensagens de estado.

function atualizarCoordenadas(latlng) {
  txt('be-lat', latlng.lat.toFixed(5));
  txt('be-lng', latlng.lng.toFixed(5));
}

function atualizarEstadoMapa() {
  if (!map) return;

  txt('be-zoom', map.getZoom().toFixed(0));
  txt('be-escala', `1:${formatarNumero(Math.round(escalaAproximada()))}`);
}

function escalaAproximada() {
  const centro = map.getCenter();

  // Estima a escala visual com base na latitude, zoom e resolução aproximada de 96 dpi.
  const metrosPorPixel =
    (40075016.686 * Math.abs(Math.cos(centro.lat * Math.PI / 180))) /
    Math.pow(2, map.getZoom() + 8);

  return metrosPorPixel * 96 * 39.3701;
}

function estadoBarra(texto) {
  txt('be-msg', texto);
}