"use strict";
// Merge-safety tests for the progress reconciler. Everything in Deep Jungle
// progress is monotonic (bests, unlocks, found-flags), so the invariant is
// simple: merging in either direction never loses anything either device had.

const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const JS = path.join(__dirname, "..", "js");

function load() {
  const sandbox = {
    console,
    window: { FIREBASE_CONFIG: null },
    GK: { createStorage: (cfg) => ({ ...cfg }) },
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  const src = ["tiles.js", "enemies.js", "equipment.js", "levels.js", "storage.js"]
    .map((f) => fs.readFileSync(path.join(JS, f), "utf8")).join("\n") +
    ";globalThis.__x = { Storage, LEVELS };";
  vm.runInContext(src, sandbox, { filename: "dj-storage-bundle.js" });
  return sandbox.__x;
}

const { Storage: S, LEVELS } = load();
const blank = () => S.blankProgress();

test("blank progress has the full shape including updated", () => {
  const b = blank();
  for (const k of ["best", "totalScore", "levels", "tools", "journals", "updated"])
    assert.ok(k in b, `missing ${k}`);
});

test("merge keeps the best of each per-level field, both directions", () => {
  const a = { ...blank(), levels: { 0: { done: 1, score: 900, stars: 2, treasure: 10, treasureTotal: 20, secrets: 2, secretsTotal: 2 } } };
  const b = { ...blank(), levels: { 0: { done: 1, score: 700, stars: 3, treasure: 15, treasureTotal: 20, secrets: 1, secretsTotal: 2 },
                                    1: { done: 1, score: 100, stars: 1, treasure: 0, treasureTotal: 9, secrets: 0, secretsTotal: 2 } } };
  for (const m of [S.mergeProgress(a, b), S.mergeProgress(b, a)]) {
    assert.equal(m.levels[0].score, 900);
    assert.equal(m.levels[0].stars, 3, "stars and score merge independently");
    assert.equal(m.levels[0].treasure, 15);
    assert.equal(m.levels[0].secrets, 2);
    assert.ok(m.levels[1], "level only on one device survives");
  }
});

test("tools and journals union across devices", () => {
  const a = { ...blank(), tools: { machete: 1 }, journals: { 0: 1 } };
  const b = { ...blank(), tools: { boomerang: 1 }, journals: { 3: 1 } };
  for (const m of [S.mergeProgress(a, b), S.mergeProgress(b, a)]) {
    assert.equal(m.tools.machete, 1);
    assert.equal(m.tools.boomerang, 1);
    assert.equal(m.journals[0], 1);
    assert.equal(m.journals[3], 1);
  }
});

test("fields added by a newer client survive an older client's merge", () => {
  const m = S.mergeProgress({ ...blank(), futureField: "keep-me" }, blank());
  assert.equal(m.futureField, "keep-me");
});

test("unlockedLevel walks past completed levels only", () => {
  assert.equal(S.unlockedLevel(blank()), 0);
  const p = { ...blank(), levels: { 0: { done: 1 }, 1: { done: 1 } } };
  assert.equal(S.unlockedLevel(p), 2);
  // a recorded-but-unfinished level must not unlock the next one
  const q = { ...blank(), levels: { 0: { done: 0, score: 50 } } };
  assert.equal(S.unlockedLevel(q), 0);
});

test("completionPct: 0 for blank, 100 for a perfect save", () => {
  assert.equal(S.completionPct(blank()), 0);
  const full = blank();
  LEVELS.forEach((lv, i) => {
    full.levels[i] = { done: 1, score: 1, stars: 3, treasure: 5, treasureTotal: 5, secrets: 2, secretsTotal: 2 };
  });
  assert.equal(S.completionPct(full), 100);
});
