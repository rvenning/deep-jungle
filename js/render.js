// The renderer — procedural pixel art for everything: parallax backdrops,
// themed tiles, items, enemies, the explorer, lighting and ambience. Extends
// Game (js/game.js). Draws in logical pixels; Game.resize() owns scaling.

Object.assign(Game, {

  /* ================= parallax + ambience setup ================= */
  buildParallax() {
    const u = GK.util;
    this.farHills = []; this.midShapes = [];
    const w = Math.max(this.cols * TS, 800);
    for (let x = 0; x < w * 0.5 + 400; x += 70) {
      this.farHills.push({ x, h: 40 + (u.hash2(1, x) % 50), w: 90 + (u.hash2(2, x) % 60) });
    }
    for (let x = 0; x < w * 0.7 + 400; x += 46) {
      this.midShapes.push({ x, h: 60 + (u.hash2(3, x) % 70), w: 26 + (u.hash2(4, x) % 22),
        tree: (u.hash2(5, x) % 10) < 6 });
    }
    this.ambientParts = [];
    this._ambT = 0;
  },

  updateAmbient(dt) {
    const kind = this.theme.ambient;
    const L = this.cam.x - this.viewLW / 2, T = this.cam.y - this.viewLH / 2;
    this._ambT += dt;
    const want = kind === "mist" ? 8 : 26;
    while (this.ambientParts.length < want) {
      const r = Math.random;
      this.ambientParts.push({
        x: L + r() * this.viewLW, y: T + r() * this.viewLH,
        ph: r() * 6.28, sp: 0.5 + r(), s: r(),
      });
    }
    for (const a of this.ambientParts) {
      a.ph += dt;
      switch (kind) {
        case "leaves":   a.y += (14 + a.sp * 12) * dt; a.x += Math.sin(a.ph * 2) * 18 * dt; break;
        case "mist":     a.x += (6 + a.sp * 6) * dt; break;
        case "dust":     a.y -= (2 + a.sp * 4) * dt; a.x += Math.sin(a.ph) * 6 * dt; break;
        case "embers":   a.y -= (18 + a.sp * 22) * dt; a.x += Math.sin(a.ph * 3) * 12 * dt; break;
        case "fireflies": a.x += Math.sin(a.ph * 1.3) * 16 * dt; a.y += Math.cos(a.ph * 0.9) * 12 * dt; break;
      }
      // wrap into view
      if (a.x < L - 20) a.x += this.viewLW + 40;
      if (a.x > L + this.viewLW + 20) a.x -= this.viewLW + 40;
      if (a.y < T - 20) a.y += this.viewLH + 40;
      if (a.y > T + this.viewLH + 20) a.y -= this.viewLH + 40;
    }
  },

  /* ================= frame ================= */
  render() {
    const ctx = this.ctx, th = this.theme;
    ctx.setTransform(this.DPR * this.scale, 0, 0, this.DPR * this.scale, 0, 0);
    ctx.imageSmoothingEnabled = false;
    const VW = this.viewLW, VH = this.viewLH;
    const camL = this.cam.x - VW / 2, camT = this.cam.y - VH / 2;
    const t = this.elapsed;

    /* ---- sky ---- */
    const sky = ctx.createLinearGradient(0, 0, 0, VH);
    sky.addColorStop(0, th.skyTop); sky.addColorStop(1, th.skyBot);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, VW, VH);

    if (!this.level.dark) {
      /* ---- far hills (parallax 0.25) ---- */
      ctx.fillStyle = th.far;
      const fOff = camL * 0.25, fBase = VH - (this.cam.y - this.rows * TS) * 0 - VH * 0.18;
      for (const h of this.farHills) {
        const x = h.x - fOff;
        if (x < -h.w || x > VW + h.w) continue;
        ctx.beginPath(); ctx.arc(x, VH * 0.86, h.h, Math.PI, 0); ctx.fill();
      }
      ctx.fillRect(0, VH * 0.86, VW, VH * 0.2);
      /* ---- mid layer (parallax 0.5): trees / rocks ---- */
      ctx.fillStyle = th.mid;
      const mOff = camL * 0.5;
      for (const s of this.midShapes) {
        const x = s.x - mOff;
        if (x < -60 || x > VW + 60) continue;
        if (s.tree) {
          ctx.fillRect(x - 2, VH - s.h * 0.7, 5, s.h * 0.7);
          ctx.beginPath(); ctx.arc(x, VH - s.h * 0.68, s.w * 0.55, 0, 6.29); ctx.fill();
        } else {
          ctx.fillRect(x - s.w / 2, VH - s.h * 0.5, s.w, s.h * 0.5);
        }
      }
    } else {
      // mine backdrop: faint strata
      ctx.fillStyle = "rgba(255,255,255,0.03)";
      for (let i = 0; i < 6; i++) ctx.fillRect(0, ((i * 53 - camT * 0.3) % VH + VH) % VH, VW, 2);
    }

    /* ---- world space ---- */
    ctx.save();
    const shX = (Math.random() - 0.5) * Fx.shake, shY = (Math.random() - 0.5) * Fx.shake;
    ctx.translate(Math.round(-camL + shX), Math.round(-camT + shY));

    // solid earth below the level bottom (visible in tall portrait views)
    if (camT + VH > this.rows * TS) {
      ctx.fillStyle = th.ground;
      ctx.fillRect(camL - 8, this.rows * TS, VW + 16, camT + VH - this.rows * TS + 8);
    }
    this.renderTiles(ctx, camL, camT, VW, VH, t);
    for (const m of this.movers) this.drawMover(ctx, m);
    for (const it of this.items) if (!it.taken) this.drawItem(ctx, it, t);
    for (const e of this.enemies) if (!e.dead || e.deadT < 0.1) this.drawEnemy(ctx, e, t);
    if (this.boss && this.boss.render) this.boss.render(ctx, t);
    if (this.bossPortal) this.drawPortal(ctx, this.bossPortal.x, this.bossPortal.y, t);
    for (const pr of this.projectiles) this.drawProjectile(ctx, pr);
    if (this.boomerang) this.drawBoomerang(ctx, this.boomerang);
    if (!this.player.dead || this.player.deadT < 0.4) this.drawPlayer(ctx, this.player, t);

    // rising lava plane
    if (this.lavaY !== null) {
      const ly = this.lavaY;
      const g = ctx.createLinearGradient(0, ly, 0, ly + 60);
      g.addColorStop(0, "#ffce54"); g.addColorStop(0.12, "#ff7043"); g.addColorStop(1, "#a8321e");
      ctx.fillStyle = g;
      ctx.fillRect(camL - 8, ly, VW + 16, this.rows * TS - ly + TS * 4);
      ctx.fillStyle = "rgba(255,240,180,0.9)";
      for (let x = Math.floor(camL / 12) * 12; x < camL + VW; x += 12) {
        ctx.fillRect(x, ly - 2 + Math.sin(x * 0.4 + t * 5) * 1.6, 7, 3);
      }
    }

    Fx.render(ctx);
    ctx.restore();

    /* ---- ambience (screen-ish space, drawn in world coords already offset) ---- */
    ctx.save();
    ctx.translate(-camL, -camT);
    this.renderAmbient(ctx, t);
    ctx.restore();

    /* ---- darkness ---- */
    if (this.level.dark) this.renderDarkness(ctx, camL, camT, VW, VH);

    /* ---- vignette + flash ---- */
    if (!this.level.dark) {
      const vg = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.55, VW / 2, VH / 2, VH * 1.05);
      vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(10,20,12,0.32)");
      ctx.fillStyle = vg; ctx.fillRect(0, 0, VW, VH);
    }
    if (Fx.flash > 0) {
      ctx.globalAlpha = Fx.flash; ctx.fillStyle = Fx.flashColor;
      ctx.fillRect(0, 0, VW, VH);
      ctx.globalAlpha = 1;
    }
  },

  // Darkness with soft light holes — half-res offscreen buffer, punched with
  // destination-out radial gradients, stretched over the view.
  renderDarkness(ctx, camL, camT, VW, VH) {
    const bw = Math.max(1, Math.round(VW / 2)), bh = Math.max(1, Math.round(VH / 2));
    if (!this._darkCv || this._darkCv.width !== bw || this._darkCv.height !== bh) {
      this._darkCv = document.createElement("canvas");
      this._darkCv.width = bw; this._darkCv.height = bh;
    }
    const d = this._darkCv.getContext("2d");
    d.globalCompositeOperation = "source-over";
    d.clearRect(0, 0, bw, bh);
    d.fillStyle = "rgba(4,7,14,0.94)";
    d.fillRect(0, 0, bw, bh);
    d.globalCompositeOperation = "destination-out";
    const hole = (wx, wy, r, strength = 1) => {
      const sx = (wx - camL) / 2, sy = (wy - camT) / 2, sr = Math.max(2, r / 2);
      const g = d.createRadialGradient(sx, sy, sr * 0.25, sx, sy, sr);
      g.addColorStop(0, `rgba(0,0,0,${strength})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      d.fillStyle = g;
      d.beginPath(); d.arc(sx, sy, sr, 0, 6.29); d.fill();
    };
    const p = this.player;
    hole(p.x, p.y, this.hasTool("lantern") ? TS * 9 : TS * 4.2, 1);
    for (const [c, r] of this._torchTiles) {
      hole(c * TS + 8, r * TS + 8, this.litCheckpoints.has(c + "," + r) ? TS * 3 : TS * 1.4, 0.85);
    }
    for (const [c, r] of this._exitTiles) hole(c * TS + 8, r * TS + 8, TS * 3, 0.9);
    if (this.bossPortal) hole(this.bossPortal.x, this.bossPortal.y, TS * 3.5, 0.9);
    ctx.drawImage(this._darkCv, 0, 0, bw, bh, 0, 0, VW, VH);
  },

  renderAmbient(ctx, t) {
    const kind = this.theme.ambient;
    for (const a of this.ambientParts) {
      switch (kind) {
        case "leaves":
          ctx.fillStyle = a.s < 0.5 ? "#4caf50" : "#8bc34a";
          ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(Math.sin(a.ph * 2));
          ctx.fillRect(-2, -1, 4, 2); ctx.restore();
          break;
        case "mist":
          ctx.fillStyle = "rgba(220,240,245,0.06)";
          ctx.beginPath(); ctx.arc(a.x, a.y, 26 + a.s * 22, 0, 6.29); ctx.fill();
          break;
        case "dust":
          ctx.fillStyle = "rgba(230,215,180,0.35)";
          ctx.fillRect(a.x, a.y, 1.5, 1.5);
          break;
        case "embers":
          ctx.fillStyle = a.s < 0.5 ? "#ff9f43" : "#ffd54f";
          ctx.globalAlpha = 0.5 + 0.5 * Math.sin(a.ph * 6);
          ctx.fillRect(a.x, a.y, 2, 2);
          ctx.globalAlpha = 1;
          break;
        case "fireflies": {
          const blink = 0.35 + 0.65 * Math.max(0, Math.sin(a.ph * 2.2));
          ctx.globalAlpha = blink * 0.9;
          ctx.fillStyle = "#fff59d";
          ctx.fillRect(a.x, a.y, 2, 2);
          ctx.globalAlpha = blink * 0.25;
          ctx.beginPath(); ctx.arc(a.x + 1, a.y + 1, 5, 0, 6.29); ctx.fill();
          ctx.globalAlpha = 1;
          break;
        }
      }
    }
  },

  /* ================= tiles ================= */
  renderTiles(ctx, camL, camT, VW, VH, t) {
    const c0 = Math.max(0, Math.floor(camL / TS) - 1);
    const c1 = Math.min(this.cols - 1, Math.ceil((camL + VW) / TS) + 1);
    const r0 = Math.max(0, Math.floor(camT / TS) - 1);
    const r1 = Math.min(this.rows - 1, Math.ceil((camT + VH) / TS) + 1);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      this.drawTile(ctx, this.grid[r][c], c, r, t);
    }
  },

  drawTile(ctx, ch, c, r, t) {
    const th = this.theme, u = GK.util;
    const x = c * TS, y = r * TS, h2 = u.hash2(c, r);
    switch (ch) {
      case "#": case "%": case "=": case "B": case "S": case "O":
      case "T": case "t": case "!": case "D": case "V": case "G": {
        if (ch === "%") {
          const discovered = this.discovered.has(c + "," + r);
          ctx.globalAlpha = discovered ? 0.35 : 1;
          this.drawSolidTile(ctx, this.falseLook.get(c + "," + r) || "=", x, y, c, r, h2, t);
          // lantern shimmer hint
          if (!discovered && this.hasTool("lantern") && Math.sin(t * 2 + c * 3 + r) > 0.92) {
            ctx.fillStyle = "rgba(255,247,192,0.5)";
            ctx.fillRect(x + (h2 % 12), y + ((h2 >> 2) % 12), 2, 2);
          }
          ctx.globalAlpha = 1;
        } else this.drawSolidTile(ctx, ch, x, y, c, r, h2, t);
        break;
      }
      case "-": {
        ctx.fillStyle = "#8a5a33";
        ctx.fillRect(x, y, TS, 5);
        ctx.fillStyle = "#a8703f";
        ctx.fillRect(x, y, TS, 2);
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.fillRect(x + 3, y, 1, 5); ctx.fillRect(x + 11, y, 1, 5);
        break;
      }
      case "/": case "\\": {
        ctx.fillStyle = th.ground;
        ctx.beginPath();
        if (ch === "/") { ctx.moveTo(x, y + TS); ctx.lineTo(x + TS, y); ctx.lineTo(x + TS, y + TS); }
        else { ctx.moveTo(x, y); ctx.lineTo(x + TS, y + TS); ctx.lineTo(x, y + TS); }
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = th.groundTop; ctx.lineWidth = 3;
        ctx.beginPath();
        if (ch === "/") { ctx.moveTo(x, y + TS); ctx.lineTo(x + TS, y); }
        else { ctx.moveTo(x, y); ctx.lineTo(x + TS, y + TS); }
        ctx.stroke();
        break;
      }
      case "H": {
        ctx.fillStyle = "#8a5a33";
        ctx.fillRect(x + 3, y, 2, TS); ctx.fillRect(x + 11, y, 2, TS);
        ctx.fillStyle = "#a8703f";
        ctx.fillRect(x + 3, y + 3, 10, 2); ctx.fillRect(x + 3, y + 11, 10, 2);
        break;
      }
      case "|": {
        const sway = Math.sin(t * 1.6 + r * 0.7 + c) * 1.5;
        ctx.fillStyle = "#2e7d43";
        ctx.fillRect(x + 7 + sway, y, 2, TS);
        ctx.fillStyle = "#43a457";
        ctx.fillRect(x + 4 + sway, y + (h2 % 8), 3, 2);
        ctx.fillRect(x + 9 + sway, y + 8 + (h2 % 5), 3, 2);
        break;
      }
      case "^": {
        ctx.fillStyle = "#b8bdc2";
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(x + i * 4, y + TS); ctx.lineTo(x + i * 4 + 2, y + TS - 9); ctx.lineTo(x + i * 4 + 4, y + TS);
          ctx.closePath(); ctx.fill();
        }
        ctx.fillStyle = "#8a9096";
        ctx.fillRect(x, y + TS - 3, TS, 3);
        break;
      }
      case "~": {
        const above = (this.grid[r - 1] || [])[c];
        ctx.fillStyle = "rgba(46,134,200,0.55)";
        ctx.fillRect(x, y, TS, TS);
        if (above !== "~") {
          ctx.fillStyle = "rgba(200,240,255,0.8)";
          ctx.fillRect(x, y + Math.sin(x * 0.35 + t * 2.4) * 1.4 + 1, TS, 2);
        } else if ((h2 % 13) === 0) { // reflection shimmer
          ctx.fillStyle = "rgba(220,245,255,0.18)";
          ctx.fillRect(x + (h2 % 9), y + ((h2 >> 3) % 12), 2, 5);
        }
        break;
      }
      case "L": {
        const above = (this.grid[r - 1] || [])[c];
        ctx.fillStyle = "#c2461e";
        ctx.fillRect(x, y, TS, TS);
        ctx.fillStyle = "#ff7043";
        ctx.fillRect(x + (h2 % 6), y + ((h2 >> 2) % 10), 4, 3);
        if (above !== "L") {
          ctx.fillStyle = "#ffce54";
          ctx.fillRect(x, y + Math.sin(x * 0.3 + t * 3) * 1.5 + 1, TS, 3);
        }
        break;
      }
      case "X": this.drawPortal(ctx, x + TS / 2, y + TS / 2 - 6, t); break;
      case "C": {
        const lit = this.litCheckpoints.has(c + "," + r);
        ctx.fillStyle = "#6b4a2f";
        ctx.fillRect(x + 7, y + 4, 3, 12);
        ctx.fillStyle = "#8a6b42";
        ctx.fillRect(x + 5, y + 14, 7, 2);
        if (lit) {
          const f = Math.sin(t * 9 + c) * 1.5;
          ctx.fillStyle = "#ff9f43";
          ctx.fillRect(x + 6, y - 2 + f * 0.4, 5, 6);
          ctx.fillStyle = "#ffd54f";
          ctx.fillRect(x + 7, y - 1 + f * 0.4, 3, 3);
        } else {
          ctx.fillStyle = "#3a3a3a";
          ctx.fillRect(x + 6, y + 1, 5, 4);
        }
        break;
      }
    }
  },

  drawSolidTile(ctx, ch, x, y, c, r, h2, t) {
    const th = this.theme;
    const above = this.tileAt(c, r - 1);
    const exposed = !above || !(above.solid || above.slope);
    switch (ch) {
      case "#": {
        ctx.fillStyle = th.ground;
        ctx.fillRect(x, y, TS, TS);
        if ((h2 % 7) === 0) { ctx.fillStyle = "rgba(0,0,0,0.14)"; ctx.fillRect(x + (h2 % 10), y + 6 + (h2 % 7), 3, 2); }
        if (exposed) {
          ctx.fillStyle = th.groundTop;
          ctx.fillRect(x, y, TS, 4);
          ctx.fillStyle = "rgba(255,255,255,0.18)";
          ctx.fillRect(x, y, TS, 1);
          if ((h2 % 3) === 0) { // grass blades / tufts
            ctx.fillStyle = th.groundTop;
            ctx.fillRect(x + (h2 % 11), y - 3, 2, 3);
            ctx.fillRect(x + ((h2 >> 3) % 11), y - 2, 2, 2);
          }
        }
        break;
      }
      case "=": {
        ctx.fillStyle = th.stone;
        ctx.fillRect(x, y, TS, TS);
        ctx.fillStyle = "rgba(0,0,0,0.18)";
        ctx.fillRect(x, y + 7, TS, 1);
        ctx.fillRect(x + (r % 2 ? 4 : 10), y, 1, 7);
        ctx.fillRect(x + (r % 2 ? 11 : 5), y + 8, 1, 8);
        ctx.fillStyle = "rgba(255,255,255,0.1)";
        ctx.fillRect(x, y, TS, 1);
        if ((h2 % 11) === 0) { ctx.fillStyle = "rgba(63,163,77,0.5)"; ctx.fillRect(x + (h2 % 8), y + 1, 4, 2); }
        break;
      }
      case "B": {
        ctx.fillStyle = th.stone;
        ctx.fillRect(x, y, TS, TS);
        ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 3, y + 2); ctx.lineTo(x + 8, y + 8); ctx.lineTo(x + 5, y + 14);
        ctx.moveTo(x + 12, y + 3); ctx.lineTo(x + 9, y + 9);
        ctx.stroke();
        break;
      }
      case "V": {
        ctx.fillStyle = "#1d5c30";
        ctx.fillRect(x, y, TS, TS);
        ctx.fillStyle = "#2e7d43";
        ctx.fillRect(x + (h2 % 5), y + 1, 3, TS - 2);
        ctx.fillRect(x + 8 + (h2 % 4), y + 2, 3, TS - 3);
        ctx.fillStyle = "#43a457";
        ctx.fillRect(x + 2, y + (h2 % 9), 4, 3);
        ctx.fillRect(x + 9, y + 4 + (h2 % 7), 4, 3);
        break;
      }
      case "G": {
        ctx.fillStyle = th.stone;
        ctx.fillRect(x, y, TS, TS);
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.fillRect(x + 2 + (h2 % 4), y + 2, 3, 3);
        ctx.fillRect(x + 9, y + 6 + (h2 % 4), 3, 3);
        ctx.fillRect(x + 4, y + 11, 3, 3);
        if (this.hasTool("gloves")) {
          ctx.fillStyle = "rgba(126,240,192,0.25)";
          ctx.fillRect(x + 1, y + 1, 2, 2); ctx.fillRect(x + 12, y + 9, 2, 2);
        }
        break;
      }
      case "S": {
        ctx.fillStyle = "#5a5248";
        ctx.fillRect(x, y, TS, TS);
        ctx.fillStyle = this.toggleState ? "#9be8ff" : "#ffb86b";
        ctx.fillRect(x + 4, y + 4, 8, 8);
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.fillRect(x + 6, y + 6, 3, 3);
        break;
      }
      case "T": case "t": {
        const solid = ch === "T" ? !this.toggleState : this.toggleState;
        if (solid) {
          ctx.fillStyle = ch === "T" ? "#c98d5a" : "#6ac9c2";
          ctx.fillRect(x + 1, y + 1, TS - 2, TS - 2);
          ctx.fillStyle = "rgba(255,255,255,0.25)";
          ctx.fillRect(x + 1, y + 1, TS - 2, 2);
          ctx.fillStyle = "rgba(0,0,0,0.2)";
          ctx.fillRect(x + 4, y + 7, 8, 2);
        } else {
          ctx.globalAlpha = 0.22;
          ctx.strokeStyle = ch === "T" ? "#c98d5a" : "#6ac9c2";
          ctx.strokeRect(x + 2.5, y + 2.5, TS - 5, TS - 5);
          ctx.globalAlpha = 1;
        }
        break;
      }
      case "!": {
        const st = this.crumble.get(c + "," + r);
        if (st && st.gone) break;
        const wob = st ? Math.sin(this.elapsed * 40) * 1.2 : 0;
        ctx.fillStyle = th.stone;
        ctx.fillRect(x + wob, y + 1, TS, TS - 4);
        ctx.strokeStyle = "rgba(0,0,0,0.4)";
        ctx.beginPath();
        ctx.moveTo(x + 4 + wob, y + 3); ctx.lineTo(x + 7 + wob, y + 9); ctx.lineTo(x + 4 + wob, y + 12);
        ctx.moveTo(x + 11 + wob, y + 2); ctx.lineTo(x + 9 + wob, y + 8);
        ctx.stroke();
        break;
      }
      case "D": {
        ctx.fillStyle = "#7a5230";
        ctx.fillRect(x, y, TS, TS);
        ctx.fillStyle = "#5c3d22";
        ctx.fillRect(x + 2, y, 2, TS); ctx.fillRect(x + 8, y, 2, TS); ctx.fillRect(x + 13, y, 2, TS);
        ctx.fillStyle = "#c9a86a";
        ctx.fillRect(x + 5, y + 6, 4, 4);
        ctx.fillStyle = "#3a2a18";
        ctx.fillRect(x + 6, y + 8, 2, 2);
        break;
      }
      case "O": {
        ctx.fillStyle = "#8a5a33";
        ctx.fillRect(x + 2, y + 2, 12, 14);
        ctx.fillStyle = "#5c3d22";
        ctx.fillRect(x + 2, y + 5, 12, 2); ctx.fillRect(x + 2, y + 11, 12, 2);
        ctx.fillStyle = "#ff5470";
        ctx.fillRect(x + 6, y + 7, 4, 3);
        break;
      }
    }
  },

  drawPortal(ctx, x, y, t) {
    const pulse = 1 + Math.sin(t * 4) * 0.08;
    ctx.fillStyle = "rgba(126,240,192,0.25)";
    ctx.beginPath(); ctx.arc(x, y + 4, 13 * pulse, 0, 6.29); ctx.fill();
    ctx.fillStyle = "#2a8a5e";
    ctx.fillRect(x - 8, y - 10, 3, 26); ctx.fillRect(x + 5, y - 10, 3, 26);
    ctx.fillRect(x - 8, y - 12, 16, 3);
    ctx.fillStyle = "rgba(126,240,192,0.8)";
    ctx.fillRect(x - 5, y - 9 + ((t * 26) % 22), 10, 3);
    ctx.fillStyle = "#7ef0c0";
    ctx.fillRect(x - 5, y - 9, 10, 2);
    if (Math.random() < 0.1) Fx.sparkle(x, y + Math.random() * 10 - 4, "#7ef0c0", 1);
  },

  /* ================= items / tools ================= */
  drawItem(ctx, it, t) {
    const bob = Math.sin(t * 3 + it.bob) * 2;
    const x = it.x, y = it.y + bob;
    if (it.kind === "tool") {
      const eq = EQUIP_BY_ID[it.id];
      ctx.fillStyle = "rgba(126,240,192,0.3)";
      ctx.beginPath(); ctx.arc(x, y, 10 + Math.sin(t * 5) * 2, 0, 6.29); ctx.fill();
      ctx.font = "12px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(eq.icon, x, y);
      if (Math.random() < 0.06) Fx.sparkle(x, y, "#7ef0c0", 2);
      return;
    }
    const d = it.def;
    switch (d.kind) {
      case "coin": {
        const w = Math.abs(Math.sin(t * 4 + it.bob)) * 6 + 2;
        ctx.fillStyle = "#c99a1e";
        ctx.fillRect(x - w / 2 - 1, y - 4, w + 2, 9);
        ctx.fillStyle = d.color;
        ctx.fillRect(x - w / 2, y - 4, w, 8);
        ctx.fillStyle = "#fff3c4";
        ctx.fillRect(x - w / 4, y - 3, Math.max(1, w / 3), 2);
        break;
      }
      case "gem": {
        ctx.fillStyle = d.color;
        ctx.beginPath();
        ctx.moveTo(x, y - 5); ctx.lineTo(x + 5, y); ctx.lineTo(x, y + 5); ctx.lineTo(x - 5, y);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.fillRect(x - 1, y - 3, 2, 2);
        if (Math.random() < 0.02) Fx.sparkle(x, y, d.color, 1);
        break;
      }
      case "key": {
        ctx.fillStyle = d.color;
        ctx.beginPath(); ctx.arc(x - 2, y - 2, 3, 0, 6.29); ctx.fill();
        ctx.fillRect(x - 1, y - 1, 2, 7);
        ctx.fillRect(x, y + 3, 3, 2); ctx.fillRect(x, y + 5, 2, 2);
        break;
      }
      case "heart": {
        ctx.fillStyle = d.color;
        ctx.beginPath(); ctx.arc(x - 2.4, y - 1, 3, 0, 6.29); ctx.arc(x + 2.4, y - 1, 3, 0, 6.29); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.lineTo(x, y + 6); ctx.lineTo(x + 5, y); ctx.closePath(); ctx.fill();
        break;
      }
      case "relic": {
        ctx.fillStyle = d.color;
        ctx.fillRect(x - 4, y - 5, 8, 10);
        ctx.fillStyle = "#8a5fd0";
        ctx.fillRect(x - 2, y - 3, 4, 6);
        ctx.fillStyle = "#fff";
        ctx.fillRect(x - 1, y - 2, 2, 2);
        if (Math.random() < 0.04) Fx.sparkle(x, y, d.color, 2);
        break;
      }
      case "idol": {
        ctx.fillStyle = "rgba(255,207,62,0.25)";
        ctx.beginPath(); ctx.arc(x, y, 9 + Math.sin(t * 5) * 1.5, 0, 6.29); ctx.fill();
        ctx.fillStyle = d.color;
        ctx.fillRect(x - 4, y - 4, 8, 9);
        ctx.fillRect(x - 2, y - 7, 4, 3);
        ctx.fillStyle = "#7a5c10";
        ctx.fillRect(x - 3, y - 2, 2, 2); ctx.fillRect(x + 1, y - 2, 2, 2);
        ctx.fillRect(x - 2, y + 2, 4, 1);
        if (Math.random() < 0.08) Fx.sparkle(x, y, d.color, 2);
        break;
      }
      case "journal": {
        ctx.fillStyle = "#8a5a33";
        ctx.fillRect(x - 5, y - 4, 10, 9);
        ctx.fillStyle = d.color;
        ctx.fillRect(x - 4, y - 3, 8, 7);
        ctx.fillStyle = "#8a7a5a";
        ctx.fillRect(x - 3, y - 2, 6, 1); ctx.fillRect(x - 3, y, 6, 1);
        if (Math.random() < 0.05) Fx.sparkle(x, y, "#fff7c0", 1);
        break;
      }
    }
  },

  /* ================= movers / projectiles ================= */
  drawMover(ctx, m) {
    const x = m.x - m.w / 2, y = m.y - m.h / 2;
    if (m.axis === "y") {
      ctx.strokeStyle = "rgba(60,50,40,0.7)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(m.x - 8, y); ctx.lineTo(m.x - 8, y - 60);
      ctx.moveTo(m.x + 8, y); ctx.lineTo(m.x + 8, y - 60); ctx.stroke();
    }
    ctx.fillStyle = "#6b5138";
    ctx.fillRect(x, y, m.w, m.h);
    ctx.fillStyle = "#8a6b48";
    ctx.fillRect(x, y, m.w, 3);
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    for (let i = 8; i < m.w; i += 10) ctx.fillRect(x + i, y, 1, m.h);
  },

  drawProjectile(ctx, pr) {
    if (pr.type === "coconut") {
      ctx.fillStyle = "#5c3d22";
      ctx.beginPath(); ctx.arc(pr.x, pr.y, 3.5, 0, 6.29); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.3)"; ctx.fillRect(pr.x - 1, pr.y - 2, 2, 2);
    } else if (pr.type === "spear") {
      ctx.strokeStyle = "#8a5a33"; ctx.lineWidth = 2;
      const a = Math.atan2(pr.vy, pr.vx);
      ctx.beginPath(); ctx.moveTo(pr.x - Math.cos(a) * 6, pr.y - Math.sin(a) * 6);
      ctx.lineTo(pr.x + Math.cos(a) * 6, pr.y + Math.sin(a) * 6); ctx.stroke();
      ctx.fillStyle = "#cfd8dc";
      ctx.fillRect(pr.x + Math.cos(a) * 6 - 1.5, pr.y + Math.sin(a) * 6 - 1.5, 3, 3);
    } else if (pr.type === "fireball") {
      ctx.fillStyle = "rgba(255,159,67,0.4)";
      ctx.beginPath(); ctx.arc(pr.x, pr.y, 6, 0, 6.29); ctx.fill();
      ctx.fillStyle = "#ffce54";
      ctx.beginPath(); ctx.arc(pr.x, pr.y, 3.4, 0, 6.29); ctx.fill();
      if (Math.random() < 0.4) Fx.trailDot && Fx.trailDot(pr.x, pr.y);
    } else if (pr.type === "bubble") {
      ctx.strokeStyle = "rgba(160,220,240,0.9)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(pr.x, pr.y, 5, 0, 6.29); ctx.stroke();
      ctx.fillStyle = "rgba(200,240,255,0.25)";
      ctx.beginPath(); ctx.arc(pr.x, pr.y, 5, 0, 6.29); ctx.fill();
    } else if (pr.type === "seed") {
      ctx.fillStyle = "#8fe05f";
      ctx.beginPath(); ctx.arc(pr.x, pr.y, 3, 0, 6.29); ctx.fill();
      ctx.fillStyle = "#2a5c22"; ctx.fillRect(pr.x - 1, pr.y - 1, 2, 2);
    } else if (pr.type === "wave") {
      ctx.fillStyle = "rgba(230,215,180,0.85)";
      const k = Math.sin(pr.t * 30) * 1.5;
      ctx.fillRect(pr.x - 5, pr.y - 2 + k, 3, 6);
      ctx.fillRect(pr.x - 1, pr.y - 5, 3, 9);
      ctx.fillRect(pr.x + 3, pr.y - 2 - k, 3, 6);
    } else { // rock / gold
      ctx.fillStyle = pr.type === "gold" ? "#ffd23e" : "#8a8272";
      ctx.fillRect(pr.x - 3, pr.y - 3, 6, 6);
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.fillRect(pr.x - 2, pr.y - 2, 2, 2);
    }
  },

  drawBoomerang(ctx, b) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.spin);
    ctx.fillStyle = "#c98d5a";
    ctx.fillRect(-6, -1.5, 12, 3);
    ctx.fillRect(-1.5, -6, 3, 12);
    ctx.fillStyle = "#8a5a33";
    ctx.fillRect(-1.5, -1.5, 3, 3);
    ctx.restore();
  },

  /* ================= enemies ================= */
  drawEnemy(ctx, e, t) {
    ctx.save();
    ctx.translate(Math.round(e.x), Math.round(e.y));
    if (e.dir < 0) ctx.scale(-1, 1);
    if (e.flash > 0 && Math.sin(t * 60) > 0) ctx.globalAlpha = 0.5;
    const d = e.def, w = e.w, h = e.h;
    const ph = Math.sin(e.t * 8);
    // soft shadow
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(-w / 2 + 1, h / 2 - 1, w - 2, 2);
    switch (e.id) {
      case "spider":
        ctx.strokeStyle = d.accent; ctx.lineWidth = 1.5;
        for (let i = 0; i < 3; i++) {
          const lx = -4 + i * 4, ly = ph * (i % 2 ? 1 : -1);
          ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx - 3, h / 2 + ly); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx + 3, h / 2 - ly); ctx.stroke();
        }
        ctx.fillStyle = d.body;
        ctx.beginPath(); ctx.arc(0, -1, w / 2 - 1, 0, 6.29); ctx.fill();
        ctx.fillStyle = d.eye;
        ctx.fillRect(1, -3, 2, 2); ctx.fillRect(4, -3, 2, 2);
        break;
      case "snake":
        ctx.fillStyle = d.body;
        for (let i = 0; i < 4; i++) ctx.fillRect(-w / 2 + i * 5, -2 + Math.sin(e.t * 6 + i) * 1.5, 5, 6);
        ctx.fillRect(w / 2 - 6, -4, 7, 7);
        ctx.fillStyle = d.accent;
        for (let i = 0; i < 3; i++) ctx.fillRect(-w / 2 + 2 + i * 5, -1 + Math.sin(e.t * 6 + i) * 1.5, 2, 2);
        ctx.fillStyle = d.eye; ctx.fillRect(w / 2 - 2, -3, 2, 2);
        ctx.fillStyle = "#ff5470"; ctx.fillRect(w / 2 + 1, 0, 3, 1); // tongue
        break;
      case "frog": {
        const squat = e.vy < -10 ? -2 : e.vy > 10 ? 1 : 0;
        ctx.fillStyle = d.body;
        ctx.fillRect(-w / 2, -h / 2 + 2 + squat, w, h - 3 - squat);
        ctx.fillStyle = d.accent;
        ctx.fillRect(-w / 2 + 1, 0 + squat, w - 2, 3);
        ctx.fillStyle = "#2a5c22";
        ctx.fillRect(-w / 2 - 1, h / 2 - 3, 4, 3); ctx.fillRect(w / 2 - 3, h / 2 - 3, 4, 3);
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, -h / 2 + squat, 3, 3); ctx.fillRect(4, -h / 2 + squat, 3, 3);
        ctx.fillStyle = "#000";
        ctx.fillRect(1, -h / 2 + 1 + squat, 1.5, 1.5); ctx.fillRect(5, -h / 2 + 1 + squat, 1.5, 1.5);
        break;
      }
      case "bat": {
        const flap = Math.sin(e.t * 14) * 4;
        ctx.fillStyle = d.accent;
        ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(-9, -flap); ctx.lineTo(-4, 2); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(9, -flap); ctx.lineTo(4, 2); ctx.closePath(); ctx.fill();
        ctx.fillStyle = d.body;
        ctx.beginPath(); ctx.arc(0, 0, 4, 0, 6.29); ctx.fill();
        ctx.fillStyle = d.eye; ctx.fillRect(0, -2, 1.5, 1.5); ctx.fillRect(2, -2, 1.5, 1.5);
        break;
      }
      case "monkey":
        ctx.fillStyle = d.body;
        ctx.fillRect(-4, -2, 9, 10);
        ctx.beginPath(); ctx.arc(1, -5, 4.5, 0, 6.29); ctx.fill();
        ctx.strokeStyle = d.body; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-4, 4); ctx.quadraticCurveTo(-9, 2 + ph * 2, -8, -3); ctx.stroke();
        ctx.fillStyle = d.accent;
        ctx.fillRect(-1, -7, 5, 4);
        ctx.fillRect(-2, 0, 5, 5);
        ctx.fillStyle = "#000"; ctx.fillRect(0, -6, 1.5, 1.5); ctx.fillRect(3, -6, 1.5, 1.5);
        if (e.projT < 0.4) { ctx.fillStyle = "#5c3d22"; ctx.beginPath(); ctx.arc(6, -6, 3, 0, 6.29); ctx.fill(); }
        break;
      case "beetle":
        ctx.fillStyle = d.body;
        ctx.beginPath(); ctx.arc(0, 0, w / 2 - 1, Math.PI, 0); ctx.fill();
        ctx.fillRect(-w / 2 + 1, 0, w - 2, 3);
        ctx.fillStyle = d.accent;
        ctx.beginPath(); ctx.arc(-1, -1, w / 4, Math.PI, 0); ctx.fill();
        ctx.fillStyle = "#2a2a2a";
        ctx.fillRect(-w / 2, 3, 2, 2); ctx.fillRect(-1, 3 + ph, 2, 2); ctx.fillRect(w / 2 - 2, 3 - ph, 2, 2);
        ctx.fillStyle = d.eye; ctx.fillRect(w / 2 - 3, -2, 2, 2);
        break;
      case "golem":
        ctx.fillStyle = d.body;
        ctx.fillRect(-w / 2, -h / 2 + 4, w, h - 4);
        ctx.fillStyle = d.accent;
        ctx.fillRect(-w / 2 + 2, -h / 2, w - 4, 8);
        ctx.fillRect(-w / 2 - 2, -h / 2 + 6, 4, 10 + ph);   // arms
        ctx.fillRect(w / 2 - 2, -h / 2 + 6, 4, 10 - ph);
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.fillRect(-w / 2 + 3, 0, 4, 3); ctx.fillRect(2, 4, 5, 3);
        ctx.fillStyle = d.eye;
        ctx.fillRect(-2, -h / 2 + 3, 3, 2); ctx.fillRect(3, -h / 2 + 3, 3, 2);
        break;
      case "imp": {
        ctx.fillStyle = "#ffb347";
        const f = Math.sin(e.t * 12) * 2;
        ctx.beginPath(); ctx.moveTo(-3, -h / 2); ctx.lineTo(0, -h / 2 - 5 - f); ctx.lineTo(3, -h / 2); ctx.closePath(); ctx.fill();
        ctx.fillStyle = d.body;
        ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.fillStyle = d.eye;
        ctx.fillRect(0, -2, 2, 2); ctx.fillRect(3, -2, 2, 2);
        ctx.fillStyle = "#8a2f1e";
        ctx.fillRect(-w / 2, h / 2 - 2, w, 2);
        break;
      }
      case "piranha":
        ctx.fillStyle = d.body;
        ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.lineTo(-w / 2 - 3, -3); ctx.lineTo(-w / 2 - 3, 3); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, 6.29); ctx.fill();
        ctx.fillStyle = d.accent;
        ctx.beginPath(); ctx.moveTo(-1, -h / 2); ctx.lineTo(2, -h / 2 - 3); ctx.lineTo(4, -h / 2 + 1); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.fillRect(3, 1, 3, 1.5);
        ctx.fillStyle = d.eye; ctx.fillRect(3, -3, 2, 2);
        break;
      case "guardian":
        ctx.fillStyle = d.body;
        ctx.fillRect(-w / 2, -h / 2 + 5, w, h - 5);
        ctx.fillStyle = d.accent;                     // mask
        ctx.fillRect(-w / 2 + 1, -h / 2, w - 2, 7);
        ctx.fillStyle = "#3a2a18";
        ctx.fillRect(-w / 2 + 2, -h / 2 + 2, 3, 2); ctx.fillRect(2, -h / 2 + 2, 3, 2);
        ctx.fillStyle = "#6b8a3a";                    // feather
        ctx.fillRect(-1, -h / 2 - 4, 2, 4);
        ctx.strokeStyle = "#8a5a33"; ctx.lineWidth = 2; // spear
        ctx.beginPath(); ctx.moveTo(w / 2 + 2, -h / 2); ctx.lineTo(w / 2 + 2, h / 2); ctx.stroke();
        ctx.fillStyle = "#cfd8dc";
        ctx.beginPath(); ctx.moveTo(w / 2 + 2, -h / 2 - 4); ctx.lineTo(w / 2, -h / 2); ctx.lineTo(w / 2 + 4, -h / 2); ctx.closePath(); ctx.fill();
        break;
      default:
        ctx.fillStyle = d.body;
        ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.fillStyle = d.eye;
        ctx.fillRect(1, -h / 4, 2, 2);
    }
    ctx.restore();
  },

  /* ================= the explorer ================= */
  drawPlayer(ctx, p, t) {
    ctx.save();
    ctx.translate(Math.round(p.x), Math.round(p.y));
    if (p.iframes > 0 && Math.sin(t * 30) > 0) ctx.globalAlpha = 0.45;
    if (p.dead) { ctx.rotate(p.deadT * 9); ctx.globalAlpha = Math.max(0, 1 - p.deadT * 2); }
    ctx.scale(p.facing * p.sx, p.sy);
    const run = Math.sin(p.runPhase * 2);
    const airborne = !p.grounded && !p.climbing && !p.inWater;

    // shadow drawn before flip? (skip when airborne)
    // legs
    ctx.fillStyle = "#5c4a32";
    if (p.climbing) {
      ctx.fillRect(-4, 3, 3, 4 + Math.sin(p.runPhase) * 1.5);
      ctx.fillRect(1, 3, 3, 4 - Math.sin(p.runPhase) * 1.5);
    } else if (airborne) {
      ctx.fillRect(-4, 3, 3, 4); ctx.fillRect(1, 4, 3, 3);
    } else {
      ctx.fillRect(-4 + run * 2, 3, 3, 4); ctx.fillRect(1 - run * 2, 3, 3, 4);
    }
    // body — khaki shirt
    ctx.fillStyle = "#c9b280";
    ctx.fillRect(-4, -3, 9, 7);
    // satchel strap
    ctx.fillStyle = "#8a5a33";
    ctx.fillRect(-4, -2, 9, 2);
    ctx.fillRect(2, 0, 3, 4);
    // arms
    ctx.fillStyle = "#c9b280";
    if (p.slashT > 0.12) {
      ctx.fillRect(2, -3, 6, 3);
      ctx.fillStyle = "#cfd8dc"; // machete blade
      ctx.save(); ctx.translate(8, -2); ctx.rotate(-0.5 + (0.24 - p.slashT) * 8);
      ctx.fillRect(0, -1, 9, 2.6);
      ctx.restore();
    } else if (p.climbing) {
      ctx.fillRect(-5, -6 + Math.sin(p.runPhase) * 2, 3, 5);
      ctx.fillRect(3, -6 - Math.sin(p.runPhase) * 2, 3, 5);
    } else {
      ctx.fillRect(-5 - run * 1.4, -2, 3, 5);
      ctx.fillRect(3 + run * 1.4, -2, 3, 5);
    }
    // head
    ctx.fillStyle = "#e8b98a";
    ctx.fillRect(-3, -8, 7, 5);
    // eye (blink)
    if (Math.sin(t * 0.7 + 1) > -0.97) {
      ctx.fillStyle = "#2a2a2a";
      ctx.fillRect(2, -7, 1.6, 1.8);
    }
    // explorer hat
    ctx.fillStyle = "#8a6b42";
    ctx.fillRect(-5, -9, 11, 2.4);
    ctx.fillRect(-3, -12, 7, 3.4);
    ctx.fillStyle = "#6b512f";
    ctx.fillRect(-3, -9.6, 7, 1);
    ctx.restore();
  },
});
