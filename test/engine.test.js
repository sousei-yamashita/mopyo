import test from "node:test";
import assert from "node:assert/strict";
import { scenes } from "../src/story.js";
import { scoresFor, rememberedFor, artifactFor, makeResult, normalizeJourneyState, normalizeResult, emptySceneStates } from "../src/engine.js";

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

test("scene 2 advance label stays neutral when running is optional", () => {
  assert.equal(scenes[1].nextLabel, "もう少し先を見る");
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

test("legacy saved result without memories is normalized for card redisplay", () => {
  const saved = normalizeJourneyState({
    phase: "card",
    scene: 2,
    answers: [0, 1, 2, 0, 1, 2],
    artifact: "鳴らない鈴",
    result: {
      id: "NEMU-00042",
      artifact: "鳴らない鈴",
      date: "2026/09/10",
      species: { code: "NEMU", body: "round", ears: "leaf", hue: 48 },
      scores: { approach: 0, tempo: 0, social: 1, structure: 0, retention: 1 },
      quirks: ["気になるものは、一度通り過ぎてから戻ってくる。"],
      phenotype: { eyes: "narrow", posture: "resting", markings: 1 }
    }
  }, scenes);

  assert.deepEqual(saved.result.memories, ["気になるものは、一度通り過ぎてから戻ってくる。"]);
  assert.equal(normalizeResult(saved.result, saved, scenes).memories[0], "気になるものは、一度通り過ぎてから戻ってくる。");
});

test("legacy in-progress answers reset instead of pretending to drive the new prototype", () => {
  const restored = normalizeJourneyState({
    phase: "story",
    scene: 2,
    answers: [0, 1, 2]
  }, scenes);

  assert.equal(restored.phase, "intro");
  assert.equal(restored.scene, 0);
  assert.deepEqual(restored.answers, []);
  assert.deepEqual(restored.sceneStates, emptySceneStates(scenes));
});
