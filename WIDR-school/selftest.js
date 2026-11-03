// ---------- AUTOMATIC PLAYTESTER ----------
// Plays the game many times with random choices (no screen), using the real scenes and rules,
// and reports every place a playthrough gets stuck, errors out, loops, or ends too early.
window.HEADLESS=true;
(function(){
  const out=document.createElement('pre');
  out.style.cssText='position:fixed;inset:10px;z-index:999;background:#fff;border:3px solid #2b2340;border-radius:12px;padding:14px;font:12px Menlo,monospace;white-space:pre-wrap;overflow:auto;color:#2b2340';
  document.body.appendChild(out);
  const log=t=>{out.textContent+=t+'\n';};
  const pick=a=>a[Math.floor(Math.random()*a.length)];

  // 1. Static check: every fixed jump points at a scene that exists.
  const missing=new Set();
  const scan=(steps,from)=>steps.forEach(s=>{
    if(typeof s.goto==='string' && !SCENES[s.goto]) missing.add(from+' → '+s.goto);
    if(Array.isArray(s.choice)) s.choice.forEach(o=>{ if(typeof o.goto==='string'&&!SCENES[o.goto]) missing.add(from+' → '+o.goto); if(o.then) scan(o.then,from); });
  });
  Object.keys(SCENES).forEach(id=>scan(SCENES[id],id));

  // 2. Random playthroughs.
  const problems={}, endings={}, visited=new Set(), STATS_T={repeats:0,ranks:0,days:0,favHit:0,favRuns:0};
  const note=(k,detail)=>{ if(!problems[k]) problems[k]={n:0,ex:detail}; problems[k].n++; };
  // Prefer real actions over "Never mind" so weekends finish.
  const choose=opts=>{ const real=opts.filter(o=>!/^Never mind/.test(typeof o.t==='string'?o.t:'')); return pick(real.length?real:opts); };

  function play(gender){
    G={P:'Tester', gender, gen:rollGenes(gender), money:30, aff:{natan:0,lars:0,adam:0,fionn:0,milo:0,mada:0,gian:0,goon:0},
       flags:{}, ch:'', rep:28, lastRank:15, dating:[], out:[], friend:[], frozen:false, ret:null, tried:[], buys:{}};
    // Sometimes play "focused" on one person to reach late routes.
    const fav=Math.random()<.6?pick(ROM.filter(k=>accepts(G,k))):null; if(fav) STATS_T.favRuns++;
    let q=SCENES.start.slice(), cur='start', steps=0, lastLine='';
    const go=id=>{ if(id==='repeat_year') STATS_T.repeats++; if(id.startsWith('rank_')) STATS_T.ranks++; if(id.startsWith('cal_day')&&id==='cal_day') STATS_T.days++; if(!SCENES[id]){ note('Missing scene: '+id,'from '+cur); return false; } cur=id; visited.add(id); q=SCENES[id].slice(); return true; };
    visited.add('start');
    let yrs=0; while(steps++<200000){ if(cur==='repeat_year'&&q.length===SCENES.repeat_year.length-1) yrs++;
      if(!q.length){
        if(G.pendingEnd){ const e=G.pendingEnd; G.pendingEnd=null; endings[e.end]=(endings[e.end]||0)+1; if(fav&&e.who===fav) STATS_T.favHit++; return; }
        note('STUCK: scene "'+cur+'" has no next step','last line: '+lastLine); return;
      }
      const s=q.shift();
      try{
        if(s.cast && typeof s.cast==='function') s.cast(G);
        if(s.eff) applyEff(s.eff);
        if(s.do) s.do(G);
        if(s.cg){ if(!CG[s.cg]) note("Missing special scene: "+s.cg,cur); else cgSvg(CG[s.cg],G); continue; }
        if(s.daycard){ G.calSkip=null; continue; }
        if(s.phone){ const m=pickText(G); if(m){ const r=pick(m.replies); G.aff[m.from]+=r[1]; } continue; }
        if(s.mini){ if(!MINIS[s.mini]) note('Missing mini-game: '+s.mini,cur); fakeMini(s.mini); continue; }
        if(s.map){ const ts=mapTargets(G).filter(t=>t.scene); let t=null;
          if(fav){ const R=RANKS[fav]&&RANKS[fav][crOf(fav)+1]; const gate=R&&R.req&&stat(R.req[0])<R.req[1]?R.req[0]:null;
            const tr={knowledge:"train_study",guts:"train_workout",charm:"train_mirror",kindness:"train_shelter"};
            if(gate&&Math.random()<.7) t=ts.find(x=>x.scene===tr[gate]); else if(Math.random()<.6) t=ts.find(x=>x.k===fav); }
          if(!t) t=pick(ts); if(!go(t.scene)) return; continue; }
        if(s.goto){ const t=typeof s.goto==='function'?s.goto(G):s.goto; if(!t){ note('Jump to nothing in "'+cur+'"',''); return; } if(!go(t)) return; continue; }
        if(s.if){ const r=s.if(G); if(r){ if(!go(r)) return; } continue; }
        if(s.end){
          if(!G.final){ note('Ending reached BEFORE the ball: '+s.end,'in "'+cur+'"'); continue; }
          if(s.who!=='adam' && !G.flags.adam_epi){ G.flags.adam_epi=true; G.endWho=s.who; G.pendingEnd=s; q=SCENES.adam_epi.slice(); cur='adam_epi'; continue; }
          endings[s.end]=(endings[s.end]||0)+1; if(fav&&s.who===fav) STATS_T.favHit++; return;
        }
        if(s.choice){
          let opts=typeof s.choice==='function'?s.choice(G):s.choice;
          opts=opts.filter(o=>!o.req||o.req(G)).filter(o=>!(o.off&&o.off(G)));
          if(!opts.length){ note('Choice with no options in "'+cur+'"',''); return; }
          let o=null;
          if(fav && Math.random()<.7) o=opts.find(x=>x.aff&&x.aff[fav]>0);
          if(fav && !o) o=opts.find(x=>x.goto===('ask_'+fav)||x.goto===('hang_'+fav)||(typeof x.t==='string'&&x.t.includes(CHARS[fav].name)));
          if(!o) o=choose(opts);
          opts.forEach(x=>{ if(typeof x.t==='function') x.t(G); });
          applyEff(o); if(o.eff) applyEff(o.eff); if(o.do) o.do(G);
          const extra=(o.then||[]).slice(); if(o.goto) extra.push({goto:o.goto});
          q=extra.concat(q); continue;
        }
        if(s.t!==undefined){ lastLine=typeof s.t==='function'?s.t(G):s.t; if(typeof lastLine!=='string') note('Line is not text in "'+cur+'"',''); }
      }catch(err){ note('ERROR in "'+cur+'": '+err.message, JSON.stringify(s).slice(0,120)); return; }
    }
    note('LOOP: playthrough never finished','last scene "'+cur+'", years repeated: '+yrs+', dating: '+G.dating.join('/')+', out: '+G.out.join('/'));
  }

  const N=400;
  setTimeout(()=>{
    const t0=Date.now();
    for(let i=0;i<N;i++) play(i%2?'f':'m');
    G=null;
    log(`WidR School automatic playtest: ${N} random playthroughs (half boy, half girl), ${((Date.now()-t0)/1000).toFixed(1)}s\n`);
    log(missing.size?'BROKEN JUMPS:\n  '+[...missing].join('\n  '):'Broken jumps: none');
    const unvisited=Object.keys(SCENES).filter(id=>!visited.has(id));
    log('\nScenes reached: '+visited.size+' of '+Object.keys(SCENES).length);
    if(unvisited.length) log('Never reached: '+unvisited.join(', '));
    const pk=Object.keys(problems);
    log('\n'+(pk.length?'PROBLEMS:\n'+pk.map(k=>`  [${problems[k].n}x] ${k}${problems[k].ex?'  ('+problems[k].ex+')':''}`).join('\n'):'Problems: none'));
    log('\nEndings reached:\n'+Object.keys(endings).map(k=>`  ${k}: ${endings[k]}`).join('\n'));
    log(`\nPer playthrough: ${(STATS_T.days/N).toFixed(0)} free days, ${(STATS_T.ranks/N).toFixed(1)} rank-ups, ${(STATS_T.repeats/N).toFixed(2)} repeated years. Focused players who got their target: ${STATS_T.favHit}/${STATS_T.favRuns}`);
    log('\nTEST DONE');
  },300);
})();
