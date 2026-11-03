// ---------- CHARACTER ART ----------
const CHARS = {
  natan:  {name:'Natan',  color:'#2c3e78', skin:'#f2c7a5', hair:'#5a3a22', hs:'curly',  eye:'#6b4a2b', top:'varsity', tc:'#2c3e78', tc2:'#f3ead6', fw:1, bw:1.05},
  lars:   {name:'Lars',   color:'#3d8fe0', skin:'#f7dcc8', hair:'#8a5a34', hs:'curly',  eye:'#3d8fe0', top:'shirt',   tc:'#ffffff', tc2:'#dfe8f5', fw:.96, bw:.92},
  adam:   {name:'Adam',   color:'#2f8f8a', skin:'#eac09c', hair:'#3b2a1e', hs:'down', fy:156, hl:'#6a5040', eye:'#3fa85a', top:'zip', tc:'#2f8f8a', tc2:'#e9f6f3', fw:1, bw:1},
  fionn:  {name:'Fionn',  color:'#2e9e5b', skin:'#f8dfcf', hair:'#16131a', hs:'down', fy:162, eye:'#1c1418', top:'jersey',  tc:'#2e9e5b', tc2:'#ffffff', fw:1.13, bw:1.2, num:'9', braces:true},
  milo:   {name:'Milo',   color:'#1d1a24', skin:'#fae6d8', hair:'#1d1a24', hs:'down', fy:170, eye:'#5b3a29', top:'coat',    tc:'#c49a6c', tc2:'#1f1c26', fw:1, bw:1, buds:true},
  mada:   {name:'Mada',   color:'#c2185b', skin:'#eac09c', hair:'#2a1d16', hs:'long', hl:'#5a4030', eye:'#3fa85a', top:'coat', tc:'#e85d75', tc2:'#fff4f6', fw:.95, bw:.9, fem:true, earrings:true},
  gian:   {name:'Gianmarcina', color:'#e84a6f', skin:'#f7dcc8', hair:'#ff6f8f', hs:'bob', hl:'#c94467', eye:'#8a4b2c', top:'hoodie', tc:'#ffb3c6', tc2:'#fff0f4', fw:.95, bw:.9, fem:true, clip:'strawberry'},
  goon:{name:'Goonseppe', color:'#5aa02c', skin:'#f4d6c0', hair:'#7cc24a', hs:'long', hl:'#4f8a2c', eye:'#4a8a2c', top:'zip', tc:'#9ad65c', tc2:'#f2ffe6', fw:.95, bw:.9, fem:true, clip:'apple'},
  daniel: {name:'Daniel', color:'#d2343f', skin:'#c99a6e', hair:'#1b1612', hs:'short',  eye:'#3b2616', top:'jersey',  tc:'#d2343f', tc2:'#ffffff', fw:1, bw:1.05, num:'10'},
  josh:   {name:'Josh',   color:'#f08a3c', skin:'#f4cdb0', hair:'#b98a4e', hs:'messy', hl:'#8a6230', eye:'#6d8a9c', top:'hoodie',  tc:'#f08a3c', tc2:'#ffd9b8', fw:1, bw:1},
  reshman:{name:'Reshman',color:'#b8860b', skin:'#6b4430', hair:'#15110e', hs:'fade',   eye:'#2e1d14', top:'jacket',  tc:'#e6b23a', tc2:'#2b2340', fw:1, bw:1.06, shades:true},
  officer:{name:'Officer Pim',color:'#2a4d8f', skin:'#e8b996', hair:'#4a4a4a', hs:'short', eye:'#3a3a3a', top:'police', tc:'#2a4d8f', tc2:'#ffffff', fw:1.05, bw:1.12, cap:true},
};
const L='#2b2340';

