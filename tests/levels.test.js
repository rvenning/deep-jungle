"use strict";
// Data linter for every level map. Catches the mistakes hand-authored ASCII
// maps actually make: ragged rows, unknown characters, missing spawns/exits,
// missing secrets, key/door mismatches and areas sealed off from the player.

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
  const src = ["tiles.js", "enemies.js", "equipment.js", "levels.js"]
    .map((f) => fs.readFileSync(path.join(JS, f), "utf8")).join("\n") +
    ";globalThis.__x = { TILES, ITEMS, ENTITY_CHARS, ENEMIES, EQUIPMENT, WORLDS, LEVELS };";
  vm.runInContext(src, sandbox, { filename: "dj-levels-bundle.js" });
  return sandbox.__x;
}

const { TILES, ITEMS, ENTITY_CHARS, ENEMIES, EQUIPMENT, WORLDS, LEVELS } = load();

test("campaign shape: 6 worlds, each ending in a boss", () => {
  assert.equal(WORLDS.length, 6);
  for (const w of WORLDS) {
    assert.ok(w.levels.length >= 2, `${w.name} too small`);
    assert.ok(w.levels[w.levels.length - 1].boss, `${w.name} must end in a boss`);
    assert.ok(w.theme && w.theme.skyTop && w.theme.ground, `${w.name} theme incomplete`);
  }
  assert.equal(LEVELS.length, WORLDS.reduce((n, w) => n + w.levels.length, 0));
});

test("every registry char referenced by maps exists", () => {
  for (const [ch, e] of Object.entries(ENTITY_CHARS)) {
    if (e.type === "enemy") assert.ok(ENEMIES[e.id], `enemy ${e.id} (char ${ch}) missing`);
    if (e.type === "item") assert.ok(ITEMS[e.id], `item ${e.id} (char ${ch}) missing`);
    if (e.type === "tool") assert.ok(EQUIPMENT.some((t) => t.id === e.id), `tool ${e.id} missing`);
  }
});

for (const [idx, lv] of LEVELS.entries()) {
  const tag = `L${idx} W${lv.world + 1} "${lv.name}"`;

  test(`${tag}: rows are rectangular and all chars known`, () => {
    const widths = new Set(lv.rows.map((r) => r.length));
    assert.equal(widths.size, 1, `ragged rows: widths ${[...widths].join(",")}`);
    lv.rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        assert.ok(TILES[ch] || ENTITY_CHARS[ch], `unknown char "${ch}" at r${y}c${x}`);
      }
    });
  });

  test(`${tag}: exactly one spawn; an exit or a boss`, () => {
    const all = lv.rows.join("");
    assert.equal([...all].filter((c) => c === "P").length, 1);
    if (!lv.boss) assert.ok(all.includes("X"), "no exit");
    else assert.ok(Bosses_ids.includes(lv.boss), `unknown boss "${lv.boss}"`);
  });

  if (!lv.boss) {
    test(`${tag}: hides exactly one idol and one journal (the secrets)`, () => {
      const all = lv.rows.join("");
      assert.equal([...all].filter((c) => c === "i").length, 1, "idol count");
      assert.equal([...all].filter((c) => c === "j").length, 1, "journal count");
      assert.ok(lv.journal && lv.journal.length > 20, "journal text missing");
    });

    test(`${tag}: enough keys for the door groups`, () => {
      const keys = [...lv.rows.join("")].filter((c) => c === "k").length;
      assert.ok(keys >= doorGroups(lv.rows), `${keys} keys < ${doorGroups(lv.rows)} door groups`);
    });
  }

  test(`${tag}: every entity and the exit are reachable from the spawn`, () => {
    const missed = unreachable(lv.rows);
    assert.deepEqual(missed, [], `unreachable: ${missed.join(" ")}`);
  });
}

// door tiles connected orthogonally form one group needing one key
function doorGroups(rows) {
  const w = rows[0].length, seen = new Set();
  let groups = 0;
  rows.forEach((row, y) => {
    for (let x = 0; x < w; x++) {
      if (row[x] !== "D" || seen.has(y * w + x)) continue;
      groups++;
      const q = [[x, y]];
      while (q.length) {
        const [cx, cy] = q.pop();
        const k = cy * w + cx;
        if (seen.has(k) || (rows[cy] || "")[cx] !== "D") continue;
        seen.add(k);
        [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx, dy]) => q.push([cx + dx, cy + dy]));
      }
    }
  });
  return groups;
}

// gravity-ignoring flood fill over passable cells — a necessary condition for
// reachability that still catches sealed rooms and walled-off items
function unreachable(rows) {
  const w = rows[0].length, h = rows.length;
  const pass = (ch) => {
    if (ch === undefined) return false;
    if (ENTITY_CHARS[ch]) return true;
    const t = TILES[ch];
    if (!t) return false;
    if (t.falseWall || t.toggle || t.oneway || t.climb || t.grip || t.water ||
        t.exit || t.checkpoint || t.slope) return true;
    if (t.solid) return !!(t.breakable || t.door || t.cut || t.crumble || t.barrel);
    return true;
  };
  let px = -1, py = -1;
  rows.forEach((r, y) => { const x = r.indexOf("P"); if (x >= 0) { px = x; py = y; } });
  const seen = new Set([py * w + px]);
  const q = [[px, py]];
  while (q.length) {
    const [x, y] = q.pop();
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const k = ny * w + nx;
      if (seen.has(k) || !pass((rows[ny] || "")[nx])) continue;
      seen.add(k);
      q.push([nx, ny]);
    }
  }
  const missed = [];
  rows.forEach((r, y) => {
    for (let x = 0; x < w; x++) {
      const ch = r[x];
      if (ch === "P") continue;
      if ((ENTITY_CHARS[ch] || ch === "X") && !seen.has(y * w + x)) missed.push(`${ch}@r${y}c${x}`);
    }
  });
  return missed;
}

// boss ids shipped in js/bosses.js — kept in sync by this list
const Bosses_ids = ["snake", "frog", "guardian", "drill", "lava", "king"];
