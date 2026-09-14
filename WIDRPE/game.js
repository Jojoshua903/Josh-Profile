/* ============ HELPERS ============ */
const byName = n => MON.find(m=>m.n===n);
const idxOf = n => MON.findIndex(m=>m.n===n);
function tbadge(t){const m=TYPE_META[t];return `<span class="tbadge" style="background:${m.c}">${m.e} ${t}</span>`;}
function typeGrad(types){
  if(types.length===1){const c=TYPE_META[types[0]].c;return `linear-gradient(135deg, ${c}, ${shade(c,-18)})`;}
  return `linear-gradient(135deg, ${TYPE_META[types[0]].c}, ${TYPE_META[types[1]].c})`;
}
function shade(hex,pct){
  let n=parseInt(hex.slice(1),16),r=(n>>16)+pct*2.55,g=((n>>8)&255)+pct*2.55,b=(n&255)+pct*2.55;
  const cl=v=>Math.max(0,Math.min(255,Math.round(v)));
  return `#${(1<<24|cl(r)<<16|cl(g)<<8|cl(b)).toString(16).slice(1)}`;
}
const bst = m => m.hp+m.atk+m.def+m.spd;
const statColor = v => v>=85?'#e3350d':v>=70?'#f7a20d':v>=55?'#8bc34a':'#6390F0';
function effMult(moveType, defTypes){let m=1;defTypes.forEach(dt=>{const row=CHART[moveType]||{};if(dt in row)m*=row[dt];});return m;}
function rareTag(m){return m.rarity==='Legendary'?'<span class="rare leg">★ Legendary</span>':m.rarity==='Mythical'?'<span class="rare myth">✦ Mythical</span>':'';}

