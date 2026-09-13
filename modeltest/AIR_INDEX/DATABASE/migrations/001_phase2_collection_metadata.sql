-- Adds Phase 2 run bookkeeping and observation lineage fields to a Phase 1-compatible database.
ALTER TABLE collection_runs ADD COLUMN IF NOT EXISTS records_attempted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE collection_runs ADD COLUMN IF NOT EXISTS records_valid INTEGER NOT NULL DEFAULT 0;
ALTER TABLE collection_runs ADD COLUMN IF NOT EXISTS error_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE collection_logs ADD COLUMN IF NOT EXISTS origin CHAR(3);
ALTER TABLE collection_logs ADD COLUMN IF NOT EXISTS destination CHAR(3);
ALTER TABLE collection_logs ADD COLUMN IF NOT EXISTS booking_window VARCHAR(6);
ALTER TABLE collection_logs ADD COLUMN IF NOT EXISTS records_rejected INTEGER DEFAULT 0;
ALTER TABLE collection_logs ADD COLUMN IF NOT EXISTS duration NUMERIC(12,3);
ALTER TABLE airfare_observations ADD COLUMN IF NOT EXISTS collection_run_id VARCHAR(80) REFERENCES collection_runs(run_id);
ALTER TABLE airfare_observations ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE airfare_observations ADD COLUMN IF NOT EXISTS collector_name VARCHAR(128);
ALTER TABLE airfare_observations ADD COLUMN IF NOT EXISTS currency CHAR(3) DEFAULT 'INR';
ALTER TABLE airfare_observations ADD COLUMN IF NOT EXISTS flight_number VARCHAR(32);
ALTER TABLE airfare_observations ADD COLUMN IF NOT EXISTS departure_time VARCHAR(16);
ALTER TABLE airfare_observations ADD COLUMN IF NOT EXISTS arrival_time VARCHAR(16);
ALTER TABLE airfare_observations ADD COLUMN IF NOT EXISTS duration VARCHAR(32);
ALTER TABLE airfare_observations ADD COLUMN IF NOT EXISTS stops INTEGER;
