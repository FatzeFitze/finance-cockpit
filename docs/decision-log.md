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
