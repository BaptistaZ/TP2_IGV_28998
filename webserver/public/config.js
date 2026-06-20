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

  DEM_TIF: '/geotiff/dem_vc_25m.tif',
};

CONFIG.LAYERS = {
  freguesiasWMS: `${CONFIG.WORKSPACE}:freguesias`,
  subseccoesWMS: `${CONFIG.WORKSPACE}:subseccoes`,
  alojamentoWMS: `${CONFIG.WORKSPACE}:alojamento_local`,
  demWMS: `${CONFIG.WORKSPACE}:dem`,
};
