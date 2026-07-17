// Sound design — gamekit synth core plus Deep Jungle's own layers. Everything
// is synthesized; no audio files. click/coin/win/lose/wrong come from the kit.
const Sfx = GK.Sfx;

Object.assign(Sfx, {
  /* ---- movement ---- */
  jump()   { this.tone({ freq: 300, type: "square", dur: 0.09, vol: 0.1, slide: 190 }); },
  land()   { this.tone({ freq: 150, type: "sine", dur: 0.06, vol: 0.12, slide: -50 }); },
  stomp()  { this.tone({ freq: 320, type: "square", dur: 0.08, vol: 0.16, slide: -180 });
             this.noise({ dur: 0.05, vol: 0.06 }); },
  splashIn()  { this.noise({ dur: 0.2, vol: 0.16 });
                this.tone({ freq: 220, type: "sine", dur: 0.18, vol: 0.1, slide: -120 }); },
  climbTick() { this.tone({ freq: 500, type: "triangle", dur: 0.03, vol: 0.05 }); },

  /* ---- treasure ---- */
  gem(step = 0) {
    const f = 700 * Math.pow(2, Math.min(step, 10) / 18);
    this.tone({ freq: f, type: "triangle", dur: 0.08, vol: 0.16 });
    this.tone({ freq: f * 1.5, type: "sine", dur: 0.1, vol: 0.1, when: 0.04 });
  },
  bigTreasure() {
    [523, 659, 784, 1047].forEach((f, i) =>
      this.tone({ freq: f, type: "triangle", dur: 0.14, vol: 0.18, when: i * 0.07 }));
  },
  idolFanfare() {
    [392, 523, 659, 784, 1047, 1319].forEach((f, i) =>
      this.tone({ freq: f, type: "triangle", dur: 0.2, vol: 0.2, when: i * 0.09 }));
    this.noise({ dur: 0.08, vol: 0.04, when: 0.5 });
  },
  journalPage() {
    this.noise({ dur: 0.09, vol: 0.05 });
    this.tone({ freq: 620, type: "sine", dur: 0.12, vol: 0.1, when: 0.05, slide: 140 });
  },
  key()   { this.tone({ freq: 880, type: "triangle", dur: 0.08, vol: 0.15 });
            this.tone({ freq: 1175, type: "triangle", dur: 0.1, vol: 0.12, when: 0.06 }); },
  door()  { this.tone({ freq: 160, type: "square", dur: 0.16, vol: 0.14, slide: 60 });
            this.tone({ freq: 520, type: "triangle", dur: 0.14, vol: 0.12, when: 0.12 }); },
  heart() { [660, 880].forEach((f, i) => this.tone({ freq: f, type: "sine", dur: 0.12, vol: 0.16, when: i * 0.07 })); },
  toolGet() {
    [440, 554, 659, 880, 659, 880, 1109].forEach((f, i) =>
      this.tone({ freq: f, type: "square", dur: 0.13, vol: 0.12, when: i * 0.09 }));
  },

  /* ---- secrets ---- */
  secret() {
    [523, 494, 587, 554, 659, 880].forEach((f, i) =>
      this.tone({ freq: f, type: "triangle", dur: 0.11, vol: 0.16, when: i * 0.07 }));
  },
  checkpoint() {
    [523, 659, 784].forEach((f, i) => this.tone({ freq: f, type: "sine", dur: 0.14, vol: 0.14, when: i * 0.06 }));
  },

  /* ---- combat / gadgets ---- */
  slash()   { this.noise({ dur: 0.06, vol: 0.08 });
              this.tone({ freq: 900, type: "sawtooth", dur: 0.05, vol: 0.06, slide: -500 }); },
  cutVine() { this.noise({ dur: 0.1, vol: 0.1 });
              this.tone({ freq: 300, type: "triangle", dur: 0.1, vol: 0.1, slide: -120 }); },
  throwRang() { this.tone({ freq: 500, type: "square", dur: 0.08, vol: 0.08, slide: 240 }); },
  rangSpin()  { this.tone({ freq: 640, type: "triangle", dur: 0.04, vol: 0.04 }); },
  catchRang() { this.tone({ freq: 700, type: "sine", dur: 0.07, vol: 0.1, slide: -180 }); },
  enemyDown() { this.tone({ freq: 420, type: "square", dur: 0.1, vol: 0.14, slide: -260 });
                this.noise({ dur: 0.07, vol: 0.07 }); },
  hurt() { this.tone({ freq: 240, type: "sawtooth", dur: 0.22, vol: 0.18, slide: -130 });
           this.noise({ dur: 0.1, vol: 0.08 }); },
  breakBlock() { this.noise({ dur: 0.12, vol: 0.14 });
                 this.tone({ freq: 220, type: "square", dur: 0.09, vol: 0.1, slide: -80 }); },
  explosion() { this.noise({ dur: 0.4, vol: 0.3 });
                this.tone({ freq: 85, type: "sawtooth", dur: 0.32, vol: 0.22, slide: -35 }); },
  switchOn()  { this.tone({ freq: 620, type: "square", dur: 0.07, vol: 0.12 });
                this.tone({ freq: 930, type: "square", dur: 0.09, vol: 0.1, when: 0.07 }); },
  crumbleWarn() { this.noise({ dur: 0.08, vol: 0.06 }); },
  spikes() { this.tone({ freq: 1100, type: "square", dur: 0.05, vol: 0.08 }); },
  lavaBubble() { this.tone({ freq: 110, type: "sine", dur: 0.14, vol: 0.08, slide: 60 }); },

  levelWin() {
    [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) =>
      this.tone({ freq: f, type: "triangle", dur: 0.18, vol: 0.2, when: i * 0.1 }));
  },

  /* ---- boss ---- */
  bossHit()  { this.tone({ freq: 260, type: "square", dur: 0.1, vol: 0.16, slide: -80 }); },
  bossClang(){ this.tone({ freq: 1300, type: "square", dur: 0.04, vol: 0.08 });
               this.tone({ freq: 950, type: "square", dur: 0.05, vol: 0.06, when: 0.03 }); },
  bossRoar() { this.tone({ freq: 120, type: "sawtooth", dur: 0.5, vol: 0.2, slide: -50 });
               this.noise({ dur: 0.3, vol: 0.1 }); },
  bossDown() {
    this.noise({ dur: 0.5, vol: 0.3 });
    [880, 660, 440, 220].forEach((f, i) =>
      this.tone({ freq: f, type: "sawtooth", dur: 0.25, vol: 0.18, when: i * 0.12, slide: -60 }));
    [523, 659, 784, 1047].forEach((f, i) =>
      this.tone({ freq: f, type: "triangle", dur: 0.22, vol: 0.2, when: 0.7 + i * 0.1 }));
  },
});

