# QA.md — Release gates

This file defines the minimum evidence required before a change is considered a release candidate. Passing these gates does not itself authorize publication.

## Status vocabulary

Release/process stage and inspection result are separate axes. Do not combine them into one inferred status.

Process stage:

- **作業中** — implementation is still changing.
- **検品中** — implementation is ready for automated and human/AI review.
- **公開候補** — required checks passed for the exact revision and remaining risk is understood.
- **正規品** — the representative explicitly approved the release and the approved change was merged/published.

Inspection/equipment result:

- **PASS** — the defined check was executed against identified evidence and passed.
- **NG** — the defined check was executed and found a concrete defect or requirement mismatch.
- **EQUIPMENT STOP** — the check could not complete because the checking/automation equipment failed, was unavailable, hit quota/permission limits, or otherwise could not operate normally.
- **UNKNOWN** — there is not enough evidence to determine PASS or NG. Missing evidence is UNKNOWN, never an implicit PASS.

Only the representative can make the final publication decision.

## Core release rule

Automation may inspect, implement, test, review, and prepare a pull request.

Automation must not silently merge to `main` or publish a production release on its own.

A successful implementation, successful CI, successful semantic review, release-candidate judgment, and final human adoption are different decisions. Do not silently combine them.

## Evidence identity

Every material inspection result must identify the exact object inspected. For pull-request work, record as applicable:

- repository and PR number
- base branch/base SHA
- head branch/head SHA
- workflow/run ID and `run_attempt`
- actual checkout SHA when it differs from the PR head (for example a GitHub test merge commit)
- check performed and result
- anything not checked

Evidence from an older SHA must not be reused as proof for a newer SHA without re-running or explicitly proving that the inspected object is unchanged.

## Abnormal-operation standard

When expected work, automation, inspection, or delivery does not complete normally, use this order. Do not jump directly from a symptom to a repair instruction.

1. **Fix the phenomenon** — record the exact PR, branch, SHA, event, expected output, observed output, and time/run identifiers.
2. **Confirm the expected specification** — identify the repository rule, task requirement, workflow contract, or product requirement that defines correct behavior.
3. **Decompose the path** — separate event/input, worker start, processing, inspection, output, delivery destination, and downstream trigger.
4. **Trace evidence** — find the last boundary with confirmed evidence and the first boundary without it.
5. **Locate the failure segment** — classify the observed state as PASS, NG, EQUIPMENT STOP, or UNKNOWN for that segment.
6. **Confirm cause** — distinguish a demonstrated cause from a plausible hypothesis. If the cause is not evidenced, keep it UNKNOWN.
7. **Apply the minimum repair** — change only what is required for the confirmed defect. Do not silently widen scope.
8. **Reinspect through the same path** — repeat the original path against the new exact revision; a local substitute does not automatically prove the remote path.
9. **Prevent recurrence** — where proportionate, add a test, assertion, state, permission boundary, documented rule, or observable evidence so the same omission is harder to repeat.

If an abnormal path cannot be completed safely, stop. Waiting for evidence is preferable to manufacturing a conclusion.

## Equipment acceptance

Adding an automation file or receiving a green unit test is not sufficient to declare an operational machine accepted.

Before connecting a new automation to unattended downstream work, verify its real operating path where reasonably possible, including:

- trigger occurs under the intended repository/default-branch conditions
- permissions are the minimum required
- untrusted PR code is not executed with privileged credentials
- success, failure, cancellation/rerun, and duplicate processing behave as specified where applicable
- API/tool failures surface as equipment failure rather than silent success
- concurrent/repeated events do not create unsafe duplicate actions
- produced evidence is tied to the correct repository, workflow, run, attempt, and SHA
- downstream consumers validate evidence rather than trusting display text alone

Until this acceptance evidence exists, mark the equipment acceptance result UNKNOWN or EQUIPMENT STOP as appropriate; do not call the line operational merely because implementation CI passed.

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

- exact PR/head SHA inspected
- what changed
- what was checked
- what passed
- what was not checked or could not be verified
- known remaining risks
- whether any release-blocking issue was found
- any EQUIPMENT STOP or UNKNOWN result still affecting a required gate

Do not convert uncertainty into a pass.

## Rollback

Prefer small, single-purpose PRs so a problematic release can be reverted cleanly. Avoid mixing unrelated refactors, product changes, dependency changes, and design work in one PR unless there is a compelling technical reason.

## Transfer cleanliness

The repository should remain understandable without access to private ChatGPT/Codex conversations or a particular developer's computer.

When adding infrastructure, favor documented standard Git/GitHub mechanisms and official vendor integrations over private APIs, UI automation, undocumented hooks, or machine-specific scripts.
