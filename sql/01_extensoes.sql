-- Ativa suporte espacial vetorial e raster no PostGIS.
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_raster;

-- Permite utilização de drivers GDAL e rasters externos na base de dados.
ALTER DATABASE igv SET postgis.gdal_enabled_drivers = 'ENABLE_ALL';
ALTER DATABASE igv SET postgis.enable_outdb_rasters  = true;

SET postgis.gdal_enabled_drivers = 'ENABLE_ALL';
SET postgis.enable_outdb_rasters  = true;

-- Confirma a versão e configuração ativa do PostGIS.
SELECT postgis_full_version();