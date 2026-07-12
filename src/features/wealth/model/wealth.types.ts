import type { DecimalString, NonNegativeDecimalString } from './decimal';

type Brand<Value, Name extends string> = Value & { readonly __brand: Name };

export type PortfolioId = Brand<string, 'PortfolioId'>;
export type AccountId = Brand<string, 'AccountId'>;
export type AssetId = Brand<string, 'AssetId'>;
export type TransactionId = Brand<string, 'TransactionId'>;
export type CurrencyCode = Brand<string, 'CurrencyCode'>;
export type IsoDate = Brand<string, 'IsoDate'>;

export const ASSET_TYPES = ['ETF', 'STOCK', 'BOND', 'FUND', 'CASH_LIKE', 'OTHER'] as const;
export type AssetType = (typeof ASSET_TYPES)[number];

export const WEALTH_BUCKETS = ['CORE', 'SATELLITE', 'CASH'] as const;
export type WealthBucket = (typeof WEALTH_BUCKETS)[number];

export const STRATEGY_CATEGORIES = [
  'BROAD_MARKET',
  'SECTOR_BET',
  'SMALL_CAP',
  'SPECULATIVE',
  'INCOME',
  'CASH',
  'OTHER',
] as const;
export type StrategyCategory = (typeof STRATEGY_CATEGORIES)[number];

export const TRANSACTION_TYPES = [
  'CONTRIBUTION',
  'WITHDRAWAL',
  'BUY',
  'SELL',
  'DIVIDEND',
  'INTEREST',
  'FEE',
  'TAX',
] as const;
export type WealthTransactionType = (typeof TRANSACTION_TYPES)[number];

export type TransactionSource = 'MANUAL' | 'IMPORT';

type TransactionBase<Type extends WealthTransactionType> = {
  id: TransactionId;
  type: Type;
  accountId: AccountId;
  tradeDate: IsoDate;
  sequence: number;
  currency: CurrencyCode;
  fxRateToBase?: NonNegativeDecimalString;
  note?: string;
  source: TransactionSource;
  sourceRef?: string;
};

export type TradeTransaction = TransactionBase<'BUY' | 'SELL'> & {
  assetId: AssetId;
  quantity: NonNegativeDecimalString;
  unitPrice: NonNegativeDecimalString;
  fees: NonNegativeDecimalString;
  taxes: NonNegativeDecimalString;
  reportedNetAmount?: NonNegativeDecimalString;
};

export type ExternalCashTransaction = TransactionBase<'CONTRIBUTION' | 'WITHDRAWAL'> & {
  amount: NonNegativeDecimalString;
};

export type DividendTransaction = TransactionBase<'DIVIDEND'> & {
  assetId: AssetId;
  grossAmount: NonNegativeDecimalString;
  withholdingTax: NonNegativeDecimalString;
  fees: NonNegativeDecimalString;
};

export type InterestTransaction = TransactionBase<'INTEREST'> & {
  grossAmount: NonNegativeDecimalString;
  withholdingTax: NonNegativeDecimalString;
  fees: NonNegativeDecimalString;
  assetId?: AssetId;
};

export type FeeTransaction = TransactionBase<'FEE'> & {
  amount: NonNegativeDecimalString;
  assetId?: AssetId;
};

export type TaxTransaction = TransactionBase<'TAX'> & {
  amount: NonNegativeDecimalString;
  assetId?: AssetId;
};

export type WealthTransaction =
  | TradeTransaction
  | ExternalCashTransaction
  | DividendTransaction
  | InterestTransaction
  | FeeTransaction
  | TaxTransaction;

export type CreateWealthTransactionInput =
  | Omit<TradeTransaction, 'id' | 'source'> & { source?: TransactionSource }
  | Omit<ExternalCashTransaction, 'id' | 'source'> & { source?: TransactionSource };

export type WealthIssueSeverity = 'warning' | 'blocking';

export type WealthIssueCode =
  | 'OVERSELL'
  | 'NEGATIVE_CASH_BALANCE'
  | 'MISSING_FX_RATE'
  | 'INVALID_TRANSACTION_SHAPE'
  | 'AMOUNT_MISMATCH'
  | 'DUPLICATE_ISIN'
  | 'MISSING_PRICE'
  | 'STALE_PRICE'
  | 'UNSUPPORTED_TRANSACTION_TYPE';

export type WealthIssue = {
  code: WealthIssueCode;
  severity: WealthIssueSeverity;
  transactionId?: TransactionId;
  accountId?: AccountId;
  assetId?: AssetId;
  details: Record<string, string>;
};

export type Portfolio = {
  id: PortfolioId;
  name: string;
  baseCurrency: CurrencyCode;
};

export type Account = {
  id: AccountId;
  portfolioId: PortfolioId;
  name: string;
  institutionName?: string;
  baseCurrency: CurrencyCode;
  isActive: boolean;
};

export type Asset = {
  id: AssetId;
  name: string;
  isin?: string;
  ticker?: string;
  assetType: AssetType;
  bucket: WealthBucket;
  strategyCategory: StrategyCategory;
  tradingCurrency: CurrencyCode;
  isActive: boolean;
};

export type PositionAmounts = {
  quantity: DecimalString;
  remainingCostBasis: DecimalString;
  averageUnitCost: DecimalString;
  realizedGrossResult: DecimalString;
  realizedNetResult: DecimalString;
};

export type PriceObservation = {
  id: string;
  assetId: AssetId;
  observedAt: IsoDate;
  price: NonNegativeDecimalString;
  currency: CurrencyCode;
  source: TransactionSource;
};