/* ============ WIDRMON CREATURE ART (procedureel) ============ */
const lighten=(c,p)=>shade(c,p);
function seedOf(n){ let h=0; for(let i=0;i<n.length;i++) h=(h*31+n.charCodeAt(i))>>>0; return h; }
function rnd(s,i){ const v=Math.sin(s*99.13+i*57.31)*43758.5453; return v-Math.floor(v); }
function featureBack(ctx,cx,cy,r,type,col){
  if(type==='Flying'||type==='Dragon'){
    ctx.fillStyle=lighten(col,8); ctx.strokeStyle='#20202c'; ctx.lineWidth=r*0.05;
    for(const g of[-1,1]){ ctx.beginPath(); ctx.moveTo(cx+g*r*0.5,cy-r*0.2); ctx.quadraticCurveTo(cx+g*r*1.5,cy-r*0.6,cx+g*r*1.3,cy+r*0.4); ctx.quadraticCurveTo(cx+g*r*0.95,cy+r*0.1,cx+g*r*0.5,cy+r*0.2); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  } else if(type==='Fairy'){
    ctx.fillStyle='rgba(255,255,255,.55)'; ctx.strokeStyle=lighten(col,20); ctx.lineWidth=r*0.04;
    for(const g of[-1,1]){ ctx.beginPath(); ctx.ellipse(cx+g*r*0.95,cy-r*0.05,r*0.4,r*0.55,g*0.5,0,7); ctx.fill(); ctx.stroke(); }
  }
}
function featureFront(ctx,cx,cy,r,type,col){
  const topY=cy-r*0.82; ctx.strokeStyle='#20202c'; ctx.lineWidth=r*0.05;
  const F=c=>ctx.fillStyle=c;
  switch(type){
    case 'Fire': for(let i=-1;i<=1;i++){ F(i?'#ff9f45':'#ffd23f'); ctx.beginPath(); ctx.moveTo(cx+i*r*0.3,topY+r*0.12); ctx.quadraticCurveTo(cx+i*r*0.3-r*0.16,topY-r*0.4,cx+i*r*0.3,topY-r*0.62); ctx.quadraticCurveTo(cx+i*r*0.3+r*0.16,topY-r*0.4,cx+i*r*0.3,topY+r*0.12); ctx.fill(); } break;
    case 'Grass': for(const g of[-1,0,1]){ F('#5bbf4a'); ctx.save(); ctx.translate(cx+g*r*0.26,topY+r*0.05); ctx.rotate(g*0.5); ctx.beginPath(); ctx.ellipse(0,-r*0.26,r*0.12,r*0.32,0,0,7); ctx.fill(); ctx.strokeStyle='#3f9a3a'; ctx.stroke(); ctx.restore(); } break;
    case 'Water': F(lighten(col,22)); ctx.beginPath(); ctx.moveTo(cx-r*0.32,topY+r*0.12); ctx.lineTo(cx,topY-r*0.52); ctx.lineTo(cx+r*0.32,topY+r*0.12); ctx.closePath(); ctx.fill(); ctx.stroke(); break;
    case 'Electric': F('#ffe23f'); for(const g of[-1,1]){ ctx.beginPath(); ctx.moveTo(cx+g*r*0.42,topY+r*0.05); ctx.lineTo(cx+g*r*0.78,topY-r*0.5); ctx.lineTo(cx+g*r*0.56,topY-r*0.5); ctx.lineTo(cx+g*r*0.82,topY-r*0.92); ctx.lineTo(cx+g*r*0.46,topY-r*0.42); ctx.lineTo(cx+g*r*0.62,topY-r*0.42); ctx.closePath(); ctx.fill(); ctx.stroke(); } break;
    case 'Ice': F('#bfeaff'); for(const g of[-1,0,1]){ ctx.beginPath(); ctx.moveTo(cx+g*r*0.3-r*0.1,topY+r*0.12); ctx.lineTo(cx+g*r*0.3,topY-r*0.56); ctx.lineTo(cx+g*r*0.3+r*0.1,topY+r*0.12); ctx.closePath(); ctx.fill(); ctx.stroke(); } break;
    case 'Dragon': case 'Dark': F(type==='Dark'?'#43384a':lighten(col,-8)); for(const g of[-1,1]){ ctx.beginPath(); ctx.moveTo(cx+g*r*0.3,topY+r*0.12); ctx.quadraticCurveTo(cx+g*r*0.72,topY-r*0.5,cx+g*r*0.42,topY-r*0.72); ctx.lineTo(cx+g*r*0.2,topY-r*0.05); ctx.closePath(); ctx.fill(); ctx.stroke(); } break;
    case 'Bug': ctx.lineWidth=r*0.05; for(const g of[-1,1]){ ctx.strokeStyle='#20202c'; ctx.beginPath(); ctx.moveTo(cx+g*r*0.22,topY+r*0.05); ctx.quadraticCurveTo(cx+g*r*0.6,topY-r*0.6,cx+g*r*0.72,topY-r*0.72); ctx.stroke(); F('#20202c'); ctx.beginPath(); ctx.arc(cx+g*r*0.72,topY-r*0.78,r*0.09,0,7); ctx.fill(); } break;
    case 'Psychic': case 'Fairy': F(type==='Psychic'?'#f95587':'#ffd1e8'); ctx.beginPath(); ctx.moveTo(cx,topY-r*0.55); ctx.lineTo(cx+r*0.15,topY-r*0.28); ctx.lineTo(cx,topY+r*0.02); ctx.lineTo(cx-r*0.15,topY-r*0.28); ctx.closePath(); ctx.fill(); ctx.stroke(); break;
    case 'Rock': case 'Ground': F(lighten(col,-14)); for(const g of[-1,0,1]){ const bx=cx+g*r*0.28; ctx.beginPath(); ctx.moveTo(bx-r*0.14,topY+r*0.14); ctx.lineTo(bx-r*0.04,topY-r*0.34); ctx.lineTo(bx+r*0.12,topY-r*0.24); ctx.lineTo(bx+r*0.15,topY+r*0.14); ctx.closePath(); ctx.fill(); ctx.stroke(); } break;
    case 'Steel': F('#cfd3e0'); ctx.beginPath(); ctx.arc(cx,topY-r*0.06,r*0.17,0,7); ctx.fill(); ctx.stroke(); F('#9aa0b5'); ctx.beginPath(); ctx.arc(cx,topY-r*0.06,r*0.08,0,7); ctx.fill(); break;
    case 'Fighting': F('#e34b3f'); ctx.fillRect(cx-r*0.5,topY+r*0.02,r,r*0.16); ctx.strokeRect(cx-r*0.5,topY+r*0.02,r,r*0.16); break;
    case 'Poison': F(lighten(col,16)); for(const g of[-1,1]){ ctx.beginPath(); ctx.arc(cx+g*r*0.34,topY-r*0.02,r*0.13,0,7); ctx.fill(); ctx.stroke(); } break;
    case 'Ghost': F(lighten(col,12)); ctx.beginPath(); ctx.moveTo(cx-r*0.2,topY+r*0.1); ctx.quadraticCurveTo(cx,topY-r*0.55,cx+r*0.2,topY+r*0.1); ctx.closePath(); ctx.fill(); ctx.stroke(); break;
    default: F(col); for(const g of[-1,1]){ ctx.beginPath(); ctx.ellipse(cx+g*r*0.42,topY,r*0.16,r*0.26,g*0.3,0,7); ctx.fill(); ctx.stroke(); }
  }
}
function drawEyes(ctx,cx,cy,r,s){
  const ey=cy-r*0.02, ex=r*0.34, ew=r*0.19, eh=r*0.25;
  const angry=rnd(s,5)>0.68;
  for(const g of[-1,1]){
    ctx.fillStyle='#fff'; ctx.strokeStyle='#20202c'; ctx.lineWidth=Math.max(1,r*0.03);
    ctx.beginPath(); ctx.ellipse(cx+g*ex,ey,ew,eh,0,0,7); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#20202c'; ctx.beginPath(); ctx.ellipse(cx+g*ex,ey+eh*0.16,ew*0.5,eh*0.56,0,0,7); ctx.fill();
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(cx+g*ex-ew*0.22,ey-eh*0.24,ew*0.24,0,7); ctx.fill();
    if(angry){ ctx.strokeStyle='#20202c'; ctx.lineWidth=r*0.07; ctx.beginPath(); ctx.moveTo(cx+g*ex-ew,ey-eh*1.05); ctx.lineTo(cx+g*ex+ew*0.7,ey-eh*0.5); ctx.stroke(); }
  }
}
function drawCreature(ctx,cx,cy,r,mon){
  const t1=mon.t[0], t2=mon.t[1]||mon.t[0];
  const c1=TYPE_META[t1].c, c2=TYPE_META[t2].c, s=seedOf(mon.n), dk='#20202c';
  const ghost=(t1==='Ghost'||t2==='Ghost');
  ctx.fillStyle='rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(cx,cy+r*0.98,r*0.85,r*0.26,0,0,7); ctx.fill();
  featureBack(ctx,cx,cy,r,t1,c2); if(t2!==t1) featureBack(ctx,cx,cy,r,t2,c1);
  if(!ghost){ ctx.fillStyle=shade(c1,-20); ctx.strokeStyle=dk; ctx.lineWidth=Math.max(2,r*0.05);
    for(const g of[-1,1]){ ctx.beginPath(); ctx.ellipse(cx+g*r*0.38,cy+r*0.82,r*0.22,r*0.15,0,0,7); ctx.fill(); ctx.stroke(); } }
  // lijf
  ctx.fillStyle=c1; ctx.strokeStyle=dk; ctx.lineWidth=Math.max(2,r*0.06);
  if(ghost){ ctx.beginPath(); ctx.moveTo(cx-r*0.8,cy+r*0.1); ctx.lineTo(cx-r*0.8,cy-r*0.4); ctx.quadraticCurveTo(cx-r*0.8,cy-r*0.95,cx,cy-r*0.95); ctx.quadraticCurveTo(cx+r*0.8,cy-r*0.95,cx+r*0.8,cy-r*0.4); ctx.lineTo(cx+r*0.8,cy+r*0.1);
    for(let i=0;i<4;i++){ const xx=cx+r*0.8-(i*2+1)*(r*1.6/8); ctx.quadraticCurveTo(xx+r*0.1,cy+r*0.5,xx,cy+r*0.9); ctx.quadraticCurveTo(xx-r*0.1,cy+r*0.5,xx-r*1.6/8,cy+r*0.3); }
    ctx.closePath(); ctx.fill(); ctx.stroke();
  } else { ctx.beginPath(); ctx.ellipse(cx,cy,r*0.8,r*0.9,0,0,7); ctx.fill(); ctx.stroke(); }
  // buik
  ctx.fillStyle=lighten(c2,26); ctx.beginPath(); ctx.ellipse(cx,cy+r*0.2,r*0.48,r*0.52,0,0,7); ctx.fill();
  if(rnd(s,3)<0.5){ ctx.fillStyle='rgba(0,0,0,.10)'; ctx.beginPath(); ctx.arc(cx-r*0.38,cy-r*0.22,r*0.12,0,7); ctx.arc(cx+r*0.32,cy-r*0.34,r*0.09,0,7); ctx.fill(); }
  // armpjes
  if(!ghost){ ctx.fillStyle=c1; ctx.strokeStyle=dk; ctx.lineWidth=Math.max(2,r*0.05);
    for(const g of[-1,1]){ ctx.beginPath(); ctx.ellipse(cx+g*r*0.78,cy+r*0.12,r*0.15,r*0.24,g*-0.3,0,7); ctx.fill(); ctx.stroke(); } }
  featureFront(ctx,cx,cy,r,t1,c1); if(t2!==t1) featureFront(ctx,cx,cy,r,t2,c2);
  drawEyes(ctx,cx,cy,r,s);
  // gag-prop
  ctx.font=`${Math.round(r*0.66)}px serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(mon.e, cx+r*0.66, cy+r*0.62);
}
/* ---- part library ---- */
function pFeet(ctx,cx,cy,r,col){ ctx.fillStyle=shade(col,-20); ctx.strokeStyle='#20202c'; ctx.lineWidth=Math.max(2,r*0.05); for(const g of[-1,1]){ ctx.beginPath(); ctx.ellipse(cx+g*r*0.38,cy+r*0.82,r*0.22,r*0.15,0,0,7); ctx.fill(); ctx.stroke(); } }
function pArms(ctx,cx,cy,r,col){ ctx.fillStyle=col; ctx.strokeStyle='#20202c'; ctx.lineWidth=Math.max(2,r*0.05); for(const g of[-1,1]){ ctx.beginPath(); ctx.ellipse(cx+g*r*0.78,cy+r*0.12,r*0.15,r*0.24,g*-0.3,0,7); ctx.fill(); ctx.stroke(); } }
function pBelly(ctx,cx,cy,r,col){ ctx.fillStyle=lighten(col,26); ctx.beginPath(); ctx.ellipse(cx,cy+r*0.2,r*0.46,r*0.5,0,0,7); ctx.fill(); }
function pBody(ctx,cx,cy,r,col,shape){
  ctx.fillStyle=col; ctx.strokeStyle='#20202c'; ctx.lineWidth=Math.max(2,r*0.06); ctx.beginPath();
  if(shape==='egg') ctx.ellipse(cx,cy,r*0.72,r*0.92,0,0,7);
  else if(shape==='tall') ctx.ellipse(cx,cy,r*0.6,r*1.0,0,0,7);
  else if(shape==='teardrop'){ ctx.moveTo(cx,cy-r*0.95); ctx.bezierCurveTo(cx+r*0.95,cy-r*0.1,cx+r*0.62,cy+r*0.92,cx,cy+r*0.92); ctx.bezierCurveTo(cx-r*0.62,cy+r*0.92,cx-r*0.95,cy-r*0.1,cx,cy-r*0.95); }
  else if(shape==='pot'){ ctx.moveTo(cx-r*0.55,cy+r*0.92); ctx.lineTo(cx-r*0.78,cy-r*0.05); ctx.lineTo(cx+r*0.78,cy-r*0.05); ctx.lineTo(cx+r*0.55,cy+r*0.92); ctx.closePath(); }
  else if(shape==='robot'){ ctx.rect(cx-r*0.68,cy-r*0.72,r*1.36,r*1.5); }
  else if(shape==='ghost'){ ctx.moveTo(cx-r*0.8,cy+r*0.35); ctx.lineTo(cx-r*0.8,cy-r*0.4); ctx.quadraticCurveTo(cx-r*0.8,cy-r*0.98,cx,cy-r*0.98); ctx.quadraticCurveTo(cx+r*0.8,cy-r*0.98,cx+r*0.8,cy-r*0.4); ctx.lineTo(cx+r*0.8,cy+r*0.35); const seg=r*1.6/6; for(let i=0;i<3;i++){ const xx=cx+r*0.8-(i*2+1)*seg; ctx.quadraticCurveTo(xx+seg,cy+r*0.72,xx,cy+r*0.4); ctx.quadraticCurveTo(xx-seg,cy+r*0.72,xx-seg,cy+r*0.4); } }
  else ctx.ellipse(cx,cy,r*0.8,r*0.9,0,0,7);
  ctx.fill(); ctx.stroke();
  if(shape==='pot'){ ctx.fillStyle=shade(col,-14); ctx.fillRect(cx-r*0.8,cy-r*0.16,r*1.6,r*0.22); ctx.strokeRect(cx-r*0.8,cy-r*0.16,r*1.6,r*0.22); }
  if(shape==='beetle'){ ctx.strokeStyle='#20202c'; ctx.lineWidth=r*0.05; ctx.beginPath(); ctx.moveTo(cx,cy-r*0.85); ctx.lineTo(cx,cy+r*0.85); ctx.stroke(); ctx.fillStyle='rgba(255,255,255,.16)'; ctx.beginPath(); ctx.ellipse(cx-r*0.34,cy-r*0.3,r*0.16,r*0.26,0.4,0,7); ctx.fill(); }
  if(shape==='robot'){ ctx.fillStyle='rgba(255,255,255,.2)'; ctx.fillRect(cx-r*0.5,cy-r*0.5,r*1.0,r*0.42); }
}
function pEars(ctx,cx,cy,r,col,kind){
  if(!kind||kind==='none')return; ctx.fillStyle=col; ctx.strokeStyle='#20202c'; ctx.lineWidth=Math.max(2,r*0.05); const ty=cy-r*0.78;
  if(kind==='round'){ for(const g of[-1,1]){ ctx.beginPath(); ctx.arc(cx+g*r*0.5,ty,r*0.2,0,7); ctx.fill(); ctx.stroke(); } }
  else if(kind==='cat'){ for(const g of[-1,1]){ ctx.fillStyle=col; ctx.beginPath(); ctx.moveTo(cx+g*r*0.28,ty+r*0.1); ctx.lineTo(cx+g*r*0.5,ty-r*0.5); ctx.lineTo(cx+g*r*0.66,ty+r*0.05); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle='#ffb3c7'; ctx.beginPath(); ctx.moveTo(cx+g*r*0.37,ty); ctx.lineTo(cx+g*r*0.5,ty-r*0.3); ctx.lineTo(cx+g*r*0.57,ty); ctx.closePath(); ctx.fill(); } }
  else if(kind==='dog'){ ctx.fillStyle=shade(col,-12); for(const g of[-1,1]){ ctx.beginPath(); ctx.ellipse(cx+g*r*0.62,ty+r*0.28,r*0.16,r*0.34,g*0.2,0,7); ctx.fill(); ctx.stroke(); } }
  else if(kind==='bunny'){ for(const g of[-1,1]){ ctx.fillStyle=col; ctx.beginPath(); ctx.ellipse(cx+g*r*0.3,ty-r*0.4,r*0.13,r*0.55,g*0.1,0,7); ctx.fill(); ctx.stroke(); ctx.fillStyle='#ffb3c7'; ctx.beginPath(); ctx.ellipse(cx+g*r*0.3,ty-r*0.4,r*0.06,r*0.4,g*0.1,0,7); ctx.fill(); } }
  else if(kind==='fox'){ for(const g of[-1,1]){ ctx.fillStyle=col; ctx.beginPath(); ctx.moveTo(cx+g*r*0.3,ty+r*0.05); ctx.lineTo(cx+g*r*0.55,ty-r*0.55); ctx.lineTo(cx+g*r*0.7,ty+r*0.02); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle='#20202c'; ctx.beginPath(); ctx.moveTo(cx+g*r*0.46,ty-r*0.28); ctx.lineTo(cx+g*r*0.55,ty-r*0.55); ctx.lineTo(cx+g*r*0.61,ty-r*0.28); ctx.closePath(); ctx.fill(); } }
  else if(kind==='pointy'){ for(const g of[-1,1]){ ctx.beginPath(); ctx.moveTo(cx+g*r*0.35,ty+r*0.12); ctx.lineTo(cx+g*r*0.55,ty-r*0.4); ctx.lineTo(cx+g*r*0.62,ty+r*0.06); ctx.closePath(); ctx.fill(); ctx.stroke(); } }
}
function pHat(ctx,cx,cy,r,col,kind){
  if(!kind||kind==='none')return; ctx.strokeStyle='#20202c'; ctx.lineWidth=Math.max(2,r*0.05); const ty=cy-r*0.7;
  if(kind==='cap'){ ctx.fillStyle='#e3350d'; ctx.beginPath(); ctx.arc(cx,ty-r*0.02,r*0.46,Math.PI,0); ctx.fill(); ctx.stroke(); ctx.fillRect(cx,ty-r*0.06,r*0.6,r*0.14); ctx.strokeRect(cx,ty-r*0.06,r*0.6,r*0.14); ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(cx,ty-r*0.14,r*0.1,0,7); ctx.fill(); }
  else if(kind==='cowboy'){ ctx.fillStyle='#8a5a2b'; ctx.beginPath(); ctx.ellipse(cx,ty+r*0.08,r*0.72,r*0.15,0,0,7); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.ellipse(cx,ty-r*0.18,r*0.32,r*0.3,0,0,7); ctx.fill(); ctx.stroke(); }
  else if(kind==='crown'){ ctx.fillStyle='#ffcb05'; ctx.beginPath(); ctx.moveTo(cx-r*0.44,ty+r*0.1); ctx.lineTo(cx-r*0.44,ty-r*0.22); ctx.lineTo(cx-r*0.2,ty+r*0.02); ctx.lineTo(cx,ty-r*0.35); ctx.lineTo(cx+r*0.2,ty+r*0.02); ctx.lineTo(cx+r*0.44,ty-r*0.22); ctx.lineTo(cx+r*0.44,ty+r*0.1); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle='#f95587'; ctx.beginPath(); ctx.arc(cx,ty-r*0.05,r*0.07,0,7); ctx.fill(); }
  else if(kind==='helmet'){ ctx.fillStyle='#e3350d'; ctx.beginPath(); ctx.arc(cx,ty+r*0.04,r*0.5,Math.PI,0); ctx.fill(); ctx.stroke(); ctx.fillRect(cx-r*0.5,ty+r*0.02,r*1.0,r*0.1); ctx.strokeRect(cx-r*0.5,ty+r*0.02,r*1.0,r*0.1); ctx.fillStyle='#ffcb05'; ctx.fillRect(cx-r*0.07,ty-r*0.42,r*0.14,r*0.4); }
  else if(kind==='headband'){ ctx.fillStyle='#c22e28'; ctx.fillRect(cx-r*0.55,ty+r*0.05,r*1.1,r*0.15); ctx.strokeRect(cx-r*0.55,ty+r*0.05,r*1.1,r*0.15); for(const g of[-1,1]){ ctx.beginPath(); ctx.moveTo(cx+g*r*0.5,ty+r*0.12); ctx.lineTo(cx+g*r*0.82,ty+r*0.4); ctx.lineTo(cx+g*r*0.6,ty+r*0.14); ctx.closePath(); ctx.fill(); ctx.stroke(); } }
  else if(kind==='bow'){ ctx.fillStyle='#ff5d9e'; for(const g of[-1,1]){ ctx.beginPath(); ctx.moveTo(cx,ty); ctx.lineTo(cx+g*r*0.4,ty-r*0.22); ctx.lineTo(cx+g*r*0.4,ty+r*0.22); ctx.closePath(); ctx.fill(); ctx.stroke(); } ctx.beginPath(); ctx.arc(cx,ty,r*0.1,0,7); ctx.fill(); ctx.stroke(); }
  else if(kind==='leaf'){ ctx.fillStyle='#5bbf4a'; for(const g of[-1,0,1]){ ctx.save(); ctx.translate(cx+g*r*0.22,ty+r*0.08); ctx.rotate(g*0.5); ctx.beginPath(); ctx.ellipse(0,-r*0.28,r*0.12,r*0.34,0,0,7); ctx.fill(); ctx.strokeStyle='#3f9a3a'; ctx.stroke(); ctx.restore(); } }
  else if(kind==='halo'){ ctx.strokeStyle='#ffe15a'; ctx.lineWidth=r*0.09; ctx.beginPath(); ctx.ellipse(cx,ty-r*0.18,r*0.34,r*0.12,0,0,7); ctx.stroke(); }
}
function pEyes(ctx,cx,cy,r,kind,s){
  const ey=cy-r*0.02, ex=r*0.34, ew=r*0.19, eh=r*0.25;
  if(kind==='third'){ ctx.fillStyle='#ffd23f'; ctx.strokeStyle='#20202c'; ctx.lineWidth=Math.max(1,r*0.03); ctx.beginPath(); ctx.ellipse(cx,cy-r*0.5,r*0.13,r*0.19,0,0,7); ctx.fill(); ctx.stroke(); ctx.fillStyle='#20202c'; ctx.beginPath(); ctx.arc(cx,cy-r*0.5,r*0.06,0,7); ctx.fill(); }
  if(kind==='cyclops'){ ctx.fillStyle='#fff'; ctx.strokeStyle='#20202c'; ctx.lineWidth=Math.max(1,r*0.03); ctx.beginPath(); ctx.arc(cx,ey,r*0.28,0,7); ctx.fill(); ctx.stroke(); ctx.fillStyle='#20202c'; ctx.beginPath(); ctx.arc(cx,ey+r*0.03,r*0.13,0,7); ctx.fill(); ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(cx-r*0.06,ey-r*0.06,r*0.05,0,7); ctx.fill(); return; }
  if(kind==='shades'){ ctx.fillStyle='#151321'; const y=ey-eh*0.7,h=eh*1.5; ctx.fillRect(cx-r*0.5,y,r*1.0,h); ctx.strokeStyle='#20202c'; ctx.lineWidth=r*0.04; ctx.strokeRect(cx-r*0.5,y,r*1.0,h); ctx.fillStyle='rgba(255,255,255,.25)'; ctx.fillRect(cx-r*0.42,y+h*0.22,r*0.22,h*0.32); return; }
  for(const g of[-1,1]){
    ctx.fillStyle='#fff'; ctx.strokeStyle='#20202c'; ctx.lineWidth=Math.max(1,r*0.03);
    let h=eh; if(kind==='sleepy')h=eh*0.45; if(kind==='cute')h=eh*1.15;
    ctx.beginPath(); ctx.ellipse(cx+g*ex,ey,ew,h,0,0,7); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#20202c'; ctx.beginPath(); ctx.ellipse(cx+g*ex,ey+h*0.15,ew*0.55,h*0.6,0,0,7); ctx.fill();
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(cx+g*ex-ew*0.22,ey-h*0.25,ew*0.26,0,7); ctx.fill();
    if(kind==='angry'){ ctx.strokeStyle='#20202c'; ctx.lineWidth=r*0.07; ctx.beginPath(); ctx.moveTo(cx+g*ex-ew,ey-h*1.15); ctx.lineTo(cx+g*ex+ew*0.7,ey-h*0.5); ctx.stroke(); }
    if(kind==='glasses'){ ctx.strokeStyle='#20202c'; ctx.lineWidth=r*0.035; ctx.strokeRect(cx+g*ex-ew*1.3,ey-h*1.15,ew*2.6,h*2.3); }
    if(kind==='cry'){ ctx.fillStyle='#6fb7ea'; ctx.beginPath(); ctx.moveTo(cx+g*ex-ew*0.3,ey+h*0.6); ctx.quadraticCurveTo(cx+g*ex-r*0.04,cy+r*0.55,cx+g*ex,cy+r*0.78); ctx.quadraticCurveTo(cx+g*ex+r*0.06,cy+r*0.55,cx+g*ex+ew*0.3,ey+h*0.6); ctx.fill(); }
  }
  if(kind==='glasses'){ ctx.strokeStyle='#20202c'; ctx.lineWidth=r*0.035; ctx.beginPath(); ctx.moveTo(cx-ex+ew*1.3,ey); ctx.lineTo(cx+ex-ew*1.3,ey); ctx.stroke(); }
}
function pMouth(ctx,cx,cy,r,kind){
  if(!kind)return; const my=cy+r*0.42; ctx.strokeStyle='#20202c'; ctx.lineWidth=Math.max(2,r*0.045); ctx.fillStyle='#20202c'; ctx.beginPath();
  if(kind==='smile'){ ctx.arc(cx,my-r*0.05,r*0.18,0.15*Math.PI,0.85*Math.PI); ctx.stroke(); }
  else if(kind==='neutral'){ ctx.moveTo(cx-r*0.12,my); ctx.lineTo(cx+r*0.12,my); ctx.stroke(); }
  else if(kind==='frown'){ ctx.arc(cx,my+r*0.18,r*0.16,1.15*Math.PI,1.85*Math.PI); ctx.stroke(); }
  else if(kind==='open'){ ctx.fillStyle='#7a2230'; ctx.ellipse(cx,my,r*0.13,r*0.12,0,0,7); ctx.fill(); ctx.stroke(); }
  else if(kind==='fang'){ ctx.moveTo(cx-r*0.14,my); ctx.lineTo(cx+r*0.14,my); ctx.stroke(); ctx.fillStyle='#fff'; ctx.beginPath(); ctx.moveTo(cx-r*0.09,my); ctx.lineTo(cx-r*0.03,my+r*0.11); ctx.lineTo(cx-r*0.14,my); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  else if(kind==='tongue'){ ctx.arc(cx,my-r*0.05,r*0.16,0.1*Math.PI,0.9*Math.PI); ctx.stroke(); ctx.fillStyle='#ff7a8f'; ctx.beginPath(); ctx.ellipse(cx+r*0.05,my+r*0.09,r*0.07,r*0.1,0,0,7); ctx.fill(); ctx.stroke(); }
}
function pWings(ctx,cx,cy,r,col,kind){
  if(!kind||kind==='none')return; ctx.strokeStyle='#20202c'; ctx.lineWidth=r*0.05;
  if(kind==='feather'||kind==='dragon'){ ctx.fillStyle=kind==='dragon'?shade(col,-6):lighten(col,10); for(const g of[-1,1]){ ctx.beginPath(); ctx.moveTo(cx+g*r*0.5,cy-r*0.2); ctx.quadraticCurveTo(cx+g*r*1.5,cy-r*0.6,cx+g*r*1.35,cy+r*0.4); ctx.quadraticCurveTo(cx+g*r*0.95,cy+r*0.1,cx+g*r*0.5,cy+r*0.2); ctx.closePath(); ctx.fill(); ctx.stroke(); } }
  else if(kind==='fairy'){ ctx.fillStyle='rgba(255,255,255,.55)'; for(const g of[-1,1]){ ctx.beginPath(); ctx.ellipse(cx+g*r*0.95,cy-r*0.05,r*0.4,r*0.55,g*0.5,0,7); ctx.fill(); ctx.stroke(); } }
}
function pTail(ctx,cx,cy,r,col,kind){
  if(!kind||kind==='none')return; ctx.strokeStyle='#20202c'; ctx.fillStyle=col;
  if(kind==='cat'){ ctx.lineWidth=r*0.14; ctx.beginPath(); ctx.moveTo(cx+r*0.7,cy+r*0.4); ctx.quadraticCurveTo(cx+r*1.3,cy+r*0.1,cx+r*1.05,cy-r*0.4); ctx.stroke(); }
  else if(kind==='devil'){ ctx.lineWidth=r*0.1; ctx.beginPath(); ctx.moveTo(cx+r*0.7,cy+r*0.4); ctx.quadraticCurveTo(cx+r*1.2,cy+r*0.2,cx+r*1.1,cy-r*0.3); ctx.stroke(); ctx.lineWidth=r*0.05; ctx.beginPath(); ctx.moveTo(cx+r*1.1,cy-r*0.3); ctx.lineTo(cx+r*1.0,cy-r*0.52); ctx.lineTo(cx+r*1.28,cy-r*0.42); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  else if(kind==='dragon'){ ctx.lineWidth=r*0.05; ctx.beginPath(); ctx.moveTo(cx+r*0.6,cy+r*0.5); ctx.quadraticCurveTo(cx+r*1.4,cy+r*0.35,cx+r*1.3,cy-r*0.15); ctx.lineTo(cx+r*1.05,cy+r*0.28); ctx.quadraticCurveTo(cx+r*0.9,cy+r*0.5,cx+r*0.6,cy+r*0.5); ctx.closePath(); ctx.fill(); ctx.stroke(); }
}
/* per-widrmon ontwerp */
const SPEC={
 "Nathan":{hat:'cap',eyes:'angry',mouth:'fang'},
 "Yassin":{hat:'headband',eyes:'angry',mouth:'fang'},
 "Daniel":{hat:'auto',eyes:'angry',mouth:'open'},
 "Josh":{ears:'pointy',hat:'cap',eyes:'normal',wings:'feather'},
 "Lars":{col:'#f48fc2',hat:'bow',eyes:'cute',mouth:'smile',wings:'fairy'},
 "Milo":{ears:'pointy',eyes:'normal',wings:'feather',hat:'auto'},
 "Deniz":{eyes:'shades',mouth:'neutral',hat:'auto'},
 "Fionn":{hat:'leaf',eyes:'cute',mouth:'smile'},
 "Reshman":{hat:'auto',eyes:'normal',mouth:'smile'},
 "Renas":{ears:'pointy',hat:'cap',eyes:'normal',wings:'feather'},
 "Adam":{ears:'round',eyes:'normal',mouth:'smile'},
 "Evil Adam":{hat:'auto',eyes:'angry',mouth:'fang',tail:'devil'},
 "Otis":{ears:'dog',eyes:'cute',mouth:'tongue',tail:'cat'},
 "Johan":{hat:'auto',eyes:'normal',mouth:'neutral'},
 "Robin":{body:'teardrop',col:'#6fb7ea',eyes:'cry',mouth:'frown'},
 "Jake":{hat:'auto',eyes:'normal',mouth:'smile'},
 "Kim Chi":{hat:'auto',eyes:'normal',mouth:'smile'},
 "Dean":{hat:'cowboy',eyes:'normal',mouth:'neutral'},
 "Claire":{eyes:'angry',mouth:'open'},
 "Serveerster":{ears:'round',eyes:'normal',mouth:'smile'},
 "Sanne Vosters":{eyes:'glasses',mouth:'frown'},
 "Fluharthy":{hat:'cap',eyes:'angry',mouth:'fang'},
 "Stalker":{body:'ghost',eyes:'cyclops'},
 "Marlin Miami":{eyes:'shades',mouth:'smile'},
 "Sonia Nevermind":{hat:'crown',eyes:'cute',mouth:'smile'},
 "Evil Jax":{eyes:'shades',mouth:'open',hat:'auto'},
 "De Kapper":{hat:'auto',eyes:'normal',mouth:'neutral'},
 "Dynant":{hat:'helmet',eyes:'normal',mouth:'smile'},
 "Adma Jr":{hat:'bow',eyes:'angry',mouth:'fang',tail:'devil'},
 "Kayo & Yara":{ears:'cat',eyes:'cute',mouth:'smile',tail:'cat'},
 "Jenna":{ears:'pointy',eyes:'normal',mouth:'smile'},
 "Druk":{body:'egg',col:'#6a5acd',hat:'auto',eyes:'angry',mouth:'fang',wings:'dragon',tail:'dragon'},
 "Young Fyon":{hat:'leaf',eyes:'cute',mouth:'smile'},
 "Meta AI":{body:'robot',eyes:'normal',hat:'auto'},
 "Intratuin Potplant":{body:'pot',hat:'leaf',eyes:'sleepy',mouth:'neutral'},
 "Slechte Meiden":{eyes:'angry',mouth:'frown'},
 "Hammed":{ears:'fox',eyes:'angry',mouth:'fang',tail:'cat'},
 "Aasta":{col:'#ff8fc4',hat:'halo',eyes:'cute',mouth:'smile',wings:'fairy'},
 "Carol":{body:'ghost',col:'#eda6d6',eyes:'glasses',mouth:'smile'},
 "Prei":{ears:'bunny',eyes:'cute',mouth:'smile'},
 "Isis":{body:'egg',col:'#4a3c78',eyes:'third',hat:'auto',mouth:'neutral'},
 "Devin":{body:'beetle',hat:'auto',eyes:'normal',mouth:'neutral'}
};
function defaultWings(mon){ if(mon.t.includes('Dragon'))return 'dragon'; if(mon.t.includes('Fairy'))return 'fairy'; if(mon.t.includes('Flying'))return 'feather'; return 'none'; }
function drawMon(ctx,cx,cy,r,mon){
  const sp=SPEC[mon.n]||{};
  const c1=sp.col||TYPE_META[mon.t[0]].c, c2=TYPE_META[mon.t[1]||mon.t[0]].c, s=seedOf(mon.n);
  const body=sp.body||'round', ghost=(body==='ghost');
  ctx.fillStyle='rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(cx,cy+r*0.98,r*0.85,r*0.26,0,0,7); ctx.fill();
  pWings(ctx,cx,cy,r,lighten(c1,4), sp.wings||defaultWings(mon));
  pTail(ctx,cx,cy,r,c1, sp.tail||'none');
  if(!ghost && body!=='pot' && body!=='robot') pFeet(ctx,cx,cy,r,c1);
  pBody(ctx,cx,cy,r,c1,body);
  if(body!=='robot'&&body!=='pot') pBelly(ctx,cx,cy,r,c2);
  if(rnd(s,3)<0.4 && !ghost && body!=='robot'){ ctx.fillStyle='rgba(0,0,0,.09)'; ctx.beginPath(); ctx.arc(cx-r*0.36,cy-r*0.2,r*0.11,0,7); ctx.fill(); }
  if(!ghost) pArms(ctx,cx,cy,r,c1);
  pEars(ctx,cx,cy,r,c1, sp.ears||'none');
  const hat=sp.hat||'none';
  if(hat==='auto') featureFront(ctx,cx,cy,r,mon.t[0],c1);
  else pHat(ctx,cx,cy,r,c1,hat);
  pEyes(ctx,cx,cy,r, sp.eyes||(rnd(s,5)>0.7?'angry':'normal'), s);
  pMouth(ctx,cx,cy,r, sp.mouth||'smile');
  ctx.font=`${Math.round(r*0.58)}px serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(mon.e, cx+r*0.74, cy+r*0.66);
}
/* ===================== PIXEL-ART SPRITES (uniek per widrmon) ===================== */
const PXPAL={
 X:'#171320', w:'#f8f8ff', k:'#2b2733', e:'#f4c9a0', E:'#d89b6c',
 p:'#ff8fbf', P:'#e83e8c', r:'#e83b2a', m:'#8f2320', o:'#ff9f2e', f:'#ff6a2b',
 y:'#ffd23e', d:'#d9a441', g:'#4cbf4f', G:'#2f7d33', z:'#a6e34a',
 a:'#7fdce8', i:'#cdeef7', b:'#3a7bd5', B:'#274690', u:'#8a5fd6', U:'#4a2f7a',
 c:'#c2c8d2', C:'#6a7280', s:'#97a6ba', S:'#d6dbe3', n:'#9a6632', N:'#5b3a1e',
 t:'#2fae9c', h:'#34343f', L:'#ffe9c7', q:'#b0e8ff'
};
/* '1'=hoofdkleur '2'=schaduw/buik '3'=accent (per mon via c{}) */
const _PX_OLD={
 "Nathan":{c:{'1':'#c98a5a','2':'#ffe9c7'},g:[
  "...XXXXX....","..XrrrrrX...",".XrrrrrrrX..",".XLLLLLLLX..","..X11111X...","..X1k1k1X...","..X11111X...","..X1mmm1X...",".X1111111X..",".X1X111X1X..",".XX22222XX..","...XX.XX...."]},
 "Yassin":{c:{'1':'#b7bcc6','2':'#eef1f5'},g:[
  "....XXX.....","..X11111X...",".X1111111X..",".XrrrrrrrX..","X111111111X.","X11k111k11X.","X111111111X.","X11mmmmm11X.","X111111111X.",".X1X111X1X..",".XX11111XX..","..XX.X.XX..."]},
 "Daniel":{c:{'1':'#3a3540','2':'#57505e'},g:[
  ".....f......",".....o......","....yfy.....","......X.....","...XXXXX....","..X11111X...",".X1111111X..","X111111111X","X11k111k11X","X111ororo11","X1111111X.","X1X1111X1X",".XX11111XX.","..XX...XX.."]},
 "Josh":{c:{'1':'#3a7bd5','2':'#bfe0ff','3':'#f2a93a'},g:[
  "....XX......","...X11X.....","..X1111X.b..","..X1k11X1b1.","..311113bb1.","..X11111X1..",".X1111111X..","b111111111b","1b11111111b1",".XX11111XX..","...X1.1X....","...X..X....."]},
 "Lars":{c:{'1':'#ff8fbf','2':'#ffd0e6'},g:[
  "..P.....P...","..PP...PP...","...w1X1w....","..X11111X...",".X1k111k1X..",".X1111111X..",".X11PPP11X..",".X1111111X..","..X22222X...","..X1X.X1X...","..XX...XX..."]},
 "Milo":{c:{'1':'#ffd23e','2':'#fff2b0','3':'#3a7bd5'},g:[
  "....y.......","...yy..a....","..X11X.aa...",".X1111X3a...",".X1k11X33...",".X111113a...","X11111113...","X1y111y1X...",".X11111X....","..X1.1X.....","..X..X......"]},
 "Deniz":{c:{'1':'#8fbfe0','2':'#cdeef7'},g:[
  "...i.i.i....","..X11111X...",".X1111111X..","XkkkkkkkkkX",".X1111111X..",".X1i111i1X..",".X1111111X..",".X22222221.",".X2222222X.","..XwXwXwX...","..X.X.X.X..."]},
 "Fionn":{c:{'1':'#4cbf4f','2':'#c6f0a8','3':'#2f7d33'},g:[
  "....z3z.....","....X3X.....","...XGGX.....","..X11111X...",".X1111111X..",".X1k111k1X..",".X1111111X..",".X11ppp11X..","X111111111X",".X22222221.",".XX2222XX..","..XX.XX...."]},
 "Reshman":{c:{'1':'#d0691f','2':'#f2b16a','3':'#ff6a2b'},g:[
  "....f.f.....","...f3f3f....","...XXXX.....","..X1111X....",".X111111X...",".X1k11k1X...",".X111111X...",".X1ooo11X...","X11111111X.",".X2X22X2X..",".XX2..2XX..","..X....X..."]},
 "Renas":{c:{'1':'#e05a2a','2':'#ffd0a0','3':'#3a7bd5'},g:[
  "......XX....",".b...X11X...","1b1.X1111X..",".bb.X1k11X..","..bb311113..","...X111111X.","...311111X..","..b111111b..","..1b1111b1..","...XX11XX...","....X.X....."]},
 "Adam":{c:{'1':'#efe4cf','2':'#d9cbb0','3':'#e83b2a'},g:[
  "...XXXXX....","..X11111X...",".X1111111X..",".X1k111k1X..",".X1111111X..",".X11rrr11X..",".X1111111X..","X111111111X","X1X11111X1X",".XX22222XX.","..X1X.X1X..","..X.....X.."]},
 "Evil Adam":{c:{'1':'#6a4a8f','2':'#c9b3e6','3':'#e83b2a'},g:[
  "..w.....w...","..Xw...wX...","..X11X11X...",".X1111111X..",".X1r111r1X..",".X1111111X..",".X11mmm11X..","X111111111X","X1U11111U1X",".XX11111XX.","..X1X.X1X..",".rr.....rr."]},
 "Otis":{c:{'1':'#c98a4a','2':'#f2e4c8','3':'#5b3a1e'},g:[
  "............","..3......3..","..311....1..",".X1111111X..","X3111k1113X.","X111111111X","X11k11122X.","X111111111X","X111111111X",".X1X.X.X1X.","..X.X.X.X..","...........,"]},
 "Johan":{c:{'1':'#3a7bd5','2':'#97a6ba','3':'#d9a441'},g:[
  "....X3X.....","....X3X.....","...X111X....","..X11111X...","..X1k1k1X...","..X11111X...","..X22222X...",".s2222222s..","s3s22222s3s","..X22222X...","..X2...2X...","..X.....X.."]},
 "Robin":{c:{'1':'#3a7bd5','2':'#bfe0ff','3':'#6fb7ea'},g:[
  ".....X......","....X1X.....","...X111X....","..X11111X...",".X1131311X..",".X1k1k11X...",".3111113...",".X3ooo3X...",".X1111111X.","X11111111X.",".X22222X...","..XX.XX...."]},
 "Jake":{c:{'1':'#8a5fd6','2':'#d3c2f5','3':'#ffd23e'},g:[
  "....3.......","...3X.......","..3.X11X....","..3X1111X...","..X11k11X...","..X111111X..","..3111111...","..X111111X..",".X11111113..","X111111113.",".XX222XX3..","..X1.1X.3.."]},
 "Kim Chi":{c:{'1':'#5fbf46','2':'#bfe89a','3':'#2f7d33'},g:[
  "...3.3.3....","..3G3G3G3...",".XGGGGGGGX..","X311111113X","X111k1k111X","X111111111X","X111mmm111X","X311111113X",".X3111113X.","..X22222X..","..XX...XX.."]},
 "Dean":{c:{'1':'#a06a3a','2':'#d9b483','3':'#8a5a2b'},g:[
  "..XXXXXXX...","..3333333...","XX3333333XX.",".X111111X...",".X1k11k1X...",".X111111X...",".X11mm11X...","X11111111X.","X1n1111n1X.",".XX2222XX..","..X1..1X...","..X....X..."]},
 "Claire":{c:{'1':'#c0392b','2':'#f2a13a','3':'#ffd23e'},g:[
  "..3.f.3.....","3.XXXXX.3...","..X111X.f...",".fX1k1X3....","..311113....","..X1mm1X....",".3111113f...","f3111111X3..","..X1111X....","..X3113X.f..","..XX.XX....."]},
 "Serveerster":{c:{'1':'#e6ddcc','2':'#c9a15a','3':'#e83b2a'},g:[
  "...XXXXX....","..X11111X...",".X1111111X..",".X1k111k1X..",".X1111111X..",".X111r111X..","X111111111X","X11wwwww11X","X1wwwwwww1X",".XwwwwwwwX.",".X1X...X1X.","..X.....X.."]},
 "Sanne Vosters":{c:{'1':'#c98a5a','2':'#efe4cf','3':'#8a5a2b'},g:[
  "..3333333...",".X3333333X..","X311111113X","X31k111k13X","X3111111 3X","X311mmm113X",".X1111111X.",".X2222222X.",".X22222 2X.",".X2X222X2X.","..X1...1X..","..X.....X.."]},
 "Fluharthy":{c:{'1':'#8f96a3','2':'#d6dbe3','3':'#e83b2a'},g:[
  "..XXXXXXX...",".X3333333X..",".XLLLLLLLX..","XX111111XX.","X11k111k11X","X111111111X","X111mmm111X","X111111111X","X11111111X.","X1X11111X1X",".XX22222XX.","..XX.X.XX.."]},
 "Stalker":{c:{'1':'#4a3f5e','2':'#6a5f7e'},g:[
  "...XXXXX....","..X11111X...",".X1111111X..",".X1wwww11X..",".X1wkww11X..",".X1wwww11X..","X111111111X","X111111111X","X111111111X","X1X1X1X1X1X",".X.X.X.X.X."]},
 "Marlin Miami":{c:{'1':'#2fae9c','2':'#a6f0e4','3':'#4cbf4f'},g:[
  "....G3G.....","...G3G3.....","..X11111X...",".X1111111X..","XkkkkkkkkkX",".X1111111X..",".X1111111X..",".X22222 2X.","X111111111X",".X2X222X2X.","..X.....X.."]},
 "Sonia Nevermind":{c:{'1':'#e8a0d0','2':'#f7d6ee','3':'#ffd23e'},g:[
  "..3.3.3.....","..X3X3X.....","..d3d3d.....","..X11111X...",".X1k111k1X..",".X1111111X..",".X11PPP11X..","X111111111X","X1X111111X","X.X22222.X",".XX2X2X2XX.","...X...X..."]},
 "Evil Jax":{c:{'1':'#3a2f4a','2':'#6a5f7e','3':'#ff6a2b'},g:[
  "....X3X.....","....k3s.....","...ks3s.....","..X11111X...",".X1111111X..","XkkkX1kX1X..","X111111111X","X1113331X..","X111mm11X..",".X111111X..",".X1X11X1X..","..X.XX.X..."]},
 "De Kapper":{c:{'1':'#aab2c0','2':'#e2e7ee','3':'#97a6ba'},g:[
  "..S.....S...",".SkS...SkS..","..X11X11X...","..X11111X...","..X1k1k1X...","..X11111X...","..X13331X...",".X1111111X..","X111111111X",".X2X222X2X.","..X.....X.."]},
 "Dynant":{c:{'1':'#c0392b','2':'#e8a89a','3':'#ffd23e'},g:[
  "...XXXXX....","..XrrrrrX...",".XrrrrrrrX..",".X3rrrrr3X..","..X11111X...","..X1k1k1X...","..X11111X...","..X1www1X...",".X1111111X..","X111111111X",".XX22222XX.","..XX.X.XX.."]},
 "Adma Jr":{c:{'1':'#b0509a','2':'#e6b3d8','3':'#e83b2a'},g:[
  "..w...w.....","..Xw.wX.....","..X1P1X.....",".X1P1P1X....",".X11111X....",".X1r1r1X....",".X11111X....","X1113111X..","X1111111X..",".XX111XX...","..X1.1X.rr.","..X...X.r.."]},
 "Kayo & Yara":{c:{'1':'#4a4550','2':'#8a8592','3':'#c2c8d2'},g:[
  ".3.3....3.3.",".X1X....X1X.","XX1XX..XX1XX","X111X..X111X","X1k1X..X1k1X","X1111XX1111X","X1111111111X","X11k111k111X","X1111111111X",".X11XXXX11X.","..X.X..X.X.."]},
 "Jenna":{c:{'1':'#ffd23e','2':'#fff2b0','3':'#3a7bd5'},g:[
  ".....y......","....yy......","...y11y.....","..X1111X....",".X1k11k1X...",".X111111X...","yy11ooo11...","..X111111X..","..X1111X.y..","..X1.1X.yy..","..X..X......"]},
 "Druk":{c:{'1':'#7a4fd0','2':'#c9b3e6','3':'#ffd23e'},g:[
  "..3..u......",".3X.uuu.....","..XuuuuuX...",".u1k11uu....","uu1111uuu...",".X111111u...","..X2111u....","...X211u.uu.","....X21uuu..","..u.X211u...","uuu..X21X...",".u...X..X..."]},
 "Young Fyon":{c:{'1':'#8fd36a','2':'#d6f0b8','3':'#ffd23e'},g:[
  "....z.......","....X3......","...XGGX.....","...X11X.....","..X1111X....","..X1k11X....","..X1111X....","..X1www1X...","..X11111X...","...X222X....","...XX.XX...."]},
 "Meta AI":{c:{'1':'#8f96a3','2':'#cfd6df','3':'#3a7bd5'},g:[
  "....X3X.....","....s3s.....","..XSSSSSX...",".XS22222SX..",".XS3333 SX..",".Xa a a aX..",".XS aaa SX..",".XSSSSSSSX..","X1XSSSSSX1X.","X1XSSSSSX1X.",".X.XX.XX.X.."]},
 "Intratuin Potplant":{c:{'1':'#4cbf4f','2':'#2f7d33','3':'#c96a3a'},g:[
  "...z.z.z....","..GzGzGzG...","..2G3G3G2...","...GGGGG....","....X1X.....","....X1X.....","..X33333X...","..X33333X...","...X333X....","...X3.3X....","....XXX....."]},
 "Slechte Meiden":{c:{'1':'#8a5fd6','2':'#c9b3e6','3':'#e83e8c'},g:[
  ".33.33.33...",".X1X1X1X....","X111X111X...","X1k1X1k1X...","X111X111X...","X1PP1PP1X...","X11111111X..","X11111111X..",".X1X11X1X...","..X.XX.X....","..3.3.3....."]},
 "Hammed":{c:{'1':'#4a3f4a','2':'#d9a441','3':'#f2e4c8'},g:[
  "3.......3...","33.....33...",".X31..13X...","X3311113X...","X31k1k13X...","X311m113X...","X311111111X","X3111111112","X3111111112","X31X11X13.2",".X.X..X.X.2."]},
 "Aasta":{c:{'1':'#ff8fbf','2':'#ffe0ee','3':'#ffd23e'},g:[
  "...3333.....","...X..X.....","...w11w.....","w.X1111X.w..","ww31k1k3ww..","w311111113w.","w31PPPPP13w.","w311111113w.",".w3111113w..","..X22222X...","..X1X.X1X...","..X.....X..."]},
 "Carol":{c:{'1':'#e6a6d6','2':'#f7d6ee','3':'#8a5fd6'},g:[
  "..333333....",".3111111X...","X31k1k113X..","X3111111 X..","X311www 13X.","X31wkwkw13X.","X3111111 3X.","X311111113X.","X311111113X.",".X1X1X1X1X..","..X.X.X.X..."]},
 "Prei":{c:{'1':'#7fce5a','2':'#d6f0b8','3':'#2f7d33'},g:[
  "..3.3.......","..X3X3......","..X1X1X.....","..X111X.....",".X11111X....",".X1k1k1X....",".X111111X...",".X11ww11X...","X1111111X...","X1X1111X....",".XX222XX....","..X1.1X....."]},
 "Isis":{c:{'1':'#3a2f5e','2':'#6a4fa0','3':'#ffd23e'},g:[
  ".....3......","....X3X.....","...X111X....","..X11311X...",".X1131311X..",".X1111111X..","u111k1111u..","u113k311u...",".X1111111X..","..X11111X...","..X2X.X2X...","...X...X...."]},
 "Devin":{c:{'1':'#7a5a2a','2':'#3a2a12','3':'#a6803a'},g:[
  "....22......","....XX......","...X22X.....","..3X22X3....","..X111111X..",".X13333311X.","X1113311111X","X111k1k111X.","X1111111111X",".X1X1X1X1X..","..X.X.X.X..."]}
};
/* hi-res, herkenbare pixel-sprites (16 breed) */
const PX={
 "Nathan":{c:{'1':'#2f56a8','2':'#e83b2a'},g:[
  ".....XXXXXX.....",".....X2222X.....","....X222222X....","...X22222222X...","...XwwwwwwwwX...","....XeeeeeeX....","....XkeeekeX....","....XeeeeeeX....","....XemmmmeX....","...XX1111XXX....","..Xe11111111X...","..Xe1wNw111eX...","..X111NN1111X...","...X111111X.ww..","...X1X..X1X.wm..","...XX....XX.ww.."]},
 "Yassin":{c:{'1':'#f2f2f7','2':'#e83b2a'},g:[
  "....XXXXXXXX....","...X22222222X...","...XeeeeeeeeX...","...XekeeekeeX...","...XeeeeeeeeX...","...XeemmmeeeX...","....XXXXXX.....","..X111111111X..",".X11111111111X.",".X11X1111X111X.",".X11X1111X111X.","..X111hhh111X..","..X11111111X...","...X11X.X11X...","...X1X...X1X...","..XX.....XX...."]},
 "Daniel":{c:{'1':'#33303c','2':'#57505e'},g:[
  "..........f.....","..........o.....",".........fyf....","........Xh......",".......Xh.......","....XXXXXXXX....","..XX22222222XX..",".X2211111112 X.","X221111111112X.","X21111k11k111X.","X211111111111X.","X21111ooo1111X.","X211111111112X.",".X22111111122X.","..XX222222XX...","....XXXXXX....."]},
 "Josh":{c:{'1':'#3a7bd5','2':'#bfe0ff','3':'#f2a93a'},g:[
  "......XXXX......",".....X1111X.....","....X111111X....","...X11k1111X....","...X1111113333..","...X2111111X.33.","..X211111111X...","..X21111111 X...",".X2222111111X...","bb22221111111X..","b.b2211111111X..","..b.X111111X....","....X11111X.....","....X1X.X1X.....","...X1X...X1X....","...X.....X....."]},
 "Lars":{c:{'1':'#ff8fbf','2':'#ffd0e6'},g:[
  "...PP......PP...","..PXPX....PXPX..","...PPXX..XXPP...","....XwwwwwwX....","...X11111111X...","..X1111111111X..","..X1k1111k11X...","..X111111111X...","..X1111111111X..","..X11PPPPPP1X...","..X1111111111X..","...X22222221X...","...X22222221X...","...X2X....X2X...","..XX......XX...","..X........X..."]},
 "Milo":{c:{'1':'#ffd23e','2':'#fff2b0','3':'#3a7bd5'},g:[
  ".......y........","......yy...aa...","....X11X..a3a...","...X1111X.a3....","...X11111Xa3....","..X1111111X3....","..X1k111k1X.....","..X1111111X.....","yy1111ooo11.....","..X11111111X....","..X1111111X.....","...X11111X......","...X1X.X1X......","...X1X.X1X......","..XX.....XX....","..X.......X...."]},
 "Deniz":{c:{'1':'#8fc0e6','2':'#cdeef7'},g:[
  "...i....i...i...","..XXXXXXXXXX....",".X1111111111X..","X111111111111X.","XkkkkkkkkkkkkX.","X111111111111X.","X11111111111 X.","X1i11111111i1X.","X111111111111X.","X122222222221X.","X122222222221X.",".X2222222222X..",".XwX.wX.wX.wX..","..w...w...w....","..w...w...w....","..............."]},
 "Fionn":{c:{'1':'#4cbf4f','2':'#c6f0a8','3':'#2f7d33'},g:[
  ".....z.z.z......",".....X3X3X......","......XGX.......","....XXXXXXX.....","...X1111111X....","..X111111111X...","..X11k111k11X...","..X111111111X...","..X111ppp111X...","..X1111111111X..",".X111111111111X.",".X111111111111X.","..X2222222221X..","..X2X.....X21X..","..XX.......XX..","..X.........X.."]},
 "Reshman":{c:{'1':'#d0691f','2':'#f2b16a','3':'#ff6a2b'},g:[
  ".......f........","......f3f.......",".....f333f......","......X3X.......","....XXXXXX......","...X111111X.....","..X11111111X....","..X1k1111k1X....","..X11111111X....","..X111mm111X....","..X1111111111X..",".X11111111111X..",".X1oo1111oo11X..","..X111111111X...","..X1X....X1X....","..XX......XX...."]},
 "Renas":{c:{'1':'#e05a2a','2':'#ffd0a0','3':'#3a7bd5'},g:[
  "......XXXX......",".....X1111X.....","....X111111X3333","...X11k1111X.33.","...X111111 X.....","..X2111111X.....","..X2111111X.....",".X22211111X.....","3322211111X.....",".33X1111111X....","...X111111X.....","...X11111X......","...bX.Xb.......","..bb...bb......","..b.....b......","..............."]},
 "Adam":{c:{'1':'#efe4cf','2':'#d9cbb0','3':'#e83b2a'},g:[
  "....XXXXXX......","...X111111X.....","..X11111111X....","..X1k1111k1X.NNN","..X11111111XN3N.","..X111rr111XNNN.","..X11111111X.N..","..X11111111X....",".X1111111111X...",".X11X1111X11X...",".X1111111111X...","..X22222222X....","..X22222222X....","..X2X....X2X....","..XX......XX....","..X........X..."]},
 "Evil Adam":{c:{'1':'#6a4a8f','2':'#3a2a52','3':'#e83b2a'},g:[
  "..w..........w..","..Xw........wX..","..X2w......w2X..","...X22wwww22X...","...X11111111X...","...X1r1111r1X...","...X11111111X...","...X11mmmm11X...","..XX11111111XX..",".X2111111111 2X.","X22111111111122X",".X2211111111 2X.","..X2222222222X..","..X22X....X22X..","..XX........XX..","3.X..........X.3"]},
 "Otis":{c:{'1':'#cf9b56','2':'#f7efe0','3':'#5f3f22'},g:[
  "....XXXXXXXX....","..XX3XXXXXX3XX..",".X33X111111X33X.",".X33X111111X33X.",".X33X1k11k1X33X.",".X33X111111X33X.",".XX3X111111X3XX.","..XX11222211XX..","...X11222211X...","...X1122kk11X...","...X11mmmm11X...","..X1111111111X..","..X1122222211X..","..XX11X..X11XX.."]},
 "Johan":{c:{'1':'#3a7bd5','2':'#d9a441'},g:[
  "......X22X......","......X22X......",".....X1111X.....","....X111111X....","....X1k11k1X....","....X111111X....","....X1wwww1X....","....X111111X....","....XX2222XX....",".....X2222X.....",".....X2222X.....",".....X2222X.....","....XssssssX...","...XsssssssX...","..XsssssssssX..",".XsssssssssssX."]},
 "Robin":{c:{'1':'#3a7bd5','2':'#bfe0ff','3':'#6fb7ea'},g:[
  ".......X........","......X1X.......",".....X111X.....","....X11111X.....","...X1131311X....","..X111111111X...","..X31k11k13X....","..3X111111X3....","..3X1mmmm1X3....","..3X111111X3....","..X1111111111X..",".X111111111111X.",".X1111111111 1X.","..X222222222X...","..X2X.....X2X...","..XX.......XX..."]},
 "Jake":{c:{'1':'#8a5fd6','2':'#d3c2f5','3':'#d9a441'},g:[
  "....XXXXXX...3..","...X222222X.33..","..X22222222X3...","..X2eeeeee2X3...","..X2k1111k2X.3..","..X21111112X..3.","..X211mm112X..3.","..X21111112X..3.",".X22111111 2X.3.","X2 2111111122X3.",".X2211111122X.3.","..X21111112X..3.","..X21111112X.3..","..X2X....X2X33..","..XX......XX3...",".............3.."]},
 "Kim Chi":{c:{'1':'#5fbf46','2':'#bfe89a','3':'#2f7d33'},g:[
  "...3..3..3..3...","..3G3G3G3G3G3...",".X3G3G3G3G3G3X..",".X1111111111 X.","X311111111111 3","X3111k1k11111 3","X311111111111 3","X311111111111 3","X311mmmmm1111 3","X31111111111 13",".X311111111 3X.",".X3311111133X..","..X22222222X...","..X2X....X2X...","..XX......XX...","..X........X..."]},
 "Dean":{c:{'1':'#a06a3a','2':'#d9b483','3':'#8a5a2b'},g:[
  "....XXXXXXXX....","...X33333333X...","XXXX33333333XXXX",".X33333333333333","..X1111111X.....","..X1k111k1X.....","..X111111 X.....",".rrX111111Xrr...",".r.X111mm1X.r...","...X111111X.....","..X11111111X....","..X11111111X....","..X1X....X1X....","..X3X....X3X....","..X3X....X3X....","..XXX....XXX...."]},
 "Claire":{c:{'1':'#c0392b','2':'#ff9f2e','3':'#ffd23e'},g:[
  "...3....f...3...","3...f..X2X..f..3",".f.X2..222..2X.f","..X222.232.222X.",".f2223222232223f","X2232223332322 X",".22232k323k2322.","f2223222222 223f",".X22322mmm22322X","f2223222222222 f",".X2232222223 2X.","..X22322222322X.","3.f2X2232322X2f3",".f..X22.2.22X..f","3...X2X...X2X..3","....f.......f..."]},
 "Serveerster":{c:{'1':'#e6ddcc','2':'#c98a5a','3':'#e83b2a'},g:[
  "....XXXXXX......","...X222222X.....","..X22222222X....","..X2k2222k2X....","..X22222222X....","..X222mm222X....",".X1111111111X.ww",".X11113111 X.wLw","X1111333111 XwLw","X111133311 1X ww","X1111111111 1X..",".X11111111 1X...",".X111111111X....",".X1X....X1X.....",".XX......XX.....",".X........X....."]},
 "Sanne Vosters":{c:{'1':'#c98a5a','2':'#8a5a2b','3':'#efe4cf'},g:[
  ".....X22X.......","...X222222X.....","..X22222222X....",".X2211111122X...",".X21ww11ww12X...",".X21wkw1wkw2X...",".X2111111112X...",".X2111mm1112X...","..X22111122X....","...X111111X.....","..X33333333X....",".X3333333333X...",".X3311111133X...",".X33111111 3X...","..X33X..X33X...","..XXX....XXX..."]},
 "Fluharthy":{c:{'1':'#8f96a3','2':'#2f56a8'},g:[
  "....XXXXXXXX....","...X22222222X...","..X2222222222X..","..XwwwwwwwwwwX..","...XeeeeeeeeX...","...XkeeeeekeX...","...XeeeeeeeeX...","...XeemmmmeeX...","..XX222222XXX...",".Xe222222222X...","Xe22221w22222X.","X 2222w1w2222 X","X 22221w222222X.",".X2222222222X...","..X22X..X22X...","..XXX....XXX...."]},
 "Stalker":{c:{'1':'#3a3050','2':'#2a2440'},g:[
  "...XXXXXXXXXX...","..X1111111111X..",".X111111111111X.","X11111111111111X","X11wwwwwwwww11X.","X1wwwwwwwwwww1X.","X1wwwwkkwwwww1X.","X1wwwkkkkwwww1X.","X1wwwwkkwwwww1X.","X1wwwwwwwwwww1X.","X11wwwwwwwww11X.","X111111111111 X.","X1111111111111X","X1X11X11X11X11X",".X.XX.XX.XX.XX.","...............,"]},
 "Marlin Miami":{c:{'1':'#2fae9c','2':'#a6f0e4','3':'#4cbf4f'},g:[
  "....G3G..3G.....","...G3G3GG3G3....","....XXXXXX......","...X111111X.....","..X11111111X....","..XkkkkkkkkX....","..X11111111X....","..X11111111X....",".X1111111111X...",".X1122222211X...","X111111111111X..","X111111111111X..",".X1111111111X...","..X11X..X11X....","..X1X....X1X....","..XX......XX...."]},
 "Sonia Nevermind":{c:{'1':'#f0a6d6','2':'#f9d6ee','3':'#ffd23e'},g:[
  "...3...3...3....","..3X3.3X3.3X3...","..d3d3d3d3d3d...","...XXXXXXXX.....","..X22222222X....",".X2211111122X...",".X21k1111k12X...",".X2111111112X...",".X211PPPP112X...","..X22222222X....","..X1111111 1X...",".X111111111 X...","X1111PPPP1111X..","X111111111111X..",".X11X....X11X...",".XX........XX..."]},
 "Evil Jax":{c:{'1':'#3a2f4a','2':'#6a5f7e','3':'#ff6a2b'},g:[
  "....XXXXXX...h..","...X111111X.hh..","..Xhhhhhhh1X.h..","..X1eeeeee1Xh...","..X1k1111k1Xh...","..X1eeeeee1hh...","..X1e3333e1.h...","..X1e3333e1.....",".X11111111 1X...","dddd11111111X...",".X111111111 X...","..X1113111X.....","..X1113111X.....","..X1X...X1X.....","..XX.....XX.....","..X.......X....."]},
 "De Kapper":{c:{'1':'#aab2c0','2':'#e2e7ee','3':'#97a6ba'},g:[
  "..S........S....",".SkS......SkS...","..SS.SSSS.SS....","....X2222X......","...X222222X.....","...X2k11k2X.....","...X222222X.....","...X211112X.....","..X33333333X....",".X3311111133X...","X331111111133X..","X31111111111 X..",".X3111111113X...","..X11X..X11X....","..X1X....X1X....","..XX......XX...."]},
 "Dynant":{c:{'1':'#c0392b','2':'#e8a89a','3':'#ffd23e'},g:[
  "....XXXXXX......","...X111111X.....","..X11111111X....","..X13333331X....","...X222222X.....","...X2k11k2X.....","...X222222X.....","...X2wwww2X.....","..XX111111XX...","aX111111111X...","a X111111111X..","aa.X1111111X...","...X1111111X...","...X1X..X1X....","...XX....XX....","...X......X...."]},
 "Adma Jr":{c:{'1':'#b0509a','2':'#e6b3d8','3':'#e83b2a'},g:[
  "..w........w...","..Xw......wX...","P.X2w....w2X.P.","PP.X2wwww2X.PP.","..X21111112X...","..X21r11r12X...","..X2111111 2X...","..X211mm112X...",".X2211111122X..",".X2111111112X..","X22111111111 X.",".X2222222222X..","..X22X..X22X.rr",".XX......XX.r..","3X........X.r.","3.........3..."]},
 "Kayo & Yara":{c:{'1':'#4a4550','2':'#8a8592','3':'#c2c8d2'},g:[
  ".3.3.......3.3.","3X1X3.....3X1X3","X111X.....X111X","X1k1X.....X1k1X","X1112XXXXX2111X","X11122222221 1X","X111111111111 X","X11k1111111k11X","X111111mm11111X","X1111111111111X","X111111111111 X",".X11XXXXXX11X..","..X1X....X1X...","..X1X....X1X...","..XX......XX...","..............."]},
 "Jenna":{c:{'1':'#ffd23e','2':'#fff2b0','3':'#3a7bd5'},g:[
  ".......y........","......yy........",".....y11y......","....X1111X.....","...X1k11k1X....","...X111111X....","yyy111oo111....","..X11111111X.LL","..X11111111X.nL","..X111111 1X.LL",".X11111111 X....","..X111111X.....","..X1X..X1X.....","..X1X..X1X.....","..XX....XX....","..X......X...."]},
 "Druk":{c:{'1':'#7a4fd0','2':'#c9b3e6','3':'#ffd23e'},g:[
  "...3..3.........","...X33X.uu......","..u3113uuuu.....","..u1k11uuu......","..uu11133u......","...X1111u.......","...u2111u..uu...","...uX211u.uuuu..","....X21uu.uu....","...uuX21uuu.....","..uuuuX21u......","..uu..X21uu.....","......X211uu....",".......X21uuu...","........X21X....","........X..X...."]},
 "Young Fyon":{c:{'1':'#8fd36a','2':'#d6f0b8','3':'#ffd23e'},g:[
  ".......z........",".......X3.......","......XGGX......","......X11X......",".....X1111X.....","....X111111X....","....X11k11X.....","....X1111 X.....","....X1www1X.....","...X11111 1X....","...X1122211X....","...X1122211X....","....X2222X.....","....X2..2X.....","....XX..XX.....","...............,"]},
 "Meta AI":{c:{'1':'#8f96a3','2':'#274690','3':'#3a7bd5'},g:[
  ".......s.......",".......s.......","......sSs......","...XSSSSSSSX...","..XS2222222SX..","..XS2a222a2SX..","..XS2222222SX..","..XS2aaaaa2SX..","..XSSSSSSSSSX..",".XSXSSSSSSXSX..",".XSXSSSSSSXSX..","..XSSSSSSSX....","..XS.....SX....","..XS.....SX....","..XXX...XXX....","..XX.....XX...."]},
 "Intratuin Potplant":{c:{'1':'#4cbf4f','2':'#2f7d33','3':'#c96a3a'},g:[
  "....z...z...z...","...zGz.zGz.zGz..","..2GzGzGzGzG2...","...GGGGGGGGG....","....2G2G2G2.....","......X1X......","......X1X......",".....XX1XX.....","....X33333X....","...X3333333X...","...X3333333X...","...X3333333X...","...X33333 3X...","....X33333X....","....X3...3X....","....XXXXXXX...."]},
 "Slechte Meiden":{c:{'1':'#8a5fd6','2':'#c9b3e6','3':'#e83e8c'},g:[
  ".3..3..3..3.....","XhX.XhX.XhX....","X1XhX1XhX1X....","X1kXX1kXX1kX...","X111X111X111X..","X1P1X1P1X1P1X..","X111X111X111X..","XX1XXX1XXX1XX..","X111111111111X.","X111111111111X.","X111111111111X.","X11X111X111X1X.",".X1X.X1X.X1X.3.","..XX..XX..XX.3.","..............3","..............3"]},
 "Hammed":{c:{'1':'#5a4030','2':'#d9a441','3':'#f2e4c8'},g:[
  "3.............3.","33...........33","1X3.........3X1","11X3.......3X11","X31X.......X13X","X311XXXXXXX113X","X3113333333113X","X31k1333331k13X","X31133mm3331 3X2","X311333333113X22","X3111111111 3X22","X311X1111X113X2.",".X.X.X...X.X.X..","...X.X...X.X....","...X.X...X.X....","..............."]},
 "Aasta":{c:{'1':'#ff8fbf','2':'#ffe0ee','3':'#ffd23e'},g:[
  "....333333......","...3......3.....","....wwwwww......","w..X111111X..w..","ww.X1k11k1X.ww..","www31111113www..","ww3X1mmmm1X3ww..","w.3X111111X3.w..","..3X1111 1X3....","...31111113.....","...X111111X.....","...X1PPPP1X.....","...X111111X.....","...X1X..X1X.....","...XX....XX.....","...X......X....."]},
 "Carol":{c:{'1':'#e6a6d6','2':'#f7d6ee','3':'#8a5fd6'},g:[
  "...333333......","..3X1111X3.....","..X311113X.....","..X1wwww1X.....","..X1wkkw1X.....","..X311113X.....","..X311mm3X.....",".X31111113X....","X3111111113X...","X3111111113X.d.","X3111111113X.d.",".X31111113X..d.","..X1X1X1X1X..d.","...w.w.w.w...d.","..w.w.w.w..ddd.","..............."]},
 "Prei":{c:{'1':'#7fce5a','2':'#d6f0b8','3':'#2f7d33'},g:[
  "...3.3.......z..","...X3X3.....z3..","...X1X1X....z3..","...X111X....z3..","..X11111X...z3..",".X1k111k1X..z3..",".X1111111X.zG3..",".X11wwww1X.G3...","X111111111X G...","X1111111111X....","X1111111111X....",".X11111111X.....",".X1X....X1X.....",".X1X....X1X.....","XX.X....X.XX...","..............."]},
 "Isis":{c:{'1':'#2a2044','2':'#6a4fb0','3':'#b98fff'},g:[
  ".....33333.....","...332222233...","..3221111223 3.",".32211333112 23","3221133 3311223",".2113 3y3 3112.","32113 3ky3 3123","3211 3 y3 3 1123","3221133k33112 3",".3221133311223.","..322111112233.","...3221122 33..","....33222333...","......333......",".....wX.Xw.....","....w.....w...."]},
 "Devin":{c:{'1':'#6b4a24','2':'#3a2812','3':'#a6803a'},g:[
  ".......22.......","......2222......",".....X2222X.....","....X3222 3X....","...X33222233X...","..X3111111113X..",".X311111111113X.","X31111k11k1111X","X3111111111113X","X31133333331 3X","X31111111111 3X",".X3111111111 3X.","2.X33333333X.2..","22XX......XX22..","2..2......2..2.","...............,"]}
};
const _spriteCache={};
function pxURL(mon){
  if(_spriteCache[mon.n]) return _spriteCache[mon.n];
  const spec=PX[mon.n];
  const pal=Object.assign({}, PXPAL, spec.c||{});
  const rows=spec.g, H=rows.length; let W=0; rows.forEach(r=>W=Math.max(W,r.length));
  const S=9, cv=document.createElement('canvas'); cv.width=W*S; cv.height=H*S;
  const x2=cv.getContext('2d');
  for(let y=0;y<H;y++){ const row=rows[y]; for(let x=0;x<row.length;x++){ const col=pal[row[x]]; if(col){ x2.fillStyle=col; x2.fillRect(x*S,y*S,S,S); } } }
  return _spriteCache[mon.n]=cv.toDataURL();
}
/* echte afbeeldingen per mon: drop "<slug>.png" in de map (bijv. nathan.png, kim_chi.png).
   Ontbreekt 'ie? Dan valt de sprite automatisch terug op de pixel-art. */
const IMG={ "Kayo & Yara":"Kayo&Yara.png", "Marlin Miami":"marlinmiami.png", "De Kapper":"kapper.png" };  // handmatige override: {"Naam":"bestand.png"}
function monSlug(n){ return n.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,''); }
function spriteURL(mon){
  if(_spriteCache[mon.n]) return _spriteCache[mon.n];
  if(PX[mon.n]) return pxURL(mon);
  const c=document.createElement('canvas'); c.width=c.height=128;
  drawMon(c.getContext('2d'),64,72,38,mon);
  return _spriteCache[mon.n]=c.toDataURL();
}
function monImg(mon,fill){
  const w=fill||'100%';
  const file=IMG[mon.n]||(monSlug(mon.n)+'.png');
  const fb=spriteURL(mon);
  return `<img src="${file}" alt="${mon.n}" onerror="this.onerror=null;this.src='${fb}';this.style.imageRendering='pixelated'" style="width:${w};height:${w};object-fit:contain">`;
}

