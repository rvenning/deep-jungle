# Deep Jungle 🌿

A polished 2D exploration platformer in the spirit of the classic Apogee
games — 6 themed worlds, 18 handcrafted levels, 6 bosses, unlockable
equipment, and a secret hiding in every corner. You're an explorer searching
for a legendary lost civilization deep in the jungle.

**Play it:** https://rvenning.github.io/deep-jungle/

## Features

- **6 worlds** — Jungle Trails, Waterfalls, Ancient Ruins, Abandoned Mines
  (dark — bring the lantern), Volcano (with a rising-lava escape) and the
  Lost City. Each world introduces new mechanics and ends in a boss.
- **Modern movement** — coyote time, jump buffering, variable jump height,
  ladders, vines, swimming, slopes, moving platforms, climbable walls.
- **Equipment** — find the Machete, Boomerang, Lantern and Climbing Gloves;
  each unlocks new mechanics *and* new secrets ([js/equipment.js](js/equipment.js)).
- **Secrets everywhere** — false walls, hidden idols, lost journal pages that
  tell the story, breakable blocks, toggle-block puzzles, explosive barrels.
- **6 bosses** on a shared framework ([js/bosses.js](js/bosses.js)) — telegraphed
  patterns and a vulnerable window, not health sponges.
- **Kind difficulty** — infinite retries, mid-level checkpoint torches,
  collected treasure survives a fall. Stars reward full treasure and secrets.
- **Data-driven** — levels are ASCII tile maps ([js/levels.js](js/levels.js)),
  tiles/enemies/items are registries; a new level or enemy is one new entry.
- **Composed backing tracks** — a synthesized theme per world (marimba
  jungle, flowing waterfalls, mysterious ruins, low mine blues, driving
  volcano, regal lost city) on a WebAudio lookahead sequencer, with boss
  variants and a music toggle in the pause menu ([js/audio.js](js/audio.js)).
- Family profiles with PINs, shared leaderboard, journal collection book,
  completion %, and cross-device sync.

## Level format

Levels are ASCII rows in [js/levels.js](js/levels.js) — one char per 16px tile
(legend in [js/tiles.js](js/tiles.js)): `#` ground, `=` stone, `%` false wall,
`-` platform, `H`/`|` ladder/vine, `~` water, `L` lava, `^` spikes, `D` door,
`X` exit, `C` checkpoint, `S`/`T`/`t` switch + toggle blocks, `!` crumbling,
`O` barrel, `V` cuttable vines, `G` grip wall, items `c e r k + R i j`,
tools `1-4`, enemies `s n f b m z g u p q`, movers `M W`, spawn `P`.
Boss levels are `{ name, boss: "snake", rows: <arena> }`.

## Built on gamekit

Storage/family sync, profiles + PINs, WebAudio synth, screens/modals and PWA
install come from [gamekit](https://github.com/rvenning/gamekit), vendored
into `lib/`. Re-vendor after a kit change:

```
$env:Path += ';C:\Program Files\nodejs'
node "..\gamekit\tools\sync-to-game.js" "..\deep-jungle"
```

## PWA

`manifest.json` + `sw.js` (network-first cache, bump `CACHE` on shell changes)
+ `icons/` (regenerate with `node tools/make-icons.js`).

## Local development

```
$env:Path += ';C:\Program Files\nodejs'
npx http-server "D:\OneDrive\Documents\Claude Code\deep-jungle" -p 8102 -c-1
```

Tests (level-map linter incl. reachability flood-fill, tile physics, merge
safety):

```
npm test
```

## Storage

localStorage keys prefixed `dj_`; family sync in the `deepjungle` Firestore
collection of the shared `wordvoyage-e5a5c` project (the public API key is
restricted and safe to commit). All progress fields are monotonic (bests,
unlocks, found-flags), so cross-device merges take field-wise max/union.
