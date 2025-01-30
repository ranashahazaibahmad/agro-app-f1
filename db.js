// db.js
const { Pool } = require('pg');
require('dotenv').config();

let pool;

const getDbConnection = () => {
  if (!pool) {
    console.log('Initializing new PostgreSQL connection pool');
    
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,  // For external services like AWS or Neon
      },
    });

    pool.on('connect', () => {
      console.log('Connected to the PostgreSQL database');
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client', err);
      process.exit(-1);
    });
  } else {
    console.log('Reusing existing PostgreSQL connection pool');
  }

  return pool;
};

module.exports = {
  query: (text, params) => getDbConnection().query(text, params),
};