/* ============ STATE ============ */
let player = null;
let beaten = new Set();          // trainer ids verslagen
let currentSel = [];             // team builder selectie (namen)
let pendingBattle = null;        // {kind:'free'|'trainer'|'wild', ...}
let caught = new Set();          // gevangen soorten (namen)
let party = [];                  // team/box: [{sp, lvl, xp}], max 12
let starterChosen = false;
let money = 0;                   // widr-munten
let bag = {widrball:0, superbal:0, hyperbal:0, potion:0, superpotion:0, herbal:0}; // vangballen + medicijnen
let itemsPicked = new Set();        // opgeraapte veld-items (blijven weg)
var WORLD_STATE = {mi:0,x:6,y:9,face:'up',started:false};
const PARTY_MAX = 4;
let box = [];                     // PC-opslag: widrmon die niet in je team van 4 passen
let hms = new Set();              // gevonden veldkunsten (HM's): 'cut','smash','surf','fly'
let visited = new Set();          // bezochte steden/dorpen (REGION-index) — voor Vlucht/Teleport

/* ---- levels & stats ----
   Elke widrmon start rond 0.5x z'n base en groeit fors per level.
   De stats waar 'ie al goed in is groeien sneller (specialisatie). */
function statAvg(m){ return (m.hp+m.atk+m.def+m.spd)/4; }
function growthSlope(base,avg){ return 0.04 * Math.pow(base/avg, 1.6); }
function statAt(base,L,avg){
  avg = avg || base;
  return Math.max(1, Math.round(base*(0.5 + growthSlope(base,avg)*(L-1))));
}
function hpAt(base,L,avg){
  avg = avg || base;
  return Math.round(base*(0.5 + growthSlope(base,avg)*(L-1))) + L + 10;
}
function xpNeed(L){ return 14 + L*10; }
const LEARN_LV=[1,5,9,13,17,22,27,33,39];
function mvPw(mv){ return mv.cat==='status'?60:mv.p; }
function moveByKey(k){ return GENERAL_MOVES[k]||TYPE_MOVES[k]||SIGNATURE_MOVES[k]||STATUS_MOVES[k]||HM_MOVES[k]; }
/* thematische off-type coverage per type — zodat mons meer dan alleen STAB + Normal leren */
const TYPE_COVERAGE={
  Normal:['Fighting','Rock'], Fire:['Ground','Rock','Fighting'], Water:['Ice','Ground'],
  Electric:['Steel','Flying','Ice'], Grass:['Poison','Ground','Rock'], Ice:['Water','Flying','Rock'],
  Fighting:['Rock','Dark','Fire'], Poison:['Ground','Dark','Psychic'], Ground:['Rock','Fire','Poison'],
  Flying:['Fighting','Steel','Rock'], Psychic:['Fairy','Ghost','Fighting'], Bug:['Poison','Ground','Flying'],
  Rock:['Ground','Fighting','Fire'], Ghost:['Dark','Poison','Fairy'], Dragon:['Fire','Fairy','Ground'],
  Dark:['Ghost','Fighting','Poison'], Steel:['Rock','Ground','Fairy'], Fairy:['Psychic','Dragon','Fire']
};
function learnsetOf(sp){
  const m=byName(sp);
  const have={}, keys=[];
  const add=k=>{ const mv=moveByKey(k); if(mv&&!have[mv.n]){ have[mv.n]=1; keys.push(k); } };
  m.mv.forEach(add);                                      // eigen moves (incl. signature)
  // STAB-types = eigen types + types van aanval-moves die de mon al kent
  const stab=new Set(m.t);
  m.mv.forEach(k=>{ if(k.indexOf('T_')===0) stab.add(k.slice(2)); });
  for(const t of stab) add('TW_'+t);       // zwakke STAB (vroeg te leren)
  for(const t of stab) add('T_'+t);        // sterke STAB
  // coverage: thematische aanvallen van ANDERE types (bv. Water/Poison → IJsstraal, Aardbeving)
  const cov=[];
  m.t.forEach(t=>(TYPE_COVERAGE[t]||[]).forEach(c=>{ if(!m.t.includes(c) && cov.indexOf(c)<0) cov.push(c); }));
  for(const c of cov){ if(keys.length>=9) break; add('T_'+c); }
  // neutrale vulling alleen als het nog te kort is
  for(const k of ['G_QUICK','G_HEAD','G_TAKE']){ if(keys.length>=7) break; add(k); }
  keys.sort((a,b)=>mvPw(moveByKey(a))-mvPw(moveByKey(b)));  // zwak → sterk
  return keys.map((k,i)=>({key:k, mv:moveByKey(k), lvl: LEARN_LV[i]||(39+(i-8)*6)}));
}
function defaultMoveKeys(sp,L){ return learnsetOf(sp).filter(o=>o.lvl<=L).slice(-4).map(o=>o.key); }
function knownMoves(sp,L){   // gebruikt voor tegenstanders (auto: 4 sterkste geleerd)
  const ls=learnsetOf(sp);
  const keep=ls.filter(o=>o.lvl<=L).slice(-4);
  return (keep.length?keep:ls.slice(0,1)).map(o=>o.mv);
}
function trainerLevel(t){
  if(t.role==='Gym') return [0,7,10,14,19,25,31,38,45][t.order] || (4+t.order*4);  // zachter vroeg, steiler laat
  if(t.role==='Elite') return 40 + t.order*2;     // 42,44,46,48
  if(t.role==='Champion') return 54;
  if(t.role==='Evil') return 22 + t.order*12;      // 34,46
  if(t.role==='Rival') return 6 + (typeof GYM_ORDER!=='undefined'?GYM_ORDER.filter(id=>beaten.has(id)).length:0)*4;
  return 10;
}
// sterke (hoge-BST) mons verschijnen als tegenstander een paar levels lager, zodat aces vroeg niet oneindig OP zijn
function bstOf(m){ return m.hp+m.atk+m.def+m.spd; }
function enemyLvl(name,baseL){ const m=byName(name); if(!m) return baseL; const adj=Math.round(Math.max(0,bstOf(m)-300)/22); return Math.max(2, baseL-adj); }
let LEARN_QUEUE=[];
let EVO_QUEUE=[];
function gainXp(fighters, amount){
  const seen={};
  fighters.forEach(f=>{ if(f.pIdx==null||seen[f.pIdx])return; seen[f.pIdx]=1; const p=party[f.pIdx]; if(!p)return;
    if(!Array.isArray(p.moves)) p.moves=defaultMoveKeys(p.sp,p.lvl);
    const startLvl=p.lvl;
    p.xp=(p.xp||0)+amount; let ups=0;
    while(p.xp>=xpNeed(p.lvl) && p.lvl<100){ p.xp-=xpNeed(p.lvl); p.lvl++; ups++; }
    if(ups>0 && typeof toast==='function') toast(`${p.sp} → Lv ${p.lvl}! ⬆️`);
    // evolutie
    let evolved=false; const fromSp=p.sp; const evo=byName(p.sp).evo;
    if(evo && p.lvl>=evo.lv){ p.sp=evo.into; evolved=true; EVO_QUEUE.push({pIdx:f.pIdx, from:fromSp, to:p.sp}); }
    // welke moves hoort deze mon nu te kennen?
    //  - normaal: alleen de zojuist bereikte levels
    //  - na evolutie: de HELE learnset van de nieuwe vorm t/m dit level (inhaalslag — anders mis je alles van vóór het evo-level)
    const learn = evolved
      ? learnsetOf(p.sp).filter(o=>o.lvl<=p.lvl)
      : learnsetOf(p.sp).filter(o=>o.lvl>startLvl && o.lvl<=p.lvl);
    let d=1;
    learn.forEach(o=>{
      if(p.moves.includes(o.key)) return;
      if(p.moves.length<4){ p.moves.push(o.key); if(!evolved && typeof toast==='function'){ const nm=o.mv.n; setTimeout(()=>toast(`${p.sp} leerde ${nm}! ✨`), 300*(d++)); } }
      else LEARN_QUEUE.push({pIdx:f.pIdx, key:o.key});
    });
    if(typeof updateBattleXp==='function') updateBattleXp();
  });
  saveProgress();
  if(EVO_QUEUE.length && typeof processEvoQueue==='function') processEvoQueue();   // eerst de evolutie-animatie(s), daarna de leer-prompts
  else if(typeof processLearnQueue==='function') processLearnQueue();
}
/* ---- evolutie-animatie ---- */
let EVO_CB=null;
function processEvoQueue(){
  if(!EVO_QUEUE.length){ if(typeof processLearnQueue==='function') processLearnQueue(); return; }
  const it=EVO_QUEUE.shift();
  playEvolution(it.from, it.to, processEvoQueue);
}
function playEvolution(from,to,cb){
  const ov=document.getElementById('evo-ov'); if(!ov){ if(cb)cb(); return; }
  EVO_CB=cb;
  const sp=document.getElementById('evo-sprite'), cap=document.getElementById('evo-caption'), cont=document.getElementById('evo-cont');
  const mf=byName(from), mt=byName(to);
  cont.style.display='none';
  sp.className='evo-sprite'; sp.style.background=typeGrad(mf.t); sp.innerHTML=monImg(mf,'82%');
  cap.innerHTML=`Hè? <b>${from}</b> evolueert!`;
  ov.classList.add('open');
  let elapsed=0, delay=440, showTo=false;
  const flicker=()=>{
    showTo=!showTo; const m=showTo?mt:mf;
    sp.style.background=typeGrad(m.t); sp.innerHTML=monImg(m,'82%');
    sp.classList.add('evo-glow'); setTimeout(()=>sp.classList.remove('evo-glow'), Math.min(120, delay*0.5));
    elapsed+=delay; delay=Math.max(95, delay-42);
    if(elapsed<2700) setTimeout(flicker, delay); else finishEvo();
  };
  const finishEvo=()=>{
    sp.classList.remove('evo-glow'); sp.style.background=typeGrad(mt.t); sp.innerHTML=monImg(mt,'82%');
    sp.classList.add('evo-done');
    cap.innerHTML=`🎉 <b>${from}</b> evolueerde naar <b>${to}</b>! 🌟`;
    evoSparkles(); cont.style.display='';
  };
  setTimeout(flicker, 750);
}
function evoSparkles(){
  const stage=document.querySelector('.evo-stage'); if(!stage) return;
  const g=['✨','⭐','🌟','✦'];
  for(let i=0;i<10;i++){ const s=document.createElement('div'); s.className='evo-spark'; s.textContent=g[i%4];
    s.style.left='50%'; s.style.top='50%';
    const a=(Math.PI*2/10)*i, d=90+Math.random()*45;
    s.style.setProperty('--ex',Math.cos(a)*d+'px'); s.style.setProperty('--ey',Math.sin(a)*d+'px');
    s.style.animationDelay=(i*0.05)+'s'; stage.appendChild(s); setTimeout(()=>s.remove(),1150+i*50); }
}
function evoContinue(){
  const ov=document.getElementById('evo-ov'); if(ov) ov.classList.remove('open');
  const cb=EVO_CB; EVO_CB=null; if(cb) cb();
}
/* ---- battle-start animatie (paneel-wipe + flits) ---- */
function playBattleIntro(info){
  const ov=document.getElementById('battle-intro'); if(!ov) return;
  const lab=document.getElementById('bi-label');
  const aL=document.getElementById('bi-ava-l'), aR=document.getElementById('bi-ava-r'), vs=document.getElementById('bi-vs');
  const me=(typeof player!=='undefined' && player && player.id==='akker')?'🧑‍🌾':'🧢';
  const foeMon=(info&&info.species&&typeof byName==='function'&&byName(info.species))?byName(info.species).e:'🌿';
  if(aL) aL.textContent=me;
  if(info && info.trainer && info.trainer.name){
    lab.innerHTML=`<b>${info.trainer.name}</b><br><span style="font-size:15px;font-weight:normal">wil vechten!</span>`;
    if(aR) aR.textContent=info.trainer.e||'⚔️'; if(vs){ vs.textContent='VS'; vs.style.display=''; }
  } else if(info && info.double){
    lab.innerHTML=`<b>Dubbelgevecht!</b>`;
    if(aR) aR.textContent=foeMon; if(vs) vs.style.display='none';
  } else {
    lab.innerHTML=`<b>Wild gevecht!</b>`;
    if(aR) aR.textContent=foeMon; if(vs) vs.style.display='none';
  }
  ov.classList.remove('play'); void ov.offsetWidth; ov.classList.add('play');
  clearTimeout(ov._t); ov._t=setTimeout(()=>ov.classList.remove('play'), 1300);
}
function processLearnQueue(){
  const ov=document.getElementById('learn-ov'); if(!ov) return;
  while(LEARN_QUEUE.length){
    const it=LEARN_QUEUE[0], p=party[it.pIdx];
    if(!p || !Array.isArray(p.moves) || p.moves.length<4 || p.moves.includes(it.key)){
      if(p && Array.isArray(p.moves) && p.moves.length<4 && !p.moves.includes(it.key)){
        p.moves.push(it.key); saveProgress();
        if(typeof toast==='function'){ const mv=moveByKey(it.key); toast(`${p.sp} leerde ${mv?mv.n:'een move'}! ✨`); }
      }
      LEARN_QUEUE.shift(); continue;
    }
    const nm=moveByKey(it.key);
    const cur=p.moves.map((k,i)=>{const mv=moveByKey(k); const meta=mv.cat==='status'?'STATUS':'PWR '+mv.p+' · '+moveAccuracy(mv)+'%';
      return `<button class="learn-slot" onclick="learnReplace(${i})"><span class="ls-tp" style="background:${TYPE_META[mv.t].c}">${TYPE_META[mv.t].e}</span><b>${mv.n}</b><span class="ls-meta">${meta}</span></button>`;}).join('');
    document.getElementById('learn-card').innerHTML=
      `<div class="learn-h">${p.sp} wil een nieuwe move leren!</div>
       <div class="learn-new"><span class="ls-tp" style="background:${TYPE_META[nm.t].c}">${TYPE_META[nm.t].e}</span> <b>${nm.n}</b> — ${nm.cat==='status'?'STATUS':'PWR '+nm.p+' · '+moveAccuracy(nm)+'%'}<div class="learn-desc">${nm.d||''}</div></div>
       <p class="learn-q">Welke move vervang je?</p>
       <div class="learn-slots">${cur}</div>
       <button class="learn-skip" onclick="learnReplace(-1)">✖ ${nm.n} niet leren</button>`;
    ov.style.display='flex';
    return;   // wacht op keuze van de speler
  }
  ov.style.display='none';
}
function learnReplace(slot){
  const it=LEARN_QUEUE.shift(); if(!it){ processLearnQueue(); return; }
  const p=party[it.pIdx], nm=moveByKey(it.key);
  if(slot>=0 && p && p.moves[slot]!=null){
    const old=moveByKey(p.moves[slot]); p.moves[slot]=it.key;
    if(typeof toast==='function') toast(`${p.sp} vergat ${old?old.n:'?'} en leerde ${nm.n}! 🔁`);
  } else if(typeof toast==='function') toast(`${p.sp} leerde ${nm.n} niet.`);
  saveProgress();
  processLearnQueue();
}

