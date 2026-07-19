// App shell: screens, the world map, the explorer's journal, results and
// leaderboard. Profiles/PINs/sync/install come from gamekit.

const AVATARS = ["🧭", "🦜", "🐒", "🦄", "🐱", "🦊", "🐼", "🐸", "🦖", "🐙", "🦉", "⭐"];

const App = {
  profile: null,

  el(id) { return document.getElementById(id); },

  async init() {
    Sfx.enabled = Storage.getSettings().sound;
    Music.enabled = Storage.getSettings().music !== false;
    GK.UI.onScreenChange = (name) => {
      Game.active = name === "game";
      if (name !== "game") Music.stop();
      if (name === "splash") this.refreshSplash();
    };
    GK.UI.bindSoundToggle(Storage);

    GK.Profiles.init({
      storage: Storage,
      avatars: AVATARS,
      meta: (p, prog) => `🏆 ${(prog.best || 0).toLocaleString()} · ⭐ ${Storage.totalStars(prog)} · 🗺️ ${Storage.completionPct(prog)}%`,
      onEnter: (p) => { this.profile = p; this.showMap(); },
      addLabel: "New Explorer",
    });

    GK.initPWA({ appName: "Deep Jungle" });
    Game.boot();

    this.showScreen("splash");
    Storage.initFirebase().then((ok) => {
      this.el("sync-badge").textContent = ok ? "☁️ family sync on" : "📴 offline";
      if (ok && GK.UI.screen === "profiles") GK.Profiles.renderList();
      if (ok && GK.UI.screen === "splash") this.refreshSplash();
      if (ok && GK.UI.screen === "map") this.showMap();
      if (ok && GK.UI.screen === "leaderboard") this.showLeaderboard(true);
    });
  },

  showScreen(name) { GK.UI.showScreen(name); },

  toggleMusic() {
    const on = Music.toggle();
    this.el("btn-music").textContent = on ? "🎵 Music: On" : "🔇 Music: Off";
    Sfx.click();
  },

  refreshSplash() {
    const last = GK.Profiles.lastProfile();
    const cont = this.el("btn-continue-as"), start = this.el("btn-start");
    if (last) {
      cont.style.display = "";
      cont.textContent = `🧭 Continue as ${last.avatar} ${last.name}`;
      cont.onclick = () => { Sfx.init(); GK.Profiles.select(last); };
      start.classList.add("ghost");
      start.textContent = "👥 Switch Explorer";
    } else {
      cont.style.display = "none";
      start.classList.remove("ghost");
      start.textContent = "🌿 Start Exploring";
    }
  },

  play() {
    Sfx.init(); Sfx.click();
    GK.Profiles.renderList();
    this.showScreen("profiles");
  },

  /* ================= world map ================= */
  showMap() {
    if (!this.profile) return this.play();
    Music.stop();
    const prog = Storage.getProgress(this.profile.id);
    const unlocked = Storage.unlockedLevel(prog);

    this.el("map-player").innerHTML = `${this.profile.avatar} <b>${GK.util.esc(this.profile.name)}</b>`;
    this.el("map-stars").textContent = `⭐ ${Storage.totalStars(prog)}`;
    this.el("map-pct").textContent = `🗺️ ${Storage.completionPct(prog)}%`;

    const cont = this.el("btn-continue");
    const allDone = (prog.levels[LEVELS.length - 1] || {}).done;
    if (!allDone) {
      const lv = LEVELS[unlocked];
      cont.style.display = "";
      cont.innerHTML = `▶️ ${lv.boss ? "☠️ " : ""}${GK.util.esc(lv.name)} <small>${GK.util.esc(WORLDS[lv.world].name)}</small>`;
      cont.onclick = () => { Sfx.click(); this.startLevel(unlocked); };
    } else {
      cont.style.display = "";
      cont.innerHTML = `👑 Jungle conquered! Replay any level`;
      cont.onclick = () => Sfx.click();
    }

    const wrap = this.el("world-list");
    wrap.innerHTML = "";
    let idx = 0;
    WORLDS.forEach((w, wi) => {
      const first = idx;
      const worldOpen = first <= unlocked;
      const div = document.createElement("div");
      div.className = "world" + (worldOpen ? "" : " locked");
      const head = document.createElement("div");
      head.className = "world-head";
      head.innerHTML = worldOpen
        ? `<span class="world-icon">${w.icon}</span><div><h3>World ${wi + 1} — ${GK.util.esc(w.name)}</h3><p>${GK.util.esc(w.story)}</p></div>`
        : `<span class="world-icon">🔒</span><div><h3>World ${wi + 1} — ???</h3><p>Keep exploring to discover this land…</p></div>`;
      div.appendChild(head);
      const grid = document.createElement("div");
      grid.className = "level-row";
      w.levels.forEach((lv) => {
        const i = idx++;
        const r = prog.levels[i] || {};
        const state = r.done ? "done" : i <= unlocked ? "open" : "locked";
        const cell = document.createElement("button");
        cell.className = `lvl ${state}${lv.boss ? " boss" : ""}`;
        if (state === "locked") {
          cell.innerHTML = `<span class="lvl-n">🔒</span>`;
        } else {
          const stars = r.done ? "★".repeat(r.stars || 0) + "☆".repeat(3 - (r.stars || 0)) : "";
          const extras = !lv.boss && r.done
            ? `<span class="lvl-extra">${(r.secrets || 0) >= (r.secretsTotal || 2) ? "🗿" : ""}${(r.treasure || 0) >= (r.treasureTotal || 1) ? "💎" : ""}</span>` : "";
          cell.innerHTML = `<span class="lvl-n">${lv.boss ? "☠️" : GK.util.esc(lv.name)}</span><span class="lvl-stars">${stars}</span>${extras}`;
        }
        if (state !== "locked") cell.onclick = () => { Sfx.click(); this.startLevel(i); };
        grid.appendChild(cell);
      });
      div.appendChild(grid);
      wrap.appendChild(div);
    });

    this.showScreen("map");
  },

  startLevel(idx) {
    Sfx.init();
    Game.start(this.profile, idx);
  },

  /* ================= mid-level pickups ================= */
  toolFound(id) {
    // stick immediately so quitting doesn't lose a found tool
    const prog = Storage.getProgress(this.profile.id);
    prog.tools = prog.tools || {};
    prog.tools[id] = 1;
    Storage.saveProgress(this.profile.id, prog);
    Game.progress = prog;
    const eq = EQUIP_BY_ID[id];
    this.el("tool-icon").textContent = eq.icon;
    this.el("tool-name").textContent = eq.name;
    this.el("tool-desc").textContent = eq.desc;
    Game.paused = true;
    GK.UI.openModal("modal-tool");
  },

  showJournal(levelIdx) {
    const lv = LEVELS[levelIdx];
    this.el("journal-text").textContent = lv.journal || "";
    Game.paused = true;
    GK.UI.openModal("modal-journal");
    // persist the find immediately too
    const prog = Storage.getProgress(this.profile.id);
    prog.journals = prog.journals || {};
    prog.journals[levelIdx] = 1;
    Storage.saveProgress(this.profile.id, prog);
    Game.progress = prog;
  },

  closeGameModal(id) {
    GK.UI.closeModal(id);
    Game.paused = false;
    Game._last = performance.now();
    Sfx.click();
  },

  /* ================= results ================= */
  levelDone(res, quit) {
    Music.stop();
    const prog = Storage.recordResult(this.profile.id, res.levelIdx, res);
    if (quit) { this.showMap(); return; }

    this.el("res-emoji").textContent = res.win ? (res.boss ? "👑" : "🎉") : "💫";
    this.el("res-title").textContent = res.win
      ? (res.boss ? "BOSS DEFEATED!" : `${LEVELS[res.levelIdx].name} — complete!`)
      : "So close!";
    this.el("res-stars").innerHTML = [0, 1, 2].map((s) =>
      `<span class="star ${s < res.stars ? "on" : ""}">★</span>`).join("");
    this.el("res-score").textContent = res.score.toLocaleString();
    const bits = [];
    if (res.treasureTotal) bits.push(`💎 Treasure ${res.treasure}/${res.treasureTotal}`);
    if (res.secretsTotal) bits.push(`🗿 Secrets ${res.secrets}/${res.secretsTotal}`);
    bits.push(`⏱️ ${Math.floor(res.time / 60)}:${String(res.time % 60).padStart(2, "0")}`);
    if (res.deaths === 0 && res.win) bits.push("🛡️ No falls!");
    this.el("res-stats").innerHTML = bits.map((b) => `<div>${b}</div>`).join("");
    this.el("res-hint").textContent =
      res.win && res.secrets < res.secretsTotal ? "There are still secrets hidden in this level…" : "";

    const retry = this.el("res-retry"), next = this.el("res-next");
    retry.style.display = "";
    retry.textContent = res.win ? "↻ Replay" : "↻ Try Again";
    retry.className = res.win ? "btn ghost" : "btn";
    retry.onclick = () => { Sfx.click(); this.startLevel(res.levelIdx); };
    const hasNext = res.win && res.levelIdx + 1 < LEVELS.length;
    next.style.display = hasNext ? "" : "none";
    if (hasNext) {
      const nl = LEVELS[res.levelIdx + 1];
      next.textContent = nl.boss ? `☠️ ${nl.name}` : `▶️ ${nl.name}`;
      next.onclick = () => { Sfx.click(); this.startLevel(res.levelIdx + 1); };
    }
    this.el("res-finished").style.display =
      (res.win && res.levelIdx === LEVELS.length - 1) ? "" : "none";
    if (res.win) setTimeout(() => Sfx.coin(), 400);
    this.showScreen("results");
  },

  /* ================= explorer's journal (collection) ================= */
  showBook() {
    Sfx.click();
    const prog = Storage.getProgress(this.profile.id);
    this.el("book-pct").textContent = `${Storage.completionPct(prog)}% explored`;
    this.el("book-tools").innerHTML = EQUIPMENT.map((e) => {
      const owned = Storage.hasTool(prog, e.id);
      return `<div class="tool-card ${owned ? "" : "off"}">
        <span class="tool-icon">${owned ? e.icon : "❓"}</span>
        <div><b>${owned ? e.name : "???"}</b><p>${owned ? e.desc : GK.util.esc(e.found)}</p></div></div>`;
    }).join("");
    let idx = 0, html = "";
    WORLDS.forEach((w, wi) => {
      w.levels.forEach((lv) => {
        const i = idx++;
        if (lv.boss) return;
        const found = prog.journals && prog.journals[i];
        html += `<div class="page ${found ? "" : "off"}">
          <div class="page-head">${w.icon} <b>${GK.util.esc(lv.name)}</b></div>
          <p>${found ? GK.util.esc(lv.journal) : "This journal page is still hidden somewhere in the level…"}</p></div>`;
      });
    });
    this.el("book-pages").innerHTML = html;
    this.showScreen("book");
  },

  /* ================= leaderboard ================= */
  showLeaderboard(silent) {
    if (!silent) Sfx.click();
    GK.Profiles.renderLeaderboard("lb-rows", {
      cols: (r) => `<span class="lb-stat">🗺️ ${Storage.completionPct(r.progress)}%</span>
        <span class="lb-stat">⭐ ${Storage.totalStars(r.progress)}</span>
        <span class="lb-stat">🏆 ${(r.progress.best || 0).toLocaleString()}</span>`,
      sort: (a, b) => (b.progress.totalScore || 0) - (a.progress.totalScore || 0),
      meId: this.profile?.id,
      empty: "No explorers yet — tap Play!",
    });
    this.showScreen("leaderboard");
  },
};

window.addEventListener("DOMContentLoaded", () => App.init());
