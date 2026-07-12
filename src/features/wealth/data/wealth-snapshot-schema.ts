export const WEALTH_SNAPSHOT_SCHEMA_SQL = `
  CREATE TABLE wealth_portfolio_snapshots (
    id TEXT PRIMARY KEY NOT NULL,
    portfolio_id TEXT NOT NULL,
    snapshot_date TEXT NOT NULL,
    total_value TEXT NOT NULL,
    base_currency TEXT NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('MANUAL', 'IMPORT')),
    reported_total_value TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (portfolio_id) REFERENCES wealth_portfolios(id) ON DELETE RESTRICT
  );

  CREATE INDEX wealth_portfolio_snapshots_portfolio_date_idx
    ON wealth_portfolio_snapshots(portfolio_id, snapshot_date DESC, id DESC);
`;
