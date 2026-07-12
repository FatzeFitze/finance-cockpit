# Wealth Milestone 0C Implementation Contract

## Purpose

Translate the accepted version-one decisions into an actionable contract for persistence and calculation work. This document defines boundaries and acceptance behavior; it is not a commitment to exact SQL or UI naming when implementation evidence supports a small improvement.

## Feature boundary

```text
src/features/wealth/
  model/
  data/
  services/
  components/
  screens/
```

- `model`: domain types, validated inputs, issue types, and policies.
- `data`: SQLite row types, repositories, and transactional persistence operations.
- `services`: pure ledger projection and valuation logic.
- `components` and `screens`: presentation and interaction only.

The calculation engine must not import React, React Native, Expo Router, or SQLite.

## Initial persistence model

Names are provisional but responsibilities are fixed.

### `wealth_portfolios`

| Column | Representation | Notes |
| --- | --- | --- |
| `id` | text primary key | Application-generated |
| `name` | text | One personal portfolio initially |
| `base_currency` | text | ISO-like canonical code, initially EUR |
| `created_at` | ISO timestamp text | Required |
| `updated_at` | ISO timestamp text | Required |

### `wealth_accounts`

| Column | Representation | Notes |
| --- | --- | --- |
| `id` | text primary key | Application-generated |
| `portfolio_id` | text foreign key | Required |
| `name` | text | User-facing broker account name |
| `institution_name` | text nullable | Broker/institution |
| `base_currency` | text | Initially EUR |
| `is_active` | integer boolean | Soft retirement, not deletion |
| timestamps | ISO timestamp text | Required |

Index `portfolio_id`. Account names need not be globally unique; version-one UI should discourage duplicates within a portfolio.

### `wealth_assets`

| Column | Representation | Notes |
| --- | --- | --- |
| `id` | text primary key | Application-generated |
| `name` | text | Required |
| `isin` | normalized text nullable | Unique when non-null |
| `ticker` | text nullable | Secondary identifier |
| `asset_type` | canonical text | Validated domain value |
| `bucket` | canonical text | Core, Satellite, Cash |
| `strategy_category` | canonical text | Validated domain value |
| `trading_currency` | text | Required |
| `is_active` | integer boolean | Closed history remains addressable |
| timestamps | ISO timestamp text | Required |

Normalize ISIN by trimming and uppercasing before uniqueness checks. Formal checksum validation can warn without preventing unusual legacy identifiers unless tests establish safe strictness.

### `wealth_transactions`

| Column | Representation | Notes |
| --- | --- | --- |
| `id` | text primary key | Application-generated |
| `account_id` | text foreign key | Required |
| `asset_id` | text foreign key nullable | Required by applicable types |
| `type` | canonical text | Validated transaction type |
| `trade_date` | ISO date/text | Required |
| `sequence` | integer | Stable same-day ordering |
| `quantity` | canonical decimal text nullable | Non-negative magnitude |
| `unit_price` | canonical decimal text nullable | Transaction currency |
| `gross_amount` | canonical decimal text nullable | Derived/accepted value |
| `fees` | canonical decimal text | Default zero |
| `taxes` | canonical decimal text | Default zero |
| `currency` | text | Required |
| `fx_rate_to_base` | canonical decimal text nullable | Required when currencies differ |
| `base_amount` | canonical decimal text nullable | Accepted historical conversion |
| `reported_net_amount` | canonical decimal text nullable | Optional reconciliation evidence |
| `note` | text nullable | Sensitive; never log implicitly |
| `source_type` | canonical text | manual/import initially |
| `source_ref` | text nullable | Non-secret provenance identifier |
| `is_deleted` | integer boolean | Soft deletion |
| timestamps | ISO timestamp text | Required |

Indexes should support ordered account/asset projection and recent transaction listing, including `(account_id, asset_id, trade_date, sequence)` and portfolio traversal through account.

### Deferred persistence

Do not add these tables in the first persistence increment unless needed for a tested vertical slice:

- asset price observations;
- FX observations;
- snapshots and snapshot positions;
- allocation targets;
- import batches/staging;
- watchlist-to-asset link;
- linked transfers.

Their future relationships are already reserved conceptually; speculative empty tables add migration burden without current value.

## Decimal contract

Define a branded or validated canonical decimal-string type at the domain boundary. Persistence never accepts locale-formatted strings such as `1.234,56`.

Canonical examples:

- valid: `0`, `12.34`, `0.000001`, `-12.34` for derived signed values;
- invalid input magnitudes: `-1`, `1,25`, currency symbols, whitespace-only, exponent notation unless deliberately supported.

User-facing parsing handles locale separately and produces a canonical domain value. Calculation uses the selected decimal library; repository mapping does not perform arithmetic.

Library selection belongs to Milestone 1 preparation and should consider maintenance, TypeScript support, bundle impact, deterministic rounding, and Expo compatibility. Do not implement custom arbitrary-precision arithmetic.

## Domain types

Use discriminated unions so required fields follow transaction type. Conceptual shape:

```ts
type TradeTransaction = {
  type: 'BUY' | 'SELL';
  accountId: string;
  assetId: string;
  quantity: DecimalString;
  unitPrice: DecimalString;
  fees: DecimalString;
  taxes: DecimalString;
  currency: CurrencyCode;
  fxRateToBase?: DecimalString;
};

type ExternalCashTransaction = {
  type: 'CONTRIBUTION' | 'WITHDRAWAL';
  accountId: string;
  amount: DecimalString;
  currency: CurrencyCode;
  fxRateToBase?: DecimalString;
};
```

