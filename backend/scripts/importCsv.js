/**
 * CSV Import Script
 * ──────────────────
 * Imports airfare_index_upgraded_8airports.csv into PostgreSQL airfare_observations table.
 *
 * Usage:
 *   cd backend && npm run import:data
 *
 * Behavior:
 *   - TRUNCATES the airfare_observations table first (safe re-import)
 *   - Reads the CSV in streaming batches of 2000 rows
 *   - Inserts all 68,400 records
 *   - Prints progress every 10,000 rows
 *   - Does NOT touch users, audit_logs, or session tables
 */

import { createReadStream } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const CSV_PATH = resolve(__dirname, '../../datasetmodel/airfare_index_upgraded_8airports.csv');

const BATCH_SIZE = 1800;

function parseFloat2(v) {
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function parseInt2(v) {
  const n = parseInt(v, 10);
  return isNaN(n) ? null : n;
}

function parseDate(v) {
  if (!v || v.trim() === '') return null;
  return v.trim();
}

async function ensureTableExists(client) {
  await client.query(`
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

  // Create indexes
  await client.query(`CREATE INDEX IF NOT EXISTS idx_ao_route ON airfare_observations(route);`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_ao_airline ON airfare_observations(airline);`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_ao_lead_label ON airfare_observations(lead_label);`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_ao_origin_dest ON airfare_observations(origin, destination);`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_ao_observation_date ON airfare_observations(observation_date);`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_ao_travel_date ON airfare_observations(travel_date);`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_ao_route_lead ON airfare_observations(route, lead_label);`);
}

async function insertBatch(client, rows) {
  if (rows.length === 0) return;

  // Build parameterized insert
  const cols = [
    'observation_date', 'travel_date', 'lead_days', 'lead_label',
    'origin', 'origin_city', 'destination', 'destination_city',
    'route', 'airline', 'airline_iata', 'flight_number',
    'departure_time', 'arrival_time', 'distance_km', 'stops',
    'cabin', 'fare_bucket', 'base_fare_inr', 'taxes_inr', 'fees_inr',
    'total_fare_inr', 'seats_available', 'aircraft_capacity',
    'load_factor', 'demand_score', 'weekend_flag', 'holiday_flag',
    'competition_count', 'currency', 'data_type',
    'route_horizon_median_fare_inr', 'fare_vs_route_median_pct',
    'market_median_fare_inr', 't45_baseline_fare_inr', 'market_horizon_index_t45_100'
  ];

  const numCols = cols.length;
  const placeholders = rows.map((_, rowIdx) =>
    `(${cols.map((_, colIdx) => `$${rowIdx * numCols + colIdx + 1}`).join(', ')})`
  ).join(', ');

  const values = rows.flatMap((r) => [
    r.observation_date, r.travel_date, r.lead_days, r.lead_label,
    r.origin, r.origin_city, r.destination, r.destination_city,
    r.route, r.airline, r.airline_iata, r.flight_number,
    r.departure_time, r.arrival_time, r.distance_km, r.stops,
    r.cabin, r.fare_bucket, r.base_fare_inr, r.taxes_inr, r.fees_inr,
    r.total_fare_inr, r.seats_available, r.aircraft_capacity,
    r.load_factor, r.demand_score, r.weekend_flag, r.holiday_flag,
    r.competition_count, r.currency, r.data_type,
    r.route_horizon_median_fare_inr, r.fare_vs_route_median_pct,
    r.market_median_fare_inr, r.t45_baseline_fare_inr, r.market_horizon_index_t45_100
  ]);

  await client.query(
    `INSERT INTO airfare_observations (${cols.join(', ')}) VALUES ${placeholders}`,
    values
  );
}

async function main() {
  console.log('🚀 AirIndex CSV Import Script');
  console.log(`📁 Source: ${CSV_PATH}`);
  console.log(`🗄️  Database: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@')}`);
  console.log('');

  const client = await pool.connect();
  try {
    console.log('📋 Ensuring table schema exists...');
    await ensureTableExists(client);

    console.log('🗑️  Truncating airfare_observations (safe re-import)...');
    await client.query('TRUNCATE TABLE airfare_observations RESTART IDENTITY;');

    console.log('📂 Reading CSV file...');
    const rl = readline.createInterface({
      input: createReadStream(CSV_PATH, { encoding: 'utf8' }),
      crlfDelay: Infinity,
    });

    let headers = null;
    let batch = [];
    let totalRows = 0;
    let skippedRows = 0;

    for await (const line of rl) {
      if (!headers) {
        headers = line.split(',').map((h) => h.trim());
        console.log(`📊 CSV columns: ${headers.length} columns detected`);
        continue;
      }

      const values = line.split(',');
      if (values.length < headers.length) {
        skippedRows++;
        continue;
      }

      const raw = {};
      headers.forEach((h, i) => {
        raw[h] = (values[i] || '').trim();
      });

      const totalFare = parseFloat2(raw.total_fare_inr);
      if (totalFare === null || totalFare <= 0) {
        skippedRows++;
        continue;
      }

      batch.push({
        observation_date: parseDate(raw.observation_date),
        travel_date: parseDate(raw.travel_date),
        lead_days: parseInt2(raw.lead_days) || 0,
        lead_label: raw.lead_label || 'T+0',
        origin: (raw.origin || '').toUpperCase(),
        origin_city: raw.origin_city || null,
        destination: (raw.destination || '').toUpperCase(),
        destination_city: raw.destination_city || null,
        route: raw.route || `${raw.origin}-${raw.destination}`,
        airline: raw.airline || null,
        airline_iata: raw.airline_iata || null,
        flight_number: raw.flight_number || null,
        departure_time: raw.departure_time || null,
        arrival_time: raw.arrival_time || null,
        distance_km: parseInt2(raw.distance_km),
        stops: parseInt2(raw.stops) || 0,
        cabin: raw.cabin || 'Economy',
        fare_bucket: raw.fare_bucket || null,
        base_fare_inr: parseFloat2(raw.base_fare_inr),
        taxes_inr: parseFloat2(raw.taxes_inr),
        fees_inr: parseFloat2(raw.fees_inr),
        total_fare_inr: totalFare,
        seats_available: parseInt2(raw.seats_available),
        aircraft_capacity: parseInt2(raw.aircraft_capacity),
        load_factor: parseFloat2(raw.load_factor),
        demand_score: parseFloat2(raw.demand_score),
        weekend_flag: parseInt2(raw.weekend_flag) || 0,
        holiday_flag: parseInt2(raw.holiday_flag) || 0,
        competition_count: parseInt2(raw.competition_count),
        currency: raw.currency || 'INR',
        data_type: raw.data_type || null,
        route_horizon_median_fare_inr: parseFloat2(raw.route_horizon_median_fare_inr),
        fare_vs_route_median_pct: parseFloat2(raw.fare_vs_route_median_pct),
        market_median_fare_inr: parseFloat2(raw.market_median_fare_inr),
        t45_baseline_fare_inr: parseFloat2(raw.t45_baseline_fare_inr),
        market_horizon_index_t45_100: parseFloat2(raw.market_horizon_index_t45_100),
      });

      if (batch.length >= BATCH_SIZE) {
        await insertBatch(client, batch);
        totalRows += batch.length;
        batch = [];
        if (totalRows % 10000 === 0) {
          console.log(`  ✓ Inserted ${totalRows.toLocaleString()} rows...`);
        }
      }
    }

    // Final batch
    if (batch.length > 0) {
      await insertBatch(client, batch);
      totalRows += batch.length;
    }

    // Verify
    const countResult = await client.query('SELECT COUNT(*) FROM airfare_observations');
    const dbCount = parseInt(countResult.rows[0].count);

    const routesResult = await client.query('SELECT COUNT(DISTINCT route) as cnt FROM airfare_observations');
    const airportsResult = await client.query('SELECT COUNT(DISTINCT origin) as cnt FROM airfare_observations');
    const airlinesResult = await client.query('SELECT COUNT(DISTINCT airline) as cnt FROM airfare_observations');
    const dateResult = await client.query(`
      SELECT MIN(observation_date)::text as min_date, MAX(observation_date)::text as max_date 
      FROM airfare_observations
    `);

    console.log('');
    console.log('✅ Import Complete!');
    console.log('─────────────────────────────────────');
    console.log(`📈 Rows processed:     ${totalRows.toLocaleString()}`);
    console.log(`⏭️  Rows skipped:       ${skippedRows.toLocaleString()}`);
    console.log(`🗄️  Rows in database:  ${dbCount.toLocaleString()}`);
    console.log(`🛣️  Distinct routes:   ${routesResult.rows[0].cnt}`);
    console.log(`✈️  Distinct airports: ${airportsResult.rows[0].cnt}`);
    console.log(`🏢 Distinct airlines: ${airlinesResult.rows[0].cnt}`);
    console.log(`📅 Date range:         ${dateResult.rows[0].min_date} to ${dateResult.rows[0].max_date}`);
    console.log('─────────────────────────────────────');

  } catch (err) {
    console.error('❌ Import failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
