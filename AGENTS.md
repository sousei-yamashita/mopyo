# AGENTS.md — Implementation operating rules

These rules are intentionally written in ordinary Markdown so they remain useful to human developers and to implementation agents other than Codex.

## Source of truth

Before changing product behavior, read the relevant repository documents:

1. `PRODUCT.md` — product scope and product truth
2. `DESIGN.md` — interaction and visual direction
3. `QA.md` — verification and release gates
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

## Pull request handoff

A completed implementation should be presented as a pull request, not silently shipped.

The PR description should state:

- requested change
- implementation summary
- files/areas materially affected
- tests/checks performed
- anything not verified
- new dependencies/services/assets, if any
- known risks or follow-up items

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
