import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';

import { WEALTH_SCHEMA_SQL } from './wealth-schema';

function createDatabase() {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  return db;
}

test('creates the core wealth schema without changing existing tables', () => {
  const db = createDatabase();
  db.exec('CREATE TABLE expenses (id TEXT PRIMARY KEY, merchant TEXT NOT NULL)');
  db.prepare('INSERT INTO expenses (id, merchant) VALUES (?, ?)').run('expense-1', 'Fictional Shop');

  db.exec(WEALTH_SCHEMA_SQL);

  const tableNames = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
    .all()
    .map((row) => row.name);

  assert.deepEqual(tableNames, [
    'expenses',
    'wealth_accounts',
    'wealth_assets',
    'wealth_portfolios',
    'wealth_transactions',
  ]);
  const expenseRow = db.prepare('SELECT * FROM expenses').get();
  assert.deepEqual({ ...expenseRow }, {
    id: 'expense-1',
    merchant: 'Fictional Shop',
  });
});

test('enforces wealth foreign keys and retains referenced history', () => {
  const db = createDatabase();
  db.exec(WEALTH_SCHEMA_SQL);

  assert.throws(() => {
    db.prepare(`
      INSERT INTO wealth_accounts (
        id, portfolio_id, name, base_currency, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run('account-a', 'missing-portfolio', 'Broker A', 'EUR', '2026-01-01', '2026-01-01');
  }, /FOREIGN KEY constraint failed/);

  db.prepare(`
    INSERT INTO wealth_portfolios (id, name, base_currency, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run('portfolio-1', 'Fictional Portfolio', 'EUR', '2026-01-01', '2026-01-01');
  db.prepare(`
    INSERT INTO wealth_accounts (
      id, portfolio_id, name, base_currency, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).run('account-a', 'portfolio-1', 'Broker A', 'EUR', '2026-01-01', '2026-01-01');

  assert.throws(
    () => db.prepare('DELETE FROM wealth_portfolios WHERE id = ?').run('portfolio-1'),
    /FOREIGN KEY constraint failed/,
  );
});

test('enforces canonical enums, booleans, and unique normalized ISINs', () => {
  const db = createDatabase();
  db.exec(WEALTH_SCHEMA_SQL);

  const insertAsset = db.prepare(`
    INSERT INTO wealth_assets (
      id, name, isin, asset_type, bucket, strategy_category, trading_currency,
      is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertAsset.run(
    'asset-1', 'Fictional ETF', 'AT0000FICTION', 'ETF', 'CORE', 'BROAD_MARKET',
    'EUR', 1, '2026-01-01', '2026-01-01',
  );

  assert.throws(() => {
    insertAsset.run(
      'asset-2', 'Duplicate ETF', 'AT0000FICTION', 'ETF', 'CORE', 'BROAD_MARKET',
      'EUR', 1, '2026-01-01', '2026-01-01',
    );
  }, /UNIQUE constraint failed/);

  assert.throws(() => {
    insertAsset.run(
      'asset-3', 'Invalid ETF', null, 'CRYPTO', 'CORE', 'BROAD_MARKET',
      'EUR', 1, '2026-01-01', '2026-01-01',
    );
  }, /CHECK constraint failed/);
});

test('creates the projection and traversal indexes required by the contract', () => {
  const db = createDatabase();
  db.exec(WEALTH_SCHEMA_SQL);

  const indexes = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name LIKE 'wealth_%' ORDER BY name")
    .all()
    .map((row) => row.name);

  assert.deepEqual(indexes, [
    'wealth_accounts_portfolio_idx',
    'wealth_assets_isin_unique_idx',
    'wealth_transactions_asset_idx',
    'wealth_transactions_projection_idx',
    'wealth_transactions_recent_idx',
  ]);
});
