# Wealth Version 1 Decisions

## Status and precedence

Accepted Milestone 0 decisions for the initial wealth-tracking implementation. Where an earlier working draft presents alternatives, this document records the selected version-one behavior and takes precedence.

## Product perspective

- The user views all holdings as one overall wealth pool.
- Broker accounts are operational gateways used for trade costs, market access, provenance, imports, and reconciliation.
- The primary product experience reports the combined portfolio; account filters and reconciliation remain available without dominating the model.
- The application is a trustworthy personal monitoring tool, not authoritative tax software.

## Structure

### Portfolio

- Create one explicit personal portfolio in version 1.
- Keep the portfolio entity so another ownership or reporting boundary can be added later without redesigning all transactions.

### Accounts

- Support broker accounts only initially.
- Every transaction belongs to an account.
- Accounts do not own assets or asset classifications.
- Reporting defaults to the combined portfolio.
- Retaining lightweight accounts is worth the small cost because omitting them would make broker import, duplicate detection, reconciliation, cash tracking, and security transfers substantially harder later.

### Cash

- Derive an account's cash balance from transactions.
- Do not model currency as an asset in version 1.
- Negative cash produces a visible data-quality warning but does not block entry; incomplete historical ledgers and settlement timing can otherwise prevent valid recording.
- Multi-currency cash positions can introduce currency assets later if real use requires them.

## Assets and classifications

### Identity

- Use an application-generated ID as the database primary key.
- Strongly encourage ISIN whenever the instrument has one.
- A non-null ISIN must be unique after canonical normalization.
- Permit assets without an ISIN.
- Store ticker and name as secondary identifiers; ticker alone is not treated as globally unique.
- ISIN is the preferred future matching key for imports and market-price lookup, while provider-specific identifiers may still be needed.

### Classification

- Canonical strategic buckets are `Core`, `Satellite`, and `Cash`.
- Separate structural asset type from analytical strategy/risk category.
- Initial asset types: `ETF`, `Stock`, `Fund`, `Bond`, `Cash`, `Crypto`, `Other`.
- Initial strategy/risk categories: `Broad Market`, `Sector Bet`, `Small Cap`, `Speculative`, `Income`, `Other`.
- Bucket, asset type, and strategy/risk category belong to the asset globally, not to an account holding.
- Version 1 stores current classification only. Editing an asset changes its classification in place.
- Historical allocation charts use the asset's current classification; version 1 does not reconstruct prior opinions with valid-from/valid-to records.

The last point intentionally favors simplicity and the user's current-view mental model. It means historical category charts can change when an asset is reclassified; the UI and calculation documentation must not imply otherwise.

## Transactions

### Initial types

The first complete transaction workflow supports:

- `CONTRIBUTION`
- `WITHDRAWAL`
- `BUY`
- `SELL`
- `DIVIDEND`
- `INTEREST`
- `FEE`
- `TAX`

`TRANSFER` and `OTHER` are deferred. A generic catch-all would weaken validation, and a correct transfer requires linked source/destination behavior.

### Income

- A dividend normally references the paying asset and account.
- Interest may be account-level without an asset.
- Directly attributable withholding tax and fees may be components of the income event.
- Unrelated account-level fees and taxes use standalone transactions.

### Entered and derived amounts

- The user normally enters quantity, unit price, fees, taxes, currency, and applicable FX rate.
- Gross and net trade amounts are derived.
- An optional broker-reported gross or net amount may be captured for reconciliation.
- A material difference between derived and reported values produces a warning and requires explicit acceptance or correction.
- Stored user-entered magnitudes are non-negative; transaction type determines economic direction.

### Ordering

- Process by effective trade date/time, then explicit sequence, then stable ID.
- Exact time is optional.
- Manual same-day transactions can be reordered with a sequence value.
- Imports preserve source row order as their initial sequence.

### Overselling

- Short selling is out of scope.
- Manual entry rejects a sale exceeding the available account position and reports the available quantity.
- Import staging retains an oversell as a blocking issue; it cannot enter the live ledger unresolved.

### Corrections

- Version 1 permits editing with confirmation and retains creation/update timestamps.
- Deletion is a soft delete or archive, not immediate physical removal.
- Projections recalculate deterministically after correction.
- A correction affecting an existing snapshot marks that snapshot stale.
- Append-only reversal/replacement events remain the stronger long-term option before synchronization, multi-user access, or tax-sensitive workflows.

## Calculation policy

### Precision

