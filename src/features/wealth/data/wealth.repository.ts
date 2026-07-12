import type { SQLiteDatabase } from 'expo-sqlite';

import { decimal, parseNonNegativeDecimal } from '../model/decimal';
import type { CsvImportCommit, StagedCsvTransaction } from '../services/workbook-import';

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

export const PERSONAL_PORTFOLIO_NAME = 'Personal Portfolio';

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

export async function findPersonalPortfolio(db: SQLiteDatabase): Promise<Portfolio | null> {
  const row = await db.getFirstAsync<PortfolioRow>(
    `SELECT id, name, base_currency, created_at, updated_at
     FROM wealth_portfolios WHERE name = ? ORDER BY created_at ASC LIMIT 1`,
    PERSONAL_PORTFOLIO_NAME,
  );
  return row ? mapPortfolioRow(row) : null;
}

export async function ensurePersonalPortfolio(db: SQLiteDatabase): Promise<Portfolio> {
  const existing = await findPersonalPortfolio(db);
  if (existing) return existing;

  const id = await createPortfolio(db, {
    name: PERSONAL_PORTFOLIO_NAME,
    baseCurrency: 'EUR' as Portfolio['baseCurrency'],
  });

  return { id, name: PERSONAL_PORTFOLIO_NAME, baseCurrency: 'EUR' as Portfolio['baseCurrency'] };
}

export type LegacyPortfolioSummary = Portfolio & { accountCount: number; transactionCount: number; snapshotCount: number };

export async function listLegacyPortfolioSummaries(db: SQLiteDatabase): Promise<LegacyPortfolioSummary[]> {
  const portfolios = await listPortfolios(db);
  return Promise.all(portfolios.filter((portfolio) => portfolio.name !== PERSONAL_PORTFOLIO_NAME).map(async (portfolio) => {
    const [accounts, transactions, snapshots] = await Promise.all([
      db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM wealth_accounts WHERE portfolio_id = ?', portfolio.id),
      db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM wealth_transactions WHERE account_id IN (SELECT id FROM wealth_accounts WHERE portfolio_id = ?)', portfolio.id),
      db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM wealth_portfolio_snapshots WHERE portfolio_id = ?', portfolio.id),
    ]);
    return { ...portfolio, accountCount: accounts?.count ?? 0, transactionCount: transactions?.count ?? 0, snapshotCount: snapshots?.count ?? 0 };
  }));
}

