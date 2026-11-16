// ==========================================================
// HudManager.js — Game Boy Horror radar, active hero portrait,
// HP, cash counter & rank, animated Poltergust suction gauge,
// Strobulb charge, boss bar, tug-of-war heart, toasts & tips,
// plus the "Who's Playing?" select screen, pause overlay and the
// Mansion Cleared rank screen (S / A / B / C) with teammate cameo.
// ==========================================================
import {
  drawPortrait, drawFramedPortrait, drawSlotPortrait, drawOptionsPortrait, drawMenuGhost, drawRankMansion, RANK_MESSAGES, drawTierPortrait,
} from '../graphics/textures.js';
import { rankFor } from '../config.js';
import { GALLERY, TIERS, GRADE_RULES } from '../gallery.js';
import { UPGRADES } from '../progression.js';
import { questHint } from '../entities/Quests.js';
import { getCharacter, PROFESSOR } from '../characters.js';

const money = (v) => '$' + Math.round(v).toLocaleString('en-US');

const GB = { dark: '#0f380f', mid: '#306230', light: '#8bac0f', pale: '#c4d96a' };
const WORLD = { minX: -19, maxX: 21, minZ: -17, maxZ: 23 };

export class HudManager {
  constructor() {
    const $ = (id) => document.getElementById(id);
    this.el = {
      hud: $('hud'),
      radar: $('radar'),
      room: $('gbh-room'),
      ghosts: $('gbh-ghosts'),
      led: $('gbh-led'),
      portrait: $('hud-portrait'),
      name: $('hud-name'),
      hpFill: $('hud-hp-fill'),
      hpText: $('hud-hp-text'),
      passive: $('hud-passive'),
      cash: $('hud-cash'),
      keyRing: $('key-ring'),
      rank: $('hud-rank'),
      vac: $('vac-gauge'),
      flashFill: $('flash-fill'),
      lightLabel: $('light-label'),
      elementBlock: $('element-block'),
      elementFill: $('element-fill'),
      elementLabel: $('element-label'),
      bossBar: $('boss-bar'),
      bossFill: $('boss-fill'),
      bossState: $('boss-state'),
      bossName: document.querySelector('#boss-bar .boss-name'),
      fade: $('fade-fx'),
      tutorial: $('tutorial'),
      prompt: $('prompt'),
      toasts: $('toast-stack'),
      tug: $('tug'),
      tugHp: $('tug-hp'),
      tugArrow: $('tug-arrow'),
      hurt: $('hurt-fx'),
      flash: $('flash-fx'),
      hint: $('controls-hint'),
    };
    this.radarCtx = this.el.radar.getContext('2d');
    this.vacCtx = this.el.vac.getContext('2d');
    this.shownCash = 0;
    this.targetCash = 0;
    this.lastRank = 'C';
    this.time = 0;
    this.hurtLevel = 0;
    this.flashLevel = 0;
    this.lastTutorial = null;
    this.lastPrompt = null;
    this.toastHistory = new Map();
    this.char = null;
    this.hintTimer = 18;
  }

  show(v) {
    this.el.hud.classList.toggle('hidden', !v);
  }

  setCharacter(char) {
    this.char = char;
    const c = this.el.portrait;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    drawPortrait(ctx, c.width, char);
    this.el.name.textContent = char.name.toUpperCase();
    this.el.passive.textContent = '★ ' + char.passive.name.toUpperCase();
    this.shownCash = 0;
    this.targetCash = 0;
    this.el.cash.textContent = '$0';
    this.el.rank.textContent = 'C';
    this.hintTimer = 18;
    this.el.hint.classList.remove('faded');
    this.el.toasts.innerHTML = '';
    this.tutorial(null);
    this.prompt(null);
    this.setBoss(null);
  }

  // ---------------------------------------------------------------
  toast(msg, type = '') {
    const now = performance.now();
    const last = this.toastHistory.get(msg);
    if (last && now - last < 2500) return; // de-duplicate spam
    this.toastHistory.set(msg, now);
    const d = document.createElement('div');
    d.className = 'toast ' + type;
    d.textContent = msg;
    this.el.toasts.appendChild(d);
    while (this.el.toasts.children.length > 5) this.el.toasts.firstChild.remove();
    setTimeout(() => d.remove(), 3100);
  }

  // the Professor's little portrait, drawn once and reused
  profIcon() {
    if (!this.profIconUrl) {
      const c = document.createElement('canvas');
      c.width = c.height = 64;
      drawPortrait(c.getContext('2d'), 64, PROFESSOR);
      this.profIconUrl = c.toDataURL();
    }
    return this.profIconUrl;
  }

  tutorial(html) {
    if (html === this.lastTutorial) return;
    this.lastTutorial = html;
    if (!html) {
      this.el.tutorial.classList.add('hidden');
      return;
    }
    // every tip comes over the radio from Professor Koç
    this.el.tutorial.innerHTML = `<div class="tut-from"><img src="${this.profIcon()}" alt=""><span>${PROFESSOR.short.toUpperCase()}<small>📟 KOÇ RADAR</small></span></div><div class="tut-body">${html}</div>`;
    this.el.tutorial.classList.remove('hidden');
    if (this.onTutorial) this.onTutorial();
    // restart entry animation
    this.el.tutorial.style.animation = 'none';
    void this.el.tutorial.offsetWidth;
    this.el.tutorial.style.animation = '';
  }

  prompt(text) {
    if (text === this.lastPrompt) return;
    this.lastPrompt = text;
    if (!text) this.el.prompt.classList.add('hidden');
    else {
      this.el.prompt.innerHTML = text;
      this.el.prompt.classList.remove('hidden');
    }
  }

  hurtFlash() {
    this.hurtLevel = 1;
  }

  screenFlash(v = 1) {
    this.flashLevel = Math.max(this.flashLevel, v);
  }

  // a captured portrait ghost is hung in its frame (gold / silver / bronze)
  showFrame(id, info, tier, { pulls, hits, newBest, prevTier, bonus }) {
    const pop = document.getElementById('frame-pop');
    if (!pop) return;
    const T = TIERS[tier];
    drawTierPortrait(document.getElementById('frame-pop-canvas').getContext('2d'), 160, id, tier, info.name.split(' ').pop());
    document.getElementById('frame-pop-tier').textContent = `${T.label} FRAME!`;
    const detail = `${pulls} tug${pulls === 1 ? '' : 's'} · hit ${hits}×` + (bonus ? ` · +$${bonus.toLocaleString('en-US')}` : '');
    const best = newBest ? (prevTier && prevTier !== tier ? `NEW BEST (was ${TIERS[prevTier].label})` : 'ADDED TO THE GALLERY') : `Gallery keeps your ${TIERS[prevTier].label} frame`;
    document.getElementById('frame-pop-detail').textContent = `${detail} — ${best}`;
    pop.dataset.tier = tier;
    pop.classList.remove('hidden', 'show');
    void pop.offsetWidth; // restart the hang-on-the-wall animation
    pop.classList.add('show');
    clearTimeout(this.framePopTimer);
    this.framePopTimer = setTimeout(() => pop.classList.add('hidden'), 4600);
  }