- Do not use JavaScript binary floating-point or SQLite `REAL` as the authoritative calculation representation.
- Persist canonical decimal strings for quantities, prices, FX rates, and financial amounts.
- Use a well-maintained decimal arithmetic library in the pure calculation layer.
- Validate scale by field and currency, but do not discard source precision unnecessarily.
- Round only at explicit financial boundaries and format separately for display.

This decision is intentionally made now because changing numeric representation after storing real history would be expensive and risky.

### Cost basis

- Use moving weighted-average cost for version-one monitoring.
- Calculate cost basis per account and asset so results reconcile with broker-held positions and future security transfers can preserve basis.
- Aggregate account positions for the default portfolio-wide UI.
- The app labels the result as a monitoring calculation, not authoritative Austrian tax reporting.

Per-account calculation is an internal correctness choice; it does not change the user's combined-wealth experience.

### Fees and taxes

- Buy fees and directly attributable acquisition taxes increase acquisition cost.
- Sell fees and directly attributable disposal taxes reduce disposal proceeds.
- Dividend withholding tax reduces net income and remains separately reportable.
- General account fees and taxes are period costs and do not alter a particular asset's cost basis.
- Preserve gross result, costs, and net result as separately reportable components rather than collapsing them irreversibly.

### Currency and FX

- Schema and domain types support transaction and base currency from the start.
- The first fully verified workflow is EUR-first.
- Store original currency amounts, the accepted historical FX rate, and resulting base-currency amounts for foreign transactions.
- Use a dated current FX observation for current valuation rather than the historical trade FX rate.
- Prefer broker-imported FX rates when available; otherwise allow manual entry.
- Automated FX providers are deferred.

### External cash flows

- Only contributions and withdrawals cross the portfolio boundary.
- Buys, sells, dividends, interest, fees, taxes, and future internal transfers are portfolio activity, not external contributions.
- This distinction must be maintained in charts so savings are not presented as investment appreciation.

## Snapshots and history

- Snapshot creation is manual initially; optional scheduled creation may follow.
- Store a snapshot header plus position-level valuation rows.
- A snapshot records valuation date, base currency, totals, price/FX provenance, and data-quality status.
- New price observations do not rewrite snapshots.
- Historical transaction corrections mark affected snapshots stale and offer explicit recalculation/replacement.
- Do not silently rewrite point-in-time history.

## Initial overview

Show at least:

- current market value;
- remaining cost basis;
- unrealized profit/loss;
- lifetime realized profit/loss;
- net external contributions;
- dividend and interest income;
- recorded fees and taxes;
- calculated cash balance;
- price freshness and incomplete-valuation warnings;
- allocation by bucket, asset type, and strategy/risk category;
- holdings and recent transactions.

Start with absolute results and a clearly defined simple percentage. Do not label it annual return. Add money-weighted return during the performance milestone and time-weighted return only when valuation history supports it.

Allocation targets are configurable by portfolio and classification, but follow after the basic actual-allocation overview. Dated target history is deferred.

## Transfers

- Transfers are deferred from the first transaction UI.
- Do not approximate an internal transfer with contribution/withdrawal because that distorts performance.
- When implemented, use one compound operation with linked source/destination records.
- Cash transfers do not change portfolio-wide external cash flow.
- Security transfers preserve quantity and cost basis.

## Import and watchlist

### Workbook import

- Import accounts, assets, transactions, historical prices, and snapshots when their source data is trustworthy.
- Recalculate holdings, allocation, and performance.
- Use workbook-calculated views as reconciliation evidence, not as a second authoritative state.
- Stage, validate, review, and atomically commit imports.
- Never commit the personal workbook or its real values as fixtures, logs, screenshots, or documentation.

### Watchlist link

- A purchase can create an asset linked to an existing investment candidate.
- Preserve candidate research and asset ownership as separate records with different lifecycles.
- The link is optional and deferred beyond the first wealth persistence increment.

## Deferred without schema dead ends

- Currency-as-asset cash positions
- Direct price and FX providers
- Security and cash transfers
- Classification history
- Explicit tax lots or selectable cost-basis methods
- Append-only correction events
- Scheduled snapshots
- Money-weighted and time-weighted returns
- Multiple active portfolios in the UI
- Broker integrations and cloud synchronization

## Remaining clarification threshold

No additional user decision is required before producing the Milestone 0C implementation contract. A question should be reopened only if implementation evidence shows that one of these choices would cause data loss, an incorrect financial result, or a difficult migration.

