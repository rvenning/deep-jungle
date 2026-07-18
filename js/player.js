// The player controller — modern platformer feel: acceleration curves,
// variable jump height, coyote time, jump buffering, ladders/vines, swimming,
// squash & stretch. game.js owns collisions with items/enemies; this file owns
// how moving *feels*.

const PLAYER = {
  W: 10, H: 14,
  RUN: 118, ACC: 780, DEC: 880, AIR_ACC: 640, AIR_DEC: 240,
  GRAV: 900, JUMP: -278, JUMP_CUT: -70, MAX_FALL: 330,
  COYOTE: 0.12, BUFFER: 0.14,
  CLIMB: 74,
  SWIM_GRAV: 60, SWIM_THRUST: -150, SWIM_RUN: 78, SWIM_MAX_FALL: 90,
};

function makePlayer(x, y) {
  return {
    x, y, w: PLAYER.W, h: PLAYER.H, vx: 0, vy: 0,
    facing: 1, grounded: false, wasGrounded: false,
    coyote: 0, buffer: 0, dropThrough: false, dropT: 0,
    climbing: false, inWater: false, wasInWater: false, onGrip: false,
    hearts: 3, maxHearts: 3, iframes: 0, dead: false, deadT: 0,
    slashT: 0, runPhase: 0, idleT: 0,
    sx: 1, sy: 1,             // squash & stretch scales
    carrier: null, carrierDx: 0,
  };
}

