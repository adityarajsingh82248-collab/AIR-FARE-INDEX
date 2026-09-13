CREATE INDEX IF NOT EXISTS idx_obs_collection_run ON airfare_observations(collection_run_id);

ALTER TABLE airfare_observations ADD COLUMN IF NOT EXISTS data_mode VARCHAR(32) DEFAULT 'FIXTURE';
