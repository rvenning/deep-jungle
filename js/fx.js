// Juice layer — pooled particles, screen shake, floating text, flashes,
// slow-motion, tweens. Rendering happens in WORLD space (game.js translates
// the camera first), except flash/vignette which game.js draws itself.
// Adapted from Brick Breaker DX's fx.js.

const Fx = {
  parts: [],
  texts: [],
  shake: 0,
  flash: 0,
  flashColor: "#ffffff",
  timeScale: 1,
  slowT: 0,

  reset() {
    this.parts.length = 0; this.texts.length = 0;
    this.shake = 0; this.flash = 0; this.timeScale = 1; this.slowT = 0;
  },

  /* ---- emitters ---- */
  burst(x, y, color, n = 12, speed = 130, life = 0.5, size = 2.4) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = speed * (0.35 + Math.random() * 0.65);
      this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: life * (0.6 + Math.random() * 0.4), t: 0, color,
        size: size * (0.6 + Math.random() * 0.8), grav: 300, spark: Math.random() < 0.3 });
    }
    if (this.parts.length > 700) this.parts.splice(0, this.parts.length - 700);
  },

  dust(x, y, n = 6, color = "rgba(220,205,170,0.8)") {
    for (let i = 0; i < n; i++) {
      this.parts.push({ x: x + (Math.random() - 0.5) * 10, y,
        vx: (Math.random() - 0.5) * 46, vy: -18 - Math.random() * 26,
        life: 0.32 + Math.random() * 0.22, t: 0, color, size: 1.6 + Math.random() * 1.6,
        grav: -30, fadeOnly: false });
    }
  },

  sparkle(x, y, color = "#fff7c0", n = 5) {
    for (let i = 0; i < n; i++) {
      this.parts.push({ x: x + (Math.random() - 0.5) * 12, y: y + (Math.random() - 0.5) * 12,
        vx: 0, vy: -12, life: 0.5 + Math.random() * 0.3, t: 0, color,
        size: 1.4 + Math.random() * 1.2, grav: 0, spark: true });
    }
  },

  splash(x, y, color = "#9fdcf0", n = 10) {
    for (let i = 0; i < n; i++) {
      this.parts.push({ x: x + (Math.random() - 0.5) * 10, y,
        vx: (Math.random() - 0.5) * 110, vy: -60 - Math.random() * 90,
        life: 0.45 + Math.random() * 0.2, t: 0, color, size: 1.6 + Math.random() * 1.4, grav: 420 });
    }
  },

  text(x, y, str, { color = "#fff", size = 11, dy = -30, life = 0.9 } = {}) {
    this.texts.push({ x, y, str, color, size, dy, life, t: 0 });
    if (this.texts.length > 30) this.texts.shift();
  },

  addShake(amount) { this.shake = Math.min(10, this.shake + amount); },
  addFlash(alpha, color = "#ffffff") { this.flash = Math.max(this.flash, alpha); this.flashColor = color; },
  slowMo(scale = 0.3, dur = 0.5) { this.timeScale = scale; this.slowT = dur; },

  /* ---- frame ---- */
  update(dt) { // dt = REAL seconds
    if (this.slowT > 0) { this.slowT -= dt; if (this.slowT <= 0) this.timeScale = 1; }
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 22);
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 3.2);
    const sdt = dt * this.timeScale;
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.t += sdt;
      if (p.t >= p.life) { this.parts.splice(i, 1); continue; }
      p.x += p.vx * sdt; p.y += p.vy * sdt; p.vy += p.grav * sdt;
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.t += dt;
      if (t.t >= t.life) this.texts.splice(i, 1);
    }
  },

  render(ctx) {
    for (const p of this.parts) {
      const k = 1 - p.t / p.life;
      ctx.globalAlpha = k;
      ctx.fillStyle = p.color;
      const s = p.size;
      if (p.spark) ctx.fillRect(p.x - s / 2, p.y - s * 1.5, s * 0.7, s * 3);
      else ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (const t of this.texts) {
      const k = t.t / t.life;
      const pop = k < 0.15 ? k / 0.15 : 1;
      ctx.globalAlpha = k > 0.6 ? 1 - (k - 0.6) / 0.4 : 1;
      ctx.font = `800 ${Math.round(t.size * (0.6 + 0.4 * pop))}px 'Baloo 2',sans-serif`;
      ctx.fillStyle = t.color;
      ctx.fillText(t.str, t.x, t.y + t.dy * k);
    }
    ctx.globalAlpha = 1;
  },
};

// Minimal tween runner (ease-out cubic) for squash/stretch and UI nudges.
const Tween = {
  list: [],
  to(obj, props, dur, ease = (t) => 1 - Math.pow(1 - t, 3)) {
    const from = {};
    for (const k in props) from[k] = obj[k];
    this.list.push({ obj, from, to: props, dur, t: 0, ease });
  },
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const tw = this.list[i];
      tw.t += dt;
      const k = Math.min(1, tw.t / tw.dur), e = tw.ease(k);
      for (const key in tw.to) tw.obj[key] = tw.from[key] + (tw.to[key] - tw.from[key]) * e;
      if (k >= 1) this.list.splice(i, 1);
    }
  },
  clear() { this.list.length = 0; },
};
