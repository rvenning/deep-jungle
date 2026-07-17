"use strict";
// Tile-physics unit tests against a tiny stub world: wall clamping, one-way
// platforms, slope surfaces and ledge probes — the pieces that silently break
// the game feel when a refactor nudges them.

const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const JS = path.join(__dirname, "..", "js");

function load() {
  const sandbox = {};
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  const src = ["tiles.js", "physics.js"]
    .map((f) => fs.readFileSync(path.join(JS, f), "utf8")).join("\n") +
    ";globalThis.__x = { Physics, TS, TILES };";
  vm.runInContext(src, sandbox, { filename: "dj-physics-bundle.js" });
  return sandbox.__x;
}

const { Physics, TS } = load();

// A little world from ASCII (same legend as the real maps)
function world(rows) {
  const grid = rows.map((r) => r.split(""));
  return {
    cols: grid[0].length, rows: grid.length,
    tileAt(c, r) { return null; },
    isSolid(c, r) {
      if (c < 0 || c >= this.cols) return true;
      if (r < 0) return false;
      if (r >= this.rows) return true;
      const ch = (grid[r] || [])[c];
      return ch === "#" || ch === "=";
    },
    isOneway(c, r) { return ((grid[r] || [])[c]) === "-"; },
    slopeAt(c, r) { const ch = (grid[r] || [])[c]; return ch === "/" ? 1 : ch === "\\" ? -1 : 0; },
  };
}

const ent = (x, y) => ({ x, y, w: 10, h: 14, vx: 0, vy: 0, dropThrough: false });

test("moveX clamps against a wall and reports the hit", () => {
  const w = world([".....", "....#", "#####"]);
  const e = ent(TS * 2, TS * 1.5);
  const hit = Physics.moveX(e, TS * 5, w);
  assert.equal(hit, true);
  assert.ok(e.x < 4 * TS - e.w / 2 + 0.1, "stopped at the wall face");
});

test("moveX travels freely without obstacles", () => {
  const w = world([".....", ".....", "#####"]);
  const e = ent(TS, TS * 1.5);
  const hit = Physics.moveX(e, TS, w);
  assert.equal(hit, false);
  assert.ok(Math.abs(e.x - 2 * TS) < 0.001);
});

test("moveY lands on a floor", () => {
  const w = world([".....", ".....", "#####"]);
  const e = ent(TS * 2, TS);
  const r = Physics.moveY(e, TS * 3, w);
  assert.equal(r, "floor");
  assert.ok(Math.abs((e.y + e.h / 2) - 2 * TS) < 0.1, "feet rest on the floor");
});

test("one-way platform: catches a fall from above, lets you jump through", () => {
  const w = world([".....", ".....", "..-..", ".....", "#####"]);
  // falling from above the platform → lands
  const a = ent(TS * 2.5, TS * 1);
  assert.equal(Physics.moveY(a, TS * 2, w), "floor");
  // moving up from below → passes through
  const b = ent(TS * 2.5, TS * 3.5);
  assert.equal(Physics.moveY(b, -TS * 2, w), null);
  // dropThrough set → falls through
  const c = ent(TS * 2.5, TS * 1);
  c.dropThrough = true;
  assert.equal(Physics.moveY(c, TS * 3, w), "floor", "still stops at the real floor");
  assert.ok(c.y > TS * 3, "passed through the one-way");
});

test("slope surface rises across a '/' cell", () => {
  const w = world(["...", "./#", "###"]);
  const left = Physics.slopeSurface(w, 1, 1, 1 * TS + 1);
  const right = Physics.slopeSurface(w, 1, 1, 2 * TS - 1);
  assert.ok(left > right, "floor is higher (smaller y) on the right of a / slope");
  assert.ok(Math.abs(left - 2 * TS) < 2, "left edge near the cell bottom");
  assert.ok(Math.abs(right - TS) < 2, "right edge near the cell top");
});

test("snapToSlope plants the feet on the slope", () => {
  const w = world(["...", "./#", "###"]);
  const e = ent(TS * 1.5, TS * 1.2);
  e.vy = 50;
  const on = Physics.snapToSlope(e, w);
  assert.equal(on, true);
  const surf = Physics.slopeSurface(w, 1, 1, e.x);
  assert.ok(Math.abs((e.y + e.h / 2) - surf) < 0.5);
});

test("ledgeAhead sees the drop, groundedOn sees the floor", () => {
  const w = world(["......", "......", "###..."]);
  const e = ent(TS * 2.5, 2 * TS - 7.01);
  assert.equal(Physics.groundedOn(e, w), true);
  assert.equal(Physics.ledgeAhead(e, 1, w), true, "ledge to the right");
  assert.equal(Physics.ledgeAhead(e, -1, w), false, "solid to the left");
});

test("overlaps is symmetric and edge-exclusive", () => {
  const a = { x: 0, y: 0, w: 10, h: 10 }, b = { x: 9, y: 0, w: 10, h: 10 };
  assert.equal(Physics.overlaps(a, b), true);
  assert.equal(Physics.overlaps(b, a), true);
  assert.equal(Physics.overlaps(a, { x: 10, y: 0, w: 10, h: 10 }), false);
});
