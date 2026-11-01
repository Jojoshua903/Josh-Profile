// Motion layer. Everything that affects visibility is pure CSS (it can never leave content hidden);
// GSAP is only used for confetti, which is purely decorative.
const G = window.gsap || null;
const retrigger = (el, cls) => { if(!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
const Anim = {
  screen(root){
    if(!root) return;
    document.body.classList.toggle('board', !!root.querySelector('#qcard'));
    [...root.children].forEach((el, i) => { el.style.setProperty('--i', i); retrigger(el, 'rise'); });
    root.querySelectorAll('.podium .avwrap, .hc').forEach((el, i) => { el.style.setProperty('--i', i); retrigger(el, 'pop-in'); });
    root.querySelectorAll('.ach, .stand .s, .cast-row').forEach((el, i) => { el.style.setProperty('--i', Math.min(i, 12)); retrigger(el, 'rise'); });
  },
  inputs(box){
    if(!box) return;
    box.querySelectorAll('.ans, .ord, .typebox, .note').forEach((el, i) => { el.style.setProperty('--i', i); el.classList.add('enter'); });
  },
  reveal(){},
  pop(el){ retrigger(el, 'popin'); },
  count(el, from, to){ el.textContent = '$' + to; retrigger(el, 'bump'); },
  jump(el){ retrigger(el, 'jump'); }
};

new MutationObserver(() => Anim.screen(document.getElementById('screen'))).observe(document.getElementById('screen'), {childList: true});

confetti = function(n = 90){
  const cols = ['#FF5A3C', '#FFD45C', '#2F4BFF', '#3DDBB4', '#FF8FB1', '#9B6BFF'];
  for(let i = 0; i < n; i++){
    const c = document.createElement('div'), shape = Math.random();
    c.style.background = cols[i % cols.length];
    c.style.borderRadius = shape < .33 ? '50%' : shape < .66 ? '2px' : '999px';
    c.style.width = (shape > .66 ? 16 : 9) + 'px'; c.style.height = (shape > .66 ? 6 : 11) + 'px';
    if(G){
      c.className = 'confetti2'; c.style.left = (40 + Math.random() * 20) + 'vw'; c.style.top = '60vh';
      document.body.appendChild(c);
      G.timeline({onComplete: () => c.remove()})
        .to(c, {x: (Math.random() - .5) * innerWidth * 1.1, y: -innerHeight * (.35 + Math.random() * .4), rotation: Math.random() * 720, duration: .7 + Math.random() * .4, ease: 'power2.out'})
        .to(c, {y: innerHeight * .6, rotation: '+=540', duration: 1.6 + Math.random() * 1.4, ease: 'power1.in'})
        .to(c, {opacity: 0, duration: .3}, '-=.3');
      setTimeout(() => c.remove(), 6000);
    } else {
      c.className = 'confetti'; c.style.left = Math.random() * 100 + 'vw';
      c.style.animationDuration = (2 + Math.random() * 2.5) + 's'; c.style.animationDelay = Math.random() * .8 + 's';
      document.body.appendChild(c); setTimeout(() => c.remove(), 5500);
    }
  }
};

// Random blink offsets so the cast don't blink in unison
new MutationObserver(muts => {
  muts.forEach(m => m.addedNodes.forEach(n => {
    if(n.nodeType === 1 && n.querySelectorAll) n.querySelectorAll('.eyes').forEach(e => { e.style.animationDelay = (-Math.random() * 5).toFixed(2) + 's'; });
  }));
}).observe(document.getElementById('app'), {childList: true, subtree: true});

// Safety net: surface any error instead of silently freezing
addEventListener('error', e => { try{ toast('⚠️ Hiccup: ' + esc(e.message || 'unknown error')); }catch(_){} });

Anim.screen(document.getElementById('screen'));
