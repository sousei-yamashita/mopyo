import test from "node:test";
import assert from "node:assert/strict";
import { STORAGE_KEY, clearStoredState, isPreviewPath, readStoredState, writeStoredState } from "../src/storage.js";

function fakeStorage(seed = {}) {
  const data = new Map(Object.entries(seed));
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, value);
    },
    removeItem(key) {
      data.delete(key);
    }
  };
}

test("preview paths are detected under the GitHub Pages preview directory", () => {
  assert.equal(isPreviewPath("/mopyo/previews/pr-24/"), true);
  assert.equal(isPreviewPath("/mopyo/"), false);
});

test("preview state uses sessionStorage instead of production localStorage", () => {
  const localStorage = fakeStorage({ [STORAGE_KEY]: JSON.stringify({ phase: "card", scene: 5 }) });
  const sessionStorage = fakeStorage();
  const previewPath = "/mopyo/previews/pr-24/";
  const previewState = { phase: "story", scene: 1 };

  assert.equal(readStoredState(previewPath, { localStorage, sessionStorage }), null);

  writeStoredState(previewPath, { localStorage, sessionStorage }, previewState);
  assert.deepEqual(readStoredState(previewPath, { localStorage, sessionStorage }), previewState);
  assert.equal(localStorage.getItem(STORAGE_KEY), JSON.stringify({ phase: "card", scene: 5 }));

  clearStoredState(previewPath, { localStorage, sessionStorage });
  assert.equal(sessionStorage.getItem(STORAGE_KEY), null);
  assert.equal(localStorage.getItem(STORAGE_KEY), JSON.stringify({ phase: "card", scene: 5 }));
});
