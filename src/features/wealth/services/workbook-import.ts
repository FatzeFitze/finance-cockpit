import * as XLSX from 'xlsx';

import { decimal, parseNonNegativeDecimal } from '../model/decimal';
import type { Account, Asset, Portfolio, WealthTransaction } from '../model/wealth.types';

export type ImportSeverity = 'blocking' | 'warning';
export type WorkbookImportIssue = { code: string; severity: ImportSeverity; message: string; row?: number };
export type WorkbookTransactionType = 'CONTRIBUTION' | 'WITHDRAWAL' | 'BUY' | 'SELL';
export type StagedWorkbookTransaction = {
  row: number; included: boolean; date: string; account: string; type: WorkbookTransactionType | '';
  identifier: string; assetName: string; amount: string; quantity: string; unitPrice: string;
  fees: string; taxes: string; currency: string; fxRateToBase: string;
};
export type StagedWorkbookPrice = { row: number; included: boolean; date: string; identifier: string; assetName: string; price: string; currency: string };
export type StagedWorkbookSnapshot = { row: number; included: boolean; date: string; totalValue: string; reportedTotalValue: string; currency: string };
export type WorkbookImportPreview = {
  transactions: StagedWorkbookTransaction[]; prices: StagedWorkbookPrice[]; snapshots: StagedWorkbookSnapshot[];
  issues: WorkbookImportIssue[];
};
export type WorkbookImportExistingData = { portfolio?: Portfolio; accounts: Account[]; assets: Asset[]; transactions: WealthTransaction[] };
export type WorkbookImportCommit = {
  baseCurrency: string; transactions: StagedWorkbookTransaction[]; prices: StagedWorkbookPrice[]; snapshots: StagedWorkbookSnapshot[];
};

const typeMap: Record<string, WorkbookTransactionType> = {
  contribution: 'CONTRIBUTION', deposit: 'CONTRIBUTION', withdrawal: 'WITHDRAWAL', withdraw: 'WITHDRAWAL',
  buy: 'BUY', purchase: 'BUY', sell: 'SELL', sale: 'SELL',
};
const text = (value: unknown) => value == null ? '' : String(value).trim();
const field = (row: Record<string, unknown>, ...names: string[]) => {
  const key = Object.keys(row).find((candidate) => names.some((name) => candidate.trim().toLowerCase() === name.toLowerCase()));
  return key ? row[key] : '';
};
const normalizedDecimal = (value: unknown) => text(value).replace(',', '.');
const normalizedIdentifier = (identifier: string, name: string) => (identifier || name).trim().toUpperCase();
const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
const isCurrency = (value: string) => /^[A-Z]{3}$/.test(value);

function date(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) return value.toISOString().slice(0, 10);
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
  }
  return text(value);
}

function rows(sheet: XLSX.WorkSheet | undefined): Record<string, unknown>[] {
  return sheet ? XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: true }) : [];
}

export function parsePortfolioWorkbook(buffer: ArrayBuffer): WorkbookImportPreview {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const transactionSheet = workbook.Sheets.Transactions;
  const issues: WorkbookImportIssue[] = [];
  if (!transactionSheet) return { transactions: [], prices: [], snapshots: [], issues: [{ code: 'MISSING_TRANSACTIONS_SHEET', severity: 'blocking', message: 'Missing required Transactions sheet.' }] };

  const transactions = rows(transactionSheet).map((source, index): StagedWorkbookTransaction => ({
    row: index + 2, included: true, date: date(field(source, 'Date', 'Trade Date')),
    account: text(field(source, 'Account', 'Broker')), type: typeMap[text(field(source, 'Type', 'Transaction Type')).toLowerCase()] ?? '',
    identifier: text(field(source, 'Ticker / ISIN', 'ISIN', 'Ticker', 'Identifier')), assetName: text(field(source, 'Asset Name', 'Asset', 'Name')),
    amount: normalizedDecimal(field(source, 'Gross Amount', 'Net Cash Flow', 'Amount')), quantity: normalizedDecimal(field(source, 'Quantity')),
    unitPrice: normalizedDecimal(field(source, 'Price per Unit', 'Unit Price', 'Price')), fees: normalizedDecimal(field(source, 'Fees')) || '0',
    taxes: normalizedDecimal(field(source, 'Taxes')) || '0', currency: text(field(source, 'Currency')).toUpperCase() || 'EUR',
    fxRateToBase: normalizedDecimal(field(source, 'FX Rate to Base', 'FX Rate')),
  }));
  const prices = rows(workbook.Sheets.Prices ?? workbook.Sheets['Price History']).map((source, index) => ({
    row: index + 2, included: true, date: date(field(source, 'Date', 'Observed At', 'Observation Date')),
    identifier: text(field(source, 'Ticker / ISIN', 'ISIN', 'Ticker', 'Identifier')), assetName: text(field(source, 'Asset Name', 'Asset', 'Name')),
    price: normalizedDecimal(field(source, 'Price', 'Price per Unit')), currency: text(field(source, 'Currency')).toUpperCase() || 'EUR',
  }));
  const snapshots = rows(workbook.Sheets.Snapshots).map((source, index) => ({
    row: index + 2, included: true, date: date(field(source, 'Date', 'Snapshot Date')),
    totalValue: normalizedDecimal(field(source, 'Total Value', 'Portfolio Value', 'Value')),
    reportedTotalValue: normalizedDecimal(field(source, 'Broker Reported Total', 'Reported Total', 'Broker Total')),
    currency: text(field(source, 'Currency')).toUpperCase() || 'EUR',
  }));
  if (!workbook.Sheets.Snapshots) issues.push({ code: 'NO_SNAPSHOTS_SHEET', severity: 'warning', message: 'No Snapshots sheet found; transaction history can still be imported.' });
  return { transactions, prices, snapshots, issues };
}

