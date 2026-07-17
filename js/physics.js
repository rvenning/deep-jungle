// Tile physics — AABB movement against the level grid, with slopes, one-way
// platforms and moving-platform carry. Entities use centre-anchored rects
// { x, y, w, h, vx, vy }. The grid is queried through a `world` interface
// supplied by game.js: { cols, rows, tileAt(c,r), isSolid(c,r,ent),
// isOneway(c,r), slopeAt(c,r) }.
//
// Everything is in logical pixels (TS = 16 per tile).

const Physics = {
  clamp(v, a, b) { return v < a ? a : v > b ? b : v; },

  tileRange(lo, hi, max) {
    const a = Physics.clamp(Math.floor(lo / TS), 0, max - 1);
    const b = Physics.clamp(Math.floor(hi / TS), 0, max - 1);
    return [a, b];
  },

  // Surface height of a slope cell at world x (returns world y of the floor),
  // or null if the cell isn't a slope.
  slopeSurface(world, c, r, x) {
    const s = world.slopeAt(c, r);
    if (!s) return null;
    const fx = Physics.clamp((x - c * TS) / TS, 0, 1); // 0..1 across the cell
    const top = r * TS, bot = (r + 1) * TS;
    // "/" rises to the right, "\" falls to the right
    return s === 1 ? bot - fx * TS : top + fx * TS;
  },

  // Move horizontally, clamping against solid tiles. Returns true if blocked.
  moveX(ent, dx, world) {
    if (!dx) return false;
    let hit = false;
    const sign = Math.sign(dx);
    let remaining = Math.abs(dx);
    while (remaining > 0) {
      const step = Math.min(remaining, TS * 0.45);
      remaining -= step;
      const nx = ent.x + step * sign;
      const edge = nx + (ent.w / 2) * sign;
      const c = Math.floor(edge / TS);
      // sample a couple of rows along the body, shrunk to allow 1-tile gaps
      const [r0, r1] = Physics.tileRange(ent.y - ent.h / 2 + 2, ent.y + ent.h / 2 - 2, world.rows);
      let blocked = false;
      for (let r = r0; r <= r1; r++) {
        if (world.slopeAt(c, r)) continue;         // slopes never block sideways
        if (world.isSolid(c, r, ent)) { blocked = true; break; }
      }
      if (blocked) {
        ent.x = sign > 0 ? c * TS - ent.w / 2 - 0.01 : (c + 1) * TS + ent.w / 2 + 0.01;
        hit = true;
        break;
      }
      ent.x = nx;
    }
    return hit;
  },

  // Move vertically. Handles solid tiles, one-way platforms (only when moving
  // down and feet started above the platform top). Returns "floor"|"ceil"|null.
  moveY(ent, dy, world) {
    if (!dy) return null;
    const sign = Math.sign(dy);
    let remaining = Math.abs(dy);
    const prevFeet = ent.y + ent.h / 2;
    while (remaining > 0) {
      const step = Math.min(remaining, TS * 0.45);
      remaining -= step;
      const ny = ent.y + step * sign;
      const edge = ny + (ent.h / 2) * sign;
      const r = Math.floor(edge / TS);
      const [c0, c1] = Physics.tileRange(ent.x - ent.w / 2 + 1, ent.x + ent.w / 2 - 1, world.cols);
      let blocked = false;
      for (let c = c0; c <= c1; c++) {
        if (world.slopeAt(c, r)) continue;         // slope contact is snapped separately
        if (world.isSolid(c, r, ent)) { blocked = true; break; }
        if (sign > 0 && !ent.dropThrough && world.isOneway(c, r) && prevFeet <= r * TS + 3) {
          blocked = true; break;
        }
      }
      if (blocked) {
        ent.y = sign > 0 ? r * TS - ent.h / 2 - 0.01 : (r + 1) * TS + ent.h / 2 + 0.01;
        return sign > 0 ? "floor" : "ceil";
      }
      ent.y = ny;
    }
    return null;
  },

  // Snap the entity's feet onto a slope surface under it (call after moveX /
  // moveY when falling or walking). Returns true if standing on a slope.
  snapToSlope(ent, world) {
    if (ent.vy < -1) return false;
    const feet = ent.y + ent.h / 2;
    const c = Math.floor(ent.x / TS);
    for (const r of [Math.floor(feet / TS), Math.floor(feet / TS) + 1]) {
      if (r < 0 || r >= world.rows) continue;
      const surf = Physics.slopeSurface(world, c, r, ent.x);
      if (surf === null) continue;
      if (feet >= surf - 5 && feet <= surf + TS * 0.8) {
        ent.y = surf - ent.h / 2;
        ent.vy = Math.min(ent.vy, 0);
        return true;
      }
    }
    return false;
  },

  // Is the entity standing on something? (probe 2px below the feet)
  groundedOn(ent, world) {
    const feet = ent.y + ent.h / 2 + 2;
    const r = Math.floor(feet / TS);
    const [c0, c1] = Physics.tileRange(ent.x - ent.w / 2 + 1, ent.x + ent.w / 2 - 1, world.cols);
    for (let c = c0; c <= c1; c++) {
      if (world.isSolid(c, r, ent)) return true;
      if (!ent.dropThrough && world.isOneway(c, r) && ent.y + ent.h / 2 <= r * TS + 3) return true;
      const surf = Physics.slopeSurface(world, c, r, ent.x);
      if (surf !== null && feet >= surf) return true;
    }
    return false;
  },

  // Probe: is there floor just ahead? (for patrol enemies that turn at ledges)
  ledgeAhead(ent, dir, world) {
    const aheadX = ent.x + dir * (ent.w / 2 + 3);
    const c = Math.floor(aheadX / TS);
    const r = Math.floor((ent.y + ent.h / 2 + 4) / TS);
    if (c < 0 || c >= world.cols) return true;
    if (world.isSolid(c, r, ent) || world.isOneway(c, r) || world.slopeAt(c, r)) return false;
    return true; // nothing there — it's a ledge
  },

  overlaps(a, b) {
    return Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2;
  },
};
