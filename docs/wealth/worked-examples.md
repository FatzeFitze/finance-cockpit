# Wealth Calculation Examples

## Purpose

These fictional examples define expected version-one behavior. They are implementation-independent acceptance fixtures and should later become automated tests using canonical decimal arithmetic.

Unless stated otherwise:

- portfolio base currency is EUR;
- all amounts are EUR;
- calculations use moving weighted-average cost per account and asset;
- buy fees and acquisition taxes increase cost basis;
- sell fees and disposal taxes reduce proceeds;
- displayed rounding does not replace exact internal decimal values;
- cash effects are calculated from the transaction ledger;
- assets and values are fictional.

## Example 1 — Contribution and initial buy

Transactions in Broker A:

1. Contribution: `1,000.00`
2. Buy 4 units of Core Index ETF at `100.00`; fee `4.00`

Expected result:

| Measure | Expected |
| --- | ---: |
| Quantity | 4 |
| Cost basis | 404.00 |
| Average cost per unit | 101.00 |
| Account cash | 596.00 |
| Net external contributions | 1,000.00 |
| Realized result | 0.00 |

Invariant: the buy changes portfolio composition but is not an external cash flow.

## Example 2 — Multiple buys and partial sale

Transactions in Broker A:

1. Buy 10 units at `100.00`; fee `10.00`
2. Buy 5 units at `120.00`; fee `5.00`
3. Sell 6 units at `150.00`; fee `6.00`; disposal tax `9.00`

Before the sale:

```text
quantity = 15
cost basis = 1,010 + 605 = 1,615
average cost = 1,615 / 15 = 107.666666...
```

Sale:

```text
gross proceeds = 6 × 150 = 900
net proceeds = 900 - 6 - 9 = 885
disposed cost basis = 6 × (1,615 / 15) = 646
realized result = 885 - 646 = 239
```

Expected remaining position:

| Measure | Expected |
| --- | ---: |
| Quantity | 9 |
| Cost basis | 969.00 |
| Average cost per unit | 107.666666... |
| Realized result | 239.00 |
| Sale cash increase | 885.00 |

Invariant: selling does not change the average cost of the remaining units under moving-average accounting.

## Example 3 — Full exit and re-entry

Starting position in Broker A:

- 8 units
- cost basis `800.00`
- average cost `100.00`

Transactions:

1. Sell all 8 units at `125.00`; fee `8.00`
2. Later buy 3 units at `90.00`; fee `3.00`

Expected after the sale:

| Measure | Expected |
| --- | ---: |
| Quantity | 0 |
| Remaining cost basis | 0.00 |
| Net proceeds | 992.00 |
| Realized result | 192.00 |

Expected after re-entry:

| Measure | Expected |
| --- | ---: |
| Quantity | 3 |
| New open-position cost basis | 273.00 |
| New average cost | 91.00 |
| Lifetime realized result | 192.00 |

Invariant: re-entry starts a new open-position basis without erasing prior realized history.

## Example 4 — Current valuation

Position:

- quantity `9`
- remaining cost basis `969.00`

Latest price observation:

- price `140.00`
- observed today

Expected:

```text
market value = 9 × 140 = 1,260
unrealized result = 1,260 - 969 = 291
```

| Measure | Expected |
| --- | ---: |
| Market value | 1,260.00 |
| Unrealized result | 291.00 |

If no applicable price exists, market value and unrealized result are incomplete rather than zero, and a `MISSING_PRICE` warning is emitted.

## Example 5 — Dividend with withholding tax

Transaction:

- Fictional Income Stock dividend gross amount `50.00`
- withholding tax `13.75`
- no fee

Expected:

| Measure | Expected |
| --- | ---: |
| Gross dividend income | 50.00 |
| Recorded withholding tax | 13.75 |
| Cash increase | 36.25 |
| External contribution | 0.00 |

Invariant: income increases portfolio cash but is not a contribution.

## Example 6 — Fractional units and precision

Transaction:

- Buy `1.234567` ETF units at `81.1234`
- fee `1.50`

Expected exact gross amount before boundary rounding:

```text
1.234567 × 81.1234 = 100.1522725678
```

Expected acquisition cost before any currency-boundary policy is applied:

```text
100.1522725678 + 1.50 = 101.6522725678
```

Invariant: persistence and calculation retain the meaningful source precision; UI currency formatting may display `101.65` without changing the stored canonical decimal.

## Example 7 — Foreign-currency purchase and valuation

Portfolio base currency: EUR.

Purchase in Broker A:

- 2 units at `100.00 USD`
- fee `2.00 USD`
- accepted historical rate: `1 USD = 0.90 EUR`

Expected acquisition cost:

```text
USD cost = 202.00
EUR cost basis = 202 × 0.90 = 181.80
```

Current observations:

- price `110.00 USD`
- current rate `1 USD = 0.95 EUR`

Expected valuation:

```text
USD market value = 2 × 110 = 220
EUR market value = 220 × 0.95 = 209.00
unrealized result = 209.00 - 181.80 = 27.20
```

Invariant: current valuation uses current FX; acquisition cost retains the accepted historical FX conversion.

## Example 8 — Oversell

Available position in Broker A: 5 units.

Attempted sale: 6 units.

Expected manual-entry result:

- transaction is rejected;
- available quantity `5` is reported;
- live ledger remains unchanged.

Expected import result:

- row remains in staging;
- blocking `OVERSELL` issue is attached;
- import cannot commit until corrected or deliberately remapped.

## Example 9 — Same asset in two accounts

Broker A:

- Buy 10 units at total acquisition cost `1,010.00`
- account average cost `101.00`

Broker B:

- Buy 5 units at total acquisition cost `600.00`
- account average cost `120.00`

Expected combined overview:

| Measure | Expected |
| --- | ---: |
| Combined quantity | 15 |
| Combined cost basis | 1,610.00 |
| Informational combined average | 107.333333... |

A sale in Broker B uses Broker B's `120.00` account-level average, not the combined informational average.

Invariant: the UI aggregates the wealth pool, while disposal calculations retain broker-account provenance.

## Example 10 — Cash warning without rejection

An incomplete historical ledger begins with a buy whose net cash effect is `-500.00`, with no earlier contribution recorded.

Expected:

- the valid buy may be saved;
- calculated account cash becomes `-500.00`;
- `NEGATIVE_CASH_BALANCE` warning is emitted;
- position quantity and cost basis still calculate normally.

## Example 11 — Historical correction and snapshot staleness

1. Save a position-level snapshot on 2026-01-31.
2. Later correct a 2026-01-15 buy quantity.

Expected:

- stored snapshot values are not silently rewritten;
- the snapshot is marked stale because its reconstruction inputs changed;
- the app offers explicit recalculation/replacement;
- current position projection uses the corrected transaction.

## Example 12 — Reclassification behavior

1. Fictional Robotics ETF is classified `Satellite / ETF / Sector Bet`.
2. Later the asset is reclassified `Core / ETF / Broad Market`.

Expected:

- one asset row is updated;
- no dated classification record is created;
- current and historical allocation views group the asset under its current classification;
- stored position-level snapshot amounts remain unchanged, although category grouping derived at display time can change.

This is an intentional version-one simplification and must be described in allocation-history UI help.

