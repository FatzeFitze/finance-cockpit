import { decimal, parseNonNegativeDecimal } from '../model/decimal';
import type { Account, Asset, Portfolio, WealthTransaction } from '../model/wealth.types';

export const CANONICAL_TRANSACTION_CSV_VERSION = 'finance-cockpit-transactions-v1';
export const CANONICAL_TRANSACTION_CSV_HEADERS = ['format_version', 'sequence', 'trade_date', 'account_name', 'transaction_type', 'isin', 'ticker', 'asset_name', 'amount', 'quantity', 'unit_price', 'fees', 'taxes', 'currency', 'fx_rate_to_base'] as const;
type CanonicalHeader = (typeof CANONICAL_TRANSACTION_CSV_HEADERS)[number];
export type ImportSeverity = 'blocking' | 'warning';
export type CsvImportIssue = { code: string; severity: ImportSeverity; message: string; row?: number };
export type CsvTransactionType = 'CONTRIBUTION' | 'WITHDRAWAL' | 'BUY' | 'SELL';
export type StagedCsvTransaction = { row: number; included: boolean; sequence: string; date: string; account: string; type: CsvTransactionType | ''; isin: string; ticker: string; assetName: string; amount: string; quantity: string; unitPrice: string; fees: string; taxes: string; currency: string; fxRateToBase: string };
export type CsvImportPreview = { transactions: StagedCsvTransaction[]; issues: CsvImportIssue[] };
export type CsvImportExistingData = { portfolio?: Portfolio; accounts: Account[]; assets: Asset[]; transactions: WealthTransaction[] };
export type CsvImportCommit = { baseCurrency: string; transactions: StagedCsvTransaction[] };

const text = (value: string | undefined) => value?.trim() ?? '';
const normalizedIdentifier = (isin: string, ticker: string, name: string) => (isin || ticker || name).trim().toUpperCase();
const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
const isCurrency = (value: string) => /^[A-Z]{3}$/.test(value);
const dangerousSpreadsheetPrefix = /^[=+\-@]/;

function parseCsv(input: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cell = ''; let quoted = false;
  for (let index = 0; index < input.length; index += 1) { const character = input[index];
    if (quoted) { if (character === '"' && input[index + 1] === '"') { cell += '"'; index += 1; } else if (character === '"') quoted = false; else cell += character; continue; }
    if (character === '"') { quoted = true; continue; }
    if (character === ',') { row.push(cell); cell = ''; continue; }
    if (character === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; continue; }
    cell += character;
  }
  if (quoted) throw new Error('CSV contains an unclosed quoted field');
  if (cell || row.length) { row.push(cell.replace(/\r$/, '')); rows.push(row); }
  return rows;
}

function csvCell(value: string): string { const safe = dangerousSpreadsheetPrefix.test(value) ? `'${value}` : value; return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe; }
function importedCell(value: string): string { return value.startsWith("'") && dangerousSpreadsheetPrefix.test(value.slice(1)) ? value.slice(1) : value; }

export function parseCanonicalTransactionsCsv(buffer: ArrayBuffer): CsvImportPreview {
  let rows: string[][];
  try { rows = parseCsv(new TextDecoder('utf-8').decode(buffer).replace(/^\uFEFF/, '')); } catch (error) { return { transactions: [], issues: [{ code: 'INVALID_CSV', severity: 'blocking', message: error instanceof Error ? error.message : 'CSV could not be parsed.' }] }; }
  const header = rows.shift()?.map((value) => value.trim());
  if (!header || header.length !== CANONICAL_TRANSACTION_CSV_HEADERS.length || header.some((value, index) => value !== CANONICAL_TRANSACTION_CSV_HEADERS[index])) return { transactions: [], issues: [{ code: 'INVALID_HEADER', severity: 'blocking', message: `CSV must use the exact ${CANONICAL_TRANSACTION_CSV_VERSION} header.` }] };
  const transactions = rows.filter((row) => row.some((value) => value.trim())).map((row, index): StagedCsvTransaction => {
    const values = Object.fromEntries(CANONICAL_TRANSACTION_CSV_HEADERS.map((name, column) => [name, importedCell(row[column] ?? '')])) as Record<CanonicalHeader, string>;
    return { row: index + 2, included: true, sequence: text(values.sequence), date: text(values.trade_date), account: text(values.account_name), type: text(values.transaction_type).toUpperCase() as CsvTransactionType, isin: text(values.isin).toUpperCase(), ticker: text(values.ticker).toUpperCase(), assetName: text(values.asset_name), amount: text(values.amount), quantity: text(values.quantity), unitPrice: text(values.unit_price), fees: text(values.fees) || '0', taxes: text(values.taxes) || '0', currency: text(values.currency).toUpperCase(), fxRateToBase: text(values.fx_rate_to_base) };
  });
  return { transactions, issues: [] };
}

