# AGENTS.md — Implementation operating rules

These rules are intentionally written in ordinary Markdown so they remain useful to human developers and to implementation agents other than Codex.

## Source of truth

Before changing product behavior or development infrastructure, read the relevant repository documents:

1. `PRODUCT.md` — product scope and product truth
2. `DESIGN.md` — interaction and visual direction
3. `QA.md` — verification, abnormal-operation standard, evidence requirements, and release gates
4. `README.md` — local run/check instructions

If an explicit task conflicts with these documents, stop and surface the conflict rather than silently rewriting product intent.

## Working method

- Work on a branch; do not directly modify `main` as part of normal implementation.
- Keep each change narrowly scoped to the requested purpose.
- Do not add adjacent features "while here."
- Preserve existing behavior unless the task explicitly changes it.
- Prefer the simplest implementation that satisfies the task and current product stage.
- Do not introduce frameworks, packages, external services, analytics, accounts, databases, or AI runtime calls unless the task explicitly requires them and the tradeoff is documented.
- Do not rename the repository, public Pages path, or persistent storage keys as incidental cleanup.
- Avoid vendor-specific architecture when a standard web/Git/GitHub mechanism is sufficient.

## Work contract and delivery identity

Before writing to an existing change, fix the work contract. Record at minimum:

- target repository
- target PR when one already exists
- required destination branch
- observed head SHA before work starts
- allowed files/areas and requested outcome
- actions that are prohibited
- stop conditions and decisions reserved for the representative

For an existing PR repair, update the assigned existing branch unless the task explicitly authorizes a replacement branch/PR. Do not create a new PR merely because it is easier for the agent or tool.

Use a **single writer** for the same target branch/change at a time. Read-only inspectors may work in parallel. Do not run multiple autonomous writers against the same delivery target unless the work contract explicitly defines how their outputs are isolated and reconciled.

Immediately before writing, re-read the remote target head. If it moved from the recorded SHA, stop and compare/rebase/re-plan; do not overwrite, force-push, or blindly apply a saved patch.

## Scope and stop rules

- Modify only the authorized scope. If investigation discovers a different defect, report it separately unless the work contract explicitly authorizes fixing it.
- Do not silently turn a two-item repair into a broader cleanup.
- If product intent or a major experience must change, stop for representative judgment as described below.
- If required evidence, permissions, quota, service availability, repository state, or delivery destination cannot be confirmed, follow `QA.md` and report **EQUIPMENT STOP** or **UNKNOWN** rather than improvising a successful result.
- Never treat a worker/agent status such as "Completed", "Done", or "Success" as proof that the requested repository artifact was delivered.

## Security and provenance

- Never commit credentials, API keys, tokens, private user data, or secrets.
- Do not copy third-party code, images, fonts, audio, or other assets into the repository without a clear lawful usage basis.
- Prefer first-party or standard tooling for development infrastructure.
- If a new dependency is genuinely necessary, explain why in the pull request.

## Validation

Before declaring implementation complete:

```sh
npm test
npm run build
```

Also inspect the changed behavior itself. Automated tests are evidence, not a substitute for product review.

For user-facing changes, consider phone viewport behavior, back/reload/persistence, accessibility, reduced motion, and GitHub Pages path compatibility as relevant.

For repository automation or infrastructure changes, apply the abnormal-operation and equipment-acceptance rules in `QA.md`. Local tests prove only the local path they exercised. Remote CI, GitHub event behavior, API writes, permissions, and downstream triggering require their own evidence when they are part of the acceptance criteria.

## Pull request handoff

A completed implementation should be presented at the delivery destination specified by the work contract, normally a pull request, not silently shipped.

The handoff should state:

- requested change
- exact destination PR/branch and resulting head SHA
- implementation summary
- files/areas materially affected
- tests/checks performed and their exact evidence where available
- anything not verified
- new dependencies/services/assets, if any
- known risks or follow-up items
- any NG, EQUIPMENT STOP, or UNKNOWN state still present

After a remote update, verify the artifact at the remote destination. Confirm the expected branch/PR actually contains the intended files/commits and that required remote CI belongs to the new head. Agent self-report is not delivery evidence.

## Authority boundaries

Implementation agents may fix ordinary bugs, improve internal code, tests, responsiveness, accessibility, and minor polish when this does not change product meaning.

Stop and request product-owner judgment before materially changing:

- product concept or target reaction
- journey length or major interaction model
- character/design direction
- account/payment/social model
- data collection/privacy behavior
- external publication scope
- core naming/identity

## Release boundary

Creating code, commits, tests, and pull requests is allowed within the assigned task.

Do not autonomously merge to `main` or publish a production release. Final release authority belongs to the representative/product owner.

A green CI result, implementation completion, review PASS, and `公開候補` are not permission to merge or deploy.
