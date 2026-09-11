# DESIGN.md — Product and visual direction

This document records design intent that should survive any particular AI tool, chat history, or implementation agent.

## Product feeling

The experience should feel like a short, slightly strange outing that ends in an encounter with a creature derived from the user's choices.

The desired reaction is not "the diagnosis is accurate." It is closer to:

- 「なんだこいつwww」
- 「でもなんか自分っぽい」
- 「見せたい / お前もやれよ」

Avoid turning the product into a conventional personality test, survey, SaaS form, gacha game, or generic AI character generator.

## Interaction grammar

- One screen = one immediately understandable situation.
- Reading should be easy; thinking belongs in the choice.
- Prefer concrete actions over abstract self-description.
- A choice should sometimes make the world answer back with a tiny reaction.
- Strange events do not need to form an obvious horror-game chain.
- Before the reveal, do not foreshadow the creature with eyes, silhouettes, ears, shadows, or similar body clues.
- Mobile first. A normal scene should fit in one viewport without accidental scrolling.

Useful shorthand:

> 説明しない。設定を覚えさせない。1画面1状況。見た瞬間に分かる。押したら次。たまに変。最後にズイポン。

## Current world direction

The world should be a familiar Japanese everyday environment edited through a contemporary young-women-oriented visual language.

Core direction:

- geometric / slightly angular Japanese city
- milky blue, periwinkle/lilac, pale pink, white, deep navy
- pink is an accent, not the entire palette
- restrained translucent / chrome-like details are allowed
- a trace of Heisei digital angularity, re-edited rather than copied literally
- clean enough to feel current; strange enough not to become generic Korean-cosmetics styling

Working formula:

> material = Heisei memory / editing = current / seasoning = Korean + Y2K

Do not overfit to any one generated reference image.

## Creature direction

Signature contrast:

> カクカクした世界 × ぷにっとした個体

Creature goals:

- rounded / mochi-like body mass
- one or more harder, angular, blue-gray alien organs or appendages
- large head, short torso, tiny limbs; avoid ordinary human anatomy
- bipedal forms are welcome, but not mandatory for every individual
- silhouette diversity matters more than decorative recoloring
- the family should remain biologically recognizable across different body plans
- cute + odd + slightly wrong, rather than cute-only

Possible ancestral lines include:

1. rounded basic form
2. form with proliferating angular organs above or around the head
3. body-plan-weird form (crawl, unusual leg length, etc.)

Acceptance test:

> Would this be at least a little desirable as a plush, acrylic charm, or card?

Avoid generic white mystery-dog mascots, obvious existing-IP resemblance, and fixed personality-to-color / personality-to-ear mappings.

## Card direction

The result card should feel like an owned object, not a diagnosis report.

Primary information should be understandable in Japanese. English may remain decorative and secondary.

Preferred hierarchy:

- 個体ビジュアル
- 個体番号
- 遭遇日
- 持っていたもの
- 観察記録

Visual possibilities include restrained framing, pattern, symbol, artifact motif, foil/holographic cues, emboss-like treatment, or other elements that could plausibly translate into a physical trading-card object later.

## Naming

The current product name is **ズイポン / ZUIPON / 즈이폰**.

The repository is still named `mopyo`; do not rename the repository as a side effect of unrelated work. Existing storage keys and public paths must not be changed casually because they may break saved state or deployment.

Naming migration inside the UI/spec should be treated as a deliberate, separately reviewable change.

## Design authority

Implementation agents may make small responsive, accessibility, spacing, and polish decisions that do not change product meaning.

Escalate instead of guessing when a change would materially alter:

- product meaning or target reaction
- core journey structure
- character art direction
- major visual language
- monetization or account model
- public launch scope
- user data collection

When uncertain, do not add a feature merely because it seems useful.
