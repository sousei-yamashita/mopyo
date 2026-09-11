# QA.md — Release gates

This file defines the minimum evidence required before a change is considered a release candidate. Passing these gates does not itself authorize publication.

## Status vocabulary

- **作業中** — implementation is still changing.
- **検品中** — implementation is ready for automated and human/AI review.
- **公開候補** — required checks passed and remaining risk is understood.
- **正規品** — the representative explicitly approved the release and the approved change was merged/published.

Only the representative can make the final publication decision.

## Core release rule

Automation may inspect, implement, test, review, and prepare a pull request.

Automation must not silently merge to `main` or publish a production release on its own.

## Official route for issue-to-agent auto-start

For this repository's current **public** setup, GitHub's built-in Copilot **Automations** feature is not available, because that feature only supports **private** or **internal** repositories.

If maintainers want a no-click path from **issue opened** to **AI work started** using official GitHub mechanisms, the supported repository-managed option is a **GitHub Agentic Workflow** committed in `.github/workflows/`, triggered when an issue is created, and reviewed through pull requests like other repository automation.

In this repository's current personal-account setup, that workflow should use a repository secret such as `COPILOT_GITHUB_TOKEN` for Copilot requests. If no such workflow is present, starting work from an issue remains a manual handoff step (for example, assigning the issue in GitHub).

## Every pull request

Check at minimum:

1. **Scope** — one clear purpose; no unrelated feature additions.
2. **Specification** — behavior matches PRODUCT.md and DESIGN.md where applicable.
3. **Automated checks** — `npm test` and `npm run build` pass.
4. **Regression risk** — existing journey, persistence, navigation, and result generation are not unintentionally broken.
5. **Mobile UX** — changed screens remain usable at phone widths; normal journey screens should not accidentally require scrolling.
6. **Accessibility** — controls remain operable and reduced-motion behavior is not casually broken.
7. **Dependencies** — new packages, services, fonts, analytics, SDKs, or network calls must be intentional and disclosed in the PR.
8. **Secrets/privacy** — no credentials, tokens, personal data, or unnecessary telemetry are committed.
9. **Rights/provenance** — new third-party assets/code/fonts must have a clear lawful source and usage basis. Do not import questionable assets merely to improve appearance.
10. **Deployment compatibility** — GitHub Pages relative paths and the current repository path must remain valid unless the task explicitly changes deployment.

## Product-facing changes

For story, character, card, naming, animation, or major visual changes, also check:

- Does it still feel like an experience rather than a personality-test form?
- Is the situation understandable quickly?
- Are choices concrete and reasonably distinct?
- Does the change create an actual reaction, curiosity, attachment, or ownership rather than only visual polish?
- Is there accidental creature foreshadowing before encounter?
- Does the result remain understandable to the intended Japanese audience?
- Would the change make future physicalization materially harder without a good reason?

## Whole-project review

A whole-project review is appropriate before a meaningful public release, after major architectural changes, and periodically during active development.

Review:

- PRODUCT.md / DESIGN.md versus actual behavior
- dead or duplicate code
- stale names and obsolete copy
- storage/back/reload behavior
- mobile viewport behavior
- external dependencies and licenses
- security/privacy surface
- deployment configuration
- test coverage for critical flows
- maintainability and unnecessary vendor coupling

## Required pre-release report

Before asking for final approval, the reviewer should report in ordinary language:

- what changed
- what was checked
- what passed
- what was not checked or could not be verified
- known remaining risks
- whether any release-blocking issue was found

Do not convert uncertainty into a pass.

## Rollback

Prefer small, single-purpose PRs so a problematic release can be reverted cleanly. Avoid mixing unrelated refactors, product changes, dependency changes, and design work in one PR unless there is a compelling technical reason.

## Transfer cleanliness

The repository should remain understandable without access to private ChatGPT/Codex conversations or a particular developer's computer.

When adding infrastructure, favor documented standard Git/GitHub mechanisms and official vendor integrations over private APIs, UI automation, undocumented hooks, or machine-specific scripts.
