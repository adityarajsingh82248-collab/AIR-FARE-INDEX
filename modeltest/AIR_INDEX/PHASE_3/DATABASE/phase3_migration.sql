-- Phase 3 additive migration. Phase 2 observation tables are reused as input.
CREATE TABLE IF NOT EXISTS index_methodology (
    methodology_version VARCHAR(64) PRIMARY KEY,
    base_period DATE NOT NULL,
    base_index NUMERIC(12,4) NOT NULL,
    representative_method VARCHAR(32) NOT NULL,
    weighting_method VARCHAR(64) NOT NULL,
    route_list JSONB NOT NULL,
    booking_windows JSONB NOT NULL,
    outlier_method VARCHAR(32) NOT NULL,
    quality_thresholds JSONB NOT NULL,
    fare_definition VARCHAR(32) NOT NULL DEFAULT 'total_fare',
    cabin_scope VARCHAR(32) NOT NULL DEFAULT 'Economy',
    data_source_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
    data_mode VARCHAR(32) NOT NULL DEFAULT 'DEVELOPMENT_SYNTHETIC' CHECK (data_mode IN ('FIXTURE','PUBLIC_HISTORICAL','DEVELOPMENT_SYNTHETIC','API_TEST','LIVE_API','LIVE_NDC','AUTHORIZED_SCRAPE','MIXED')),
    created_at TIMESTAMP NOT NULL DEFAULT now()
);
ALTER TABLE index_methodology ADD COLUMN IF NOT EXISTS fare_definition VARCHAR(32) NOT NULL DEFAULT 'total_fare';
ALTER TABLE index_methodology ADD COLUMN IF NOT EXISTS cabin_scope VARCHAR(32) NOT NULL DEFAULT 'Economy';
ALTER TABLE index_methodology ADD COLUMN IF NOT EXISTS data_source_rules JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE index_methodology ADD COLUMN IF NOT EXISTS data_mode VARCHAR(32) NOT NULL DEFAULT 'DEVELOPMENT_SYNTHETIC';
ALTER TABLE index_methodology DROP CONSTRAINT IF EXISTS index_methodology_data_mode_chk;
ALTER TABLE index_methodology ADD CONSTRAINT index_methodology_data_mode_chk CHECK (data_mode IN ('FIXTURE','PUBLIC_HISTORICAL','DEVELOPMENT_SYNTHETIC','API_TEST','LIVE_API','LIVE_NDC','AUTHORIZED_SCRAPE','MIXED'));

CREATE TABLE IF NOT EXISTS route_indices (
    id BIGSERIAL PRIMARY KEY,
    period DATE NOT NULL,
    route VARCHAR(7) NOT NULL,
    booking_window VARCHAR(6) NOT NULL,
    representative_price NUMERIC(12,2),
    base_price NUMERIC(12,2),
    index_value NUMERIC(14,6),
    sample_count INTEGER NOT NULL DEFAULT 0,
    weight NUMERIC(12,8),
    quality_score NUMERIC(8,6),
    quality_status VARCHAR(32) NOT NULL,
    data_mode VARCHAR(32) NOT NULL CHECK (data_mode IN ('FIXTURE','PUBLIC_HISTORICAL','DEVELOPMENT_SYNTHETIC','API_TEST','LIVE_API','LIVE_NDC','AUTHORIZED_SCRAPE','MIXED')),
    methodology_version VARCHAR(64) NOT NULL REFERENCES index_methodology(methodology_version),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE(period,route,booking_window,methodology_version)
);

CREATE TABLE IF NOT EXISTS overall_indices (
    id BIGSERIAL PRIMARY KEY,
    period DATE NOT NULL,
    booking_window VARCHAR(6),
    index_value NUMERIC(14,6),
    sample_count INTEGER NOT NULL DEFAULT 0,
    quality_score NUMERIC(8,6),
    quality_status VARCHAR(32) NOT NULL,
    data_mode VARCHAR(32) NOT NULL CHECK (data_mode IN ('FIXTURE','PUBLIC_HISTORICAL','DEVELOPMENT_SYNTHETIC','API_TEST','LIVE_API','LIVE_NDC','AUTHORIZED_SCRAPE','MIXED')),
    methodology_version VARCHAR(64) NOT NULL REFERENCES index_methodology(methodology_version),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE(period,booking_window,methodology_version)
);

