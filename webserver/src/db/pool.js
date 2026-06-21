// Pool de ligações PostgreSQL/PostGIS.
// Centraliza as consultas à base de dados e inclui suporte temporário a GDAL.

const { Pool } = require('pg');
const { db } = require('../config/env');

const pool = new Pool(db);

pool.on('error', (err) => {
  console.error('Erro inesperado num cliente do pool PostgreSQL:', err.message);
});

async function query(text, params) {
  return pool.query(text, params);
}

async function queryComGdal(sql, params) {
  const client = await pool.connect();

  try {
    // Ativa drivers GDAL apenas dentro desta transação.
    // Necessário para operações raster como ST_AsTIFF e ST_Slope.
    await client.query('BEGIN');
    await client.query("SET LOCAL postgis.gdal_enabled_drivers = 'ENABLE_ALL'");

    const r = await client.query(sql, params);

    await client.query('COMMIT');

    return r;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {}

    throw err;
  } finally {
    client.release();
  }
}

async function testConnection() {
  // Confirma a ligação à base de dados e devolve a versão do PostGIS.
  const r = await query('SELECT postgis_version() AS v;');

  return r.rows[0].v;
}

async function close() {
  await pool.end();
}

module.exports = {
  pool,
  query,
  queryComGdal,
  testConnection,
  close,
};