/* ---- progress opslaan/laden (localStorage) ---- */
const SAVE_KEY = 'widr_pokemon_save_v4';
function saveProgress(){
  const w=(typeof INSIDE!=='undefined'&&INSIDE)
    ? Object.assign({},WORLD_STATE,{mi:INSIDE.retMi,x:INSIDE.retX,y:INSIDE.retY})
    : WORLD_STATE;
  try{ localStorage.setItem(SAVE_KEY, JSON.stringify({
    beaten:[...beaten], player:player?player.id:null,
    caught:[...caught], party, box, starterChosen, world:w, money, bag, picked:[...itemsPicked],
    hms:[...hms], visited:[...visited]
  })); }catch(e){}
}
function loadProgress(){
  try{
    const s=JSON.parse(localStorage.getItem(SAVE_KEY)||'{}');
    if(Array.isArray(s.beaten)) beaten=new Set(s.beaten);
    if(Array.isArray(s.caught)) caught=new Set(s.caught);
    if(Array.isArray(s.party)) party=s.party.map(p=> typeof p==='string'?{sp:p,lvl:5,xp:0,moves:defaultMoveKeys(p,5)}:Object.assign({},p,{moves:Array.isArray(p.moves)?p.moves:defaultMoveKeys(p.sp,p.lvl||5)}));
    if(Array.isArray(s.box)) box=s.box.map(p=> typeof p==='string'?{sp:p,lvl:5,xp:0,moves:defaultMoveKeys(p,5)}:Object.assign({},p,{moves:Array.isArray(p.moves)?p.moves:defaultMoveKeys(p.sp,p.lvl||5)}));
    // migratie oude saves: team groter dan 4 → overschot naar de PC
    if(party.length>PARTY_MAX){ box=party.slice(PARTY_MAX).concat(box); party=party.slice(0,PARTY_MAX); }
    if(s.starterChosen) starterChosen=true;
    if(typeof s.money==='number') money=s.money;
    if(s.bag) bag=Object.assign({widrball:0,superbal:0,hyperbal:0,potion:0,superpotion:0,herbal:0}, s.bag);
    if(Array.isArray(s.picked)) itemsPicked=new Set(s.picked);
    if(Array.isArray(s.hms)) hms=new Set(s.hms);
    if(Array.isArray(s.visited)) visited=new Set(s.visited);
    if(s.world) WORLD_STATE=Object.assign(WORLD_STATE,s.world);
    if(s.player){ const p=PLAYERS.find(x=>x.id===s.player); if(p) pickPlayer(p.id); }
    if(starterChosen){ const cb=document.getElementById('continue-btn'); if(cb) cb.style.display=''; }
  }catch(e){}
}
function resetProgress(){
  beaten=new Set(); caught=new Set(); party=[]; box=[]; starterChosen=false;
  hms=new Set(); visited=new Set();
  money=800; bag={widrball:5, superbal:0, hyperbal:0, potion:3, superpotion:0, herbal:0}; itemsPicked=new Set();
  WORLD_STATE={mi:0,x:6,y:9,face:'up',started:false};
  try{ localStorage.removeItem(SAVE_KEY); }catch(e){}
  saveProgress();
  const cb=document.getElementById('continue-btn'); if(cb) cb.style.display='none';
  renderLeague();
}

/* ============ NAV ============ */
function go(screen){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('screen-'+screen).classList.add('active');
  window.scrollTo({top:0,behavior:'smooth'});
  if(screen==='dex') renderDex();
  if(screen==='league') renderLeague();
  if(screen==='summary') renderSummary();
}

/* ============ PLAYER PICK ============ */
function renderPicker(){
  document.getElementById('picker-row').innerHTML = PLAYERS.map(p=>`
    <div class="pchar ${player&&player.id===p.id?'sel':''}" onclick="pickPlayer('${p.id}')">
      <div class="em">${p.e}</div><div class="nm">${p.name}</div><div class="rl">${p.role}</div>
    </div>`).join('');
}
function pickPlayer(id){
  player = PLAYERS.find(p=>p.id===id);
  renderPicker();
  const pill=document.getElementById('player-pill');
  pill.style.display='flex';
  document.getElementById('pp-em').textContent=player.e;
  document.getElementById('pp-name').textContent=player.name.replace('Mevrouw ','Mw. ').replace('Meneer ','Mr. ');
  saveProgress();
}

/* ============ DEX ============ */
let DEX_LIST=[], DEX_CUR=0;
let DEX_TYPES_OFF=new Set();   // types die je hebt uitgezet → mons met dat type worden verborgen
function buildDexTypeChips(){
  const box=document.getElementById('dex-typefilter'); if(!box) return;
  box.innerHTML=Object.keys(TYPE_META).map(t=>{
    const off=DEX_TYPES_OFF.has(t), m=TYPE_META[t];
    return `<button class="typechip" onclick="dexToggleType('${t}')" title="${off?'Klik om weer te tonen':'Klik om te verbergen'}" style="border:2px solid ${m.c};border-radius:999px;padding:3px 10px;cursor:pointer;font-size:11px;font-weight:800;background:${off?'transparent':m.c};color:${off?'#8a8a95':'#151321'};opacity:${off?'.55':'1'};${off?'text-decoration:line-through;':''}">${m.e} ${t}</button>`;
  }).join('');
  const btn=document.getElementById('dex-alltypes'); if(btn) btn.style.display=DEX_TYPES_OFF.size?'':'none';
}
function dexToggleType(t){ if(DEX_TYPES_OFF.has(t)) DEX_TYPES_OFF.delete(t); else DEX_TYPES_OFF.add(t); buildDexTypeChips(); renderDex(); }
function dexTypesAllOn(){ DEX_TYPES_OFF.clear(); buildDexTypeChips(); renderDex(); }
/* een ontwerp is pas zichtbaar als je 'm gevangen hebt — of als je de game hebt uitgespeeld (Champion verslagen) */
function gameCleared(){ return typeof beaten!=='undefined' && beaten && beaten.has('ploeg'); }
function dexRevealed(m){ return caught.has(m.n) || gameCleared(); }
function renderDex(){
  const q=(document.getElementById('dex-search').value||'').toLowerCase();
  const list=MON.filter(m=>m.n.toLowerCase().includes(q) && m.t.every(t=>!DEX_TYPES_OFF.has(t)));
  DEX_LIST=list.map(m=>idxOf(m.n));
  document.getElementById('dex-count').textContent=list.length+' / '+MON.length;
  document.getElementById('dex-grid').innerHTML=list.map(m=>{
    const idx=idxOf(m.n), got=caught.has(m.n), rev=got||gameCleared();
    return `<div class="card" onclick="openModal(${idx})" style="${rev?'':'opacity:.96'}">
      <span class="num mono">#${String(idx+1).padStart(3,'0')}</span>${rev?rareTag(m):''}
      <div class="avatar" style="background:${rev?typeGrad(m.t):'#39335a'};${rev?'':'filter:brightness(0);'}">${monImg(m,'92%')}</div>
      <div class="cbody"><div class="cname">${got?'✓ ':''}${rev?m.n:'???'}</div><div class="badges">${rev?m.t.map(tbadge).join(''):'<span class="tbadge" style="background:#39335a">❔</span>'}</div></div>
    </div>`;
  }).join('');
}
function openModal(idx){
  const m=MON[idx];
  DEX_CUR=idx;
  if(!DEX_LIST.length || DEX_LIST.indexOf(idx)<0) DEX_LIST=MON.map((_,i)=>i);
  const stats=[['HP',m.hp],['ATK',m.atk],['DEF',m.def],['SPD',m.spd]];
  const rev=dexRevealed(m);
  document.getElementById('modal').innerHTML=`
    <div class="modal-head" style="background:${rev?typeGrad(m.t):'#2a2740'}">
      <div class="close-x" onclick="closeModal()">✕</div>
      <div class="modal-avatar" style="background:rgba(255,255,255,.85);${rev?'':'filter:brightness(0)'}">${monImg(m,'96%')}</div>
      <div>
        <div class="mh-num mono" style="color:#fff;text-shadow:1px 1px 0 #151321">#${String(idx+1).padStart(3,'0')} ${rev&&m.rarity?'• '+m.rarity:''}</div>
        <h3 style="color:#fff;text-shadow:2px 2px 0 #151321">${rev?m.n:'???'}</h3>
        <div class="badges">${rev?m.t.map(tbadge).join(''):'<span class="tbadge" style="background:#39335a">❔ Onbekend</span>'}</div>
      </div>
    </div>
    <div class="modal-body">
      ${!rev?`<div class="dex-quote">🔒 Deze widrmon heb je nog niet ontdekt. Vang 'm in het wild om z'n ontwerp, stats en moves te onthullen — of word eerst Champion, dan zie je alles.</div>`:`
      <div class="dex-quote">“${m.dex}”</div>
      <div style="background:#efe7ff;border:2px solid #151321;border-radius:10px;padding:8px 10px;margin-bottom:10px;font-size:13px"><b>🧬 ${ABILITIES[m.ability].name}</b> — ${ABILITIES[m.ability].desc}</div>
      ${stats.map(([lb,v])=>`<div class="stat-row"><span class="stat-label">${lb}</span>
        <span class="stat-bar"><span class="stat-fill" style="width:0;background:${statColor(v)}" data-w="${v}"></span></span>
        <span class="stat-val">${v}</span></div>`).join('')}
      <div class="stat-row" style="margin-top:6px"><span class="stat-label">BST</span><span class="stat-val" style="width:auto;font-size:16px">${bst(m)}</span></div>
      <div class="moves-title">⚔️ Moves</div>
      ${(()=>{const lv={}; learnsetOf(m.n).forEach(o=>{lv[o.mv.n]=o.lvl;}); return m.moves.map(mv=>`<div class="move"><div class="move-top">
          <span class="move-name">${mv.n}</span>
          <span class="tbadge" style="background:${TYPE_META[mv.t].c}">${TYPE_META[mv.t].e} ${mv.t}</span>
          <span class="move-pow">Lv ${lv[mv.n]||1} · ${mv.cat==='status'?'STATUS':'PWR '+mv.p} · ${moveAccuracy(mv)}%</span></div>
        <div class="move-desc">${mv.d}</div></div>`).join('');})()}
      ${MEGA[m.n]?(()=>{const M=MEGA[m.n]; const g=megaStats(m); const ms=[['HP',g.hp,m.hp],['ATK',g.atk,m.atk],['DEF',g.def,m.def],['SPD',g.spd,m.spd]]; const mbst=g.hp+g.atk+g.def+g.spd; const ma=ABILITIES[M.ability]; return `
      <div class="moves-title">🌟 Mega-evolutie</div>
      <div style="background:#fce7f3;border:2px solid #151321;border-radius:10px;padding:10px;margin-bottom:8px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
          <div class="modal-avatar" style="width:58px;height:58px;background:rgba(255,255,255,.85);border-radius:10px;overflow:hidden">${monImg(Object.assign({},m,{n:M.name,t:M.t}),'96%')}</div>
          <div><div style="font-weight:800;font-size:15px">${M.name}</div><div class="badges">${M.t.map(tbadge).join('')}</div></div>
        </div>
        <div style="font-size:12px;margin-bottom:8px">🧬 <b>${ma.name}</b> — ${ma.desc}</div>
        ${ms.map(([lb,v,base])=>`<div class="stat-row"><span class="stat-label">${lb}</span>
          <span class="stat-bar"><span class="stat-fill" style="width:0;background:${statColor(v)}" data-w="${Math.min(100,v)}"></span></span>
          <span class="stat-val">${v}${v>base?` <span style="color:#16a34a;font-size:11px">▲${v-base}</span>`:''}</span></div>`).join('')}
        <div class="stat-row" style="margin-top:6px"><span class="stat-label">BST</span><span class="stat-val" style="width:auto;font-size:16px">${mbst} <span style="color:#16a34a;font-size:12px">(+${mbst-bst(m)})</span></span></div>
        <div style="font-size:11px;color:#6b21a8;margin-top:6px">In gevecht één keer per gevecht te activeren met de 🌟-knop.</div>
      </div>`;})():''}
      `}
    </div>`;
  document.getElementById('modal-bg').classList.add('open');
  requestAnimationFrame(()=>document.querySelectorAll('.stat-fill').forEach(f=>f.style.width=f.dataset.w+'%'));
}
function closeModal(){document.getElementById('modal-bg').classList.remove('open');}
function dexNav(dir){
  if(!DEX_LIST.length) return;
  let pos=DEX_LIST.indexOf(DEX_CUR); if(pos<0) pos=0;
  pos=(pos+dir+DEX_LIST.length)%DEX_LIST.length;
  openModal(DEX_LIST[pos]);
}
document.addEventListener('keydown', e=>{
  if(!document.getElementById('modal-bg').classList.contains('open')) return;
  if(e.key==='ArrowRight'){ e.preventDefault(); dexNav(1); }
  else if(e.key==='ArrowLeft'){ e.preventDefault(); dexNav(-1); }
  else if(e.key==='Escape'){ closeModal(); }
});

