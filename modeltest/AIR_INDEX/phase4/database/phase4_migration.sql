-- Phase 4 additive migration.
-- Apply AFTER Phase 2 schema (DATABASE/postgresql_schema.sql)
-- AND Phase 3 migration (PHASE_3/DATABASE/phase3_migration.sql).
--
-- Tables: forecasts, anomalies, model_registry, model_metrics

-- Before creating any new table, we checked the Phase 3 schema:
-- index_quality exists but covers index-level quality, not ML model quality.
-- No existing tables cover forecasts, anomalies (ML), or model registry.

CREATE TABLE IF NOT EXISTS model_registry (
    model_id        BIGSERIAL PRIMARY KEY,
    model_version   VARCHAR(128) NOT NULL UNIQUE,
    model_type      VARCHAR(64) NOT NULL,
    model_name      VARCHAR(128) NOT NULL,
    methodology_version VARCHAR(64) NOT NULL REFERENCES index_methodology(methodology_version),
    feature_version VARCHAR(128),
    training_date   TIMESTAMP NOT NULL,
    training_period_start DATE,
    training_period_end   DATE,
    feature_names   JSONB,
    artifact_path   TEXT,
    data_mode       VARCHAR(32) NOT NULL DEFAULT 'DEVELOPMENT_SYNTHETIC'
        CHECK (data_mode IN ('FIXTURE','PUBLIC_HISTORICAL','DEVELOPMENT_SYNTHETIC',
                             'API_TEST','LIVE_API','LIVE_NDC','AUTHORIZED_SCRAPE','MIXED')),
    created_at      TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS model_metrics (
    id              BIGSERIAL PRIMARY KEY,
    model_version   VARCHAR(128) NOT NULL REFERENCES model_registry(model_version),
    metric_name     VARCHAR(64) NOT NULL,
    metric_value    NUMERIC(14,6),
    eval_set        VARCHAR(32) NOT NULL CHECK (eval_set IN ('train','validation','test')),
    n_samples       INTEGER,
    created_at      TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE(model_version, metric_name, eval_set)
);

CREATE TABLE IF NOT EXISTS forecasts (
    forecast_id     BIGSERIAL PRIMARY KEY,
    model_version   VARCHAR(128) NOT NULL REFERENCES model_registry(model_version),
    target          VARCHAR(64) NOT NULL DEFAULT 'AIR_INDEX',
    forecast_date   DATE NOT NULL,
    horizon         INTEGER NOT NULL DEFAULT 1,
    predicted_value NUMERIC(14,6) NOT NULL,
    lower_bound     NUMERIC(14,6),
    upper_bound     NUMERIC(14,6),
    generated_at    TIMESTAMP NOT NULL DEFAULT now(),
    training_data_version VARCHAR(128),
    methodology_version   VARCHAR(64) REFERENCES index_methodology(methodology_version),
    data_mode       VARCHAR(32) NOT NULL DEFAULT 'DEVELOPMENT_SYNTHETIC'
        CHECK (data_mode IN ('FIXTURE','PUBLIC_HISTORICAL','DEVELOPMENT_SYNTHETIC',
                             'API_TEST','LIVE_API','LIVE_NDC','AUTHORIZED_SCRAPE','MIXED')),
    UNIQUE(model_version, forecast_date, horizon, target)
);

CREATE TABLE IF NOT EXISTS anomalies (
    anomaly_id      BIGSERIAL PRIMARY KEY,
    period          DATE NOT NULL,
    route           VARCHAR(7),
    booking_window  VARCHAR(6),
    observed_value  NUMERIC(14,6) NOT NULL,
    expected_value  NUMERIC(14,6),
    deviation       NUMERIC(14,6),
    anomaly_score   NUMERIC(10,6),
    severity        VARCHAR(10) NOT NULL CHECK (severity IN ('LOW','MEDIUM','HIGH')),
    method          VARCHAR(64) NOT NULL,
    model_version   VARCHAR(128),
    detected_at     TIMESTAMP NOT NULL DEFAULT now(),
    data_mode       VARCHAR(32) NOT NULL DEFAULT 'DEVELOPMENT_SYNTHETIC'
        CHECK (data_mode IN ('FIXTURE','PUBLIC_HISTORICAL','DEVELOPMENT_SYNTHETIC',
                             'API_TEST','LIVE_API','LIVE_NDC','AUTHORIZED_SCRAPE','MIXED'))
);

CREATE INDEX IF NOT EXISTS idx_forecasts_date ON forecasts(forecast_date);
CREATE INDEX IF NOT EXISTS idx_forecasts_model ON forecasts(model_version);
CREATE INDEX IF NOT EXISTS idx_anomalies_period ON anomalies(period);
CREATE INDEX IF NOT EXISTS idx_anomalies_route ON anomalies(route);
CREATE INDEX IF NOT EXISTS idx_anomalies_severity ON anomalies(severity);
CREATE INDEX IF NOT EXISTS idx_model_metrics_version ON model_metrics(model_version);
