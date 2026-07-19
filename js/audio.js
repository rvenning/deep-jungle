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
  breach()    { this.noise({ dur: 0.12, vol: 0.1 });
                this.tone({ freq: 350, type: "sine", dur: 0.14, vol: 0.12, slide: 260 }); },
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

  streak(tier = 1) {
    [523, 659, 784, 1047 + tier * 120].forEach((f, i) =>
      this.tone({ freq: f, type: "triangle", dur: 0.09, vol: 0.15, when: i * 0.05 }));
  },
  chirp() {
    const f = 1500 + Math.random() * 600;
    this.tone({ freq: f, type: "sine", dur: 0.06, vol: 0.05, slide: 400 });
    this.tone({ freq: f * 1.2, type: "sine", dur: 0.05, vol: 0.04, when: 0.08, slide: -300 });
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

/* ================= Music =================
 * Composed backing tracks, one per world, all synthesized. A lookahead
 * sequencer schedules notes on the WebAudio clock (Sfx.tone's `when`), so
 * timing is tight even though the pump runs on a sloppy setInterval.
 *
 * Track data: 8th-note steps. bass loops 32 steps (4 bars), lead loops 64
 * (8 bars). Notes are semitones relative to `root` (null = rest). Boss
 * levels play a driving variant in the same key. The second level of each
 * world lifts the lead an octave with a soft echo, so worlds evolve.
 */
const TRACKS = [
  { // W1 Jungle Trails — bouncy marimba, C major pentatonic
    bpm: 104, root: 262, leadType: "triangle", bassType: "triangle", drums: "light",
    bass: [-24,null,null,null,-17,null,-24,null, -24,null,null,null,-17,null,-24,null,
           -24,null,null,null,-17,null,-24,null, -20,null,null,null,-17,null,-15,null],
    lead: [4,null,7,null,9,null,null,null,  7,null,9,null,12,null,null,null,
           9,null,7,null,4,null,2,null,     0,null,null,null,null,null,4,null,
           4,null,7,null,9,null,null,null,  12,null,null,null,9,null,7,null,
           9,null,7,null,4,null,2,null,     4,null,null,null,null,null,null,null],
  },
  { // W2 Waterfalls — flowing arps, A minor pentatonic
    bpm: 92, root: 220, leadType: "sine", bassType: "triangle", drums: "none",
    bass: [-24,null,null,null,null,null,null,null, -14,null,null,null,null,null,null,null,
           -17,null,null,null,null,null,null,null, -24,null,null,null,-17,null,null,null],
    lead: [0,3,5,7,10,7,5,3,   0,3,5,7,12,10,7,5,
           3,5,7,10,12,10,7,5, 0,3,5,3,0,null,null,null,
           0,3,5,7,10,7,5,3,   5,7,10,12,15,12,10,7,
           3,5,7,10,7,5,3,0,   0,null,null,null,null,null,null,null],
  },
  { // W3 Ancient Ruins — mysterious, exotic scale
    bpm: 96, root: 262, leadType: "square", bassType: "sine", drums: "light",
    bass: [-24,null,null,null,null,null,-16,null, -24,null,null,null,null,null,-13,null,
           -24,null,null,null,null,null,-16,null, -24,null,-16,null,-13,null,-12,null],
    lead: [0,null,1,null,4,null,null,null,  5,null,4,null,1,null,null,null,
           0,null,1,null,4,null,7,null,     5,null,null,null,4,null,1,null,
           8,null,7,null,5,null,4,null,     5,null,4,null,1,null,0,null,
           1,null,0,null,1,null,4,null,     0,null,null,null,null,null,null,null],
  },
  { // W4 Abandoned Mines — slow low blues
    bpm: 76, root: 165, leadType: "triangle", bassType: "sine", drums: "none",
    bass: [-12,null,null,null,-9,null,null,null, -7,null,null,null,-6,null,-7,null,
           -12,null,null,null,-9,null,null,null, -2,null,null,null,-7,null,-12,null],
    lead: [0,null,null,3,null,5,null,null,  6,null,5,null,3,null,0,null,
           null,null,10,null,7,null,5,null, 3,null,0,null,null,null,null,null,
           12,null,null,10,null,7,null,null, 6,null,7,null,5,null,3,null,
           0,null,3,null,0,null,-2,null,    0,null,null,null,null,null,null,null],
  },
  { // W5 Volcano — driving phrygian
    bpm: 132, root: 220, leadType: "sawtooth", bassType: "sawtooth", drums: "drive",
    bass: [-24,-24,null,-24,-24,null,-23,null, -24,-24,null,-24,-21,null,-19,null,
           -24,-24,null,-24,-24,null,-23,null, -19,null,-21,null,-23,null,-24,null],
    lead: [0,null,0,null,1,null,0,null,   3,null,1,null,0,null,null,null,
           0,null,0,null,5,null,3,null,   1,null,0,null,1,null,3,null,
           7,null,5,null,3,null,1,null,   0,null,0,null,1,null,0,null,
           8,null,7,null,5,null,3,null,   1,null,null,null,0,null,null,null],
  },
  { // W6 The Lost City — regal fanfare, G major
    bpm: 100, root: 196, leadType: "triangle", bassType: "triangle", drums: "light",
    bass: [-12,null,null,null,-5,null,-8,null, -12,null,null,null,-5,null,-8,null,
           -10,null,null,null,-5,null,-7,null, -12,null,-8,null,-5,null,-1,null],
    lead: [0,null,4,null,7,null,12,null,   11,null,12,null,7,null,null,null,
           9,null,7,null,4,null,5,null,    2,null,4,null,null,null,null,null,
           0,null,4,null,7,null,12,null,   14,null,12,null,11,null,9,null,
           7,null,9,null,11,null,12,null,  12,null,null,null,null,null,null,null],
  },
];

const Music = {
  enabled: true,             // separate from Sfx.enabled; persisted in settings
  _pump: null, _amb: null,
  _step: 0, _nextT: 0, _trk: null, _boss: false, _lift: false, _vibe: "birds",

  start(worldIdx, boss = false, levelInWorld = 0) {
    this.stop();
    const wi = Math.min(worldIdx, TRACKS.length - 1);
    this._trk = TRACKS[wi];
    this._boss = boss;
    this._lift = !boss && levelInWorld === 1;   // second level: lead up an octave
    this._vibe = ["birds", "water", "dust", "drips", "rumble", "wind"][wi];
    this._step = 0;
    this._nextT = Sfx.ctx ? Sfx.ctx.currentTime + 0.15 : 0;
    this._pump = setInterval(() => this.pump(), 110);

    this._amb = setInterval(() => {
      if (!Sfx.enabled || !Game.active || Game.paused || boss) return;
      const r = Math.random();
      switch (this._vibe) {
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

  pump() {
    if (!Sfx.ctx || !this._trk) return;
    const now = Sfx.ctx.currentTime;
    if (!Sfx.enabled || !this.enabled || !Game.active || Game.paused) {
      this._nextT = Math.max(this._nextT, now + 0.15);   // hold place, resume clean
      return;
    }
    const t = this._trk;
    const bpm = this._boss ? t.bpm * 1.3 : t.bpm;
    const stepDur = 60 / bpm / 2;                        // 8th notes
    // fell badly behind (frame hitch, throttled timer)? skip ahead silently
    // rather than machine-gunning the missed notes
    while (this._nextT < now - 0.05) { this._step++; this._nextT += stepDur; }
    while (this._nextT < now + 0.6) {
      this.scheduleStep(this._step, Math.max(0, this._nextT - now), stepDur);
      this._step++;
      this._nextT += stepDur;
    }
  },

  scheduleStep(s, when, stepDur) {
    const t = this._trk, root = t.root;
    const note = (semi, oct = 0) => root * Math.pow(2, (semi + oct) / 12);
    const boss = this._boss;

    // bass
    let b = t.bass[s % 32];
    if (boss) b = [-24, null, -24, null][s % 4] ?? b;    // relentless pulse
    if (b !== null && b !== undefined) {
      Sfx.tone({ freq: note(b), type: boss ? "sawtooth" : t.bassType,
                 dur: stepDur * 1.7, vol: boss ? 0.085 : 0.06, when });
    }

    // lead
    const l = t.lead[s % 64];
    if (l !== null && l !== undefined) {
      const oct = this._lift ? 12 : 0;
      const vol = boss ? 0.055 : 0.055;
      Sfx.tone({ freq: note(l, boss ? -12 : oct), type: boss ? "square" : t.leadType,
                 dur: stepDur * 1.6, vol, when });
      if (this._lift) {   // soft echo a step behind — shimmery second-level feel
        Sfx.tone({ freq: note(l, 12), type: "sine", dur: stepDur * 1.3, vol: 0.02, when: when + stepDur });
      }
    }

    // drums
    const drums = boss ? "drive" : t.drums;
    if (drums !== "none") {
      const inBar = s % 8;
      if (inBar === 0) Sfx.tone({ freq: 62, type: "sine", dur: 0.09, vol: 0.075, when, slide: -25 });
      if (inBar === 4 && (drums === "drive")) Sfx.noise({ dur: 0.07, vol: 0.05, when });
      if (inBar % 2 === 1) Sfx.noise({ dur: 0.02, vol: drums === "drive" ? 0.022 : 0.012, when });
    }
  },

  toggle() {
    this.enabled = !this.enabled;
    const s = Storage.getSettings();
    s.music = this.enabled;
    Storage.saveSettings(s);
    return this.enabled;
  },

  stop() {
    if (this._pump) { clearInterval(this._pump); this._pump = null; }
    if (this._amb) { clearInterval(this._amb); this._amb = null; }
    this._trk = null;
  },
};