/* ============ TEAM-OVERZICHT (levels, stats, moves) ============ */
function reorderParty(i,dir){
  const j=i+dir; if(j<0||j>=party.length) return;
  const t=party[i]; party[i]=party[j]; party[j]=t;
  saveProgress(); renderSummary(); if(typeof updatePartyCount==='function') updatePartyCount();
}
function renderSummary(){
  const el=document.getElementById('summary-body'); if(!el) return;
  if(!party.length){ el.innerHTML='<p style="text-align:center;color:#5b4a1e;font-weight:bold;padding:40px 0">Je hebt nog geen widrmon. Ga het hoge gras in! 🌿</p>'; return; }
  const hint=`<div class="sum-hint">⚔️ Je eerste <b>3</b> widrmon vormen je team tegen wilde mons en trainers. Tegen gyms kies je apart. Gebruik ▲▼ om te herschikken.</div>`;
  el.innerHTML = hint + party.map((p,idx)=>{
    const m=byName(p.sp), L=p.lvl, avg=statAvg(m);
    const hp=hpAt(m.hp,L,avg), atk=statAt(m.atk,L,avg), def=statAt(m.def,L,avg), spd=statAt(m.spd,L,avg);
    const need=xpNeed(L), xpPct=Math.min(100,Math.round((p.xp||0)/need*100));
    const stats=[['HP',hp],['ATK',atk],['DEF',def],['SPD',spd]];
    const mx=Math.max(hp,atk,def,spd);
    const ls=learnsetOf(p.sp);
    const cur=new Set(p.moves||defaultMoveKeys(p.sp,L));
    return `<div class="sum-card${idx<3?' in-team':''}">
      <div class="sum-head" style="background:${typeGrad(m.t)}">
        <div class="sum-ava">${monImg(m,'92%')}</div>
        <div class="sum-id">
          <div class="sum-nm">${m.n} ${rareTag(m)}</div>
          <div class="badges" style="margin:4px 0">${m.t.map(tbadge).join('')}</div>
          <div class="sum-lv">Lv ${L}${idx<3?' <span class="team-tag">⚔️ Team</span>':''}</div>
        </div>
        <div class="sum-rank">
          <div class="rank-no">#${idx+1}</div>
          <button class="rank-btn" ${idx===0?'disabled':''} onclick="reorderParty(${idx},-1)">▲</button>
          <button class="rank-btn" ${idx===party.length-1?'disabled':''} onclick="reorderParty(${idx},1)">▼</button>
        </div>
      </div>
      <div class="sum-xp"><span class="xplbl">XP</span><span class="xpbar"><span class="xpfill" style="width:${xpPct}%"></span></span><span class="xpnum mono">${p.xp||0}/${need}</span></div>
      ${(()=>{const list=m.abilities||[m.ability]; const act=(p.ability&&list.includes(p.ability))?p.ability:m.ability; const a=ABILITIES[act]; const multi=list.length>1; return `<div class="sum-abil" ${multi?`style="cursor:pointer" onclick="cycleAbility(${idx})"`:''} title="${a.desc}">🧬 <b>${a.name}</b>${multi?` <span class="mono">(${list.indexOf(act)+1}/${list.length}) 🔄</span>`:''} — ${a.desc}</div>`;})()}
      ${(()=>{const h=p.held?HELD_ITEMS[p.held]:null; return `<div class="sum-abil" style="background:#eef4ff;color:#1d4ed8;cursor:pointer" onclick="cycleHeld(${idx})" title="Klik om held item te wisselen">🎒 ${h?('<b>'+h.emoji+' '+h.name+'</b> — '+h.desc):'<b>Geen held item</b> — klik om te kiezen'}</div>`;})()}
      ${m.evo?`<div class="sum-abil" style="background:#f3e8ff;color:#6b21a8">🌟 Evolueert naar <b>${m.evo.into}</b> op Lv ${m.evo.lv}${L>=m.evo.lv?' — klaar!':` (nog ${m.evo.lv-L})`}</div>`:''}
      <div class="sum-stats">
        ${stats.map(([lb,v])=>`<div class="stat-row"><span class="stat-label">${lb}</span>
          <span class="stat-bar"><span class="stat-fill" style="width:${Math.round(v/mx*100)}%;background:${statColor(v)}"></span></span>
          <span class="stat-val">${v}</span></div>`).join('')}
      </div>
      <div class="sum-moves">
        <div class="sum-mv-hd">Huidige moves <span class="mono">(${(p.moves||[]).length}/4)</span></div>
        ${ls.map(o=>{const learned=o.lvl<=L, active=cur.has(o.key); const cls=active?'':(learned?'forgotten':'locked');
          const meta=!learned?('🔒 Lv'+o.lvl):(active?(o.mv.cat==='status'?'STATUS':'PWR '+o.mv.p+' · '+moveAccuracy(o.mv)+'%'):'niet gekozen');
          return `<div class="sum-move ${cls}">
          <span class="tbadge" style="background:${TYPE_META[o.mv.t].c}">${TYPE_META[o.mv.t].e}</span>
          <span class="mv-name">${o.mv.n}</span>
          <span class="mv-meta mono">${meta}</span></div>`;}).join('')}
        ${(p.moves||[]).filter(k=>!ls.some(o=>o.key===k)).map(k=>{const mv=moveByKey(k); if(!mv)return ''; return `<div class="sum-move">
          <span class="tbadge" style="background:${TYPE_META[mv.t].c}">${TYPE_META[mv.t].e}</span>
          <span class="mv-name">${mv.n}</span>
          <span class="mv-meta mono">${mv.cat==='status'?'STATUS':'PWR '+mv.p+' · '+moveAccuracy(mv)+'%'}</span></div>`;}).join('')}
      </div>
    </div>`;
  }).join('');
}

/* ============ TEAM BUILDER ============ */
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();});
/* ============ TEAM BUILDER (kies tot 3 uit je party) ============ */
function startFreeBattle(){ pendingBattle={kind:'free'}; openTeamBuilder(); }
function openTeamBuilder(){
  currentSel=[];
  let sub='';
  if(pendingBattle.kind==='trainer'){
    const t=TRAINERS.find(x=>x.id===pendingBattle.id);
    document.getElementById('team-title').textContent='Kies je team — vs '+t.name;
    sub=`<div class="foe-preview">Tegenstander: <b>${t.e} ${t.name}</b> ${tbadge(t.type)} &nbsp;team: ${t.team.map(n=>`<span class="foe-mini" style="background:${typeGrad(byName(n).t)}">${byName(n).e}</span>`).join('')}</div>`;
  } else {
    document.getElementById('team-title').textContent='Oefenpartij — kies je team';
    sub='<b>Random rivals</b> worden voor je gekozen.';
  }
  document.getElementById('team-hint').innerHTML=sub+' <br>Kies <b>1 tot 3</b> widrmon uit je party.';
  go('team');
  renderTeamGrid();
  renderTray();
}
function partyPool(){ return party; }
function renderTeamGrid(){
  const grid=document.getElementById('team-grid');
  if(party.length===0){ grid.innerHTML='<div style="font-weight:bold;color:#5b4a1e;padding:20px">Je hebt nog geen widrmon! Ga de wereld in en vang er een in het hoge gras. 🌿</div>'; return; }
  grid.innerHTML=party.map((p,i)=>{
    const m=byName(p.sp), on=currentSel.includes(i);
    return `<div class="card ${on?'selected':''}" onclick="toggleSel(${i})">
      <span class="num mono">Lv ${p.lvl}</span>${rareTag(m)}
      <div class="avatar" style="background:${typeGrad(m.t)}">${monImg(m,'92%')}</div>
      <div class="cbody"><div class="cname">${monLabel(p)}</div><div class="badges">${m.t.map(tbadge).join('')}</div></div>
    </div>`;
  }).join('');
}
function toggleSel(i){
  const k=currentSel.indexOf(i);
  if(k>=0) currentSel.splice(k,1);
  else { if(currentSel.length>=3){return;} currentSel.push(i); }
  renderTeamGrid(); renderTray();
}
function renderTray(){
  const slots=[0,1,2].map(s=>{
    const i=currentSel[s];
    if(i==null) return `<div class="slot">?</div>`;
    const m=byName(party[i].sp);
    return `<div class="slot" style="background:${typeGrad(m.t)}">${m.e}<span class="x" onclick="event.stopPropagation();toggleSel(${i})">✕</span></div>`;
  }).join('');
  const ready=currentSel.length>=1;
  document.getElementById('team-tray').innerHTML=
    slots+`<span class="vslabel">${currentSel.length}/3</span>
    <button class="gofight ${ready?'ready':''}" onclick="confirmTeam()">FIGHT! 🔥</button>`;
}
function confirmTeam(){
  if(currentSel.length<1) return;
  if(!player) pickPlayer('keeren');
  const pSpecs=currentSel.map(i=>({sp:party[i].sp,lvl:party[i].lvl,pIdx:i}));
  let eSpecs, info;
  if(pendingBattle.kind==='trainer'){
    const t=TRAINERS.find(x=>x.id===pendingBattle.id); const L=trainerLevel(t);
    eSpecs=t.team.map(n=>({sp:n,lvl:enemyLvl(n,L)})); info={trainer:t, double:!!t.double};
  } else {
    const pool=MON.map(m=>m.n).filter(n=>!currentSel.some(i=>party[i].sp===n));
    const avgL=Math.round(pSpecs.reduce((a,s)=>a+s.lvl,0)/pSpecs.length);
    eSpecs=pSpecs.map(()=>({sp:pool.splice(Math.floor(Math.random()*pool.length),1)[0],lvl:avgL}));
    info={trainer:null};
  }
  buildBattle(pSpecs, eSpecs, info);
}

/* ============ LEAGUE ============ */
function gymList(){return TRAINERS.filter(t=>t.role==='Gym').sort((a,b)=>a.order-b.order);}
function eliteList(){return TRAINERS.filter(t=>t.role==='Elite').sort((a,b)=>a.order-b.order);}
function champ(){return TRAINERS.find(t=>t.role==='Champion');}
function evilList(){return TRAINERS.filter(t=>t.role==='Evil');}
function rival(){return TRAINERS.find(t=>t.role==='Rival');}

function isUnlocked(t){
  if(t.role==='Evil'||t.role==='Rival') return true;
  if(t.role==='Gym'){ const g=gymList(); const i=g.findIndex(x=>x.id===t.id); return i===0 || beaten.has(g[i-1].id); }
  if(t.role==='Elite'){ const gymsDone=gymList().every(x=>beaten.has(x.id)); const e=eliteList(); const i=e.findIndex(x=>x.id===t.id); return gymsDone && (i===0||beaten.has(e[i-1].id)); }
  if(t.role==='Champion'){ return eliteList().every(x=>beaten.has(x.id)); }
  return true;
}
function trainerCard(t){
  const unlocked=isUnlocked(t), done=beaten.has(t.id);
  const inHall=(t.role==='Elite'||t.role==='Champion');   // E4 + Champion vecht je in de echte League Hall, niet in dit menu
  const cls=done?'':(unlocked?'avail':'locked');
  const status=done?'<span class="tstatus beaten">✓ Verslagen</span>'
    :(inHall?(unlocked?'<span class="tstatus go">🏛️ In de League Hall</span>':'<span class="tstatus lock">🔒 Locked</span>')
            :(unlocked?'<span class="tstatus go">⚔️ Uitdagen</span>':'<span class="tstatus lock">🔒 Locked</span>'));
  const click=(unlocked && !inHall)?`onclick="challenge('${t.id}')"`:'';
  return `<div class="tcard ${cls}" ${click}>
    ${status}
    <div class="thead">
      <div class="tavatar" style="background:${TYPE_META[t.type].c}">${t.e}</div>
      <div><div class="tn">${t.name}</div><div class="ts">${t.subject}</div>
      <div style="margin-top:5px">${tbadge(t.type)}</div></div>
    </div>
    <div style="font-size:12px;color:#4a3b12;font-weight:500">${t.flavor}</div>
    <div class="tteam">${t.team.map(n=>`<div class="tm" style="background:${typeGrad(byName(n).t)}" title="${n}">${byName(n).e}</div>`).join('')}</div>
  </div>`;
}
function renderLeague(){
  const badges=gymList().filter(g=>beaten.has(g.id)).length;
  document.getElementById('badge-count').innerHTML=
    `🏅 Badges: ${badges} / 8 &nbsp; ${gymList().map(g=>`<span class="badge-dot ${beaten.has(g.id)?'on':''}" title="${g.badge}"></span>`).join('')}`
    + (beaten.has('ploeg')?' &nbsp; 👑 <b>WIDR CHAMPION!</b>':'')
    + ` &nbsp; <button onclick="if(confirm('Alle voortgang wissen?'))resetProgress()" style="margin-left:8px;background:#b71c0c;color:#fff;border:3px solid #151321;border-radius:10px;padding:6px 12px;font-family:inherit;font-weight:bold;font-size:12px;cursor:pointer;box-shadow:3px 3px 0 #151321">↺ Reset</button>`;
  const secs=[
    {h:'8 Gym Leaders',tag:'Verdien 8 badges',list:gymList()},
    {h:'Elite Four',tag:'Unlock na 8 badges',list:eliteList()},
    {h:'Champion',tag:'Unlock na de Elite Four',list:[champ()]},
    {h:'Team Widr (Evil)',tag:'Optionele bazen',list:evilList()},
    {h:'Rival',tag:'Altijd beschikbaar',list:[rival()]}
  ];
  document.getElementById('league-body').innerHTML=secs.map(s=>`
    <div class="league-sec"><h3>${s.h}<span class="tag">${s.tag}</span></h3>
      <div class="tgrid">${s.list.map(trainerCard).join('')}</div></div>`).join('');
}
function challenge(id){
  if(party.length===0){ alert('Je hebt nog geen widrmon! Kies eerst een starter en vang er meer in het hoge gras. 🌿'); return; }
  pendingBattle={kind:'trainer',id}; openTeamBuilder();
}
/* geforceerde wereld-trainer (line-of-sight / bazen): gebruikt automatisch je eerste 3 widrmon */
function startTrainerBattle(t){
  if(party.length===0) return;
  pendingBattle={kind:'trainer',id:t.id};
  const pSpecs=party.slice(0,3).map((p,i)=>({sp:p.sp,lvl:p.lvl,pIdx:i}));
  const L=t.lvl||10;
  const eSpecs=(t.team||[]).map(n=>({sp:n,lvl:enemyLvl(n,L)}));
  buildBattle(pSpecs, eSpecs, {trainer:Object.assign({fromWorld:true},t), double:!!t.double});
}

/* ============ BATTLE ENGINE (3v3) ============ */
let B=null;
function mkFighter(spec){
  const m=byName(spec.sp); const L=spec.lvl||5; const avg=statAvg(m);
  const pentry=(spec.pIdx!=null)?party[spec.pIdx]:null;
  const nick=(pentry&&pentry.nick)||spec.nick||null;
  const pm=(spec.pIdx!=null && party[spec.pIdx] && Array.isArray(party[spec.pIdx].moves)) ? party[spec.pIdx].moves.map(moveByKey).filter(Boolean) : null;
  const moves=(pm&&pm.length)?pm:knownMoves(m.n,L);
  const held=(spec.pIdx!=null && party[spec.pIdx])?(party[spec.pIdx].held||null):null;
  let abil=m.ability;
  if(spec.pIdx!=null && party[spec.pIdx] && party[spec.pIdx].ability && (m.abilities||[]).includes(party[spec.pIdx].ability)) abil=party[spec.pIdx].ability;
  return {n:nick||m.n,e:m.e,t:m.t,moves,rarity:m.rarity,sp:m.n,lvl:L,pIdx:(spec.pIdx==null?null:spec.pIdx),
    atk:statAt(m.atk,L,avg),def:statAt(m.def,L,avg),spd:statAt(m.spd,L,avg),
    maxhp:hpAt(m.hp,L,avg), curhp:hpAt(m.hp,L,avg),
    status:null, sleepCtr:0, stages:{atk:0,def:0,spd:held==='tempoveren'?1:0}, flinch:false, healsLeft:3, ability:abil, held, sashUsed:false, buffUsed:false};
}
/* status helpers */
const STATUS_META={burn:{t:'BRN',c:'#EE8130'},poison:{t:'PSN',c:'#A33EA1'},para:{t:'PAR',c:'#F7D02C'},freeze:{t:'FRZ',c:'#96D9D6'},sleep:{t:'SLP',c:'#8a8a8a'}};
function statusChip(st){const m=STATUS_META[st];return m?`<span class="tbadge" style="background:${m.c};font-size:9px;padding:1px 6px;color:#151321">${m.t}</span>`:'';}
function statName(s){return {atk:'Aanval',def:'Verdediging',spd:'Snelheid'}[s];}
function statusVerb(st){return {burn:'vatte vlam! 🔥',poison:'raakte vergiftigd! ☠️',para:'raakte verlamd! ⚡',freeze:'bevroor! ❄️',sleep:'viel in slaap! 😴'}[st];}
const stageMul=s=> s>=0 ? (2+s)/2 : 2/(2-s);
function effSpd(f){ let sp=f.spd*stageMul(f.stages.spd); if(f.status==='para') sp*=0.5; if(f.ability==='adrenaline'&&f.curhp<f.maxhp/3) sp*=1.5; if(f.ability==='swift') sp*=1.15; if(f.held==='snelklauw') sp*=1.2; return sp; }
function canGetStatus(f,st){
  if(f.status) return false;
  if(f.ability==='immune') return false;
  if(f.held==='statusgordel' && f.curhp>=f.maxhp) return false;   // Statusgordel: geen status op volle HP
  if(st==='burn'&&f.t.includes('Fire')) return false;
  if(st==='freeze'&&f.t.includes('Ice')) return false;
  if(st==='para'&&f.t.includes('Electric')) return false;
  if(st==='poison'&&(f.t.includes('Poison')||f.t.includes('Steel'))) return false;
  return true;
}
function applyStat(f,stat,delta,side){
  const before=f.stages[stat];
  f.stages[stat]=Math.max(-6,Math.min(6,before+delta));
  const ch=f.stages[stat]-before;
  if(ch===0){ logMsg(`${f.n}'s ${statName(stat)} kan niet verder.`,'eff'); return; }
  const dir = delta>0 ? (Math.abs(ch)>=2?'ging fors omhoog! ⏫':'ging omhoog! 🔼') : (Math.abs(ch)>=2?'daalde fors! ⏬':'daalde! 🔽');
  logMsg(`${f.n}'s ${statName(stat)} ${dir}`,'eff');
}
const activeP=()=>B.pTeam[B.pAct];
const activeE=()=>B.eTeam[B.eAct];
const aliveIdx=team=>team.map((f,i)=>f.curhp>0?i:-1).filter(i=>i>=0);

function abilTag(f){ const a=ABILITIES[f.ability]; return a?` <span style="color:#a07bff">🧬 ${a.name}</span>`:''; }
function onEnter(side){
  const f=side==='p'?activeP():activeE();
  if(!f) return;
  if(f.ability==='intimidate'){
    const foeSide=side==='p'?'e':'p';
    const foe=side==='p'?activeE():activeP();
    if(foe && foe.curhp>0){ logMsg(`${f.n}'s Intimidatie verlaagt ${foe.n}'s aanval! 😠`,'eff'); applyStat(foe,'atk',-1,foeSide); renderStatusLine(foeSide); }
  }
}
function setBattleMode(mode){
  const dbl = mode==='double';
  document.querySelectorAll('#screen-battle .side-row').forEach(e=>e.style.display=dbl?'none':'');
  const dar=document.getElementById('darena'); if(dar) dar.style.display=dbl?'flex':'none';
  const mp=document.getElementById('moves-panel'); if(mp) mp.style.display=dbl?'none':'';
  const sp=document.querySelector('#screen-battle .switch-panel'); if(sp) sp.style.display=dbl?'none':'';
  const dc=document.getElementById('dbl-controls'); if(dc) dc.style.display=dbl?'flex':'none';
  if(dbl){ const wa=document.getElementById('wild-actions'); if(wa) wa.style.display='none'; }
}
/* ===== MEGA-EVOLUTIE — in-battle, gratis, één keer per gevecht =====
   Alleen de vier eindvormen kunnen mega'en. De sprite (mega_<slug>.png) laadt automatisch.
   Elke mega mikt op EXACT dezelfde BST (MEGA_BST); 'shape' bepaalt alleen de stat-vorm. */