  setBoss(info) {
    if (!info) {
      this.el.bossBar.classList.add('hidden');
      return;
    }
    this.el.bossBar.classList.remove('hidden');
    this.el.bossFill.style.width = Math.max(0, (info.hp / info.max) * 100) + '%';
    const nameKey = (info.name || 'GRUMBLECLAW') + '|' + (info.title || '');
    if (this.el.bossName && this.lastBossName !== nameKey) {
      this.lastBossName = nameKey;
      this.el.bossName.innerHTML = '';
      this.el.bossName.append(document.createTextNode((info.name || 'GRUMBLECLAW') + ' '));
      const small = document.createElement('small');
      small.textContent = info.title || 'the Goon of the Banquet';
      this.el.bossName.append(small);
    }
    const labels = info.labels || {
      eating: '🍗 EATING — WAIT FOR THE BITE...',
      savoring: '😋 SAVORING A BITE — LIGHT HIM UP!',
      alert: '👀 ALERT — FREEZE!',
      angry: '💢 ANGRY — DODGE THE PLATES',
      return: 'RETURNING TO HIS SEAT',
      stunned: '💫 STUNNED — VACUUM!',
      tug: '🌀 TUG-OF-WAR!',
      captured: 'CAPTURED!',
    };
    this.el.bossState.textContent = labels[info.state] || info.state.toUpperCase();
  }

  // black fade used for stairs and trapdoors between floors
  setFade(v) {
    if (!this.el.fade) return;
    this.el.fade.style.opacity = v.toFixed(3);
  }

  // ---------------------------------------------------------------
  update(dt, s) {
    this.time += dt;
    const el = this.el;

    // HP
    const hpPct = Math.max(0, s.hp / s.maxHp);
    el.hpFill.style.width = hpPct * 100 + '%';
    el.hpFill.classList.toggle('low', hpPct < 0.3);
    el.hpText.textContent = Math.ceil(s.hp);

    // cash count-up
    this.targetCash = s.cash;
    if (this.shownCash !== this.targetCash) {
      const diff = this.targetCash - this.shownCash;
      const step = Math.max(10, Math.abs(diff) * dt * 6);
      this.shownCash = diff > 0 ? Math.min(this.targetCash, this.shownCash + step) : Math.max(this.targetCash, this.shownCash - step);
      el.cash.textContent = '$' + Math.round(this.shownCash).toLocaleString('en-US');
      if (!el.cash.classList.contains('bump')) {
        el.cash.classList.add('bump');
        setTimeout(() => el.cash.classList.remove('bump'), 300);
      }
    }
    const rank = rankFor(s.cash);
    if (rank !== this.lastRank) {
      this.lastRank = rank;
      el.rank.textContent = rank;
    }

    // flash charge
    el.flashFill.style.height = Math.round(s.flashCharge * 100) + '%';
    el.flashFill.classList.toggle('ready', s.flashCharge >= 1 && s.lightOn !== false);
    el.flashFill.classList.toggle('off', s.lightOn === false);
    if (el.lightLabel && this.lastLight !== s.lightOn) {
      this.lastLight = s.lightOn;
      el.lightLabel.textContent = s.lightOn === false ? 'LIGHT OFF' : 'LIGHT ON';
    }

    // Elemental Medal charge (fire / water / ice in the Poltergust tank)
    const elem = s.element || { type: null, amount: 0 };
    if (el.elementBlock) {
      const type = elem.amount > 0 ? elem.type : null;
      if (this.lastElement !== type) {
        this.lastElement = type;
        el.elementBlock.classList.remove('fire', 'water', 'ice', 'empty');
        el.elementBlock.classList.add(type || 'empty');
        el.elementLabel.textContent = type ? { fire: '🔥 FIRE', water: '💧 WATER', ice: '❄️ ICE' }[type] : 'EMPTY';
      }
      el.elementFill.style.height = Math.round(elem.amount * 100) + '%';
      el.elementBlock.classList.toggle('absorbing', !!elem.absorbing);
      el.elementBlock.classList.toggle('spraying', !!elem.spraying);
    }

    el.room.textContent = s.roomName || '';
    const boos = s.boos;
    const booAlert = !!(boos && boos.closeness > 0);
    el.ghosts.textContent = booAlert && Math.floor(this.time * 2) % 2 === 0 ? 'BOO NEARBY!'
      : 'GHOSTS ' + s.ghostsLeft + (boos ? ` · BOOS ${boos.caught}/${boos.total}` : '');
    el.ghosts.classList.toggle('boo-alert', booAlert);
    // the LED blinks on every Boo beep, and flickers when a ghost is close
    el.led.classList.toggle('on', (s.ghostNear && Math.floor(this.time * 6) % 2 === 0) || !!(boos && boos.led));
    el.led.classList.toggle('boo', !!(boos && boos.led));

    // key ring under the treasure counter
    const keyStr = (s.keys || []).join('|');
    if (el.keyRing && keyStr !== this.lastKeys) {
      this.lastKeys = keyStr;
      el.keyRing.replaceChildren(...(s.keys || []).map((label) => {
        const chip = document.createElement('span');
        chip.className = 'key-chip';
        chip.textContent = '🗝️ ' + label.toUpperCase();
        return chip;
      }));
    }

    this.drawRadar(s.radar);
    this.drawVacuum(s.vacuumPower, s.latched, s.tugOpposition || 0);

    // tug-of-war heart overlay
    if (s.tug) {
      el.tug.classList.remove('hidden');
      el.tug.style.left = s.tug.x + 'px';
      el.tug.style.top = s.tug.y + 'px';
      el.tugHp.textContent = Math.ceil(s.tug.hp);
      const pullWord = s.tug.opposition > 0.6 ? 'GREAT PULL!' : s.tug.opposition > 0.2 ? 'PULL!' : 'PULL AWAY!';
      el.tugArrow.textContent = s.tug.group > 1 ? `×${s.tug.group} ${pullWord}` : pullWord;
      el.tug.classList.toggle('multi', s.tug.group > 1);
    } else {
      el.tug.classList.add('hidden');
    }

    // screen fx
    this.hurtLevel = Math.max(0, this.hurtLevel - dt * 2.2);
    el.hurt.style.opacity = this.hurtLevel.toFixed(3);
    this.flashLevel = Math.max(0, this.flashLevel - dt * 4);
    el.flash.style.opacity = this.flashLevel.toFixed(3);

    if (this.hintTimer > 0) {
      this.hintTimer -= dt;
      if (this.hintTimer <= 0) el.hint.classList.add('faded');
    }
  }