const PlayerCtl = {
  update(p, dt, input, world) {
    if (p.dead) { p.deadT += dt; return; }
    p.iframes = Math.max(0, p.iframes - dt);
    p.slashT = Math.max(0, p.slashT - dt);
    p.dropT = Math.max(0, p.dropT - dt);
    p.dropThrough = p.dropT > 0;

    // ---- environment probes ----
    const cc = Math.floor(p.x / TS), cr = Math.floor(p.y / TS);
    const tileHere = world.tileAt(cc, cr) || {};
    const tileBelow = world.tileAt(cc, Math.floor((p.y + p.h / 2 + 2) / TS)) || {};
    p.inWater = !!tileHere.water;
    const canClimbHere = tileHere.climb || (tileHere.grip && Game.hasTool("gloves"));
    p.onGrip = !!(tileHere.grip && Game.hasTool("gloves"));

    // ---- jump buffering ----
    if (input.jumpPressed) p.buffer = PLAYER.BUFFER;
    else p.buffer = Math.max(0, p.buffer - dt);

    /* ================= climbing ================= */
    if (p.climbing) {
      if (!canClimbHere) p.climbing = false;
      else {
        p.vx = (input.right - input.left) * PLAYER.CLIMB * 0.7;
        p.vy = (input.down - input.up) * PLAYER.CLIMB;
        if (p.vy || p.vx) { p.runPhase += dt * 8; if (Math.random() < dt * 3) Sfx.climbTick(); }
        if (p.buffer > 0) {           // jump off
          p.buffer = 0; p.climbing = false;
          p.vy = PLAYER.JUMP * 0.82;
          p.vx = (input.right - input.left) * PLAYER.RUN;
          Sfx.jump(); Fx.dust(p.x, p.y + p.h / 2, 4);
        }
      }
    } else if (canClimbHere && (input.up || (input.down && !p.grounded))) {
      p.climbing = true; p.vx = 0; p.vy = 0;
    }

    /* ================= swimming ================= */
    if (!p.climbing && p.inWater) {
      const dir = input.right - input.left;
      p.vx += dir * PLAYER.ACC * 0.7 * dt;
      if (!dir) p.vx *= Math.pow(0.02, dt);
      p.vx = Physics.clamp(p.vx, -PLAYER.SWIM_RUN, PLAYER.SWIM_RUN);
      if (dir) p.facing = dir;
      p.vy += PLAYER.SWIM_GRAV * dt;
      if (input.up) p.vy -= 240 * dt;
      if (input.down) p.vy += 160 * dt;
      if (p.buffer > 0) {              // stroke
        p.buffer = 0;
        p.vy = PLAYER.SWIM_THRUST;
        Fx.dust(p.x, p.y, 3, "rgba(200,235,245,0.7)");
      }
      p.vy = Physics.clamp(p.vy, -170, PLAYER.SWIM_MAX_FALL);
      p.runPhase += dt * 6;
    }

    /* ================= running & jumping ================= */
    if (!p.climbing && !p.inWater) {
      const dir = input.right - input.left;
      const acc = p.grounded ? PLAYER.ACC : PLAYER.AIR_ACC;
      const dec = p.grounded ? PLAYER.DEC : PLAYER.AIR_DEC;
      if (dir) {
        // skid when reversing at speed — dust + a little lean sells the turn
        if (p.grounded && Math.sign(p.vx) === -dir && Math.abs(p.vx) > 70) {
          if (Math.random() < dt * 22) Fx.dust(p.x + dir * 4, p.y + p.h / 2, 2);
          p.sx = Math.max(p.sx, 1.12);
        }
        p.vx += dir * acc * dt;
        p.facing = dir;
      } else {
        const s = Math.sign(p.vx);
        p.vx -= s * dec * dt;
        if (Math.sign(p.vx) !== s) p.vx = 0;
      }
      p.vx = Physics.clamp(p.vx, -PLAYER.RUN, PLAYER.RUN);

      // coyote time
      p.coyote = p.grounded ? PLAYER.COYOTE : Math.max(0, p.coyote - dt);

      // drop through one-way platforms
      if (p.grounded && input.down && p.buffer > 0 && Game.onewayBelow(p)) {
        p.buffer = 0; p.dropT = 0.22; p.vy = 40;
      } else if (p.buffer > 0 && p.coyote > 0) {
        p.buffer = 0; p.coyote = 0;
        p.vy = PLAYER.JUMP;
        p.sx = 0.72; p.sy = 1.3;               // stretch
        Sfx.jump(); Fx.dust(p.x, p.y + p.h / 2, 5);
      }
      // variable jump height
      if (!input.jumpHeld && p.vy < PLAYER.JUMP_CUT) p.vy = PLAYER.JUMP_CUT;

      p.vy += PLAYER.GRAV * dt;
      p.vy = Math.min(p.vy, PLAYER.MAX_FALL);

      if (p.grounded && Math.abs(p.vx) > 10) {
        p.runPhase += dt * (8 + 6 * Math.abs(p.vx) / PLAYER.RUN);
        if (Math.random() < dt * 2.4) Fx.dust(p.x - p.facing * 4, p.y + p.h / 2, 1);
      }
    }

    /* ================= integrate ================= */
    const wasFeet = p.y + p.h / 2;
    if (p.carrier) { Physics.moveX(p, p.carrierDx, world); }
    Physics.moveX(p, p.vx * dt, world);
    const hitV = Physics.moveY(p, p.vy * dt, world);
    if (hitV === "floor") {
      if (!p.wasGrounded && p.vy > 140) {          // landing
        Fx.dust(p.x, p.y + p.h / 2, Math.min(10, 3 + p.vy / 60));
        p.sx = 1.3; p.sy = 0.72;
        Sfx.land();
        if (p.vy > 270) Fx.addShake(2);            // big fall lands with weight
      }
      p.vy = 0; p.grounded = true;
    } else if (hitV === "ceil") {
      p.vy = Math.max(p.vy, 0);
    } else {
      p.grounded = false;
    }
    if (Physics.snapToSlope(p, world)) p.grounded = true;
    if (!p.grounded && !p.climbing) p.grounded = Physics.groundedOn(p, world);

    // splash on entering / leaving water
    if (p.inWater && !p.wasInWater && p.vy > 40) { Sfx.splashIn(); Fx.splash(p.x, Math.floor(p.y / TS) * TS); }
    // dolphin breach — swimming up out of water launches you clear of the
    // surface (~2 tiles), so ledge climb-outs (waterfall tops!) actually work
    if (!p.inWater && p.wasInWater && !p.climbing && p.vy < -30) {
      p.vy = -240;
      p.sx = 0.78; p.sy = 1.28;
      Sfx.breach();
      Fx.splash(p.x, p.y + p.h / 2, "rgba(200,240,255,0.9)", 12);
    }
    p.wasInWater = p.inWater;
    p.wasGrounded = p.grounded;

    // squash & stretch recovery
    p.sx += (1 - p.sx) * Math.min(1, dt * 12);
    p.sy += (1 - p.sy) * Math.min(1, dt * 12);

    // idle timer feeds the look-around animation in the renderer
    if (p.grounded && !p.climbing && Math.abs(p.vx) < 5 && !(input.left || input.right)) p.idleT += dt;
    else p.idleT = 0;
  },
};
