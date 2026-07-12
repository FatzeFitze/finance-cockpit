# Finance Cockpit — Decision Log

This append-only log preserves meaningful product, architecture, security, privacy, technology, and workflow decisions. [`project-context.md`](project-context.md) remains the concise source of truth for current direction.

## Policy

- Log choices that materially affect scope, architecture, data handling, security, privacy, maintainability, workflow, or future options.
- Omit routine implementation details and short-lived experiments that establish no direction.
- Use IDs of the form `DEC-YYYY-MM-DD-NN`.
- Include status, context, decision, rationale, and consequences.
- Never rewrite history. Add a replacement entry and cross-reference superseded decisions.
- Never include sensitive financial data, credentials, or private operational details.

## Entry template

```markdown
## DEC-YYYY-MM-DD-NN — Short title
- Status: Accepted
- Date: YYYY-MM-DD
- Supersedes: None
- Superseded by: None

### Context
### Decision
### Rationale
### Consequences
```

## Decisions

## DEC-2026-07-12-07 — Stage workbook imports locally and commit them atomically

- Status: Accepted
- Date: 2026-07-12
- Supersedes: None
- Superseded by: None

### Context

The private workbook can accelerate historical migration, but it may contain incomplete rows, repeated exports, calculated totals, or data that conflicts with the ledger.

### Decision

Parse only a locally selected XLSX workbook into reviewable staging rows. Validate supported transactions, canonical decimals, dates, required FX, likely duplicates, and staged oversells before allowing confirmation. Commit accounts, assets, transactions, price observations, and snapshots in one SQLite transaction with import provenance. Treat snapshot and broker-reported totals as reconciliation evidence rather than a second holdings truth.

### Rationale

This makes a failed import non-destructive, keeps financial records auditable, and gives the user a visible chance to correct or exclude source rows. Exact repeated transaction signatures are blocked conservatively to prevent accidental re-import.

### Consequences

- The import UI must never create records while parsing or previewing.
- Unsupported or inconsistent rows require correction or exclusion before import.
- The current importer accepts XLSX only; CSV may be added later with equivalent staging safeguards.
- Imported prices and snapshots preserve import provenance; snapshot differences remain visible as reconciliation evidence.

## DEC-2026-07-12-01 — Separate current context from decision history

- Status: Accepted
- Date: 2026-07-12
- Supersedes: None
- Superseded by: None

### Context

The project needs both a quick current briefing and a durable explanation of why material choices were made. Combining them would make the briefing grow indefinitely or erase useful history.

### Decision

Use `docs/project-context.md` for current state, confirmed direction, candidates, and open questions. Use this file for the chronological record of meaningful decisions, rationale, and consequences.

### Rationale

This keeps onboarding context concise while retaining architectural memory and making superseded choices explicit.

### Consequences

A material decision can require both a log entry and a concise context update. Routine changes require neither unless they establish or change meaningful direction.

## DEC-2026-07-12-02 — Use a transaction ledger for the wealth-tracking extension

- Status: Accepted
- Date: 2026-07-12
- Supersedes: None
- Superseded by: None

### Context

The next desired application experience is private portfolio and wealth tracking, replacing the manually maintained workbook workflow over time. The user views broker accounts as operational gateways into one combined wealth pool.

### Decision

Develop wealth as a separate feature domain from the pre-buy investment watchlist. Use one explicit personal portfolio containing lightweight broker accounts. Treat transactions as historical source of truth and derive cash, positions, allocation, and performance. Classify assets globally using current Core/Satellite/Cash bucket, structural asset type, and strategy/risk category. Persist canonical decimals and calculate using decimal arithmetic. Deliver manual local workflows before reviewed imports, price providers, cloud synchronization, or broker integration.

### Rationale

Ledger-derived state reduces disagreement between holdings and history, retains closed-position results, and supports auditable calculations. Lightweight accounts preserve import and reconciliation options without dominating the combined-portfolio UX. Explicit decimal handling avoids storing financial history on accidental binary floating-point approximations. A manual-first sequence validates the model before external dependencies increase privacy and correctness risk.

### Consequences

- Wealth implementation follows the accepted specification under `docs/wealth/`.
- Moving weighted-average monitoring cost is calculated per account and asset, then aggregated for portfolio reporting.
- Current asset classification is changed in place; historical allocation uses current classification rather than dated classification history.
- Cash is initially derived per account; negative cash warns but does not block incomplete historical entry.
- The personal workbook may inform private mapping and reconciliation but must not enter source control, fixtures, logs, screenshots, or documentation.
- Transfers, automated market/FX data, tax-lot accounting, and stronger append-only corrections are deferred without treating them as ruled out.

## DEC-2026-07-12-03 — Use decimal.js and canonical decimal strings for wealth arithmetic

- Status: Accepted
- Date: 2026-07-12
- Supersedes: None
- Superseded by: None

### Context

Wealth Milestone 1A requires exact decimal handling in an Expo/TypeScript application and a small test setup before persistence is introduced. Quantities, prices, FX rates, fees, and taxes must not depend on JavaScript binary floating-point behavior.

