import { THREE, G, V3, toon, basic, mk, LL, surf, puff, placeOn, orientOn, anyPerp } from './core.js?v=20261111q';
import { sfx, music } from './audio.js?v=20261111q';
import { P, spawnPlayer, model } from './player.js?v=20261111q';
import { World, addStars, addBackdropPlanet, fbm } from './world.js?v=20261111q';
import { play, shot } from './cutscene.js?v=20261111q';
import { buildStation, buildKnabbel, buildSaucer, buildKern, buildRocket, buildJosh, buildOtis, buildMilo, buildLars, buildBout } from './models.js?v=20261111q';

const T = (who, text, sub, extra = {}) => ({ say: { who, text, sub }, ...extra });

// ---------- Station Renas: the main menu backdrop and the intro ----------
export function buildIntro() {
  const w = new World('intro');
  w.sky = 'linear-gradient(180deg,#1a1840 0%,#3a3a7a 40%,#8a7ac8 75%,#ffc8e0 100%)';
  w.lights = [0xe0e6ff, 0x4a4a7a];
  addStars(w, 1600);
  addBackdropPlanet(w, V3(-60, 20, -90), 10, 0xff5ab4, 0xffd23a);    // Planeta Phonk
  addBackdropPlanet(w, V3(70, -10, -110), 9, 0xc89050);              // De Diepe Mijn
  addBackdropPlanet(w, V3(10, 50, -130), 11, 0x5cc85a, 0xfff8ec);    // Homerun Heuvel
  const steel = new THREE.Color(0xc8ccd8), steel2 = new THREE.Color(0xa8b0c4), line = new THREE.Color(0x7ac8ff);
  const pl = w.addPlanet({ c: V3(0, 0, 0), r: 9, atmo: 0x7ac8ff, atmoOp: 0.1, paint: (p, out) => {
    const n = fbm(p, 3); out.copy(n > 0.55 ? steel : steel2);
    if (Math.abs(Math.sin(Math.atan2(p.x, p.z) * 8)) < 0.04 || Math.abs(Math.sin(Math.asin(p.y) * 8)) < 0.04) out.copy(line);
  } });
  w.main = pl;
  const up = LL(0, 0);
  w.spawn = { dir: LL(-28, 18), fwd: V3(0, 1, 0) };
  const st = buildStation(); w.put(pl, st.g, up, 0, Math.PI); w.station = st;
  w.addSolid(pl, up, 2.4, 3);
  const kn = buildKnabbel(); w.put(pl, kn.g, LL(-24, -34), 0, 0.8); w.knabbel = kn;
  w.updaters.push((dt, t) => { kn.jaw.position.y = 0.6 + Math.abs(Math.sin(t * 5)) * -0.08; kn.rock.rotation.y = Math.sin(t) * 0.2; });
  // the crate with the three energy cores
  const tin = new THREE.Group();
  mk(new THREE.BoxGeometry(1.3, 0.8, 1.0), toon(0x6a7a96), 0, 0.4, 0, tin, 1.08);
  for (const x of [-0.5, 0.5]) mk(new THREE.BoxGeometry(0.12, 0.84, 1.04), toon(0xffd23a), x, 0.4, 0, tin, 0);
  mk(new THREE.BoxGeometry(0.5, 0.06, 0.3), basic(0x5ef2e0), 0, 0.82, 0, tin, 0);
  w.put(pl, tin, LL(-36, -6), 0); w.tin = tin;
  const sc = buildSaucer(); sc.saucer.visible = false; w.group.add(sc.saucer); w.saucer = sc;
  const rk = buildRocket(); w.put(pl, rk.g, LL(-34, 48), 0); w.rocket = rk;
  w.upAt = (pos) => pos.clone().normalize();
  // the three cores flying off
  w.flyers = [];
  w.updaters.push((dt) => { for (const f of w.flyers) { f.g.position.addScaledVector(f.v, dt); f.g.rotation.y += dt * 4; puff(f.g.position.clone(), 1, 0x5ef2e0, 0.5, 0.2); } });
  return w;
}
export function menuShot(w) {
  return (t) => {
    const a = Math.sin(t * 0.12) * 0.9 + 0.6;
    const c = surf(w.main, LL(-28, 18), 1.2), u = LL(-28, 18);
    const side = anyPerp(u).applyAxisAngle(u, a);
    return { pos: c.clone().addScaledVector(u, 3.2).addScaledVector(side, 8.5), look: c.clone().addScaledVector(u, 2.2), up: u };
  };
}

