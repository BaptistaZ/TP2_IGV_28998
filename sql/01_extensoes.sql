CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_raster;

ALTER DATABASE igv SET postgis.gdal_enabled_drivers = 'ENABLE_ALL';
ALTER DATABASE igv SET postgis.enable_outdb_rasters  = true;

SET postgis.gdal_enabled_drivers = 'ENABLE_ALL';
SET postgis.enable_outdb_rasters  = true;

SELECT postgis_full_version();