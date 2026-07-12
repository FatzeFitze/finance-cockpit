import type { SQLiteDatabase } from 'expo-sqlite';

import { decimal, parseNonNegativeDecimal } from '../model/decimal';

import type {
    Account,
    AccountId,
    Asset,
    AssetId,
    CreateWealthTransactionInput,
    Portfolio,
    PortfolioId,
    PortfolioSnapshot,
    PriceObservation,
    TradeTransaction,
    WealthTransaction,
    TransactionId,
} from '../model/wealth.types';

function normalizeOptionalText(value?: string): string | null {
  const trimmed = value?.trim();

  return trimmed ? trimmed : null;
}

type PortfolioRow = {
  id: string;
  name: string;
  base_currency: string;
  created_at: string;
  updated_at: string;
};

type AccountRow = {
  id: string;
  portfolio_id: string;
  name: string;
  institution_name: string | null;
  base_currency: string;
  is_active: number;
  created_at: string;
  updated_at: string;
};

type AssetRow = {
  id: string;
  name: string;
  isin: string | null;
  ticker: string | null;
  asset_type: string;
  bucket: string;
  strategy_category: string;
  trading_currency: string;
  is_active: number;
  created_at: string;
  updated_at: string;
};

type TransactionRow = {
  id: string;
  account_id: string;
  asset_id: string | null;
  type: string;
  trade_date: string;
  sequence: number;
  quantity: string | null;
  unit_price: string | null;
  gross_amount: string | null;
  fees: string;
  taxes: string;
  currency: string;
  fx_rate_to_base: string | null;
  base_amount: string | null;
  reported_net_amount: string | null;
  note: string | null;
  source_type: string;
  source_ref: string | null;
  is_deleted: number;
  created_at: string;
  updated_at: string;
};

type PriceObservationRow = {
  id: string;
  asset_id: string;
  observed_at: string;
  price: string;
  currency: string;
  source_type: string;
};

type PortfolioSnapshotRow = {
  id: string;
  portfolio_id: string;
  snapshot_date: string;
  total_value: string;
  base_currency: string;
  source_type: string;
  reported_total_value: string | null;
  created_at: string;
};

function mapPortfolioRow(row: PortfolioRow): Portfolio {
  return {
    id: row.id as PortfolioId,
    name: row.name,
    baseCurrency: row.base_currency as Account['baseCurrency'],
  };
}

function mapAccountRow(row: AccountRow): Account {
  return {
    id: row.id as AccountId,
    portfolioId: row.portfolio_id as PortfolioId,
    name: row.name,
    institutionName: row.institution_name ?? undefined,
    baseCurrency: row.base_currency as Account['baseCurrency'],
    isActive: row.is_active === 1,
  };
}

function mapAssetRow(row: AssetRow): Asset {
  return {
    id: row.id as AssetId,
    name: row.name,
    isin: row.isin ?? undefined,
    ticker: row.ticker ?? undefined,
    assetType: row.asset_type as Asset['assetType'],
    bucket: row.bucket as Asset['bucket'],
    strategyCategory: row.strategy_category as Asset['strategyCategory'],
    tradingCurrency: row.trading_currency as Asset['tradingCurrency'],
    isActive: row.is_active === 1,
  };
}

function mapPriceObservationRow(row: PriceObservationRow): PriceObservation {
  return { id: row.id, assetId: row.asset_id as AssetId, observedAt: row.observed_at as PriceObservation['observedAt'], price: row.price as PriceObservation['price'], currency: row.currency as PriceObservation['currency'], source: row.source_type as PriceObservation['source'] };
}

function mapPortfolioSnapshotRow(row: PortfolioSnapshotRow): PortfolioSnapshot {
  return { id: row.id, portfolioId: row.portfolio_id as PortfolioId, snapshotDate: row.snapshot_date as PortfolioSnapshot['snapshotDate'], totalValue: row.total_value as PortfolioSnapshot['totalValue'], baseCurrency: row.base_currency as PortfolioSnapshot['baseCurrency'], source: row.source_type as PortfolioSnapshot['source'], ...(row.reported_total_value ? { reportedTotalValue: row.reported_total_value as PortfolioSnapshot['reportedTotalValue'] } : {}), createdAt: row.created_at };
}

