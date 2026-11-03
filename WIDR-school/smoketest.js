// ---------- SMOKE TEST: opens every mini-game, the map and every portrait, and catches errors ----------
(function(){
  const out=document.createElement('pre');
  out.style.cssText='position:fixed;right:10px;top:10px;width:46%;max-height:90%;z-index:999;background:#fff;border:3px solid #2b2340;border-radius:12px;padding:12px;font:12px Menlo,monospace;white-space:pre-wrap;overflow:auto;color:#2b2340';
  document.body.appendChild(out); const log=t=>{out.textContent+=t+'\n';};
  const errs=[]; window.addEventListener('error',e=>errs.push(e.message+' (line '+e.lineno+')'));
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const clickCanvas=(cv,x,y)=>{ const r=cv.getBoundingClientRect(); cv.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:r.left+x/1600*r.width,clientY:r.top+y/900*r.height})); };
  (async()=>{
    await wait(300); const cgBackup=localStorage.getItem('widr_cg2'), endBackup=localStorage.getItem(END_KEY);
    // portraits
    let pe=0; Object.keys(CHARS).forEach(k=>['neutral','smile','grin','happy','blush','shy','sad','surprised','angry','smirk'].forEach(ex=>{ try{ const s=portrait(k,ex,k==='lars'?'girl':''); if(!s.includes('</svg>')) pe++; }catch(e){ pe++; errs.push('portrait '+k+' '+ex+': '+e.message); } }));
    log(`Portraits: ${Object.keys(CHARS).length} characters x 10 expressions, ${pe} failed`);
    // fake game state
    G={P:'Tester',gender:'m',gen:rollGenes('m'),money:200,aff:{natan:0,lars:0,adam:0,fionn:0,milo:0,mada:0,gian:0,goon:0},flags:{gian:true,goon:true},ch:'',rep:28,lastRank:15,dating:[],out:[],friend:[],frozen:false,ret:null,tried:[],buys:{},mapSlots:3,mapLabel:'Weekend',mapNext:'ch8'};
    hideMenu();
    for(const k of Object.keys(MINIS)){
      const before=errs.length; queue=[{t:'after '+k}];
      startMini(k); await wait(150);
      const cv=document.querySelector('#mini canvas'); clickCanvas(cv,800,690); // Start
      for(let i=0;i<8;i++){ await wait(140); clickCanvas(cv,300+i*140,500+((i*97)%300)); document.dispatchEvent(new KeyboardEvent('keydown',{key:i%2?'ArrowLeft':' '})); }
      document.dispatchEvent(new KeyboardEvent('keyup',{key:'ArrowLeft'}));
      const m=document.getElementById('mini'); if(m) m.remove();
      log(`Mini-game ${k}: ${errs.length===before?'OK':'ERROR'}`);
    }
    const before=errs.length; openMap(); await wait(200);
    document.dispatchEvent(new KeyboardEvent('keydown',{key:'w'})); await wait(500); document.dispatchEvent(new KeyboardEvent('keyup',{key:'w'}));
    const cv=document.querySelector('#walkmap canvas'); clickCanvas(cv,250,280); await wait(900);
    log(`Town map: ${errs.length===before?'OK':'ERROR'}  (${mapTargets(G).length} things to interact with)`);
    const wm=document.getElementById('walkmap'); if(wm) wm.remove();
    // new screens: day card, phone, every special scene, notebook, banners, menu gallery
    let b2=errs.length; G.calDay=31; queue=[]; showDayCard(G,'Weeks pass.'); await wait(2500); queue=[{t:'ok'}]; document.querySelector('.ovl').click(); await wait(600); document.querySelectorAll('.ovl').forEach(o=>o.remove());
    log(`Day card: ${errs.length===b2?'OK':'ERROR'}`);
    b2=errs.length; TEXTS.forEach(m=>{ queue=[]; showPhone(m); const o=document.querySelector('.ovl.phone'); o.querySelector('[data-reply]').click(); o.remove(); });
    log(`Phone texts: ${TEXTS.length} messages, ${errs.length===b2?'OK':'ERROR'}`);
    b2=errs.length; G.cgPair=['natan','milo']; Object.keys(CG).forEach(id=>{ queue=[]; showCG(id); document.querySelectorAll('.ovl').forEach(o=>o.remove()); });
    log(`Special scenes: ${Object.keys(CG).length} images, ${errs.length===b2?'OK':'ERROR'}`);
    b2=errs.length; journal(); ['stats','me','conf'].forEach(t=>{ nbTab=t; renderNotebook(); }); closeNotebook(); addStat('charm',6); G.cr={mada:3}; rankBanner('mada'); chapterCard('Chapter 3 · Test'); setBg('night'); setBg('gate');
    log(`Notebook, banners, scene fades: ${errs.length===b2?'OK':'ERROR'}`);
    b2=errs.length; let rs=0; Object.keys(RANKS).forEach(k=>Object.keys(RANKS[k]).forEach(r=>{ rs++; if(!SCENES[`rank_${k}_${r}`]) errs.push('missing rank scene '+k+' '+r); }));
    Object.keys(CMAX).forEach(k=>{ for(let r=2;r<=CMAX[k];r++) if(!(RANKS[k]||{})[r]) errs.push('no rank story for '+k+' rank '+r); });
    log(`Confidant rank stories: ${rs}, ${errs.length===b2?'OK':'ERROR'}`);
    b2=errs.length; ['mem','settings','how'].forEach(k=>{ openPanel(k); closePanel(); }); title(); document.getElementById('menu').style.display='none';
    log(`Menus (Memories, Settings, How to Play): ${errs.length===b2?'OK':'ERROR'}`);
    if(cgBackup==null) localStorage.removeItem('widr_cg2'); else localStorage.setItem('widr_cg2',cgBackup); if(endBackup==null) localStorage.removeItem(END_KEY); else localStorage.setItem(END_KEY,endBackup);
    log('\n'+(errs.length?'ERRORS:\n  '+errs.join('\n  '):'No errors.')+'\nSMOKE DONE');
  })();
})();
