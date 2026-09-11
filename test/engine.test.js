import test from "node:test";
import assert from "node:assert/strict";
import { scenes } from "../src/story.js";
import { scoresFor, makeResult } from "../src/engine.js";

test("six scenes form a complete journey with three to five concrete choices", () => {
  assert.equal(scenes.length, 6);
  scenes.forEach(scene => assert.ok(scene.choices.length >= 3 && scene.choices.length <= 5));
  assert.equal(scenes.filter(scene => scene.identity).length, 1);
});

test("the final scene offers the specified immediate actions", () => {
  assert.equal(scenes[5].title, "後ろから音がする。");
  assert.equal(scenes[5].text, "止まると、音も止まる。");
  assert.deepEqual(scenes[5].choices.map(choice => choice.label), [
    "振り返る", "待つ", "走る", "気にせず歩く", "隠れる"
  ]);
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
  assert.deepEqual(scenes[4].choices.map(choice => choice.artifact), [
    "歯のない鍵", "鳴らない鈴", "穴のあいた石"
  ]);
  const result = makeResult({ seed: 1, answers: [0, 0, 0, 0, 2, 0], artifact: "穴のあいた石" }, scenes, new Date("2026-01-01"));
  assert.equal(result.artifact, "穴のあいた石");
  assert.equal(result.quirks.length, 3);
});
