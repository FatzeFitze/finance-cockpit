import type { SQLiteDatabase } from 'expo-sqlite';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';

import { parseNonNegativeDecimal } from '../model/decimal';
import type { CurrencyCode, IsoDate } from '../model/wealth.types';
import { WEALTH_SCHEMA_SQL } from './wealth-schema';
import { WEALTH_PRICE_SCHEMA_SQL } from './wealth-price-schema';
import { WEALTH_SNAPSHOT_SCHEMA_SQL } from './wealth-snapshot-schema';
import {
    createAccount,
    createAsset,
    commitWorkbookImport,
    createPortfolio,
    createPortfolioSnapshot,
    createPriceObservation,
    createTransaction,
    listAccountsByPortfolio,
    listAssets,
    listPortfolios,
    listPortfolioSnapshots,
    listPriceObservations,
    listTransactionsForAccount,
    seedFictionalWealthData,
    softDeleteTransaction,
    updateTransaction,
} from './wealth.repository';

class SqliteAdapter {
  constructor(private readonly db: DatabaseSync) {}

  async execAsync(sql: string): Promise<void> {
    this.db.exec(sql);
  }

  async runAsync(sql: string, ...params: unknown[]): Promise<{ changes: number }> {
    const statement = this.db.prepare(sql);
    const result = statement.run(...(params as never[]));
    return { changes: result.changes as number };
  }

  async getFirstAsync<T = unknown>(sql: string, ...params: unknown[]): Promise<T | null> {
    const row = this.db.prepare(sql).get(...(params as never[]));
    return (row ?? null) as T | null;
  }

  async getAllAsync<T = unknown>(sql: string, ...params: unknown[]): Promise<T[]> {
    return this.db.prepare(sql).all(...(params as never[])) as T[];
  }

