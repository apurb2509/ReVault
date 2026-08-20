You are a senior software architect and production-grade full-stack engineer.

Build the complete Project Phoenix system described below. Do not create a toy/demo-quality codebase. Implement it like an industry-level production-oriented system, while keeping it practical enough to run locally and within free-tier constraints.

PROJECT: PROJECT PHOENIX — AUTONOMOUS REVENUE RECOVERY LOOP

CORE OBJECTIVE:
Build an event-driven AI revenue recovery platform that:
1. Detects revenue leakage from payment failures, expired invoices, and halted subscriptions.
2. Diagnoses the root cause of the failure.
3. Selects a bounded next-best recovery action.
4. Executes the recovery action.
5. Tracks whether money was actually recovered.
6. Implements Promise-to-Pay tracking for B2B invoices.
7. Stops automated chasing when a valid Promise-to-Pay commitment is detected.
8. Maintains a complete audit trail.
9. Provides graceful fallbacks when AI/external services fail.
10. Displays recovery metrics and audit history through a React dashboard.

==================================================
1. NON-NEGOTIABLE ENGINEERING PRINCIPLES
==================================================

- Write clean, readable, maintainable, production-oriented code.
- Follow SOLID principles where applicable.
- Follow DRY without over-engineering.
- Follow separation of concerns strictly.
- Apply appropriate design patterns only when they provide real value.
- Prefer simple, deterministic solutions over unnecessary abstraction.
- Do not duplicate business logic across services.
- Keep business logic separate from controllers/routes, database code, and external API integrations.
- Use strong typing wherever the language supports it.
- Validate all external input.
- Handle errors explicitly.
- Never silently swallow exceptions/errors.
- Use meaningful variable, function, class, interface, type, and file names.
- Avoid magic numbers and magic strings.
- Centralize constants/configuration where appropriate.
- Keep functions small and focused.
- Avoid unnecessarily deep nesting.
- Avoid premature abstraction.
- Avoid unnecessary dependencies.
- Use efficient algorithms and data structures.
- Consider both time and space complexity when implementing algorithms.
- Prefer O(n) over O(n²) where practical.
- Do not optimize blindly; prioritize correctness first, then efficiency.
- Avoid unnecessary database queries.
- Avoid N+1 query patterns.
- Use database indexes where appropriate.
- Use transactions for financial state changes that must remain atomic.
- Design for idempotency wherever events or external APIs can be retried.

==================================================
2. COMMENTS
==================================================

Use ONLY // comments in source code.

Comments must:
- Be short.
- Explain WHY something exists or why a non-obvious decision was made.
- Explain important business rules or tricky logic.
- Be written clearly and professionally.
- Be directly relevant to the code.

Do NOT:
- Write huge comment blocks.
- Explain obvious code.
- Add decorative comments.
- Add AI-generated commentary such as "This function does..."
- Use comments as a replacement for clean naming.

Example:

// Ignore duplicate webhook events because external providers may retry delivery.
if (eventAlreadyProcessed) {
    return;
}

Do NOT write:

// This is a function that checks if the event has already been processed.
// It does this by looking at the database...

IMPORTANT EXECUTION RULE:

Before writing code, first inspect the entire existing repository and understand what already exists.

Do not overwrite working code unnecessarily.

Create a concise implementation plan internally, then implement incrementally.

After each major module is implemented:
1. Check imports/dependencies.
2. Run the relevant tests.
3. Run formatting/linting.
4. Fix errors immediately.
5. Continue to the next module.

At the end, perform a complete repository audit:
- architecture consistency
- folder structure
- security
- environment variables
- .gitignore
- database migrations
- API contracts
- error handling
- idempotency
- concurrency
- tests
- dead code
- unused dependencies
- code formatting
- README
- complete end-to-end execution

Do not claim a feature is implemented unless it actually works end-to-end.
Do not replace real functionality with mocked/fake success responses unless the mock is explicitly part of the test/demo environment.