function curlRing(cx,cy,r,a0,a1,step,cr,fill){
  let s='';
  for(let a=a0;a<=a1;a+=step){const t=a*Math.PI/180;
    s+=`<circle cx="${(cx+Math.cos(t)*r).toFixed(1)}" cy="${(cy+Math.sin(t)*r).toFixed(1)}" r="${cr}" fill="${fill}" stroke="${L}" stroke-width="3"/>`;}
  return s;
}
function hairBack(c,form){
  const h=c.hair, w=58*c.fw, S3=`fill="${h}" stroke="${L}" stroke-width="3" stroke-linejoin="round"`;
  if(c.hs==='curly'){
    let s=`<ellipse cx="150" cy="150" rx="${w+14}" ry="78" fill="${h}" stroke="${L}" stroke-width="3"/>`;
    s+=curlRing(150,160,w+12,160,380,16,22,h);
    if(form==='girl'){ for(let y=200;y<=330;y+=26){s+=`<circle cx="${150-w-12}" cy="${y}" r="24" fill="${h}" stroke="${L}" stroke-width="3"/><circle cx="${150+w+12}" cy="${y}" r="24" fill="${h}" stroke="${L}" stroke-width="3"/>`;}
      s+=`<rect x="${150-w-30}" y="190" width="${2*w+60}" height="140" rx="40" fill="${h}"/>`;}
    return s;
  }
  // full, voluminous shapes that sit well above the head so nobody looks bald
  if(c.hs==='down') return `<path d="M${150-w-13} 218 C${150-w-24} 130 ${150-w-6} 70 150 68 C${150+w+6} 70 ${150+w+24} 130 ${150+w+13} 218 Z" ${S3}/>`;
  if(c.hs==='long') return `<path d="M${150-w-16} 392 C${150-w-34} 230 ${150-w-26} 72 150 70 C${150+w+26} 72 ${150+w+34} 230 ${150+w+16} 392 Q150 410 ${150-w-16} 392Z" ${S3}/>`;
  if(c.hs==='bob') return `<path d="M${150-w-14} 254 C${150-w-26} 132 ${150-w-6} 72 150 70 C${150+w+6} 72 ${150+w+26} 132 ${150+w+14} 254 Q150 268 ${150-w-14} 254Z" ${S3}/>`;
  if(c.hs==='messy') return `<path d="M${150-w-10} 196 L${150-w-20} 128 L${150-w-2} 112 L${150-w+4} 72 L${150-18} 92 L150 60 L${150+20} 88 L${150+w-4} 66 L${150+w+6} 108 L${150+w+22} 124 L${150+w+10} 196 Z" ${S3}/>`;
  if(c.hs==='fade') return `<path d="M${150-w-2} 172 C${150-w-6} 110 ${150-w+2} 82 150 80 C${150+w-2} 82 ${150+w+6} 110 ${150+w+2} 172 Z" ${S3}/>`;
  return `<path d="M${150-w-8} 184 C${150-w-14} 100 ${150-w} 74 150 72 C${150+w} 74 ${150+w+14} 100 ${150+w+8} 184 Z" ${S3}/>`;
}
// Front hair: outer crown, then down the temples, then a jagged fringe edge across the forehead.
function fringe(c,fy,side,top,jag){
  const w=58*c.fw; let tips='';
  for(let i=8;i>=0;i--){const x=150-w+10+i*((2*w-20)/8); tips+=` L${x.toFixed(1)} ${fy-(i%2?0:jag)}`;}
  return `M${150-w-8} ${side} C${150-w-16} 120 ${150-w+6} ${top} 150 ${top} C${150+w-6} ${top} ${150+w+16} 120 ${150+w+8} ${side} L${150+w-3} ${side} L${150+w-6} ${fy-4}${tips} L${150-w+6} ${fy-4} L${150-w+3} ${side} Z`;
}
function hairFront(c,form){
  const h=c.hair, w=58*c.fw, S3=`fill="${h}" stroke="${L}" stroke-width="3" stroke-linejoin="round"`, sh=`stroke="${c.hl||'#4a4458'}" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".7"`;
  if(c.hs==='curly'){
    let s='';
    for(let i=0;i<6;i++){const x=150-w+14+i*((2*w-28)/5); s+=`<circle cx="${x.toFixed(1)}" cy="${118+(i%2)*8}" r="19" fill="${h}" stroke="${L}" stroke-width="3"/>`;}
    s+=`<circle cx="${150-w+2}" cy="150" r="16" fill="${h}" stroke="${L}" stroke-width="3"/><circle cx="${150+w-2}" cy="150" r="16" fill="${h}" stroke="${L}" stroke-width="3"/>`;
    return s;
  }
  if(c.hs==='down'){
    const fy=c.fy||160;
    return `<path d="${fringe(c,fy,206,72,11)}" ${S3}/>`
      +`<path d="M${150-30} 96 L${150-36} ${fy-14} M${150-8} 88 L${150-10} ${fy-12} M${150+14} 90 L${150+16} ${fy-14} M${150+34} 98 L${150+40} ${fy-16} M${150-w+2} 130 L${150-w+4} 196 M${150+w-2} 130 L${150+w-4} 196" ${sh}/>`;
  }
  if(c.hs==='long'){
    return `<path d="M${150-w-8} 246 C${150-w-16} 120 ${150-w+6} 74 150 74 C${150+w-6} 74 ${150+w+16} 120 ${150+w+8} 246 L${150+w-2} 246 C${150+w-4} 190 ${150+w-6} 160 ${150+w-14} 146 C${150+20} 150 ${150-20} 120 ${150-w+18} 150 C${150-w+8} 170 ${150-w+4} 200 ${150-w+2} 246 Z" ${S3}/>`
      +`<path d="M${150-10} 84 C${150+10} 110 ${150+30} 130 ${150+w-16} 146 M${150-w+6} 160 L${150-w+4} 240 M${150+w-6} 160 L${150+w-4} 240" ${sh}/>`;
  }
  if(c.hs==='bob'){
    return `<path d="M${150-w-8} 250 C${150-w-16} 120 ${150-w+6} 76 150 76 C${150+w-6} 76 ${150+w+16} 120 ${150+w+8} 250 L${150+w-2} 250 L${150+w-6} 152 L${150-w+6} 152 L${150-w+2} 250 Z" ${S3}/>`
      +`<path d="M${150-30} 96 L${150-32} 150 M150 88 L150 150 M${150+30} 96 L${150+32} 150" ${sh}/>`;
  }
  if(c.hs==='messy') return `<path d="${fringe(c,150,178,70,16)}" ${S3}/><path d="M${150-24} 84 L${150-30} 130 M${150+18} 80 L${150+22} 132" ${sh}/>`;
  if(c.hs==='fade') return `<path d="M${150-w+2} 158 L${150-w+2} 100 C${150-w+10} 82 ${150+w-10} 82 ${150+w-2} 100 L${150+w-2} 158 C${150+24} 134 ${150-24} 134 ${150-w+2} 158Z" ${S3}/><path d="M${150-w+12} 100 L${150+w-12} 100 M${150-w+12} 116 L${150+w-12} 116" ${sh}/>`;
  // short: textured crop with a little fringe
  return `<path d="${fringe(c,148,176,74,8)}" ${S3}/><path d="M${150-20} 90 L${150-24} 136 M${150+12} 86 L${150+14} 134" ${sh}/>`;
}
function body(c,form){
  const k=c.bw, X=v=>(150+(v-150)*k).toFixed(1);
  const sh=`M${X(30)} 520 C${X(34)} 360 ${X(80)} 312 150 306 C${X(220)} 312 ${X(266)} 360 ${X(270)} 520 Z`;
  let s=`<rect x="130" y="228" width="40" height="${form==='girl'?70:62}" fill="${c.skin}" stroke="${L}" stroke-width="3"/>`;
  s+=`<path d="${sh}" fill="${c.tc}" stroke="${L}" stroke-width="3"/>`;
  switch(c.top){
    case 'varsity':
      s+=`<path d="M${X(30)} 520 C${X(34)} 360 ${X(70)} 318 ${X(96)} 312 L${X(84)} 520Z M${X(270)} 520 C${X(266)} 360 ${X(230)} 318 ${X(204)} 312 L${X(216)} 520Z" fill="${c.tc2}" stroke="${L}" stroke-width="3"/>`;
      s+=`<path d="M122 306 L150 345 L178 306" fill="#fff" stroke="${L}" stroke-width="3"/><line x1="150" y1="345" x2="150" y2="520" stroke="${L}" stroke-width="3"/>`;
      s+=`<text x="${X(112)}" y="415" font-family="Georgia" font-weight="bold" font-size="46" fill="${c.tc2}" stroke="${L}" stroke-width="2" text-anchor="middle">W</text>`;
      break;
    case 'shirt':
      s+=`<path d="M118 304 L150 336 L134 350 Z M182 304 L150 336 L166 350 Z" fill="#fff" stroke="${L}" stroke-width="3" stroke-linejoin="round"/><line x1="150" y1="336" x2="150" y2="520" stroke="#c9d4e6" stroke-width="3"/>`;
      for(let y=370;y<500;y+=40) s+=`<circle cx="156" cy="${y}" r="3.5" fill="#c9d4e6"/>`;
      s+=`<path d="M${X(70)} 520 C${X(72)} 440 ${X(80)} 400 ${X(86)} 380" stroke="#dfe8f5" stroke-width="4" fill="none"/>`;
      break;
    case 'zip':
      s+=`<path d="M128 306 L150 300 L172 306 L172 334 L150 340 L128 334Z" fill="${c.tc}" stroke="${L}" stroke-width="3"/><line x1="150" y1="320" x2="150" y2="520" stroke="${c.tc2}" stroke-width="4"/><rect x="146" y="344" width="8" height="14" rx="2" fill="#ddd" stroke="${L}" stroke-width="2"/>`;
      s+=`<path d="M${X(60)} 400 L${X(240)} 400" stroke="${c.tc2}" stroke-width="6"/>`;
      break;
    case 'jersey':
      s+=`<path d="M124 307 C136 330 164 330 176 307" fill="none" stroke="${c.tc2}" stroke-width="7"/>`;
      s+=`<text x="150" y="450" font-family="Impact,Arial Black" font-size="${c.num.length>1?70:84}" fill="${c.tc2}" stroke="${L}" stroke-width="2.5" text-anchor="middle">${c.num}</text>`;
      break;
    case 'coat':
      s+=`<path d="M128 302 L150 296 L172 302 L176 350 L150 356 L124 350Z" fill="${c.tc2}" stroke="${L}" stroke-width="3"/>`;
      s+=`<path d="M124 306 L108 380 L150 520 L120 520 L${X(70)} 520 Z M176 306 L192 380 L150 520 L180 520 L${X(230)} 520Z" fill="${c.tc}" stroke="${L}" stroke-width="3" stroke-linejoin="round"/>`;
      s+=`<path d="M150 356 L150 520" stroke="${c.tc2}" stroke-width="40"/><path d="M116 330 L100 390 L126 372Z M184 330 L200 390 L174 372Z" fill="#a37d55" stroke="${L}" stroke-width="2.5"/>`;
      break;
    case 'hoodie':
      s+=`<path d="M100 318 C110 290 190 290 200 318 C185 338 115 338 100 318Z" fill="${c.tc2}" stroke="${L}" stroke-width="3"/><line x1="138" y1="330" x2="134" y2="380" stroke="${L}" stroke-width="3"/><line x1="162" y1="330" x2="166" y2="380" stroke="${L}" stroke-width="3"/>`;
      s+=`<path d="M100 440 L200 440 L190 500 L110 500Z" fill="none" stroke="${L}" stroke-width="3" opacity=".5"/>`;
      break;
    case 'jacket':
      s+=`<path d="M126 306 L150 330 L174 306 L172 520 L128 520Z" fill="#fff" stroke="${L}" stroke-width="3"/><path d="M126 306 L112 360 L136 380 L150 330Z M174 306 L188 360 L164 380 L150 330Z" fill="${c.tc}" stroke="${L}" stroke-width="3" stroke-linejoin="round"/>`;
      s+=`<path d="M138 300 L162 300 L156 320 L144 320Z" fill="#c9a227" stroke="${L}" stroke-width="2"/>`;
      break;
    case 'police':
      s+=`<path d="M124 307 L150 336 L176 307" fill="#fff" stroke="${L}" stroke-width="3"/><path d="M146 336 L154 336 L156 400 L150 410 L144 400Z" fill="#1a1a2e"/><path d="M190 370 L214 370 L214 398 L202 408 L190 398Z" fill="#ffd34d" stroke="${L}" stroke-width="2.5"/>`;
      break;
  }
  return s;
}
function face(c,expr,form){
  const w=58*c.fw, ex=30*c.fw;
  let s=`<ellipse cx="${150-w+2}" cy="190" rx="10" ry="15" fill="${c.skin}" stroke="${L}" stroke-width="3"/><ellipse cx="${150+w-2}" cy="190" rx="10" ry="15" fill="${c.skin}" stroke="${L}" stroke-width="3"/>`;
  s+=`<ellipse cx="150" cy="178" rx="${w}" ry="${c.fw>1.05?70:68}" fill="${c.skin}" stroke="${L}" stroke-width="3"/>`;
  if(c.fw>1.05) s+=`<ellipse cx="${150-w+18}" cy="214" rx="12" ry="7" fill="#f2a58e" opacity=".35"/><ellipse cx="${150+w-18}" cy="214" rx="12" ry="7" fill="#f2a58e" opacity=".35"/>`;
  const eyes=(dx)=>{
    const x=150+dx, y=188;
    if(expr==='grin'||expr==='happy') return `<path d="M${x-12} ${y+3} Q${x} ${y-12} ${x+12} ${y+3}" stroke="${L}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    const big=expr==='surprised'?1.18:1;
    let e=`<ellipse cx="${x}" cy="${y}" rx="${12*big}" ry="${15*big}" fill="#fff" stroke="${L}" stroke-width="3"/>`;
    e+=`<circle cx="${x}" cy="${y+2}" r="${9.5*big}" fill="${c.eye}"/><circle cx="${x}" cy="${y+2}" r="${4.5*big}" fill="${L}"/><circle cx="${x+3.5}" cy="${y-3}" r="3" fill="#fff"/>`;
    if(expr==='smirk'||expr==='angry') e+=`<path d="M${x-14} ${y-10} L${x+14} ${y-10} L${x+14} ${y-20} L${x-14} ${y-20}Z" fill="${c.skin}"/><line x1="${x-13}" y1="${y-9}" x2="${x+13}" y2="${y-9}" stroke="${L}" stroke-width="3"/>`;
    if(form==='girl'||c.fem) e+=`<path d="M${x+(dx<0?-12:12)} ${y-8} l${dx<0?-7:7} -5" stroke="${L}" stroke-width="3" stroke-linecap="round"/>`;
    if(c.shades) {}
    return e;
  };
  s+=eyes(-ex)+eyes(ex);
  // brows
  const bc=c.hs==='curly'||c.hs==='short'?c.hair:L;
  const brow=(dx,side)=>{const x=150+dx,y=164; let a=0;
    if(expr==='angry') a=side*7; else if(expr==='sad'||expr==='shy') a=-side*6; else if(expr==='surprised') return `<path d="M${x-12} ${y-6} Q${x} ${y-14} ${x+12} ${y-6}" stroke="${bc}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    return `<line x1="${x-12}" y1="${y+(side<0?-a:a)*0}${''}" x2="${x+12}" y2="${y}" stroke="${bc}" stroke-width="5" stroke-linecap="round" transform="rotate(${a} ${x} ${y})"/>`;};
  s+=brow(-ex,-1)+brow(ex,1);
  s+=`<path d="M148 204 Q152 212 146 214" stroke="${L}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
  const m={
    neutral:`<path d="M138 232 Q150 236 162 232" stroke="${L}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`,
    smile:`<path d="M134 228 Q150 244 166 228" stroke="${L}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`,
    grin:`<path d="M132 226 Q150 254 168 226 Z" fill="#fff" stroke="${L}" stroke-width="3.5" stroke-linejoin="round"/><path d="M140 240 Q150 248 160 240" fill="#ff8fa8"/>`,
    happy:`<path d="M134 228 Q150 246 166 228" stroke="${L}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`,
    blush:`<path d="M140 232 Q150 238 160 232" stroke="${L}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`,
    shy:`<path d="M142 234 Q150 230 158 234" stroke="${L}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`,
    sad:`<path d="M136 238 Q150 228 164 238" stroke="${L}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`,
    surprised:`<ellipse cx="150" cy="236" rx="9" ry="11" fill="#7a2d3c" stroke="${L}" stroke-width="3"/>`,
    angry:`<path d="M136 238 Q150 228 164 238" stroke="${L}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
    smirk:`<path d="M138 234 Q154 236 166 224" stroke="${L}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`,
  };
  if(c.braces && ['smile','grin','happy','angry','surprised','smirk'].includes(expr)){
    // open mouth showing teeth with braces
    s+=`<path d="M132 226 Q150 252 168 226 Z" fill="#fff" stroke="${L}" stroke-width="3.5" stroke-linejoin="round"/>`
     +`<line x1="135" y1="231" x2="165" y2="231" stroke="#9aa3b5" stroke-width="2.5"/>`
     +[139,145,151,157,162].map(x=>`<rect x="${x-2}" y="228.5" width="4.5" height="5" fill="#c7cedb" stroke="#7d869a" stroke-width="1"/>`).join('');
  } else s+=m[expr]||m.neutral;
  if(expr==='blush'||expr==='shy'||expr==='happy'){s+=`<g fill="#ff6f9f" opacity=".45"><ellipse cx="${150-ex-6}" cy="214" rx="15" ry="8"/><ellipse cx="${150+ex+6}" cy="214" rx="15" ry="8"/></g><g stroke="#ff6f9f" stroke-width="2" opacity=".7"><line x1="${150-ex-14}" y1="210" x2="${150-ex-18}" y2="218"/><line x1="${150-ex-4}" y1="210" x2="${150-ex-8}" y2="218"/><line x1="${150+ex+4}" y1="210" x2="${150+ex}" y2="218"/><line x1="${150+ex+14}" y1="210" x2="${150+ex+10}" y2="218"/></g>`;}
  if(expr==='angry') s+=`<path d="M${150+w-10} 120 l10 -8 m-4 14 l12 -4 m-16 -6 l4 -12" stroke="#e8364f" stroke-width="4" stroke-linecap="round"/>`;
  return s;
}
function extras(c,form){
  const w=58*c.fw;let s='';
  if(c.fem||form==="girl") s+=`<path d="M141 233 Q150 238 159 233" stroke="#e06a85" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/>`;
  if(c.earrings) s+=`<circle cx="${150-w+2}" cy="210" r="5" fill="#ffd34d" stroke="${L}" stroke-width="2"/><circle cx="${150+w-2}" cy="210" r="5" fill="#ffd34d" stroke="${L}" stroke-width="2"/>`;
  if(c.clip==="strawberry") s+=`<g transform="translate(${150+w-26},104)"><path d="M0 0 C-14 0 -16 18 0 30 C16 18 14 0 0 0Z" fill="#ff3b5c" stroke="${L}" stroke-width="2.5"/><path d="M-8 0 L0 -8 L8 0 L0 4Z" fill="#4caf50" stroke="${L}" stroke-width="2"/><circle cx="-4" cy="10" r="1.5" fill="#ffe38a"/><circle cx="4" cy="16" r="1.5" fill="#ffe38a"/></g>`;
  if(c.clip==="apple") s+=`<g transform="translate(${150+w-26},106)"><circle cx="0" cy="12" r="13" fill="#8fd14f" stroke="${L}" stroke-width="2.5"/><path d="M0 0 L2 -8" stroke="${L}" stroke-width="2.5"/><path d="M3 -6 q8 -6 12 0 q-6 4 -12 0Z" fill="#4caf50" stroke="${L}" stroke-width="2"/></g>`;
  if(c.buds) s+=`<circle cx="${150-w-2}" cy="196" r="7" fill="#fff" stroke="${L}" stroke-width="2.5"/><path d="M${150-w-2} 203 C${150-w-6} 260 120 290 140 320" stroke="#fff" stroke-width="2.5" fill="none"/>`;
  if(c.shades) s+=`<g transform="translate(0,-8)"><rect x="104" y="112" width="38" height="20" rx="8" fill="${L}"/><rect x="158" y="112" width="38" height="20" rx="8" fill="${L}"/><line x1="142" y1="120" x2="158" y2="120" stroke="${L}" stroke-width="4"/><line x1="110" y1="116" x2="120" y2="116" stroke="#fff" stroke-width="3" opacity=".6"/></g>`;
  if(c.cap) s+=`<path d="M${150-w-6} 132 C${150-w} 70 ${150+w} 70 ${150+w+6} 132 Z" fill="#2a4d8f" stroke="${L}" stroke-width="3"/><path d="M${150-w-10} 132 L${150+w+16} 132 L${150+w+30} 144 L${150-w-6} 144Z" fill="#1a1a2e" stroke="${L}" stroke-width="3"/><path d="M142 96 L150 88 L158 96 L150 108Z" fill="#ffd34d" stroke="${L}" stroke-width="2"/>`;
  return s;
}
function portrait(id,expr='neutral',form){
  const c=CHARS[id];
  return `<svg viewBox="0 0 300 500" xmlns="http://www.w3.org/2000/svg">${hairBack(c,form)}${body(c,form)}${face(c,expr,form)}${hairFront(c,form)}${extras(c,form)}</svg>`;
}