function mapTransactionRow(row: TransactionRow): WealthTransaction {
  const base = {
    id: row.id as TransactionId,
    accountId: row.account_id as AccountId,
    tradeDate: row.trade_date as TradeTransaction['tradeDate'],
    sequence: row.sequence,
    currency: row.currency as TradeTransaction['currency'],
    ...(row.fx_rate_to_base ? { fxRateToBase: row.fx_rate_to_base as TradeTransaction['fxRateToBase'] } : {}),
    ...(row.note ? { note: row.note } : {}),
    source: row.source_type as TradeTransaction['source'],
    ...(row.source_ref ? { sourceRef: row.source_ref } : {}),
  };

  if (row.type === 'BUY' || row.type === 'SELL') {
    if (!row.asset_id || !row.quantity || !row.unit_price) {
      throw new Error('Invalid stored wealth trade transaction');
    }

    return {
      ...base,
      type: row.type,
      assetId: row.asset_id as AssetId,
      quantity: row.quantity as TradeTransaction['quantity'],
      unitPrice: row.unit_price as TradeTransaction['unitPrice'],
      fees: row.fees as TradeTransaction['fees'],
      taxes: row.taxes as TradeTransaction['taxes'],
      ...(row.reported_net_amount
        ? { reportedNetAmount: row.reported_net_amount as TradeTransaction['reportedNetAmount'] }
        : {}),
    };
  }

  if (row.type === 'CONTRIBUTION' || row.type === 'WITHDRAWAL') {
    if (!row.gross_amount) {
      throw new Error('Invalid stored wealth cash transaction');
    }

    return { ...base, type: row.type, amount: row.gross_amount as never };
  }

  throw new Error(`Unsupported stored wealth transaction type: ${row.type}`);
}

function validateTransactionInput(input: CreateWealthTransactionInput): void {
  if (!input.accountId || !input.tradeDate || !input.currency || !Number.isInteger(input.sequence) || input.sequence < 0) throw new Error('Invalid wealth transaction shape');
  if (input.type === 'BUY' || input.type === 'SELL') {
    if (!input.assetId || input.quantity == null || input.unitPrice == null) throw new Error('Invalid wealth trade transaction shape');
    parseNonNegativeDecimal(input.quantity); parseNonNegativeDecimal(input.unitPrice); parseNonNegativeDecimal(input.fees); parseNonNegativeDecimal(input.taxes); return;
  }
  if (input.type === 'CONTRIBUTION' || input.type === 'WITHDRAWAL') {
    if (input.amount == null) throw new Error('Invalid wealth cash transaction shape');
    parseNonNegativeDecimal(input.amount); return;
  }
  throw new Error('Unsupported wealth transaction type');
}

async function assertSellDoesNotOversell(
  db: SQLiteDatabase,
  input: CreateWealthTransactionInput,
  excludedTransactionId?: TransactionId,
): Promise<void> {
  if (input.type !== 'SELL') {
    return;
  }

  const rows = await db.getAllAsync<TransactionRow>(
    `SELECT id, account_id, asset_id, type, trade_date, sequence, quantity, unit_price, gross_amount,
            fees, taxes, currency, fx_rate_to_base, base_amount, reported_net_amount, note,
            source_type, source_ref, is_deleted, created_at, updated_at
     FROM wealth_transactions
     WHERE account_id = ? AND asset_id = ? AND is_deleted = 0
       AND (? IS NULL OR id <> ?)
       AND (trade_date < ? OR (trade_date = ? AND sequence <= ?))
     ORDER BY trade_date ASC, sequence ASC, id ASC`,
    input.accountId,
    input.assetId,
    excludedTransactionId ?? null,
    excludedTransactionId ?? null,
    input.tradeDate,
    input.tradeDate,
    input.sequence,
  );

  const available = rows.reduce((quantity, row) => {
    if ((row.type !== 'BUY' && row.type !== 'SELL') || !row.quantity) {
      return quantity;
    }

    return row.type === 'BUY' ? quantity.plus(row.quantity) : quantity.minus(row.quantity);
  }, decimal('0' as never));

  if (available.lessThan(input.quantity)) {
    throw new Error('Sell quantity exceeds the recorded position for this account and asset');
  }
}