const MEGA_BST=470;
const MEGA={
  "Lawrence":    {name:"Mega Lawrence",    t:["Grass","Fairy"],  shape:{atk:0.95,def:1.05,spd:1.35}, ability:"deadeye",   cry:"🍀🌟"},
  "Evil Jax":    {name:"Mega Evil Jax",    t:["Dark","Fire"],    shape:{atk:1.50,def:0.60,spd:1.30}, ability:"overdrive", cry:"🔥🎤"},
  "Maria Miami": {name:"Mega Maria Miami", t:["Water","Poison"], shape:{atk:1.20,def:0.90,spd:1.25}, ability:"torrent",   cry:"🌊⚡"},
  "Johan":       {name:"Mega Johan",       t:["Water","Steel"],  shape:{atk:1.15,def:1.60,spd:0.55}, ability:"bulk",      cry:"💧⚔️"},
  "Prei":        {name:"Mega Prei",        t:["Grass","Flying"], shape:{atk:1.30,def:0.75,spd:1.35}, ability:"swift",     cry:"🐰🌿"}
};
/* base-schaal mega-stats: HP blijft, rest wordt over atk/def/spd verdeeld tot totaal == MEGA_BST */
function megaStats(m){
  const M=MEGA[m.n]; if(!M) return null;
  const hp=m.hp, rem=MEGA_BST-hp;
  const wa=m.atk*(M.shape.atk||1), wd=m.def*(M.shape.def||1), ws=m.spd*(M.shape.spd||1), sum=wa+wd+ws;
  let atk=Math.round(rem*wa/sum), def=Math.round(rem*wd/sum), spd=Math.round(rem*ws/sum);
  atk += rem-(atk+def+spd);              // afrondingsdrift bij atk corrigeren → totaal exact MEGA_BST
  return {hp,atk,def,spd};
}
function megaAvail(f){ return !!(f && MEGA[f.sp] && typeof B!=='undefined' && B && !B.megaUsed && !f.mega); }
function doMega(){
  if(typeof B==='undefined'||!B||B.over||B.turnLock) return;
  const f=activeP(); if(!megaAvail(f)) return;
  const M=MEGA[f.sp], base=f.sp, bm=byName(base), ms=megaStats(bm);
  B.megaUsed=true; f.mega=true;
  f.atk=Math.round(f.atk*ms.atk/bm.atk); f.def=Math.round(f.def*ms.def/bm.def); f.spd=Math.round(f.spd*ms.spd/bm.spd);
  f.t=M.t.slice(); f.n=M.name; f.ability=M.ability;
  logMsg(`✨ <b>${base}</b> Mega-evolueerde tot <b>${M.name}</b>! ${M.cry}`,'sw');
  const spEl=document.getElementById('p-sprite'); if(spEl){ spEl.classList.add('evo-glow'); setTimeout(()=>{spEl.classList.remove('evo-glow');},500); }
  refreshBattle(); enableControls();
}
/* tegenstander mega't: hogere gyms (order>=6), alle Elite/Champion, bazen en rival */
function trainerMayMega(t){
  if(!t) return false;
  if(t.role==='Elite'||t.role==='Champion'||t.role==='Evil'||t.role==='Rival') return true;
  if(t.role==='Gym' && (t.order||0)>=6) return true;
  return false;
}
function maybeEnemyMega(){
  if(typeof B==='undefined'||!B||B.over||B.eMegaUsed) return;
  const t=B.info&&B.info.trainer; if(!trainerMayMega(t)) return;
  const f=activeE(); if(!f||!MEGA[f.sp]||f.mega) return;
  const M=MEGA[f.sp], base=f.sp, bm=byName(base), ms=megaStats(bm);
  B.eMegaUsed=true; f.mega=true;
  f.atk=Math.round(f.atk*ms.atk/bm.atk); f.def=Math.round(f.def*ms.def/bm.def); f.spd=Math.round(f.spd*ms.spd/bm.spd);
  f.t=M.t.slice(); f.n=M.name; f.ability=M.ability;
  logMsg(`💥 ${t.e||''} <b>${t.name}</b> laat <b>${base}</b> Mega-evolueren tot <b>${M.name}</b>! ${M.cry}`,'sw');
  const spEl=document.getElementById('e-sprite'); if(spEl){ spEl.classList.add('evo-glow'); setTimeout(()=>{spEl.classList.remove('evo-glow');},500); }
  setSide('e');
}
/* gevecht-arena past zich aan aan het biome waar je vecht */
const BATTLE_SCENES={
  grassland:{bg:'linear-gradient(#bfe9ff 0 52%, #86c765 52% 68%, #6fb14e 68% 100%)', plat:'#5c9a3f'},
  meadow:   {bg:'linear-gradient(#cdefff 0 52%, #93d465 52% 68%, #7cc24e 68% 100%)', plat:'#68ad45'},
  forest:   {bg:'linear-gradient(#9ed6e6 0 46%, #4f9142 46% 64%, #3a7233 64% 100%)', plat:'#2f6a2c'},
  desert:   {bg:'linear-gradient(#ffe6ad 0 52%, #e8c877 52% 68%, #d9b45a 68% 100%)', plat:'#c49b43'},
  snow:     {bg:'linear-gradient(#dcefff 0 52%, #f2f8fc 52% 68%, #e3eef6 68% 100%)', plat:'#c6d8e6'},
  mountain: {bg:'linear-gradient(#c9d7e4 0 50%, #9a9182 50% 66%, #837a6b 66% 100%)', plat:'#6f6759'},
  swamp:    {bg:'linear-gradient(#b3c19c 0 48%, #5c6a42 48% 66%, #4a5636 66% 100%)', plat:'#3d4830'},
  beach:    {bg:'linear-gradient(#bfe9ff 0 42%, #6fc6e0 42% 60%, #ecdba6 60% 100%)', plat:'#d3bd7e'},
  urban:    {bg:'linear-gradient(#cdd5de 0 54%, #a3abb6 54% 70%, #929aa6 70% 100%)', plat:'#7d8590'},
  night:    {bg:'linear-gradient(#242544 0 52%, #38446e 52% 70%, #2c3559 70% 100%)', plat:'#20264a', dark:true},
  cave:     {bg:'linear-gradient(#3a3550 0 52%, #2f2b47 52% 70%, #24213a 70% 100%)', plat:'#1f1c30', dark:true}
};
function setBattleScene(){
  const arena=document.querySelector('#screen-battle .arena'); if(!arena) return;
  const id=(typeof REGION!=='undefined' && REGION[WORLD_STATE.mi||0] || {}).id || '';
  let biome=(typeof BIOME_OF!=='undefined' && BIOME_OF[id]) || 'grassland';
  if(/^grot/.test(id) || /cave|hall/.test(id)) biome='cave';
  const sc=BATTLE_SCENES[biome]||BATTLE_SCENES.grassland;
  arena.style.background=sc.bg;
  arena.style.setProperty('--plat', sc.plat);
  arena.classList.toggle('scene-dark', !!sc.dark);
}
function buildBattle(pSpecs,eSpecs,info){
  if(info && info.double && pSpecs.length>=2 && eSpecs.length>=2) return buildDouble(pSpecs,eSpecs,info);
  return buildSingle(pSpecs,eSpecs,info);
}
function buildSingle(pSpecs,eSpecs,info){
  go('battle'); setBattleMode('single'); setBattleScene(); playBattleIntro(info);
  B={pTeam:pSpecs.map(mkFighter), eTeam:eSpecs.map(mkFighter),
     pAct:0,eAct:0,over:false,turnLock:false,awaitingSwitch:false,info};
  document.getElementById('result').classList.remove('show');
  document.getElementById('log').innerHTML='';
  document.getElementById('wild-actions').style.display = info.wild ? 'flex':'none';
  if(info.wild) updateBallButtons();
  if(info.wild){
    logMsg(`Een wilde <b>${info.species}</b> (Lv ${B.eTeam[0].lvl}) verscheen! 🌿`,'sw');
  } else {
    const foe=info.trainer?`${info.trainer.e} ${info.trainer.name}`:'een rival';
    logMsg(`<b>${foe}</b> wil vechten!`,'sw');
  }
  logMsg(`Go, <b>${activeP().n}</b>!`+abilTag(activeP()));
  logMsg(`Tegenstander: <b>${activeE().n}</b>!`+abilTag(activeE()));
  refreshBattle(); enableControls();
  onEnter('p'); onEnter('e');
}
/* ---- items / Pokémart ---- */
const MEDS={
  potion:{name:'Drankje',emoji:'🧪',heal:50,desc:'Herstelt 50 HP in gevecht.'},
  superpotion:{name:'Super Drankje',emoji:'💉',heal:120,desc:'Herstelt 120 HP in gevecht.'},
  herbal:{name:'Kruidenzalf',emoji:'🌿',cure:true,desc:'Geneest statuseffecten in gevecht.'}
};
const HELD_ITEMS={
  restjes:{name:'Restjes',emoji:'🍎',desc:'Herstelt elke beurt ~6% max HP.'},
  krachtband:{name:'Krachtband',emoji:'💪',desc:'+12% aanvalsschade.'},
  focusgordel:{name:'Focusgordel',emoji:'🎗️',desc:'Overleeft één KO vanaf volle HP met 1 HP.'},
  vergrootglas:{name:'Vergrootglas',emoji:'🔍',desc:'+10% nauwkeurigheid.'},
  snelklauw:{name:'Snelklauw',emoji:'⚡',desc:'+20% snelheid (beurtvolgorde).'},
  levensbol:{name:'Levensbol',emoji:'🔮',desc:'+25% schade, maar ~10% recoil per rake klap.'},
  statusgordel:{name:'Statusgordel',emoji:'🛡️',desc:'Immuun voor status zolang op volle HP.'},
  bufferschild:{name:'Bufferschild',emoji:'🔰',desc:'Eerste super-effectieve klap wordt gehalveerd.'},
  tempoveren:{name:'Tempo-veren',emoji:'🪶',desc:'Begint het gevecht met +1 snelheid.'},
  zwarelaarzen:{name:'Zware Laarzen',emoji:'🥾',desc:'Immuun voor spread-schade op de bank.'}
};
const HELD_ORDER=[null,'restjes','krachtband','focusgordel','vergrootglas','snelklauw','levensbol','statusgordel','bufferschild','tempoveren','zwarelaarzen'];
/* fossielen: te vinden in grotten, te reviven in het Fossielmuseum */
const FOSSILS={
  fossil_bot:{name:'Botfossiel',emoji:'🦴',revives:'Dean',lvl:22,desc:'Oeroud bot uit de rotsen — ruikt naar canyon.'},
  fossil_amber:{name:'Ambersteen',emoji:'🟠',revives:'Devin',lvl:22,desc:'Insect gevangen in versteend hars.'},
  fossil_vuur:{name:'Vuurfossiel',emoji:'🔥',revives:'Zenith',lvl:18,desc:'Een gloeiend fossiel dat nog warm aanvoelt — er sluimert iets vurigs in. Wekt de lava-lijn Zenith → Bing → Casper.'}
};
function reviveFossil(key){
  const fo=FOSSILS[key]; if(!fo||!(bag[key]>0)){ toast('Geen fossiel.'); return; }
  bag[key]--;
  addCaught(fo.revives, fo.lvl);
  if(typeof closeDialogue==='function') closeDialogue();
  saveProgress(); if(typeof updatePartyCount==='function') updatePartyCount();
  toast(`🧬 ${fo.name} kwam tot leven als ${fo.revives}!`);
  if(typeof showDialogue==='function') showDialogue('Professor Fossiel', `Fascinerend! Het ${fo.name} is tot leven gewekt als <b>${fo.revives}</b> (Lv ${fo.lvl}) en toegevoegd aan je team! 🦴✨`, []);
}
function openMuseum(){
  const owned=Object.keys(FOSSILS).filter(k=>bag[k]>0);
  if(!owned.length){
    showDialogue('Professor Fossiel', 'Welkom in het Fossielmuseum! 🏛️ Breng me een fossiel uit de grotten en ik wek het oeroude widrmon weer tot leven. Zoek goed in de donkere hoekjes…', []);
    return;
  }
  const btns=owned.map(k=>{ const fo=FOSSILS[k]; return {label:`${fo.emoji} ${fo.name} → ${fo.revives} (×${bag[k]})`, cls:'go', fn:()=>reviveFossil(k)}; });
  btns.push({label:'Nog niet',fn:closeDialogue});
  showDialogue('Professor Fossiel', 'Je draagt een fossiel bij je! Welke wil je tot leven wekken? 🧬', btns);
}
const SHOP_ITEMS=[
  {key:'widrball', name:'Widrball', emoji:'🔴', price:200, bonus:0,    desc:'Standaard vangbal.'},
  {key:'superbal', name:'Superbal', emoji:'🔵', price:500, bonus:0.22, desc:'Grotere vangkans.'},
  {key:'hyperbal', name:'Hyperbal', emoji:'🟣', price:1200,bonus:0.42, desc:'Topklasse vangkans.'},
  {key:'potion', name:'Drankje', emoji:'🧪', price:150, desc:'Herstelt 50 HP in gevecht.'},
  {key:'superpotion', name:'Super Drankje', emoji:'💉', price:400, desc:'Herstelt 120 HP in gevecht.'},
  {key:'herbal', name:'Kruidenzalf', emoji:'🌿', price:250, desc:'Geneest status in gevecht.'}
];
function ballItem(key){ return SHOP_ITEMS.find(i=>i.key===key); }
function updateBallButtons(){
  const b1=document.getElementById('ball-btn'), b2=document.getElementById('ball-btn2'), b3=document.getElementById('ball-btn3');
  if(b1){ b1.textContent=`🔴 Widrball (${bag.widrball||0})`; b1.disabled=!(bag.widrball>0); }
  if(b2){ b2.textContent=`🔵 Superbal (${bag.superbal||0})`; b2.disabled=!(bag.superbal>0); }
  if(b3){ b3.textContent=`🟣 Hyperbal (${bag.hyperbal||0})`; b3.disabled=!(bag.hyperbal>0); }
}
function openShop(){
  const btns=SHOP_ITEMS.map(it=>({label:`${it.emoji} ${it.name} — 🪙${it.price} (heb ${bag[it.key]||0})`, cls: money>=it.price?'go':'', fn:()=>buyItem(it.key)}));
  btns.push({label:'Klaar ✅', fn:closeDialogue});
  showDialogue('Pokémart', `Welkom bij de Pokémart! 🪙 ${money} munten. Vangballen, drankjes en meer — wat wordt het?`, btns);
}
function buyItem(key){
  const it=ballItem(key);
  if(money<it.price){ toast('Niet genoeg munten! 🪙'); return; }
  money-=it.price; bag[key]=(bag[key]||0)+1; saveProgress();
  if(typeof updateMoney==='function') updateMoney();
  toast(`${it.name} gekocht! ${it.emoji}`);
  openShop();
}
/* ---- tas in gevecht (potions/status-cure, kost een beurt) ---- */
function openBattleBag(){
  if(!B||B.over||B.turnLock||B.awaitingSwitch) return;
  const ov=document.getElementById('bag-ov'), card=document.getElementById('bag-card'); if(!ov||!card) return;
  const owned=Object.keys(MEDS).filter(k=>bag[k]>0);
  let html=`<div class="learn-h">🎒 Tas</div>`;
  if(!owned.length) html+=`<p class="learn-q">Geen bruikbare items. Koop drankjes bij de Pokémart! 🛒</p>`;
  else html+=`<p class="learn-q">Welk item gebruik je op ${activeP().n}? (kost je beurt)</p><div class="learn-slots">`
    + owned.map(k=>{const m=MEDS[k];return `<button class="learn-slot" onclick="useBattleItem('${k}')"><span class="ls-tp" style="background:#1d4ed8">${m.emoji}</span><b>${m.name}</b><span class="ls-meta">${bag[k]}× · ${m.desc}</span></button>`;}).join('')
    + `</div>`;
  html+=`<button class="learn-skip" onclick="closeBattleBag()">Terug</button>`;
  card.innerHTML=html; ov.style.display='flex';
}
function closeBattleBag(){ const ov=document.getElementById('bag-ov'); if(ov) ov.style.display='none'; }
function useBattleItem(key){
  const m=MEDS[key], f=activeP();
  if(!m||!(bag[key]>0)) return;
  if(m.heal && f.curhp>=f.maxhp){ toast(`${f.n} zit al op volle HP!`); return; }
  if(m.cure && !f.status){ toast(`${f.n} heeft geen status om te genezen.`); return; }
  bag[key]--; closeBattleBag(); saveProgress();
  B.turnLock=true; setMovesDisabled(true);
  if(m.heal){ const h=Math.min(m.heal, f.maxhp-f.curhp); f.curhp+=h; updateHP('p'); logMsg(`Je gebruikt ${m.name}! <b>${f.n}</b> herstelt ${h} HP. 💚`,'sw'); }
  if(m.cure && f.status){ logMsg(`${m.name} geneest ${f.n}'s status! ✨`,'sw'); f.status=null; renderStatusLine('p'); }
  const eIdx=enemyChooseMove();
  setTimeout(()=>runSeq([['e',eIdx]],0),550);
}
/* held item wisselen vanuit het team-overzicht */
function cycleHeld(i){
  const p=party[i]; if(!p) return;
  const cur=HELD_ORDER.indexOf(p.held||null);
  p.held=HELD_ORDER[(cur+1)%HELD_ORDER.length];
  saveProgress(); renderSummary();
}
function cycleAbility(i){
  const p=party[i]; if(!p) return; const m=byName(p.sp); const list=m.abilities||[m.ability];
  const cur=Math.max(0,list.indexOf((p.ability&&list.includes(p.ability))?p.ability:m.ability));
  p.ability=list[(cur+1)%list.length]; saveProgress(); renderSummary();
}
/* ---- vangen ---- */
function attemptCatch(kind){
  if(!B||B.over||B.turnLock||!B.info.wild||B.awaitingSwitch)return;
  kind=kind||'widrball';
  if(!(bag[kind]>0)){ toast('Geen '+ballItem(kind).name+'! Koop er bij de Pokémart. 🛒'); return; }
  bag[kind]--; saveProgress(); updateBallButtons();
  const it=ballItem(kind);
  B.turnLock=true; setMovesDisabled(true);
  document.getElementById('ball-btn').disabled=true;
  const b2=document.getElementById('ball-btn2'); if(b2) b2.disabled=true;
  const b3=document.getElementById('ball-btn3'); if(b3) b3.disabled=true;
  const wild=activeE();
  let chance=0.28 + (1-wild.curhp/wild.maxhp)*0.5 + it.bonus;
  if(wild.status==='sleep'||wild.status==='freeze') chance+=0.25;
  else if(wild.status) chance+=0.12;
  if(wild.rarity) chance*=0.5;
  chance=Math.max(0.08,Math.min(0.97,chance));
  logMsg(`Je gooit een <b>${it.name}</b>! ${it.emoji}`,'sw');
  const esp=document.getElementById('e-sprite');
  esp.style.transition='transform .3s'; esp.style.transform='scale(.4) translateY(-10px)';
  let wob=0;
  const iv=setInterval(()=>{ esp.style.transform=`scale(.4) rotate(${wob%2?12:-12}deg)`; wob++; if(wob>=3){ clearInterval(iv);
    if(Math.random()<chance){
      esp.style.transform='scale(0)';
      const caughtMon=addCaught(wild.n, wild.lvl);
      logMsg(`Gotcha! <b>${wild.n}</b> (Lv ${wild.lvl}) is gevangen! 🎉`,'crit');
      B.over=true;
      endWorldResult('GEVANGEN!', `<b>${wild.n}</b> is toegevoegd aan je team! 🎉`);
      offerNickname(caughtMon, wild.n);
    } else {
      esp.style.transform='';
      logMsg(`Oh nee — <b>${wild.n}</b> brak los!`,'eff');
      const eIdx=enemyChooseMove();
      setTimeout(()=>{ updateBallButtons(); runSeq([['e',eIdx]],0); },500);
    }
  }},320);
}
function fleeBattle(){
  if(!B||B.over||B.turnLock)return;
  logMsg('Je bent veilig ontsnapt! 🏃','sw');
  B.over=true;
  setTimeout(()=>enterWorld(),500);
}
function addCaught(name,lvl){
  caught.add(name);
  const mon={sp:name, lvl:lvl||5, xp:0, moves:defaultMoveKeys(name, lvl||5)};
  if(party.length<PARTY_MAX) party.push(mon);
  else { box.push(mon); if(typeof toast==='function') toast(`📦 Team vol — ${name} ging naar de PC-opslag (Widr Center).`); }
  saveProgress();
  return mon;
}
/* ---- bijnamen ---- */
function monLabel(p){ return (p && p.nick) || (p && p.sp) || '?'; }
function offerNickname(mon, sp){
  if(!mon) return;
  setTimeout(()=>{ try{
    if(confirm(`Wil je ${sp} een bijnaam geven?`)){
      const v=prompt(`Bijnaam voor ${sp}? (max 14 tekens, leeg = soortnaam)`, mon.nick||'');
      if(v!==null){ const nm=v.trim().slice(0,14); if(nm){ mon.nick=nm; if(typeof toast==='function') toast(`✏️ ${sp} heet nu ${nm}!`); } else { delete mon.nick; } saveProgress(); }
    }
  }catch(e){} }, 350);
}
function renameMon(where,i){
  const arr = where==='team'?party:box;
  const p=arr[i]; if(!p) return;
  const sp=byName(p.sp)?byName(p.sp).n:p.sp;
  try{
    const v=prompt(`Bijnaam voor ${sp}? (max 14 tekens, leeg = soortnaam)`, p.nick||'');
    if(v===null) return;
    const nm=v.trim().slice(0,14);
    if(nm) p.nick=nm; else delete p.nick;
    saveProgress(); openPC();
  }catch(e){}
}
function healParty(){ /* HP is per battle fris; niets te doen, maar hook voor toekomst */ saveProgress(); }
/* ---- Widr-PC: opslag van widrmon (team max 4) ---- */
function openPC(){
  const ov=document.getElementById('pc-ov'), card=document.getElementById('pc-card'); if(!ov||!card) return;
  const row=(p,i,where)=>{ const m=byName(p.sp); return `<div style="display:flex;gap:6px;align-items:stretch">
      <button class="pc-mon" style="flex:1" onclick="${where==='team'?`pcDeposit(${i})`:`pcWithdraw(${i})`}">
      <span class="pc-ava">${m?monImg(m,'100%'):'❓'}</span>
      <span class="pc-info"><b>${monLabel(p)}</b><span>${p.nick?p.sp+' · ':''}Lv ${p.lvl}</span></span>
      <span class="pc-act">${where==='team'?'⬇ opslaan':'⬆ ophalen'}</span></button>
      <button class="pc-mon" style="flex:0 0 auto;justify-content:center;padding:0 14px;font-size:18px" title="Bijnaam geven" onclick="renameMon('${where}',${i})">✏️</button>
    </div>`; };
  let html=`<div class="learn-h">🖥️ Widr-PC — opslag</div>`;
  html+=`<p class="learn-q">Je team (${party.length}/${PARTY_MAX}) — dit neem je mee de wereld in.</p>`;
  html+=`<div class="pc-list">${party.length?party.map((p,i)=>row(p,i,'team')).join(''):'<span class="pc-empty">Leeg</span>'}</div>`;
  html+=`<p class="learn-q">Opslag (${box.length})</p>`;
  html+=`<div class="pc-list">${box.length?box.map((p,i)=>row(p,i,'box')).join(''):'<span class="pc-empty">Nog niks opgeslagen.</span>'}</div>`;
  html+=`<button class="learn-skip" onclick="closePC()">Klaar ✅</button>`;
  card.innerHTML=html; ov.style.display='flex';
}
function closePC(){ const ov=document.getElementById('pc-ov'); if(ov) ov.style.display='none'; }
function pcDeposit(i){
  if(party.length<=1){ if(typeof toast==='function') toast('Je moet minstens 1 widrmon bij je houden!'); return; }
  const p=party.splice(i,1)[0]; if(!p) return; box.push(p); saveProgress();
  if(typeof updatePartyCount==='function') updatePartyCount(); openPC();
}
function pcWithdraw(i){
  if(party.length>=PARTY_MAX){ if(typeof toast==='function') toast(`Team zit vol (max ${PARTY_MAX}). Sla eerst iets op.`); return; }
  const p=box.splice(i,1)[0]; if(!p) return; party.push(p); saveProgress();
  if(typeof updatePartyCount==='function') updatePartyCount(); openPC();
}
function endWorldResult(title,text){
  const res=document.getElementById('result');
  document.getElementById('result-title').textContent=title;
  document.getElementById('result-text').innerHTML=text;
  document.getElementById('result-actions').innerHTML=
    `<button class="bigbtn gym" onclick="enterWorld()">🗺️ Terug de wereld in</button>
     <button class="bigbtn dex" onclick="go('dex')">📖 Widrdex</button>`;
  res.classList.add('show');
}
function refreshBattle(){ setSide('p'); setSide('e'); renderDots('p'); renderDots('e'); }
function setSide(side){
  const f=side==='p'?activeP():activeE();
  document.getElementById(side+'-name').textContent=`${f.n}  Lv${f.lvl}`+(f.rarity?(f.rarity==='Legendary'?' ★':' ✦'):'');
  renderStatusLine(side);
  const sp=document.getElementById(side+'-sprite');
  const mon=f.mega?Object.assign({},byName(f.sp),{n:f.n,t:f.t}):byName(f.sp);
  sp.innerHTML=monImg(mon,'90%'); sp.style.background='transparent'; sp.classList.remove('faint','hit');
  updateHP(side);
  if(side==='p') updateBattleXp();
}
function updateBattleXp(){
  const wrap=document.getElementById('p-xp'); if(!wrap) return;
  const f=(typeof B!=='undefined'&&B)?activeP():null;
  if(!f||f.pIdx==null||!party[f.pIdx]){ wrap.style.display='none'; return; }
  const p=party[f.pIdx];
  wrap.style.display='';
  const pct=Math.min(100,Math.round((p.xp||0)/xpNeed(p.lvl)*100));
  const fill=document.getElementById('p-xp-fill'); if(fill) fill.style.width=pct+'%';
}
function renderStatusLine(side){
  const f=side==='p'?activeP():activeE();
  let html=f.t.map(t=>`<span class="tbadge" style="background:${TYPE_META[t].c};font-size:9px;padding:1px 6px">${TYPE_META[t].e}</span>`).join('');
  if(f.status) html+=' '+statusChip(f.status);
  document.getElementById(side+'-types').innerHTML=html;
}
function updateHP(side){
  const f=side==='p'?activeP():activeE();
  const pct=Math.max(0,f.curhp/f.maxhp*100);
  const bar=document.getElementById(side+'-hp');
  bar.style.width=pct+'%';
  bar.style.background=pct>50?'#4caf50':pct>22?'#f7a20d':'#e3350d';
  document.getElementById(side+'-hpnum').textContent=Math.max(0,Math.ceil(f.curhp))+' / '+f.maxhp+' HP';
}
function renderDots(side){
  const team=side==='p'?B.pTeam:B.eTeam, act=side==='p'?B.pAct:B.eAct;
  document.getElementById(side+'-dots').innerHTML=team.map((f,i)=>
    `<span class="pdot ${f.curhp<=0?'dead':''} ${i===act?'active':''}" title="${f.n}"></span>`).join('');
}
function logMsg(html,cls){
  const log=document.getElementById('log'); const p=document.createElement('p');
  if(cls)p.className=cls; p.innerHTML=html; log.appendChild(p); log.scrollTop=log.scrollHeight;
}

/* ---- controls ---- */
function enableControls(){
  const f=activeP();
  document.getElementById('moves-panel').innerHTML=f.moves.map((mv,i)=>`
    <button class="mvbtn" onclick="playerMove(${i})">
      <span class="mn">${mv.n}</span>
      <span class="mmeta" style="background:${TYPE_META[mv.t].c}">${TYPE_META[mv.t].e} ${mv.t}</span>
      <span class="mmeta" style="background:#151321"> ${mv.cat==='status'?'STATUS':'PWR '+mv.p} · ${moveAccuracy(mv)}%</span>
    </button>`).join('')
    + (megaAvail(f)?`
    <button class="mvbtn" style="background:#fce7f3" onclick="doMega()">
      <span class="mn">🌟 Mega-evolueer</span>
      <span class="mmeta" style="background:#db2777">→ ${MEGA[f.sp].name}</span>
    </button>`:'')
    + `<button class="mvbtn" style="background:#dbeafe" onclick="openBattleBag()">
      <span class="mn">🎒 Tas</span>
      <span class="mmeta" style="background:#1d4ed8">Gebruik een item</span>
    </button>`;
  renderSwitchRow();
}
function renderSwitchRow(){
  const label=document.getElementById('switch-label');
  label.innerHTML=B.awaitingSwitch?'<span class="must-switch">Je widrmon ging KO — kies een nieuwe!</span>':'Wissel widrmon (kost je beurt)';
  const alive=aliveIdx(B.pTeam);
  document.getElementById('switch-row').innerHTML=B.pTeam.map((f,i)=>{
    const disabled=(f.curhp<=0)||(i===B.pAct);
    return `<button class="swbtn" ${disabled?'disabled':''} onclick="playerSwitch(${i})">
      <span class="se">${f.e}</span><span>${f.n}<br><span style="font-size:10px">${f.curhp<=0?'KO':Math.ceil(f.curhp)+' HP'}</span></span></button>`;
  }).join('');
}
function setMovesDisabled(d){document.querySelectorAll('.mvbtn').forEach(b=>b.disabled=d);}

