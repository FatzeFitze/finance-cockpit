export const WEALTH_PRICE_SCHEMA_SQL = `
  CREATE TABLE wealth_price_observations (
    id TEXT PRIMARY KEY NOT NULL,
    asset_id TEXT NOT NULL,
    observed_at TEXT NOT NULL,
    price TEXT NOT NULL,
    currency TEXT NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('MANUAL', 'IMPORT')),
    source_ref TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (asset_id) REFERENCES wealth_assets(id) ON DELETE RESTRICT
  );

  CREATE INDEX wealth_price_observations_asset_date_idx
    ON wealth_price_observations(asset_id, observed_at DESC, id DESC);
`;
