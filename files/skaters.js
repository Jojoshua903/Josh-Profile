// Roster + procedural skater drawing. Designs are stylised takes on the WIDR 64 cast.
const SKATERS = [
  {id:'guiseppe', name:'Guiseppe', from:'The Guiseppe Game',
   blurb:'Italian fruit hero of the Biscotto Isles. Already dethroned King Grumbleclaw once, now he wants to do it on four wheels.',
   stats:{speed:7, air:6, balance:7}, special:'Biscotto Isles 900',
   type:'fruit', head:'#e5392b', shirt:'#2c9a58', pants:'#2a3a6b', deck:'#ffc531', acc:'mustache'},
  {id:'gianmarco', name:'Gianmarco', from:'The Guiseppe Game',
   blurb:'Rescued from the summit of Isola Gelato. Still a little frozen, which turns out to be great for grinding.',
   stats:{speed:6, air:6, balance:8}, special:'Gelato Freeze Grab',
   type:'fruit', head:'#ff9a2e', shirt:'#7fd1ff', pants:'#ffffff', deck:'#e5392b', acc:'beanie'},
  {id:'goonseppe', name:'Goonseppe', from:'The Guiseppe Game',
   blurb:'Guiseppe, but goonier. Pushes fast, thinks later, never takes the shades off.',
   stats:{speed:8, air:6, balance:4}, special:'Goonposter Slam',
   type:'fruit', head:'#6b2fa0', shirt:'#1f1a2e', pants:'#4a4a4a', deck:'#2c9a58', acc:'shades'},
  {id:'nathan', name:'Nathan', from:'Demon Derby',
   blurb:'The slugger who banishes demons with home runs. Treats every kicker like a fastball down the middle.',
   stats:{speed:7, air:7, balance:5}, special:'Home Run Varial',
   type:'kid', head:'#d9a679', shirt:'#ffffff', pants:'#2156c9', cap:'#2156c9', deck:'#e5392b', num:'9'},
  {id:'ash', name:'Ash', from:'Demon Derby',
   blurb:'Nathan’s little brother. Lobs it slow and easy, and somehow never falls off a rail.',
   stats:{speed:5, air:6, balance:9}, special:'Slow & Easy Lob 540',
   type:'kid', small:true, head:'#c98f63', shirt:'#ffc531', pants:'#2c9a58', cap:'#2c9a58', deck:'#7fd1ff', num:'1', backwards:true},
  {id:'zenith', name:'Zenith', from:'Demon Derby',
   blurb:'The demon that cracked the diamond open. Fast, cursed, cruel, and the board is cursed too.',
   stats:{speed:9, air:8, balance:3}, special:'Cursed Curveball 720',
   type:'demon', head:'#b3122e', shirt:'#3a0f2f', pants:'#1f1a2e', deck:'#1f1a2e'},
  {id:'otis', name:'Otis', from:'Otis in Orbit',
   blurb:'Crash-landed on De Mistmaan. Gravity is more of a suggestion at this point.',
   stats:{speed:6, air:9, balance:5}, special:'Kosmisch Koekje Flip',
   type:'astro', head:'#ffffff', shirt:'#f4f1ea', pants:'#e5392b', deck:'#4fb3d9'},
  {id:'josh', name:'Josh', from:'Star Josh',
   blurb:'The star of Star Josh, who leads the squad through six stages. Brings the barrel roll from the cockpit to the bowl.',
   stats:{speed:7, air:7, balance:7}, special:'Barrel Roll 720',
   type:'kid', head:'#c68a5e', shirt:'#1f1a2e', pants:'#4fb3d9', deck:'#ffc531', hair:'short', hairCol:'#1f1a2e', acc:'headset', num:'★'},
  {id:'milo', name:'Milo', from:'Otis in Orbit · Star Josh',
   blurb:'Turns up on De Mistmaan in Otis in Orbit and flies with the squad in Star Josh. Comfortable in low gravity, and it shows.',
   stats:{speed:6, air:8, balance:6}, special:'Mistmaan Moonwalk',
   type:'kid', head:'#e2b48c', shirt:'#2c9a58', pants:'#1f1a2e', deck:'#e5392b', hair:'curly', hairCol:'#7a4a24'},
  {id:'lars', name:'Lars', from:'Star Josh',
   blurb:'Another member of Josh’s squad in Star Josh. Pushes hard and holds formation on rails.',
   stats:{speed:8, air:6, balance:6}, special:'Squad Formation Flip',
   type:'kid', head:'#f0c9a4', shirt:'#e5392b', pants:'#2a3a6b', deck:'#2c9a58', hair:'spiky', hairCol:'#e8c25a'},
  {id:'kayoyara', name:'Kayo & Yara', short:'Kayo & Yara', from:'WIDR 64 crew',
   blurb:'Two in one: Kayo up front, Yara at the back, one long board between them. When one leans, the other leans back, so they rarely fall off a rail.',
   stats:{speed:7, air:6, balance:8}, special:'Double Trouble Spiral',
   type:'duo', duo:true, deck:'#4fb3d9', head:'#c79268',
   riders:[
     {type:'kid', head:'#b07a52', shirt:'#ffc531', pants:'#5b2a6e', deck:'#4fb3d9', hair:'bun', hairCol:'#1f1a2e'},
     {type:'kid', head:'#d6a07a', shirt:'#5b2a6e', pants:'#ffffff', deck:'#4fb3d9', hair:'long', hairCol:'#3b2414'},
   ]},
  {id:'grumbleclaw', name:'King Grumbleclaw', short:'Grumbleclaw', from:'The Guiseppe Game',
   blurb:'King of Claw Reef. Slow to push, impossible to knock off a rail. Unlock him by completing 7 career goals.',
   stats:{speed:6, air:5, balance:10}, special:'Royal Shockwave',
   type:'crab', head:'#e8502f', shirt:'#e8502f', pants:'#b8321a', deck:'#ffc531', locked:true},
];