/* ---- turn resolution ---- */
function enemyChooseMove(){
  maybeEnemyMega();
  const e=activeE(), p=activeP();
  let best=0,bestScore=-1;
  e.moves.forEach((mv,i)=>{
    let score;
    if(mv.cat==='status'){
      if(mv.act&&mv.act.heal) score = (e.curhp < e.maxhp*0.4 && e.healsLeft>0) ? 120 : 3;
      else if(mv.act&&mv.act.status) score = (p.status?3:40);          // niet nog eens statussen
      else score = 34;                                                  // buffs af en toe
    } else {
      const stab=e.t.includes(mv.t)?1.5:1;
      score=mv.p*effMult(mv.t,p.t)*stab;
    }
    score*=(0.8+Math.random()*0.45);
    if(score>bestScore){bestScore=score;best=i;}
  });
  return best;
}
function playerMove(i){
  if(B.over||B.turnLock||B.awaitingSwitch)return;
  B.turnLock=true; setMovesDisabled(true);
  const eIdx=enemyChooseMove();
  const pFirst=effSpd(activeP())>=effSpd(activeE());
  const seq=pFirst?[['p',i],['e',eIdx]]:[['e',eIdx],['p',i]];
  runSeq(seq,0);
}
function playerSwitch(j){
  if(B.over||B.turnLock)return;
  if(B.awaitingSwitch){
    activeP().stages={atk:0,def:0,spd:0}; activeP().flinch=false;
    B.pAct=j; B.awaitingSwitch=false; setSide('p'); renderDots('p');
    logMsg(`Go, <b>${activeP().n}</b>!`+abilTag(activeP()),'sw');
    onEnter('p');
    B.turnLock=false; enableControls();
    return;
  }
  B.turnLock=true; setMovesDisabled(true);
  logMsg(`Je haalt <b>${activeP().n}</b> terug!`,'sw');
  activeP().stages={atk:0,def:0,spd:0}; activeP().flinch=false;   // stat-stages resetten bij wissel
  B.pAct=j; setSide('p'); renderDots('p');
  logMsg(`Go, <b>${activeP().n}</b>!`+abilTag(activeP()),'sw');
  onEnter('p');
  const eIdx=enemyChooseMove();
  setTimeout(()=>runSeq([['e',eIdx]],0),550);
}
/* accuracy per move: expliciete move.acc wint, anders afgeleid van kracht */
function moveAccuracy(move){
  if(move.acc!=null) return move.acc;
  if(move.cat==='status') return 100;
  if(move.p>=95) return 85;
  if(move.p>=82) return 90;
  if(move.p>=70) return 95;
  return 100;
}
function effAccuracy(att,move){
  if(att.ability==='deadeye') return 100;
  let a=moveAccuracy(move);
  if(att.ability==='sharpshoot') a=Math.min(100, Math.round(a*1.12));
  if(att.held==='vergrootglas') a=Math.min(100, Math.round(a*1.1));
  return a;
}
function calcDmg(att,def,move){
  // Chroma Claw: markering telt als Psychic/Rock — offensief (att raakte def) én defensief (def raakte att)
  const dtypes=(def.chromaHit && def.chromaHit.has(att) && !def.t.includes('Rock')) ? def.t.concat('Rock') : def.t;
  const atypes=(att.chromaHit && att.chromaHit.has(def) && !att.t.includes('Rock')) ? att.t.concat('Rock') : att.t;
  const eff=effMult(move.t,dtypes);
  const stab=atypes.includes(move.t)?1.5:1;
  const crit=Math.random()<(att.ability==='crit'?0.125:0.0625)?1.5:1;
  const rand=0.85+Math.random()*0.15;
  let atk=att.atk*stageMul(att.stages.atk);
  if(att.status==='burn' && att.ability!=='guts') atk*=0.5;   // brand halveert aanval (tenzij Doorzetter)
  const dfn=def.def*stageMul(def.stages.def);
  let dmg=(move.p*(atk/dfn)*eff*stab*crit*rand)*0.42;
  if(att.ability==='power') dmg*=1.15;
  if(att.ability==='blaze' && move.t==='Fire') dmg*=1.3;
  if(att.ability==='torrent' && move.t==='Water') dmg*=1.3;
  if(att.ability==='overgrow' && move.t==='Grass') dmg*=1.3;
  if(att.held==='krachtband') dmg*=1.12;
  if(att.held==='levensbol') dmg*=1.25;
  if(att.ability==='overdrive' && att.curhp<att.maxhp/3) dmg*=1.5;
  if(att.ability==='guts' && att.status) dmg*=1.5;
  if(def.ability==='thick') dmg*=0.85;
  if(def.ability==='bulk') dmg*=0.80;
  if(eff>1 && def.held==='bufferschild' && !def.buffUsed && dmg>0){ dmg*=0.5; def.buffUsed=true; if(typeof logMsg==='function') logMsg(`🔰 ${def.n}'s Bufferschild vangt de klap half op!`,'eff'); }
  dmg=Math.max(eff===0?0:1,Math.round(dmg));
  return {dmg,eff,crit:crit>1};
}
function effWord(m){
  if(m===0)return['Het heeft geen effect...','eff'];
  if(m>=2)return['Het is super effectief!','eff'];
  if(m>1)return['Het is effectief!','eff'];
  if(m<1)return['Het is niet erg effectief...','eff'];
  return[null,null];
}
/* kan deze mon deze beurt handelen? (freeze/sleep/para/flinch) */
function canAct(f,side){
  if(f.status==='freeze'){ if(Math.random()<0.2){ f.status=null; logMsg(`${f.n} ontdooit!`,'eff'); renderStatusLine(side); } else { logMsg(`${f.n} is bevroren! 🧊`,'eff'); return false; } }
  if(f.status==='sleep'){ if(f.sleepCtr<=0){ f.status=null; logMsg(`${f.n} wordt wakker!`,'eff'); renderStatusLine(side); } else { f.sleepCtr--; logMsg(`${f.n} slaapt... 😴`,'eff'); return false; } }
  if(f.status==='para' && Math.random()<0.25){ logMsg(`${f.n} is verlamd en kan niet bewegen! ⚡`,'eff'); return false; }
  if(f.flinch){ logMsg(`${f.n} deinsde terug!`,'eff'); return false; }
  return true;
}
function applyStatusMove(att,def,attSide,defSide,move){
  const a=move.act||{};
  if(a.heal){
    if(att.healsLeft<=0){ logMsg(`${att.n} kan niet meer herstellen! 💤`,'eff'); }
    else { att.healsLeft--; const h=Math.round(att.maxhp*a.heal); att.curhp=Math.min(att.maxhp,att.curhp+h); logMsg(`${att.n} herstelt ${h} HP! 💚`,'eff'); updateHP(attSide); }
  }
  if(a.stat){ const self=a.target==='self'; applyStat(self?att:def, a.stat, a.stage, self?attSide:defSide); renderStatusLine(self?attSide:defSide); }
  if(a.status){ if(canGetStatus(def,a.status)){ def.status=a.status; if(a.status==='sleep')def.sleepCtr=1+Math.floor(Math.random()*3); logMsg(`${def.n} ${statusVerb(a.status)}`,'eff'); renderStatusLine(defSide); } else logMsg('Maar het faalde...','eff'); }
}
function applySecondary(att,def,attSide,defSide,move,dmg){
  const e=move.eff; if(!e)return;
  if(e.recoil){ const rc=Math.max(1,Math.round(dmg*e.recoil)); att.curhp-=rc; logMsg(`${att.n} krijgt ${rc} recoil-schade.`,'eff'); updateHP(attSide); }
  if(def.curhp<=0) return;
  if(e.status && Math.random()<e.chance && canGetStatus(def,e.status)){ def.status=e.status; if(e.status==='sleep')def.sleepCtr=1+Math.floor(Math.random()*3); logMsg(`${def.n} ${statusVerb(e.status)}`,'eff'); renderStatusLine(defSide); }
  if(e.flinch && Math.random()<e.flinch && def.ability!=='hardhead'){ def.flinch=true; }
  if(e.stat && Math.random()<e.chance){ const self=e.target==='self'; applyStat(self?att:def, e.stat, e.stage, self?attSide:defSide); renderStatusLine(self?attSide:defSide); }
}
function runSeq(seq,k){
  if(B.over)return;
  if(k>=seq.length){ doResidual(); return; }
  const side=seq[k][0], mi=seq[k][1];
  const att=side==='p'?activeP():activeE();
  if(att.curhp<=0){ runSeq(seq,k+1); return; }
  const defSide=side==='p'?'e':'p';
  const def=side==='p'?activeE():activeP();
  const move=att.moves[mi];
  if(!canAct(att,side)){ setTimeout(()=>runSeq(seq,k+1),650); return; }
  logMsg(`<b>${att.n}</b> gebruikt <b>${move.n}</b>!`);
  const sp=document.getElementById(side+'-sprite');
  const dspEl=document.getElementById(defSide+'-sprite');
  fxAttackVisual(sp,[dspEl],move);

  if(Math.random()*100 >= effAccuracy(att,move)){
    setTimeout(()=>{ logMsg(`${att.n}'s aanval miste! 💨`,'eff'); setTimeout(()=>runSeq(seq,k+1),600); },220);
    return;
  }

  if(move.cat==='status'){
    setTimeout(()=>{
      applyStatusMove(att,def,side,defSide,move);
      if(att.curhp<=0){ handleFaint(side); return; }
      setTimeout(()=>runSeq(seq,k+1),600);
    },260);
    return;
  }
  setTimeout(()=>{
    if(def.status==='freeze' && move.t==='Fire'){ def.status=null; logMsg(`${def.n} ontdooit door het vuur!`,'eff'); renderStatusLine(defSide); }
    const r=calcDmg(att,def,move);
    def.curhp-=r.dmg;
    const sturdySaved = def.ability==='sturdy' && def.curhp<=0 && (def.curhp+r.dmg)>=def.maxhp;
    if(sturdySaved) def.curhp=1;
    const sashSaved = !sturdySaved && def.held==='focusgordel' && !def.sashUsed && def.curhp<=0 && (def.curhp+r.dmg)>=def.maxhp;
    if(sashSaved){ def.curhp=1; def.sashUsed=true; }
    const dsp=document.getElementById(defSide+'-sprite');
    dsp.classList.add('hit'); setTimeout(()=>dsp.classList.remove('hit'),420);
    fxBurst(dsp,(TYPE_META[move.t]||{}).c||'#fff');
    if(r.eff!==0) fxDamageNum(dsp,r.dmg,r.crit);
    if(r.crit)logMsg('Een kritieke treffer!','crit');
    const [w,c]=effWord(r.eff); if(w)logMsg(w,c);
    if(r.eff!==0)logMsg(`${def.n} verliest ${r.dmg} HP.`);
    updateHP(defSide);
    if(sturdySaved) logMsg(`${def.n} hield stand met Taai! 💪`,'eff');
    if(sashSaved) logMsg(`${def.n} hield stand met de Focusgordel! 🎗️`,'eff');
    if(r.eff!==0) applySecondary(att,def,side,defSide,move,r.dmg);
    if(r.eff!==0 && r.dmg>0){
      if(att.held==='levensbol' && att.curhp>0){ const rc=Math.max(1,Math.round(att.maxhp*0.1)); att.curhp=Math.max(0,att.curhp-rc); logMsg(`${att.n} voelt de Levensbol terugslaan (−${rc} HP). 🔮`,'eff'); updateHP(side); }
      if(att.ability==='vamp' && att.curhp>0){ const h=Math.max(1,Math.round(r.dmg*0.25)); att.curhp=Math.min(att.maxhp,att.curhp+h); logMsg(`${att.n} zuigt ${h} HP terug! 🧛`,'eff'); updateHP(side); }
      if(def.curhp>0 && def.ability==='flamebody' && !att.status && Math.random()<0.3 && canGetStatus(att,'burn')){ att.status='burn'; logMsg(`${att.n} ${statusVerb('burn')} (Vlamlichaam)`,'eff'); renderStatusLine(side); }
      if(def.curhp>0 && def.ability==='poisonbody' && !att.status && Math.random()<0.3 && canGetStatus(att,'poison')){ att.status='poison'; logMsg(`${att.n} ${statusVerb('poison')} (Gifhuid)`,'eff'); renderStatusLine(side); }
      if(def.curhp>0 && def.ability==='static' && !att.status && Math.random()<0.3 && canGetStatus(att,'para')){ att.status='para'; logMsg(`${att.n} ${statusVerb('para')} (Statisch)`,'eff'); renderStatusLine(side); }
    }
    // ---- Chroma Claw: markeer het geraakte doelwit (Ionnyx telt voortaan als Psychic/Rock tegen deze mon) ----
    if(move.chroma && r.eff!==0){ (att.chromaHit=att.chromaHit||new Set()).add(def); logMsg(`🌈 ${att.n} drukt z'n kleurpatroon op <b>${def.n}</b> — telt nu als Psychic/Rock tegen ${def.n}!`,'eff'); }
    // ---- spread-move: raakt ook de teamgenoten op de bank (dubbel/trainer-gevechten) ----
    if(move.spread){
      const dteam=defSide==='p'?B.pTeam:B.eTeam, dact=defSide==='p'?B.pAct:B.eAct;
      dteam.forEach((bm,bi)=>{
        if(bi===dact || bm.curhp<=0) return;
        if(bm.held==='zwarelaarzen'){ logMsg(`🥾 ${bm.n} negeert de spread-schade (Zware Laarzen).`,'eff'); return; }
        const rr=calcDmg(att,bm,move); const sd=Math.max(1,Math.round(rr.dmg*0.55));
        bm.curhp=Math.max(0,bm.curhp-sd);
        logMsg(`💥 ${move.n} raakt ook <b>${bm.n}</b> op de bank (−${sd} HP)!`,'eff');
        if(bm.curhp<=0) logMsg(`${bm.n} ging op de bank KO!`,'crit');
      });
      renderDots(defSide);
    }
    if(def.curhp<=0){ def.curhp=0; updateHP(defSide); dsp.classList.add('faint'); setTimeout(()=>handleFaint(defSide),650); return; }
    if(att.curhp<=0){ att.curhp=0; updateHP(side); document.getElementById(side+'-sprite').classList.add('faint'); setTimeout(()=>handleFaint(side),650); return; }
    setTimeout(()=>runSeq(seq,k+1),600);
  },250);
}
/* einde-beurt: brand/vergif schade op beide actieve mons */
function doResidual(){
  if(B.over)return;
  activeP().flinch=false; activeE().flinch=false;   // flinch verloopt aan einde beurt
  const order=[['p',activeP()],['e',activeE()]];
  let i=0;
  (function step(){
    if(B.over)return;
    if(i>=order.length){ endTurn(); return; }
    const [sd,f]=order[i]; i++;
    if(f.curhp<=0){ step(); return; }
    if(f.ability==='regen' && f.curhp<f.maxhp){ const h=Math.max(1,Math.floor(f.maxhp/16)); f.curhp=Math.min(f.maxhp,f.curhp+h); logMsg(`${f.n} herstelt ${h} HP (Regeneratie). 🌱`,'eff'); updateHP(sd); }
    if(f.held==='restjes' && f.curhp>0 && f.curhp<f.maxhp){ const h=Math.max(1,Math.floor(f.maxhp/16)); f.curhp=Math.min(f.maxhp,f.curhp+h); logMsg(`${f.n} herstelt ${h} HP (Restjes). 🍎`,'eff'); updateHP(sd); }
    if(f.ability==='speedup' && f.stages.spd<6){ f.stages.spd++; logMsg(`${f.n}'s snelheid stijgt (Versnelling)! 🔼`,'eff'); }
    if(f.status==='burn'||f.status==='poison'){
      const dmg=Math.max(1, Math.floor(f.maxhp/(f.status==='burn'?16:8)));
      f.curhp-=dmg;
      logMsg(`${f.n} lijdt ${dmg} schade door ${f.status==='burn'?'verbranding 🔥':'vergif ☠️'}.`,'eff');
      updateHP(sd);
      if(f.curhp<=0){ f.curhp=0; updateHP(sd); document.getElementById(sd+'-sprite').classList.add('faint'); setTimeout(()=>handleFaint(sd),600); return; }
      setTimeout(step,520);
    } else { step(); }
  })();
}
function handleFaint(side){
  const team=side==='p'?B.pTeam:B.eTeam;
  const f=side==='p'?activeP():activeE();
  logMsg(`<b>${f.n}</b> ging knock-out!`,'crit');
  const alive=aliveIdx(team);
  if(alive.length===0){ B.over=true; endBattle(side==='e'); return; }
  if(side==='e'){
    B.eAct=alive[0]; setSide('e'); renderDots('e');
    logMsg(`Tegenstander stuurt <b>${activeE().n}</b>!`+abilTag(activeE()),'sw');
    onEnter('e');
    endTurn();
  } else {
    B.awaitingSwitch=true; renderDots('p');
    B.turnLock=false; setMovesDisabled(true); renderSwitchRow();
  }
}
function endTurn(){
  if(B.over)return;
  if(B.pTeam[B.pAct]) B.pTeam[B.pAct].flinch=false;
  if(B.eTeam[B.eAct]) B.eTeam[B.eAct].flinch=false;
  B.turnLock=false;
  if(!B.awaitingSwitch){ enableControls(); }  // herbouwt moves voor de HUIDIGE actieve mon (fix na switch)
}
function awardBattleXp(){
  if(!B||!B.eTeam.length) return 0;
  const lv=B.eTeam.map(f=>f.lvl); const avg=lv.reduce((a,b)=>a+b,0)/lv.length;
  const amt=Math.round(avg*5)+6; gainXp(B.pTeam, amt); return amt;
}
function endBattle(playerWon){
  // wilde gevechten
  if(B.info.wild){
    if(playerWon){
      const xp=awardBattleXp();
      endWorldResult('Wild verslagen', `De wilde <b>${B.info.species}</b> ging KO (+${xp} XP). Volgende keer een Widrball gooien! 🔴`);
    } else {
      WORLD_STATE.mi=0; WORLD_STATE.x=6; WORLD_STATE.y=9; saveProgress();
      endWorldResult('Je ging KO... 😵', `Al je widrmon zijn uitgeteld. De Rector in Widr Town lapt je op en je bent weer fit. 💚`);
    }
    return;
  }
  const fromWorld = B.info.trainer && B.info.trainer.fromWorld;
  const res=document.getElementById('result');
  document.getElementById('result-title').textContent=playerWon?'JIJ WINT!':'VERSLAGEN';
  const t=B.info.trainer;
  let txt, actions='';
  if(playerWon){
    const xp=awardBattleXp();
    if(t){
      if(!beaten.has(t.id)){
        beaten.add(t.id);
        const prize=Math.round((B.eTeam[0]?B.eTeam[0].lvl:10)*18)+({Gym:300,Elite:400,Champion:1500,Evil:500,Grunt:120,Rival:150,Route:60}[t.role]||60);
        money+=prize; saveProgress();
        if(t.role==='Gym') txt=`Je versloeg <b>${t.name}</b> en verdiende de <b>${t.badge}</b>! 🏅`;
        else if(t.role==='Elite') txt=`Elite Four-lid <b>${t.name}</b> is verslagen! Door naar de volgende. 🔥`;
        else if(t.role==='Champion') txt=`Je versloeg de Champion <b>${t.name}</b>! Jij bent de nieuwe <b>WIDR CHAMPION</b>! 👑🏆`;
        else if(t.role==='Evil') txt=`Je hebt Team Widr-leider <b>${t.name}</b> verslagen. De gc is voorlopig veilig. 😎`;
        else if(t.role==='Grunt') txt=`Team Widr-grunt <b>${t.name}</b> is verslagen! 😎`;
        else if(t.role==='Route') txt=`Je versloeg <b>${t.name}</b>! 💪`;
        else txt=`Je versloeg je rivaal <b>${t.name}</b>. 'Beginnersgeluk', mompelt hij. 😏`;
        txt+=` <span style="color:#b8860b;font-weight:bold">+🪙${prize} munten</span>`;
      } else txt=`Nog een keer verslagen — <b>${t.name}</b> heeft weinig antwoord op je. 💪`;
    } else txt=`<b>${activeP()?activeP().n:'Je team'}</b> won! De widr region juicht. 🏆`;
    actions=(WORLD_STATE.started?`<button class="bigbtn gym" onclick="enterWorld()">🗺️ Terug de wereld in</button>`:'')
           +`<button class="bigbtn dex" onclick="go('league')">🏆 Gyms</button>`;
  } else {
    txt=t?`<b>${t.name}</b> was te sterk. Train wat, vang sterkere widrmon en kom terug. 😤`:`Je team ging onderuit. 😤`;
    actions=(fromWorld
        ? `<button class="bigbtn gym" onclick="enterWorld()">🗺️ Terug de wereld in</button>`
        : `<button class="bigbtn battle" onclick="rematch()">🔁 Opnieuw</button>`
          +(WORLD_STATE.started?`<button class="bigbtn gym" onclick="enterWorld()">🗺️ Wereld</button>`:`<button class="bigbtn gym" onclick="go('league')">🏆 Gyms</button>`));
  }
  document.getElementById('result-text').innerHTML=txt;
  document.getElementById('result-actions').innerHTML=actions;
  res.classList.add('show');
}
function rematch(){ openTeamBuilder(); }

/* ============ ATTACK FX (gedeeld door 1v1 en 2v2) ============ */
function fxLunge(el, towardEl, k){
  if(!el) return; if(k==null) k=0.32;
  if(towardEl){
    const a=el.getBoundingClientRect(), b=towardEl.getBoundingClientRect();
    el.style.setProperty('--lx', ((b.left-a.left)*k)+'px');
    el.style.setProperty('--ly', ((b.top-a.top)*k)+'px');
  } else { el.style.setProperty('--lx','0px'); el.style.setProperty('--ly','0px'); }
  el.classList.remove('lunge'); void el.offsetWidth; el.classList.add('lunge');
  setTimeout(()=>el.classList.remove('lunge'),360);
}
/* welk soort animatie hoort bij een move */
function moveFxStyle(move){
  if(move.cat==='status') return 'status';
  const beam=['Water','Electric','Ice','Psychic','Dragon','Grass'];
  const proj=['Fire','Poison','Ghost','Fairy','Dark'];
  if(beam.indexOf(move.t)>=0) return 'beam';
  if(proj.indexOf(move.t)>=0) return 'projectile';
  return 'contact';   // Normal, Fighting, Rock, Ground, Steel, Bug, Flying
}
/* speelt de juiste aanvals-animatie; damage/impact volgt los ~270ms later */
function fxAttackVisual(attEl, targetEls, move){
  const color=(TYPE_META[move.t]||{}).c||'#fff';
  const style=moveFxStyle(move);
  const first=targetEls&&targetEls[0];
  if(style==='contact'){ fxLunge(attEl, first, 0.72); if(first) setTimeout(()=>fxSlash(first),210); }
  else if(style==='beam'){ fxLunge(attEl, first, 0.10); targetEls.forEach(t=>t&&fxBeam(attEl,t,color)); }
  else if(style==='projectile'){ fxLunge(attEl, first, 0.22); targetEls.forEach(t=>t&&fxProjectile(attEl,t,color)); }
  else { fxLunge(attEl, first, 0.10); fxSwirl(first||attEl, color, move.t==='Psychic'||move.t==='Ghost'); }
}
function fxBeam(fromEl,toEl,color){
  if(!fromEl||!toEl) return; const arena=fromEl.closest('.arena'); if(!arena) return;
  const ar=arena.getBoundingClientRect(), a=fromEl.getBoundingClientRect(), b=toEl.getBoundingClientRect();
  const x0=a.left+a.width/2-ar.left, y0=a.top+a.height/2-ar.top;
  const x1=b.left+b.width/2-ar.left, y1=b.top+b.height/2-ar.top;
  const dx=x1-x0, dy=y1-y0, len=Math.hypot(dx,dy), ang=Math.atan2(dy,dx)*180/Math.PI;
  const beam=document.createElement('div'); beam.className='fx-beam';
  beam.style.left=x0+'px'; beam.style.top=y0+'px'; beam.style.width='0px';
  beam.style.background=`linear-gradient(90deg, ${color}00, ${color}, #fff)`;
  beam.style.boxShadow=`0 0 14px 4px ${color}`;
  beam.style.transform=`rotate(${ang}deg)`;
  arena.appendChild(beam);
  requestAnimationFrame(()=>{ beam.style.width=len+'px'; });
  setTimeout(()=>{ beam.style.opacity='0'; },300);
  setTimeout(()=>beam.remove(),500);
}
function fxSwirl(el,color,alt){
  if(!el) return; const arena=el.closest('.arena'); if(!arena) return;
  const ar=arena.getBoundingClientRect(), b=el.getBoundingClientRect();
  const cx=b.left+b.width/2-ar.left, cy=b.top+b.height/2-ar.top;
  const glyphs=alt?['❓','❔','💫']:['✦','✧','⋆','✦'];
  const n=7;
  for(let i=0;i<n;i++){ const p=document.createElement('div'); p.className='fx-swirl';
    p.textContent=glyphs[i%glyphs.length]; p.style.color=color;
    p.style.left=cx+'px'; p.style.top=cy+'px';
    p.style.setProperty('--sr', (16+(i%3)*10)+'px'); p.style.setProperty('--sa', (i*(360/n))+'deg');
    p.style.animationDelay=(i*0.05)+'s';
    arena.appendChild(p); setTimeout(()=>p.remove(),780+i*50);
  }
}
function fxSlash(el){
  if(!el) return; const arena=el.closest('.arena'); if(!arena) return;
  const ar=arena.getBoundingClientRect(), b=el.getBoundingClientRect();
  const s=document.createElement('div'); s.className='fx-slash'; s.textContent='💢';
  s.style.left=(b.left+b.width/2-ar.left)+'px'; s.style.top=(b.top+b.height/2-ar.top)+'px';
  arena.appendChild(s); setTimeout(()=>s.remove(),420);
}
function fxProjectile(fromEl,toEl,color){
  if(!fromEl||!toEl) return;
  const arena=fromEl.closest('.arena'); if(!arena) return;
  const ar=arena.getBoundingClientRect(), a=fromEl.getBoundingClientRect(), b=toEl.getBoundingClientRect();
  const orb=document.createElement('div'); orb.className='fx-orb';
  orb.style.background=color; orb.style.boxShadow=`0 0 14px 5px ${color}`;
  const x0=a.left+a.width/2-ar.left, y0=a.top+a.height/2-ar.top;
  const x1=b.left+b.width/2-ar.left, y1=b.top+b.height/2-ar.top;
  orb.style.left=x0+'px'; orb.style.top=y0+'px';
  arena.appendChild(orb);
  requestAnimationFrame(()=>{ orb.style.transform=`translate(${x1-x0}px,${y1-y0}px)`; });
  setTimeout(()=>orb.remove(),300);
}
function fxBurst(el,color){
  if(!el) return; const arena=el.closest('.arena'); if(!arena) return;
  const ar=arena.getBoundingClientRect(), b=el.getBoundingClientRect();
  const cx=b.left+b.width/2-ar.left, cy=b.top+b.height/2-ar.top;
  const ring=document.createElement('div'); ring.className='fx-ring'; ring.style.borderColor=color;
  ring.style.left=cx+'px'; ring.style.top=cy+'px'; arena.appendChild(ring);
  setTimeout(()=>ring.remove(),430);
  for(let i=0;i<6;i++){ const p=document.createElement('div'); p.className='fx-burst'; p.style.background=color;
    const ang=(Math.PI*2/6)*i, d=26; p.style.left=cx+'px'; p.style.top=cy+'px';
    p.style.setProperty('--px',Math.cos(ang)*d+'px'); p.style.setProperty('--py',Math.sin(ang)*d+'px');
    arena.appendChild(p); setTimeout(()=>p.remove(),450); }
}
function fxDamageNum(el,dmg,crit){
  if(!el||dmg<=0) return; const arena=el.closest('.arena'); if(!arena) return;
  const ar=arena.getBoundingClientRect(), b=el.getBoundingClientRect();
  const d=document.createElement('div'); d.className='fx-dmg'+(crit?' crit':'');
  d.textContent='-'+dmg;
  d.style.left=(b.left+b.width/2-ar.left)+'px'; d.style.top=(b.top-ar.top+4)+'px';
  arena.appendChild(d); setTimeout(()=>d.remove(),1000);
}

