-- ============================================================
-- AIR-INDEX (SIH26056) — Phase 1 PostgreSQL Schema
-- Scope: core reference tables + the cleaned observations table only.
-- index_values / anomalies / forecasts are stubbed as future tables
-- (Phase 3+) since no index/ML output exists yet — do not populate.
-- ============================================================

-- ---------- Reference tables ----------

CREATE TABLE routes (
    route_id        SERIAL PRIMARY KEY,
    origin          CHAR(3) NOT NULL,
    destination     CHAR(3) NOT NULL,
    route_code      VARCHAR(7) GENERATED ALWAYS AS (origin || '-' || destination) STORED,
    route_weight    NUMERIC(10,6),      -- NULL until official DGCA-traffic-based weighting is defined
    weight_status   VARCHAR(20) NOT NULL DEFAULT 'WEIGHT_PENDING',
    UNIQUE (origin, destination)
);

CREATE TABLE airlines (
    airline_id      SERIAL PRIMARY KEY,
    airline_name    VARCHAR(64) NOT NULL UNIQUE   -- canonical name, per airline_master_mapping.csv
);

CREATE TABLE sources (
    source_id       SERIAL PRIMARY KEY,
    source_name     VARCHAR(64) NOT NULL UNIQUE   -- e.g. 'Sample Data' today; real OTAs/airline sites in Phase 2
);

-- ---------- Core fact table ----------

CREATE TABLE airfare_observations (
    observation_id          VARCHAR(16) PRIMARY KEY,     -- e.g. A0001, matches source CSV id
    route_id                INTEGER NOT NULL REFERENCES routes(route_id),
    airline_id               INTEGER NOT NULL REFERENCES airlines(airline_id),
    source_id                INTEGER NOT NULL REFERENCES sources(source_id),

    travel_date              DATE NOT NULL,
    search_date               DATE NOT NULL,
    search_time                TIME NOT NULL,
    lead_time_label            VARCHAR(6) NOT NULL,        -- 'T+1'...'T+45'
    lead_time_days             INTEGER NOT NULL,

    fare_class                 VARCHAR(20) NOT NULL DEFAULT 'Economy',
    base_fare                  NUMERIC(10,2) NOT NULL CHECK (base_fare >= 0),
    taxes                      NUMERIC(10,2) NOT NULL CHECK (taxes >= 0),
    fees                       NUMERIC(10,2) NOT NULL CHECK (fees >= 0),
    total_fare                 NUMERIC(10,2) NOT NULL CHECK (total_fare >= 0),

    availability                VARCHAR(20) NOT NULL
        CHECK (availability IN ('AVAILABLE','SOLD_OUT','UNAVAILABLE','SCRAPE_ERROR','MISSING')),
    usable_for_index            BOOLEAN NOT NULL DEFAULT FALSE,

    fare_consistency_flag       VARCHAR(20) NOT NULL
        CHECK (fare_consistency_flag IN ('VALID','MINOR_DIFFERENCE','INVALID','MISSING_COMPONENT')),
    validation_status           VARCHAR(10) NOT NULL CHECK (validation_status IN ('VALID','INVALID')),
    validation_reason           TEXT,
    duplicate_flag              VARCHAR(30) NOT NULL DEFAULT 'UNIQUE',
    outlier_flag                VARCHAR(20) NOT NULL DEFAULT 'NORMAL'
        CHECK (outlier_flag IN ('NORMAL','STATISTICAL_OUTLIER')),

    collected_timestamp         TIMESTAMP NOT NULL,
    inserted_at                 TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_obs_route_date       ON airfare_observations (route_id, travel_date);
CREATE INDEX idx_obs_airline          ON airfare_observations (airline_id);
CREATE INDEX idx_obs_search_date      ON airfare_observations (search_date);
CREATE INDEX idx_obs_lead_time        ON airfare_observations (lead_time_label);
CREATE INDEX idx_obs_usable_for_index ON airfare_observations (usable_for_index) WHERE usable_for_index = TRUE;

-- ============================================================
-- FUTURE TABLES (do not create/populate until their phase begins)
-- ============================================================

-- Phase 3 (Simran): anomaly detection output
-- CREATE TABLE anomalies (
--     anomaly_id      SERIAL PRIMARY KEY,
--     observation_id  VARCHAR(16) REFERENCES airfare_observations(observation_id),
--     anomaly_score   NUMERIC(6,4),
--     status          VARCHAR(20),
--     detected_at     TIMESTAMP DEFAULT now()
-- );

-- Phase 3 (Priyal): forecasting output
-- CREATE TABLE forecasts (
--     forecast_id       SERIAL PRIMARY KEY,
--     route_id          INTEGER REFERENCES routes(route_id),
--     forecast_date     DATE,
--     predicted_value   NUMERIC(10,2),
--     model_version     VARCHAR(32),
--     generated_at      TIMESTAMP DEFAULT now()
-- );

-- Phase 2/3 (Jatin): APIx index output
-- CREATE TABLE index_values (
--     index_id          SERIAL PRIMARY KEY,
--     date              DATE,
--     route_id          INTEGER REFERENCES routes(route_id),   -- NULL for overall (all-India) index
--     representative_fare NUMERIC(10,2),
--     route_index       NUMERIC(10,4),
--     overall_index     NUMERIC(10,4),
--     base_period        DATE
-- );
