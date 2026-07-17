// Enemy registry — pure data + a behavior name. The engine implements a small
// set of reusable behaviors ("patrol", "hop", "fly", "thrower", "swim") and
// every enemy is parameters on top of one. A new enemy is one entry.
//
// stomp: player can bounce on its head to defeat it.
// armored: stomp bounces off harmlessly (needs machete / boomerang / barrel).
// Sizes in logical px (TS = 16).
const ENEMIES = {
  spider: {
    name: "Jungle Spider", behavior: "patrol",
    w: 14, h: 10, hp: 1, speed: 26, stomp: true, score: 100,
    body: "#3d2b4f", accent: "#7a5c9e", eye: "#ffe08a",
    turnAtLedge: true,
  },
  snake: {
    name: "Emerald Snake", behavior: "patrol",
    w: 22, h: 8, hp: 1, speed: 44, stomp: true, score: 150,
    body: "#2fa14d", accent: "#8fe05f", eye: "#ff5470",
    turnAtLedge: true,
  },
  frog: {
    name: "Boulder Frog", behavior: "hop",
    w: 14, h: 12, hp: 1, speed: 60, stomp: true, score: 150,
    body: "#4f8a3d", accent: "#a4d95f", eye: "#ffffff",
    hopVy: -180, hopEvery: 1.4,
  },
  bat: {
    name: "Cave Bat", behavior: "fly",
    w: 14, h: 8, hp: 1, speed: 38, stomp: true, score: 150,
    body: "#4a3a5a", accent: "#9a86b8", eye: "#ff9f43",
    amp: 22, freq: 2.2,
  },
  monkey: {
    name: "Cheeky Monkey", behavior: "thrower",
    w: 14, h: 16, hp: 1, speed: 0, stomp: true, score: 200,
    body: "#8a5a33", accent: "#d9a066", eye: "#ffffff",
    range: 130, cooldown: 2.0, projVx: 90, projVy: -160,
  },
  beetle: {
    name: "Giant Beetle", behavior: "patrol",
    w: 16, h: 11, hp: 1, speed: 22, stomp: false, armored: true, score: 250,
    body: "#2b6ea8", accent: "#77c7ff", eye: "#ffe08a",
    turnAtLedge: true,
  },
  golem: {
    name: "Stone Golem", behavior: "patrol",
    w: 20, h: 24, hp: 3, speed: 14, stomp: false, armored: true, score: 500,
    body: "#6b6257", accent: "#8f8474", eye: "#7ef0c0",
    turnAtLedge: true, heavy: true,
  },
  imp: {
    name: "Fire Imp", behavior: "hop",
    w: 12, h: 12, hp: 1, stomp: false, armored: true, score: 250,
    body: "#d94f2b", accent: "#ffb347", eye: "#fff3c4",
    speed: 70, hopVy: -200, hopEvery: 1.1, fiery: true,
  },
  piranha: {
    name: "Piranha", behavior: "swim",
    w: 14, h: 9, hp: 1, stomp: false, score: 150,
    body: "#c23b4e", accent: "#ff8fa0", eye: "#ffffff",
    speed: 55,
  },
  guardian: {
    name: "Tribal Guardian", behavior: "thrower",
    w: 14, h: 22, hp: 2, stomp: true, score: 350,
    body: "#7a4a2b", accent: "#e0b060", eye: "#ffffff",
    range: 150, cooldown: 2.4, projVx: 160, projVy: -20, walks: true, speed: 20,
  },
};