/* ============ DUBBELGEVECHT-ENGINE (echte 2v2) ============ */
let DB=null;
function dblFighter(side,slot){ const idx=(side==='p'?DB.pAct:DB.eAct)[slot]; const team=side==='p'?DB.pTeam:DB.eTeam; return idx>=0?team[idx]:null; }
function dblSlots(side){ return side==='p'?DB.pSlots:DB.eSlots; }
function dblSpriteId(side,slot){ return `d-${side}${slot}`; }
function dblActiveList(side){ const out=[]; for(let s=0;s<dblSlots(side);s++){ const f=dblFighter(side,s); if(f) out.push(f);} return out; }
function dblAliveSlots(side){ const out=[]; for(let s=0;s<dblSlots(side);s++){ const f=dblFighter(side,s); if(f&&f.curhp>0) out.push({slot:s,f}); } return out; }
function dblSlotOf(side,f){ for(let s=0;s<dblSlots(side);s++){ if(dblFighter(side,s)===f) return s; } return -1; }
function dblBench(side){ const team=side==='p'?DB.pTeam:DB.eTeam, act=side==='p'?DB.pAct:DB.eAct; return team.map((f,i)=>i).filter(i=>team[i].curhp>0 && act.indexOf(i)<0); }

function buildDouble(pSpecs,eSpecs,info){
  if(pSpecs.length<2 || eSpecs.length<2){ const inf=Object.assign({},info); delete inf.double; return buildSingle(pSpecs,eSpecs,inf); }
  go('battle'); setBattleMode('double'); setBattleScene(); playBattleIntro(info);
  DB={ pTeam:pSpecs.map(mkFighter), eTeam:eSpecs.map(mkFighter),
       pAct:[0,1], eAct:[0,1], pSlots:2, eSlots:2,
       over:false, lock:false, info, queue:[], choose:[], ci:0, curMove:null };
  document.getElementById('result').classList.remove('show');
  document.getElementById('log').innerHTML='';
  document.getElementById('dbl-flee').style.display = info.wild ? '' : 'none';
  logMsg(`⚔️⚔️ <b>DUBBELGEVECHT!</b> Twee tegen twee!`,'sw');
  if(info.wild) logMsg(`Twee wilde widrmon vielen tegelijk aan! (vangen kan hier niet — versla ze of vlucht) 🌾🌾`,'sw');
  else { const foe=info.trainer?`${info.trainer.e} ${info.trainer.name}`:'je rivaal'; logMsg(`<b>${foe}</b> stuurt twee widrmon het veld in!`,'sw'); }
  dblRenderSlots();
  dblActiveList('p').forEach(f=>dblOnEnter(f,'p'));
  dblActiveList('e').forEach(f=>dblOnEnter(f,'e'));
  setTimeout(dblStartRound,300);
}
function dblOnEnter(f,side){
  if(f && f.ability==='intimidate'){ const foe=side==='p'?'e':'p'; const foes=dblAliveSlots(foe); if(foes.length){ foes.forEach(({f:g})=>applyStat(g,'atk',-1,foe)); logMsg(`${f.n}'s Intimidatie verlaagt de aanval van de tegenstanders! 😠`,'eff'); } }
}
function dblSpriteHTML(side,s,f){
  if(!f) return `<div class="sprite" id="${dblSpriteId(side,s)}" style="opacity:.12"></div>`;
  return `<div class="sprite ${side==='e'?'enemy-s':''}" id="${dblSpriteId(side,s)}" style="background:transparent">${monImg(byName(f.sp),'90%')}</div>`;
}
function dblRenderSlots(){
  ['e','p'].forEach(side=>{
    const host=document.getElementById(side==='e'?'d-eslots':'d-pslots');
    let html='';
    for(let s=0;s<dblSlots(side);s++){
      const f=dblFighter(side,s);
      const gone=!f||f.curhp<=0;
      const types=f?f.t.map(t=>`<span class="tbadge" style="background:${TYPE_META[t].c};font-size:8px;padding:1px 5px">${TYPE_META[t].e}</span>`).join(''):'';
      const pct=f?Math.max(0,f.curhp/f.maxhp*100):0;
      const bg=pct>50?'#4caf50':pct>22?'#f7a20d':'#e3350d';
      html+=`<div class="dslot ${gone?'gone':''}" id="dslot-${side}${s}">
        ${side==='e'?dblSpriteHTML(side,s,f):''}
        <div class="dhp">
          <div class="dn"><span>${f?f.n:'—'}</span><span>${f?'Lv'+f.lvl:''}</span></div>
          <div style="display:flex;gap:3px;margin:1px 0;min-height:12px">${types}${f&&f.status?statusChip(f.status):''}</div>
          <div class="hp-track"><div class="hp-fill" id="dhp-${side}${s}" style="width:${pct}%;background:${bg}"></div></div>
          <div class="dnum" id="dnum-${side}${s}">${f?Math.max(0,Math.ceil(f.curhp))+' / '+f.maxhp:'KO'}</div>
        </div>
        ${side==='p'?dblSpriteHTML(side,s,f):''}
      </div>`;
    }
    host.innerHTML=html;
  });
}
function dblUpdateHP(side,slot){
  const f=dblFighter(side,slot); if(!f) return;
  const pct=Math.max(0,f.curhp/f.maxhp*100);
  const bar=document.getElementById(`dhp-${side}${slot}`);
  if(bar){ bar.style.width=pct+'%'; bar.style.background=pct>50?'#4caf50':pct>22?'#f7a20d':'#e3350d'; }
  const n=document.getElementById(`dnum-${side}${slot}`); if(n) n.textContent=Math.max(0,Math.ceil(f.curhp))+' / '+f.maxhp;
}
/* ---- ronde: speler kiest per actieve slot ---- */
function dblStartRound(){
  if(DB.over) return;
  DB.queue=[]; DB.lock=false; DB.curMove=null;
  dblRenderSlots();
  DB.choose = dblAliveSlots('p').map(o=>o.slot);
  DB.ci=0;
  if(DB.choose.length===0){ dblCheckEnd(); return; }
  dblPromptSlot();
}
function dblPromptSlot(){
  document.querySelectorAll('.dslot.acting').forEach(e=>e.classList.remove('acting'));
  dblClearTargetUI();
  const slot=DB.choose[DB.ci]; const f=dblFighter('p',slot);
  const el=document.getElementById(`dslot-p${slot}`); if(el) el.classList.add('acting');
  document.getElementById('dbl-prompt').innerHTML=`Kies een actie voor <b>${f.n}</b> &nbsp;(${DB.ci+1}/${DB.choose.length})`;
  const host=document.getElementById('dbl-moves');
  host.style.display='';
  host.innerHTML=f.moves.map((mv,i)=>`
    <button class="mvbtn" onclick="dblPickMove(${slot},${i})">
      <span class="mn">${mv.n}</span>
      <span class="mmeta" style="background:${TYPE_META[mv.t].c}">${TYPE_META[mv.t].e} ${mv.t}</span>
      <span class="mmeta" style="background:#151321"> ${mv.cat==='status'?'STATUS':'PWR '+mv.p} · ${moveAccuracy(mv)}%${mv.spread?' · SPREAD':''}</span>
    </button>`).join('');
}
function dblPickMove(slot,mi){
  if(DB.lock) return;
  const f=dblFighter('p',slot); const mv=f.moves[mi];
  DB.curMove={slot,mi,mv};
  const foes=dblAliveSlots('e');
  if(mv.cat==='status'){
    const a=mv.act||{};
    if(a.status || (a.stat && a.target!=='self')){ if(foes.length>1){ dblShowTargets(); return; } return dblQueuePlayer(slot,mi,{side:'e',slot:(foes[0]?foes[0].slot:0)}); }
    return dblQueuePlayer(slot,mi,{side:'p',slot});
  }
  if(mv.spread) return dblQueuePlayer(slot,mi,{spread:true});
  if(foes.length>1){ dblShowTargets(); return; }
  dblQueuePlayer(slot,mi,{side:'e',slot:(foes[0]?foes[0].slot:0)});
}
function dblShowTargets(){
  const foes=dblAliveSlots('e');
  const f=dblFighter('p',DB.curMove.slot);
  document.getElementById('dbl-moves').style.display='none';
  document.getElementById('dbl-prompt').innerHTML=`<b>${f.n}</b> → 🎯 kies wie je aanvalt (klik een tegenstander of knop)`;
  const box=document.getElementById('dbl-targets');
  box.style.display='flex';
  box.innerHTML=foes.map(o=>`<button class="tgtbtn" onclick="dblChooseTarget(${o.slot})"><span class="se">${o.f.e}</span> ${o.f.n} <span style="opacity:.85;font-size:10px">${Math.ceil(o.f.curhp)} HP</span></button>`).join('')+
    `<button class="tgtbtn" style="background:#8a8a8a" onclick="dblCancelTarget()">↩ Andere zet</button>`;
  foes.forEach(o=>{ const el=document.getElementById(`dslot-e${o.slot}`); if(el){ el.classList.add('target-pick'); el.onclick=()=>dblChooseTarget(o.slot); } });
}
function dblClearTargetUI(){
  document.querySelectorAll('.dslot.target-pick').forEach(e=>{ e.classList.remove('target-pick'); e.onclick=null; });
  const box=document.getElementById('dbl-targets'); box.style.display='none'; box.innerHTML='';
  document.getElementById('dbl-moves').style.display='';
}
function dblChooseTarget(slot){
  const c=DB.curMove; if(!c) return;
  const tf=dblFighter('e',slot); if(!tf || tf.curhp<=0) return;   // negeer klikken op een gevelde/lege slot
  dblClearTargetUI();
  dblQueuePlayer(c.slot,c.mi,{side:'e',slot});
}
function dblCancelTarget(){ dblClearTargetUI(); dblPromptSlot(); }
function dblQueuePlayer(slot,mi,target){
  DB.queue.push({side:'p',slot,mi,target});
  DB.ci++;
  if(DB.ci>=DB.choose.length) dblEnemyChoose();
  else dblPromptSlot();
}
function dblEnemyChoose(){
  dblAliveSlots('e').forEach(({slot})=>{
    const e=dblFighter('e',slot); if(!e) return;
    const foes=dblAliveSlots('p'); if(!foes.length) return;
    let best=0,bestScore=-1;
    e.moves.forEach((mv,i)=>{
      let score;
      if(mv.cat==='status'){ score=25*(0.7+Math.random()*0.6); if(mv.act&&mv.act.heal&&e.curhp<e.maxhp*0.4&&e.healsLeft>0) score=120; }
      else { let mx=0; foes.forEach(({f:p})=>{ const stab=e.t.includes(mv.t)?1.5:1; const s=mv.p*effMult(mv.t,p.t)*stab; if(s>mx)mx=s; }); score=mx*(0.8+Math.random()*0.4); }
      if(score>bestScore){bestScore=score;best=i;}
    });
    const mv=e.moves[best]; let target;
    if(mv.spread) target={spread:true};
    else if(mv.cat==='status'){ const a=mv.act||{}; target=(a.status||(a.stat&&a.target!=='self'))?{side:'p',slot:foes[0].slot}:{side:'e',slot}; }
    else { let bt=foes[0].slot,bv=-1; foes.forEach(({slot:ps,f:p})=>{ const stab=e.t.includes(mv.t)?1.5:1; const v=mv.p*effMult(mv.t,p.t)*stab*(1.25-p.curhp/p.maxhp); if(v>bv){bv=v;bt=ps;} }); target={side:'p',slot:bt}; }
    DB.queue.push({side:'e',slot,mi:best,target});
  });
  dblResolve();
}
function dblResolve(){
  DB.lock=true;
  document.getElementById('dbl-prompt').innerHTML='⚔️ Gevecht!';
  document.getElementById('dbl-moves').innerHTML='';
  document.getElementById('dbl-targets').style.display='none';
  document.querySelectorAll('.dslot.acting').forEach(e=>e.classList.remove('acting'));
  const acts=DB.queue.slice().map(a=>{ const f=dblFighter(a.side,a.slot); a._spd=f?effSpd(f):0; return a; });
  acts.sort((x,y)=> (y._spd-x._spd) || (Math.random()-0.5));
  dblRunQueue(acts,0);
}
function dblCanAct(f){
  if(f.status==='freeze'){ if(Math.random()<0.2){ f.status=null; logMsg(`${f.n} ontdooit!`,'eff'); } else { logMsg(`${f.n} is bevroren! 🧊`,'eff'); return false; } }
  if(f.status==='sleep'){ if(f.sleepCtr<=0){ f.status=null; logMsg(`${f.n} wordt wakker!`,'eff'); } else { f.sleepCtr--; logMsg(`${f.n} slaapt... 😴`,'eff'); return false; } }
  if(f.status==='para' && Math.random()<0.25){ logMsg(`${f.n} is verlamd en kan niet bewegen! ⚡`,'eff'); return false; }
  if(f.flinch){ logMsg(`${f.n} deinsde terug!`,'eff'); return false; }
  return true;
}
function dblApplyStatusMove(att,def,attSide,defSide,move){
  const a=move.act||{};
  if(a.heal){ if(att.healsLeft<=0){ logMsg(`${att.n} kan niet meer herstellen! 💤`,'eff'); } else { att.healsLeft--; const h=Math.round(att.maxhp*a.heal); att.curhp=Math.min(att.maxhp,att.curhp+h); logMsg(`${att.n} herstelt ${h} HP! 💚`,'eff'); const s=dblSlotOf(attSide,att); if(s>=0)dblUpdateHP(attSide,s); } }
  if(a.stat){ const self=a.target==='self'; applyStat(self?att:def, a.stat, a.stage, self?attSide:defSide); }
  if(a.status && def){ if(canGetStatus(def,a.status)){ def.status=a.status; if(a.status==='sleep')def.sleepCtr=1+Math.floor(Math.random()*3); logMsg(`${def.n} ${statusVerb(a.status)}`,'eff'); } else logMsg('Maar het faalde...','eff'); }
}
function dblApplySecondary(att,def,attSide,defSide,move,dmg){
  const e=move.eff;
  if(e && e.recoil){ const rc=Math.max(1,Math.round(dmg*e.recoil)); att.curhp=Math.max(0,att.curhp-rc); logMsg(`${att.n} krijgt ${rc} recoil-schade.`,'eff'); const as=dblSlotOf(attSide,att); if(as>=0)dblUpdateHP(attSide,as); }
  if(att.held==='levensbol' && att.curhp>0){ const rc=Math.max(1,Math.round(att.maxhp*0.1)); att.curhp=Math.max(0,att.curhp-rc); logMsg(`${att.n} voelt de Levensbol terugslaan (−${rc} HP). 🔮`,'eff'); const as=dblSlotOf(attSide,att); if(as>=0)dblUpdateHP(attSide,as); }
  if(att.ability==='vamp' && att.curhp>0){ const h=Math.max(1,Math.round(dmg*0.25)); att.curhp=Math.min(att.maxhp,att.curhp+h); logMsg(`${att.n} zuigt ${h} HP terug! 🧛`,'eff'); const as=dblSlotOf(attSide,att); if(as>=0)dblUpdateHP(attSide,as); }
  if(def.curhp<=0) return;
  if(e){
    if(e.status && Math.random()<e.chance && canGetStatus(def,e.status)){ def.status=e.status; if(e.status==='sleep')def.sleepCtr=1+Math.floor(Math.random()*3); logMsg(`${def.n} ${statusVerb(e.status)}`,'eff'); }
    if(e.flinch && Math.random()<e.flinch && def.ability!=='hardhead'){ def.flinch=true; }
    if(e.stat && Math.random()<e.chance){ const self=e.target==='self'; applyStat(self?att:def, e.stat, e.stage, self?attSide:defSide); }
  }
}
function dblRunQueue(acts,k){
  if(DB.over) return;
  if(k>=acts.length){ setTimeout(dblResidual,400); return; }
  const a=acts[k];
  const att=dblFighter(a.side,a.slot);
  if(!att || att.curhp<=0){ dblRunQueue(acts,k+1); return; }
  const attSide=a.side, defSide=a.side==='p'?'e':'p';
  const move=att.moves[a.mi];
  if(!dblCanAct(att)){ setTimeout(()=>dblRunQueue(acts,k+1),650); return; }
  logMsg(`<b>${att.n}</b> gebruikt <b>${move.n}</b>!`);
  const attEl=document.getElementById(dblSpriteId(attSide,a.slot));
  // status-zet
  if(move.cat==='status'){
    let def=null, dSlot=null;
    if(a.target && a.target.side==='e' && attSide==='p'){ def=dblFighter('e',a.target.slot); if(!def||def.curhp<=0){ const al=dblAliveSlots('e'); def=al.length?al[0].f:null; } }
    else if(a.target && a.target.side==='p' && attSide==='e'){ def=dblFighter('p',a.target.slot); if(!def||def.curhp<=0){ const al=dblAliveSlots('p'); def=al.length?al[0].f:null; } }
    fxAttackVisual(attEl, def?[document.getElementById(dblSpriteId(defSide,dblSlotOf(defSide,def)))]:[], move);
    setTimeout(()=>{ dblApplyStatusMove(att,def,attSide,defSide,move); dblRefreshStatus(); setTimeout(()=>dblRunQueue(acts,k+1),620); },260);
    return;
  }
  // aanval: bepaal doelwitten
  let targets=[];
  if(move.spread){ targets=dblAliveSlots(defSide).map(o=>o.f); }
  else { let tf=(a.target&&a.target.side===defSide)?dblFighter(defSide,a.target.slot):null; if(!tf||tf.curhp<=0){ const al=dblAliveSlots(defSide); tf=al.length?al[0].f:null; } if(tf) targets=[tf]; }
  const firstSlot = targets.length?dblSlotOf(defSide,targets[0]):0;
  const firstEl = document.getElementById(dblSpriteId(defSide,firstSlot));
  if(!targets.length){ fxLunge(attEl, firstEl, 0.3); logMsg('...maar er was geen doelwit meer! 💨','eff'); setTimeout(()=>dblRunQueue(acts,k+1),480); return; }
  if(Math.random()*100 >= effAccuracy(att,move)){ fxLunge(attEl, firstEl, 0.4); setTimeout(()=>{ logMsg(`${att.n}'s aanval miste! 💨`,'eff'); setTimeout(()=>dblRunQueue(acts,k+1),540); },220); return; }
  const clr=(TYPE_META[move.t]||{}).c||'#fff';
  const targetEls=targets.map(tf=>document.getElementById(dblSpriteId(defSide,dblSlotOf(defSide,tf))));
  fxAttackVisual(attEl, targetEls, move);
  setTimeout(()=>{
    targets.forEach((tf,idx)=>{
      if(tf.curhp<=0) return;
      const ts=dblSlotOf(defSide,tf);
      if(tf.status==='freeze' && move.t==='Fire'){ tf.status=null; logMsg(`${tf.n} ontdooit door het vuur!`,'eff'); }
      const r=calcDmg(att,tf,move);
      let dmg=r.dmg; if(move.spread && targets.length>1) dmg=Math.max(1,Math.round(dmg*0.75));
      tf.curhp=Math.max(0,tf.curhp-dmg);
      const dsp=document.getElementById(dblSpriteId(defSide,ts));
      if(dsp){ dsp.classList.add('hit'); setTimeout(()=>dsp.classList.remove('hit'),420); }
      fxBurst(dsp,clr); if(r.eff!==0) fxDamageNum(dsp,dmg,r.crit);
      if(idx===0){ if(r.crit) logMsg('Een kritieke treffer!','crit'); const [w,c]=effWord(r.eff); if(w)logMsg(w,c); }
      if(r.eff!==0) logMsg(`${tf.n} verliest ${dmg} HP.`);
      dblUpdateHP(defSide,ts);
      if(r.eff!==0 && !move.spread) dblApplySecondary(att,tf,attSide,defSide,move,dmg);
      if(move.chroma && r.eff!==0){ (att.chromaHit=att.chromaHit||new Set()).add(tf); logMsg(`🌈 ${att.n} markeert <b>${tf.n}</b> met Chroma Claw — Psychic/Rock tegen deze mon!`,'eff'); }
    });
    dblRefreshStatus();
    setTimeout(()=>dblRunQueue(acts,k+1),560);
  },270);
}
/* alleen status-chips bijwerken zonder sprites te herbouwen */
function dblRefreshStatus(){
  ['e','p'].forEach(side=>{ for(let s=0;s<dblSlots(side);s++){ const f=dblFighter(side,s); const box=document.getElementById(`dslot-${side}${s}`); if(!box) continue; const line=box.querySelector('.dhp > div:nth-child(2)'); if(line && f){ const types=f.t.map(t=>`<span class="tbadge" style="background:${TYPE_META[t].c};font-size:8px;padding:1px 5px">${TYPE_META[t].e}</span>`).join(''); line.innerHTML=types+(f.status?statusChip(f.status):''); } } });
}
function dblResidual(){
  if(DB.over) return;
  dblActiveList('p').forEach(f=>f.flinch=false); dblActiveList('e').forEach(f=>f.flinch=false);
  const all=[]; ['e','p'].forEach(side=>{ for(let s=0;s<dblSlots(side);s++){ const f=dblFighter(side,s); if(f&&f.curhp>0) all.push({side,slot:s,f}); } });
  all.forEach(({side,slot,f})=>{
    if(f.ability==='regen' && f.curhp<f.maxhp){ const h=Math.max(1,Math.floor(f.maxhp/16)); f.curhp=Math.min(f.maxhp,f.curhp+h); logMsg(`${f.n} herstelt ${h} HP (Regeneratie). 🌱`,'eff'); dblUpdateHP(side,slot); }
    if(f.held==='restjes' && f.curhp<f.maxhp){ const h=Math.max(1,Math.floor(f.maxhp/16)); f.curhp=Math.min(f.maxhp,f.curhp+h); logMsg(`${f.n} herstelt ${h} HP (Restjes). 🍎`,'eff'); dblUpdateHP(side,slot); }
    if(f.status==='burn'||f.status==='poison'){ const dmg=Math.max(1,Math.floor(f.maxhp/(f.status==='burn'?16:8))); f.curhp=Math.max(0,f.curhp-dmg); logMsg(`${f.n} lijdt ${dmg} schade door ${f.status==='burn'?'verbranding 🔥':'vergif ☠️'}.`,'eff'); dblUpdateHP(side,slot); }
  });
  setTimeout(dblAfterResidual,520);
}
function dblAfterResidual(){
  if(DB.over) return;
  dblMarkFaints();
  if(dblCheckEnd()) return;
  dblFillFaints();
}
function dblMarkFaints(){
  ['e','p'].forEach(side=>{ for(let s=0;s<dblSlots(side);s++){ const f=dblFighter(side,s); const el=document.getElementById(`dslot-${side}${s}`); const sp=document.getElementById(dblSpriteId(side,s));
    if(f&&f.curhp<=0&&el&&!el.classList.contains('gone')){ el.classList.add('gone'); if(sp) sp.classList.add('faint'); logMsg(`<b>${f.n}</b> ging knock-out!`,'crit'); } } });
}
function dblCheckEnd(){
  const pAlive=DB.pTeam.some(f=>f.curhp>0), eAlive=DB.eTeam.some(f=>f.curhp>0);
  if(!eAlive){ DB.over=true; setTimeout(()=>dblFinish(true),750); return true; }
  if(!pAlive){ DB.over=true; setTimeout(()=>dblFinish(false),750); return true; }
  return false;
}
function dblFillFaints(){
  for(let s=0;s<DB.eSlots;s++){ const f=dblFighter('e',s); if(!f||f.curhp<=0){ const cand=dblBench('e'); if(cand.length){ DB.eAct[s]=cand[0]; logMsg(`Tegenstander stuurt <b>${DB.eTeam[cand[0]].n}</b>! ⚔️`,'sw'); dblOnEnter(DB.eTeam[cand[0]],'e'); } else { DB.eAct[s]=-1; } } }
  const need=[]; for(let s=0;s<DB.pSlots;s++){ const f=dblFighter('p',s); if(!f||f.curhp<=0) need.push(s); }
  dblRenderSlots();
  if(need.length && dblBench('p').length){ dblPromptReplace(need,0); return; }
  need.forEach(s=>{ DB.pAct[s]=-1; });
  dblRenderSlots();
  setTimeout(dblStartRound,450);
}
function dblPromptReplace(slots,idx){
  if(idx>=slots.length){ dblRenderSlots(); setTimeout(dblStartRound,350); return; }
  const slot=slots[idx];
  const bench=dblBench('p');
  if(!bench.length){ DB.pAct[slot]=-1; return dblPromptReplace(slots,idx+1); }
  document.getElementById('dbl-prompt').innerHTML=`<span class="must-switch">Kies een vervanger! (${idx+1}/${slots.length})</span>`;
  document.getElementById('dbl-moves').innerHTML='';
  const box=document.getElementById('dbl-targets'); box.style.display='flex';
  box.innerHTML=bench.map(bi=>{ const f=DB.pTeam[bi]; return `<button class="tgtbtn" style="background:#2f9e44" onclick="dblDoReplace(${slot},${bi},[${slots.join(',')}],${idx})"><span class="se">${f.e}</span> ${f.n} (${Math.ceil(f.curhp)} HP)</button>`; }).join('');
}
function dblDoReplace(slot,bi,slots,idx){
  DB.pAct[slot]=bi; document.getElementById('dbl-targets').style.display='none';
  const f=DB.pTeam[bi]; f.stages={atk:0,def:0,spd:0}; f.flinch=false;
  dblRenderSlots(); logMsg(`Go, <b>${f.n}</b>! ⚡`,'sw'); dblOnEnter(f,'p');
  dblPromptReplace(slots,idx+1);
}
function dblFlee(){
  if(!DB||DB.over) return;
  logMsg('Je ontsnapt uit het dubbelgevecht! 🏃','sw');
  DB.over=true; setTimeout(()=>enterWorld(),500);
}
function dblFinish(playerWon){
  const firstAlive=DB.pTeam.findIndex(f=>f.curhp>0);
  const info=DB.info, pTeam=DB.pTeam, eTeam=DB.eTeam;
  document.getElementById('dbl-controls').style.display='none';
  B={ pTeam, eTeam, pAct:firstAlive<0?0:firstAlive, eAct:0, info, over:true, turnLock:true, awaitingSwitch:false };
  DB=null;
  endBattle(playerWon);
}

/* ============ INIT ============ */
(function init(){
  buildDexTypeChips();
  document.getElementById('title-stats').textContent=
    `${MON.length} widrmon • ${[...new Set(MON.flatMap(m=>m.t))].length} types • 8 gyms + Elite Four + Champion`;
  renderPicker();
  loadProgress();
  renderDex();
})();