export function playIntro(w, onDone) {
  const pl = w.main;
  spawnPlayer(pl, w.spawn.dir, w.spawn.fwd);
  const atR = () => { const u = P.up; const side = anyPerp(u); return { pos: P.pos.clone().addScaledVector(u, 1.6).addScaledVector(P.fwd, 3.2).addScaledVector(side, 1.2), look: P.pos.clone().addScaledVector(u, 1.1), up: u }; };
  const kn = w.knabbel.g.position, knUp = kn.clone().normalize();
  const atK = () => ({ pos: kn.clone().addScaledVector(knUp, 2).add(V3(2.5, 0, 2)), look: kn.clone().addScaledVector(knUp, 0.8), up: knUp });
  const tinPos = w.tin.position.clone(), tinUp = tinPos.clone().normalize();
  const sc = w.saucer;
  const sAt = tinPos.clone().addScaledVector(tinUp, 6);
  const wide = (t) => ({ pos: V3(Math.sin(t * 0.15) * 22, 9, 22), look: V3(0, 2, 0), up: V3(0, 1, 0) });
  const atS = () => ({ pos: sc.saucer.position.clone().add(V3(3, -1.5, 5)), look: sc.saucer.position.clone(), up: V3(0, 1, 0) });
  const steps = [
    { dur: 4.2, title: ['Station Renas', 'One week after Otis in Orbit'], cam: wide, skippable: true },
    T('RÊNAS', 'Captain’s log, day 7. The station works great. Knabbel only ate one solar panel. A small one.', null, { cam: atR }),
    T('KNABBEL', 'HAP.', null, { cam: atK, start: () => sfx.hap() }),
    T('RENAS-1', 'Incoming call. It is Josh.', null, { cam: atR }),
    T('JOSH', '(radio) Kleine broer! Julie built you three Energiekernen for the station engine. With those you can fly anywhere.', null, { cam: atR }),
    T('JOSH', '(radio) They’re in the crate on the deck. Don’t let Knabbel eat them.', null, { cam: () => ({ pos: tinPos.clone().addScaledVector(tinUp, 2.5).add(V3(2, 0, 2)), look: tinPos, up: tinUp }) }),
    T('RÊNAS', 'Josh, I’m a captain. Captains don’t lose energy cores.', null, { cam: atR }),
    T('JOSH', '(radio) Sure thing, Captain Rênas Binas.', null, { cam: atR }),
    T('RÊNAS', 'Hey! Only Lars gets to call me Binas. He’s my bestie!', null, { cam: atR }),
    { dur: 2.4, cam: () => ({ pos: tinPos.clone().addScaledVector(tinUp, 3).add(V3(6, 0, 6)), look: sAt, up: tinUp }),
      start: () => { sc.saucer.visible = true; sc.saucer.position.copy(sAt).add(V3(-40, 20, -30)); G.shake = 0.3; sfx.whoosh(); sfx.meow(); },
      update: (dt, k) => { sc.saucer.position.lerpVectors(sAt.clone().add(V3(-40, 20, -30)), sAt, 1 - (1 - k) ** 3); orientOn(sc.saucer, tinUp, V3(1, 0, 0)); } },
    T('KAYO', 'Miauw.', '(RENAS-1 translates: “Three glowing cores. Unguarded.”)', { cam: atS }),
    T('YARA', 'Miauw miauw.', '(RENAS-1 translates: “Guarded by a child. In a fishbowl.”)', { cam: atS }),
    { dur: 2.2, cam: () => ({ pos: tinPos.clone().addScaledVector(tinUp, 2).add(V3(5, 0, 5)), look: tinPos.clone().addScaledVector(tinUp, 3), up: tinUp }),
      start: () => { sc.beam.visible = true; sfx.launch(); },
      update: (dt, k) => { w.tin.position.copy(tinPos).addScaledVector(tinUp, k * 5); w.tin.rotation.y += dt * 3; } },
    T('RÊNAS', 'HEY! You’re the cats who blew Lars’ hat off! And left that light-eating monster on Milo’s moon!', null, { cam: atR, start: () => { w.tin.visible = false; sc.beam.visible = false; } }),
    { dur: 2.6, cam: wide,
      start: () => {
        sfx.boom(); G.shake = 0.5;
        const from = sc.saucer.position.clone();
        puff(from, 30, 0x5ef2e0, 6, 2, V3(0, 1, 0));
        for (const target of [V3(-60, 20, -90), V3(70, -10, -110), V3(10, 50, -130)]) {
          const g = buildKern(1.4); g.position.copy(from); w.group.add(g);
          w.flyers.push({ g, v: target.clone().sub(from).multiplyScalar(0.4) });
        }
      },
      update: (dt) => { sc.saucer.position.add(V3(30 * dt, 12 * dt, -20 * dt)); } },
    T('RENAS-1', 'The crate broke open and the cores are gone. Something big has picked up every core. I count fourteen planets with signals. The closest one: Planeta Phonk.', null, { cam: wide, start: () => (sc.saucer.visible = false) }),
    T('JOSH', '(radio) Rênas? Stay there! Otis and I are coming. Give me a few days, the rocket is—', null, { cam: atR }),
    T('OTIS', '(radio) *WOOF WOOF!*', '(RENAS-1 translates: “KLEINE JOSH! WE’RE COMING! IS THERE FOOD?”)', { cam: atR, start: () => sfx.bark() }),
    T('RÊNAS', 'No. Josh saved a whole galaxy by himself. I can do fourteen planets. …Probably.', null, { cam: atR }),
    T('RÊNAS', '…Mostly by myself. Knabbel, guard the station!', null, { cam: atR }),
    T('KNABBEL', 'HAP.', null, { cam: atK, start: () => sfx.hap() }),
    { dur: 3.6, title: ['BINAS IN ORBIT', 'Fourteen planets. Eleven bosses. One little brother.'], titleMs: 3300,
      cam: () => { const rp = w.rocket.g.position, ru = rp.clone().normalize(); return { pos: rp.clone().addScaledVector(ru, 3).add(V3(6, 0, 6)), look: rp.clone().addScaledVector(ru, 4 + w.rocketUp * 0.5), up: ru }; },
      start: () => { w.rocketUp = 0; P.hidden = true; w.rocket.fire.visible = true; sfx.launch(); },
      update: (dt, k) => { w.rocketUp = k * k * 30; const rp = surf(pl, LL(-34, 48), w.rocketUp); w.rocket.g.position.copy(rp); if (Math.random() < 0.6) puff(rp.clone(), 2, 0xffb03a, 3, 0.5, rp.clone().normalize()); } },
  ];
  music('menu');
  play(steps, () => { P.hidden = false; onDone(); });
}