Dividend, interest, standalone fee, and standalone tax types receive similarly narrow shapes. Avoid one large optional-field interface that allows meaningless combinations.

## Service contracts

### Ledger projection

Conceptual input:

```ts
projectLedger({
  portfolio,
  accounts,
  assets,
  transactions,
  cutoff,
}): PortfolioProjection
```

Conceptual output:

- account cash balances;
- account/asset positions;
- aggregated asset positions;
- realized results and cost components;
- net external cash flows;
- income, fee, and tax totals;
- structured issues.

### Position output

At minimum:

- account ID and asset ID;
- quantity;
- remaining cost basis in portfolio base currency;
- average unit cost;
- lifetime realized gross and net result;
- total attributable fees and taxes;
- first and latest activity dates;
- closed/open status;
- issues.

### Issues

Issues are structured data, not preformatted strings:

```ts
type WealthIssue = {
  code: WealthIssueCode;
  severity: 'warning' | 'blocking';
  transactionId?: string;
  accountId?: string;
  assetId?: string;
  details: Record<string, string>;
};
```

Initial codes include:

- `OVERSELL`
- `NEGATIVE_CASH_BALANCE`
- `MISSING_FX_RATE`
- `INVALID_TRANSACTION_SHAPE`
- `AMOUNT_MISMATCH`
- `DUPLICATE_ISIN`
- `UNSUPPORTED_TRANSACTION_TYPE`

Price and snapshot issue codes enter with those milestones.

## Repository and transaction boundaries

- Repositories accept validated domain inputs and map database rows explicitly.
- Cross-record operations use SQLite transactions.
- Create/update operations must not log notes or financial values.
- Soft-deleted transactions are excluded from normal projection but remain queryable for audit/correction UI.
- Editing a transaction updates `updated_at`; snapshot invalidation is added when snapshots exist.
- Repository queries return deterministic ordering.

## Database migration sequence

Recommended Milestone 1 increments:

### 1A — Types and decimal decision spike

- Add canonical identifiers, enums, decimal parsing, and type-sensitive transaction inputs.
- Evaluate and select the decimal library with a focused Expo/TypeScript check.
- Convert worked examples into pure unit tests or, if the test runner is not yet installed, establish the smallest appropriate test setup deliberately.

### 1B — Core schema migration

- Add portfolio, account, asset, and transaction tables.
- Seed the single personal portfolio through an idempotent application operation, not sensitive migration content.
- Enable and verify foreign-key behavior appropriate to Expo SQLite.
- Preserve all existing tables and data.

### 1C — Repositories

- Implement portfolio/account/asset CRUD needed for the vertical slice.
- Implement transaction creation/listing and soft deletion.
- Validate duplicate ISIN and foreign references.
- Verify persistence across app restart.

### 1D — Thin developer verification surface

- Add a minimal temporary or user-facing path sufficient to create fictional records and inspect them.
- Do not build the full transaction UX before persistence behavior is trustworthy.

## Invariants

- One transaction belongs to exactly one valid account.
- Account belongs to the selected portfolio.
- An asset-required transaction references one valid asset.
- Input magnitudes are non-negative canonical decimals.
- Required and forbidden fields depend on the discriminant type.
- Non-null normalized ISIN is unique.
- Transaction ordering is stable.
- Manual sell cannot exceed that account's available position.
- Portfolio-wide reports aggregate account projections without changing disposal basis.
- Only contributions and withdrawals affect net external contributions.
- Derived values are recalculable; they are not competing mutable truths.
- Sensitive values and notes do not enter logs, fixtures, screenshots, or migration source.

## Milestone 1 acceptance scenarios

1. Upgrade an existing database containing expenses and watchlist candidates; all prior data remains readable.
2. Idempotently create/read the personal portfolio.
3. Create two broker accounts in that portfolio.
4. Create an asset with ISIN, classifications, and trading currency.
5. Reject another asset with the same normalized ISIN.
6. Create a contribution and a buy using canonical decimals.
7. Reject a malformed buy lacking quantity or unit price.
8. Create the same fictional asset holding in two accounts.
9. List transactions in deterministic effective order.
10. Soft-delete a transaction and exclude it from the normal ledger query.
11. Restart the app/database connection and recover the same non-deleted records.
12. Run the worked calculation examples through the pure engine as it arrives in Milestone 1A/3, without using real financial data.

## Security and privacy checks

- No personal workbook values or institution-specific real data in committed tests.
- No SQL statement construction from untrusted values; use bound parameters.
- No financial record payloads in routine logs or thrown diagnostic strings.
- Import source files remain outside source control and are processed through explicit review later.
- Local SQLite is appropriate for the current PoC, but device backup, at-rest protection, app locking, and threat modeling must be revisited before calling the app safe for sustained sensitive use.

## Milestone 0 exit assessment

Milestone 0 is complete when:

- this contract and the version-one decision record are accepted;
- worked examples are internally consistent and ready to become tests;
- project context and decision history reflect the new direction;
- no unresolved choice blocks the Milestone 1 schema or calculation types.

