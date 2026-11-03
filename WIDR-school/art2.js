// ---------- CHARACTER ART v2: anime / visual-novel style ----------
// Drawn on top of the original body shapes, with tapered hair clumps, big shaded eyes, a soft pointed jaw,
// gradient shading on hair, skin and clothes, and a neck that joins the shoulders properly.
let PUID=0;
function shade(hex,amt){
  const n=parseInt(hex.slice(1),16), r=n>>16, g=(n>>8)&255, b=n&255;
  const f=v=>Math.max(0,Math.min(255,Math.round(amt<0? v*(1+amt) : v+(255-v)*amt)));
  return '#'+((1<<24)+(f(r)<<16)+(f(g)<<8)+f(b)).toString(16).slice(1);
}
const LW='stroke="#2b2340" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"';

// One tapered clump of hair from (xa..xb, base) to a point at (tx, ty).
function clump(xa,xb,base,tx,ty){
  const mid=base+(ty-base)*0.45;
  return `M${xa.toFixed(1)} ${base} C${xa.toFixed(1)} ${mid.toFixed(1)} ${(tx-5).toFixed(1)} ${(ty-12).toFixed(1)} ${tx.toFixed(1)} ${ty.toFixed(1)} C${(tx+5).toFixed(1)} ${(ty-12).toFixed(1)} ${xb.toFixed(1)} ${mid.toFixed(1)} ${xb.toFixed(1)} ${base} Z`;
}
// A row of clumps across the forehead. sway shifts the tips sideways (side-swept bangs).
function bangs(w,base,tip,n,sway,jag,seed){
  let d=''; const x0=150-w-4, x1=150+w+4, step=(x1-x0)/n;
  for(let i=0;i<n;i++){
    const xa=x0+i*step-3, xb=x0+(i+1)*step+3, wob=((i*37+seed)%7)-3;
    d+=clump(xa,xb,base,(xa+xb)/2+sway+wob*0.6, tip-(i%2?0:jag)+wob);
  }
  return d;
}
function crown(w,top,base,side){
  return `M${150-w-side} ${base+30} C${150-w-side-4} ${top+30} ${150-w*0.55} ${top} 150 ${top} C${150+w*0.55} ${top} ${150+w+side+4} ${top+30} ${150+w+side} ${base+30} L${150+w+side} ${base} L${150-w-side} ${base} Z`;
}
function hairDefs(c,id){
  return `<linearGradient id="hg${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(c.hair,.22)}"/><stop offset=".55" stop-color="${c.hair}"/><stop offset="1" stop-color="${shade(c.hair,-.32)}"/></linearGradient>`;
}
function hairBack2(c,form,id){
  const w=56*c.fw, F=`fill="url(#hg${id})" ${LW}`, dk=shade(c.hair,-.25);
  if(c.hs==='curly'){
    let s=`<ellipse cx="150" cy="150" rx="${w+16}" ry="80" fill="${dk}" ${LW}/>`;
    for(let a=160;a<=380;a+=15){const t=a*Math.PI/180; s+=`<circle cx="${(150+Math.cos(t)*(w+12)).toFixed(1)}" cy="${(160+Math.sin(t)*(w+12)).toFixed(1)}" r="22" fill="url(#hg${id})" ${LW}/>`;}
    if(form==='girl'){ s+=`<path d="M${150-w-34} 200 C${150-w-40} 300 ${150-w-20} 360 ${150-w+10} 372 L${150+w-10} 372 C${150+w+20} 360 ${150+w+40} 300 ${150+w+34} 200 Z" fill="${dk}" ${LW}/>`;
      for(let y=210;y<=360;y+=24){s+=`<circle cx="${150-w-18}" cy="${y}" r="20" fill="url(#hg${id})" ${LW}/><circle cx="${150+w+18}" cy="${y}" r="20" fill="url(#hg${id})" ${LW}/>`;} }
    return s;
  }
  const tipsRow=(y,n,len)=>{ let d=''; const x0=150-w-16, x1=150+w+16, st=(x1-x0)/n; for(let i=0;i<n;i++) d+=clump(x0+i*st-2,x0+(i+1)*st+2,y-len,x0+(i+.5)*st,y+(i%2?6:0)); return d; };
  if(c.hs==='down') return `<path d="${crown(w,62,180,14)} ${tipsRow(232,7,50)}" ${F}/>`;
  if(c.hs==='long') return `<path d="${crown(w,66,300,18)} M${150-w-18} 170 L${150+w+18} 170 L${150+w+20} 330 L${150-w-20} 330Z ${tipsRow(408,6,90)}" ${F}/>`;
  if(c.hs==='bob')  return `<path d="${crown(w,68,214,16)} ${tipsRow(262,8,40)}" ${F}/>`;
  if(c.hs==='messy')return `<path d="${crown(w,74,168,12)} ${clump(150-w-10,150-10,110,150-w+4,56)} ${clump(150-30,150+20,104,150-2,44)} ${clump(150+5,150+w+8,110,150+w-2,58)}" ${F}/>`;
  if(c.hs==='fade') return `<path d="M${150-w-2} 170 C${150-w-4} 120 ${150-w+2} 78 150 76 C${150+w-2} 78 ${150+w+4} 120 ${150+w+2} 170 Z" ${F}/>`;
  return `<path d="${crown(w,70,168,10)}" ${F}/>`;
}
function hairFront2(c,form,id){
  const w=56*c.fw, F=`fill="url(#hg${id})" ${LW}`, hi=shade(c.hair,.55);
  const ring=(y)=>`<path d="M${150-w*0.72} ${y+8} Q150 ${y-10} ${150+w*0.72} ${y+8}" stroke="${hi}" stroke-width="6" fill="none" stroke-linecap="round" stroke-dasharray="20 9" opacity=".55"/>`;
  const strands=(y0,y1)=>`<path d="M${150-26} ${y0} L${150-30} ${y1} M${150-4} ${y0-4} L${150-6} ${y1+2} M${150+20} ${y0} L${150+24} ${y1}" stroke="${shade(c.hair,-.4)}" stroke-width="2" fill="none" stroke-linecap="round" opacity=".55"/>`;
  if(c.hs==='curly'){
    let s='';
    for(let i=0;i<6;i++){const x=150-w+14+i*((2*w-28)/5); s+=`<circle cx="${x.toFixed(1)}" cy="${118+(i%2)*8}" r="19" fill="url(#hg${id})" ${LW}/>`;}
    s+=`<circle cx="${150-w+2}" cy="152" r="16" fill="url(#hg${id})" ${LW}/><circle cx="${150+w-2}" cy="152" r="16" fill="url(#hg${id})" ${LW}/>`;
    for(let i=0;i<6;i++){const x=150-w+14+i*((2*w-28)/5); s+=`<path d="M${x-8} ${112+(i%2)*8} q8 -8 16 0" stroke="${hi}" stroke-width="3" fill="none" opacity=".6" stroke-linecap="round"/>`;}
    return s;
  }
  const sides=(y)=>`<path d="${clump(150-w-12,150-w+14,130,150-w-2,y)} ${clump(150+w-14,150+w+12,130,150+w+2,y)}" ${F}/>`;
  if(c.hs==='down'){ const fy=c.fy||162;
    return sides(214)+`<path d="${crown(w,64,118,8)} ${bangs(w,112,fy,7,0,9,3)}" ${F}/>`+strands(110,fy-14)+ring(92); }
  if(c.hs==='long')
    return sides(270)+`<path d="${crown(w,68,116,8)} ${bangs(w,110,162,6,10,8,5)}" ${F}/>`+strands(110,146)+ring(94);
  if(c.hs==='bob')
    return sides(250)+`<path d="${crown(w,70,118,8)} ${bangs(w,112,152,8,0,3,1)}" ${F}/>`+strands(112,142)+ring(96);
  if(c.hs==='messy')
    return `<path d="${crown(w,76,116,6)} ${bangs(w,108,154,5,-6,14,2)}" ${F}/>`+strands(108,140)+ring(98);
  if(c.hs==='fade')
    return `<path d="M${150-w+2} 152 L${150-w+2} 100 C${150-w+10} 82 ${150+w-10} 82 ${150+w-2} 100 L${150+w-2} 152 C${150+24} 132 ${150-24} 132 ${150-w+2} 152Z" ${F}/><path d="M${150-w+12} 100 L${150+w-12} 100 M${150-w+12} 114 L${150+w-12} 114 M${150-w+12} 128 L${150+w-12} 128" stroke="${shade(c.hair,.3)}" stroke-width="2" opacity=".5"/>`;
  return `<path d="${crown(w,72,116,6)} ${bangs(w,108,144,6,4,7,4)}" ${F}/>`+strands(106,132)+ring(96);
}
function eyes2(c,expr,form,id){
  const ex=27*c.fw, y=190, fem=c.fem||form==='girl', iris=c.eye;
  let s=`<defs><linearGradient id="ig${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(iris,-.55)}"/><stop offset=".55" stop-color="${iris}"/><stop offset="1" stop-color="${shade(iris,.45)}"/></linearGradient></defs>`;
  const one=(dx,side)=>{
    const x=150+dx;
    if(expr==='grin'||expr==='happy') return `<path d="M${x-15} ${y+3} Q${x} ${y-13} ${x+15} ${y+3}" stroke="#2b2340" stroke-width="5" fill="none" stroke-linecap="round"/>${fem?`<path d="M${x+side*15} ${y+2} l${side*6} -4" stroke="#2b2340" stroke-width="3" stroke-linecap="round"/>`:''}`;
    const big=expr==='surprised'?1.12:1, ir=expr==='surprised'?.78:1;
    const look = expr==='shy'?[side*-2,4]:[0,0];
    const W=15*big, H=19*big, cid=`ec${id}${side<0?'l':'r'}`;
    const shape=`M${x-W} ${y} C${x-W} ${y-H*1.05} ${x+W} ${y-H*1.05} ${x+W} ${y} C${x+W} ${y+H*.95} ${x-W} ${y+H*.95} ${x-W} ${y} Z`;
    let e=`<clipPath id="${cid}"><path d="${shape}"/></clipPath><path d="${shape}" fill="#fff"/>`;
    e+=`<g clip-path="url(#${cid})"><ellipse cx="${x+look[0]}" cy="${y+3+look[1]}" rx="${11*big*ir}" ry="${15*big*ir}" fill="url(#ig${id})"/><ellipse cx="${x+look[0]}" cy="${y+4+look[1]}" rx="${5*ir}" ry="${7*ir}" fill="#1a1426"/>`
      +`<ellipse cx="${x+4+look[0]}" cy="${y-5+look[1]}" rx="4.5" ry="5.5" fill="#fff"/><circle cx="${x-4+look[0]}" cy="${y+9+look[1]}" r="2.2" fill="#fff" opacity=".9"/>`
      +`<path d="M${x-W} ${y-H*.55} Q${x} ${y-H*.95} ${x+W} ${y-H*.55} L${x+W} ${y-H} L${x-W} ${y-H}Z" fill="${shade(c.skin,-.25)}" opacity=".35"/></g>`;
    // heavy upper lash line, light lower lash
    e+=`<path d="M${x-W-3} ${y+1} C${x-W+2} ${y-H*1.02} ${x+W-2} ${y-H*1.02} ${x+W+3} ${y-3}" stroke="#2b2340" stroke-width="${fem?5.5:4.5}" fill="none" stroke-linecap="round"/>`;
    e+=`<path d="M${x-W*.6} ${y+H*.82} Q${x} ${y+H*.98} ${x+W*.6} ${y+H*.82}" stroke="#2b2340" stroke-width="2" fill="none" stroke-linecap="round" opacity=".6"/>`;
    if(fem) e+=`<path d="M${x+side*(W+2)} ${y-4} l${side*7} -6 M${x+side*(W-2)} ${y-10} l${side*6} -7" stroke="#2b2340" stroke-width="3" stroke-linecap="round"/>`;
    if(expr==='smirk'||expr==='angry') e+=`<path d="M${x-W-4} ${y-H*1.1} L${x+W+4} ${y-H*1.1} L${x+W+4} ${y-H*.35} Q${x} ${y-H*.15} ${x-W-4} ${y-H*.35} Z" fill="${c.skin}"/><path d="M${x-W-3} ${y-H*.32} Q${x} ${y-H*.12} ${x+W+3} ${y-H*.36}" stroke="#2b2340" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
    if(expr==='sad') e+=`<path d="M${x-W*.7} ${y+H} q4 8 0 14" stroke="#8ec5ff" stroke-width="3" fill="none" opacity=".0"/>`;
    return e;
  };
  s+=one(-ex,-1)+one(ex,1);
  // thin tapered brows
  const bc=shade(c.hair,-.2);
  const brow=(dx,side)=>{ const x=150+dx, by=160; let a=0, lift=0;
    if(expr==='angry') a=side*12; else if(expr==='sad'||expr==='shy') a=-side*10; else if(expr==='surprised') lift=-7; else if(expr==='smirk') a=side>0?-6:4;
    return `<path d="M${x-14} ${by+2+lift} Q${x} ${by-5+lift} ${x+14} ${by+1+lift}" stroke="${bc}" stroke-width="4" fill="none" stroke-linecap="round" transform="rotate(${a} ${x} ${by})"/>`; };
  s+=brow(-ex,-1)+brow(ex,1);
  return s;
}
function mouth2(c,expr){
  const L2='#2b2340', open=(d,tongue)=>`<path d="${d}" fill="#7a2d3c" stroke="${L2}" stroke-width="2.5" stroke-linejoin="round"/>${tongue?`<path d="${tongue}" fill="#ff8fa8"/>`:''}`;
  let m;
  switch(expr){
    case 'smile': m=`<path d="M139 230 Q150 238 161 230" stroke="${L2}" stroke-width="3" fill="none" stroke-linecap="round"/>`; break;
    case 'grin': m=open('M136 227 Q150 250 164 227 Z','M142 240 Q150 247 158 240 Q150 236 142 240Z')+`<path d="M138 228 L162 228" stroke="#fff" stroke-width="4"/>`; break;
    case 'happy': m=open('M139 228 Q150 244 161 228 Z','M144 237 Q150 242 156 237Z'); break;
    case 'blush': m=`<path d="M143 232 Q150 236 157 232" stroke="${L2}" stroke-width="3" fill="none" stroke-linecap="round"/>`; break;
    case 'shy': m=`<path d="M143 233 q3.5 -3 7 0 q3.5 3 7 0" stroke="${L2}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`; break;
    case 'sad': m=`<path d="M141 236 Q150 229 159 236" stroke="${L2}" stroke-width="3" fill="none" stroke-linecap="round"/>`; break;
    case 'surprised': m=`<ellipse cx="150" cy="234" rx="6" ry="8" fill="#7a2d3c" stroke="${L2}" stroke-width="2.5"/>`; break;
    case 'angry': m=open('M138 238 Q150 226 162 238 Z')+`<path d="M139 236 L161 236" stroke="#fff" stroke-width="3"/>`; break;
    case 'smirk': m=`<path d="M140 233 Q153 236 162 226" stroke="${L2}" stroke-width="3" fill="none" stroke-linecap="round"/>`; break;
    default: m=`<path d="M143 232 Q150 234 157 232" stroke="${L2}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  }
  if(c.braces && ['grin','happy','angry','surprised'].includes(expr)) m+=`<path d="M139 230 L161 230" stroke="#b9c2d3" stroke-width="2.5"/>`+[142,147,152,157].map(x=>`<rect x="${x-1.6}" y="228.4" width="3.2" height="3.4" fill="#dfe4ee" stroke="#7d869a" stroke-width=".8"/>`).join('');
  if(c.braces && ['smile','smirk','blush'].includes(expr)) m+=`<path d="M144 233 L156 233" stroke="#b9c2d3" stroke-width="2" opacity=".9"/>`;
  return m;
}
function face2(c,expr,form,id){
  const w=56*c.fw, round=c.fw>1.05, sk=c.skin, skD=shade(sk,-.16), skL=shade(sk,.25);
  const chin=round?0.78:0.55, cy=round?248:252;
  const jaw=`M${150-w} 165 C${150-w} 120 ${150-w*.6} 102 150 102 C${150+w*.6} 102 ${150+w} 120 ${150+w} 165 C${150+w} ${round?212:205} ${150+w*chin} ${cy-14} 150 ${cy} C${150-w*chin} ${cy-14} ${150-w} ${round?212:205} ${150-w} 165Z`;
  let s=`<defs><radialGradient id="fg${id}" cx=".5" cy=".45" r=".65"><stop offset="0" stop-color="${skL}"/><stop offset=".7" stop-color="${sk}"/><stop offset="1" stop-color="${skD}"/></radialGradient></defs>`;
  // ears
  s+=`<path d="M${150-w+4} 176 C${150-w-14} 170 ${150-w-14} 204 ${150-w+6} 206 Z" fill="${sk}" ${LW}/><path d="M${150+w-4} 176 C${150+w+14} 170 ${150+w+14} 204 ${150+w-6} 206 Z" fill="${sk}" ${LW}/>`;
  s+=`<path d="${jaw}" fill="url(#fg${id})" ${LW}/>`;
  // shadow under the fringe, and soft cheek blush
  s+=`<path d="M${150-w+2} 150 Q150 180 ${150+w-2} 150 L${150+w-2} 112 L${150-w+2} 112Z" fill="${skD}" opacity=".45"/>`;
  const bl=(expr==='blush'||expr==='shy'||expr==='happy')?.5:.16;
  s+=`<ellipse cx="${150-30*c.fw}" cy="214" rx="14" ry="7" fill="#ff7a9a" opacity="${bl}"/><ellipse cx="${150+30*c.fw}" cy="214" rx="14" ry="7" fill="#ff7a9a" opacity="${bl}"/>`;
  if(bl>.3) s+=`<g stroke="#ff5f87" stroke-width="2" opacity=".6" stroke-linecap="round">${[-38,-30,-22,22,30,38].map(dx=>`<line x1="${150+dx*c.fw}" y1="209" x2="${150+dx*c.fw-4}" y2="218"/>`).join('')}</g>`;
  s+=eyes2(c,expr,form,id);
  s+=`<path d="M150 208 l-2.5 7 l4 .8" stroke="${shade(sk,-.4)}" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  s+=mouth2(Object.assign({},c,{_girl:form==='girl'}),expr);
  if(expr==='angry') s+=`<path d="M${150+w-6} 118 l10 -8 m-4 14 l12 -4 m-16 -6 l4 -12" stroke="#e8364f" stroke-width="4" stroke-linecap="round"/>`;
  if(expr==='sad') s+=`<path d="M${150-27*c.fw-6} 212 q-3 10 0 16 q3 -6 0 -16" fill="#8ec5ff" opacity=".8"/>`;
  return s;
}
function body2(c,form,id){
  const k=c.bw, X=v=>(150+(v-150)*k).toFixed(1), sk=c.skin;
  // neck runs from under the jaw down past the collar, so there's no gap
  let s=`<path d="M128 214 L172 214 L176 330 L124 330 Z" fill="${sk}" ${LW}/><path d="M128 232 Q150 268 172 232 L172 252 Q150 284 128 252Z" fill="${shade(sk,-.22)}" opacity=".75"/>`;
  s+=body(c,form).replace(/^<rect x="130" y="228"[^>]*\/>/,'');
  const sh=`M${X(30)} 520 C${X(34)} 360 ${X(80)} 312 150 306 C${X(220)} 312 ${X(266)} 360 ${X(270)} 520 Z`;
  s+=`<defs><linearGradient id="bg${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#1a1030" stop-opacity=".3"/></linearGradient></defs><path d="${sh}" fill="url(#bg${id})"/>`;
  // fabric folds
  s+=`<path d="M${X(78)} 520 C${X(84)} 450 ${X(92)} 400 ${X(104)} 372 M${X(222)} 520 C${X(216)} 450 ${X(208)} 400 ${X(196)} 372 M${X(118)} 470 q10 -16 4 -36 M${X(184)} 476 q-10 -16 -4 -36" stroke="${shade(c.tc,-.45)}" stroke-width="2.5" fill="none" opacity=".35" stroke-linecap="round"/>`;
  return s;
}
function portrait2(id,expr='neutral',form){
  const c=CHARS[id], u=(++PUID)+id;
  return `<svg viewBox="0 0 300 500" xmlns="http://www.w3.org/2000/svg"><defs>${hairDefs(c,u)}</defs>${hairBack2(c,form,u)}${body2(c,form,u)}${face2(c,expr,form,u)}${hairFront2(c,form,u)}${extras(c,form)}</svg>`;
}
// The anime faces above did not work out, so the game uses the original faces and hair,
// plus the fixed neck, soft hair shading, and clothing shading and folds.
function portrait3(id,expr="neutral",form){
  const c=CHARS[id], u=(++PUID)+id, hf=`fill="${c.hair}"`, hg=`fill="url(#hg${u})"`;
  const hair=s=>s.split(hf).join(hg);
  return `<svg viewBox="0 0 300 500" xmlns="http://www.w3.org/2000/svg"><defs>${hairDefs(c,u)}</defs>${hair(hairBack(c,form))}${body2(c,form,u)}${face(c,expr,form)}${hair(hairFront(c,form))}${extras(c,form)}</svg>`;
}
portrait=portrait3;