  // Game Boy Horror radar: scrolls with the hero and shows the current floor
  drawRadar(r) {
    if (!r) return;
    const ctx = this.radarCtx;
    const W = ctx.canvas.width;
    const Hh = ctx.canvas.height;
    const viewW = 60;
    const scale = W / viewW;
    if (!this.radarCam || this.radarLevel !== r.level) {
      this.radarCam = { x: r.player.x, z: r.player.z };
      this.radarLevel = r.level;
    }
    this.radarCam.x += (r.player.x - this.radarCam.x) * 0.35;
    this.radarCam.z += (r.player.z - this.radarCam.z) * 0.35;
    const cx = this.radarCam.x;
    const cz = this.radarCam.z;
    const sx = (x) => (x - cx) * scale + W / 2;
    const sz = (z) => (z - cz) * scale + Hh / 2 + 6;
    ctx.fillStyle = GB.dark;
    ctx.fillRect(0, 0, W, Hh);
    // grid
    ctx.fillStyle = 'rgba(139,172,15,0.08)';
    for (let x = 0; x < W; x += 10) ctx.fillRect(x, 0, 1, Hh);
    for (let y = 0; y < Hh; y += 10) ctx.fillRect(0, y, W, 1);

    for (const room of r.rooms) {
      const x = sx(room.minX);
      const y = sz(room.minZ);
      const w = sx(room.maxX) - x;
      const h = sz(room.maxZ) - y;
      if (x > W || y > Hh || x + w < 0 || y + h < 0) continue;
      const known = room.visited || room.lit;
      ctx.fillStyle = room.current ? GB.mid : room.lit ? 'rgba(139,172,15,0.35)' : known ? 'rgba(48,98,48,0.4)' : 'rgba(48,98,48,0.14)';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = room.current ? GB.pale : known ? GB.light : 'rgba(139,172,15,0.35)';
      ctx.lineWidth = room.current ? 2 : 1;
      ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      ctx.font = 'bold 8px monospace';
      if (room.lit) {
        ctx.fillStyle = GB.pale;
        ctx.fillText('✓', x + w - 10, y + 10);
      } else if (!known && w > 14 && h > 14) {
        ctx.fillStyle = 'rgba(139,172,15,0.5)';
        ctx.fillText('?', x + w / 2 - 2, y + h / 2 + 3);
      }
    }
    // doors
    for (const d of r.doors) {
      ctx.fillStyle = d.keyed ? (Math.floor(this.time * 4) % 2 ? '#ffd23a' : '#fff6c0') : d.locked ? '#d03030' : d.open ? GB.pale : GB.light;
      if (d.axis === 'z') ctx.fillRect(sx(d.x) - 1.5, sz(d.z) - 4, 3, 8);
      else ctx.fillRect(sx(d.x) - 4, sz(d.z) - 1.5, 8, 3);
    }
    // stairs and trapdoors
    for (const p of r.portals || []) {
      const x = sx(p.x);
      const y = sz(p.z);
      ctx.fillStyle = p.locked ? '#d03030' : '#ffffff';
      for (let i = 0; i < 3; i++) ctx.fillRect(x - 4 + i * 2, y + 2 - i * 3, 8 - i * 2, 2);
    }
    // radar sweep around the hero
    const px = sx(r.player.x);
    const pz = sz(r.player.z);
    const sweep = (this.time * 2.2) % (Math.PI * 2);
    const grad = ctx.createRadialGradient(px, pz, 0, px, pz, 40);
    grad.addColorStop(0, 'rgba(196,217,106,0.25)');
    grad.addColorStop(1, 'rgba(196,217,106,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(px, pz);
    ctx.arc(px, pz, 40, sweep, sweep + 0.6);
    ctx.closePath();
    ctx.fill();
    // hidden Boo in this room: a sonar ring that pulses faster as you close in
    if (r.booCloseness > 0) {
      const c = r.booCloseness;
      const phase = (this.time * (1 + c * 5)) % 1;
      ctx.strokeStyle = `rgba(255,92,138,${(0.35 + c * 0.55) * (1 - phase)})`;
      ctx.lineWidth = 1 + c * 2;
      ctx.beginPath();
      ctx.arc(px, pz, 6 + phase * (40 - c * 22), 0, Math.PI * 2);
      ctx.stroke();
    }
    // ghosts
    for (const g of r.ghosts) {
      const gx = sx(g.x);
      const gz = sz(g.z);
      if (gx < -6 || gz < -6 || gx > W + 6 || gz > Hh + 6) continue;
      const pulse = 2.5 + Math.abs(Math.sin(this.time * 6 + g.x)) * 2;
      if (g.visible) {
        ctx.fillStyle = g.boss ? '#ff5c8a' : g.stunned ? '#ffffff' : GB.pale;
        ctx.beginPath();
        ctx.arc(gx, gz, g.boss ? pulse + 1.5 : pulse, 0, Math.PI * 2);
        ctx.fill();
      } else if (g.sensed) {
        ctx.strokeStyle = GB.pale;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(gx, gz, pulse, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    // hero arrow
    ctx.save();
    ctx.translate(px, pz);
    ctx.rotate(-r.player.facing + Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.lineTo(4, 4);
    ctx.lineTo(0, 2);
    ctx.lineTo(-4, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // floor badge
    ctx.fillStyle = GB.dark;
    ctx.fillRect(3, 3, 22, 12);
    ctx.strokeStyle = GB.pale;
    ctx.lineWidth = 1;
    ctx.strokeRect(3.5, 3.5, 21, 11);
    ctx.fillStyle = GB.pale;
    ctx.font = 'bold 9px monospace';
    ctx.fillText(r.level || '1F', 6, 12);
  }

  drawVacuum(power, latched, opposition) {
    const ctx = this.vacCtx;
    const W = ctx.canvas.width;
    const c = W / 2;
    ctx.clearRect(0, 0, W, W);
    // bezel
    ctx.fillStyle = '#1c1830';
    ctx.beginPath();
    ctx.arc(c, c, c - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = latched ? '#3a0f1a' : '#202a3a';
    ctx.beginPath();
    ctx.arc(c, c, c - 8, 0, Math.PI * 2);
    ctx.fill();
    // swirling suction vortex
    const spin = this.time * (2 + power * 14);
    for (let arm = 0; arm < 4; arm++) {
      ctx.strokeStyle = latched ? `rgba(255,90,120,${0.25 + power * 0.6})` : `rgba(140,230,255,${0.15 + power * 0.65})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i <= 30; i++) {
        const k = i / 30;
        const a = spin + arm * (Math.PI / 2) + k * 4.5;
        const rr = (c - 14) * (1 - k * 0.85);
        const x = c + Math.cos(a) * rr;
        const y = c + Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // power arc
    ctx.strokeStyle = latched ? (opposition > 0.6 ? '#ffe040' : '#ff5c8a') : '#5fe0ff';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(c, c, c - 12, Math.PI * 0.75, Math.PI * 0.75 + Math.PI * 1.5 * Math.max(0.01, power));
    ctx.stroke();
    // ticks
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 6; i++) {
      const a = Math.PI * 0.75 + (Math.PI * 1.5 * i) / 6;
      ctx.beginPath();
      ctx.moveTo(c + Math.cos(a) * (c - 22), c + Math.sin(a) * (c - 22));
      ctx.lineTo(c + Math.cos(a) * (c - 27), c + Math.sin(a) * (c - 27));
      ctx.stroke();
    }
    // centre hub
    ctx.fillStyle = power > 0.05 ? '#4dff7a' : '#2a4a30';
    ctx.beginPath();
    ctx.arc(c, c, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fffaf0';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(latched ? 'TUG!' : Math.round(power * 100) + '%', c, W - 20);
  }

  // sticker chips for pause/results panels
  renderStickers(container, ids, labelFn, allIds = [], newIds = []) {
    container.innerHTML = '';
    const set = new Set(ids);
    const shown = new Set();
    for (const id of [...allIds, ...ids]) {
      if (shown.has(id)) continue;
      shown.add(id);
      const d = document.createElement('span');
      const unlocked = set.has(id);
      d.className = 'sticker' + (unlocked ? '' : ' locked') + (newIds.includes(id) ? ' new' : '');
      d.textContent = unlocked ? labelFn(id) : '🔒 ???';
      container.appendChild(d);
    }
  }

  // ===================================================================
  // SCREENS
  // ===================================================================
  showScreen(id) {
    for (const s of ['boot', 'dataselect', 'options', 'gallery', 'brightness', 'select', 'pause', 'save', 'results', 'workshop']) {
      document.getElementById(s).classList.toggle('hidden', s !== id);
    }
  }

  // --- "Who's Playing?" character select -----------------------------
  buildSelect(characters, { onHover, onClick }) {
    const roster = document.getElementById('roster');
    roster.innerHTML = '';
    this.selectCards = characters.map((ch, i) => {
      const card = document.createElement('div');
      card.className = 'hero-card-sel';
      card.setAttribute('role', 'option');
      card.setAttribute('aria-label', `${ch.name}, ${ch.role}`);
      card.style.setProperty('--hero', ch.css.primary);
      card.style.setProperty('--hero2', ch.css.secondary);
      card.style.setProperty('--sway', `${(i % 3) * 0.7 + Math.floor(i / 3) * 0.4}s`);
      // a little gilded portrait hanging on the gallery wall
      const c = document.createElement('canvas');
      c.width = 128;
      c.height = 128;
      drawFramedPortrait(c.getContext('2d'), 128, ch, { plate: false });
      card.appendChild(c);
      const n = document.createElement('div');
      n.className = 'sel-name';
      n.textContent = ch.name.toUpperCase();
      card.appendChild(n);
      const r = document.createElement('div');
      r.className = 'sel-role';
      r.textContent = ch.role;
      card.appendChild(r);
      const star = document.createElement('div');
      star.className = 'sel-star';
      card.appendChild(star);
      const lvl = document.createElement('div');
      lvl.className = 'sel-lvl';
      card.appendChild(lvl);
      const lock = document.createElement('div');
      lock.className = 'sel-lock';
      lock.textContent = '🔒';
      card.appendChild(lock);
      card.addEventListener('mouseenter', () => onHover(i));
      card.addEventListener('click', () => onClick(i));
      roster.appendChild(card);
      return { card, star, lvl };
    });
  }

  refreshSelectBadges(characters, bridge, progress) {
    characters.forEach((ch, i) => {
      const c = this.selectCards[i];
      const open = progress.isUnlocked(ch.id);
      c.star.textContent = bridge.isCleared(ch.id) ? '★' : '';
      c.card.classList.toggle('locked', !open);
      const lv = progress.heroLevel(ch.id);
      c.lvl.textContent = open ? (lv.max ? 'MAX' : `LV${lv.level}`) : '';
      c.card.classList.toggle('golden', open && lv.max);
    });
    const best = bridge.bestOverall();
    document.getElementById('select-best').innerHTML = best
      ? `HI-SCORE<br>$${best.cash.toLocaleString('en-US')} · RANK ${best.rank}`
      : 'NO RECORDS YET';
    // player level and bank in the header
    const p = progress.playerLevel();
    const $ = (id) => document.getElementById(id);
    $('sp-level').textContent = `LV ${p.level}`;
    $('sp-fill').style.width = p.max ? '100%' : `${Math.round((p.into / p.need) * 100)}%`;
    $('sp-text').textContent = p.max ? 'PLAYER LEVEL MAX' : `${p.into.toLocaleString('en-US')} / ${p.need.toLocaleString('en-US')} XP`;
    $('sp-bank').textContent = money(progress.bank);
  }

  showSelectedHero(index, ch, bridge, progress) {
    const $ = (id) => document.getElementById(id);
    this.selectCards.forEach((c, k) => {
      c.card.classList.toggle('active', k === index);
      c.card.setAttribute('aria-selected', k === index ? 'true' : 'false');
    });
    const open = progress.isUnlocked(ch.id);
    const run = progress.buildStats(ch);
    $('info-role').textContent = ch.role.toUpperCase();
    $('info-name').textContent = ch.name;
    let title = ch.title + (bridge.isCleared(ch.id) ? '  ★ CLEARED' : '');
    const best = bridge.bestFor(ch.id);
    if (best) title += `  ·  BEST $${best.cash.toLocaleString('en-US')} (${best.rank})`;
    $('info-title').textContent = title;
    $('info-desc').textContent = ch.description;
    $('info-passive-name').textContent = ch.passive.name;
    $('info-passive-text').textContent = ch.passive.text;
    const stats = $('info-stats');
    stats.innerHTML = '';
    const ICONS = { SPEED: '👟', HP: '❤️', SUCTION: '🌀', FLASH: '🔦', STEALTH: '🌑' };
    for (const [label, v] of Object.entries(ch.display)) {
      const row = document.createElement('div');
      row.className = 'stat-row';
      // ten pips per stat, filled one by one when the hero changes
      const pips = Array.from({ length: 10 }, (_, k) => `<i class="${k < v ? 'on' : ''}" style="--d:${k * 0.03}s"></i>`).join('');
      row.innerHTML = `<span class="stat-ico">${ICONS[label] || '•'}</span><span class="stat-label">${label}</span><div class="stat-pips">${pips}</div><span class="stat-val">${label === 'HP' ? Math.round(run.maxHp) : v}</span>`;
      stats.appendChild(row);
    }
    // hero level, XP bar and the next perk — or how to unlock them
    const lv = progress.heroLevel(ch.id);
    const perks = progress.perkSummary(ch.id);
    $('info-level').classList.toggle('hidden', !open);
    $('info-locked').classList.toggle('hidden', open);
    $('hl-badge').textContent = lv.level;
    $('hl-badge').classList.toggle('max', lv.max);
    $('hl-fill').style.width = lv.max ? '100%' : `${Math.round((lv.into / lv.need) * 100)}%`;
    $('hl-next').textContent = lv.max
      ? 'MASTERED · golden vacuum'
      : `${lv.into} / ${lv.need} XP · next ${perks.next}`;
    $('info-level').title = perks.got.length ? 'Perks: ' + perks.got.join(', ') : 'No perks yet — play to level up';
    $('info-locked').innerHTML = `🔒 <b>LOCKED</b><br>${questHint(ch.id)}`;
    $('select-go').textContent = open ? 'ENTER THE MANSION' : '🔒 LOCKED';
    $('select-go').classList.toggle('locked', !open);
    $('hero-info').classList.toggle('locked', !open);
    // the whole screen takes on the hero's colours
    const sel = $('select');
    sel.style.setProperty('--hero', ch.css.primary);
    sel.style.setProperty('--hero2', ch.css.secondary);
    sel.style.setProperty('--hero-bg', ch.css.bg);
    $('hero-info').style.setProperty('--hero', ch.css.primary);
    $('stage-name').textContent = ch.name.toUpperCase();
    $('stage-title').textContent = ch.title.toUpperCase();
    // smoke puff on the stage when the hero swaps
    const poof = $('stage-poof');
    poof.classList.remove('go');
    void poof.offsetWidth;
    poof.classList.add('go');
    const info = $('hero-info');
    info.classList.remove('swap');
    void info.offsetWidth;
    info.classList.add('swap');
  }

  // --- pause overlay ---------------------------------------------------
  updatePauseLabels(muted, crt) {
    document.getElementById('pause-mute').textContent = muted ? 'ON' : 'OFF';
    document.getElementById('pause-crt').textContent = crt ? 'ON' : 'OFF';
  }

  showPause(bridge, stickerIds, newIds) {
    this.renderStickers(document.getElementById('pause-stickers'), bridge.data.stickers, (id) => bridge.stickerLabel(id), stickerIds, newIds);
    this.showScreen('pause');
  }

  // --- Mansion Cleared / Game Over rank screen -------------------------
  showResults(r) {
    const $ = (id) => document.getElementById(id);
    $('res-kicker').textContent = r.success ? (r.newBest ? 'MANSION CLEARED · NEW BEST!' : 'MANSION CLEARED') : 'GAME OVER';
    $('res-title').textContent = r.success ? `${r.hero.name} saved ${r.teammate.name}!` : `${r.hero.name} fainted... the ghosts win this round`;
    const pc = $('res-portrait');
    const ctx = pc.getContext('2d');
    ctx.clearRect(0, 0, pc.width, pc.height);
    drawFramedPortrait(ctx, pc.width, r.hero);
    $('res-hero').textContent = r.hero.name;
    $('res-cash').textContent = '$' + r.cash.toLocaleString('en-US');
    $('res-ghosts').textContent = `${r.ghosts} / ${r.totalGhosts}`;
    const m = Math.floor(r.time / 60);
    const s = Math.floor(r.time % 60);
    $('res-time').textContent = `${m}:${String(s).padStart(2, '0')}`;
    const rankEl = $('res-rank');
    rankEl.textContent = r.success ? r.rank : '—';
    rankEl.dataset.rank = r.success ? r.rank : '';

    // the ending painting: the mansion your treasure built
    const wrap = $('rank-painting-wrap');
    wrap.classList.remove('reveal');
    if (r.success) {
      wrap.classList.remove('hidden');
      drawRankMansion($('res-painting').getContext('2d'), 480, 300, r.rank, r.hero.name);
      const stamp = $('res-stamp');
      stamp.textContent = r.rank;
      stamp.dataset.rank = r.rank;
      $('res-message').textContent = RANK_MESSAGES[r.rank].replace('{hero}', r.hero.name);
      void wrap.offsetWidth;
      wrap.classList.add('reveal');
    } else {
      wrap.classList.add('hidden');
    }

    // rescued teammate cameo
    const rescue = $('res-rescue');
    if (r.success) {
      rescue.classList.remove('hidden');
      const cam = $('res-cameo');
      const cctx = cam.getContext('2d');
      cctx.clearRect(0, 0, cam.width, cam.height);
      drawFramedPortrait(cctx, cam.width, r.teammate, { plate: false });
      $('res-rescue-text').innerHTML = `<b>${r.teammate.name}</b> (${r.teammate.title}) was freed from Master Varnish's cursed painting!<br><i>"Thanks, ${r.hero.name}! Next time I'm holding the vacuum."</i>`;
    } else {
      rescue.classList.add('hidden');
    }
    this.renderProgress($('res-progress'), r.progress, r.hero);
    this.renderStickers($('res-stickers'), r.bridge.data.stickers, (id) => r.bridge.stickerLabel(id), r.stickerIds, r.newStickers);
    $('res-again').textContent = r.success ? 'PLAY AGAIN' : 'TRY AGAIN';
    this.showScreen('results');
    this.show(false);
  }

  // what this run added: banked treasure, XP bars, level-ups, unlocks
  renderProgress(el, p, hero) {
    if (!p) {
      el.innerHTML = '';
      return;
    }
    const bar = (label, info, before, after) => `
      <div class="rp-row${after > before ? ' up' : ''}">
        <span class="rp-label">${label}</span>
        <span class="rp-lv">LV ${after}${after > before ? ' ▲' : ''}</span>
        <div class="rp-bar"><i style="width:${info.max ? 100 : Math.round((info.into / info.need) * 100)}%"></i></div>
        <span class="rp-xp">${info.max ? 'MAX' : `${info.into}/${info.need}`}</span>
      </div>`;
    const lines = [
      ...p.heroUps.map((u) => `⭐ ${hero.name} LV ${u.level}: ${u.text}`),
      ...p.rewards.map((t) => `🎁 ${t}`),
      ...p.unlocked.filter((id) => !p.rewards.some((t) => t.includes(getCharacter(id).name))).map((id) => `🔓 ${getCharacter(id).name} can now be played!`),
    ];
    el.innerHTML = `
      <div class="rp-top">
        <div><span>BANKED</span><b>+${money(p.bank)}</b></div>
        <div><span>XP</span><b>+${p.heroXP}</b></div>
        <div><span>BANK TOTAL</span><b>${money(p.total)}</b></div>
      </div>
      ${bar(hero.name.toUpperCase(), p.hero.info, p.hero.before, p.hero.after)}
      ${bar('PLAYER', p.player.info, p.player.before, p.player.after)}
      ${lines.length ? `<ul class="rp-lines">${lines.map((l) => `<li>${l}</li>`).join('')}</ul>` : ''}
      ${p.halved ? '<div class="rp-note">Fainted — only half your treasure made it home.</div>' : ''}`;
  }

  // --- Workshop: spend banked treasure on vacuum upgrades -------------
  renderWorkshop(progress, index, flash = null) {
    const $ = (id) => document.getElementById(id);
    $('ws-bank').textContent = money(progress.bank);
    const d = progress.discount();
    $('ws-note').innerHTML = `<img src="${this.profIcon()}" alt=""><span>"Bring me treasure from the mansion and I'll tune up your Poltergust. My upgrades work for every hero!"${d ? ` <b>Player-level discount: ${Math.round(d * 100)}% off.</b>` : ''}</span>`;
    const list = $('ws-list');
    list.innerHTML = UPGRADES.map((u, i) => {
      const lv = progress.upgradeLevel(u.id);
      const cost = progress.cost(u.id);
      const pips = Array.from({ length: u.max }, (_, k) => `<i class="${k < lv ? 'on' : ''}"></i>`).join('');
      const price = cost === null ? 'MAX' : money(cost);
      const cls = [i === index ? 'active' : '', cost === null ? 'maxed' : '', cost !== null && cost > progress.bank ? 'poor' : '', flash === i ? 'bought' : ''].join(' ');
      return `<li class="${cls}" data-i="${i}">
        <span class="ws-ico">${u.icon}</span>
        <div class="ws-info"><b>${u.name}</b><small>${u.text} · ${u.per} per level</small><div class="ws-pips">${pips}</div></div>
        <span class="ws-price">${price}</span>
      </li>`;
    }).join('');
  }
}

// ===================================================================
// MENU SCREENS — modelled on Luigi's Mansion (GameCube):
//  • Data Select: three save portraits + an "Options" portrait on a
//    gallery wall, "Which game will you play?" / "Welcome to our
//    mansion...", with Copy and Erase.
//  • Options: Sound (Stereo/Mono), Vibration (here: screen shake),
//    Control (Standard / Lateral walking), Brightness Check, OK.
//  • Brightness Check: ghosts either side of a dividing line; adjust
//    until only the left-hand ghosts are visible.
//  • Pause: Continue / Quit framed by two ghosts, with the control
//    style switches on the far left (Standard) and right (Lateral);
//    Quit asks Yes / No.
//  • Save: Save Game / Quit, then "Game saving finished."
// ===================================================================
const OPTION_ROWS = [
  { key: 'sound', label: 'SOUND', choices: [['stereo', 'STEREO'], ['mono', 'MONO']] },
  { key: 'shake', label: 'VIBRATION', choices: [[true, 'ON'], [false, 'OFF']], hint: 'screen shake' },
  { key: 'control', label: 'CONTROL', choices: [['standard', 'STANDARD'], ['lateral', 'LATERAL WALK']] },
  { key: 'crt', label: 'CRT SCANLINES', choices: [[false, 'OFF'], [true, 'ON']] },
  { key: 'gfx', label: 'GRAPHICS', choices: [['high', 'HIGH'], ['low', 'LOW']], hint: 'bloom, grading, lens effects' },
  { key: 'brightness', label: 'BRIGHTNESS CHECK', action: 'brightness' },
  { key: 'ok', label: 'OK', action: 'ok' },
];

const NAV = {
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  ok: ['Enter', 'NumpadEnter', 'Space'],
  back: ['Escape', 'Backspace'],
};

export class MenuScreens {
  constructor(game, characters) {
    this.game = game;
    this.characters = characters;
    this.ds = { index: 0, mode: 'pick', copyFrom: -1, confirm: null };
    this.opt = { index: 0 };
    this.pause = { index: 0, confirm: null };
    this.save = { index: 0, done: false };
    this.$ = (id) => document.getElementById(id);
    this.drawStaticArt();
    this.wireMouse();
  }

  get bridge() {
    return this.game.bridge;
  }

  get sound() {
    return this.game.sound;
  }

  hit(I, list) {
    return I.hit(...list);
  }

  charById(id) {
    return this.characters.find((c) => c.id === id) || this.characters[0];
  }

  drawStaticArt() {
    drawOptionsPortrait(this.$('opt-portrait').getContext('2d'), 160, 160);
    const gl = this.$('pause-ghost-l').getContext('2d');
    const gr = this.$('pause-ghost-r').getContext('2d');
    drawMenuGhost(gl, 48, 46, 28, { body: '#cfe9ff' });
    drawMenuGhost(gr, 48, 46, 28, { body: '#ffd0f0', flip: true });
  }

  wireMouse() {
    // confirm dialogs
    for (const id of ['ds-confirm', 'pause-confirm']) {
      this.$(id).querySelectorAll('[data-v]').forEach((el) => {
        el.addEventListener('mouseenter', () => this.setConfirmChoice(id, el.dataset.v));
        el.addEventListener('click', () => {
          this.setConfirmChoice(id, el.dataset.v);
          if (id === 'ds-confirm') this.resolveDsConfirm();
          else this.resolvePauseConfirm();
        });
      });
    }
    this.$('pause-menu').querySelectorAll('li').forEach((li, i) => {
      li.addEventListener('mouseenter', () => { this.pause.index = i; this.renderPause(); });
      li.addEventListener('click', () => { this.pause.index = i; this.activatePause(); });
    });
    for (const id of ['pause-standard', 'pause-lateral']) {
      this.$(id).addEventListener('click', (e) => this.setControl(e.currentTarget.dataset.ctl));
    }
    this.$('save-menu').querySelectorAll('li').forEach((li, i) => {
      li.addEventListener('mouseenter', () => { if (!this.save.done) { this.save.index = i; this.renderSave(); } });
      li.addEventListener('click', () => { this.save.index = i; this.activateSave(); });
    });
    this.$('save').addEventListener('click', (e) => {
      if (this.save.done && !e.target.closest('li')) this.game.afterSave();
    });
  }

  // =================================================================
  // DATA SELECT
  // =================================================================
  openDataSelect(focus = 0) {
    this.ds.index = focus;
    this.ds.mode = 'pick';
    this.ds.confirm = null;
    this.$('ds-confirm').classList.add('hidden');
    this.renderDataSelect();
  }

  renderDataSelect() {
    const row = this.$('ds-row');
    if (!this.dsSlots) {
      row.innerHTML = '';
      this.dsSlots = [0, 1, 2, 3, 4].map((i) => {
        const slot = document.createElement('div');
        slot.className = 'ds-slot';
        const c = document.createElement('canvas');
        c.width = 160;
        c.height = 200;
        slot.appendChild(c);
        const label = document.createElement('div');
        label.className = 'ds-label';
        slot.appendChild(label);
        const info = document.createElement('div');
        info.className = 'ds-info';
        slot.appendChild(info);
        slot.addEventListener('mouseenter', () => {
          if (this.ds.confirm) return;
          if (this.ds.index !== i) this.sound.blip();
          this.ds.index = i;
          this.renderDataSelect();
        });
        slot.addEventListener('click', () => {
          if (this.ds.confirm) return;
          this.ds.index = i;
          this.confirmDataSlot();
        });
        row.appendChild(slot);
        return { slot, c, label, info };
      });
    }
    this.dsSlots.forEach((s, i) => {
      const ctx = s.c.getContext('2d');
      s.slot.classList.toggle('active', i === this.ds.index);
      s.slot.classList.toggle('copy-src', this.ds.mode === 'copy' && i === this.ds.copyFrom);
      if (i === 3) {
        ctx.clearRect(0, 0, 160, 200);
        ctx.drawImage(this.$('opt-portrait'), 0, 20, 160, 160);
        s.label.textContent = 'OPTIONS';
        s.info.innerHTML = 'Sound · Vibration<br>Control · Brightness';
        return;
      }
      if (i === 4) {
        // the gallery slot shows Grumbleclaw's frame — the first portrait you can earn
        const frames = GALLERY.map((p) => this.bridge.getFrame(p.id));
        const g = frames[0];
        ctx.clearRect(0, 0, 160, 200);
        const c = document.createElement('canvas');
        c.width = c.height = 160;
        drawTierPortrait(c.getContext('2d'), 160, 'grumbleclaw', g ? g.tier : null);
        ctx.drawImage(c, 0, 20);
        s.label.textContent = 'GALLERY';
        const framed = frames.filter(Boolean).length;
        const golds = frames.filter((f) => f && f.tier === 'gold').length;
        s.info.innerHTML = `${framed}/${GALLERY.length} PORTRAITS FRAMED<br>🥇 ${golds} GOLD`;
        return;
      }
      const f = this.bridge.getFile(i);
      const ch = f ? this.charById(f.hero) : null;
      drawSlotPortrait(ctx, 160, 200, { char: ch, label: `DATA ${i + 1}`, empty: !f });
      s.label.textContent = `DATA ${i + 1}`;
      s.info.innerHTML = f && f.checkpoint
        ? `${ch.name} · <b>AREA ${f.checkpoint.area} SAVED</b><br>$${(f.checkpoint.cash || 0).toLocaleString('en-US')} · ENTER TO CONTINUE`
        : f
          ? `${ch.name} · ${f.clears} clear${f.clears === 1 ? '' : 's'}<br>BEST $${f.bestCash.toLocaleString('en-US')} · RANK ${f.bestRank || '—'}`
          : 'NEW GAME';
    });
    const msg = this.$('ds-message');
    if (this.ds.mode === 'copy') msg.textContent = `Copy DATA ${this.ds.copyFrom + 1} to which file? (ESC to cancel)`;
    else if (this.ds.index === 3) msg.textContent = 'Change the game settings.';
    else if (this.ds.index === 4) msg.textContent = 'Visit the portrait gallery.';
    else msg.textContent = this.bridge.getFile(this.ds.index) ? 'Continue this game.' : 'Start a new game.';
  }

  handleDataSelect(I) {
    if (this.ds.confirm) {
      if (this.hit(I, NAV.left) || this.hit(I, NAV.right)) {
        this.setConfirmChoice('ds-confirm', this.ds.confirm.choice === 'yes' ? 'no' : 'yes');
      }
      if (this.hit(I, NAV.ok)) this.resolveDsConfirm();
      if (this.hit(I, NAV.back)) {
        this.ds.confirm.choice = 'no';
        this.resolveDsConfirm();
      }
      return;
    }
    if (this.hit(I, NAV.left)) this.moveDs(-1);
    if (this.hit(I, NAV.right)) this.moveDs(1);
    if (this.hit(I, NAV.ok)) this.confirmDataSlot();
    if (this.hit(I, ['KeyC'])) this.startCopy();
    if (this.hit(I, ['Delete', 'KeyX'])) this.startErase();
    if (this.hit(I, ['Escape'])) {
      if (this.ds.mode === 'copy') {
        this.ds.mode = 'pick';
        this.renderDataSelect();
      } else {
        this.game.goTitle();
      }
    }
  }

  moveDs(d) {
    this.ds.index = (this.ds.index + d + 5) % 5;
    this.sound.blip();
    this.renderDataSelect();
  }

  confirmDataSlot() {
    const i = this.ds.index;
    if (this.ds.mode === 'copy') {
      if (i >= 3 || i === this.ds.copyFrom) {
        this.sound.locked();
        return;
      }
      if (this.bridge.getFile(i)) {
        this.openDsConfirm('overwrite', i, `Overwrite DATA ${i + 1} with DATA ${this.ds.copyFrom + 1}?`);
      } else {
        this.doCopy(i);
      }
      return;
    }
    this.sound.confirm();
    if (i === 3) this.game.goOptions();
    else if (i === 4) this.game.goGallery();
    else this.game.selectFile(i);
  }

  startCopy() {
    const i = this.ds.index;
    if (i >= 3 || !this.bridge.getFile(i)) {
      this.sound.locked();
      this.$('ds-message').textContent = 'There is no data to copy.';
      return;
    }
    this.ds.mode = 'copy';
    this.ds.copyFrom = i;
    this.sound.blip();
    this.renderDataSelect();
  }

  doCopy(to) {
    this.bridge.copyFile(this.ds.copyFrom, to);
    this.ds.mode = 'pick';
    this.ds.index = to;
    this.sound.chime('pearl');
    this.renderDataSelect();
    this.$('ds-message').textContent = `Copied to DATA ${to + 1}.`;
  }

  startErase() {
    const i = this.ds.index;
    if (i >= 3 || !this.bridge.getFile(i)) {
      this.sound.locked();
      this.$('ds-message').textContent = 'There is no data to erase.';
      return;
    }
    this.openDsConfirm('erase', i, `Erase DATA ${i + 1}? This cannot be undone.`);
  }

  openDsConfirm(type, slot, text) {
    this.ds.confirm = { type, slot, choice: 'no' };
    this.$('ds-confirm-text').textContent = text;
    this.$('ds-confirm').classList.remove('hidden');
    this.setConfirmChoice('ds-confirm', 'no');
    this.sound.blip();
  }

  setConfirmChoice(id, v) {
    if (id === 'ds-confirm' && this.ds.confirm) this.ds.confirm.choice = v;
    if (id === 'pause-confirm' && this.pause.confirm) this.pause.confirm.choice = v;
    this.$(id).querySelectorAll('[data-v]').forEach((el) => el.classList.toggle('active', el.dataset.v === v));
  }

  resolveDsConfirm() {
    const c = this.ds.confirm;
    if (!c) return;
    this.$('ds-confirm').classList.add('hidden');
    this.ds.confirm = null;
    if (c.choice === 'yes') {
      if (c.type === 'erase') {
        this.bridge.eraseFile(c.slot);
        this.sound.plateCrash();
        this.renderDataSelect();
        this.$('ds-message').textContent = `DATA ${c.slot + 1} was erased.`;
      } else if (c.type === 'overwrite') {
        this.doCopy(c.slot);
      }
    } else {
      this.sound.blip();
      if (c.type === 'overwrite') this.ds.mode = 'pick';
      this.renderDataSelect();
    }
  }

  // =================================================================
  // PORTRAIT GALLERY — every portrait ghost, framed by how well you caught it
  // =================================================================
  openGallery() {
    this.gal = { index: 0 };
    this.renderGallery();
  }

  renderGallery() {
    const row = this.$('gal-row');
    if (!this.galSlots) {
      row.innerHTML = '';
      this.galSlots = GALLERY.map((p, i) => {
        const slot = document.createElement('div');
        slot.className = 'gal-slot';
        const c = document.createElement('canvas');
        c.width = c.height = 128;
        slot.appendChild(c);
        const tag = document.createElement('div');
        tag.className = 'gal-tag';
        slot.appendChild(tag);
        slot.addEventListener('mouseenter', () => {
          if (this.gal.index !== i) this.sound.blip();
          this.gal.index = i;
          this.renderGallery();
        });
        row.appendChild(slot);
        return { slot, c, tag };
      });
    }
    let golds = 0;
    let framed = 0;
    this.galSlots.forEach((s, i) => {
      const p = GALLERY[i];
      const f = this.bridge.getFrame(p.id);
      if (f) framed++;
      if (f && f.tier === 'gold') golds++;
      drawTierPortrait(s.c.getContext('2d'), 128, p.id, f ? f.tier : null);
      s.slot.classList.toggle('active', i === this.gal.index);
      s.slot.dataset.tier = f ? f.tier : 'none';
      s.tag.textContent = f ? TIERS[f.tier].label : '???';
    });
    this.$('gal-sub').textContent = `${framed}/${GALLERY.length} framed · ${golds} gold`;

    // detail card for the highlighted portrait
    const p = GALLERY[this.gal.index];
    const f = this.bridge.getFrame(p.id);
    const d = this.$('gal-detail');
    d.dataset.tier = f ? f.tier : 'none';
    const name = document.createElement('div');
    name.className = 'gal-name';
    const small = document.createElement('small');
    if (f) {
      name.textContent = p.name + ' ';
      small.textContent = p.title;
    } else {
      name.textContent = '??? ';
      small.textContent = `Haunting the ${p.room}`;
    }
    name.appendChild(small);
    const line = document.createElement('div');
    line.className = 'gal-line';
    if (f) {
      const hero = this.charById(f.hero);
      line.textContent = `${TIERS[f.tier].label} FRAME · caught by ${hero.name} · ${f.pulls} tug${f.pulls === 1 ? '' : 's'}, hit ${f.hits}×`;
    } else {
      line.textContent = 'Not caught yet.';
    }
    const rules = document.createElement('div');
    rules.className = 'gal-rules';
    rules.textContent = GRADE_RULES;
    d.replaceChildren(name, line, rules);
  }

  handleGallery(I) {
    const n = GALLERY.length;
    if (this.hit(I, NAV.left) || this.hit(I, NAV.up)) {
      this.gal.index = (this.gal.index - 1 + n) % n;
      this.sound.blip();
      this.renderGallery();
    }
    if (this.hit(I, NAV.right) || this.hit(I, NAV.down)) {
      this.gal.index = (this.gal.index + 1) % n;
      this.sound.blip();
      this.renderGallery();
    }
    if (this.hit(I, NAV.back) || this.hit(I, NAV.ok)) {
      this.sound.blip();
      this.game.closeGallery();
    }
  }

  // =================================================================
  // OPTIONS
  // =================================================================
  openOptions() {
    this.opt.index = 0;
    this.renderOptions();
  }

  renderOptions() {
    const list = this.$('opt-list');
    const o = this.game.options;
    if (!this.optRows) {
      list.innerHTML = '';
      this.optRows = OPTION_ROWS.map((row, i) => {
        const li = document.createElement('li');
        li.className = 'opt-row' + (row.action ? ' opt-action' : '') + (row.key === 'ok' ? ' opt-ok' : '');
        li.addEventListener('mouseenter', () => { this.opt.index = i; this.renderOptions(); });
        li.addEventListener('click', (e) => {
          this.opt.index = i;
          const choice = e.target.closest('[data-c]');
          if (choice) this.setOption(row, OPTION_ROWS[i].choices[+choice.dataset.c][0]);
          else this.activateOption();
        });
        list.appendChild(li);
        return li;
      });
    }
    OPTION_ROWS.forEach((row, i) => {
      const li = this.optRows[i];
      li.classList.toggle('active', i === this.opt.index);
      if (row.action) {
        li.textContent = row.key === 'brightness' ? `BRIGHTNESS CHECK  ▸  ${o.brightness} / 7` : row.label;
      } else {
        li.innerHTML = `<span>${row.label}</span><span class="opt-choices">${row.choices
          .map(([v, txt], k) => `<span data-c="${k}" class="${o[row.key] === v ? 'on' : ''}">${txt}</span>`)
          .join('')}</span>`;
      }
    });
  }

  handleOptions(I) {
    const n = OPTION_ROWS.length;
    if (this.hit(I, NAV.up)) { this.opt.index = (this.opt.index - 1 + n) % n; this.sound.blip(); this.renderOptions(); }
    if (this.hit(I, NAV.down)) { this.opt.index = (this.opt.index + 1) % n; this.sound.blip(); this.renderOptions(); }
    const row = OPTION_ROWS[this.opt.index];
    if (!row.action && (this.hit(I, NAV.left) || this.hit(I, NAV.right))) {
      const cur = row.choices.findIndex(([v]) => v === this.game.options[row.key]);
      const d = this.hit(I, NAV.left) ? -1 : 1;
      this.setOption(row, row.choices[(cur + d + row.choices.length) % row.choices.length][0]);
    }
    if (this.hit(I, NAV.ok)) this.activateOption();
    if (this.hit(I, ['Escape'])) this.game.closeOptions();
  }

  setOption(row, value) {
    this.game.setOption(row.key, value);
    this.sound.blip();
    if (row.key === 'shake' && value) this.game.rig.shake(0.4);
    this.renderOptions();
  }

  activateOption() {
    const row = OPTION_ROWS[this.opt.index];
    if (row.key === 'ok') {
      this.sound.confirm();
      this.game.closeOptions();
    } else if (row.key === 'brightness') {
      this.sound.confirm();
      this.game.goBrightness();
    } else {
      const cur = row.choices.findIndex(([v]) => v === this.game.options[row.key]);
      this.setOption(row, row.choices[(cur + 1) % row.choices.length][0]);
    }
  }

  // =================================================================
  // BRIGHTNESS CHECK
  // =================================================================
  openBrightness() {
    this.renderBrightness();
  }

  renderBrightness() {
    const lvl = this.game.options.brightness;
    const f = 0.6 + lvl * 0.1; // 0.7 … 1.3, same factor applied to the 3D exposure
    const c = this.$('bc-canvas');
    const ctx = c.getContext('2d');
    const W = c.width;
    const H = c.height;
    const v = (x) => Math.round(Math.min(255, x * f * 255));
    ctx.fillStyle = `rgb(${v(0.015)},${v(0.015)},${v(0.03)})`;
    ctx.fillRect(0, 0, W, H);
    // dividing line
    ctx.fillStyle = 'rgba(217,180,90,0.6)';
    ctx.fillRect(W / 2 - 2, 10, 4, H - 20);
    // left ghosts should be faintly visible, right ghosts should not
    const left = `rgb(${v(0.14)},${v(0.15)},${v(0.2)})`;
    const right = `rgb(${v(0.035)},${v(0.035)},${v(0.05)})`;
    const eyeL = `rgb(${v(0.03)},${v(0.03)},${v(0.05)})`;
    [[0.13, 0.42, 34], [0.3, 0.6, 40], [0.2, 0.8, 26]].forEach(([x, y, r]) => {
      drawMenuGhost(ctx, W * x, H * y, r, { body: left, eye: eyeL });
      drawMenuGhost(ctx, W * (1 - x), H * y, r, { body: right, eye: eyeL, flip: true });
    });
    ctx.fillStyle = 'rgba(243,231,196,0.8)';
    ctx.font = 'bold 14px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('VISIBLE', W * 0.25, 26);
    ctx.fillText('HIDDEN', W * 0.75, 26);
    const meter = this.$('bc-meter');
    meter.innerHTML = '';
    for (let i = 1; i <= 7; i++) {
      const el = document.createElement('i');
      if (i <= lvl) el.className = 'on';
      meter.appendChild(el);
    }
  }

  handleBrightness(I) {
    let lvl = this.game.options.brightness;
    if (this.hit(I, NAV.left)) lvl = Math.max(1, lvl - 1);
    if (this.hit(I, NAV.right)) lvl = Math.min(7, lvl + 1);
    if (lvl !== this.game.options.brightness) {
      this.game.setOption('brightness', lvl);
      this.sound.blip();
      this.renderBrightness();
    }
    if (this.hit(I, NAV.ok) || this.hit(I, ['Escape'])) {
      this.sound.confirm();
      this.game.goOptions(true);
    }
  }

  // =================================================================
  // PAUSE
  // =================================================================
  openPause() {
    this.pause.index = 0;
    this.pause.confirm = null;
    this.$('pause-confirm').classList.add('hidden');
    this.renderPause();
  }

  renderPause() {
    this.$('pause-menu').querySelectorAll('li').forEach((li, i) => li.classList.toggle('active', i === this.pause.index));
    const ctl = this.game.options.control;
    this.$('pause-standard').classList.toggle('on', ctl === 'standard');
    this.$('pause-lateral').classList.toggle('on', ctl === 'lateral');
  }

  setControl(ctl) {
    if (this.game.options.control === ctl) return;
    this.game.setOption('control', ctl);
    this.sound.blip();
    this.renderPause();
  }

  handlePause(I) {
    if (this.pause.confirm) {
      if (this.hit(I, NAV.left) || this.hit(I, NAV.right)) {
        this.setConfirmChoice('pause-confirm', this.pause.confirm.choice === 'yes' ? 'no' : 'yes');
      }
      if (this.hit(I, NAV.ok)) this.resolvePauseConfirm();
      if (this.hit(I, NAV.back)) {
        this.pause.confirm.choice = 'no';
        this.resolvePauseConfirm();
      }
      return;
    }
    if (this.hit(I, NAV.up) || this.hit(I, NAV.down)) {
      this.pause.index = 1 - this.pause.index;
      this.sound.blip();
      this.renderPause();
    }
    if (this.hit(I, NAV.left)) this.setControl('standard');
    if (this.hit(I, NAV.right)) this.setControl('lateral');
    if (this.hit(I, NAV.ok)) this.activatePause();
    if (this.hit(I, ['KeyP', 'Escape'])) this.game.togglePause();
  }

  activatePause() {
    if (this.pause.index === 0) {
      this.game.togglePause();
    } else {
      this.pause.confirm = { choice: 'no' };
      this.$('pause-confirm').classList.remove('hidden');
      this.setConfirmChoice('pause-confirm', 'no');
      this.sound.blip();
    }
  }

  resolvePauseConfirm() {
    const c = this.pause.confirm;
    if (!c) return;
    this.pause.confirm = null;
    this.$('pause-confirm').classList.add('hidden');
    if (c.choice === 'yes') {
      this.sound.confirm();
      this.game.goTitle();
    } else {
      this.sound.blip();
    }
  }

  // =================================================================
  // SAVE
  // =================================================================
  openSave(hero, fileIndex, { area = 0 } = {}) {
    this.save.index = 0;
    this.save.done = false;
    this.save.checkpoint = area > 0;
    drawSlotPortrait(this.$('save-portrait').getContext('2d'), 160, 160, { char: hero, label: `DATA ${fileIndex + 1}` });
    this.$('save-question').textContent = area > 0
      ? `Area ${area} cleared! Save your progress to DATA ${fileIndex + 1}?`
      : `Save your progress to DATA ${fileIndex + 1}?`;
    this.$('save-message').textContent = '';
    this.$('save-menu').classList.remove('hidden');
    const items = this.$('save-menu').querySelectorAll('li');
    if (items[1]) items[1].textContent = area > 0 ? 'KEEP PLAYING' : 'QUIT';
    this.renderSave();
  }

  renderSave() {
    this.$('save-menu').querySelectorAll('li').forEach((li, i) => li.classList.toggle('active', i === this.save.index));
  }

  handleSave(I) {
    if (this.save.done) {
      if (I.pressed.size > 0 || I.lmbPressed) this.game.afterSave();
      return;
    }
    if (this.hit(I, NAV.up) || this.hit(I, NAV.down)) {
      this.save.index = 1 - this.save.index;
      this.sound.blip();
      this.renderSave();
    }
    if (this.hit(I, NAV.ok)) this.activateSave();
  }

  activateSave() {
    if (this.save.done) return;
    this.save.done = true;
    this.$('save-menu').classList.add('hidden');
    if (this.save.index === 0) {
      this.game.saveFromMenu();
      this.sound.chime('gem');
      this.$('save-question').textContent = 'Game saving finished.';
    } else {
      this.sound.blip();
      this.$('save-question').textContent = this.save.checkpoint ? 'Not saved — onward!' : 'Your progress was not saved.';
    }
    this.$('save-message').textContent = this.save.checkpoint ? 'Press any key to keep exploring' : 'Press any key to continue';
  }
}