function decimalIssue(issues: CsvImportIssue[], row: number, value: string, label: string, required = true) { if (!value && !required) return; try { parseNonNegativeDecimal(value); } catch { issues.push({ code: 'INVALID_DECIMAL', severity: 'blocking', row, message: `${label} must be a non-negative canonical decimal.` }); } }
function referenceFor(row: StagedCsvTransaction) { return [row.account.trim().toUpperCase(), row.type, row.date, normalizedIdentifier(row.isin, row.ticker, row.assetName), row.amount, row.quantity, row.unitPrice, row.fees, row.taxes, row.currency].join('|'); }

export function validateCanonicalCsvImport(preview: CsvImportPreview, existing: CsvImportExistingData): CsvImportPreview {
  const issues = preview.issues.filter((issue) => issue.row == null); const baseCurrency = existing.portfolio?.baseCurrency ?? 'EUR';
  const existingReferences = new Set(existing.transactions.map((transaction) => { const account = existing.accounts.find((item) => item.id === transaction.accountId)?.name ?? transaction.accountId; const asset = 'assetId' in transaction ? existing.assets.find((item) => item.id === transaction.assetId) : undefined; return referenceFor({ row: 0, included: true, sequence: String(transaction.sequence), date: transaction.tradeDate, account, type: transaction.type as CsvTransactionType, isin: asset?.isin ?? '', ticker: asset?.ticker ?? '', assetName: asset?.name ?? '', amount: 'amount' in transaction ? transaction.amount : '', quantity: 'quantity' in transaction ? transaction.quantity : '', unitPrice: 'unitPrice' in transaction ? transaction.unitPrice : '', fees: 'fees' in transaction ? transaction.fees : '0', taxes: 'taxes' in transaction ? transaction.taxes : '0', currency: transaction.currency, fxRateToBase: transaction.fxRateToBase ?? '' }); }));
  const stagedReferences = new Set<string>(); const quantities = new Map<string, ReturnType<typeof decimal>>();
  for (const transaction of existing.transactions) if (transaction.type === 'BUY' || transaction.type === 'SELL') { const asset = existing.assets.find((item) => item.id === transaction.assetId); const account = existing.accounts.find((item) => item.id === transaction.accountId); if (asset && account) { const key = `${account.name.trim().toUpperCase()}|${normalizedIdentifier(asset.isin ?? '', asset.ticker ?? '', asset.name)}`; quantities.set(key, (quantities.get(key) ?? decimal('0' as never)).plus(transaction.type === 'BUY' ? transaction.quantity : `-${transaction.quantity}`)); } }
  for (const row of [...preview.transactions].filter((item) => item.included).sort((a, b) => a.date.localeCompare(b.date) || Number(a.sequence) - Number(b.sequence) || a.row - b.row)) {
    if (!/^\d+$/.test(row.sequence)) issues.push({ code: 'INVALID_SEQUENCE', severity: 'blocking', row: row.row, message: 'Sequence must be a non-negative integer.' });
    if (!isIsoDate(row.date)) issues.push({ code: 'INVALID_DATE', severity: 'blocking', row: row.row, message: 'Trade date must use YYYY-MM-DD.' }); if (!row.account) issues.push({ code: 'MISSING_ACCOUNT', severity: 'blocking', row: row.row, message: 'An account name is required.' }); if (!['CONTRIBUTION', 'WITHDRAWAL', 'BUY', 'SELL'].includes(row.type)) issues.push({ code: 'UNSUPPORTED_TYPE', severity: 'blocking', row: row.row, message: 'Transaction type must be CONTRIBUTION, WITHDRAWAL, BUY, or SELL.' }); if (!isCurrency(row.currency)) issues.push({ code: 'INVALID_CURRENCY', severity: 'blocking', row: row.row, message: 'Currency must be a three-letter code.' }); if (row.currency !== baseCurrency && !row.fxRateToBase) issues.push({ code: 'MISSING_FX_RATE', severity: 'blocking', row: row.row, message: `An FX rate to ${baseCurrency} is required.` }); decimalIssue(issues, row.row, row.fxRateToBase, 'FX rate', false);
    if (row.type === 'CONTRIBUTION' || row.type === 'WITHDRAWAL') decimalIssue(issues, row.row, row.amount, 'Cash amount');
    if (row.type === 'BUY' || row.type === 'SELL') { if (!row.assetName && !row.isin && !row.ticker) issues.push({ code: 'MISSING_ASSET', severity: 'blocking', row: row.row, message: 'An asset name, ISIN, or ticker is required.' }); decimalIssue(issues, row.row, row.quantity, 'Quantity'); decimalIssue(issues, row.row, row.unitPrice, 'Unit price'); decimalIssue(issues, row.row, row.fees, 'Fees'); decimalIssue(issues, row.row, row.taxes, 'Taxes'); try { const key = `${row.account.trim().toUpperCase()}|${normalizedIdentifier(row.isin, row.ticker, row.assetName)}`; const quantity = decimal(parseNonNegativeDecimal(row.quantity || '0')); const next = (quantities.get(key) ?? decimal('0' as never)).plus(row.type === 'BUY' ? quantity : quantity.negated()); quantities.set(key, next); if (next.isNegative()) issues.push({ code: 'OVERSELL', severity: 'blocking', row: row.row, message: 'This sale exceeds the staged and recorded quantity for its account.' }); } catch { /* decimal issue is reported above */ } }
    const reference = referenceFor(row); if (existingReferences.has(reference)) issues.push({ code: 'LIKELY_DUPLICATE', severity: 'blocking', row: row.row, message: 'This row matches an existing transaction and is excluded from import.' }); else if (stagedReferences.has(reference)) issues.push({ code: 'DUPLICATE_IN_FILE', severity: 'blocking', row: row.row, message: 'This row duplicates an earlier staged transaction.' }); stagedReferences.add(reference);
  }
  return { ...preview, issues };
}

