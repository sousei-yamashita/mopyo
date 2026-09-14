---
on:
  workflow_dispatch:
permissions: read-all
engine: copilot
max-ai-credits: 100
safe-outputs:
  add-comment:
    max: 1
    staged: true
  report-failure-as-issue: false
  report-failed-jobs: false
  threat-detection: false
---

# Sousei semantic inspection candidate — isolated evaluation

This is an isolated equipment evaluation only. It does not replace the current Sousei Line and does not mark any existing stage PASS.

Evaluate pull request #36 in `sousei-yamashita/mopyo` independently.

Re-fetch and inspect:
- repository and PR identity
- current full head SHA and base SHA / merge base
- PR requirements/body
- base-to-head diff
- PRODUCT.md
- DESIGN.md
- QA.md
- AGENTS.md
- required GitHub Actions CI for the inspected head

Do not use an existing Work verdict or semantic certificate as evidence.

Before judgment verify:
- repository is exactly `sousei-yamashita/mopyo`
- PR #36 exists, is open, and is not draft
- inspected full head SHA is the current PR head
- required CI for that exact head completed successfully
- required specifications, requirements and diff are retrievable

Verdict must be exactly one of:
PASS / NG / STALE / EQUIPMENT STOP / UNKNOWN

Never round missing, conflicting, or unverifiable evidence to PASS.

Return a structured result containing:
verdict, repository, pr_number, full head_sha, CI workflow/run/attempt/conclusion, checked_sources, findings, unchecked_or_unverifiable, known_risks, summary.

Submit that result through the add-comment safe output. This workflow is in staged mode, so the comment is preview evidence only and must not actually be posted.

Do not modify issues, comments, PRs, reviews, branches, commits, files, workflow runs, deployments, releases, labels, merge state, CI state, or any other GitHub state.
