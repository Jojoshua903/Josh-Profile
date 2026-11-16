// ==========================================================
// Quests.js — the rest of WIDR 64 ran into the mansion after the
// trapped teammate and got scattered. Each one waits somewhere inside
// with a favour to ask. Help them and they JOIN THE TEAM: they become
// playable straight away (switch heroes with T / pad B) and stay
// unlocked on the hero select screen for every run after.
//
// Quest types:
//   items   — find glowing objects hidden in other rooms (walk over them)
//   ghosts  — catch N ghosts after accepting
//   cash    — collect $N of treasure after accepting
//   element — stun N element ghosts with the element spray
//   candles — light every candle in N rooms
//   boss    — catch a specific portrait boss
// ==========================================================
import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { ROOM_IDS as R } from '../config.js';
import { getCharacter } from '../characters.js';
import { buildHero } from '../graphics/models.js';
import { makeGlowTexture } from '../graphics/textures.js';
import { ROOM_DEFS } from '../world/MansionBuilder.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export const QUESTS = {
  milo: {
    room: R.HALLWAY, at: [-13, 3.2], icon: '⚡', type: 'ghosts', goal: 6,
    task: 'Catch {n} ghosts', short: 'Ghosts caught',
    meet: [
      'Whoa, {h}! Careful, my staff is still crackling. I zapped the first ghost I saw and it just... laughed at me.',
      'Lightning alone won\'t do it. Catch 6 ghosts with that vacuum and show me how it\'s done, and I\'m in!',
    ],
    ready: 'Six ghosts! Okay, that settles it. Lightning plus vacuum: we\'re unstoppable.',
    join: 'Milo\'s Thunder Siphon hits hard in a tug-of-war, but he can\'t take many hits.',
  },
  josh: {
    room: R.STUDY, at: [-31, -3], icon: '🔧', type: 'items', goal: 3,
    task: 'Find Josh\'s 3 radar parts', short: 'Radar parts',
    items: [
      { room: R.WEST_HALL, at: [-21, -24], name: 'antenna', kind: 'antenna' },
      { room: R.LIBRARY, at: [-29, -27], name: 'circuit board', kind: 'chip' },
      { room: R.CONSERVATORY, at: [-6, -30], name: 'battery', kind: 'battery' },
    ],
    meet: [
      '{h}! Thank goodness. A ghost stole my scanner and threw the pieces all over the West Wing.',
      'I need the antenna, the circuit board and the battery. They\'ll be glowing, you can\'t miss them. Find all three and I\'ll join you!',
    ],
    ready: 'Antenna, board, battery... and done! Scanner\'s back online. Let\'s go ghost hunting.',
    join: 'Josh has a wider beam, a fast stun recharge, and his radar pings hidden ghosts.',
  },
  reshman: {
    room: R.WEST_HALL, at: [-21, -8], icon: '🕯️', type: 'candles', goal: 2, mute: true,
    task: 'Light the candles in {n} rooms', short: 'Rooms with candles lit',
    meet: [
      '( Reshman steps out of the shadows and points at an unlit candle. Then at the darkness. He shivers. )',
      '( He holds up two fingers: light every candle in two rooms. Suck fire from a fireplace or brazier, then spray it at the candles. )',
    ],
    ready: '( Reshman watches the candlelight flicker and gives a slow, happy nod. )',
    join: 'Reshman moves silently, so ghosts notice him late, and he dodges well.',
  },
  fionn: {
    room: R.GUEST_ROOM, at: [21, -95], icon: '💎', type: 'cash', goal: 50000,
    task: 'Collect {n} of treasure', short: 'Treasure collected',
    meet: [
      'Top of the mornin\', {h}! This mansion is a geologist\'s dream: gems in every cupboard!',
      'Tell you what: gather {n} of treasure and I\'ll know you\'ve got the knack. Then I\'ll come with you.',
    ],
    ready: 'Would you look at that haul! Grand. Count me in, and I\'ll help you find even more.',
    join: 'Fionn gets extra coins, bills and rare gems from ghosts and furniture.',
  },
  daniel: {
    room: R.UPPER_HALL, at: [-6, -96], icon: '💣', type: 'boss', boss: 'pip', goal: 1,
    task: 'Catch Pip in the Nursery', short: 'Pip caught',
    meet: [
      '{h}! Some tiny ghost in the Nursery nicked my detonator. Little Pip. Keeps giggling at me.',
      'I\'d blow the door off, but... it\'s a nursery. Catch Pip for me and I\'ll join up. Boom!',
    ],
    ready: 'You got Pip! And my detonator, still in one piece. Right, where do we blow things up first?',
    join: 'Daniel\'s flash sets off a stun shockwave all around him.',
  },
  renas: {
    room: R.EAST_HALL, at: [23, 15], icon: '🛠️', type: 'element', goal: 3,
    task: 'Stun {n} element ghosts with the spray', short: 'Element ghosts stunned',
    meet: [
      'Psst, {h}! I\'m testing the Professor\'s element nozzle. Fire, water, ice: the theory is solid!',
      'I just need field data. Stun 3 element ghosts with the spray and I\'ll join you. Remember: water beats fire, ice beats water, fire beats ice.',
    ],
    ready: 'Three for three! The data is perfect. Okay, I\'m officially on the team!',
    join: 'Renas moves quickly and grabs ghosts again super fast after they break free.',
  },
  lars: {
    room: R.WINE_CELLAR, at: [-16, 106], icon: '⛏️', type: 'items', goal: 2,
    task: 'Find Lars\'s pickaxe and headlamp', short: 'Mining gear',
    items: [
      { room: R.BOILER_ROOM, at: [13, 109], name: 'pickaxe', kind: 'pickaxe' },
      { room: R.CRYPT, at: [-2, 88], name: 'headlamp', kind: 'lamp' },
    ],
    meet: [
      'Hrmph! {h}! A dwarf without his pickaxe and headlamp is just a short fellow in the dark.',
      'The ghosts dragged them off, one to the Boiler Room, one into the Crypt. Bring them back and Lars, Kayo and Yara are yours.',
    ],
    ready: 'My pickaxe! My lamp! Kayo, Yara, we\'re back in business. Lead on!',
    join: 'Lars resists ghost pulls, his headlamp lights the way, and his cats tag along.',
  },
};

