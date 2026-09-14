---
on:
  workflow_dispatch:
permissions: read-all
engine: copilot
max-ai-credits: 100
safe-outputs:
  noop:
    max: 1
---

# Sousei semantic inspection candidate — isolated evaluation

This workflow is an isolated equipment evaluation only. It does not replace the current Sousei Line, does not mark any existing stage PASS, and must not alter repository state.

Evaluate pull request #36 in `sousei-yamashita/mopyo` as an independent semantic-inspection specimen.

## Required inputs to inspect

Re-fetch and inspect the actual GitHub state for PR #36, including:
- repository and PR identity
- current full head SHA and base SHA / merge base as available
- PR requirements/body
- base-to-head diff
- `PRODUCT.md`
- `DESIGN.md`
- `QA.md`
- `AGENTS.md`
- the required GitHub Actions CI associated with the inspected head

Do not use an existing Work verdict or semantic certificate as evidence for your semantic verdict. PR #36 is a known specimen, but the expected verdict is intentionally not stated here.

## Preconditions

Before semantic judgment, verify that:
- repository is exactly `sousei-yamashita/mopyo`
- PR #36 exists, is open, and is not draft
- the inspected full head SHA is the current PR head
- required CI for that exact head is completed and successful
- the required requirements, diff, and governing specification files are retrievable

If the current head changes during inspection, return `STALE`. If required equipment/data cannot be retrieved, return `EQUIPMENT STOP`. If requirements/evidence conflict or are insufficient for a safe semantic decision, return `UNKNOWN`.

## Semantic inspection

Compare the PR requirements and actual diff against applicable requirements in PRODUCT.md, DESIGN.md, QA.md, and AGENTS.md. Check for scope drift, unauthorized product/experience/specification changes, missing QA, applicable AGENTS violations, dependency/secret/provenance/deployment-compatibility risks, and anything else materially required by those governing sources. Do not mark an item checked if it could not actually be verified.

## Verdict

Use exactly one of:
- PASS
- NG
- STALE
- EQUIPMENT STOP
- UNKNOWN

PASS means only that the exact inspected head is a semantic release candidate for the next Sousei Line evaluation step. It does not authorize merge, review approval, branch/main changes, CI reruns, deploy, release, or final adoption.

Return a machine-readable result containing at least:
- verdict
- repository
- pr_number
- full head_sha
- ci workflow/run/attempt/conclusion when retrievable
- checked_sources
- findings
- unchecked_or_unverifiable
- known_risks
- summary

## Prohibited actions

Do not create or modify issues, comments, pull requests, reviews, branches, commits, files, workflow runs, deployments, releases, labels, or any other GitHub state. Do not merge, approve, request changes, rerun CI, or deploy. This evaluation is read-only; the only output is the workflow run result/log.