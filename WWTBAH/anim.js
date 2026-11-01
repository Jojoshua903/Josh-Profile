// Motion layer: pure CSS classes, so nothing can ever get stuck invisible.
const retrigger = (el, cls) => { if(!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
const Anim = {
  screen(root){
    if(!root) return;
    [...root.children].forEach((el, i) => { el.style.setProperty('--i', i); retrigger(el, 'rise'); });
    root.querySelectorAll('.podium .avwrap, .hc, .spot').forEach((el, i) => { el.style.setProperty('--i', i); retrigger(el, 'pop-in'); });
    root.querySelectorAll('.ach, .cast-row').forEach((el, i) => { el.style.setProperty('--i', Math.min(i, 12)); retrigger(el, 'rise'); });
  },
  inputs(box){ if(box) box.querySelectorAll('.ans, .ord, .typebox, .note').forEach((el, i) => { el.style.setProperty('--i', i); el.classList.add('enter'); }); },
  count(el, from, to){ el.textContent = '$' + to; retrigger(el, 'bump'); },
  jump(el){ retrigger(el, 'jump'); }
};
new MutationObserver(() => Anim.screen(document.getElementById('screen'))).observe(document.getElementById('screen'), {childList: true});

// Random blink offsets so the cast don't blink in unison
new MutationObserver(muts => muts.forEach(m => m.addedNodes.forEach(n => {
  if(n.nodeType === 1 && n.querySelectorAll) n.querySelectorAll('.eyes').forEach(e => { e.style.animationDelay = (-Math.random() * 5).toFixed(2) + 's'; });
}))).observe(document.getElementById('app'), {childList: true, subtree: true});

addEventListener('error', e => { try{ toast('⚠️ Hiccup: ' + esc(e.message || 'unknown error')); }catch(_){} });

// If the title screen can't be drawn (e.g. leftover data from an older version), show a recovery panel instead of a blank page
function showRecovery(err){
  const screen = document.getElementById('screen');
  screen.innerHTML = `<div class="card" style="max-width:560px;margin:40px auto;text-align:center">
    <h2>🎬 The studio lights didn't come on</h2>
    <p style="color:var(--ink2)">Something in the saved data from an earlier version tripped the show up.</p>
    <p class="tiny" style="font-family:var(--mono)">${String(err && (err.message || err)).replace(/[<>&]/g, '')}</p>
    <button class="bigbtn" id="rcReload">↻ Try again</button>
    <button class="bigbtn ylw" id="rcSoft">Clear saved game & setup (keeps scores and achievements)</button>
    <button class="bigbtn alt" id="rcHard">Reset everything</button></div>`;
  const keys = () => { try{ return Object.keys(localStorage).filter(k => k.startsWith('hundredaire_')); }catch(e){ return []; } };
  document.getElementById('rcReload').onclick = () => location.reload();
  document.getElementById('rcSoft').onclick = () => { keys().filter(k => /save|setup/.test(k)).forEach(k => localStorage.removeItem(k)); location.reload(); };
  document.getElementById('rcHard').onclick = () => { if(confirm('This deletes your high scores, achievements and custom characters. Carry on?')){ keys().forEach(k => localStorage.removeItem(k)); location.reload(); } };
}
try{ titleScreen(); }
catch(e){ console.error(e); showRecovery(e); }
setTimeout(() => { const s = document.getElementById('screen'); if(s && !s.children.length) showRecovery('The title screen came up empty.'); }, 1500);
