// Equipment registry — each tool unlocks a mechanic AND new secrets.
// Tools are found inside levels (map chars 1-4) and kept forever on the
// profile. The engine checks abilities via Game.hasTool(id); nothing else
// hard-codes a tool name.
const EQUIPMENT = [
  {
    id: "machete", icon: "🔪", name: "Machete",
    map: "1",
    desc: "Slash vines and enemies up close. Cuts V-blocks.",
    found: "Deep in the Jungle Trails",
    toast: "You found the MACHETE! Press ⚔ to slash vines and enemies.",
  },
  {
    id: "boomerang", icon: "🪃", name: "Boomerang",
    map: "2",
    desc: "Throw far, hits switches and enemies, then returns.",
    found: "Behind the great waterfall",
    toast: "You found the BOOMERANG! Hold ⚔ to throw it far.",
  },
  {
    id: "lantern", icon: "🏮", name: "Lantern",
    map: "3",
    desc: "Lights up dark caves and reveals hidden sparkles.",
    found: "In the ancient ruins",
    toast: "You found the LANTERN! Dark caves are bright now.",
  },
  {
    id: "gloves", icon: "🧤", name: "Climbing Gloves",
    map: "4",
    desc: "Grip and climb rough rock walls (the bumpy ones).",
    found: "Lost in the mines",
    toast: "You found CLIMBING GLOVES! You can climb rocky walls.",
  },
];

const EQUIP_BY_ID = Object.fromEntries(EQUIPMENT.map((e) => [e.id, e]));
