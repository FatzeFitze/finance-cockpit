# Finance Cockpit — Project Context

Last updated: 2026-07-12

## Purpose

Finance Cockpit is a private, mobile-first personal-finance hub intended for genuine personal use and deliberate learning. Privacy, security, correctness, maintainability, and useful financial modeling take priority; among otherwise sound choices, educational and modern approaches are preferred.

## Product scope

### Expense tracking

- Capture or import receipts and bills.
- Extract relevant information, with manual review and correction.
- Categorize expenses.
- Store source documents and structured expense data safely.
- Support filtering, analysis, summaries, and dashboards.

### Investment support

- Begin with watchlists and pre-buy decision support.
- Support candidate tracking, notes, research context, and structured reasoning.
- Wealth tracking is the next active extension: one overall portfolio, lightweight broker accounts, assets, a transaction ledger, calculated positions and cash, prices, snapshots, allocation, and performance.
- Build the wealth experience incrementally and manual-first; add reviewed workbook import only after the internal model and calculations are trustworthy.
- Do not start with direct broker integrations or automated investment decisions.

## Delivery phases

### Proof of concept

The goal is to validate the workflow and create an early usable application:

- Mobile application shell.
- Receipt capture/import and basic extraction or manual entry.
- Local persistence.
- Expense list and basic summary/dashboard.
- Small watchlist prototype.
- Wealth-domain specification followed by local ledger persistence, manual entry for contributions, withdrawals, buys, and sells, and a current overview with manual dated price observations. Snapshots and historical reconciliation follow next.
- Smooth local development and test loop.

### MVP

The goal is to become trustworthy enough for sustained private use:

- Authentication and authorization.
- Secure remote persistence and private document storage.
- Review-and-correct extraction workflow.
- Categorization, filtering, and cross-device synchronization.
- Stronger modular architecture.
- First substantive watchlist/investment module.

### Possible later work

- Recurring-expense detection, budgets, alerts, and subscription tracking.
- Reviewed portfolio workbook/CSV imports, price providers, and read-only integrations after the manual wealth workflow is trustworthy.
- Web dashboard.
- Richer investment research workspace.
- Advanced analytics and carefully designed AI-supported insights.

## Current implementation state

Observed in the repository on 2026-07-12:

- Expo SDK 54, React Native, React 19, TypeScript, and Expo Router are installed.
- The app is structured under `src/app` and includes routes for a dashboard, adding/listing expenses, recurring expenses, and investments.
- `expo-sqlite` and a migrations module are present, indicating local SQLite persistence work has begun.
- Document picker and sharing dependencies are installed.
- The README is still the default Expo README and does not yet describe the product.
- No production backend, authentication system, or remote deployment is documented as implemented.

This section describes observed state, not a completeness or quality assessment. Inspect the relevant code before relying on a feature.

## Technical direction

### Confirmed or already embodied

- Mobile-first application.
- Expo + React Native + TypeScript.
- Expo Router.
- Local SQLite during the proof-of-concept phase.
- `decimal.js` for canonical wealth-domain decimal arithmetic; canonical decimal strings remain the persistence boundary.
- Git/GitHub version control.
- Windows host with WSL2-based development.
- Low-operations philosophy; no private always-on home server.

### Candidates, not final commitments

- Managed backend such as Supabase for the MVP.
- SecureStore or an equivalent for local secrets.
- Browser/web access after or alongside mobile development.
- Managed, privacy-conscious cloud services for remote infrastructure.
- Private Notion workspace for higher-level personal documentation.

Do not silently turn a candidate into a settled choice. Document the rationale when confirming or replacing one.

## AI principles

Potential uses include receipt/invoice interpretation, field extraction, categorization suggestions, review assistance, research-note summarization, and later insight generation.

- AI assists; the user remains in control.
- Important extracted financial data requires a visible review/correction step.
- Evaluate the privacy implications of sending receipts or financial data to third parties.
- Once a backend exists, keep sensitive provider credentials and privileged AI logic server-side.
- Investment AI should organize research and support judgment, not replace it.
- Outputs should preserve provenance, uncertainty, and the ability to correct data where practical.

## Working style

- Offer a simple near-term option and a stronger long-term option when useful.
- Explain material trade-offs and learning opportunities.
- Prefer vertical, usable increments over speculative platform building.
- Keep expense tracking, documents, analytics, and investment features modular.
- Revisit threat modeling before adding accounts, remote storage, sharing, or external AI processing.

## Open questions

- Which existing screens and persistence flows are complete enough to retain?
- When should web support enter the roadmap?
- How long should the project remain local-only?
- What receipt extraction/OCR approach best balances privacy, accuracy, cost, and learning value?
- Will project documentation stored in Git remain entirely non-sensitive, with personal notes kept separately?

## Context maintenance

This file is the concise source of truth for current project state and direction. Historical rationale belongs in [`decision-log.md`](decision-log.md).

Update this file when a meaningful decision changes current direction, including:

- Confirming or changing the stack or backend.
- Changing PoC/MVP scope or sequencing.
- Adding a significant tool or integration.
- Moving web support earlier or later.
- Changing AI/OCR or privacy strategy.
- Rejecting an integration for security, privacy, cost, or maintainability reasons.

Keep confirmed decisions, candidates, observed implementation state, and open questions clearly separated. Replace stale statements instead of accumulating history. Append material decisions and their rationale to the decision log; supersede old entries rather than rewriting them.
