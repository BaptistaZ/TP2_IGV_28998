// Configuração global do cliente.
// Define endpoints da API, GeoServer, vista inicial do mapa e nomes das camadas.

const CONFIG = {
  API: '/api',

  GEOSERVER: 'http://localhost:8080/geoserver',
  WORKSPACE: 'igv',

  MAPA: {
    centro: [41.69, -8.78],
    zoom: 11,
    zoomMin: 9,
    zoomMax: 18,
  },

  DEM_TIF: '/api/freguesias/concelho/dem.tif',
};

// Identificadores das camadas publicadas no workspace GeoServer.
CONFIG.LAYERS = {
  freguesiasWMS: `${CONFIG.WORKSPACE}:freguesias`,
  subseccoesWMS: `${CONFIG.WORKSPACE}:subseccoes`,
  alojamentoWMS: `${CONFIG.WORKSPACE}:alojamento_local`,
  demWMS: `${CONFIG.WORKSPACE}:dem`,
};