CREATE TABLE IF NOT EXISTS headline_indices (
    id BIGSERIAL PRIMARY KEY,
    period DATE NOT NULL,
    index_value NUMERIC(14,6),
    sample_count INTEGER NOT NULL DEFAULT 0,
    route_coverage NUMERIC(8,6) NOT NULL DEFAULT 0,
    quality_score NUMERIC(8,6),
    quality_status VARCHAR(32) NOT NULL,
    data_mode VARCHAR(32) NOT NULL CHECK (data_mode IN ('FIXTURE','PUBLIC_HISTORICAL','DEVELOPMENT_SYNTHETIC','API_TEST','LIVE_API','LIVE_NDC','AUTHORIZED_SCRAPE','MIXED')),
    methodology_version VARCHAR(64) NOT NULL REFERENCES index_methodology(methodology_version),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE(period,methodology_version)
);

CREATE TABLE IF NOT EXISTS airline_indices (
    id BIGSERIAL PRIMARY KEY,
    period DATE NOT NULL,
    route VARCHAR(7) NOT NULL,
    booking_window VARCHAR(6) NOT NULL,
    airline VARCHAR(64) NOT NULL,
    representative_price NUMERIC(12,2),
    base_price NUMERIC(12,2),
    index_value NUMERIC(14,6),
    sample_count INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL,
    methodology_version VARCHAR(64) NOT NULL REFERENCES index_methodology(methodology_version),
    data_mode VARCHAR(32) NOT NULL CHECK (data_mode IN ('FIXTURE','PUBLIC_HISTORICAL','DEVELOPMENT_SYNTHETIC','API_TEST','LIVE_API','LIVE_NDC','AUTHORIZED_SCRAPE','MIXED')),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE(period,route,booking_window,airline,methodology_version)
);

CREATE TABLE IF NOT EXISTS index_quality (
    id BIGSERIAL PRIMARY KEY,
    period DATE NOT NULL,
    route VARCHAR(7),
    booking_window VARCHAR(6),
    sample_count INTEGER NOT NULL DEFAULT 0,
    missing_rate NUMERIC(8,6) DEFAULT 0,
    duplicate_rate NUMERIC(8,6) DEFAULT 0,
    outlier_rate NUMERIC(8,6) DEFAULT 0,
    source_count INTEGER DEFAULT 0,
    airline_count INTEGER DEFAULT 0,
    quality_score NUMERIC(8,6),
    quality_status VARCHAR(32) NOT NULL,
    methodology_version VARCHAR(64) NOT NULL REFERENCES index_methodology(methodology_version),
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

ALTER TABLE index_quality ADD COLUMN IF NOT EXISTS data_mode VARCHAR(32) NOT NULL DEFAULT 'DEVELOPMENT_SYNTHETIC';

CREATE TABLE IF NOT EXISTS index_weights (
    methodology_version VARCHAR(64) NOT NULL REFERENCES index_methodology(methodology_version),
    route VARCHAR(7) NOT NULL,
    weight NUMERIC(12,8) NOT NULL CHECK (weight >= 0),
    source_status VARCHAR(64) NOT NULL,
    source_reference TEXT,
    PRIMARY KEY(methodology_version,route)
);

CREATE INDEX IF NOT EXISTS idx_route_indices_period ON route_indices(period);
CREATE INDEX IF NOT EXISTS idx_route_indices_route ON route_indices(route);
CREATE INDEX IF NOT EXISTS idx_overall_indices_period ON overall_indices(period);
CREATE INDEX IF NOT EXISTS idx_headline_indices_period ON headline_indices(period);
CREATE INDEX IF NOT EXISTS idx_airline_indices_period ON airline_indices(period);
