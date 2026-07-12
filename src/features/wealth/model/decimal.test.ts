import assert from 'node:assert/strict';
import test from 'node:test';

import {
  decimal,
  parseDecimal,
  parseNonNegativeDecimal,
  roundDecimal,
  toDecimalString,
} from './decimal';
import type { TradeTransaction } from './wealth.types';

test('accepts and normalizes canonical decimal strings', () => {
  assert.equal(parseDecimal('0'), '0');
  assert.equal(parseDecimal('-12.3400'), '-12.34');
  assert.equal(parseNonNegativeDecimal('12.3400'), '12.34');
});

test('rejects locale, exponent, whitespace, and negative magnitude input', () => {
  for (const value of ['1,25', '1.234,56', '€12.00', ' 12', '12 ', '1e3', '.5', '']) {
    assert.throws(() => parseDecimal(value));
  }

  assert.throws(() => parseNonNegativeDecimal('-1'));
  assert.throws(() => parseNonNegativeDecimal('-0'));
});

test('keeps exact fractional acquisition precision from fictional example 6', () => {
  const quantity = parseNonNegativeDecimal('1.234567');
  const unitPrice = parseNonNegativeDecimal('81.1234');
  const fee = parseNonNegativeDecimal('1.50');

  const gross = decimal(quantity).times(decimal(unitPrice));
  const acquisitionCost = gross.plus(decimal(fee));

  assert.equal(toDecimalString(gross), '100.1522725678');
  assert.equal(toDecimalString(acquisitionCost), '101.6522725678');
  assert.equal(roundDecimal(toDecimalString(acquisitionCost), 2), '101.65');
  assert.equal(toDecimalString(acquisitionCost), '101.6522725678');
});

test('calculates the fictional moving-average partial sale without binary drift', () => {
  const firstCost = decimal(parseNonNegativeDecimal('10'))
    .times(decimal(parseNonNegativeDecimal('100')))
    .plus(decimal(parseNonNegativeDecimal('10')));
  const secondCost = decimal(parseNonNegativeDecimal('5'))
    .times(decimal(parseNonNegativeDecimal('120')))
    .plus(decimal(parseNonNegativeDecimal('5')));
  const totalQuantity = decimal(parseNonNegativeDecimal('15'));
  const totalCost = firstCost.plus(secondCost);
  const soldQuantity = decimal(parseNonNegativeDecimal('6'));
  // Divide last so the repeating informational average is not rounded prematurely.
  const disposedCost = totalCost.times(soldQuantity).dividedBy(totalQuantity);
  const netProceeds = soldQuantity
    .times(decimal(parseNonNegativeDecimal('150')))
    .minus(decimal(parseNonNegativeDecimal('6')))
    .minus(decimal(parseNonNegativeDecimal('9')));

  assert.equal(toDecimalString(disposedCost), '646');
  assert.equal(toDecimalString(netProceeds.minus(disposedCost)), '239');
  assert.equal(toDecimalString(totalCost.minus(disposedCost)), '969');
});

test('transaction union makes trade-only fields explicit', () => {
  const buy = {
    id: 'transaction-fictional-1',
    type: 'BUY',
    accountId: 'broker-fictional-a',
    assetId: 'asset-fictional-etf',
    tradeDate: '2026-01-15',
    sequence: 1,
    quantity: parseNonNegativeDecimal('4'),
    unitPrice: parseNonNegativeDecimal('100'),
    fees: parseNonNegativeDecimal('4'),
    taxes: parseNonNegativeDecimal('0'),
    currency: 'EUR',
    source: 'MANUAL',
  } as TradeTransaction;

  assert.equal(buy.type, 'BUY');
  assert.equal(buy.quantity, '4');
});
