import { decimal, toDecimalString, type DecimalString } from '../model/decimal';
import type { Account, AccountId, Asset, AssetId, Portfolio, WealthIssue, WealthTransaction } from '../model/wealth.types';

export type AccountCashProjection = { accountId: AccountId; cashBalance: DecimalString };
export type PositionProjection = {
  accountId: AccountId; assetId: AssetId; quantity: DecimalString; remainingCostBasis: DecimalString;
  averageUnitCost: DecimalString; realizedGrossResult: DecimalString; realizedNetResult: DecimalString;
  totalFees: DecimalString; totalTaxes: DecimalString; firstActivityDate?: string; latestActivityDate?: string; isClosed: boolean;
};
export type AggregatedPositionProjection = Omit<PositionProjection, 'accountId'>;
export type PortfolioProjection = {
  accountCash: AccountCashProjection[]; positions: PositionProjection[]; aggregatedPositions: AggregatedPositionProjection[];
  netExternalContributions: DecimalString; income: DecimalString; totalFees: DecimalString; totalTaxes: DecimalString; issues: WealthIssue[];
};
export type ProjectLedgerInput = { portfolio: Portfolio; accounts: Account[]; assets: Asset[]; transactions: WealthTransaction[]; cutoff?: string };

type MutablePosition = { accountId: AccountId; assetId: AssetId; quantity: ReturnType<typeof decimal>; cost: ReturnType<typeof decimal>; realizedGross: ReturnType<typeof decimal>; realizedNet: ReturnType<typeof decimal>; fees: ReturnType<typeof decimal>; taxes: ReturnType<typeof decimal>; firstActivityDate?: string; latestActivityDate?: string };
const zero = () => decimal('0' as DecimalString);

function issue(issues: WealthIssue[], code: WealthIssue['code'], severity: WealthIssue['severity'], transaction: WealthTransaction, details: Record<string, string> = {}) { issues.push({ code, severity, transactionId: transaction.id, accountId: transaction.accountId, ...('assetId' in transaction ? { assetId: transaction.assetId } : {}), details }); }
function orderTransactions(transactions: WealthTransaction[]) { return [...transactions].sort((a, b) => a.tradeDate.localeCompare(b.tradeDate) || a.sequence - b.sequence || a.id.localeCompare(b.id)); }
function amountInBase(value: ReturnType<typeof decimal>, transaction: WealthTransaction, portfolio: Portfolio, issues: WealthIssue[]): ReturnType<typeof decimal> | null {
  if (transaction.currency === portfolio.baseCurrency) return value;
  if (!transaction.fxRateToBase || decimal(transaction.fxRateToBase).lessThanOrEqualTo(0)) { if (!issues.some((item) => item.code === 'MISSING_FX_RATE' && item.transactionId === transaction.id)) issue(issues, 'MISSING_FX_RATE', 'blocking', transaction); return null; }
  return value.times(decimal(transaction.fxRateToBase));
}

