// Configuração central do backend.
// Lê variáveis de ambiente e define valores por defeito para execução local.

module.exports = {
  port: parseInt(process.env.PORT || '3000', 10),

  db: {
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT || '5432', 10),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    database: process.env.PGDATABASE || 'igv',

    // Parâmetros do pool de ligações PostgreSQL.
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  },
};