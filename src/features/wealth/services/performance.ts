import { decimal, toDecimalString, type DecimalString } from '../model/decimal';
import type { Portfolio, PortfolioSnapshot, WealthTransaction } from '../model/wealth.types';

export type PerformancePoint = { date: string; portfolioValue: DecimalString; cumulativeNetContributions: DecimalString; simpleGain: DecimalString };
export type MoneyWeightedReturn = { annualRate?: DecimalString; reason?: string };
export type PerformanceSummary = { points: PerformancePoint[]; moneyWeightedReturn: MoneyWeightedReturn; timeWeightedReturnReason: string };

function baseAmount(transaction: Extract<WealthTransaction, { type: 'CONTRIBUTION' | 'WITHDRAWAL' }>, portfolio: Portfolio) {
  if (transaction.currency === portfolio.baseCurrency) return decimal(transaction.amount);
  if (!transaction.fxRateToBase || decimal(transaction.fxRateToBase).lessThanOrEqualTo(0)) return undefined;
  return decimal(transaction.amount).times(transaction.fxRateToBase);
}
function netContributionAt(transactions: WealthTransaction[], portfolio: Portfolio, cutoff: string) {
  return transactions.filter((transaction): transaction is Extract<WealthTransaction, { type: 'CONTRIBUTION' | 'WITHDRAWAL' }> => transaction.tradeDate <= cutoff && (transaction.type === 'CONTRIBUTION' || transaction.type === 'WITHDRAWAL')).reduce((total, transaction) => { const amount = baseAmount(transaction, portfolio); return !amount ? total : transaction.type === 'CONTRIBUTION' ? total.plus(amount) : total.minus(amount); }, decimal('0' as DecimalString));
}
function xirr(flows: { date: string; amount: number }[]): number | undefined {
  if (flows.length < 2 || !flows.some((flow) => flow.amount < 0) || !flows.some((flow) => flow.amount > 0)) return undefined;
  const start = Date.parse(`${flows[0].date}T00:00:00Z`); const npv = (rate: number) => flows.reduce((sum, flow) => sum + flow.amount / (1 + rate) ** ((Date.parse(`${flow.date}T00:00:00Z`) - start) / 86_400_000 / 365), 0); let low = -0.9999; let high = 10; if (npv(low) * npv(high) > 0) return undefined;
  for (let index = 0; index < 100; index += 1) { const middle = (low + high) / 2; const value = npv(middle); if (Math.abs(value) < 0.0000001) return middle; if (npv(low) * value <= 0) high = middle; else low = middle; }
  return (low + high) / 2;
}
export function buildPerformanceSummary(portfolio: Portfolio, transactions: WealthTransaction[], snapshots: PortfolioSnapshot[]): PerformanceSummary {
  const ordered = [...snapshots].sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate) || a.id.localeCompare(b.id));
  const points = ordered.map((snapshot) => { const contributions = netContributionAt(transactions, portfolio, snapshot.snapshotDate); return { date: snapshot.snapshotDate, portfolioValue: snapshot.totalValue, cumulativeNetContributions: toDecimalString(contributions), simpleGain: toDecimalString(decimal(snapshot.totalValue).minus(contributions)) }; });
  const cashFlows = transactions.filter((transaction): transaction is Extract<WealthTransaction, { type: 'CONTRIBUTION' | 'WITHDRAWAL' }> => transaction.type === 'CONTRIBUTION' || transaction.type === 'WITHDRAWAL').flatMap((transaction) => { const amount = baseAmount(transaction, portfolio); return amount ? [{ date: transaction.tradeDate, amount: Number(amount) * (transaction.type === 'CONTRIBUTION' ? -1 : 1) }] : []; }); const terminal = ordered.at(-1); if (terminal) cashFlows.push({ date: terminal.snapshotDate, amount: Number(terminal.totalValue) }); const rate = xirr(cashFlows.sort((a, b) => a.date.localeCompare(b.date)));
  return { points, moneyWeightedReturn: rate === undefined ? { reason: 'At least one dated external cash flow and a later snapshot are required.' } : { annualRate: toDecimalString(decimal(String(rate) as DecimalString).times(100)) }, timeWeightedReturnReason: 'Unavailable: irregular manual snapshots do not isolate sub-period valuation before and after each external cash flow.' };
}