### Decision

Use `decimal.js` in the pure wealth domain and calculation layers. Accept and persist validated, normalized canonical decimal strings at domain boundaries. Use Node's built-in test runner with `tsx` for pure TypeScript domain tests.

### Rationale

`decimal.js` is a maintained, pure-JavaScript package with bundled TypeScript declarations, configurable precision and deterministic rounding, and no native or Node-only runtime dependency. It is compatible with Expo's JavaScript bundle and Hermes. Its API supports quantities, prices, FX rates, division, and explicit rounding without implementing custom financial arithmetic.

The built-in test runner plus `tsx` adds little configuration and dependency surface for pure domain tests. A React Native-specific runner can be added when component or native-module behavior needs testing.

### Consequences

- Locale-aware UI parsing remains separate and must output canonical strings.
- Canonical inputs reject whitespace, separators, symbols, and exponent notation; negative values are allowed only for signed derived results.
- Decimal precision is configured centrally, and rounding occurs only at explicit financial boundaries.
- Repository mappings will store strings and perform no arithmetic.
- The test stack may expand later for React Native components, but pure wealth calculations remain runnable without Expo, React, SQLite, or a device.

## DEC-2026-07-12-04 — Start the wealth ledger with four manual transaction types

- Status: Accepted
- Date: 2026-07-12
- Supersedes: None
- Superseded by: None

### Context

The first usable transaction-entry increment needs to establish the manual workflow while avoiding premature assumptions about income, tax, and transfer workflows.

### Decision

Support manual contributions, withdrawals, buys, and sells in the initial wealth UI. Prevent a sell from exceeding the preceding recorded quantity for the same account and asset. Defer dividend, interest, standalone fee, standalone tax, transfers, and valuation features.

### Rationale

These four types cover funding an account and the basic acquisition/disposal workflow. Keeping the set narrow makes field validation, correction, and the next calculation milestone easier to verify.

### Consequences

- The UI creates a lightweight account or minimally classified asset when needed.
- A full ledger projection remains the authority for later cross-history validation, cash warnings, cost basis, and performance.
- Transaction deletion is soft so normal views omit it while audit/correction history remains available.

## DEC-2026-07-12-05 — Bring manual price observations forward for the wealth overview

- Status: Accepted
- Date: 2026-07-12
- Supersedes: None
- Superseded by: None

### Context

The current-wealth overview requires manually entered prices and timestamps that survive app restart. The original roadmap placed full price history and snapshots in the following milestone.

### Decision

Introduce an append-only local price-observation table as part of the current overview. The overview uses the latest manual base-currency price per open asset and labels missing prices as incomplete. Snapshots, historical reconciliation, and richer FX valuation remain Milestone 5 work.

### Rationale

Persisting dated observations now avoids a disposable in-memory price feature and keeps the first valuation view auditable. It also preserves a clean path to historical valuation without inventing a separate mutable “current price” truth.

### Consequences

- Manual prices and observation dates survive restarts.
- A non-base-currency price is visibly incomplete until FX valuation support arrives.
- Price history exists before snapshots, but no snapshot is created or rewritten by this increment.

## DEC-2026-07-12-06 — Keep wealth snapshots immutable and reconcile them manually

- Status: Accepted
- Date: 2026-07-12
- Supersedes: None
- Superseded by: None

### Context

Current valuation is reconstructed from the ledger and latest recorded prices. It must remain distinguishable from historical evidence, especially after later price or transaction corrections.

### Decision

Allow the user to record an immutable manual portfolio-total snapshot only when open holdings have usable base-currency prices. Store its valuation date, calculated total, base currency, manual provenance, and an optional broker-reported total. Never update an existing snapshot when price records change.

### Rationale

This keeps historical evidence auditable and provides a lightweight reconciliation workflow without implying tax-accounting authority or inventing missing historical data.

### Consequences

- A snapshot remains stable while the current reconstructed total can change.
- Missing-price data blocks a new snapshot rather than creating a deceptively complete one.
- Historical periods without a recorded snapshot remain explicit gaps for Milestone 6 charts.

## DEC-2026-07-12-07 — Use money-weighted return only when the recorded cash-flow history supports it

- Status: Accepted
- Date: 2026-07-12
- Supersedes: None
- Superseded by: None

### Context

Portfolio value and contributions are now recorded at different dates. A return figure must not mistake new savings for investment appreciation.

### Decision

Show snapshot values beside cumulative net external contributions and their simple difference. Calculate an annualized money-weighted return only from dated contributions/withdrawals and a later stored snapshot. Do not calculate a time-weighted return from irregular manual snapshots.

### Rationale

Money-weighted return accounts for the timing of the user’s contributions. Time-weighted return needs valuations around external cash flows; irregular manual snapshots cannot establish those sub-period returns honestly.

### Consequences

- Performance remains unavailable until enough dated evidence exists.
- The displayed simple gain is not labelled a return or annualized performance.
- Time-weighted return can be added later when the observation model supports it.
