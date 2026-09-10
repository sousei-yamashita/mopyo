import test from "node:test";
import assert from "node:assert/strict";
import { scenes } from "../src/story.js";
import { scoresFor, makeResult } from "../src/engine.js";

test("six scenes form a complete journey with three concrete choices", () => {
  assert.equal(scenes.length, 6);
  scenes.forEach(scene => assert.equal(scene.choices.length, 3));
  assert.equal(scenes.filter(scene => scene.identity).length, 1);
});

test("scores accumulate from multiple scenes", () => {
  const scores = scoresFor(scenes, [0, 0, 1, 0, 2, 0]);
  assert.equal(scores.approach, 6);
  assert.equal(scores.structure, 1);
});

test("result is deterministic for the same seed and answers", () => {
  const state = { seed: 42, answers: [0, 1, 2, 0, 1, 2], artifact: "鳴らない鈴" };
  const date = new Date("2026-09-10T12:00:00Z");
  assert.deepEqual(makeResult(state, scenes, date), makeResult(state, scenes, date));
  assert.match(makeResult(state, scenes, date).id, /^NEMU-/);
});

test("artifact is preserved as an identity event", () => {
  const result = makeResult({ seed: 1, answers: [0, 0, 0, 0, 2, 0], artifact: "穴のあいた石" }, scenes, new Date("2026-01-01"));
  assert.equal(result.artifact, "穴のあいた石");
  assert.equal(result.quirks.length, 3);
});
