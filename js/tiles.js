// Tile registry — every map character the tile engine understands.
// Pure data: the physics and renderer read *properties*, never chars, so a new
// tile type is one entry here (plus a paint function in game.js if it needs a
// custom look).
//
// Solid grid tiles stay in the grid; ENTITY_CHARS (bottom) are lifted out of
// the grid into live entities when a level loads.
//
// LEGEND
//   terrain   # ground   = stone   % false wall (looks solid, isn't — secret!)
//             B breakable block   - one-way platform   / \ slopes
//   climb     H ladder   | vine   G grip wall (needs Climbing Gloves)
//   hazards   ^ spikes   L lava   ~ water (swim)
//   gadgets   ! crumbling platform   D locked door   X exit   C checkpoint
//             S switch   T toggle block (starts solid)   t toggle block (starts open)
//             O explosive barrel   V cuttable vines (needs Machete)
//   items     c coin  e emerald  r ruby  k key  + heart  R relic
//             i idol (secret)  j journal (story page)
//   tools     1 machete  2 boomerang  3 lantern  4 climbing gloves
//   enemies   s spider  n snake  f frog  b bat  m monkey  z beetle
//             g golem  u fire imp  p piranha  q guardian
//   movers    M platform (horizontal)  W platform (vertical)
//   player    P spawn point

const TS = 16; // logical pixels per tile — the one true tile size

const TILES = {
  "#": { solid: true, ground: true },
  "=": { solid: true, stone: true },
  "%": { falseWall: true },                       // renders as stone, walk through
  "B": { solid: true, breakable: true },
  "-": { oneway: true },
  "/": { slope: 1 },                              // floor rises left→right
  "\\": { slope: -1 },                            // floor falls left→right
  "H": { climb: true, ladder: true },
  "|": { climb: true, vine: true },
  "G": { grip: true },                            // climbable with gloves
  "^": { damage: true, spikes: true },
  "L": { damage: true, lava: true, deadly: true },
  "~": { water: true },
  "!": { solid: true, crumble: true },
  "D": { solid: true, door: true },
  "X": { exit: true },
  "C": { checkpoint: true },
  "S": { solid: true, switch: true },
  "T": { toggle: "on" },                          // solid while switch ON
  "t": { toggle: "off" },                         // solid while switch OFF
  "O": { solid: true, barrel: true },
  "V": { solid: true, cut: true },                // machete clears it
  ".": {},
  " ": {},
};

// Treasure + pickups (entity items). `secret` items count toward the level's
// secret tally; hidden idols/journals only ever live in secret spots.
const ITEMS = {
  c: { name: "Coin",    score: 10,  color: "#ffd23e", kind: "coin" },
  e: { name: "Emerald", score: 50,  color: "#37e08b", kind: "gem" },
  r: { name: "Ruby",    score: 120, color: "#ff5470", kind: "gem" },
  k: { name: "Key",     score: 0,   color: "#ffd97a", kind: "key" },
  "+": { name: "Heart", score: 0,   color: "#ff6b81", kind: "heart" },
  R: { name: "Relic",   score: 500, color: "#c9a2ff", kind: "relic" },
  i: { name: "Golden Idol", score: 1000, color: "#ffcf3e", kind: "idol", secret: true },
  j: { name: "Lost Journal", score: 250, color: "#e8dcc0", kind: "journal", secret: true },
};

const ENTITY_CHARS = {
  // items
  c: { type: "item", id: "c" }, e: { type: "item", id: "e" },
  r: { type: "item", id: "r" }, k: { type: "item", id: "k" },
  "+": { type: "item", id: "+" }, R: { type: "item", id: "R" },
  i: { type: "item", id: "i" }, j: { type: "item", id: "j" },
  // tool pickups (ids match EQUIPMENT in js/equipment.js)
  1: { type: "tool", id: "machete" },
  2: { type: "tool", id: "boomerang" },
  3: { type: "tool", id: "lantern" },
  4: { type: "tool", id: "gloves" },
  // enemies (defs in js/enemies.js)
  s: { type: "enemy", id: "spider" },
  n: { type: "enemy", id: "snake" },
  f: { type: "enemy", id: "frog" },
  b: { type: "enemy", id: "bat" },
  m: { type: "enemy", id: "monkey" },
  z: { type: "enemy", id: "beetle" },
  g: { type: "enemy", id: "golem" },
  u: { type: "enemy", id: "imp" },
  p: { type: "enemy", id: "piranha" },
  q: { type: "enemy", id: "guardian" },
  // moving platforms
  M: { type: "mover", axis: "x" },
  W: { type: "mover", axis: "y" },
  // player
  P: { type: "player" },
};
