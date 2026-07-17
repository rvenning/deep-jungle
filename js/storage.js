// Persistence — gamekit storage configured for Deep Jungle.
// dj_* localStorage keys, "deepjungle" Firestore collection.
//
// Everything in progress is monotonic (bests, unlocks, found-flags), so a
// field-wise max()/union merge is always safe across devices.

const Storage = GK.createStorage({
  prefix: "dj",
  collection: "deepjungle",
  firebaseConfig: window.FIREBASE_CONFIG,
  blankProgress: () => ({
    best: 0,                 // best single-level score (leaderboard headline)
    totalScore: 0,           // sum of best score per level
    levels: {},              // { [idx]: { done, score, stars, treasure, treasureTotal, secrets, secretsTotal } }
    tools: {},               // { machete: 1, boomerang: 1, ... }
    journals: {},            // { [idx]: 1 } story pages read (by level index)
    updated: 0,
  }),
  mergeProgress: (a, b) => {
    const levels = { ...(a.levels || {}) };
    for (const [idx, lv] of Object.entries(b.levels || {})) {
      const cur = levels[idx];
      if (!cur) { levels[idx] = lv; continue; }
      levels[idx] = {
        done: Math.max(cur.done || 0, lv.done || 0),
        score: Math.max(cur.score || 0, lv.score || 0),
        stars: Math.max(cur.stars || 0, lv.stars || 0),
        treasure: Math.max(cur.treasure || 0, lv.treasure || 0),
        treasureTotal: Math.max(cur.treasureTotal || 0, lv.treasureTotal || 0),
        secrets: Math.max(cur.secrets || 0, lv.secrets || 0),
        secretsTotal: Math.max(cur.secretsTotal || 0, lv.secretsTotal || 0),
      };
    }
    return {
      ...a, ...b,
      best: Math.max(a.best || 0, b.best || 0),
      totalScore: Math.max(a.totalScore || 0, b.totalScore || 0),
      levels,
      tools: { ...(a.tools || {}), ...(b.tools || {}) },
      journals: { ...(a.journals || {}), ...(b.journals || {}) },
    };
  },
});

/* ----- Deep Jungle helpers ----- */
Object.assign(Storage, {
  totalStars(prog) {
    return Object.values(prog.levels || {}).reduce((s, l) => s + (l.stars || 0), 0);
  },

  // Levels unlock in order: the one after the highest completed.
  unlockedLevel(prog) {
    let max = -1;
    for (const [k, l] of Object.entries(prog.levels || {})) if (l.done) max = Math.max(max, Number(k));
    return Math.min(max + 1, LEVELS.length - 1);
  },

  hasTool(prog, id) { return !!(prog.tools && prog.tools[id]); },

  // Completion % across the whole campaign: levels done + treasure + secrets.
  completionPct(prog) {
    let got = 0, total = 0;
    LEVELS.forEach((lv, i) => {
      const r = (prog.levels || {})[i] || {};
      total += 1;
      got += r.done ? 1 : 0;
      if (!lv.boss) {
        const tt = r.treasureTotal || countLevelTreasure(lv);
        const st = r.secretsTotal || 2; // idol + journal per authored level
        total += 2;
        got += tt ? Math.min(1, (r.treasure || 0) / tt) : 0;
        got += st ? Math.min(1, (r.secrets || 0) / st) : 0;
      }
    });
    return Math.round((got / total) * 100);
  },

  // Record a level result. Only a WIN records completion/stars; tool and
  // journal finds stick either way (you keep what you found).
  recordResult(profileId, levelIdx, res) {
    const prog = this.getProgress(profileId);
    prog.levels = prog.levels || {};
    if (res.win) {
      const cur = prog.levels[levelIdx] || {};
      prog.levels[levelIdx] = {
        done: 1,
        score: Math.max(cur.score || 0, res.score),
        stars: Math.max(cur.stars || 0, res.stars),
        treasure: Math.max(cur.treasure || 0, res.treasure),
        treasureTotal: res.treasureTotal,
        secrets: Math.max(cur.secrets || 0, res.secrets),
        secretsTotal: res.secretsTotal,
      };
      prog.best = Math.max(prog.best || 0, res.score);
      prog.totalScore = Object.values(prog.levels).reduce((s, l) => s + (l.score || 0), 0);
    }
    for (const t of res.toolsFound || []) { prog.tools = prog.tools || {}; prog.tools[t] = 1; }
    if (res.journalFound) { prog.journals = prog.journals || {}; prog.journals[levelIdx] = 1; }
    this.saveProgress(profileId, prog);
    return prog;
  },
});

// Treasure countable from the map (coins/gems/relics/idols — not keys/hearts).
function countLevelTreasure(lv) {
  let n = 0;
  for (const row of lv.rows) for (const ch of row) {
    if (ITEMS[ch] && ITEMS[ch].score > 0) n++;
  }
  return n;
}
