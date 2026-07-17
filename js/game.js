// The Deep Jungle engine — tile world, camera, entities, combat, secrets and
// the procedural pixel-art renderer. Physics is in js/physics.js, the player
// controller in js/player.js, bosses in js/bosses.js. All content comes from
// the data registries (tiles/enemies/equipment/levels) — the engine reads
// properties, never level-specific branches.

const VIEW_ROWS = 13;      // guaranteed visible rows
const VIEW_COLS = 14;      // guaranteed visible cols

const Game = {
  canvas: null, ctx: null, DPR: 1, scale: 2, viewW: 0, viewH: 0,
  viewLW: VIEW_COLS * 16, viewLH: VIEW_ROWS * 16,
  active: false, running: false, paused: false,
  input: { left: 0, right: 0, up: 0, down: 0, jumpHeld: false, jumpPressed: false },

  /* ================= boot / canvas ================= */
  boot() {
    this.canvas = document.getElementById("cv");
    this.ctx = this.canvas.getContext("2d");
    this.resize();
    const re = () => this.resize();
    window.addEventListener("resize", re);
    window.addEventListener("orientationchange", () => setTimeout(re, 350));
    if (window.visualViewport) window.visualViewport.addEventListener("resize", re);
    document.addEventListener("visibilitychange", () => { if (document.hidden && this.running) this.pause(); });
    this.bindInput();
    this._last = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  },

  resize() {
    const wrap = this.canvas.parentElement;
    const w = wrap.clientWidth, h = wrap.clientHeight;
    if (!w || !h) { setTimeout(() => this.resize(), 200); return; }
    this.DPR = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.style.width = w + "px"; this.canvas.style.height = h + "px";
    this.canvas.width = Math.round(w * this.DPR);
    this.canvas.height = Math.round(h * this.DPR);
    this.viewW = w; this.viewH = h;
    const s = Math.min(h / (VIEW_ROWS * TS), w / (VIEW_COLS * TS));
    this.scale = Math.max(1, Math.floor(s * 4) / 4);
    this.viewLW = w / this.scale;              // view size in logical px
    this.viewLH = h / this.scale;
    this._darkCv = null;                       // rebuild darkness buffer
  },

  /* ================= input ================= */
  bindInput() {
    const I = this.input;
    const keymap = (code) => ({
      ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right",
      ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down",
    })[code];
    window.addEventListener("keydown", (e) => {
      if (!this.active) return;
      if (e.code === "Escape" || e.code === "KeyP") { e.preventDefault(); this.togglePause(); return; }
      const k = keymap(e.code);
      if (k) { e.preventDefault(); I[k] = 1; }
      if (e.code === "Space" || e.code === "KeyZ") {
        e.preventDefault();
        if (!I.jumpHeld) I.jumpPressed = true;
        I.jumpHeld = true;
      }
      if (e.code === "KeyX" || e.code === "KeyK") { e.preventDefault(); this.trySlash(); }
      if (e.code === "KeyC" || e.code === "KeyL") { e.preventDefault(); this.tryBoomerang(); }
    });
    window.addEventListener("keyup", (e) => {
      const k = keymap(e.code);
      if (k) I[k] = 0;
      if (e.code === "Space" || e.code === "KeyZ") I.jumpHeld = false;
    });

    // touch buttons (DOM) — pointer events, multi-touch safe
    const bindBtn = (id, down, up) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("pointerdown", (e) => { e.preventDefault(); GK.Sfx.init(); down(); el.classList.add("held"); });
      const end = (e) => { e.preventDefault(); up && up(); el.classList.remove("held"); };
      el.addEventListener("pointerup", end);
      el.addEventListener("pointercancel", end);
      el.addEventListener("pointerleave", end);
      el.addEventListener("contextmenu", (e) => e.preventDefault());
    };
    bindBtn("tc-left",  () => { I.left = 1; },  () => { I.left = 0; });
    bindBtn("tc-right", () => { I.right = 1; }, () => { I.right = 0; });
    bindBtn("tc-up",    () => { I.up = 1; },    () => { I.up = 0; });
    bindBtn("tc-down",  () => { I.down = 1; },  () => { I.down = 0; });
    bindBtn("tc-jump",  () => { if (!I.jumpHeld) I.jumpPressed = true; I.jumpHeld = true; }, () => { I.jumpHeld = false; });
    bindBtn("tc-slash", () => this.trySlash());
    bindBtn("tc-rang",  () => this.tryBoomerang());
    document.addEventListener("gesturestart", (e) => e.preventDefault());
    document.addEventListener("gesturechange", (e) => e.preventDefault());
  },

  /* ================= level lifecycle ================= */
  start(profile, levelIdx) {
    this.profile = profile;
    this.progress = Storage.getProgress(profile.id);
    this.levelIdx = levelIdx;
    this.level = LEVELS[levelIdx];
    this.theme = WORLDS[this.level.world].theme;
    Fx.reset(); Tween.clear();
    this.loadLevel(this.level);

    this.score = 0; this.elapsed = 0; this.deaths = 0;
    this.keys = 0;
    this.treasure = 0;
    this.secretsFound = 0;
    this.toolsFound = [];
    this.journalFound = false;
    this.boomerang = null;
    this.projectiles = [];
    this.winT = 0; this.won = false;
    this.toastT = 0;

    this.player = makePlayer(this.spawn.x, this.spawn.y);
    this.checkpoint = { x: this.spawn.x, y: this.spawn.y };
    this.litCheckpoints = new Set();
    this.cam = { x: this.player.x, y: this.player.y };
    this.snapCamera();

    this.boss = this.level.boss ? Bosses.create(this.level.boss, this) : null;
    this.bossPortal = null;

    this.running = true; this.paused = false;
    this.updateHud();
    GK.UI.showScreen("game");
    this.resize();          // the stage only has a size once the screen is visible
    this.snapCamera();
    Music.start(this.level.world, !!this.level.boss);
    document.getElementById("tc-rang").style.display = this.hasTool("boomerang") ? "" : "none";
    document.getElementById("tc-slash").style.display = this.hasTool("machete") ? "" : "none";
  },

  loadLevel(lv) {
    const rows = lv.rows;
    this.cols = Math.max(...rows.map((r) => r.length));
    this.rows = rows.length;
    this.grid = rows.map((r) => r.padEnd(this.cols, ".").split(""));
    this.items = []; this.enemies = []; this.movers = [];
    this.discovered = new Set();       // revealed false-wall groups (cell keys)
    this.crumble = new Map();          // "c,r" -> { t, gone, respawn }
    this.toggleState = false;
    this.treasureTotal = 0;
    this.secretsTotal = 0;
    this.spawn = { x: 2 * TS, y: 2 * TS };
    this.lavaY = lv.risingLava ? (this.rows + 2) * TS : null;
    this.lavaGrace = 3;

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const ch = this.grid[r][c];
        const ent = ENTITY_CHARS[ch];
        if (!ent) continue;
        // vacated cell becomes water if any neighbour is water (pools stay whole)
        const nearWater = [[1,0],[-1,0],[0,1],[0,-1]].some(([dc, dr]) => {
          const n = (this.grid[r + dr] || [])[c + dc];
          return n === "~";
        });
        this.grid[r][c] = nearWater ? "~" : ".";
        const x = c * TS + TS / 2, y = r * TS + TS / 2;
        if (ent.type === "player") {
          this.spawn = { x, y: (r + 1) * TS - PLAYER.H / 2 - 0.1 };
        } else if (ent.type === "item") {
          const def = ITEMS[ent.id];
          this.items.push({ kind: "item", id: ent.id, def, x, y, w: 10, h: 10,
            bob: Math.random() * 6.28, taken: false });
          if (def.score > 0) this.treasureTotal++;
          if (def.secret) this.secretsTotal++;
        } else if (ent.type === "tool") {
          this.items.push({ kind: "tool", id: ent.id, x, y, w: 12, h: 12,
            bob: Math.random() * 6.28, taken: false });
        } else if (ent.type === "enemy") {
          const def = ENEMIES[ent.id];
          this.enemies.push({ kind: "enemy", id: ent.id, def,
            x, y: (r + 1) * TS - def.h / 2 - 0.1, w: def.w, h: def.h,
            vx: 0, vy: 0, dir: Math.random() < 0.5 ? -1 : 1, hp: def.hp,
            t: Math.random() * 2, projT: 1 + Math.random(), homeX: x, homeY: y,
            dead: false, deadT: 0, flash: 0 });
        } else if (ent.type === "mover") {
          this.movers.push({ kind: "mover", axis: ent.axis, x, y,
            w: ent.axis === "x" ? 44 : 40, h: 8, dir: 1, speed: ent.axis === "x" ? 38 : 30,
            dx: 0, dy: 0 });
        }
      }
    }

    // light sources for dark levels (exits and torches glow)
    this._exitTiles = []; this._torchTiles = [];
    for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) {
      if (this.grid[r][c] === "X") this._exitTiles.push([c, r]);
      if (this.grid[r][c] === "C") this._torchTiles.push([c, r]);
    }

    // false walls mimic their neighbours: ground look vs stone look
    this.falseLook = new Map();
    for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) {
      if (this.grid[r][c] !== "%") continue;
      const near = [[1,0],[-1,0],[0,1],[0,-1]].map(([dc, dr]) => (this.grid[r + dr] || [])[c + dc]);
      this.falseLook.set(c + "," + r, near.includes("#") ? "#" : "=");
    }

    this.buildParallax();
  },

  /* ================= world interface (physics queries) ================= */
  tileAt(c, r) {
    if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) return null;
    return TILES[this.grid[r][c]] || null;
  },
  isSolid(c, r) {
    if (c < 0 || c >= this.cols) return true;      // level edges are walls
    if (r < 0) return false;                        // open sky
    if (r >= this.rows) return true;
    const ch = this.grid[r][c];
    const t = TILES[ch];
    if (!t) return false;
    if (t.toggle) return t.toggle === "on" ? !this.toggleState : this.toggleState;
    if (t.crumble) { const st = this.crumble.get(c + "," + r); return !(st && st.gone); }
    return !!t.solid;
  },
  isOneway(c, r) {
    const t = this.tileAt(c, r);
    return !!(t && t.oneway);
  },
  slopeAt(c, r) {
    const t = this.tileAt(c, r);
    return (t && t.slope) || 0;
  },
  hasTool(id) {
    return this.toolsFound.includes(id) || Storage.hasTool(this.progress, id);
  },
  onewayBelow(p) {
    const r = Math.floor((p.y + p.h / 2 + 3) / TS);
    const [c0, c1] = Physics.tileRange(p.x - p.w / 2, p.x + p.w / 2, this.cols);
    for (let c = c0; c <= c1; c++) if (this.isOneway(c, r)) return true;
    return false;
  },

  /* ================= main loop ================= */
  loop(t) {
    requestAnimationFrame((tt) => this.loop(tt));
    let dt = Math.min(0.033, (t - this._last) / 1000 || 0);
    this._last = t;
    if (!this.active || !this.running || this.paused) { this.input.jumpPressed = false; return; }
    this.elapsed += dt;
    Fx.update(dt);
    Tween.update(dt);
    this.update(dt * Fx.timeScale);
    this.input.jumpPressed = false;
    this.render();
  },

  update(dt) {
    const p = this.player;

    if (this.won) {
      this.winT += dt;
      if (this.winT > 1.4) { this.running = false; App.levelDone(this.result(true)); }
      return;
    }

    // movers first so the player can ride them
    for (const m of this.movers) {
      const ox = m.x, oy = m.y;
      if (m.axis === "x") { if (Physics.moveX(m, m.dir * m.speed * dt, this)) m.dir *= -1; }
      else { if (Physics.moveY(m, m.dir * m.speed * dt, this)) m.dir *= -1; }
      if (m.axis === "y" && (m.y < TS || m.y > this.rows * TS - TS)) m.dir *= -1;
      m.dx = m.x - ox; m.dy = m.y - oy;
    }
    // riding check
    p.carrier = null; p.carrierDx = 0;
    if (!p.dead) for (const m of this.movers) {
      const top = m.y - m.h / 2;
      if (p.vy >= -1 && Math.abs(p.y + p.h / 2 - top) < 5 &&
          Math.abs(p.x - m.x) < (p.w + m.w) / 2) {
        p.carrier = m; p.carrierDx = m.dx;
        p.y = top - p.h / 2; p.vy = Math.min(p.vy, 0); p.grounded = true;
        if (m.dy) p.y += m.dy;
      }
    }

    PlayerCtl.update(p, dt, this.input, this);
    if (p.dead) {
      if (p.deadT > 1.1) this.respawn();
    } else {
      this.tileInteractions(dt);
      this.collectItems();
    }

    this.updateEnemies(dt);
    this.updateProjectiles(dt);
    this.updateBoomerang(dt);
    this.updateCrumble(dt);
    if (this.boss && !this.boss.dead) this.boss.update(dt);
    if (this.boss && this.boss.dead && !this.bossPortal) this.spawnBossPortal();
    if (this.bossPortal && !p.dead && Physics.overlaps(p, this.bossPortal)) this.winLevel();

    // rising lava
    if (this.lavaY !== null) {
      this.lavaGrace -= dt;
      if (this.lavaGrace <= 0) this.lavaY -= 6.2 * dt;
      if (!p.dead && p.y + p.h / 2 > this.lavaY + 2) {
        Fx.burst(p.x, this.lavaY, "#ff9f43", 14, 150);
        this.hurtPlayer(2, p.x, true);
      }
      if (Math.random() < dt * 2) Sfx.lavaBubble();
    }

    // fell out of the world
    if (!p.dead && p.y - p.h > this.rows * TS + 40) this.hurtPlayer(1, p.x, true);

    this.updateCamera(dt);
    this.updateAmbient(dt);
  },

  /* ================= tiles the player touches ================= */
  tileInteractions(dt) {
    const p = this.player;
    const [c0, c1] = Physics.tileRange(p.x - p.w / 2, p.x + p.w / 2, this.cols);
    const [r0, r1] = Physics.tileRange(p.y - p.h / 2, p.y + p.h / 2, this.rows);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      const ch = this.grid[r][c];
      const t = TILES[ch];
      if (!t) continue;
      if (t.spikes) { this.hurtPlayer(1, p.x, false, true); }
      else if (t.lava) { Fx.burst(p.x, p.y, "#ff9f43", 12, 140); this.hurtPlayer(2, p.x, true); }
      else if (t.exit) { this.winLevel(); return; }
      else if (t.checkpoint) {
        const key = c + "," + r;
        if (!this.litCheckpoints.has(key)) {
          this.litCheckpoints.add(key);
          this.checkpoint = { x: c * TS + TS / 2, y: (r + 1) * TS - p.h / 2 - 0.1 };
          Sfx.checkpoint(); Fx.sparkle(c * TS + 8, r * TS + 4, "#ffd97a", 10);
          this.toast("🔥 Checkpoint!");
        }
      }
      else if (t.falseWall) {
        const key = c + "," + r;
        if (!this.discovered.has(key)) {
          this.revealFalseWalls(c, r);
          Sfx.secret(); Fx.addFlash(0.2, "#fff7c0");
          this.toast("✨ You found a secret passage!");
        }
      }
    }
    // doors are solid, so the body never overlaps them — check within reach
    const [dc0, dc1] = Physics.tileRange(p.x - p.w / 2 - 4, p.x + p.w / 2 + 4, this.cols);
    for (let r = r0; r <= r1; r++) for (let c = dc0; c <= dc1; c++) {
      const t = TILES[this.grid[r][c]];
      if (t && t.door) {
        if (this.keys > 0) {
          this.keys--;
          this.openDoor(c, r);
          Sfx.door(); Fx.addShake(2);
          this.toast("🔓 The door rumbles open!");
          this.updateHud();
        } else if (!this._doorHintT || this.elapsed - this._doorHintT > 3) {
          this._doorHintT = this.elapsed;
          this.toast("🔒 You need a key!");
        }
      }
    }
    // crumbling under the feet
    if (p.grounded) {
      const rBelow = Math.floor((p.y + p.h / 2 + 3) / TS);
      for (let c = c0; c <= c1; c++) {
        const t = this.tileAt(c, rBelow);
        if (t && t.crumble) this.startCrumble(c, rBelow);
      }
    }
  },

  revealFalseWalls(c, r) {
    const q = [[c, r]];
    while (q.length) {
      const [x, y] = q.pop();
      const key = x + "," + y;
      if (this.discovered.has(key)) continue;
      if ((this.grid[y] || [])[x] !== "%") continue;
      this.discovered.add(key);
      [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx, dy]) => q.push([x + dx, y + dy]));
    }
  },

  openDoor(c, r) {
    const q = [[c, r]];
    while (q.length) {
      const [x, y] = q.pop();
      if ((this.grid[y] || [])[x] !== "D") continue;
      this.grid[y][x] = ".";
      Fx.burst(x * TS + 8, y * TS + 8, "#c9a86a", 8, 90);
      [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx, dy]) => q.push([x + dx, y + dy]));
    }
  },

  startCrumble(c, r) {
    const key = c + "," + r;
    if (this.crumble.has(key)) return;
    this.crumble.set(key, { t: 0.45, gone: false, respawn: 0 });
    Sfx.crumbleWarn();
  },

  updateCrumble(dt) {
    for (const [key, st] of this.crumble) {
      if (!st.gone) {
        st.t -= dt;
        if (st.t <= 0) {
          st.gone = true; st.respawn = 3.5;
          const [c, r] = key.split(",").map(Number);
          Fx.burst(c * TS + 8, r * TS + 8, this.theme.stone, 8, 80);
        }
      } else {
        st.respawn -= dt;
        if (st.respawn <= 0) this.crumble.delete(key);
      }
    }
  },

  /* ================= items ================= */
  collectItems() {
    const p = this.player;
    for (const it of this.items) {
      if (it.taken || !Physics.overlaps(p, it)) continue;
      it.taken = true;
      if (it.kind === "tool") { this.pickupTool(it); continue; }
      const def = it.def;
      if (def.kind === "key") { this.keys++; Sfx.key(); Fx.sparkle(it.x, it.y, "#ffd97a"); this.toast("🗝️ Got a key!"); }
      else if (def.kind === "heart") {
        if (p.hearts < p.maxHearts) { p.hearts++; Sfx.heart(); Fx.text(it.x, it.y, "+♥", { color: "#ff6b81", size: 12 }); }
        else { Sfx.heart(); Fx.text(it.x, it.y, "♥ full!", { color: "#ff9fb0", size: 9 }); }
      }
      else if (def.kind === "idol") {
        this.secretsFound++; this.addScore(def.score, it.x, it.y, "#ffcf3e");
        Sfx.idolFanfare(); Fx.addFlash(0.3, "#ffe9a0"); Fx.burst(it.x, it.y, "#ffcf3e", 22, 170);
        this.toast("🗿 A GOLDEN IDOL! Amazing find!");
      }
      else if (def.kind === "journal") {
        this.secretsFound++; this.journalFound = true;
        this.addScore(def.score, it.x, it.y, "#e8dcc0");
        Sfx.journalPage();
        App.showJournal(this.levelIdx);
      }
      else {
        this._gemStep = (this._gemStep || 0) + 1;
        if (def.kind === "coin") Sfx.gem(this._gemStep % 8);
        else if (def.kind === "relic") { Sfx.bigTreasure(); Fx.burst(it.x, it.y, def.color, 16, 150); }
        else Sfx.gem(4 + (this._gemStep % 6));
        this.addScore(def.score, it.x, it.y, def.color);
      }
      if (def && def.score > 0) { this.treasure++; }
      Fx.sparkle(it.x, it.y, def ? def.color : "#fff");
      this.updateHud();
    }
  },

  pickupTool(it) {
    const eq = EQUIP_BY_ID[it.id];
    this.toolsFound.push(it.id);
    Sfx.toolGet();
    Fx.addFlash(0.35, "#fff"); Fx.burst(it.x, it.y, "#7ef0c0", 24, 180);
    App.toolFound(it.id);
    document.getElementById("tc-rang").style.display = this.hasTool("boomerang") ? "" : "none";
    document.getElementById("tc-slash").style.display = this.hasTool("machete") ? "" : "none";
    this.updateHud();
  },

  addScore(n, x, y, color) {
    this.score += n;
    if (x !== undefined) Fx.text(x, y - 6, "+" + n, { color: color || "#fff", size: 9 });
    this.updateHud();
  },

  /* ================= combat ================= */
  trySlash() {
    if (!this.running || this.paused || this.player.dead || !this.hasTool("machete")) return;
    const p = this.player;
    if (p.slashT > 0.1) return;
    p.slashT = 0.24;
    Sfx.slash();
    const box = { x: p.x + p.facing * 13, y: p.y, w: 20, h: 18 };
    this.hitWithWeapon(box, "machete");
  },

  tryBoomerang() {
    if (!this.running || this.paused || this.player.dead || !this.hasTool("boomerang")) return;
    if (this.boomerang) return;
    const p = this.player;
    Sfx.throwRang();
    this.boomerang = { x: p.x, y: p.y - 2, w: 10, h: 10, dir: p.facing,
      vx: p.facing * 240, t: 0, returning: false, spin: 0, hits: new Set() };
  },

  updateBoomerang(dt) {
    const b = this.boomerang;
    if (!b) return;
    const p = this.player;
    b.t += dt; b.spin += dt * 20;
    if (!b.returning) {
      b.x += b.vx * dt;
      b.vx -= b.dir * 420 * dt;
      if (Math.sign(b.vx) !== b.dir || Math.abs(b.x - p.x) > TS * 7) b.returning = true;
      // hitting a solid wall turns it around
      const c = Math.floor((b.x + b.dir * 5) / TS), r = Math.floor(b.y / TS);
      if (this.isSolid(c, r) && !this.hitTiles({ x: b.x + b.dir * 5, y: b.y, w: 8, h: 8 }, "boomerang")) {
        b.returning = true;
      }
    } else {
      const dx = p.x - b.x, dy = p.y - b.y;
      const d = Math.hypot(dx, dy) || 1;
      b.x += (dx / d) * 300 * dt; b.y += (dy / d) * 300 * dt;
      if (d < 12) { this.boomerang = null; Sfx.catchRang(); return; }
    }
    if (Math.random() < dt * 8) Sfx.rangSpin();
    this.hitWithWeapon(b, "boomerang", b.hits);
  },

  // Apply a weapon rect to enemies, boss and interactive tiles.
  hitWithWeapon(box, type, dedupe) {
    for (const e of this.enemies) {
      if (e.dead || (dedupe && dedupe.has(e))) continue;
      if (!Physics.overlaps(box, e)) continue;
      if (dedupe) dedupe.add(e);
      this.damageEnemy(e, type);
    }
    if (this.boss && !this.boss.dead && this.boss.hitBy) this.boss.hitBy(type, box);
    this.hitTiles(box, type);
  },

  // Returns true if an interactive tile consumed the hit.
  hitTiles(box, type) {
    let used = false;
    const [c0, c1] = Physics.tileRange(box.x - box.w / 2, box.x + box.w / 2, this.cols);
    const [r0, r1] = Physics.tileRange(box.y - box.h / 2, box.y + box.h / 2, this.rows);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      const ch = this.grid[r][c];
      const t = TILES[ch];
      if (!t) continue;
      if (t.switch) {
        if (!this._switchCd || this.elapsed - this._switchCd > 0.4) {
          this._switchCd = this.elapsed;
          this.toggleState = !this.toggleState;
          Sfx.switchOn(); Fx.addFlash(0.15, "#9be8ff"); Fx.addShake(2);
          Fx.burst(c * TS + 8, r * TS + 8, "#9be8ff", 10, 110);
          this.toast("🔁 Something moved…");
        }
        used = true;
      } else if (t.breakable) {
        this.grid[r][c] = ".";
        Sfx.breakBlock(); Fx.burst(c * TS + 8, r * TS + 8, this.theme.stone, 10, 110); Fx.addShake(1.5);
        used = true;
      } else if (t.cut && (type === "machete" || type === "explosion")) {
        this.cutVines(c, r);
        used = true;
      } else if (t.barrel) {
        this.explode(c * TS + 8, r * TS + 8);
        this.grid[r][c] = ".";
        used = true;
      }
    }
    return used;
  },

  cutVines(c, r) {
    Sfx.cutVine();
    const q = [[c, r]];
    while (q.length) {
      const [x, y] = q.pop();
      if ((this.grid[y] || [])[x] !== "V") continue;
      this.grid[y][x] = ".";
      Fx.burst(x * TS + 8, y * TS + 8, "#3fa34d", 8, 90);
      [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx, dy]) => q.push([x + dx, y + dy]));
    }
  },

  explode(x, y) {
    Sfx.explosion(); Fx.addShake(6); Fx.addFlash(0.35, "#ffd58a");
    Fx.burst(x, y, "#ff9f43", 26, 220, 0.7, 3);
    Fx.burst(x, y, "#5c554e", 14, 160);
    const R = 2.6 * TS;
    // chain to nearby breakables / vines / barrels
    const c0 = Math.floor((x - R) / TS), c1 = Math.floor((x + R) / TS);
    const r0 = Math.floor((y - R) / TS), r1 = Math.floor((y + R) / TS);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      const ch = (this.grid[r] || [])[c];
      if (!ch) continue;
      const t = TILES[ch];
      if (!t) continue;
      const d = Math.hypot(c * TS + 8 - x, r * TS + 8 - y);
      if (d > R) continue;
      if (t.breakable || t.cut) { this.grid[r][c] = "."; Fx.burst(c * TS + 8, r * TS + 8, this.theme.stone, 6, 90); }
      else if (t.barrel) { this.grid[r][c] = "."; setTimeout(() => this.explode(c * TS + 8, r * TS + 8), 120); }
    }
    for (const e of this.enemies) {
      if (!e.dead && Math.hypot(e.x - x, e.y - y) < R + TS) this.damageEnemy(e, "explosion", 3);
    }
    if (this.boss && !this.boss.dead && this.boss.hitBy) {
      this.boss.hitBy("explosion", { x, y, w: R * 2, h: R * 2 });
    }
    const p = this.player;
    if (!p.dead && Math.hypot(p.x - x, p.y - y) < R) this.hurtPlayer(1, x);
  },

  damageEnemy(e, type, amount = 1) {
    e.hp -= amount;
    e.flash = 0.15;
    if (e.hp <= 0) this.killEnemy(e);
    else { Sfx.bossClang(); Fx.burst(e.x, e.y, e.def.accent, 6, 90); }
  },

  killEnemy(e) {
    e.dead = true; e.deadT = 0;
    Sfx.enemyDown();
    Fx.burst(e.x, e.y, e.def.body, 14, 140);
    Fx.burst(e.x, e.y, e.def.accent, 8, 100);
    this.addScore(e.def.score, e.x, e.y - 6, "#fff");
  },

  /* ================= enemies ================= */
  updateEnemies(dt) {
    const p = this.player;
    const camL = this.cam.x - this.viewLW / 2 - TS * 6, camR = this.cam.x + this.viewLW / 2 + TS * 6;
    for (const e of this.enemies) {
      if (e.dead) { e.deadT += dt; continue; }
      if (e.x < camL || e.x > camR) continue;      // sleep off-screen
      e.t += dt; e.flash = Math.max(0, e.flash - dt);
      const d = e.def;
      switch (d.behavior) {
        case "patrol": {
          e.vy = Math.min(e.vy + 900 * dt, 300);
          const g = Physics.groundedOn(e, this);
          if (g) {
            e.vy = 0;
            if (d.turnAtLedge && Physics.ledgeAhead(e, e.dir, this)) e.dir *= -1;
          }
          if (Physics.moveX(e, e.dir * d.speed * dt, this)) e.dir *= -1;
          Physics.moveY(e, e.vy * dt, this);
          if (d.walks === false) e.vx = 0;
          break;
        }
        case "hop": {
          e.vy = Math.min(e.vy + 900 * dt, 340);
          const g = Physics.groundedOn(e, this);
          if (g && e.vy >= 0) {
            e.vy = 0; e.vx = 0;
            e.hopT = (e.hopT || d.hopEvery * Math.random()) - dt;
            if (e.hopT <= 0) {
              e.hopT = d.hopEvery;
              e.dir = Math.abs(p.x - e.x) < TS * 8 ? Math.sign(p.x - e.x) || e.dir : (Math.random() < 0.5 ? -1 : 1);
              e.vy = d.hopVy; e.vx = e.dir * d.speed;
              if (d.fiery) Fx.burst(e.x, e.y + e.h / 2, "#ff9f43", 5, 70);
            }
          }
          if (Physics.moveX(e, e.vx * dt, this)) e.dir *= -1;
          if (Physics.moveY(e, e.vy * dt, this) === "floor") e.vy = 0;
          break;
        }
        case "fly": {
          e.x += e.dir * d.speed * dt;
          e.y = e.homeY + Math.sin(e.t * d.freq) * d.amp;
          const c = Math.floor((e.x + e.dir * e.w / 2) / TS);
          if (this.isSolid(c, Math.floor(e.y / TS)) || e.x < e.w || e.x > this.cols * TS - e.w) e.dir *= -1;
          if (Math.abs(e.x - e.homeX) > TS * 5) e.dir = Math.sign(e.homeX - e.x);
          break;
        }
        case "swim": {
          e.x += e.dir * d.speed * dt;
          e.y = e.homeY + Math.sin(e.t * 1.8) * 4;
          const c = Math.floor((e.x + e.dir * e.w / 2) / TS), r = Math.floor(e.y / TS);
          const ahead = this.grid[r] && this.grid[r][c];
          if (ahead !== "~" && !ITEMS[ahead]) e.dir *= -1;
          break;
        }
        case "thrower": {
          e.vy = Math.min(e.vy + 900 * dt, 300);
          if (Physics.groundedOn(e, this)) e.vy = 0;
          Physics.moveY(e, e.vy * dt, this);
          if (d.walks) {
            if (Physics.moveX(e, e.dir * d.speed * dt, this)) e.dir *= -1;
            if (Physics.ledgeAhead(e, e.dir, this)) e.dir *= -1;
          }
          const dist = Math.abs(p.x - e.x);
          if (dist < d.range && Math.abs(p.y - e.y) < TS * 5) {
            e.dir = Math.sign(p.x - e.x) || e.dir;
            e.projT -= dt;
            if (e.projT <= 0) {
              e.projT = d.cooldown;
              this.projectiles.push({ x: e.x, y: e.y - e.h / 4,
                vx: e.dir * d.projVx, vy: d.projVy, w: 7, h: 7,
                type: e.id === "monkey" ? "coconut" : "spear", grav: e.id === "monkey" ? 420 : 60, t: 0 });
              Sfx.tone({ freq: 340, type: "square", dur: 0.06, vol: 0.07 });
            }
          }
          break;
        }
      }

      // touch the player
      if (!p.dead && p.iframes <= 0 && Physics.overlaps(p, e)) {
        const stomping = p.vy > 50 && p.y + p.h / 2 < e.y - e.h * 0.05;
        if (stomping) {
          p.vy = -215; p.sx = 0.8; p.sy = 1.25;
          if (d.stomp) { Sfx.stomp(); this.killEnemy(e); }
          else { Sfx.bossClang(); Fx.sparkle(e.x, e.y - e.h / 2, "#cfd8dc", 4); }
        } else {
          this.hurtPlayer(1, e.x);
        }
      }
    }
  },

  updateProjectiles(dt) {
    const p = this.player;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      pr.t += dt;
      pr.vy += (pr.grav || 0) * dt;
      pr.x += pr.vx * dt; pr.y += pr.vy * dt;
      const c = Math.floor(pr.x / TS), r = Math.floor(pr.y / TS);
      if (pr.t > 6 || this.isSolid(c, r)) {
        Fx.burst(pr.x, pr.y, "#9a8a70", 5, 70);
        this.projectiles.splice(i, 1);
        continue;
      }
      if (!p.dead && p.iframes <= 0 && Physics.overlaps(p, pr)) {
        this.projectiles.splice(i, 1);
        this.hurtPlayer(1, pr.x);
      }
    }
  },

  /* ================= damage / death ================= */
  hurtPlayer(n, srcX, deadly = false, spikes = false) {
    const p = this.player;
    if (p.dead || (p.iframes > 0 && !deadly)) return;
    p.hearts -= n;
    p.iframes = 1.4;
    Sfx.hurt(); Fx.addShake(4); Fx.addFlash(0.22, "#ff6b6b");
    Fx.burst(p.x, p.y, "#ff6b81", 10, 130);
    if (spikes) Sfx.spikes();
    this.updateHud();
    if (p.hearts <= 0 || deadly) { this.killPlayer(); return; }
    p.vx = Math.sign(p.x - (srcX ?? p.x - 1)) * 130 || -130;
    p.vy = -150;
  },

  killPlayer() {
    const p = this.player;
    if (p.dead) return;
    p.dead = true; p.deadT = 0;
    this.deaths++;
    Fx.slowMo(0.35, 0.5);
    Fx.burst(p.x, p.y, "#f0d7b0", 18, 160);
  },

  respawn() {
    const p = this.player;
    p.dead = false; p.deadT = 0;
    p.hearts = p.maxHearts;
    p.x = this.checkpoint.x; p.y = this.checkpoint.y;
    p.vx = 0; p.vy = 0; p.iframes = 2;
    if (this.lavaY !== null) {
      this.lavaY = Math.max(this.lavaY, this.checkpoint.y + TS * 4);
      this.lavaGrace = 2.5;
    }
    this.snapCamera();
    this.toast("💫 Try again — you can do it!");
    this.updateHud();
  },

  /* ================= win ================= */
  winLevel() {
    if (this.won) return;
    this.won = true; this.winT = 0;
    Sfx.levelWin();
    const p = this.player;
    Fx.addFlash(0.3, "#fff"); Fx.burst(p.x, p.y, "#ffd23e", 26, 190);
    Fx.text(p.x, p.y - 20, "LEVEL COMPLETE!", { color: "#ffd23e", size: 13, life: 1.3 });
  },

  spawnBossPortal() {
    this.bossPortal = { x: this.cols * TS / 2, y: (this.rows - 3) * TS - 8, w: 20, h: 28 };
    Fx.burst(this.bossPortal.x, this.bossPortal.y, "#7ef0c0", 24, 160);
    this.toast("✨ The way forward opens!");
  },

  result(win) {
    const stars = !win ? 0
      : 1 + (this.treasureTotal && this.treasure / this.treasureTotal >= 0.85 ? 1 : 0)
          + (this.secretsTotal && this.secretsFound >= this.secretsTotal ? 1 : 0)
          + (this.level.boss ? (this.deaths === 0 ? 2 : 1) : 0); // bosses: no treasure — stars from a clean fight
    return {
      levelIdx: this.levelIdx, win,
      boss: !!this.level.boss,
      score: this.score, stars: Math.min(3, stars),
      treasure: this.treasure, treasureTotal: this.treasureTotal,
      secrets: this.secretsFound, secretsTotal: this.secretsTotal,
      toolsFound: this.toolsFound, journalFound: this.journalFound,
      deaths: this.deaths, time: Math.round(this.elapsed),
    };
  },

  /* ================= camera ================= */
  updateCamera(dt) {
    const p = this.player;
    const tx = p.x + p.facing * 26;
    const ty = p.y - 10;
    this.cam.x += (tx - this.cam.x) * Math.min(1, dt * 5.5);
    this.cam.y += (ty - this.cam.y) * Math.min(1, dt * 4);
    this.clampCamera();
  },
  snapCamera() {
    this.cam.x = this.player.x; this.cam.y = this.player.y - 10;
    this.clampCamera();
  },
  clampCamera() {
    const lw = this.cols * TS, lh = this.rows * TS;
    const hw = this.viewLW / 2, hh = this.viewLH / 2;
    this.cam.x = lw <= this.viewLW ? lw / 2 : Physics.clamp(this.cam.x, hw, lw - hw);
    this.cam.y = lh <= this.viewLH ? lh / 2 : Physics.clamp(this.cam.y, hh, lh - hh);
  },

  /* ================= pause / quit ================= */
  pause() {
    if (!this.running || this.paused || this.won) return;
    this.paused = true;
    GK.UI.openModal("modal-pause");
  },
  resume() { GK.UI.closeModal("modal-pause"); this.paused = false; this._last = performance.now(); Sfx.click(); },
  togglePause() { this.paused ? this.resume() : this.pause(); },
  quitToMap() {
    GK.UI.closeModal("modal-pause");
    this.running = false; this.paused = false;
    Music.stop();
    App.levelDone(this.result(false), true);
  },

  /* ================= HUD / toast ================= */
  updateHud() {
    const p = this.player;
    const el = (id) => document.getElementById(id);
    if (!p) return;
    el("hud-hearts").textContent = "♥".repeat(Math.max(0, p.hearts)) + "♡".repeat(Math.max(0, p.maxHearts - p.hearts));
    el("hud-score").textContent = this.score.toLocaleString();
    el("hud-gems").textContent = `💎 ${this.treasure}/${this.treasureTotal}`;
    el("hud-keys").textContent = this.keys ? "🗝️".repeat(Math.min(this.keys, 3)) : "";
    el("hud-level").textContent = this.level.boss ? "☠️ " + this.level.name : this.level.name;
    el("hud-tools").textContent = EQUIPMENT.filter((e) => this.hasTool(e.id)).map((e) => e.icon).join("");
  },

  toast(msg) { GK.UI.toast(msg); },
};
