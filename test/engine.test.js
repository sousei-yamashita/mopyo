import test from "node:test";
import assert from "node:assert/strict";
import { scenes } from "../src/story.js";
import { scoresFor, rememberedFor, artifactFor, makeResult } from "../src/engine.js";

test("three prototype scenes offer multiple tappable hotspots", () => {
  assert.equal(scenes.length, 3);
  scenes.forEach(scene => {
    assert.ok(scene.hotspots.length >= 5);
    assert.ok(scene.minInteractions >= 3);
    assert.equal(typeof scene.nextLabel, "string");
  });
});

test("scene 1 preserves the expected repeat gacha responses", () => {
  const gacha = scenes[0].hotspots.find(hotspot => hotspot.id === "gacha");
  assert.deepEqual(gacha.reactions, [
    "知らないキャラだ。",
    "ちょっとかわいい。",
    "……300円か。"
  ]);
});

test("scores accumulate from repeated direct interactions", () => {
  const scores = scoresFor(scenes, [
    { counts: { gacha: 2, alley: 1 } },
    { counts: { mascot: 2, run: 1 } },
    { counts: { 'below-machine': 1, bottle: 1 } }
  ]);
  assert.equal(scores.approach, 3);
  assert.equal(scores.retention, 7);
});

test("remembered actions come from concrete observed behavior", () => {
  const remembered = rememberedFor(scenes, [
    { counts: { gacha: 2 } },
    { counts: { mascot: 2, stain: 1 } },
    { counts: { 'below-machine': 1 } }
  ]);
  assert.deepEqual(remembered, [
    "ガチャを二回見た。",
    "あのマスコット、二回見てた。",
    "自販機の下まで覗いた。"
  ]);
});

test("artifact is derived from what the user actually handled", () => {
  assert.equal(artifactFor(scenes, [
    { counts: { gacha: 1 } },
    { counts: { mascot: 1 } },
    { counts: { bottle: 1 } }
  ]), "もちもちのマスコット");
  assert.equal(artifactFor(scenes, [
    { counts: {} },
    { counts: {} },
    { counts: { 'below-machine': 2 } }
  ]), "返ってきた100円");
});

test("result is deterministic for the same seed and remembered actions", () => {
  const state = {
    seed: 42,
    artifact: null,
    answers: [],
    sceneStates: [
      { counts: { gacha: 2, alley: 1 } },
      { counts: { mascot: 2, run: 1 } },
      { counts: { 'below-machine': 1, bottle: 1 } }
    ]
  };
  const date = new Date("2026-09-10T12:00:00Z");
  assert.deepEqual(makeResult(state, scenes, date), makeResult(state, scenes, date));
  assert.match(makeResult(state, scenes, date).id, /^NEMU-/);
  assert.deepEqual(makeResult(state, scenes, date).memories, [
    "ガチャを二回見た。",
    "あのマスコット、二回見てた。",
    "自販機の下まで覗いた。"
  ]);
});