/** Deletes a legacy portfolio and only assets/prices no longer used by any remaining transaction. */
export async function deleteLegacyPortfolio(db: SQLiteDatabase, portfolioId: PortfolioId): Promise<void> {
  const portfolio = await db.getFirstAsync<PortfolioRow>('SELECT id, name, base_currency, created_at, updated_at FROM wealth_portfolios WHERE id = ?', portfolioId);
  if (!portfolio) throw new Error('Portfolio not found');
  if (portfolio.name === PERSONAL_PORTFOLIO_NAME) throw new Error('The personal portfolio cannot be deleted');
  await db.withTransactionAsync(async () => {
    const assets = await db.getAllAsync<{ asset_id: string }>(
      `SELECT DISTINCT asset_id FROM wealth_transactions WHERE asset_id IS NOT NULL
       AND account_id IN (SELECT id FROM wealth_accounts WHERE portfolio_id = ?)`, portfolioId,
    );
    await db.runAsync('DELETE FROM wealth_portfolio_snapshots WHERE portfolio_id = ?', portfolioId);
    await db.runAsync('DELETE FROM wealth_transactions WHERE account_id IN (SELECT id FROM wealth_accounts WHERE portfolio_id = ?)', portfolioId);
    await db.runAsync('DELETE FROM wealth_accounts WHERE portfolio_id = ?', portfolioId);
    await db.runAsync('DELETE FROM wealth_portfolios WHERE id = ?', portfolioId);
    for (const asset of assets) {
      const remaining = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM wealth_transactions WHERE asset_id = ?', asset.asset_id);
      if ((remaining?.count ?? 0) === 0) { await db.runAsync('DELETE FROM wealth_price_observations WHERE asset_id = ?', asset.asset_id); await db.runAsync('DELETE FROM wealth_assets WHERE id = ?', asset.asset_id); }
    }
  });
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

function importAssetKey(isin: string, ticker: string, name: string): string {
  return (isin || ticker || name).trim().toUpperCase();
}

function importTransactionReference(row: StagedCsvTransaction): string {
  return `csv-v1:${[row.sequence, row.account, row.type, row.date, row.isin, row.ticker, row.assetName, row.amount, row.quantity, row.unitPrice, row.fees, row.taxes, row.currency].join('|')}`;
}

export type CsvImportResult = {
  portfolioId: PortfolioId;
  transactionCount: number;
};

/** Commits only a previously validated, reviewed canonical CSV staging payload. */
export async function commitCanonicalCsvImport(db: SQLiteDatabase, input: CsvImportCommit): Promise<CsvImportResult> {
  let result: CsvImportResult | undefined;
  await db.withTransactionAsync(async () => {
    const portfolio = await findPersonalPortfolio(db);
    const portfolioId = portfolio?.id ?? await createPortfolio(db, { name: PERSONAL_PORTFOLIO_NAME, baseCurrency: input.baseCurrency as Portfolio['baseCurrency'] });
    const effectivePortfolio: Portfolio = portfolio ?? { id: portfolioId, name: PERSONAL_PORTFOLIO_NAME, baseCurrency: input.baseCurrency as Portfolio['baseCurrency'] };
    if (effectivePortfolio.baseCurrency !== input.baseCurrency) throw new Error('Workbook currency does not match the existing portfolio base currency');
    const [accounts, assets] = await Promise.all([listAccountsByPortfolio(db, portfolioId), listAssets(db)]);
    const accountIds = new Map(accounts.map((item) => [item.name.trim().toUpperCase(), item.id]));
    const assetIds = new Map<string, AssetId>();
    for (const asset of assets) for (const key of [asset.isin, asset.ticker, asset.name]) if (key) assetIds.set(key.trim().toUpperCase(), asset.id);
    const accountIdFor = async (name: string) => {
      const key = name.trim().toUpperCase(); const current = accountIds.get(key);
      if (current) return current;
      const id = await createAccount(db, { portfolioId, name, baseCurrency: effectivePortfolio.baseCurrency }); accountIds.set(key, id); return id;
    };
    const assetIdFor = async (isin: string, ticker: string, name: string, currency: string) => {
      const key = importAssetKey(isin, ticker, name); const current = assetIds.get(key);
      if (current) return current;
      const id = await createAsset(db, { name: name || isin || ticker, isin: isin || undefined, ticker: ticker || undefined, assetType: 'OTHER', bucket: 'SATELLITE', strategyCategory: 'OTHER', tradingCurrency: currency as Asset['tradingCurrency'] });
      for (const assetKey of [isin, ticker, name]) if (assetKey) assetIds.set(assetKey.trim().toUpperCase(), id); return id;
    };
    for (const row of input.transactions) {
      const accountId = await accountIdFor(row.account);
      const sourceRef = importTransactionReference(row);
      if (row.type === 'CONTRIBUTION' || row.type === 'WITHDRAWAL') await createTransaction(db, { accountId, type: row.type, tradeDate: row.date as never, sequence: Number(row.sequence), amount: parseNonNegativeDecimal(row.amount), currency: row.currency as never, ...(row.fxRateToBase ? { fxRateToBase: parseNonNegativeDecimal(row.fxRateToBase) } : {}), source: 'IMPORT', sourceRef });
      else {
        const assetId = await assetIdFor(row.isin, row.ticker, row.assetName, row.currency);
        await createTransaction(db, { accountId, assetId, type: row.type as 'BUY' | 'SELL', tradeDate: row.date as never, sequence: Number(row.sequence), quantity: parseNonNegativeDecimal(row.quantity), unitPrice: parseNonNegativeDecimal(row.unitPrice), fees: parseNonNegativeDecimal(row.fees), taxes: parseNonNegativeDecimal(row.taxes), currency: row.currency as never, ...(row.fxRateToBase ? { fxRateToBase: parseNonNegativeDecimal(row.fxRateToBase) } : {}), source: 'IMPORT', sourceRef });
      }
    }
    result = { portfolioId, transactionCount: input.transactions.length };
  });
  if (!result) throw new Error('CSV import did not produce a commit result');
  return result;
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

export async function listTransactionsByPortfolio(db: SQLiteDatabase, portfolioId: PortfolioId): Promise<WealthTransaction[]> {
  const rows = await db.getAllAsync<TransactionRow>(
    `SELECT t.id, t.account_id, t.asset_id, t.type, t.trade_date, t.sequence, t.quantity, t.unit_price, t.gross_amount,
            t.fees, t.taxes, t.currency, t.fx_rate_to_base, t.base_amount, t.reported_net_amount, t.note,
            t.source_type, t.source_ref, t.is_deleted, t.created_at, t.updated_at
     FROM wealth_transactions t JOIN wealth_accounts a ON a.id = t.account_id
     WHERE a.portfolio_id = ? AND t.is_deleted = 0
     ORDER BY t.trade_date DESC, t.sequence DESC, t.id DESC`, portfolioId,
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

export async function seedFictionalWealthData(db: SQLiteDatabase): Promise<{ portfolioId: PortfolioId; portfolioName: string }> {
  const existing = (await listPortfolios(db)).find((portfolio) => portfolio.name === 'Fictional Demo Portfolio');
  if (existing) return { portfolioId: existing.id, portfolioName: existing.name };
  let result: { portfolioId: PortfolioId; portfolioName: string } | undefined;
  await db.withTransactionAsync(async () => {
    const portfolioId = await createPortfolio(db, { name: 'Fictional Demo Portfolio', baseCurrency: 'EUR' as Portfolio['baseCurrency'] });
    const brokerA = await createAccount(db, { portfolioId, name: 'Fictional Broker A', baseCurrency: 'EUR' as Account['baseCurrency'] });
    const brokerB = await createAccount(db, { portfolioId, name: 'Fictional Broker B', baseCurrency: 'EUR' as Account['baseCurrency'] });
    const worldEtf = await createAsset(db, { name: 'Fictional World Equity ETF', isin: 'XD0000DEMO1', ticker: 'WDEMO', assetType: 'ETF', bucket: 'CORE', strategyCategory: 'BROAD_MARKET', tradingCurrency: 'EUR' as Asset['tradingCurrency'] });
    const energyStock = await createAsset(db, { name: 'Fictional Green Energy Stock', isin: 'XD0000DEMO2', ticker: 'GDEMO', assetType: 'STOCK', bucket: 'SATELLITE', strategyCategory: 'SECTOR_BET', tradingCurrency: 'EUR' as Asset['tradingCurrency'] });
    const bondEtf = await createAsset(db, { name: 'Fictional Euro Bond ETF', isin: 'XD0000DEMO3', ticker: 'BDEMO', assetType: 'ETF', bucket: 'CORE', strategyCategory: 'INCOME', tradingCurrency: 'EUR' as Asset['tradingCurrency'] });
    const cash = (accountId: AccountId, type: 'CONTRIBUTION' | 'WITHDRAWAL', amount: string, date: string, sequence = 0) => createTransaction(db, { accountId, type, tradeDate: date as never, sequence, amount: amount as never, currency: 'EUR' as never, source: 'MANUAL' });
    const trade = (accountId: AccountId, assetId: AssetId, type: 'BUY' | 'SELL', quantity: string, price: string, fee: string, date: string, sequence = 0) => createTransaction(db, { accountId, assetId, type, tradeDate: date as never, sequence, quantity: quantity as never, unitPrice: price as never, fees: fee as never, taxes: '0' as never, currency: 'EUR' as never, source: 'MANUAL' });
    await cash(brokerA, 'CONTRIBUTION', '8000', '2026-01-02'); await trade(brokerA, worldEtf, 'BUY', '30', '100', '10', '2026-01-03'); await cash(brokerB, 'CONTRIBUTION', '4000', '2026-02-01'); await trade(brokerB, bondEtf, 'BUY', '20', '50', '2', '2026-02-02'); await trade(brokerA, energyStock, 'BUY', '10', '80', '4', '2026-03-01'); await trade(brokerA, worldEtf, 'SELL', '4', '95', '2', '2026-05-01'); await cash(brokerB, 'WITHDRAWAL', '500', '2026-06-01');
    for (const [assetId, observedAt, price] of [[worldEtf, '2026-01-31', '102'], [worldEtf, '2026-06-30', '112'], [energyStock, '2026-03-31', '76'], [energyStock, '2026-06-30', '92'], [bondEtf, '2026-02-28', '51'], [bondEtf, '2026-06-30', '52']] as const) await createPriceObservation(db, { assetId, observedAt: observedAt as never, price: price as never, currency: 'EUR' as never, source: 'MANUAL' });
    for (const [snapshotDate, totalValue, reportedTotalValue] of [['2026-01-31', '8050', '8049'], ['2026-02-28', '12060', '12058'], ['2026-03-31', '12020', '12022'], ['2026-06-30', '12560', '12555']] as const) await createPortfolioSnapshot(db, { portfolioId, snapshotDate: snapshotDate as never, totalValue: totalValue as never, reportedTotalValue: reportedTotalValue as never, baseCurrency: 'EUR' as never, source: 'MANUAL' });
    result = { portfolioId, portfolioName: 'Fictional Demo Portfolio' };
  });
  if (!result) throw new Error('Could not create fictional demo portfolio');
  return result;
}
