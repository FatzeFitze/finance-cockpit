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
