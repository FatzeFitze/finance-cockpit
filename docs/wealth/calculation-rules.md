# Wealth Calculation Rules

## Status

This is a Milestone 0 working specification. Rules labeled **Proposed** require confirmation before they become implementation contracts. The examples will use fictional assets and values only.

## Goals

- Produce deterministic, auditable portfolio calculations.
- Keep transaction history and valuation data distinct.
- Separate external cash flows from investment performance.
- Surface incomplete or inconsistent data.
- Avoid presenting monitoring estimates as tax-authoritative figures.

## Numeric representation

**Decision required.** JavaScript and SQLite `REAL` use binary floating-point and can introduce rounding artifacts.

Candidate approach:

- Store ordinary monetary amounts as integer minor units when their currency supports that convention.
- Store quantities, unit prices, and FX rates as canonical decimal strings or scaled integers with documented precision.
- Use a decimal arithmetic library in the calculation engine if scaled integers become cumbersome.
- Round only at defined financial boundaries, not after every intermediate operation.

This choice affects the schema and must be resolved before Milestone 1.

## Ordering

**Proposed:** process transactions by:

1. effective trade date/time;
2. an explicit user/import sequence when available;
3. stable creation identifier as the final tie-breaker.

Same-day ordering can affect oversell validation and realized results, so it cannot be left to unspecified database row order.

## Signs and stored magnitudes

**Proposed:** store user-entered quantities and monetary components as non-negative magnitudes. Transaction type supplies economic direction.

Examples:

- `BUY`: quantity increases; cash decreases.
- `SELL`: quantity decreases; cash increases.
- `CONTRIBUTION`: external cash into the portfolio is positive.
- `WITHDRAWAL`: external cash out is negative.
- `DIVIDEND` and `INTEREST`: portfolio cash increases but external contribution does not.
- `FEE` and `TAX`: portfolio cash decreases but external contribution does not.

Derived signed cash flow should not be accepted as an independently editable duplicate when its components can determine it.

## Gross and net amounts

**Proposed defaults:**

- Trade gross amount: `quantity × unit price` in transaction currency.
- Buy cash effect: `-(gross amount + fees + directly attributable taxes)`.
- Sell cash effect: `gross amount - fees - directly attributable taxes`.
- Contribution cash effect: positive amount.
- Withdrawal cash effect: negative amount.
- Dividend/interest cash effect: gross income minus directly recorded withholding tax and fees when modeled on the same event.

The import flow may retain the source workbook's supplied gross/net values for reconciliation, but application calculations should identify which values are inputs and which are derived.

## Cost basis

**Decision required:** choose the monitoring method before implementation.

Recommended initial candidate: moving weighted-average cost per account and asset.

For a buy:

```text
new quantity = old quantity + bought quantity
new cost basis = old cost basis + capitalized acquisition cost
new average cost = new cost basis / new quantity
```

For a sell under moving average:

```text
disposed cost basis = sold quantity × prior average cost
remaining cost basis = prior cost basis - disposed cost basis
realized result = net disposal proceeds - disposed cost basis
```

Open questions:

- Calculate independently per account or pool identical assets across accounts?
- Capitalize buy fees into acquisition cost?
- Deduct sell fees from proceeds?
- Include transaction taxes in the same way as fees?
- Does the selected approach appropriately approximate the user's monitoring needs under Austrian conventions, while remaining explicitly non-authoritative for tax filing?

## Position quantity

For a selected account, asset, and cutoff time:

```text
quantity = sum(buy quantities) - sum(sell quantities)
```

Transfers require paired source/destination behavior and must not change portfolio-wide quantity. Short positions are out of scope initially; a negative result is an error or import warning.

## Current valuation

**Proposed:**

```text
market value = position quantity × latest applicable unit price × FX rate to portfolio base
unrealized result = market value - remaining cost basis in base currency
```

The UI must display or make accessible:

- price observation date;
- price currency;
- FX observation or transaction assumption used;
- stale/missing-price warning.

A missing price should yield an explicitly incomplete valuation, not silently use zero.

## Realized and unrealized results

- Realized result is recognized when quantity is disposed.
- Unrealized result applies only to the remaining position at the selected valuation.
- A full exit leaves no unrealized result but retains lifetime realized history.
- Re-entry begins a new open-position phase while lifetime analytics retain earlier activity.

Whether dividends and interest appear inside a broad `total investment result` is a reporting decision. They should remain separately identifiable even if a summary adds them.

## External cash flows versus investment cash flows

Only movements across the portfolio boundary count as external cash flows:

- contributions;
- withdrawals.

Trades, fees, taxes, dividends, interest, and internal account transfers are portfolio activity, not external contributions. This distinction is required to avoid presenting savings as investment appreciation.

## Performance

Initial reporting should show separately:

- portfolio market value;
- cumulative net external contributions;
- realized result;
- unrealized result;
- income;
- fees;
- taxes recorded.

Simple gain can be shown only with a clear definition. Later milestones may add:

- money-weighted return using dated external cash flows;
- time-weighted return when valuation observations are sufficiently frequent and reliable.

Do not derive a return series from irregular snapshots without documenting the approximation.

## Snapshots

**Proposed:** a stored snapshot is immutable point-in-time evidence containing its valuation date, base currency, totals, and provenance.

- New price observations do not mutate old snapshots.
- A correction to an old transaction may make later snapshots inconsistent with the reconstructed ledger.
- The app should flag that inconsistency and offer deliberate recalculation or replacement rather than silently rewriting history.

## Corrections

Good enough for the first local version:

- permit editing and deletion with confirmation;
- retain `createdAt` and `updatedAt`;
- recalculate all affected projections deterministically;
- warn when dated snapshots may now be inconsistent.

Stronger long-term option:

- append reversal/replacement events and retain a complete audit trail.

The stronger option is preferable before multi-user sync, external imports at scale, or tax-sensitive reporting.

## Transfers

**Decision required:** account-to-account transfers should be represented as a linked pair or a compound domain operation:

- decrease cash or asset in source account;
- increase the same cash or asset in destination account;
- produce no portfolio-wide contribution, withdrawal, gain, or loss;
- preserve any cost basis transferred.

Because this is materially more complex than a free-text `TRANSFER` row, it may be deferred from the first transaction UI while remaining in the schema design.

## Data-quality checks

The calculation engine should be capable of emitting at least:

- negative position/oversell;
- missing asset or account;
- missing or stale price;
- missing FX rate when required;
- inconsistent gross amount versus quantity × price;
- unsupported transaction type;
- transaction fields inappropriate for its type;
- snapshot mismatch after historical correction;
- duplicate or likely duplicate imported transaction;
- totals that fail reconciliation tolerance.

## Fictional examples to add in Milestone 0B

Each example should state inputs, expected position state, cash effect, realized result, and warnings:

1. Contribution followed by one buy.
2. Two buys at different prices followed by a partial sale.
3. Full exit followed by later re-entry.
4. Buy and sell fees plus tax.
5. Dividend with withholding tax.
6. Fractional ETF quantities.
7. Foreign-currency buy and later valuation with a changed FX rate.
8. Attempted oversell.
9. Two accounts holding the same asset.
10. Account-to-account transfer, if included in the first implementation contract.

## Decisions required before this specification is final

1. Numeric precision and storage strategy.
2. Cost-basis method and whether it is per account or portfolio-wide.
3. Fee and tax capitalization/deduction rules.
4. Cash representation.
5. FX-rate convention for transactions and valuations.
6. Initial transaction types.
7. Treatment of same-day ordering.
8. Snapshot invalidation and recalculation behavior.
9. Initial correction/audit policy.
10. Transfer scope.

