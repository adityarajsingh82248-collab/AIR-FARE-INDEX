import pg from 'pg';
import { env } from './env.js';

const { Pool, Client } = pg;

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

/**
 * Executes a parameterized SQL query
 * @param {string} text - SQL statement with $1, $2 parameters
 * @param {Array} params - Array of parameter values
 */
export async function query(text, params = []) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (env.NODE_ENV === 'development') {
    if (duration > 100) {
      console.log('Executed query', { text, duration, rows: res.rowCount });
    }
  }
  return res;
}

/**
 * Returns a client from the pool for transactions
 */
export async function getClient() {
  return await pool.connect();
}

/**
 * Ensures the target database exists.
 * If the database does not exist (error 3D000), connects to 'postgres' default DB
 * and creates it automatically.
 */
async function ensureDatabaseExists() {
  try {
    const testClient = new Client({ connectionString: env.DATABASE_URL });
    await testClient.connect();
    await testClient.end();
  } catch (err) {
    if (err.code === '3D000') {
      const parsed = new URL(env.DATABASE_URL);
      const dbName = parsed.pathname.replace(/^\//, '');
      console.log(`Database "${dbName}" not found. Creating database...`);
      
      parsed.pathname = '/postgres';
      const rootClient = new Client({ connectionString: parsed.toString() });
      await rootClient.connect();
      await rootClient.query(`CREATE DATABASE "${dbName}"`);
      await rootClient.end();
      console.log(`Database "${dbName}" successfully created.`);
    } else {
      throw err;
    }
  }
}

/**
 * Initializes database schema (users, audit_logs, and session tables)
 */
export async function initDatabase() {
  try {
    await ensureDatabaseExists();

    const client = await pool.connect();
    client.release();

    // 1. Create users table if not existing
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        role VARCHAR(20) NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN')),
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP WITH TIME ZONE
      );
    `);

    // 2. Safe schema migrations for Google OAuth (make password_hash nullable, add google columns)
    await query(`ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS provider VARCHAR(50) DEFAULT 'local';`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture TEXT;`);

    // 3. Create audit_logs table
    await query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        details JSONB,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Create session table for connect-pg-simple PostgreSQL session store
    await query(`
      CREATE TABLE IF NOT EXISTS session (
        sid varchar NOT NULL COLLATE "default" PRIMARY KEY,
        sess json NOT NULL,
        expire timestamp(6) NOT NULL
      );
    `);

    // 5. Create indexes
    await query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_session_expire ON session (expire);`);

    // 6. Create airfare_observations table for the authoritative dataset
    await query(`
      CREATE TABLE IF NOT EXISTS airfare_observations (
        id SERIAL PRIMARY KEY,
        observation_date DATE NOT NULL,
        travel_date DATE NOT NULL,
        lead_days INTEGER NOT NULL,
        lead_label VARCHAR(10) NOT NULL,
        origin VARCHAR(5) NOT NULL,
        origin_city VARCHAR(100),
        destination VARCHAR(5) NOT NULL,
        destination_city VARCHAR(100),
        route VARCHAR(10) NOT NULL,
        airline VARCHAR(100) NOT NULL,
        airline_iata VARCHAR(5),
        flight_number VARCHAR(20),
        departure_time VARCHAR(10),
        arrival_time VARCHAR(10),
        distance_km INTEGER,
        stops INTEGER DEFAULT 0,
        cabin VARCHAR(50) DEFAULT 'Economy',
        fare_bucket VARCHAR(50),
        base_fare_inr NUMERIC(12,2),
        taxes_inr NUMERIC(12,2),
        fees_inr NUMERIC(12,2),
        total_fare_inr NUMERIC(12,2) NOT NULL,
        seats_available INTEGER,
        aircraft_capacity INTEGER,
        load_factor NUMERIC(8,4),
        demand_score NUMERIC(8,4),
        weekend_flag SMALLINT DEFAULT 0,
        holiday_flag SMALLINT DEFAULT 0,
        competition_count INTEGER,
        currency VARCHAR(5) DEFAULT 'INR',
        data_type VARCHAR(50),
        route_horizon_median_fare_inr NUMERIC(12,2),
        fare_vs_route_median_pct NUMERIC(10,4),
        market_median_fare_inr NUMERIC(12,2),
        t45_baseline_fare_inr NUMERIC(12,2),
        market_horizon_index_t45_100 NUMERIC(10,4)
      );
    `);

    // 7. Indexes for airfare_observations (query performance)
    await query(`CREATE INDEX IF NOT EXISTS idx_ao_route ON airfare_observations(route);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_ao_airline ON airfare_observations(airline);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_ao_lead_label ON airfare_observations(lead_label);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_ao_origin_dest ON airfare_observations(origin, destination);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_ao_observation_date ON airfare_observations(observation_date);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_ao_travel_date ON airfare_observations(travel_date);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_ao_route_lead ON airfare_observations(route, lead_label);`);

    console.log('PostgreSQL database schema and session store initialized successfully.');

  } catch (error) {
    console.error('Database initialization error:', error.message);
    throw error;
  }
}

export default {
  pool,
  query,
  getClient,
  initDatabase,
};