  async withTransactionAsync<T>(callback: () => Promise<T>): Promise<T> {
    this.db.exec('BEGIN');

    try {
      const result = await callback();
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
}

function createTestDatabase(): SQLiteDatabase {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  return new SqliteAdapter(db) as unknown as SQLiteDatabase;
}

test('persists portfolios, accounts, assets, and transactions with soft deletion', async () => {
  const db = createTestDatabase();
  await db.execAsync(WEALTH_SCHEMA_SQL);

  const portfolioId = await createPortfolio(db, {
    name: 'Fictional Portfolio',
    baseCurrency: 'EUR' as CurrencyCode,
  });

  const accountId = await createAccount(db, {
    portfolioId,
    name: 'Broker A',
    baseCurrency: 'EUR' as CurrencyCode,
  });

  const assetId = await createAsset(db, {
    name: 'Fictional ETF',
    isin: 'AT0000FICTION',
    ticker: 'FICT',
    assetType: 'ETF',
    bucket: 'CORE',
    strategyCategory: 'BROAD_MARKET',
    tradingCurrency: 'EUR' as CurrencyCode,
  });

  const transactionId = await createTransaction(db, {
    accountId,
    assetId,
    type: 'BUY',
    tradeDate: '2026-01-02' as IsoDate,
    sequence: 0,
    quantity: parseNonNegativeDecimal('5'),
    unitPrice: parseNonNegativeDecimal('10'),
    fees: parseNonNegativeDecimal('0'),
    taxes: parseNonNegativeDecimal('0'),
    currency: 'EUR' as CurrencyCode,
    source: 'MANUAL',
  });

  const portfolios = await listPortfolios(db);
  const accounts = await listAccountsByPortfolio(db, portfolioId);
  const assets = await listAssets(db);
  const transactions = await listTransactionsForAccount(db, accountId);

  assert.equal(portfolios.length, 1);
  assert.equal(accounts.length, 1);
  assert.equal(assets.length, 1);
  assert.equal(transactions.length, 1);
  assert.equal(transactions[0].id, transactionId);

  await softDeleteTransaction(db, transactionId);

  const remainingTransactions = await listTransactionsForAccount(db, accountId);
  assert.equal(remainingTransactions.length, 0);
});

test('seeds a developer-friendly wealth demo dataset', async () => {
  const db = createTestDatabase();
  await db.execAsync(WEALTH_SCHEMA_SQL);
  await db.execAsync(WEALTH_PRICE_SCHEMA_SQL);
  await db.execAsync(WEALTH_SNAPSHOT_SCHEMA_SQL);

  const summary = await seedFictionalWealthData(db);

  assert.equal(summary.portfolioName, 'Fictional Demo Portfolio');
  assert.equal((await listAccountsByPortfolio(db, summary.portfolioId)).length, 2);
  assert.equal((await listPortfolioSnapshots(db, summary.portfolioId)).length, 4);
  assert.equal((await listPriceObservations(db)).length, 6);
  assert.equal((await seedFictionalWealthData(db)).portfolioId, summary.portfolioId);
});

test('rejects duplicate ISINs and invalid references', async () => {
  const db = createTestDatabase();
  await db.execAsync(WEALTH_SCHEMA_SQL);

  await createAsset(db, {
    name: 'First Asset',
    isin: 'AT0000FICTION',
    assetType: 'ETF',
    bucket: 'CORE',
    strategyCategory: 'BROAD_MARKET',
    tradingCurrency: 'EUR' as CurrencyCode,
  });

  await assert.rejects(
    () =>
      createAsset(db, {
        name: 'Second Asset',
        isin: 'AT0000FICTION',
        assetType: 'ETF',
        bucket: 'CORE',
        strategyCategory: 'BROAD_MARKET',
        tradingCurrency: 'EUR' as CurrencyCode,
      }),
    /duplicate/i,
  );

  await createPortfolio(db, {
    name: 'Portfolio',
    baseCurrency: 'EUR' as CurrencyCode,
  });

  await assert.rejects(
    () =>
      createTransaction(db, {
        accountId: 'missing-account' as never,
        assetId: 'missing-asset' as never,
        type: 'BUY',
        tradeDate: '2026-01-02' as IsoDate,
        sequence: 0,
        quantity: parseNonNegativeDecimal('1'),
        unitPrice: parseNonNegativeDecimal('10'),
        fees: parseNonNegativeDecimal('0'),
        taxes: parseNonNegativeDecimal('0'),
        currency: 'EUR' as CurrencyCode,
        source: 'MANUAL',
      }),
    /foreign key|reference/i,
  );
});

test('persists cash transactions and prevents overselling an account position', async () => {
  const db = createTestDatabase();
  await db.execAsync(WEALTH_SCHEMA_SQL);
  const portfolioId = await createPortfolio(db, { name: 'Portfolio', baseCurrency: 'EUR' as CurrencyCode });
  const accountId = await createAccount(db, { portfolioId, name: 'Broker', baseCurrency: 'EUR' as CurrencyCode });
  const assetId = await createAsset(db, { name: 'Asset', assetType: 'ETF', bucket: 'CORE', strategyCategory: 'BROAD_MARKET', tradingCurrency: 'EUR' as CurrencyCode });

  await createTransaction(db, { accountId, type: 'CONTRIBUTION', tradeDate: '2026-01-01' as IsoDate, sequence: 0, amount: parseNonNegativeDecimal('100'), currency: 'EUR' as CurrencyCode, source: 'MANUAL' });
  await createTransaction(db, { accountId, assetId, type: 'BUY', tradeDate: '2026-01-02' as IsoDate, sequence: 0, quantity: parseNonNegativeDecimal('2'), unitPrice: parseNonNegativeDecimal('10'), fees: parseNonNegativeDecimal('0'), taxes: parseNonNegativeDecimal('0'), currency: 'EUR' as CurrencyCode, source: 'MANUAL' });

  await assert.rejects(() => createTransaction(db, { accountId, assetId, type: 'SELL', tradeDate: '2026-01-03' as IsoDate, sequence: 0, quantity: parseNonNegativeDecimal('3'), unitPrice: parseNonNegativeDecimal('10'), fees: parseNonNegativeDecimal('0'), taxes: parseNonNegativeDecimal('0'), currency: 'EUR' as CurrencyCode, source: 'MANUAL' }), /exceeds/i);

  const transactions = await listTransactionsForAccount(db, accountId);
  assert.equal(transactions[0].type, 'CONTRIBUTION');
  assert.equal('amount' in transactions[0] && transactions[0].amount, '100');

  await updateTransaction(db, transactions[0].id, { accountId, type: 'WITHDRAWAL', tradeDate: '2026-01-01' as IsoDate, sequence: 0, amount: parseNonNegativeDecimal('50'), currency: 'EUR' as CurrencyCode, source: 'MANUAL' });
  assert.equal((await listTransactionsForAccount(db, accountId))[0].type, 'WITHDRAWAL');
});

test('rejects a structurally malformed transaction before persistence', async () => {
  const db = createTestDatabase();
  await db.execAsync(WEALTH_SCHEMA_SQL);
  await assert.rejects(() => createTransaction(db, { accountId: 'account' as never, type: 'BUY', tradeDate: '2026-01-01' as IsoDate, sequence: 0, assetId: '' as never, quantity: undefined as never, unitPrice: undefined as never, fees: parseNonNegativeDecimal('0'), taxes: parseNonNegativeDecimal('0'), currency: 'EUR' as CurrencyCode, source: 'MANUAL' }), /invalid wealth trade/i);
});

test('persists dated manual price observations', async () => {
  const db = createTestDatabase();
  await db.execAsync(WEALTH_SCHEMA_SQL);
  await db.execAsync(WEALTH_PRICE_SCHEMA_SQL);
  const assetId = await createAsset(db, { name: 'Fictional ETF', assetType: 'ETF', bucket: 'CORE', strategyCategory: 'BROAD_MARKET', tradingCurrency: 'EUR' as CurrencyCode });
  await createPriceObservation(db, { assetId, observedAt: '2026-02-01' as IsoDate, price: parseNonNegativeDecimal('123.45'), currency: 'EUR' as CurrencyCode, source: 'MANUAL' });
  const prices = await listPriceObservations(db);
  assert.equal(prices.length, 1);
  assert.equal(prices[0].price, '123.45');
});

test('persists immutable manual portfolio snapshots with optional reconciliation evidence', async () => {
  const db = createTestDatabase();
  await db.execAsync(WEALTH_SCHEMA_SQL);
  await db.execAsync(WEALTH_SNAPSHOT_SCHEMA_SQL);
  const portfolioId = await createPortfolio(db, { name: 'Fictional Portfolio', baseCurrency: 'EUR' as CurrencyCode });
  await createPortfolioSnapshot(db, { portfolioId, snapshotDate: '2026-02-01' as IsoDate, totalValue: parseNonNegativeDecimal('1234.56'), reportedTotalValue: parseNonNegativeDecimal('1235'), baseCurrency: 'EUR' as CurrencyCode, source: 'MANUAL' });
  const snapshots = await listPortfolioSnapshots(db, portfolioId);
  assert.equal(snapshots.length, 1);
  assert.equal(snapshots[0].totalValue, '1234.56');
  assert.equal(snapshots[0].reportedTotalValue, '1235');
});

test('atomically rolls back a reviewed workbook import if a staged sell cannot be committed', async () => {
  const db = createTestDatabase();
  await db.execAsync(WEALTH_SCHEMA_SQL);
  await db.execAsync(WEALTH_PRICE_SCHEMA_SQL);
  await db.execAsync(WEALTH_SNAPSHOT_SCHEMA_SQL);

  await assert.rejects(() => commitWorkbookImport(db, {
    baseCurrency: 'EUR',
    transactions: [{ row: 2, included: true, date: '2026-01-02', account: 'Fictional Broker', type: 'SELL', identifier: 'FICT', assetName: 'Fictional ETF', amount: '', quantity: '1', unitPrice: '10', fees: '0', taxes: '0', currency: 'EUR', fxRateToBase: '' }],
    prices: [], snapshots: [],
  }), /exceeds/i);

  assert.equal((await listPortfolios(db)).length, 0);
  assert.equal((await listAssets(db)).length, 0);
});