export function projectLedger({ portfolio, accounts, assets, transactions, cutoff }: ProjectLedgerInput): PortfolioProjection {
  const issues: WealthIssue[] = []; const accountIds = new Set(accounts.filter((account) => account.portfolioId === portfolio.id).map((account) => account.id)); const assetIds = new Set(assets.map((asset) => asset.id));
  const cash = new Map<AccountId, ReturnType<typeof decimal>>(); for (const id of accountIds) cash.set(id, zero());
  const positions = new Map<string, MutablePosition>(); let external = zero(); let income = zero(); let totalFees = zero(); let totalTaxes = zero();
  for (const transaction of orderTransactions(transactions).filter((item) => !cutoff || item.tradeDate <= cutoff)) {
    if (!accountIds.has(transaction.accountId)) { issue(issues, 'INVALID_TRANSACTION_SHAPE', 'blocking', transaction, { reason: 'account_not_in_portfolio' }); continue; }
    const addCash = (value: ReturnType<typeof decimal>) => cash.set(transaction.accountId, (cash.get(transaction.accountId) ?? zero()).plus(value));
    if (transaction.type === 'CONTRIBUTION' || transaction.type === 'WITHDRAWAL') { const base = amountInBase(decimal(transaction.amount), transaction, portfolio, issues); if (base) { const signed = transaction.type === 'CONTRIBUTION' ? base : base.negated(); addCash(signed); external = external.plus(signed); } continue; }
    if (transaction.type !== 'BUY' && transaction.type !== 'SELL') { issue(issues, 'UNSUPPORTED_TRANSACTION_TYPE', 'warning', transaction); continue; }
    if (!assetIds.has(transaction.assetId)) { issue(issues, 'INVALID_TRANSACTION_SHAPE', 'blocking', transaction, { reason: 'missing_asset' }); continue; }
    const key = `${transaction.accountId}:${transaction.assetId}`; let position = positions.get(key);
    if (!position) { position = { accountId: transaction.accountId, assetId: transaction.assetId, quantity: zero(), cost: zero(), realizedGross: zero(), realizedNet: zero(), fees: zero(), taxes: zero() }; positions.set(key, position); }
    position.firstActivityDate ??= transaction.tradeDate; position.latestActivityDate = transaction.tradeDate;
    const quantity = decimal(transaction.quantity); const gross = quantity.times(decimal(transaction.unitPrice)); const fees = decimal(transaction.fees); const taxes = decimal(transaction.taxes); const grossBase = amountInBase(gross, transaction, portfolio, issues); const feesBase = amountInBase(fees, transaction, portfolio, issues); const taxesBase = amountInBase(taxes, transaction, portfolio, issues);
    totalFees = totalFees.plus(feesBase ?? zero()); totalTaxes = totalTaxes.plus(taxesBase ?? zero()); position.fees = position.fees.plus(feesBase ?? zero()); position.taxes = position.taxes.plus(taxesBase ?? zero());
    if (transaction.type === 'BUY') { position.quantity = position.quantity.plus(quantity); if (grossBase && feesBase && taxesBase) position.cost = position.cost.plus(grossBase).plus(feesBase).plus(taxesBase); const cashEffect = amountInBase(gross.plus(fees).plus(taxes), transaction, portfolio, issues); if (cashEffect) addCash(cashEffect.negated()); continue; }
    if (position.quantity.lessThan(quantity)) { issue(issues, 'OVERSELL', 'blocking', transaction, { availableQuantity: toDecimalString(position.quantity) }); continue; }
    const previousQuantity = position.quantity; const remainingQuantity = previousQuantity.minus(quantity); const remainingCost = remainingQuantity.isZero() ? zero() : position.cost.times(remainingQuantity).dividedBy(previousQuantity); const disposedCost = position.cost.minus(remainingCost); position.quantity = remainingQuantity; position.cost = remainingCost; if (grossBase && feesBase && taxesBase) { position.realizedGross = position.realizedGross.plus(grossBase.minus(disposedCost)); position.realizedNet = position.realizedNet.plus(grossBase.minus(feesBase).minus(taxesBase).minus(disposedCost)); } const cashEffect = amountInBase(gross.minus(fees).minus(taxes), transaction, portfolio, issues); if (cashEffect) addCash(cashEffect);
  }
  const projected = [...positions.values()].map((position): PositionProjection => ({ accountId: position.accountId, assetId: position.assetId, quantity: toDecimalString(position.quantity), remainingCostBasis: toDecimalString(position.cost), averageUnitCost: toDecimalString(position.quantity.isZero() ? zero() : position.cost.dividedBy(position.quantity)), realizedGrossResult: toDecimalString(position.realizedGross), realizedNetResult: toDecimalString(position.realizedNet), totalFees: toDecimalString(position.fees), totalTaxes: toDecimalString(position.taxes), firstActivityDate: position.firstActivityDate, latestActivityDate: position.latestActivityDate, isClosed: position.quantity.isZero() }));
  const aggregates = new Map<AssetId, AggregatedPositionProjection>(); for (const position of projected) { const current = aggregates.get(position.assetId); if (!current) { const { accountId: _accountId, ...aggregate } = position; aggregates.set(position.assetId, aggregate); continue; } const quantity = decimal(current.quantity).plus(position.quantity); const cost = decimal(current.remainingCostBasis).plus(position.remainingCostBasis); current.quantity = toDecimalString(quantity); current.remainingCostBasis = toDecimalString(cost); current.averageUnitCost = toDecimalString(quantity.isZero() ? zero() : cost.dividedBy(quantity)); current.realizedGrossResult = toDecimalString(decimal(current.realizedGrossResult).plus(position.realizedGrossResult)); current.realizedNetResult = toDecimalString(decimal(current.realizedNetResult).plus(position.realizedNetResult)); current.totalFees = toDecimalString(decimal(current.totalFees).plus(position.totalFees)); current.totalTaxes = toDecimalString(decimal(current.totalTaxes).plus(position.totalTaxes)); current.firstActivityDate = current.firstActivityDate && position.firstActivityDate ? (current.firstActivityDate < position.firstActivityDate ? current.firstActivityDate : position.firstActivityDate) : current.firstActivityDate ?? position.firstActivityDate; current.latestActivityDate = current.latestActivityDate && position.latestActivityDate ? (current.latestActivityDate > position.latestActivityDate ? current.latestActivityDate : position.latestActivityDate) : current.latestActivityDate ?? position.latestActivityDate; current.isClosed = quantity.isZero(); }
  const accountCash = [...cash.entries()].map(([accountId, balance]) => ({ accountId, cashBalance: toDecimalString(balance) })); for (const account of accountCash) if (decimal(account.cashBalance).isNegative()) issues.push({ code: 'NEGATIVE_CASH_BALANCE', severity: 'warning', accountId: account.accountId, details: {} });
  return { accountCash, positions: projected, aggregatedPositions: [...aggregates.values()], netExternalContributions: toDecimalString(external), income: toDecimalString(income), totalFees: toDecimalString(totalFees), totalTaxes: toDecimalString(totalTaxes), issues };
}