export function canCommitCanonicalCsvImport(preview: CsvImportPreview): boolean { return preview.transactions.some((row) => row.included) && !preview.issues.some((issue) => issue.severity === 'blocking'); }
export function toCanonicalCsvImportCommit(preview: CsvImportPreview, baseCurrency: string): CsvImportCommit { if (!canCommitCanonicalCsvImport(preview)) throw new Error('CSV import contains blocking issues'); return { baseCurrency, transactions: preview.transactions.filter((row) => row.included) }; }

export function exportCanonicalTransactionsCsv(accounts: Account[], assets: Asset[], transactions: WealthTransaction[]): string {
  const accountById = new Map(accounts.map((account) => [account.id, account])); const assetById = new Map(assets.map((asset) => [asset.id, asset]));
  const lines = [CANONICAL_TRANSACTION_CSV_HEADERS.join(',')];
  for (const transaction of [...transactions].sort((a, b) => a.tradeDate.localeCompare(b.tradeDate) || a.sequence - b.sequence || a.id.localeCompare(b.id))) { const account = accountById.get(transaction.accountId); if (!account) continue; const asset = 'assetId' in transaction && transaction.assetId ? assetById.get(transaction.assetId) : undefined; const fields = [CANONICAL_TRANSACTION_CSV_VERSION, String(transaction.sequence), transaction.tradeDate, account.name, transaction.type, asset?.isin ?? '', asset?.ticker ?? '', asset?.name ?? '', 'amount' in transaction ? transaction.amount : '', 'quantity' in transaction ? transaction.quantity : '', 'unitPrice' in transaction ? transaction.unitPrice : '', 'fees' in transaction ? transaction.fees : '0', 'taxes' in transaction ? transaction.taxes : '0', transaction.currency, transaction.fxRateToBase ?? '']; lines.push(fields.map(csvCell).join(',')); }
  return `${lines.join('\r\n')}\r\n`;
}
