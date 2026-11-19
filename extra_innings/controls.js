/* ---------------- OPTIONS → CONTROLS: rebind every action ---------------- */
let ctrlDevice = 'key';
let listening = null;   // { a, s, dev, el, held:Set }

function ctrlMsg(text, kind) {
  const m = $('#ctrlMsg'); if (!m) return;
  m.textContent = text; m.className = 'ctrl-msg ' + (kind || '');
}
function renderControls() {
  const pane = $('#ctrlPane'); if (!pane) return;
  const pad = ctrlDevice === 'pad';
  const name = (a, s) => pad ? Bindings.padName(Bindings.pad[a][s]) : Bindings.keyName(Bindings.keys[a][s]);
  pane.innerHTML = `
    <div class="ctrl-top">
      <div class="seg" id="ctrlDev"><button data-d="key" class="${pad ? '' : 'on'}">Keyboard</button><button data-d="pad" class="${pad ? 'on' : ''}">Controller</button></div>
      ${pad ? '' : `<div class="ctrl-presets"><span>Presets</span>${Object.keys(Bindings.PRESETS).map(p => `<button data-preset="${p}">${p}</button>`).join('')}</div>`}
    </div>
    <div class="ctrl-head"><span>Action</span><span>Primary</span><span>Secondary</span></div>
    ${Bindings.ACTIONS.map(([a, label]) => `
      <div class="crow" data-row="${a}"><span class="cname">${label}</span>
        <button class="ckey ${name(a, 0) === '—' ? 'empty' : ''}" data-a="${a}" data-s="0">${name(a, 0)}</button>
        <button class="ckey ${name(a, 1) === '—' ? 'empty' : ''}" data-a="${a}" data-s="1">${name(a, 1)}</button>
      </div>`).join('')}
    <p class="ctrl-msg" id="ctrlMsg"></p>
    <div class="ctrl-foot">
      <p class="ctrl-fixed">${pad ? 'Fixed: left stick always moves · START pauses' : 'Fixed: ESC / P pause · ENTER confirms menus'}</p>
      <button class="btn" id="ctrlReset">Reset ${pad ? 'controller' : 'keyboard'}</button>
    </div>`;
  const missing = Bindings.unbound();
  if (missing.length && !pad) ctrlMsg('⚠ No key set for: ' + missing.join(', '), 'warn');
  else ctrlMsg(pad ? 'Click a slot, then press a button on your controller. Backspace clears · Esc cancels.' : 'Click a slot, then press any key. Backspace clears · Esc cancels.');

  $$('#ctrlDev button').forEach(b => b.onclick = () => { stopListening(); ctrlDevice = b.dataset.d; Sfx.tick(); renderControls(); });
  $$('#ctrlPane [data-preset]').forEach(b => b.onclick = () => {
    stopListening(); Bindings.applyPreset(b.dataset.preset); Sfx.select(); renderControls(); ctrlMsg(`Preset “${b.dataset.preset}” applied.`, 'ok');
  });
  $$('#ctrlPane .ckey').forEach(b => {
    b.onclick = e => { e.stopPropagation(); listen(b); };
    b.oncontextmenu = e => { e.preventDefault(); stopListening(); clearSlot(b.dataset.a, +b.dataset.s); };
  });
  $('#ctrlReset').onclick = () => {
    stopListening(); if (pad) Bindings.resetPad(); else Bindings.resetKeys();
    Sfx.select(); renderControls(); ctrlMsg('Back to the defaults.', 'ok');
  };
}
function clearSlot(a, s) {
  if (ctrlDevice === 'pad') Bindings.clearPad(a, s); else Bindings.clearKey(a, s);
  Sfx.back(); renderControls(); ctrlMsg(`${Bindings.actionName(a)}: slot cleared.`);
}
function listen(el) {
  const a = el.dataset.a, s = +el.dataset.s;
  stopListening();
  el = $(`#ctrlPane .ckey[data-a="${a}"][data-s="${s}"]`);   // re-rendered, grab the fresh button
  listening = { a, s, dev: ctrlDevice, el, held: new Set() };
  el.classList.add('listening'); el.textContent = ctrlDevice === 'pad' ? 'PRESS BUTTON…' : 'PRESS KEY…';
  ctrlMsg(`Binding “${Bindings.actionName(listening.a)}”…`);
  Sfx.tick();
  if (ctrlDevice === 'pad') {
    const p = navigator.getGamepads ? [...navigator.getGamepads()].find(Boolean) : null;
    if (p) p.buttons.forEach((b, i) => { if (b.pressed) listening.held.add(i); });
    else ctrlMsg('No controller detected. Connect one and press any button (or Esc to cancel).', 'warn');
    requestAnimationFrame(pollPadBind);
  }
}
function stopListening() {
  if (!listening) return;
  const l = listening; listening = null;
  if (l.el && l.el.isConnected) l.el.classList.remove('listening');
  renderControls();
}
function finishBind(stolen, label) {
  const a = listening.a; listening = null;
  Sfx.select(); renderControls();
  const row = $(`#ctrlPane [data-row="${a}"]`); if (row) { row.classList.add('flash'); }
  if (stolen && stolen !== a) {
    const s = $(`#ctrlPane [data-row="${stolen}"]`); if (s) s.classList.add('flash', 'stolen');
    ctrlMsg(`${label} now does “${Bindings.actionName(a)}”. It was removed from “${Bindings.actionName(stolen)}”.`, 'warn');
  } else ctrlMsg(`“${Bindings.actionName(a)}” → ${label}`, 'ok');
  const missing = Bindings.unbound();
  if (missing.length && ctrlDevice === 'key') setTimeout(() => ctrlMsg('⚠ No key set for: ' + missing.join(', '), 'warn'), 1800);
}
function pollPadBind() {
  if (!listening || listening.dev !== 'pad') return;
  const p = navigator.getGamepads ? [...navigator.getGamepads()].find(Boolean) : null;
  if (p) {
    for (let i = 0; i < p.buttons.length; i++) {
      const down = p.buttons[i].pressed;
      if (!down) { listening.held.delete(i); continue; }
      if (listening.held.has(i)) continue;
      if (Bindings.RESERVED_PAD.includes(i)) { ctrlMsg(`${Bindings.padName(i)} is reserved for pausing. Pick another button.`, 'warn'); listening.held.add(i); continue; }
      const stolen = Bindings.setPad(listening.a, listening.s, i);
      finishBind(stolen, Bindings.padName(i)); return;
    }
  }
  requestAnimationFrame(pollPadBind);
}
// capture phase so the menu's own keys (Esc, arrows, Enter) don't fire while binding
addEventListener('keydown', e => {
  if (!listening) return;
  e.preventDefault(); e.stopImmediatePropagation();
  if (e.repeat) return;
  if (e.code === 'Escape') { stopListening(); ctrlMsg('Cancelled.'); Sfx.back(); return; }
  if (e.code === 'Backspace' || e.code === 'Delete') { const { a, s } = listening; listening = null; clearSlot(a, s); return; }
  if (listening.dev === 'pad') return;
  if (Bindings.RESERVED_KEYS.includes(e.code)) { ctrlMsg(`${Bindings.keyName(e.code)} is reserved for pausing / menus. Pick another key.`, 'warn'); Sfx.back(); return; }
  const stolen = Bindings.setKey(listening.a, listening.s, e.code);
  finishBind(stolen, Bindings.keyName(e.code));
}, true);
addEventListener('mousedown', e => { if (listening && !e.target.closest('.ckey')) stopListening(); }, true);