// how a locked hero is unlocked, for the select screen
export function questHint(id) {
  const q = QUESTS[id];
  if (!q) return 'Rescue them from the cursed painting';
  const room = ROOM_DEFS[q.room] ? ROOM_DEFS[q.room].name.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : 'mansion';
  return `Find them in the ${room} and help with their quest`;
}

const money = (v) => '$' + Math.round(v).toLocaleString('en-US');
const fmtGoal = (q) => (q.type === 'cash' ? money(q.goal) : String(q.goal));

// small glowing quest objects
function buildItem(kind) {
  const g = new THREE.Group();
  const m = (c, e = 0x000000) => new THREE.MeshStandardMaterial({ color: c, emissive: e, metalness: 0.5, roughness: 0.4 });
  const add = (geo, mat, x = 0, y = 0, z = 0, rx = 0, rz = 0) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, 0, rz);
    g.add(mesh);
    return mesh;
  };
  switch (kind) {
    case 'antenna':
      add(new THREE.CylinderGeometry(0.02, 0.03, 0.6, 6), m(0xb0b8c0));
      add(new THREE.SphereGeometry(0.06, 8, 6), m(0xff4040, 0xaa1010), 0, 0.32, 0);
      break;
    case 'chip':
      add(new THREE.BoxGeometry(0.42, 0.04, 0.3), m(0x1f8a3a, 0x0a3a14));
      add(new THREE.BoxGeometry(0.14, 0.05, 0.14), m(0x202020), 0, 0.03, 0);
      break;
    case 'battery':
      add(new THREE.CylinderGeometry(0.1, 0.1, 0.36, 10), m(0x2f6fd6, 0x0a2050));
      add(new THREE.CylinderGeometry(0.04, 0.04, 0.05, 8), m(0xd0d0d0), 0, 0.2, 0);
      break;
    case 'pickaxe':
      add(new THREE.CylinderGeometry(0.025, 0.025, 0.7, 6), m(0x8a5a2a), 0, 0, 0, 0, 0.5);
      add(new THREE.BoxGeometry(0.55, 0.06, 0.06), m(0x9aa0a8), -0.16, 0.3, 0, 0, 0.5);
      break;
    case 'lamp':
      add(new THREE.TorusGeometry(0.16, 0.025, 6, 16), m(0x5a3a1a), 0, 0, 0, Math.PI / 2);
      add(new THREE.CylinderGeometry(0.07, 0.09, 0.1, 10), m(0xfff0a0, 0xffd040), 0, 0.02, 0.16, Math.PI / 2);
      break;
    default:
      add(new THREE.OctahedronGeometry(0.18), m(0xffd23a, 0x664400));
  }
  return g;
}

