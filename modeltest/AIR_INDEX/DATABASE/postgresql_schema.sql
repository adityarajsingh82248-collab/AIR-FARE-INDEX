-- AIR-INDEX Phase 2 schema.
-- No route weights are fabricated; they remain NULL/WEIGHT_PENDING.

CREATE TABLE IF NOT EXISTS routes (
    route_id SERIAL PRIMARY KEY,
    origin CHAR(3) NOT NULL,
    destination CHAR(3) NOT NULL,
    route_code VARCHAR(7) GENERATED ALWAYS AS (origin || '-' || destination) STORED,
    route_weight NUMERIC(10,6),
    weight_status VARCHAR(20) NOT NULL DEFAULT 'WEIGHT_PENDING',
    UNIQUE(origin,destination),
    CHECK (origin <> destination)
);

CREATE TABLE IF NOT EXISTS airlines (
    airline_id SERIAL PRIMARY KEY,
    airline_name VARCHAR(64) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS sources (
    source_id SERIAL PRIMARY KEY,
    source_name VARCHAR(64) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS collection_runs (
    run_id VARCHAR(80) PRIMARY KEY,
    started_at TIMESTAMP NOT NULL,
    finished_at TIMESTAMP,
    source VARCHAR(64) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('RUNNING','SUCCESS','PARTIAL_SUCCESS','FAILED')),
    records_attempted INTEGER NOT NULL DEFAULT 0,
    records_collected INTEGER NOT NULL DEFAULT 0,
    records_valid INTEGER NOT NULL DEFAULT 0,
    records_rejected INTEGER NOT NULL DEFAULT 0,
    records_inserted INTEGER NOT NULL DEFAULT 0,
    error_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS collection_logs (
    log_id BIGSERIAL PRIMARY KEY,
    run_id VARCHAR(80) REFERENCES collection_runs(run_id),
    timestamp TIMESTAMP NOT NULL DEFAULT now(),
    source VARCHAR(64) NOT NULL,
    origin CHAR(3),
    destination CHAR(3),
    route VARCHAR(7),
    travel_date DATE,
    booking_window VARCHAR(6),
    status VARCHAR(20) NOT NULL,
    records_collected INTEGER DEFAULT 0,
    records_rejected INTEGER DEFAULT 0,
    error_type VARCHAR(128),
    error_message TEXT,
    duration NUMERIC(12,3)
);

CREATE TABLE IF NOT EXISTS airfare_observations (
    observation_id VARCHAR(100) PRIMARY KEY,
    route_id INTEGER NOT NULL REFERENCES routes(route_id),
    airline_id INTEGER NOT NULL REFERENCES airlines(airline_id),
    source_id INTEGER NOT NULL REFERENCES sources(source_id),
    travel_date DATE NOT NULL,
    search_date DATE NOT NULL,
    search_time TIME NOT NULL,
    lead_time_label VARCHAR(6) NOT NULL CHECK (lead_time_label IN ('T+1','T+7','T+15','T+30','T+45')),
    lead_time_days INTEGER NOT NULL CHECK (lead_time_days > 0),
    fare_class VARCHAR(20) NOT NULL DEFAULT 'Economy',
    base_fare NUMERIC(10,2),
    taxes NUMERIC(10,2),
    fees NUMERIC(10,2),
    total_fare NUMERIC(10,2),
    availability VARCHAR(20) NOT NULL CHECK (availability IN ('AVAILABLE','SOLD_OUT','MISSING','UNKNOWN')),
    usable_for_index BOOLEAN NOT NULL DEFAULT FALSE,
    fare_consistency_flag VARCHAR(20) NOT NULL CHECK (fare_consistency_flag IN ('VALID','MINOR_DIFFERENCE','INVALID','MISSING_COMPONENT')),
    validation_status VARCHAR(10) NOT NULL CHECK (validation_status IN ('VALID','INVALID')),
    validation_reason TEXT,
    duplicate_flag VARCHAR(30) NOT NULL DEFAULT 'UNIQUE',
    outlier_flag VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    collected_timestamp TIMESTAMP NOT NULL,
    inserted_at TIMESTAMP NOT NULL DEFAULT now(),
    collection_run_id VARCHAR(80) REFERENCES collection_runs(run_id),
    source_url TEXT,
    collector_name VARCHAR(128),
    currency CHAR(3) DEFAULT 'INR',
    data_mode VARCHAR(32) DEFAULT 'FIXTURE' CHECK (data_mode IN ('FIXTURE','PUBLIC_HISTORICAL','DEVELOPMENT_SYNTHETIC','API_TEST','LIVE_API','LIVE_NDC','AUTHORIZED_SCRAPE')),
    flight_number VARCHAR(32),
    departure_time VARCHAR(16),
    arrival_time VARCHAR(16),
    duration VARCHAR(32),
    stops INTEGER
);

CREATE INDEX IF NOT EXISTS idx_obs_route_date ON airfare_observations(route_id,travel_date);
CREATE INDEX IF NOT EXISTS idx_obs_route ON airfare_observations(route_id);
CREATE INDEX IF NOT EXISTS idx_obs_airline ON airfare_observations(airline_id);
CREATE INDEX IF NOT EXISTS idx_obs_source ON airfare_observations(source_id);
CREATE INDEX IF NOT EXISTS idx_obs_travel_date ON airfare_observations(travel_date);
CREATE INDEX IF NOT EXISTS idx_obs_search_date ON airfare_observations(search_date);
CREATE INDEX IF NOT EXISTS idx_obs_lead_time ON airfare_observations(lead_time_label);
CREATE INDEX IF NOT EXISTS idx_obs_timestamp ON airfare_observations(collected_timestamp);
CREATE INDEX IF NOT EXISTS idx_obs_usable ON airfare_observations(usable_for_index) WHERE usable_for_index=TRUE;