/* ================= Music + ambience =================
 * A tiny step sequencer: each world gets a bass pattern and a pentatonic lead
 * played on a loop, plus random ambient chirps/drips/rumbles. Boss levels get
 * a driving loop instead. All scheduled with setInterval; muted while paused.
 */
const Music = {
  _loop: null, _amb: null, _step: 0, _world: 0, _boss: false,

  // Patterns: bass = note freqs (0 = rest), lead = pentatonic degrees (null = rest)
  worlds: [
    { tempo: 260, base: 262, scale: [0, 2, 4, 7, 9],       bass: [131, 0, 98, 0, 110, 0, 98, 131],  vibe: "birds" },   // jungle — C maj pent
    { tempo: 300, base: 294, scale: [0, 3, 5, 7, 10],      bass: [110, 0, 87, 0, 98, 0, 110, 0],   vibe: "water" },   // waterfalls — D min pent
    { tempo: 320, base: 262, scale: [0, 2, 3, 7, 8],       bass: [87, 87, 0, 65, 0, 87, 0, 65],    vibe: "dust" },    // ruins — exotic
    { tempo: 340, base: 220, scale: [0, 3, 5, 6, 10],      bass: [55, 0, 55, 0, 65, 0, 49, 0],     vibe: "drips" },   // mines — blues
    { tempo: 240, base: 220, scale: [0, 1, 4, 5, 8],       bass: [55, 55, 58, 58, 49, 49, 62, 62], vibe: "rumble" },  // volcano — phrygian
    { tempo: 280, base: 330, scale: [0, 2, 4, 7, 9],       bass: [82, 0, 110, 0, 123, 0, 110, 0],  vibe: "wind" },    // lost city — regal
  ],

  start(worldIdx, boss = false) {
    this.stop();
    this._world = Math.min(worldIdx, this.worlds.length - 1);
    this._boss = boss;
    this._step = 0;
    const w = this.worlds[this._world];
    const tempo = boss ? Math.max(170, w.tempo - 90) : w.tempo;
    this._loop = setInterval(() => {
      if (!Sfx.enabled || !Game.active || Game.paused) return;
      const s = this._step++;
      const bass = w.bass[s % w.bass.length];
      if (bass) Sfx.tone({ freq: boss ? bass : bass, type: boss ? "sawtooth" : "triangle", dur: 0.16, vol: boss ? 0.09 : 0.05 });
      // sparse lead: play on a loose pattern so it feels alive, not looped
      if (s % 2 === 0 && ((s >> 1) % 4 !== 3 || boss)) {
        const bar = s >> 3;
        const deg = w.scale[(s * 7 + bar * 3) % w.scale.length];
        const oct = ((s * 5 + bar) % 7 === 0) ? 2 : 1;
        if ((s + bar) % 3 !== 2) {
          Sfx.tone({ freq: w.base * Math.pow(2, deg / 12) * oct, type: boss ? "square" : "sine",
                     dur: 0.12, vol: boss ? 0.05 : 0.045, when: 0.02 });
        }
      }
      if (boss && s % 4 === 2) Sfx.noise({ dur: 0.03, vol: 0.03 });
    }, tempo);
    // ambience layer
    this._amb = setInterval(() => {
      if (!Sfx.enabled || !Game.active || Game.paused || boss) return;
      const r = Math.random();
      switch (w.vibe) {
        case "birds":
          if (r < 0.5) { const f = 1400 + Math.random() * 900;
            Sfx.tone({ freq: f, type: "sine", dur: 0.07, vol: 0.03, slide: 300 });
            Sfx.tone({ freq: f * 1.1, type: "sine", dur: 0.06, vol: 0.025, when: 0.09, slide: -200 }); }
          break;
        case "water": if (r < 0.6) Sfx.noise({ dur: 0.3, vol: 0.012 }); break;
        case "dust":  if (r < 0.2) Sfx.noise({ dur: 0.2, vol: 0.01 }); break;
        case "drips": if (r < 0.45) Sfx.tone({ freq: 900 + Math.random() * 500, type: "sine", dur: 0.05, vol: 0.03, slide: -400 }); break;
        case "rumble": if (r < 0.5) Sfx.tone({ freq: 45 + Math.random() * 20, type: "sawtooth", dur: 0.4, vol: 0.03 }); break;
        case "wind":  if (r < 0.4) Sfx.noise({ dur: 0.5, vol: 0.008 }); break;
      }
    }, 900);
  },

  stop() {
    if (this._loop) { clearInterval(this._loop); this._loop = null; }
    if (this._amb) { clearInterval(this._amb); this._amb = null; }
  },
};