function decimalIssue(issues: WorkbookImportIssue[], row: number, value: string, label: string, required = true) {
  if (!value && !required) return;
  try { parseNonNegativeDecimal(value); } catch { issues.push({ code: 'INVALID_DECIMAL', severity: 'blocking', row, message: `${label} must be a non-negative canonical decimal.` }); }
}
function referenceFor(row: StagedWorkbookTransaction) { return [row.account.trim().toUpperCase(), row.type, row.date, normalizedIdentifier(row.identifier, row.assetName), row.amount, row.quantity, row.unitPrice, row.fees, row.taxes, row.currency].join('|'); }

export function validateWorkbookImport(preview: WorkbookImportPreview, existing: WorkbookImportExistingData): WorkbookImportPreview {
  // Parser-level issues have no row and remain visible across each in-place correction.
  const issues = preview.issues.filter((issue) => issue.row == null);
  const baseCurrency = existing.portfolio?.baseCurrency ?? 'EUR';
  const accountNames = new Set(existing.accounts.map((account) => account.name.trim().toUpperCase()));
  const assetKeys = new Set(existing.assets.flatMap((asset) => [asset.isin, asset.ticker, asset.name].filter(Boolean).map((value) => String(value).trim().toUpperCase())));
  const existingReferences = new Set(existing.transactions.map((transaction) => {
    const account = existing.accounts.find((item) => item.id === transaction.accountId)?.name ?? transaction.accountId;
    const asset = 'assetId' in transaction ? existing.assets.find((item) => item.id === transaction.assetId) : undefined;
    return referenceFor({ row: 0, included: true, date: transaction.tradeDate, account, type: transaction.type as WorkbookTransactionType, identifier: asset?.isin ?? asset?.ticker ?? '', assetName: asset?.name ?? '', amount: 'amount' in transaction ? transaction.amount : '', quantity: 'quantity' in transaction ? transaction.quantity : '', unitPrice: 'unitPrice' in transaction ? transaction.unitPrice : '', fees: 'fees' in transaction ? transaction.fees : '0', taxes: 'taxes' in transaction ? transaction.taxes : '0', currency: transaction.currency, fxRateToBase: transaction.fxRateToBase ?? '' });
  }));
  const stagedReferences = new Set<string>();
  const quantities = new Map<string, ReturnType<typeof decimal>>();
  for (const transaction of existing.transactions) if (transaction.type === 'BUY' || transaction.type === 'SELL') {
    const asset = existing.assets.find((item) => item.id === transaction.assetId); const account = existing.accounts.find((item) => item.id === transaction.accountId);
    if (asset && account) { const key = `${account.name.trim().toUpperCase()}|${normalizedIdentifier(asset.isin ?? asset.ticker ?? '', asset.name)}`; quantities.set(key, (quantities.get(key) ?? decimal('0' as never)).plus(transaction.type === 'BUY' ? transaction.quantity : `-${transaction.quantity}`)); }
  }
  for (const row of [...preview.transactions].filter((item) => item.included).sort((a, b) => a.date.localeCompare(b.date) || a.row - b.row)) {
    if (!isIsoDate(row.date)) issues.push({ code: 'INVALID_DATE', severity: 'blocking', row: row.row, message: 'Transaction date must use YYYY-MM-DD.' });
    if (!row.account) issues.push({ code: 'MISSING_ACCOUNT', severity: 'blocking', row: row.row, message: 'An account is required.' });
    if (!row.type) issues.push({ code: 'UNSUPPORTED_TYPE', severity: 'blocking', row: row.row, message: 'Use contribution, withdrawal, buy, or sell.' });
    if (!isCurrency(row.currency)) issues.push({ code: 'INVALID_CURRENCY', severity: 'blocking', row: row.row, message: 'Currency must be a three-letter code.' });
    if (row.currency !== baseCurrency && !row.fxRateToBase) issues.push({ code: 'MISSING_FX_RATE', severity: 'blocking', row: row.row, message: `An FX rate to ${baseCurrency} is required.` });
    decimalIssue(issues, row.row, row.fxRateToBase, 'FX rate', false);
    if (row.type === 'CONTRIBUTION' || row.type === 'WITHDRAWAL') decimalIssue(issues, row.row, row.amount, 'Cash amount');
    if (row.type === 'BUY' || row.type === 'SELL') {
      if (!row.assetName && !row.identifier) issues.push({ code: 'MISSING_ASSET', severity: 'blocking', row: row.row, message: 'An asset name or identifier is required.' });
      decimalIssue(issues, row.row, row.quantity, 'Quantity'); decimalIssue(issues, row.row, row.unitPrice, 'Unit price'); decimalIssue(issues, row.row, row.fees, 'Fees'); decimalIssue(issues, row.row, row.taxes, 'Taxes');
      try { const key = `${row.account.trim().toUpperCase()}|${normalizedIdentifier(row.identifier, row.assetName)}`; const quantity = decimal(parseNonNegativeDecimal(row.quantity || '0')); const next = (quantities.get(key) ?? decimal('0' as never)).plus(row.type === 'BUY' ? quantity : quantity.negated()); quantities.set(key, next); if (next.isNegative()) issues.push({ code: 'OVERSELL', severity: 'blocking', row: row.row, message: 'This sale exceeds the staged and recorded quantity for its account.' }); } catch { /* required-value issue is already reported */ }
    }
    const ref = referenceFor(row); if (existingReferences.has(ref)) issues.push({ code: 'LIKELY_DUPLICATE', severity: 'blocking', row: row.row, message: 'This row matches an existing transaction and is excluded from import.' }); else if (stagedReferences.has(ref)) issues.push({ code: 'DUPLICATE_IN_FILE', severity: 'blocking', row: row.row, message: 'This row duplicates an earlier staged transaction.' }); stagedReferences.add(ref);
    accountNames.add(row.account.trim().toUpperCase()); if (row.identifier || row.assetName) assetKeys.add(normalizedIdentifier(row.identifier, row.assetName));
  }
  for (const row of preview.prices.filter((item) => item.included)) { if (!isIsoDate(row.date) || !row.assetName && !row.identifier || !isCurrency(row.currency)) issues.push({ code: 'INVALID_PRICE', severity: 'blocking', row: row.row, message: 'Price rows need date, asset, and currency.' }); decimalIssue(issues, row.row, row.price, 'Price'); if (!assetKeys.has(normalizedIdentifier(row.identifier, row.assetName))) issues.push({ code: 'UNMAPPED_PRICE_ASSET', severity: 'blocking', row: row.row, message: 'Price asset must match an existing or staged trade asset.' }); }
  for (const row of preview.snapshots.filter((item) => item.included)) { if (!isIsoDate(row.date) || !isCurrency(row.currency) || row.currency !== baseCurrency) issues.push({ code: 'INVALID_SNAPSHOT', severity: 'blocking', row: row.row, message: `Snapshots need a ${baseCurrency} date and currency.` }); decimalIssue(issues, row.row, row.totalValue, 'Snapshot total'); decimalIssue(issues, row.row, row.reportedTotalValue, 'Reported total', false); }
  return { ...preview, issues };
}

export function canCommitWorkbookImport(preview: WorkbookImportPreview): boolean { return preview.transactions.some((row) => row.included) && !preview.issues.some((issue) => issue.severity === 'blocking'); }
export function toWorkbookImportCommit(preview: WorkbookImportPreview, baseCurrency: string): WorkbookImportCommit { if (!canCommitWorkbookImport(preview)) throw new Error('Workbook import contains blocking issues'); return { baseCurrency, transactions: preview.transactions.filter((row) => row.included), prices: preview.prices.filter((row) => row.included), snapshots: preview.snapshots.filter((row) => row.included) }; }
