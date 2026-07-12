export const WEALTH_SCHEMA_SQL = `
  CREATE TABLE wealth_portfolios (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    base_currency TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE wealth_accounts (
    id TEXT PRIMARY KEY NOT NULL,
    portfolio_id TEXT NOT NULL,
    name TEXT NOT NULL,
    institution_name TEXT,
    base_currency TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (portfolio_id) REFERENCES wealth_portfolios(id) ON DELETE RESTRICT
  );

  CREATE INDEX wealth_accounts_portfolio_idx
    ON wealth_accounts(portfolio_id);

  CREATE TABLE wealth_assets (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    isin TEXT,
    ticker TEXT,
    asset_type TEXT NOT NULL CHECK (
      asset_type IN ('ETF', 'STOCK', 'BOND', 'FUND', 'CASH_LIKE', 'OTHER')
    ),
    bucket TEXT NOT NULL CHECK (bucket IN ('CORE', 'SATELLITE', 'CASH')),
    strategy_category TEXT NOT NULL CHECK (
      strategy_category IN (
        'BROAD_MARKET', 'SECTOR_BET', 'SMALL_CAP', 'SPECULATIVE', 'INCOME', 'CASH', 'OTHER'
      )
    ),
    trading_currency TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE UNIQUE INDEX wealth_assets_isin_unique_idx
    ON wealth_assets(isin)
    WHERE isin IS NOT NULL;

  CREATE TABLE wealth_transactions (
    id TEXT PRIMARY KEY NOT NULL,
    account_id TEXT NOT NULL,
    asset_id TEXT,
    type TEXT NOT NULL CHECK (
      type IN ('CONTRIBUTION', 'WITHDRAWAL', 'BUY', 'SELL', 'DIVIDEND', 'INTEREST', 'FEE', 'TAX')
    ),
    trade_date TEXT NOT NULL,
    sequence INTEGER NOT NULL CHECK (sequence >= 0),
    quantity TEXT,
    unit_price TEXT,
    gross_amount TEXT,
    fees TEXT NOT NULL DEFAULT '0',
    taxes TEXT NOT NULL DEFAULT '0',
    currency TEXT NOT NULL,
    fx_rate_to_base TEXT,
    base_amount TEXT,
    reported_net_amount TEXT,
    note TEXT,
    source_type TEXT NOT NULL CHECK (source_type IN ('MANUAL', 'IMPORT')),
    source_ref TEXT,
    is_deleted INTEGER NOT NULL DEFAULT 0 CHECK (is_deleted IN (0, 1)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (account_id) REFERENCES wealth_accounts(id) ON DELETE RESTRICT,
    FOREIGN KEY (asset_id) REFERENCES wealth_assets(id) ON DELETE RESTRICT
  );

  CREATE INDEX wealth_transactions_projection_idx
    ON wealth_transactions(account_id, asset_id, trade_date, sequence);

  CREATE INDEX wealth_transactions_recent_idx
    ON wealth_transactions(account_id, trade_date DESC, sequence DESC);

  CREATE INDEX wealth_transactions_asset_idx
    ON wealth_transactions(asset_id, trade_date, sequence)
    WHERE asset_id IS NOT NULL;
`;
