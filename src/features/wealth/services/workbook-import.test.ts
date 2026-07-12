import assert from 'node:assert/strict';
import test from 'node:test';

import { CANONICAL_TRANSACTION_CSV_HEADERS, CANONICAL_TRANSACTION_CSV_VERSION, canCommitCanonicalCsvImport, exportCanonicalTransactionsCsv, isCanonicalTransactionCsvFilename, parseCanonicalTransactionsCsv, validateCanonicalCsvImport } from './workbook-import';

const csv = (rows: string[]) => new TextEncoder().encode([CANONICAL_TRANSACTION_CSV_HEADERS.join(','), ...rows].join('\n')).buffer;

test('parses and validates the exact canonical transaction CSV contract without writing data', () => {
  const staged = validateCanonicalCsvImport(parseCanonicalTransactionsCsv(csv([`${CANONICAL_TRANSACTION_CSV_VERSION},0,2026-01-02,Fictional Broker,BUY,,FICT,Fictional ETF,,2.5,12.34,0.5,0,EUR,`])), { accounts: [], assets: [], transactions: [] });
  assert.equal(staged.transactions[0].type, 'BUY');
  assert.equal(staged.transactions[0].quantity, '2.5');
  assert.equal(canCommitCanonicalCsvImport(staged), true);
});

test('rejects a CSV with a non-canonical header and blocks bad staged histories', () => {
  const invalid = parseCanonicalTransactionsCsv(new TextEncoder().encode('date,amount\n2026-01-01,10').buffer);
  assert.equal(canCommitCanonicalCsvImport(invalid), false);
  const staged = validateCanonicalCsvImport(parseCanonicalTransactionsCsv(csv([`${CANONICAL_TRANSACTION_CSV_VERSION},0,2026-01-02,Broker,BUY,,FICT,Fictional ETF,,1,10,0,0,USD,`, `${CANONICAL_TRANSACTION_CSV_VERSION},1,2026-01-03,Broker,SELL,,FICT,Fictional ETF,,2,10,0,0,EUR,`])), { accounts: [], assets: [], transactions: [] });
  assert.equal(canCommitCanonicalCsvImport(staged), false);
  assert.deepEqual(new Set(staged.issues.map((issue) => issue.code)), new Set(['MISSING_FX_RATE', 'OVERSELL']));
});

test('exports the same versioned CSV contract with a stable transaction order', () => {
  const output = exportCanonicalTransactionsCsv([{ id: 'account' as never, portfolioId: 'portfolio' as never, name: 'Fictional Broker', baseCurrency: 'EUR' as never, isActive: true }], [], [{ id: 'transaction' as never, accountId: 'account' as never, type: 'CONTRIBUTION', tradeDate: '2026-01-01' as never, sequence: 0, amount: '100' as never, currency: 'EUR' as never, source: 'MANUAL' }]);
  assert.match(output, new RegExp(`^${CANONICAL_TRANSACTION_CSV_HEADERS.join(',')}`));
  assert.match(output, new RegExp(`${CANONICAL_TRANSACTION_CSV_VERSION},0,2026-01-01,Fictional Broker,CONTRIBUTION`));
});

test('accepts CSV filename variants without relying on provider MIME metadata', () => {
  assert.equal(isCanonicalTransactionCsvFilename('transactions.CSV'), true);
  assert.equal(isCanonicalTransactionCsvFilename('transactions.xlsx'), false);
});