// ---------- BACKGROUNDS ----------
const S=(inner,sky)=>`<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
const st=`stroke="${L}" stroke-width="5" stroke-linejoin="round"`;
function windowRow(y,h,n,x0,gap,w,tint){let s='';for(let i=0;i<n;i++){const x=x0+i*gap;s+=`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${tint}" ${st}/><line x1="${x+w/2}" y1="${y}" x2="${x+w/2}" y2="${y+h}" ${st}/><line x1="${x}" y1="${y+h/2}" x2="${x+w}" y2="${y+h/2}" ${st}/>`;}return s;}
function catSvg(x,y,col,sc=1){return `<g transform="translate(${x},${y}) scale(${sc})"><ellipse cx="0" cy="0" rx="46" ry="30" fill="${col}" ${st}/><circle cx="38" cy="-30" r="26" fill="${col}" ${st}/><path d="M20 -48 L24 -72 L38 -54Z M46 -54 L58 -72 L60 -46Z" fill="${col}" ${st}/><circle cx="32" cy="-32" r="3.5" fill="${L}"/><circle cx="48" cy="-32" r="3.5" fill="${L}"/><path d="M-44 -6 C-80 -20 -70 -60 -54 -50" fill="none" stroke="${col}" stroke-width="12" stroke-linecap="round"/></g>`;}
const BG={
  gate:()=>S(`<rect width="1600" height="900" fill="#bfe3ff"/><circle cx="1360" cy="150" r="80" fill="#ffe38a" ${st}/>
    <ellipse cx="300" cy="140" rx="120" ry="40" fill="#fff" opacity=".9"/><ellipse cx="900" cy="100" rx="150" ry="36" fill="#fff" opacity=".9"/>
    <rect x="300" y="250" width="1000" height="460" fill="#f7cfa8" ${st}/><path d="M260 260 L800 120 L1340 260Z" fill="#e8706b" ${st}/>
    ${windowRow(320,110,6,350,160,110,'#d9f0ff')}${windowRow(480,110,6,350,160,110,'#d9f0ff')}
    <rect x="720" y="560" width="160" height="150" fill="#8c5a3c" ${st}/><rect x="650" y="200" width="300" height="70" rx="12" fill="#fff8ee" ${st}/>
    <text x="800" y="248" font-family="Chalkboard SE,Marker Felt,cursive" font-size="44" text-anchor="middle" fill="${L}">WidR School</text>
    <rect y="700" width="1600" height="200" fill="#9fdc8a" ${st}/><path d="M640 900 L720 710 L880 710 L960 900Z" fill="#e9dcc7" ${st}/>
    <circle cx="160" cy="600" r="110" fill="#ff9fc2" ${st}/><rect x="145" y="640" width="30" height="80" fill="#8c5a3c" ${st}/><circle cx="1460" cy="590" r="120" fill="#ffb3cf" ${st}/><rect x="1445" y="640" width="30" height="80" fill="#8c5a3c" ${st}/>`),
  classroom:()=>S(`<rect width="1600" height="900" fill="#fff1dc"/><rect y="650" width="1600" height="250" fill="#e2b98a" ${st}/>
    <rect x="300" y="120" width="760" height="330" rx="10" fill="#3f6d5a" ${st}/><rect x="285" y="440" width="790" height="22" fill="#c99a6b" ${st}/>
    <text x="340" y="200" font-family="Chalkboard SE,cursive" font-size="40" fill="#fff" opacity=".85">Welcome to 5vb VWO!</text>
    <text x="340" y="270" font-family="Chalkboard SE,cursive" font-size="30" fill="#fff" opacity=".6">Rankingland History: Ch. 4</text>
    ${windowRow(120,280,2,1150,200,160,'#cfeaff')}
    <rect x="80" y="160" width="160" height="200" fill="#fff" ${st}/><circle cx="160" cy="240" r="50" fill="#ffd34d" ${st}/>
    <g>${[200,600,1000,1400].map(x=>`<rect x="${x-130}" y="700" width="260" height="40" fill="#f7d39b" ${st}/><rect x="${x-110}" y="740" width="20" height="160" fill="#9c6b44"/><rect x="${x+90}" y="740" width="20" height="160" fill="#9c6b44"/>`).join('')}</g>`),
  hallway:()=>S(`<rect width="1600" height="900" fill="#ffe6ee"/><rect y="680" width="1600" height="220" fill="#d7c7e8" ${st}/>
    ${[100,350,600,850,1100,1350].map(x=>`<rect x="${x}" y="300" width="160" height="390" rx="8" fill="#8ec5ff" ${st}/><rect x="${x+20}" y="330" width="120" height="16" rx="4" fill="#5c8fd1"/><rect x="${x+20}" y="360" width="120" height="16" rx="4" fill="#5c8fd1"/><circle cx="${x+130}" cy="500" r="8" fill="${L}"/>`).join('')}
    <rect x="0" y="60" width="1600" height="60" fill="#ffc94d" ${st}/><text x="800" y="104" font-family="Chalkboard SE,cursive" font-size="36" text-anchor="middle" fill="${L}">★ WidR Winter Lights Festival in 3 weeks! ★</text>`),
  cafeteria:()=>S(`<rect width="1600" height="900" fill="#fff4c7"/><rect y="620" width="1600" height="280" fill="#f5b971" ${st}/>
    <rect x="0" y="0" width="1600" height="90" fill="#ff6f9f"/><path d="${Array.from({length:17},(_,i)=>`M${i*100} 90 Q${i*100+50} 150 ${i*100+100} 90`).join(' ')}" fill="#ff6f9f" ${st}/>
    <rect x="200" y="300" width="1200" height="200" rx="16" fill="#fff" ${st}/><text x="800" y="380" font-family="Chalkboard SE,cursive" font-size="48" text-anchor="middle" fill="${L}">TODAY: Stroopwafel Day</text>
    <text x="800" y="450" font-family="Chalkboard SE,cursive" font-size="30" text-anchor="middle" fill="#7a6e8f">(again)</text>
    ${[300,800,1300].map(x=>`<ellipse cx="${x}" cy="700" rx="200" ry="40" fill="#fff" ${st}/>`).join('')}`),
  field:()=>S(`<rect width="1600" height="900" fill="#ffd9a8"/><circle cx="1300" cy="260" r="110" fill="#ff9f6b" ${st}/>
    <rect y="520" width="1600" height="380" fill="#7fcf6e" ${st}/><path d="M400 900 L800 560 L1200 900Z" fill="#d9a066" ${st}/>
    <path d="M760 720 L840 720 L840 760 L800 790 L760 760Z" fill="#fff" ${st}/>
    <rect x="80" y="340" width="40" height="190" fill="#fff" ${st}/><rect x="40" y="320" width="300" height="160" fill="none" stroke="#fff" stroke-width="8"/>
    <path d="M0 520 ${Array.from({length:20},(_,i)=>`L${i*85} ${500-(i%2)*14}`).join(' ')} L1600 520Z" fill="#5fb85a"/>`),
  library:()=>S(`<rect width="1600" height="900" fill="#f3e3c8"/><rect y="700" width="1600" height="200" fill="#a8744a" ${st}/>
    ${[60,460,860,1260].map(x=>`<rect x="${x}" y="100" width="300" height="600" fill="#8c5a3c" ${st}/>${[160,300,440,580].map(y=>`<rect x="${x}" y="${y}" width="300" height="12" fill="${L}"/>${Array.from({length:9},(_,i)=>`<rect x="${x+10+i*31}" y="${y-100+((i*7)%30)}" width="26" height="${100-((i*7)%30)}" fill="${['#ff6f9f','#7fd6c2','#ffc94d','#8ec5ff','#c9a0ff'][(i+y)%5]}" stroke="${L}" stroke-width="3"/>`).join('')}`).join('')}`).join('')}
    <ellipse cx="800" cy="760" rx="380" ry="50" fill="#d39a64" ${st}/><circle cx="560" cy="700" r="40" fill="#ffe38a" opacity=".6"/>`),
  catcafe:()=>S(`<rect width="1600" height="900" fill="#ffe8f0"/><rect y="640" width="1600" height="260" fill="#f7cba0" ${st}/>
    <rect x="100" y="120" width="560" height="320" rx="20" fill="#d9f0ff" ${st}/><path d="M100 120 Q380 220 660 120" fill="#ff9fc2" ${st}/>
    <rect x="900" y="150" width="520" height="90" rx="14" fill="#fff8ee" ${st}/><text x="1160" y="210" font-family="Chalkboard SE,cursive" font-size="44" text-anchor="middle" fill="${L}">Pawsome Café 🐾</text>
    <rect x="980" y="420" width="300" height="40" fill="#e8a8c0" ${st}/><rect x="1000" y="460" width="40" height="190" fill="#c48aa0" ${st}/><rect x="1220" y="460" width="40" height="190" fill="#c48aa0" ${st}/>
    ${catSvg(1120,390,'#ffb36b',.9)}${catSvg(260,720,'#fff',.9)}${catSvg(1400,720,'#6b6b7a',.9)}${catSvg(560,400,'#2b2340',.7)}`),
  gym:()=>S(`<rect width="1600" height="900" fill="#e6f4ff"/><rect y="560" width="1600" height="340" fill="#f2c98c" ${st}/>
    ${Array.from({length:8},(_,i)=>`<line x1="${i*220}" y1="560" x2="${i*220-120}" y2="900" stroke="#d9ac6c" stroke-width="4"/>`).join('')}
    <rect x="460" y="560" width="680" height="30" fill="#2f8f8a" ${st}/><line x1="800" y1="540" x2="800" y2="590" stroke="${L}" stroke-width="6"/><rect x="560" y="590" width="20" height="160" fill="${L}"/><rect x="1020" y="590" width="20" height="160" fill="${L}"/>
    <rect x="200" y="80" width="1200" height="40" fill="#ffc94d" ${st}/><text x="800" y="113" font-family="Chalkboard SE,cursive" font-size="30" text-anchor="middle" fill="${L}">WidR Table Tennis Club</text>
    ${windowRow(160,200,5,220,250,180,'#fff')}<circle cx="900" cy="500" r="16" fill="#fff" ${st}/>`),
  rooftop:()=>S(`<defs><linearGradient id="sun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff9fc2"/><stop offset="1" stop-color="#ffd38a"/></linearGradient></defs><rect width="1600" height="900" fill="url(#sun)"/>
    <circle cx="1200" cy="520" r="140" fill="#fff1a8" ${st}/>
    ${[0,180,330,520,700,900,1060,1250,1420].map((x,i)=>`<rect x="${x}" y="${420+(i*53)%160}" width="160" height="500" fill="${['#c9a0ff','#8ec5ff','#b8a4e8'][i%3]}" ${st}/>`).join('')}
    <rect y="680" width="1600" height="220" fill="#cfc3e0" ${st}/>${Array.from({length:17},(_,i)=>`<line x1="${i*100}" y1="560" x2="${i*100}" y2="680" ${st}/>`).join('')}<line x1="0" y1="580" x2="1600" y2="580" ${st}/>`),
  rain:()=>S(`<rect width="1600" height="900" fill="#b9c6dd"/><rect y="640" width="1600" height="260" fill="#8c95a8" ${st}/>
    <rect x="200" y="200" width="480" height="440" fill="#d7c7e8" ${st}/><rect x="920" y="160" width="520" height="480" fill="#c4d8ee" ${st}/>
    <rect x="980" y="440" width="400" height="200" fill="#ffe38a" ${st}/><text x="1180" y="400" font-family="Chalkboard SE,cursive" font-size="40" text-anchor="middle" fill="${L}">Bus Stop</text>
    ${Array.from({length:70},(_,i)=>`<line x1="${(i*137)%1600}" y1="${(i*89)%900}" x2="${(i*137)%1600-14}" y2="${(i*89)%900+40}" stroke="#fff" stroke-width="4" opacity=".7"/>`).join('')}`),
  party:(nb)=>S(`<rect width="1600" height="900" fill="#fff0d1"/><rect y="660" width="1600" height="240" fill="#c99a6b" ${st}/>
    <path d="M0 80 ${Array.from({length:9},(_,i)=>`Q${i*200+100} 180 ${i*200+200} 80`).join(' ')}" fill="none" ${st}/>
    ${Array.from({length:16},(_,i)=>`<path d="M${i*100+30} ${100+Math.abs(Math.sin(i*.8))*50} l30 0 l-15 50Z" fill="${['#ff6f9f','#7fd6c2','#ffc94d','#8ec5ff'][i%4]}" stroke="${L}" stroke-width="3"/>`).join('')}
    <rect x="160" y="300" width="460" height="300" rx="20" fill="#2b2340" ${st}/><rect x="180" y="320" width="420" height="260" rx="10" fill="#7fd6c2"/><text x="390" y="470" font-family="Impact,Arial Black" font-size="48" text-anchor="middle" fill="${L}">GOAL!!</text>
    <rect x="900" y="480" width="560" height="180" rx="40" fill="#ff9fc2" ${st}/><rect x="880" y="420" width="600" height="80" rx="30" fill="#ffb3cf" ${st}/>
    ${nb?'':`<text x="1180" y="300" font-family="Chalkboard SE,cursive" font-size="48" text-anchor="middle" fill="${L}">End-of-Term Party @ Fionn's</text>`}`),
  night:()=>S(`<rect width="1600" height="900" fill="#3d3a6b"/>${Array.from({length:40},(_,i)=>`<circle cx="${(i*173)%1600}" cy="${(i*61)%400}" r="${2+i%3}" fill="#fff"/>`).join('')}
    <circle cx="1300" cy="160" r="70" fill="#fff4c7" ${st}/><rect x="260" y="300" width="700" height="400" fill="#ffd3e2" ${st}/><path d="M220 310 L610 120 L1000 310Z" fill="#7a5c9e" ${st}/>
    ${windowRow(380,140,3,320,220,150,'#ffe38a')}<rect y="700" width="1600" height="200" fill="#5c6e5a" ${st}/><rect x="0" y="760" width="1600" height="80" fill="#7a7a8a"/>
    <rect x="1240" y="380" width="20" height="340" fill="${L}"/><circle cx="1250" cy="370" r="30" fill="#ffe38a" ${st}/>`),
  sunset:()=>S(`<defs><linearGradient id="ss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb3cf"/><stop offset=".6" stop-color="#ffd38a"/><stop offset="1" stop-color="#ffeec2"/></linearGradient></defs><rect width="1600" height="900" fill="url(#ss)"/>
    <circle cx="800" cy="620" r="200" fill="#fff1a8" ${st}/><rect y="620" width="1600" height="280" fill="#8ec5ff" ${st}/>
    ${Array.from({length:8},(_,i)=>`<path d="M${i*200+40} ${700+i%2*40} q40 -12 80 0" stroke="#fff" stroke-width="5" fill="none"/>`).join('')}
    <rect y="800" width="1600" height="100" fill="#f7d39b" ${st}/>`),
  living:()=>BG.party(true),
  ice:()=>S(`<rect width="1600" height="900" fill="#dff1ff"/><path d="M0 380 L220 220 L420 360 L640 180 L900 380 L1120 230 L1380 360 L1600 240 L1600 520 L0 520Z" fill="#fff" ${st}/><rect y="520" width="1600" height="380" fill="#bfe6ff" ${st}/><ellipse cx="800" cy="720" rx="700" ry="150" fill="#e9f7ff" ${st}/><path d="M300 720 Q800 640 1300 720" stroke="#a9d6f5" stroke-width="6" fill="none"/><path d="M400 780 Q800 720 1200 790" stroke="#a9d6f5" stroke-width="6" fill="none"/>${Array.from({length:50},(_,i)=>`<circle cx="${(i*151)%1600}" cy="${(i*67)%880}" r="${3+i%4}" fill="#fff" stroke="#a9d6f5" stroke-width="2"/>`).join('')}<rect x="80" y="430" width="1440" height="20" fill="#ff6f9f" ${st}/>`),
  town:()=>S(`<rect width="1600" height="900" fill="#ffe9d6"/><circle cx="1380" cy="140" r="70" fill="#ffe38a" ${st}/>${[[60,'#ff9fc2','Barber'],[440,'#8ec5ff','Gym'],[820,'#7fd6c2','Skincare'],[1200,'#ffc94d','Fashion']].map(([x,c,n])=>`<rect x="${x}" y="260" width="340" height="440" fill="${c}" ${st}/><rect x="${x}" y="230" width="340" height="70" fill="#fff8ee" ${st}/><text x="${x+170}" y="278" font-family="Chalkboard SE,cursive" font-size="38" text-anchor="middle" fill="${L}">${n}</text><rect x="${x+40}" y="360" width="260" height="180" rx="10" fill="#fff" opacity=".7" ${st}/><rect x="${x+120}" y="580" width="100" height="120" fill="#8c5a3c" ${st}/>`).join('')}<rect y="700" width="1600" height="200" fill="#cfc3e0" ${st}/>`),
  black:()=>S(`<rect width="1600" height="900" fill="#2b2340"/>`),
};