function glow(color, size) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeGlowTexture(color), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.scale.setScalar(size);
  return s;
}

// "!" / "★" bubble above an NPC's head
function markerTexture(text, bg) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.strokeStyle = '#1a1020';
  g.lineWidth = 5;
  g.beginPath();
  g.arc(32, 30, 24, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.fillStyle = '#1a1020';
  g.font = 'bold 34px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 32, 32);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class QuestSystem {
  constructor(game, saved = null) {
    this.game = game;
    this.npcs = [];
    this.items = [];
    this.marks = {
      new: markerTexture('!', '#ffe27a'),
      active: markerTexture('…', '#bfe6ff'),
      ready: markerTexture('★', '#7dff9a'),
    };
    const P = game.progress;
    for (const [id, q] of Object.entries(QUESTS)) {
      const char = getCharacter(id);
      if (!char || char.id !== id) continue;
      if (P.isUnlocked(id) || id === game.char.id || id === game.trappedChar.id) continue;
      const s = (saved && saved[id]) || {};
      this.addNpc(id, q, char, s);
    }
  }

  addNpc(id, q, char, s) {
    const scene = this.game.scene;
    const hero = buildHero(char);
    const sc = (char.stats && char.stats.scale) || 1;
    hero.group.scale.setScalar(sc);
    hero.group.position.set(q.at[0], 0, q.at[1]);
    hero.group.rotation.y = 0; // facing the camera
    // they're waiting, not hunting: hide the vacuum hose glow but keep the pack
    scene.add(hero.group);
    const halo = glow('#fff2c0', 2.6);
    halo.position.set(0, 1.1, 0);
    hero.group.add(halo);
    const mark = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.marks.new, transparent: true, depthWrite: false }));
    mark.scale.setScalar(0.55);
    mark.position.set(0, 2.45 / sc, 0);
    hero.group.add(mark);
    const npc = {
      id, q, char, hero, mark, halo,
      stage: s.stage || 'waiting', // waiting → active → ready → joined
      count: s.count || 0,
      found: new Set(s.found || []),
      phase: Math.random() * 6,
    };
    this.npcs.push(npc);
    if (q.type === 'items') {
      for (const it of q.items) {
        if (npc.found.has(it.kind)) continue;
        const mesh = buildItem(it.kind);
        const g = glow('#ffe27a', 1.4);
        mesh.add(g);
        mesh.position.set(it.at[0], 0.9, it.at[1]);
        mesh.visible = npc.stage === 'active';
        scene.add(mesh);
        this.items.push({ npc, def: it, mesh, spin: Math.random() * 6 });
      }
    }
    this.refreshMark(npc);
  }

  refreshMark(npc) {
    const key = npc.stage === 'waiting' ? 'new' : npc.stage === 'ready' ? 'ready' : 'active';
    npc.mark.material.map = this.marks[key];
    npc.mark.material.needsUpdate = true;
  }

  // the NPC the hero can talk to right now (same room, close enough)
  nearest(pos, roomId) {
    let best = null;
    let bd = 2.3;
    for (const n of this.npcs) {
      if (n.stage === 'joined' || n.q.room !== roomId) continue;
      const p = n.hero.group.position;
      const d = Math.hypot(p.x - pos.x, p.z - pos.z);
      if (d < bd) {
        bd = d;
        best = n;
      }
    }
    return best;
  }

  promptFor(npc) {
    return npc.stage === 'ready' ? `welcome ${npc.char.name} to the team!` : `talk to ${npc.char.name}`;
  }

  fill(npc, s) {
    return s.replace(/\{h\}/g, this.game.char.name).replace(/\{n\}/g, fmtGoal(npc.q));
  }

  taskText(npc) {
    return this.fill(npc, npc.q.task);
  }

  // ---------------------------------------------------------------
  talk(npc) {
    const game = this.game;
    if (npc.stage === 'waiting') {
      game.cutscene.playNow(this.meetScene(npc), {
        onEnd: () => {
          npc.stage = 'active';
          if (npc.q.type === 'candles') npc.count = game.elements.solved.size;
          this.items.forEach((it) => { if (it.npc === npc) it.mesh.visible = true; });
          this.check(npc);
          this.refreshMark(npc);
          game.hud.toast(`${npc.q.icon} New quest: ${this.taskText(npc)}`, 'sticker');
          game.sound.chime('pearl');
          this.renderTracker();
        },
      });
    } else if (npc.stage === 'active') {
      game.sound.talk(1, false);
      game.hud.toast(`${npc.q.icon} ${npc.char.name}: ${this.taskText(npc)} (${this.progressText(npc)})`, 'info');
    } else if (npc.stage === 'ready') {
      game.cutscene.playNow(this.joinScene(npc), { onEnd: () => this.renderTracker() });
    }
  }

  progressText(npc) {
    const q = npc.q;
    if (q.type === 'cash') return `${money(Math.min(q.goal, npc.count))} / ${money(q.goal)}`;
    if (q.type === 'items') return `${npc.found.size} / ${q.goal}`;
    return `${Math.min(q.goal, npc.count)} / ${q.goal}`;
  }

  speaker(npc, cs) {
    return cs.hero(npc.char, npc.q.mute ? '' : 'WIDR 64');
  }

  // camera framing the hero and the teammate side by side
  frame(npc) {
    const game = this.game;
    const a = game.player.pos;
    const b = npc.hero.group.position;
    const mid = V((a.x + b.x) / 2, 0, (a.z + b.z) / 2);
    return {
      pos: mid.clone().add(V(0, 3.4, 5.2)),
      look: mid.clone().setY(1.1),
      heroFace: Math.atan2(b.x - a.x, b.z - a.z),
      npcFace: Math.atan2(a.x - b.x, a.z - b.z),
    };
  }

  meetScene(npc) {
    const game = this.game;
    const f = this.frame(npc);
    return (cs) => [
      { cam: { pos: f.pos, look: f.look }, dur: 0.8 },
      { face: f.heroFace, dur: 0.3 },
      { do: () => {
        npc.hero.group.rotation.y = f.npcFace;
        game.fx.sparkle(npc.hero.group.position.clone().setY(2.2), npc.char.colors.primary, 14);
      } },
      { say: cs.hero(game.char), text: game.char.id === 'reshman' ? `( Reshman waves both arms at ${npc.char.name}, delighted. )` : npc.q.mute ? 'Reshman?! You were here the whole time?' : `${npc.char.name}! You're okay!` },
      ...npc.q.meet.map((t) => ({ say: this.speaker(npc, cs), text: this.fill(npc, t) })),
      { title: `${npc.q.icon} QUEST`, sub: this.taskText(npc).toUpperCase(), dur: 1.8, hold: true },
      cs.backToPlay(0.7),
    ];
  }

  joinScene(npc) {
    const game = this.game;
    const f = this.frame(npc);
    const first = !game.cutscene.seen.has('teamJoin');
    game.cutscene.seen.add('teamJoin');
    return (cs) => [
      { cam: { pos: f.pos, look: f.look }, dur: 0.8 },
      { face: f.heroFace, dur: 0.3 },
      { do: () => { npc.hero.group.rotation.y = f.npcFace; } },
      { say: this.speaker(npc, cs), text: this.fill(npc, npc.q.ready) },
      { do: () => {
        this.join(npc);
        game.sound.unlock();
        game.fx.sparkle(npc.hero.group.position.clone().setY(1.2), npc.char.colors.primary, 36);
        game.fx.ring(npc.hero.group.position.clone().setY(0.1), npc.char.colors.primary, 2.2);
        cs.addShake(0.15);
      } },
      { title: `${npc.char.name.toUpperCase()} JOINED THE TEAM!`, sub: game.btn('PRESS T TO SWITCH HEROES', 'PRESS B TO SWITCH HEROES').replace(/<[^>]+>/g, ''), dur: 2.4, hold: true },
      ...(first ? [
        { say: cs.prof(), text: `Koç here! Splendid, ${npc.char.name} is with you now. Press ${game.btn('T', 'B').replace(/<[^>]+>/g, '')} at any time to swap heroes. Everyone has their own strengths, so pick the right one for each room!` },
      ] : []),
      { say: cs.narrator(), text: npc.q.join },
      { do: () => {
        game.fx.puff(npc.hero.group.position.clone().setY(0.6), 0xe8f0ff, 18);
        npc.hero.group.visible = false;
      } },
      cs.backToPlay(0.7),
    ];
  }

  join(npc) {
    const game = this.game;
    npc.stage = 'joined';
    if (game.progress.unlockHero(npc.id)) game.progress.save();
    game.hud.toast(`🤝 ${npc.char.name} joined the team! (${game.btn('T', 'B').replace(/<[^>]+>/g, '')} to switch)`, 'sticker');
    if (this.npcs.every((n) => n.stage === 'joined')) game.unlock('full_team');
    game.refreshTeamBar();
  }

  // ---------------------------------------------------------------
  // progress hooks (called by the game)
  bump(type, amount = 1, filter = null) {
    for (const n of this.npcs) {
      if (n.stage !== 'active' || n.q.type !== type) continue;
      if (filter && !filter(n)) continue;
      n.count += amount;
      this.check(n);
    }
    this.renderTracker();
  }

  onCapture(g) {
    this.bump('ghosts', 1);
    if (g.isBoss) this.bump('boss', 1, (n) => n.q.boss === g.bossId);
  }

  onCash(v) {
    if (v > 0) this.bump('cash', v);
  }

  onElementStun() {
    this.bump('element', 1);
  }

  check(npc) {
    if (npc.stage !== 'active') return;
    const q = npc.q;
    let done;
    if (q.type === 'items') done = npc.found.size >= q.goal;
    else if (q.type === 'candles') done = this.game.elements.solved.size >= q.goal;
    else done = npc.count >= q.goal;
    if (q.type === 'candles') npc.count = this.game.elements.solved.size;
    if (!done) return;
    npc.stage = 'ready';
    this.refreshMark(npc);
    this.game.sound.chime('gem');
    const room = ROOM_DEFS[q.room] ? ROOM_DEFS[q.room].name : 'mansion';
    this.game.hud.toast(`${q.icon} Quest complete! Go back to ${npc.char.name} in the ${room.toLowerCase()}.`, 'sticker');
  }

  update(dt, t) {
    const game = this.game;
    const pos = game.player.pos;
    for (const n of this.npcs) {
      if (n.stage === 'joined') continue;
      const h = n.hero;
      if (h.animate) h.animate(t + n.phase, 0, dt);
      n.mark.position.y = 2.45 / h.group.scale.x + Math.sin(t * 3 + n.phase) * 0.08;
      // first time in their room: the radar picks them up
      if (!n.spotted && n.q.room === game.currentRoomId) {
        n.spotted = true;
        if (n.stage === 'waiting') {
          game.sound.talk(0.8, true);
          game.hud.toast(`📟 Koç Radar: a friendly signal in this room... it's ${n.char.name}!`, 'info');
        }
      }
      if (n.stage === 'active' && n.q.type === 'candles' && game.elements.solved.size !== n.count) {
        this.check(n);
        this.renderTracker();
      }
    }
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      if (!it.mesh.visible) continue;
      it.spin += dt;
      it.mesh.rotation.y = it.spin * 1.6;
      it.mesh.position.y = 0.9 + Math.sin(it.spin * 2.4) * 0.12;
      const d = Math.hypot(it.mesh.position.x - pos.x, it.mesh.position.z - pos.z);
      if (d < 1.1) {
        it.npc.found.add(it.def.kind);
        game.scene.remove(it.mesh);
        this.items.splice(i, 1);
        game.sound.chime('bill');
        game.fx.sparkle(it.mesh.position, 0xffe27a, 20);
        game.hud.toast(`${it.npc.q.icon} Found ${it.npc.char.name}'s ${it.def.name}! (${it.npc.found.size} / ${it.npc.q.goal})`, 'info');
        this.check(it.npc);
        this.renderTracker();
      }
    }
  }

  // ---------------------------------------------------------------
  renderTracker() {
    const el = document.getElementById('quest-tracker');
    if (!el) return;
    const rows = this.npcs.filter((n) => n.stage === 'active' || n.stage === 'ready');
    el.classList.toggle('hidden', !rows.length);
    el.innerHTML = rows.map((n) => `<div class="qt-row${n.stage === 'ready' ? ' ready' : ''}">
      <span class="qt-ico">${n.q.icon}</span>
      <span class="qt-text"><b>${n.char.name}</b> ${n.stage === 'ready' ? 'Go back and talk to them!' : this.taskText(n)}</span>
      <span class="qt-count">${n.stage === 'ready' ? '★' : this.progressText(n)}</span>
    </div>`).join('');
  }

  serialize() {
    const out = {};
    for (const n of this.npcs) {
      if (n.stage === 'joined') continue;
      out[n.id] = { stage: n.stage, count: n.count, found: [...n.found] };
    }
    return out;
  }

  dispose() {
    for (const n of this.npcs) this.game.scene && this.game.scene.remove(n.hero.group);
    for (const it of this.items) this.game.scene && this.game.scene.remove(it.mesh);
    this.npcs = [];
    this.items = [];
    const el = document.getElementById('quest-tracker');
    if (el) el.classList.add('hidden');
  }
}

