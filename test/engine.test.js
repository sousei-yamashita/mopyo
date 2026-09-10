import test from "node:test";
import assert from "node:assert/strict";
import { scenes } from "../src/story.js";
import { initialState, scoresFor, makeResult, restoreState } from "../src/engine.js";

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

test("a complete saved journey is restored from its answers", () => {
  const saved = { ...initialState(), phase: "encounter", scene: 5, seed: 42, answers: [0, 1, 2, 0, 1, 2], artifact: "tampered" };
  const restored = restoreState(saved, scenes);
  assert.equal(restored.artifact, "鳴らない鈴");
  assert.equal(restored.result.id, "NEMU-00016");
});

test("invalid or incomplete saved journeys are rejected", () => {
  assert.equal(restoreState({ phase: "story", scene: 99, seed: 1, answers: [] }, scenes), null);
  assert.equal(restoreState({ phase: "card", scene: 5, seed: 1, answers: [0, 0], encounter: "近づく" }, scenes), null);
  assert.equal(restoreState({ phase: "story", scene: 2, seed: 1, answers: [0, 9] }, scenes), null);
});

test("the encounter date remains stable when a result is restored", () => {
  const saved = { ...initialState(), phase: "reveal", scene: 5, seed: 1, answers: [0, 0, 0, 0, 2, 0], artifact: "穴のあいた石" };
  saved.result = makeResult(saved, scenes, new Date("2026-01-01T12:00:00Z"));
  const restored = restoreState(saved, scenes);
  assert.equal(restored.result.encounteredAt, "2026-01-01T12:00:00.000Z");
  assert.equal(restored.result.date, saved.result.date);
});
