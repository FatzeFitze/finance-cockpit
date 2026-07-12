import assert from 'node:assert/strict';
import test from 'node:test';
import { parseNonNegativeDecimal } from '../model/decimal';
import type { Asset, Portfolio, PriceObservation } from '../model/wealth.types';
import { valuePortfolio } from './portfolio-valuation';

const portfolio = { id: 'portfolio-1', name: 'Fictional', baseCurrency: 'EUR' } as Portfolio;
const asset = { id: 'asset-1', name: 'Fictional ETF', assetType: 'ETF', bucket: 'CORE', strategyCategory: 'BROAD_MARKET', tradingCurrency: 'EUR', isActive: true } as Asset;
const projection = { accountCash: [], positions: [], aggregatedPositions: [{ assetId: asset.id, quantity: '9', remainingCostBasis: '969', averageUnitCost: '107.666', realizedGrossResult: '0', realizedNetResult: '0', totalFees: '0', totalTaxes: '0', isClosed: false }], netExternalContributions: '0', income: '0', totalFees: '0', totalTaxes: '0', issues: [] } as never;
test('values open holdings from the latest manual base-currency price', () => { const prices = [{ id: 'price-1', assetId: asset.id, observedAt: '2026-01-01', price: parseNonNegativeDecimal('120'), currency: 'EUR', source: 'MANUAL' }, { id: 'price-2', assetId: asset.id, observedAt: '2026-01-02', price: parseNonNegativeDecimal('140'), currency: 'EUR', source: 'MANUAL' }] as PriceObservation[]; const result = valuePortfolio(portfolio, projection, [asset], prices); assert.equal(result.totalValue, '1260'); assert.equal(result.totalUnrealizedResult, '291'); assert.equal(result.holdings[0].price?.id, 'price-2'); assert.deepEqual(result.allocation, [{ bucket: 'CORE', value: '1260', percentage: '100' }]); });
test('keeps an unpriced holding incomplete instead of valuing it at zero', () => { const result = valuePortfolio(portfolio, projection, [asset], [], '2026-01-02'); assert.equal(result.totalValue, '0'); assert.equal(result.holdings[0].marketValue, undefined); assert.equal(result.issues[0].code, 'MISSING_PRICE'); });

test('warns when a recorded price is more than seven days old', () => { const prices = [{ id: 'price-1', assetId: asset.id, observedAt: '2026-01-01', price: parseNonNegativeDecimal('100'), currency: 'EUR', source: 'MANUAL' }] as PriceObservation[]; assert.equal(valuePortfolio(portfolio, projection, [asset], prices, '2026-01-10').issues[0].code, 'STALE_PRICE'); });
