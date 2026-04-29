export const INVESTMENT_ASSET_TYPES = [
  'Stock',
  'ETF',
  'Fund',
  'Bond',
  'Crypto',
  'Other',
] as const;

export const INVESTMENT_STATUSES = [
  'Researching',
  'Watching',
  'Ready to buy',
  'Hold off',
  'Bought',
  'Rejected',
] as const;

export const INVESTMENT_CONVICTIONS = ['Low', 'Medium', 'High'] as const;

export const INVESTMENT_CURRENCIES = ['EUR', 'USD'] as const;

export type InvestmentAssetType = (typeof INVESTMENT_ASSET_TYPES)[number];
export type InvestmentStatus = (typeof INVESTMENT_STATUSES)[number];
export type InvestmentConviction = (typeof INVESTMENT_CONVICTIONS)[number];
export type InvestmentCurrency = (typeof INVESTMENT_CURRENCIES)[number];

export type InvestmentCandidate = {
  id: string;
  name: string;
  symbol?: string | null;
  assetType: InvestmentAssetType;
  status: InvestmentStatus;
  conviction: InvestmentConviction;
  currency: InvestmentCurrency;
  targetBuyPrice?: number | null;
  referencePrice?: number | null;
  thesis?: string | null;
  riskNotes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateInvestmentCandidateInput = {
  name: string;
  symbol?: string;
  assetType: InvestmentAssetType;
  status: InvestmentStatus;
  conviction: InvestmentConviction;
  currency: InvestmentCurrency;
  targetBuyPrice?: number | null;
  referencePrice?: number | null;
  thesis?: string;
  riskNotes?: string;
};