// ---------- Finale on Homerun Heuvel ----------
export function playFinale(w, onDone) {
  const pl = w.main;
  const home = LL(2, 2);
  spawnPlayer(pl, home, V3(0, 1, 0));
  const put = (m, dir, yaw = 0) => { w.put(pl, m, dir, 0, yaw); return m; };
  const milo = buildMilo(), lars = buildLars(), josh = buildJosh(), otis = buildOtis();
  put(milo.root, LL(-6, -2)); put(lars.root, LL(5, -5));
  josh.root.visible = false; otis.root.visible = false;
  put(josh.root, LL(-2, 6)); put(otis.root, LL(1, 7));
  milo.root.visible = false; lars.root.visible = false;
  const rk = buildRocket(); const rDir = LL(-1, 11); w.group.add(rk.g); rk.g.visible = false;
  const sc = buildSaucer(); w.group.add(sc.saucer); sc.saucer.visible = false;
  const big = buildKern(2.2); w.group.add(big); placeOn(big, pl, home, 2.6);
  const nat = w.npcs[0];
  // face things toward Rênas
  const face = (m) => { const d = m.position.clone().normalize(); orientOn(m, d, P.pos.clone().sub(m.position)); };
  const atR = () => ({ pos: P.pos.clone().addScaledVector(P.up, 1.7).add(V3(0, 0, 0)).addScaledVector(V3(0, 0, 1), 0).addScaledVector(P.fwd, 3.2).addScaledVector(anyPerp(P.up), 1.4), look: P.pos.clone().addScaledVector(P.up, 1.1), up: P.up.clone() });
  const group = () => ({ pos: surf(pl, LL(-14, 1), 4), look: surf(pl, LL(2, 1), 1), up: LL(-14, 1) });
  const sAt = surf(pl, home, 7);
  const atS = () => ({ pos: sc.saucer.position.clone().add(V3(4, -2, 5)), look: sc.saucer.position.clone(), up: P.up.clone() });
  const steps = [
    T('RÊNAS', 'Three cores. Fourteen planets. Eleven bosses. All by myself!', null, { cam: atR, start: () => { music('finale'); sfx.win(); } }),
    { dur: 2, cam: () => ({ pos: surf(pl, home, 3).add(V3(6, 0, 6)), look: sAt, up: P.up.clone() }),
      start: () => { sc.saucer.visible = true; sfx.meow(); G.shake = 0.3; },
      update: (dt, k) => { sc.saucer.position.lerpVectors(sAt.clone().add(V3(40, 25, 10)), sAt, 1 - (1 - k) ** 3); orientOn(sc.saucer, P.up, V3(1, 0, 0)); } },
    T('KAYO', 'Miauw.', '(RENAS-1 translates: “Hand over the cores, small human.”)', { cam: atS, start: () => (sc.beam.visible = true) }),
    T('YARA', 'Miauw miauw.', '(RENAS-1 translates: “Or we take them. We are very good at taking things.”)', { cam: atS }),
    T('NATHAN', 'Wait. Is that… *sniff*… CATS?', null, { cam: () => ({ pos: nat.g.position.clone().addScaledVector(nat.dir, 1.8).add(V3(1.5, 0, 2.5)), look: nat.g.position.clone().addScaledVector(nat.dir, 1.5), up: nat.dir.clone() }) }),
    { dur: 2.6, say: { who: 'NATHAN', text: 'Ha… ha… HA… HATSJOEEEEEE!!!' }, cam: atS,
      start: () => { setTimeout(() => { sfx.sneeze(); G.shake = 1; puff(nat.g.position.clone().addScaledVector(nat.dir, 1.6), 40, 0xffffff, 8, 1, nat.dir); }, 900); },
      update: (dt, k, t) => { if (t > 1) { sc.saucer.rotation.z = Math.sin(t * 20) * 0.5; sc.beam.visible = false; } } },
    T('KAYO', 'MIAUUUUW!', '(RENAS-1 translates: “This isn’t over!”)', { cam: atS, update: (dt, k, t) => { sc.saucer.position.add(V3(-25 * dt, 20 * dt, -10 * dt)); sc.saucer.rotation.y += dt * 8; } }),
    T('MILO', '¡Qué sneeze! I got that on camera. That’s the outro of the edit.', null, { cam: group, start: () => { sc.saucer.visible = false; milo.root.visible = true; lars.root.visible = true; face(milo.root); face(lars.root); } }),
    T('LARS', 'Hi Binas! I took the mine cart. It goes a lot further than you’d think.', null, { cam: group }),
    T('NATHAN', 'LARS! *HATSJOE!* Secret handshake? All eleven minutes?', null, { cam: group }),
    T('LARS', 'All eleven minutes. Starting… now.', null, { cam: group }),
    { dur: 2.4, cam: () => ({ pos: surf(pl, rDir, 2).add(V3(6, 2, 7)), look: rk.g.position.clone(), up: P.up.clone() }),
      start: () => { rk.g.visible = true; rk.fire.visible = true; sfx.launch(); },
      update: (dt, k) => { placeOn(rk.g, pl, rDir, (1 - k) ** 2 * 26, 0.4); if (k > 0.98) rk.fire.visible = false; } },
    T('OTIS', '*WOOF WOOF!* *licks helmet*', '(RENAS-1 translates: “KLEINE JOSH! Your helmet still tastes like window!”)', { cam: atR, start: () => { otis.root.visible = true; josh.root.visible = true; face(otis.root); face(josh.root); sfx.bark(); } }),
    T('JOSH', 'Rênas! I came as fast as I could… wait. Fourteen planets? Eleven bosses? By yourself?', null, { cam: () => { const jp = josh.root.position, ju = jp.clone().normalize(); return { pos: jp.clone().addScaledVector(ju, 1.7).add(V3(1.5, 0, 3)), look: jp.clone().addScaledVector(ju, 1.4), up: ju }; } }),
    T('RÊNAS', 'Well… almost by myself.', null, { cam: atR }),
    T('JOSH', 'Ha. You sound just like me.', null, { cam: group }),
    T('NATHAN', '*HATSJOE!* …Sorry. That one was for Otis.', null, { cam: group, start: () => sfx.sneeze() }),
    T('RENAS-1', 'All three Energiekernen are back. Station engine: ready. Destination: anywhere.', null, { cam: group }),
    T('RÊNAS', 'Josh? Next time, I’m the captain.', null, { cam: atR }),
    { dur: 4, title: ['THE END…?', 'Somewhere out there, two cats are making a plan.'], titleMs: 3800, cam: (t) => ({ pos: surf(pl, home, 0).add(V3(Math.sin(t * 0.2) * 14, 8, 14)), look: surf(pl, home, 1), up: P.up.clone() }) },
  ];
  play(steps, () => onDone());
  void shot; void buildBout; void basic; void toon; void mk;
}
