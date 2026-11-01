// Character creator (locked options unlock through achievements)
function openCreator(look, title, onDone){
  let L = JSON.parse(JSON.stringify(look));
  const m = document.getElementById('modal');
  const lk = (f, v) => { const a = lockOf(f, v); return a ? ` locked" data-lock="${escH(a.ic + ' ' + a.n + ': ' + a.d)}" title="🔒 Unlock with “${escH(a.n)}”` : ''; };
  const sw = (field, cols) => `<div class="swatches">${cols.map(c => `<button class="sw ${L[field] === c ? 'on' : ''}${lk(field, c)}" data-f="${field}" data-v="${c}" style="--c:${c}" aria-label="${c}"></button>`).join('')}</div>`;
  const chips = (field, opts) => `<div class="chips">${opts.map(([v, n]) => `<button class="chip2 ${L[field] === v ? 'on' : ''}${lk(field, v)}" data-f="${field}" data-v="${v}">${n}</button>`).join('')}</div>`;
  const multi = opts => `<div class="chips">${opts.map(([v, n]) => `<button class="chip2 ${L.extras.includes(v) ? 'on' : ''}${lk('extras', v)}" data-x="${v}">${n}</button>`).join('')}</div>`;
  const tog = (field, n) => `<button class="chip2 ${L[field] ? 'on' : ''}" data-t="${field}">${n}</button>`;
  const tabs = [
    ['Face', () => `<h4>Skin</h4>${sw('skin', LOOK_OPTS.skin)}<h4>Head shape</h4>${chips('head', LOOK_OPTS.head)}
      <h4>Eyes</h4>${chips('eyes', LOOK_OPTS.eyes)}<h4>Mouth</h4>${chips('mouth', LOOK_OPTS.mouth)}
      <h4>Details</h4><div class="chips">${tog('brows', 'Eyebrows')}${tog('cheeks', 'Rosy cheeks')}${tog('freckles', 'Freckles')}</div>`],
    ['Hair', () => `<h4>Style</h4>${chips('hair', LOOK_OPTS.hair)}<h4>Colour</h4>${sw('hairCol', LOOK_OPTS.hairCol)}`],
    ['Style', () => `<h4>Hat</h4>${chips('hat', LOOK_OPTS.hat)}<h4>Hat colour</h4>${sw('hatCol', LOOK_OPTS.hatCol)}
      <h4>Eyewear</h4>${chips('eyewear', LOOK_OPTS.eyewear)}<h4>Extras</h4>${multi(LOOK_OPTS.extras)}`],
    ['Colours', () => `<h4>Outfit</h4>${sw('shirt', LOOK_OPTS.shirt)}<h4>Backdrop</h4>${sw('bg', LOOK_OPTS.bg)}`]
  ];
  let tab = 0;
  const sets = ACHIEVEMENTS.filter(a => unlocksFor(a.id).length), have = sets.filter(a => meta.ach[a.id]).length;
  const draw = wiggle => {
    m.innerHTML = `<div class="sheet" role="dialog" aria-label="Customise contestant">
      <div class="sheet-l"><div class="dressing">💡💡💡💡💡</div><div class="preview ${wiggle ? 'wiggle' : ''}">${drawAvatar(L, {bare: true})}</div><div class="pv-plinth"></div><div class="pv-name">${escH(title)}</div>
        <div class="pv-btns"><button class="tbtn" id="crRand">🎲 Randomise</button><button class="tbtn alt" id="crReset">↺ Reset</button></div>
        <div class="unlockmeter"><b>${have}/${sets.length}</b> unlock sets earned<i style="--p:${sets.length ? have / sets.length * 100 : 0}%"></i><small>🔒 options unlock through achievements</small></div></div>
      <div class="sheet-r">
        <div class="tabs">${tabs.map((t, i) => `<button class="tab ${i === tab ? 'on' : ''}" data-tab="${i}">${t[0]}</button>`).join('')}</div>
        <div class="tabbody">${tabs[tab][1]()}</div>
        <div class="sheet-foot"><button class="bigbtn alt" id="crCancel">Cancel</button><button class="bigbtn" id="crDone">Save look ✓</button></div>
      </div></div>`;
    m.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { tab = +b.dataset.tab; draw(); });
    const locked = b => { if(!b.dataset.lock) return false; toast(`🔒 Locked. Earn ${escH(b.dataset.lock)}`); b.classList.remove('nope'); void b.offsetWidth; b.classList.add('nope'); return true; };
    m.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { if(locked(b)) return; L[b.dataset.f] = b.dataset.v; bump(); });
    m.querySelectorAll('[data-x]').forEach(b => b.onclick = () => { if(locked(b)) return; const x = b.dataset.x; L.extras = L.extras.includes(x) ? L.extras.filter(e => e !== x) : [...L.extras, x]; bump(); });
    m.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { L[b.dataset.t] = !L[b.dataset.t]; bump(); });
    m.querySelector('#crRand').onclick = () => { L = randomLook(); bump(); };
    m.querySelector('#crReset').onclick = () => { L = JSON.parse(JSON.stringify(look)); bump(); };
    m.querySelector('#crCancel').onclick = close;
    m.querySelector('#crDone').onclick = () => { close(); onDone(L); };
  };
  const bump = () => { if(typeof sfx !== 'undefined') sfx.tick(); draw(true); };
  const close = () => { m.classList.remove('open'); m.innerHTML = ''; };
  m.onclick = e => { if(e.target === m) close(); };
  draw(); m.classList.add('open');
}