function rr(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}

function drawBoard(ctx, sk, flip, len){
  // flip: 0..1 phase of a flip trick (board rolls on its long axis)
  const lift = flip ? -16*Math.sin(flip*Math.PI) : 0;
  const t = flip ? Math.cos(flip*Math.PI*2) : 1;
  ctx.save(); ctx.translate(0, -5 + lift); ctx.scale(len || 1, Math.max(0.12, Math.abs(t)));
  ctx.fillStyle = '#1f1a2e';
  if (t > 0){ // wheels visible below
    ctx.beginPath(); ctx.arc(-17, 4, 4, 0, 7); ctx.arc(17, 4, 4, 0, 7); ctx.fill();
  }
  rr(ctx, -29, -3, 58, 6, 3); ctx.fill();
  ctx.fillStyle = t > 0 ? sk.deck : '#f4e3c1';
  rr(ctx, -27, -2, 54, 3.5, 2); ctx.fill();
  ctx.restore();
}

function limb(ctx, pts, w, col){
  ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i=1;i<pts.length;i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();
}

// pose: {crouch 0..1, grab bool, flip 0..1|0, arms 'out'|'up'}
function drawSkater(ctx, sk, pose){
  pose = pose || {};
  if (sk.duo){
    drawBoard(ctx, sk, pose.flip || 0, 1.55);
    sk.riders.forEach((r, i) => { ctx.save(); ctx.translate(i ? -20 : 20, 0); ctx.scale(0.8, 0.8); drawSkater(ctx, r, {...pose, noBoard:true}); ctx.restore(); });
    return;
  }
  const s = sk.small ? 0.84 : 1;
  const c = pose.crouch || 0;
  if (!pose.noBoard) drawBoard(ctx, sk, pose.flip || 0);
  ctx.save(); ctx.scale(s, s);
  const ink = '#1f1a2e';
  const hipY = -34 + c*12 + (pose.grab ? 6 : 0);
  const shY = hipY - 24 + c*3;
  const shX = 3 + c*4;
  // legs
  const kneeY = (hipY - 7)/2 - 2;
  limb(ctx, [[0,hipY],[-12 - c*3, kneeY],[-13,-8]], 7, sk.pants);
  limb(ctx, [[0,hipY],[12 + c*4, kneeY],[13,-8]], 7, sk.pants);
  ctx.fillStyle = ink; rr(ctx,-19,-10,12,5,2); ctx.fill(); rr(ctx,7,-10,12,5,2); ctx.fill();
  // demon tail
  if (sk.type === 'demon'){
    ctx.strokeStyle = sk.head; ctx.lineWidth = 3; ctx.beginPath();
    ctx.moveTo(-3, hipY); ctx.quadraticCurveTo(-26, hipY+4, -24, hipY-16); ctx.stroke();
    ctx.fillStyle = sk.head; ctx.beginPath(); ctx.moveTo(-24,hipY-22); ctx.lineTo(-29,hipY-13); ctx.lineTo(-19,hipY-14); ctx.fill();
  }
  // torso
  if (sk.type === 'crab'){
    ctx.fillStyle = sk.shirt; ctx.strokeStyle = ink; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(shX-1, hipY-12, 22, 15, 0, 0, 7); ctx.fill(); ctx.stroke();
  } else {
    limb(ctx, [[0,hipY],[shX,shY]], 13, ink);
    limb(ctx, [[0,hipY],[shX,shY]], 10, sk.shirt);
    if (sk.num){ ctx.fillStyle = sk.cap || '#ffc531'; ctx.font = 'bold 9px Futura, sans-serif'; ctx.textAlign='center'; ctx.fillText(sk.num, shX*0.6, (hipY+shY)/2+3); }
  }
  // arms
  const armCol = sk.type==='astro' ? sk.shirt : (sk.type==='kid' ? sk.head : sk.head);
  const armW = sk.type==='crab' ? 6 : 5;
  let a1, a2;
  if (pose.grab){ a1 = [[shX,shY+3],[shX+10,hipY+4],[10,-12]]; a2 = [[shX,shY+3],[shX-16,shY-8],[shX-22,shY-20]]; }
  else if (pose.arms === 'up'){ a1 = [[shX,shY+3],[shX+12,shY-10],[shX+16,shY-24]]; a2 = [[shX,shY+3],[shX-12,shY-10],[shX-16,shY-24]]; }
  else { a1 = [[shX,shY+3],[shX+13,shY+9],[shX+24,shY+6]]; a2 = [[shX,shY+3],[shX-13,shY+10],[shX-22,shY+16]]; }
  limb(ctx, a2, armW, sk.type==='kid' ? sk.shirt : armCol);
  limb(ctx, a1, armW, sk.type==='kid' ? sk.shirt : armCol);
  if (sk.type === 'crab'){
    for (const a of [a1,a2]){ const e = a[a.length-1]; ctx.fillStyle = sk.head; ctx.strokeStyle=ink; ctx.lineWidth=2.5;
      ctx.beginPath(); ctx.arc(e[0], e[1], 8, 0.5, 5.6); ctx.lineTo(e[0], e[1]); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  } else {
    ctx.fillStyle = sk.type==='kid' ? sk.head : (sk.type==='astro' ? '#ddd' : sk.head);
    for (const a of [a1,a2]){ const e=a[a.length-1]; ctx.beginPath(); ctx.arc(e[0],e[1],3.2,0,7); ctx.fill(); }
  }
  // head
  const hx = shX + 2, hy = shY - 13;
  ctx.strokeStyle = ink; ctx.lineWidth = 2.5;
  if (sk.type === 'fruit'){
    ctx.fillStyle = sk.head; ctx.beginPath(); ctx.ellipse(hx, hy, 15, 14, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.beginPath(); ctx.ellipse(hx-6, hy-6, 4, 2.5, -0.6, 0, 7); ctx.fill();
    if (sk.acc === 'beanie'){ ctx.fillStyle='#e5392b'; ctx.beginPath(); ctx.arc(hx, hy-5, 14, Math.PI, 0); ctx.fill(); ctx.stroke(); ctx.fillStyle='#fff'; ctx.fillRect(hx-14,hy-7,28,4); ctx.beginPath(); ctx.arc(hx,hy-20,4,0,7); ctx.fill(); }
    else { ctx.strokeStyle='#2c9a58'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(hx,hy-13); ctx.lineTo(hx+1,hy-20); ctx.stroke();
      ctx.fillStyle='#3fbf6e'; ctx.beginPath(); ctx.ellipse(hx+7,hy-18,7,3,-0.4,0,7); ctx.fill(); ctx.beginPath(); ctx.ellipse(hx-6,hy-16,6,2.6,0.5,0,7); ctx.fill(); }
    if (sk.acc === 'shades'){ ctx.fillStyle=ink; rr(ctx,hx-2,hy-4,17,6,2); ctx.fill(); }
    else { ctx.fillStyle=ink; ctx.beginPath(); ctx.arc(hx+5,hy-2,2,0,7); ctx.arc(hx+11,hy-2,2,0,7); ctx.fill(); }
    if (sk.acc === 'mustache'){ ctx.fillStyle=ink; ctx.beginPath(); ctx.ellipse(hx+5,hy+5,5,2.2,0.3,0,7); ctx.ellipse(hx+12,hy+5,5,2.2,-0.3,0,7); ctx.fill(); }
    else { ctx.strokeStyle=ink; ctx.lineWidth=1.8; ctx.beginPath(); ctx.arc(hx+8,hy+3,4,0.2,2.6); ctx.stroke(); }
  } else if (sk.type === 'kid'){
    const hc = sk.hairCol;
    if (sk.hair === 'long'){ ctx.fillStyle = hc; rr(ctx, hx-13, hy-6, 14, 26, 6); ctx.fill(); }
    if (sk.hair === 'bun'){ ctx.fillStyle = hc; ctx.beginPath(); ctx.arc(hx-8, hy-12, 6, 0, 7); ctx.fill(); }
    ctx.fillStyle = sk.head; ctx.beginPath(); ctx.arc(hx, hy, 11, 0, 7); ctx.fill(); ctx.stroke();
    if (sk.hair){
      ctx.fillStyle = hc;
      if (sk.hair === 'curly'){ for (const [ox,oy] of [[-8,-6],[-3,-10],[3,-10],[8,-7],[-10,0]]){ ctx.beginPath(); ctx.arc(hx+ox, hy+oy, 5, 0, 7); ctx.fill(); } }
      else if (sk.hair === 'spiky'){ ctx.beginPath(); ctx.moveTo(hx-11,hy-2);
        for (let i=0;i<5;i++){ ctx.lineTo(hx-9+i*5, hy-17+(i%2)*3); ctx.lineTo(hx-6+i*5, hy-8); } ctx.lineTo(hx+11,hy-2); ctx.closePath(); ctx.fill(); }
      else { ctx.beginPath(); ctx.arc(hx, hy-1, 11.5, Math.PI*1.0, Math.PI*1.9); ctx.lineTo(hx+4, hy-5); ctx.closePath(); ctx.fill(); }
      if (sk.acc === 'headset'){ ctx.strokeStyle='#e5392b'; ctx.lineWidth=2.5; ctx.beginPath(); ctx.arc(hx, hy, 12.5, Math.PI*1.1, Math.PI*1.9); ctx.stroke();
        ctx.fillStyle='#e5392b'; ctx.beginPath(); ctx.arc(hx-2, hy+1, 3.5, 0, 7); ctx.fill();
        ctx.lineWidth=1.8; ctx.beginPath(); ctx.moveTo(hx-2,hy+3); ctx.quadraticCurveTo(hx+2,hy+10,hx+9,hy+8); ctx.stroke(); }
      ctx.strokeStyle = ink;
    } else {
      ctx.fillStyle = sk.cap; ctx.beginPath(); ctx.arc(hx, hy-2, 11.5, Math.PI*1.05, Math.PI*1.95); ctx.closePath(); ctx.fill();
      rr(ctx, sk.backwards ? hx-22 : hx+4, hy-6, 18, 4, 2); ctx.fill();
    }
    ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(hx+6, hy+1, 1.8, 0, 7); ctx.fill();
    ctx.lineWidth=1.6; ctx.beginPath(); ctx.arc(hx+5,hy+4,3,0.3,2.4); ctx.stroke();
  } else if (sk.type === 'demon'){
    ctx.fillStyle = sk.head;
    ctx.beginPath(); ctx.moveTo(hx-8,hy-8); ctx.lineTo(hx-12,hy-24); ctx.lineTo(hx-2,hy-11); ctx.fill();
    ctx.beginPath(); ctx.moveTo(hx+6,hy-9); ctx.lineTo(hx+14,hy-24); ctx.lineTo(hx+11,hy-6); ctx.fill();
    ctx.beginPath(); ctx.arc(hx, hy, 12, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffc531'; ctx.beginPath(); ctx.moveTo(hx+2,hy-3); ctx.lineTo(hx+9,hy-1); ctx.lineTo(hx+3,hy+1); ctx.fill();
    ctx.beginPath(); ctx.moveTo(hx+10,hy-3); ctx.lineTo(hx+14,hy-1); ctx.lineTo(hx+10,hy+1); ctx.fill();
    ctx.strokeStyle='#fff'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(hx+3,hy+6); ctx.lineTo(hx+5,hy+4); ctx.lineTo(hx+7,hy+6); ctx.lineTo(hx+9,hy+4); ctx.lineTo(hx+11,hy+6); ctx.stroke();
  } else if (sk.type === 'astro'){
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(hx, hy, 15, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#4fb3d9'; ctx.beginPath(); ctx.ellipse(hx+5, hy, 9, 8, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,.7)'; ctx.beginPath(); ctx.ellipse(hx+2,hy-3,3,2,-0.5,0,7); ctx.fill();
    ctx.strokeStyle=ink; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(hx-8,hy-12); ctx.lineTo(hx-12,hy-22); ctx.stroke();
    ctx.fillStyle='#e5392b'; ctx.beginPath(); ctx.arc(hx-12,hy-23,3,0,7); ctx.fill();
  } else if (sk.type === 'crab'){
    const ey = hipY - 30;
    ctx.strokeStyle = ink; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(shX-6, hipY-24); ctx.lineTo(shX-7, ey); ctx.moveTo(shX+8, hipY-24); ctx.lineTo(shX+9, ey); ctx.stroke();
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(shX-7,ey,5,0,7); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(shX+9,ey,5,0,7); ctx.fill(); ctx.stroke();
    ctx.fillStyle=ink; ctx.beginPath(); ctx.arc(shX-5,ey,2,0,7); ctx.arc(shX+11,ey,2,0,7); ctx.fill();
    ctx.fillStyle='#ffc531'; ctx.beginPath(); const cy = ey-8;
    ctx.moveTo(shX-12,cy); ctx.lineTo(shX-12,cy-12); ctx.lineTo(shX-6,cy-6); ctx.lineTo(shX+1,cy-14); ctx.lineTo(shX+8,cy-6); ctx.lineTo(shX+14,cy-12); ctx.lineTo(shX+14,cy); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle=ink; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(shX+2,hipY-8,6,0.3,2.8); ctx.stroke();
  }
  ctx.restore();
}

// Portrait for character select cards
function drawPortrait(cv, sk, t){
  const dpr = window.devicePixelRatio || 1;
  const w = cv.clientWidth, h = cv.clientHeight;
  if (cv.width !== Math.round(w*dpr)) { cv.width = Math.round(w*dpr); cv.height = Math.round(h*dpr); }
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,w,h);
  ctx.fillStyle = sk.head + '33'; ctx.beginPath(); ctx.arc(w/2, h*0.55, Math.min(w,h)*0.42, 0, 7); ctx.fill();
  const sc = Math.min(w, h) / 100;
  ctx.save(); ctx.translate(w/2, h*0.92 + Math.sin((t||0)/300)*2); ctx.scale(sc, sc);
  drawSkater(ctx, sk, {crouch: 0.15});
  ctx.restore();
}