export async function createPortfolio(
  db: SQLiteDatabase,
  input: Pick<Portfolio, 'name' | 'baseCurrency'>,
): Promise<PortfolioId> {
  const id = `portfolio-${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO wealth_portfolios (id, name, base_currency, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
    id,
    input.name.trim(),
    input.baseCurrency,
    now,
    now,
  );

  return id as PortfolioId;
}

export async function listPortfolios(db: SQLiteDatabase): Promise<Portfolio[]> {
  const rows = await db.getAllAsync<PortfolioRow>(
    `SELECT id, name, base_currency, created_at, updated_at
     FROM wealth_portfolios
     ORDER BY created_at ASC, name COLLATE NOCASE ASC`,
  );

  return rows.map(mapPortfolioRow);
}

export async function ensurePersonalPortfolio(db: SQLiteDatabase): Promise<Portfolio> {
  const existing = await listPortfolios(db);

  if (existing[0]) {
    return existing[0];
  }

  const id = await createPortfolio(db, {
    name: 'Personal Portfolio',
    baseCurrency: 'EUR' as Portfolio['baseCurrency'],
  });

  return { id, name: 'Personal Portfolio', baseCurrency: 'EUR' as Portfolio['baseCurrency'] };
}

export async function createAccount(
  db: SQLiteDatabase,
  input: Pick<Account, 'portfolioId' | 'name' | 'baseCurrency'> & {
    institutionName?: string;
  },
): Promise<AccountId> {
  const id = `account-${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO wealth_accounts (id, portfolio_id, name, institution_name, base_currency, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.portfolioId,
    input.name.trim(),
    normalizeOptionalText(input.institutionName),
    input.baseCurrency,
    1,
    now,
    now,
  );

  return id as AccountId;
}

export async function listAccountsByPortfolio(
  db: SQLiteDatabase,
  portfolioId: PortfolioId,
): Promise<Account[]> {
  const rows = await db.getAllAsync<AccountRow>(
    `SELECT id, portfolio_id, name, institution_name, base_currency, is_active, created_at, updated_at
     FROM wealth_accounts
     WHERE portfolio_id = ?
     ORDER BY name COLLATE NOCASE ASC`,
    portfolioId,
  );

  return rows.map(mapAccountRow);
}

export async function createAsset(
  db: SQLiteDatabase,
  input: Pick<Asset, 'name' | 'isin' | 'ticker' | 'assetType' | 'bucket' | 'strategyCategory' | 'tradingCurrency'>,
): Promise<AssetId> {
  const id = `asset-${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
  const now = new Date().toISOString();

  try {
    await db.runAsync(
      `INSERT INTO wealth_assets (id, name, isin, ticker, asset_type, bucket, strategy_category, trading_currency, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      input.name.trim(),
      normalizeOptionalText(input.isin)?.toUpperCase() ?? null,
      normalizeOptionalText(input.ticker)?.toUpperCase() ?? null,
      input.assetType,
      input.bucket,
      input.strategyCategory,
      input.tradingCurrency,
      1,
      now,
      now,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (/duplicate|unique/i.test(message)) {
      throw new Error(`Duplicate wealth asset: ${input.name}`);
    }

    throw error;
  }

  return id as AssetId;
}

export async function listAssets(db: SQLiteDatabase): Promise<Asset[]> {
  const rows = await db.getAllAsync<AssetRow>(
    `SELECT id, name, isin, ticker, asset_type, bucket, strategy_category, trading_currency, is_active, created_at, updated_at
     FROM wealth_assets
     ORDER BY name COLLATE NOCASE ASC`,
  );

  return rows.map(mapAssetRow);
}

export async function createPriceObservation(
  db: SQLiteDatabase,
  input: Omit<PriceObservation, 'id'> & { sourceRef?: string },
): Promise<string> {
  parseNonNegativeDecimal(input.price);
  if (!input.assetId || !/^\d{4}-\d{2}-\d{2}$/.test(input.observedAt) || !input.currency) throw new Error('Invalid price observation');
  const id = `price-${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
  await db.runAsync(
    `INSERT INTO wealth_price_observations (id, asset_id, observed_at, price, currency, source_type, source_ref, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    id, input.assetId, input.observedAt, input.price, input.currency, input.source, input.sourceRef ?? null, new Date().toISOString(),
  );
  return id;
}

export async function listPriceObservations(db: SQLiteDatabase): Promise<PriceObservation[]> {
  const rows = await db.getAllAsync<PriceObservationRow>(
    `SELECT id, asset_id, observed_at, price, currency, source_type
     FROM wealth_price_observations
     ORDER BY observed_at DESC, id DESC`,
  );
  return rows.map(mapPriceObservationRow);
}

export async function createPortfolioSnapshot(
  db: SQLiteDatabase,
  input: Omit<PortfolioSnapshot, 'id' | 'createdAt'>,
): Promise<string> {
  parseNonNegativeDecimal(input.totalValue);
  if (input.reportedTotalValue) parseNonNegativeDecimal(input.reportedTotalValue);
  if (!input.portfolioId || !/^\d{4}-\d{2}-\d{2}$/.test(input.snapshotDate) || !input.baseCurrency) throw new Error('Invalid portfolio snapshot');
  const id = `snapshot-${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
  await db.runAsync(
    `INSERT INTO wealth_portfolio_snapshots (id, portfolio_id, snapshot_date, total_value, base_currency, source_type, reported_total_value, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    id, input.portfolioId, input.snapshotDate, input.totalValue, input.baseCurrency, input.source, input.reportedTotalValue ?? null, new Date().toISOString(),
  );
  return id;
}

export async function listPortfolioSnapshots(db: SQLiteDatabase, portfolioId: PortfolioId): Promise<PortfolioSnapshot[]> {
  const rows = await db.getAllAsync<PortfolioSnapshotRow>(
    `SELECT id, portfolio_id, snapshot_date, total_value, base_currency, source_type, reported_total_value, created_at
     FROM wealth_portfolio_snapshots WHERE portfolio_id = ? ORDER BY snapshot_date DESC, id DESC`, portfolioId,
  );
  return rows.map(mapPortfolioSnapshotRow);
}

export async function createTransaction(
  db: SQLiteDatabase,
  input: CreateWealthTransactionInput,
): Promise<TransactionId> {
  const id = `transaction-${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
  const now = new Date().toISOString();

  validateTransactionInput(input);
  await assertSellDoesNotOversell(db, input);

  try {
    await db.runAsync(
      `INSERT INTO wealth_transactions (
        id, account_id, asset_id, type, trade_date, sequence, quantity, unit_price, gross_amount,
        fees, taxes, currency, fx_rate_to_base, base_amount, reported_net_amount, note,
        source_type, source_ref, is_deleted, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? )`,
      id,
      input.accountId,
      'assetId' in input ? input.assetId : null,
      input.type,
      input.tradeDate,
      input.sequence,
      'quantity' in input ? input.quantity : null,
      'unitPrice' in input ? input.unitPrice : null,
      'amount' in input ? input.amount : null,
      'fees' in input ? input.fees : '0',
      'taxes' in input ? input.taxes : '0',
      input.currency,
      input.fxRateToBase ?? null,
      null,
      null,
      input.note ?? null,
      input.source ?? 'MANUAL',
      input.sourceRef ?? null,
      0,
      now,
      now,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (/foreign key|reference/i.test(message)) {
      throw new Error('Invalid wealth transaction reference');
    }

    throw error;
  }

  return id as TransactionId;
}

export async function listTransactionsForAccount(
  db: SQLiteDatabase,
  accountId: AccountId,
): Promise<WealthTransaction[]> {
  const rows = await db.getAllAsync<TransactionRow>(
    `SELECT id, account_id, asset_id, type, trade_date, sequence, quantity, unit_price, gross_amount,
            fees, taxes, currency, fx_rate_to_base, base_amount, reported_net_amount, note,
            source_type, source_ref, is_deleted, created_at, updated_at
     FROM wealth_transactions
     WHERE account_id = ? AND is_deleted = 0
     ORDER BY trade_date ASC, sequence ASC, id ASC`,
    accountId,
  );

  return rows.map(mapTransactionRow);
}

export async function listTransactions(db: SQLiteDatabase): Promise<WealthTransaction[]> {
  const rows = await db.getAllAsync<TransactionRow>(
    `SELECT id, account_id, asset_id, type, trade_date, sequence, quantity, unit_price, gross_amount,
            fees, taxes, currency, fx_rate_to_base, base_amount, reported_net_amount, note,
            source_type, source_ref, is_deleted, created_at, updated_at
     FROM wealth_transactions
     WHERE is_deleted = 0
     ORDER BY trade_date DESC, sequence DESC, id DESC`,
  );

  return rows.map(mapTransactionRow);
}

export async function getTransactionById(
  db: SQLiteDatabase,
  transactionId: TransactionId,
): Promise<WealthTransaction | null> {
  const row = await db.getFirstAsync<TransactionRow>(
    `SELECT id, account_id, asset_id, type, trade_date, sequence, quantity, unit_price, gross_amount,
            fees, taxes, currency, fx_rate_to_base, base_amount, reported_net_amount, note,
            source_type, source_ref, is_deleted, created_at, updated_at
     FROM wealth_transactions
     WHERE id = ? AND is_deleted = 0`,
    transactionId,
  );

  return row ? mapTransactionRow(row) : null;
}

export async function updateTransaction(
  db: SQLiteDatabase,
  transactionId: TransactionId,
  input: CreateWealthTransactionInput,
): Promise<void> {
  const now = new Date().toISOString();

  validateTransactionInput(input);
  await assertSellDoesNotOversell(db, input, transactionId);

  await db.runAsync(
    `UPDATE wealth_transactions
     SET account_id = ?, asset_id = ?, type = ?, trade_date = ?, sequence = ?, quantity = ?,
         unit_price = ?, gross_amount = ?, fees = ?, taxes = ?, currency = ?, fx_rate_to_base = ?,
         note = ?, source_type = ?, source_ref = ?, updated_at = ?
     WHERE id = ? AND is_deleted = 0`,
    input.accountId,
    'assetId' in input ? input.assetId : null,
    input.type,
    input.tradeDate,
    input.sequence,
    'quantity' in input ? input.quantity : null,
    'unitPrice' in input ? input.unitPrice : null,
    'amount' in input ? input.amount : null,
    'fees' in input ? input.fees : '0',
    'taxes' in input ? input.taxes : '0',
    input.currency,
    input.fxRateToBase ?? null,
    input.note ?? null,
    input.source ?? 'MANUAL',
    input.sourceRef ?? null,
    now,
    transactionId,
  );
}

export async function softDeleteTransaction(
  db: SQLiteDatabase,
  transactionId: TransactionId,
): Promise<void> {
  await db.runAsync(
    `UPDATE wealth_transactions
     SET is_deleted = 1, updated_at = ?
     WHERE id = ?`,
    new Date().toISOString(),
    transactionId,
  );
}

export async function seedFictionalWealthData(db: SQLiteDatabase): Promise<{
  portfolioCount: number;
  accountCount: number;
  assetCount: number;
  transactionCount: number;
  portfolioName: string;
}> {
  const existingPortfolios = await listPortfolios(db);

  if (existingPortfolios.length > 0) {
    return {
      portfolioCount: existingPortfolios.length,
      accountCount: (await listAccountsByPortfolio(db, existingPortfolios[0].id)).length,
      assetCount: (await listAssets(db)).length,
      transactionCount: (await listTransactionsForAccount(db, (await listAccountsByPortfolio(db, existingPortfolios[0].id))[0]?.id as AccountId)).length,
      portfolioName: existingPortfolios[0].name,
    };
  }

  const portfolioId = await createPortfolio(db, {
    name: 'Demo Portfolio',
    baseCurrency: 'EUR' as Portfolio['baseCurrency'],
  });

  const accountId = await createAccount(db, {
    portfolioId,
    name: 'Demo Broker',
    baseCurrency: 'EUR' as Account['baseCurrency'],
  });

  const assetId = await createAsset(db, {
    name: 'Demo ETF',
    isin: 'AT0000DEMO1',
    ticker: 'DEMO',
    assetType: 'ETF',
    bucket: 'CORE',
    strategyCategory: 'BROAD_MARKET',
    tradingCurrency: 'EUR' as Asset['tradingCurrency'],
  });

  await createTransaction(db, {
    accountId,
    assetId,
    type: 'BUY',
    tradeDate: '2026-01-02' as TradeTransaction['tradeDate'],
    sequence: 0,
    quantity: '5' as TradeTransaction['quantity'],
    unitPrice: '10' as TradeTransaction['unitPrice'],
    fees: '0' as TradeTransaction['fees'],
    taxes: '0' as TradeTransaction['taxes'],
    currency: 'EUR' as TradeTransaction['currency'],
    source: 'MANUAL',
  });

  return {
    portfolioCount: 1,
    accountCount: 1,
    assetCount: 1,
    transactionCount: 1,
    portfolioName: 'Demo Portfolio',
  };
}
