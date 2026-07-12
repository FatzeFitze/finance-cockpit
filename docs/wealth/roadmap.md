# Wealth Tracking Roadmap

## Purpose

Build a private, local-first wealth-tracking experience that records portfolio history, calculates current positions, shows allocation and performance, and can later import the existing personal workbook through a reviewed migration flow.

The first versions prioritize correctness, auditability, privacy, and manual control over live broker or market-data integrations.

## Product boundary

- `investments` remains the pre-buy watchlist and research workspace.
- `wealth` represents accounts, assets actually owned, portfolio transactions, valuations, and historical performance.
- A watchlist candidate may later link to or be promoted into a portfolio asset, but neither feature owns the other.
- The transaction ledger is the historical source of truth. Holdings and dashboard figures are calculated views, not independently maintained balances.
- The application provides personal monitoring and decision support, not authoritative tax accounting or individualized financial advice.

## Delivery principles

- Deliver vertical, usable increments.
- Verify calculations with pure automated tests before emphasizing charts.
- Use fictional data in source-controlled tests and screenshots.
- Keep imports reviewable and atomic; do not silently ingest financial records.
- Defer direct broker integration and automatic trading.
- Record uncertainty and data-quality warnings instead of inventing precision.

## Milestone 0 — Domain and calculation specification

### 0A: Scope and vocabulary

- Define accounts, assets, classifications, transactions, positions, prices, and snapshots.
- Map the workbook concepts to the app without duplicating its sheet structure.
- Separate accepted initial choices from open questions.

### 0B: Calculation rules

- Specify transaction signs and required fields by transaction type.
- Choose the cost-basis method.
- Specify fees, taxes, dividends, interest, FX, partial sales, and closed positions.
- Add fictional worked examples with independently checked expected results.

### 0C: Implementation contract

- Define initial database entities and relationships.
- Define calculation-service inputs and outputs.
- List invariants, validation rules, and acceptance scenarios.
- Confirm the scope and entry criteria for Milestone 1.

### Exit criteria

- Domain vocabulary is unambiguous enough to name database and TypeScript concepts.
- Calculation rules cover the first supported transaction types and important edge cases.
- Open decisions that could change persistence or calculations are resolved.
- Fictional examples can become automated calculation tests.
- No real portfolio data appears in project documentation or fixtures.

## Milestone 1 — Portfolio persistence foundation

### Scope

- Add domain types and SQLite migrations for accounts, assets, and transactions.
- Add repositories with explicit row-to-domain mapping.
- Add indexes, foreign keys, and migration checks appropriate to the model.
- Add focused persistence tests or a repeatable development verification flow.

### Exit criteria

- An account, asset, and supported transaction can be created and read after restart.
- Invalid references and invalid transaction shapes are rejected.
- Existing expense and watchlist data survive migration.
- No current-position value is stored as a second source of truth.

## Milestone 2 — Transaction entry experience

### Scope

- Transaction list, creation, detail, correction, and deletion-with-confirmation.
- Type-sensitive fields and validation.
- Account and asset selection or creation.
- Initially support contribution, withdrawal, buy, and sell; add other types in an agreed increment.

### Exit criteria

- The core workflow is usable without editing the database directly.
- Overselling and structurally invalid transactions are prevented or clearly flagged.
- Corrections produce deterministic recalculation.

## Milestone 3 — Position calculation engine

### Scope

- Pure TypeScript engine over chronologically ordered transactions.
- Calculate quantity, cost basis, realized result, cash effects, fees, taxes, and warnings.
- Cover partial sales, full exits, re-entry, fractional units, and backdated corrections.

### Exit criteria

- Fictional Milestone 0 examples pass as automated tests.
- Calculation code has no React Native or SQLite dependency.
- Invalid histories produce explicit errors or warnings rather than plausible-looking values.

## Milestone 4 — Current wealth overview

### Scope

- Wealth tab with total value, cost, realized/unrealized result, cash, allocations, holdings, and recent activity.
- Manual current-price entry and visible price timestamps.
- Filters by account, bucket, and category where useful.

### Exit criteria

- Dashboard totals reconcile to the holdings list.
- Allocation percentages reconcile to the selected portfolio total.
- Missing or stale prices are visible.

## Milestone 5 — Price history and snapshots

### Scope

- Dated asset prices and immutable point-in-time portfolio snapshots.
- Current reconstructed value versus stored historical snapshot is explicit.
- Manual reconciliation against broker-reported totals.

### Exit criteria

- Updating a current price changes current valuation but not a stored snapshot.
- Snapshot provenance and valuation date are visible.
- Historical gaps are represented honestly.

## Milestone 6 — Charts and performance

### Scope

- Portfolio value versus cumulative net contributions.
- Asset and asset-class value history.
- Realized and unrealized result views.
- Introduce money-weighted and, when the data supports it, time-weighted returns with clear definitions.

### Exit criteria

- Contributions are not presented as investment appreciation.
- Closed positions remain in historical results.
- Chart periods and missing-data behavior are documented and tested.

## Milestone 7 — Reviewed workbook import

### Scope

- File selection, parsing, staging, validation, preview, correction, atomic import, and reconciliation report.
- Preserve import provenance and detect likely duplicates.
- Use the personal workbook only as private migration input, never as a committed fixture.

### Exit criteria

- Invalid imports cannot partially mutate the live ledger.
- The user can review mappings and warnings before committing.
- Imported totals reconcile or show actionable differences.

## Milestone 8 — Hardening and convenience

- Backup, restore, and export.
- Integrity and reconciliation center.
- Stale-price and concentration observations.
- Closed-position history and richer filtering.
- Threat-model review before cloud synchronization or external financial-data providers.
- Evaluate market-price APIs, FX providers, cloud sync, and read-only broker imports only after the manual workflow is trustworthy.

## Progress

- Milestone 0A: complete
- Milestone 0B: complete
- Milestone 0C: complete
- Milestone 1A: complete
- Milestone 1B: complete
- Milestone 1C: complete
- Milestone 1D: complete
- Milestone 2: complete (contribution, withdrawal, buy, and sell entry; other transaction types deferred)
- Milestone 3: complete (pure ledger projection for the initial transaction types)
- Milestone 4: complete (current overview and persisted manual price entry)
- Milestone 5: complete (dated prices, immutable snapshots, and manual total reconciliation)
- Milestone 6: complete (snapshot-based performance history and money-weighted return)
- Milestones 7–8: not started
