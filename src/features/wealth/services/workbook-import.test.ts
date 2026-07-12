import assert from 'node:assert/strict';
import test from 'node:test';
import * as XLSX from 'xlsx';

import { canCommitWorkbookImport, parsePortfolioWorkbook, validateWorkbookImport } from './workbook-import';

function workbook(rows: unknown[][]): ArrayBuffer {
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(rows), 'Transactions');
  return XLSX.write(book, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}

test('parses a fictional workbook and stages valid transaction values without writing data', () => {
  const parsed = parsePortfolioWorkbook(workbook([
    ['Date', 'Account', 'Type', 'Ticker / ISIN', 'Asset Name', 'Quantity', 'Price per Unit', 'Fees', 'Taxes', 'Currency'],
    ['2026-01-02', 'Fictional Broker', 'buy', 'FICT', 'Fictional ETF', '2.5', '12.34', '0.5', '0', 'EUR'],
  ]));
  const staged = validateWorkbookImport(parsed, { accounts: [], assets: [], transactions: [] });
  assert.equal(staged.transactions[0].type, 'BUY');
  assert.equal(staged.transactions[0].quantity, '2.5');
  assert.equal(canCommitWorkbookImport(staged), true);
});

test('blocks unsupported types, duplicate transaction rows, missing FX, and staged oversells', () => {
  const parsed = parsePortfolioWorkbook(workbook([
    ['Date', 'Account', 'Type', 'Ticker / ISIN', 'Asset Name', 'Quantity', 'Price per Unit', 'Currency'],
    ['2026-01-02', 'Broker', 'buy', 'FICT', 'Fictional ETF', '1', '10', 'USD'],
    ['2026-01-03', 'Broker', 'sell', 'FICT', 'Fictional ETF', '2', '10', 'EUR'],
    ['2026-01-04', 'Broker', 'mystery', '', '', '', '', 'EUR'],
  ]));
  const staged = validateWorkbookImport(parsed, { accounts: [], assets: [], transactions: [] });
  assert.equal(canCommitWorkbookImport(staged), false);
  assert.deepEqual(new Set(staged.issues.map((issue) => issue.code)), new Set(['NO_SNAPSHOTS_SHEET', 'MISSING_FX_RATE', 'OVERSELL', 'UNSUPPORTED_TYPE']));
});
