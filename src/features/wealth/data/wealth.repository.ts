import type { SQLiteDatabase } from 'expo-sqlite';

import type {
    Account,
    AccountId,
    Asset,
    AssetId,
    Portfolio,
    PortfolioId,
    TradeTransaction,
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

function mapTransactionRow(row: TransactionRow): TradeTransaction {
  return {
    id: row.id as TransactionId,
    type: row.type as TradeTransaction['type'],
    accountId: row.account_id as AccountId,
    assetId: row.asset_id as AssetId,
    tradeDate: row.trade_date as TradeTransaction['tradeDate'],
    sequence: row.sequence,
    quantity: row.quantity as TradeTransaction['quantity'],
    unitPrice: row.unit_price as TradeTransaction['unitPrice'],
    fees: row.fees as TradeTransaction['fees'],
    taxes: row.taxes as TradeTransaction['taxes'],
    currency: row.currency as TradeTransaction['currency'],
    fxRateToBase: row.fx_rate_to_base as TradeTransaction['fxRateToBase'],
    note: row.note ?? undefined,
    source: row.source_type as TradeTransaction['source'],
    sourceRef: row.source_ref ?? undefined,
    reportedNetAmount: row.reported_net_amount as TradeTransaction['reportedNetAmount'],
  };
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

export async function createTransaction(
  db: SQLiteDatabase,
  input: Pick<TradeTransaction, 'accountId' | 'assetId' | 'type' | 'tradeDate' | 'sequence' | 'quantity' | 'unitPrice' | 'fees' | 'taxes' | 'currency' | 'fxRateToBase' | 'note' | 'source'> & {
    sourceRef?: string;
  },
): Promise<TransactionId> {
  const id = `transaction-${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
  const now = new Date().toISOString();

  try {
    await db.runAsync(
      `INSERT INTO wealth_transactions (
        id, account_id, asset_id, type, trade_date, sequence, quantity, unit_price, gross_amount,
        fees, taxes, currency, fx_rate_to_base, base_amount, reported_net_amount, note,
        source_type, source_ref, is_deleted, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? )`,
      id,
      input.accountId,
      input.assetId ?? null,
      input.type,
      input.tradeDate,
      input.sequence,
      input.quantity ?? null,
      input.unitPrice ?? null,
      null,
      input.fees ?? '0',
      input.taxes ?? '0',
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
): Promise<TradeTransaction[]> {
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
