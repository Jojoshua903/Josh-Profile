// Parametric clay-style avatar renderer + character presets
let AVUID = 0;
function shade(hex, amt){
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const t = amt < 0 ? 0 : 255, p = Math.abs(amt);
  r = Math.round((t - r) * p + r); g = Math.round((t - g) * p + g); b = Math.round((t - b) * p + b);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

const LOOK_OPTS = {
  skin: ['#FFC93C','#FFE0C7','#F6C9A4','#F1C29A','#E2A877','#C68A5B','#9C6643','#6E452D','#FFF3DC','#C9B6FF','#9FE3C9'],
  head: [['round','Round'],['egg','Egg'],['square','Square'],['tall','Tall']],
  hair: [['none','Bald'],['short','Short'],['spiky','Spiky'],['curly','Curly'],['long','Long'],['bob','Bob'],['bun','Bun'],['mohawk','Mohawk'],['afro','Afro'],['tufts','Tufts']],
  hairCol: ['#2B2233','#5A3A24','#A8642E','#E7B85C','#F2E3B8','#DCDCE4','#FF5A3C','#2F4BFF','#FF8FB1','#3DDBB4'],
  eyes: [['dot','Dots'],['happy','Happy'],['wide','Wide'],['sleepy','Sleepy'],['wink','Wink']],
  mouth: [['smile','Smile'],['grin','Grin'],['flat','Flat'],['o','Ooh'],['smirk','Smirk']],
  hat: [['none','None'],['headband','Headband'],['cap','Flat cap'],['beanie','Beanie'],['crown','Crown'],['party','Party hat']],
  hatCol: ['#FF5A3C','#2F4BFF','#2E9A55','#FFD45C','#9B6BFF','#2B2233','#FF8FB1','#FFFFFF'],
  eyewear: [['none','None'],['glasses','Glasses'],['shades','Shades'],['monocle','Monocle'],['blinding','Blinding specs']],
  extras: [['medal','Medal'],['bowtie','Bow tie'],['paddle','Paddle'],['shamrock','Shamrock'],['mic','Mic'],['crack','Egg crack']],
  shirt: ['#2F4BFF','#FF5A3C','#3DDBB4','#FFD45C','#9B6BFF','#2B2233','#FF8FB1','#2E9A55','#FFFFFF','#FF9A3C'],
  bg: ['#FFD45C','#FFB3C1','#C8F2DF','#C9DBFF','#E6DAFF','#FFE1C2','#F4F1EA','#BFF0FF']
};

const PRESETS = {
  chemmy: {skin:'#F1C29A', head:'round', hair:'tufts', hairCol:'#DCDCE4', eyes:'happy', brows:true, mouth:'smile', cheeks:true, freckles:false, hat:'headband', hatCol:'#FF5A3C', eyewear:'none', extras:['medal','paddle'], shirt:'#2F4BFF', bg:'#FFD45C'},
  sichen: {skin:'#E2A877', head:'round', hair:'spiky', hairCol:'#2B2233', eyes:'happy', brows:true, mouth:'grin', cheeks:true, freckles:false, hat:'none', hatCol:'#FF5A3C', eyewear:'none', extras:['bowtie','mic'], shirt:'#3DDBB4', bg:'#FFB3C1'},
  fyon:   {skin:'#FFF3DC', head:'egg', hair:'none', hairCol:'#A8642E', eyes:'dot', brows:false, mouth:'smile', cheeks:true, freckles:true, hat:'cap', hatCol:'#2E9A55', eyewear:'none', extras:['shamrock','crack'], shirt:'#2E9A55', bg:'#C8F2DF'},
  jacques:{skin:'#F6C9A4', head:'tall', hair:'short', hairCol:'#5A3A24', eyes:'dot', brows:true, mouth:'smirk', cheeks:false, freckles:false, hat:'none', hatCol:'#2B2233', eyewear:'blinding', extras:['bowtie'], shirt:'#2B2233', bg:'#C9DBFF'}
};
function defaultLook(i = 0){
  const hairs = ['short','bob','curly','bun'], cols = [['#2F4BFF','#C9DBFF'],['#FF5A3C','#FFE1C2'],['#9B6BFF','#E6DAFF'],['#FF9A3C','#BFF0FF']][i % 4];
  return {skin: LOOK_OPTS.skin[1 + i % 7], head:'round', hair: hairs[i % 4], hairCol: LOOK_OPTS.hairCol[(i * 3) % 6], eyes:'dot', brows:true, mouth:'smile', cheeks:true, freckles:false,
          hat:'none', hatCol:'#FF5A3C', eyewear:'none', extras:[], shirt: cols[0], bg: cols[1]};
}
function randomLook(){
  const pick = a => a[Math.floor(Math.random() * a.length)], key = a => pick(a)[0];
  const ex = LOOK_OPTS.extras.map(e => e[0]).filter(e => e !== 'crack' && Math.random() < .22);
  const head = Math.random() < .15 ? 'egg' : Math.random() < .2 ? 'square' : 'round';
  if(head === 'egg' && Math.random() < .5) ex.push('crack');
  return {skin: pick(LOOK_OPTS.skin), head, hair: key(LOOK_OPTS.hair), hairCol: pick(LOOK_OPTS.hairCol), eyes: key(LOOK_OPTS.eyes), brows: Math.random() < .6,
          mouth: key(LOOK_OPTS.mouth), cheeks: Math.random() < .6, freckles: Math.random() < .3, hat: Math.random() < .5 ? 'none' : key(LOOK_OPTS.hat),
          hatCol: pick(LOOK_OPTS.hatCol), eyewear: Math.random() < .65 ? 'none' : key(LOOK_OPTS.eyewear), extras: ex.slice(0, 2), shirt: pick(LOOK_OPTS.shirt), bg: pick(LOOK_OPTS.bg)};
}

// o.bare = no backdrop circle (for standing on the studio set)
function drawAvatar(c, o = {}){
  const u = 'a' + (++AVUID), ink = '#2B2233';
  const sk = c.skin, skE = shade(sk, -.32), hc = c.hairCol, hcE = shade(hc, -.3), hat = c.hatCol, ex = c.extras || [];
  const egg = c.head === 'egg', sq = c.head === 'square', tall = c.head === 'tall';
  const has = k => ex.includes(k);
  const defs = `<defs>
    <radialGradient id="${u}bg" cx="40%" cy="30%" r="80%"><stop offset="0" stop-color="${shade(c.bg, .55)}"/><stop offset="1" stop-color="${c.bg}"/></radialGradient>
    <radialGradient id="${u}sk" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="${shade(sk, .35)}"/><stop offset=".6" stop-color="${sk}"/><stop offset="1" stop-color="${shade(sk, -.14)}"/></radialGradient>
    <linearGradient id="${u}sh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(c.shirt, .22)}"/><stop offset="1" stop-color="${shade(c.shirt, -.18)}"/></linearGradient>
    <linearGradient id="${u}hr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(hc, .25)}"/><stop offset="1" stop-color="${shade(hc, -.15)}"/></linearGradient>
    <linearGradient id="${u}ht" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(hat, .25)}"/><stop offset="1" stop-color="${shade(hat, -.2)}"/></linearGradient>
    <clipPath id="${u}cl"><circle cx="60" cy="60" r="58"/></clipPath></defs>`;
  const HS = `stroke="${hcE}" stroke-width="1.6" fill="url(#${u}hr)"`;
  const hy = egg ? -6 : tall ? -12 : 0;

  const hairBack = {
    long: `<path d="M33 50c0-20 12-29 27-29s27 9 27 29v32c0 5-7 7-11 4V58H44v28c-4 3-11 1-11-4z" ${HS}/>`,
    bob: `<path d="M31 52c0-20 12-31 29-31s29 11 29 31v14c0 4-4 5-7 4V52H38v18c-3 1-7 0-7-4z" ${HS}/>`,
    afro: `<circle cx="60" cy="44" r="35" ${HS}/>`,
    curly: `<g ${HS}><circle cx="34" cy="52" r="8"/><circle cx="86" cy="52" r="8"/></g>`
  }[c.hair] || '';
  const hairFront = {
    short: `<path d="M35 ${48 + hy / 2}c0-17 11-26 25-26s25 9 25 26c-4-7-12-11-25-11s-21 4-25 11z" ${HS}/>`,
    spiky: `<path d="M34 47 36 24l9 9 5-15 7 12 7-14 5 14 8-10 3 14 7-6-1 19c-10-8-42-8-52 0z" ${HS} stroke-linejoin="round"/>`,
    curly: `<g ${HS}>${[36,46,56,66,76,84].map((x, i) => `<circle cx="${x}" cy="${33 + (i % 2) * 4}" r="${8 + (i % 2)}"/>`).join('')}</g>`,
    long: `<path d="M35 46c2-15 12-22 25-22s23 7 25 22c-10-6-18-8-25-8-3 4-9 7-25 8z" ${HS}/>`,
    bob: `<path d="M34 46c3-14 12-22 26-22s23 8 26 22z" ${HS}/>`,
    bun: `<circle cx="60" cy="19" r="9" ${HS}/><path d="M35 48c0-17 11-26 25-26s25 9 25 26c-4-7-12-11-25-11s-21 4-25 11z" ${HS}/>`,
    mohawk: `<path d="M54 38 51 12l8 7 3-11 6 10-2 20z" ${HS} stroke-linejoin="round"/>`,
    afro: `<path d="M37 42c4-10 12-14 23-14s19 4 23 14c-8-4-16-5-23-5s-15 1-23 5z" ${HS}/>`,
    tufts: `<g ${HS}><path d="M33 52c-7-3-8-14 0-17 0-7 7-10 12-8M87 52c7-3 8-14 0-17 0-7-7-10-12-8"/><path d="M45 30c5-5 25-5 30 0-6-2-24-2-30 0z"/></g>`
  }[c.hair] || '';

  const head = tall ? `<ellipse cx="60" cy="46" rx="22" ry="35" fill="url(#${u}sk)" stroke="${skE}" stroke-width="2"/>`
    : egg ? `<ellipse cx="60" cy="50" rx="25" ry="31" fill="url(#${u}sk)" stroke="${skE}" stroke-width="2"/>`
    : sq ? `<rect x="35" y="28" width="50" height="50" rx="14" fill="url(#${u}sk)" stroke="${skE}" stroke-width="2"/>`
    : `<circle cx="60" cy="52" r="26" fill="url(#${u}sk)" stroke="${skE}" stroke-width="2"/>`;
  const shine = `<ellipse cx="${egg ? 50 : 49}" cy="${egg ? 32 : tall ? 26 : 38}" rx="8" ry="5" fill="#fff" opacity=".35" transform="rotate(-20 50 36)"/>`;

  const E = (x, y) => ({
    dot: `<circle cx="${x}" cy="${y}" r="3.4" fill="${ink}"/><circle cx="${x + 1.2}" cy="${y - 1.2}" r="1.1" fill="#fff"/>`,
    happy: `<path d="M${x - 4} ${y + 1}q4-5.5 8 0" fill="none" stroke="${ink}" stroke-width="3" stroke-linecap="round"/>`,
    wide: `<circle cx="${x}" cy="${y}" r="5.6" fill="#fff" stroke="${skE}" stroke-width="1"/><circle cx="${x + .6}" cy="${y + .4}" r="2.8" fill="${ink}"/><circle cx="${x + 1.6}" cy="${y - .8}" r="1" fill="#fff"/>`,
    sleepy: `<path d="M${x - 4.5} ${y}h9" stroke="${ink}" stroke-width="3" stroke-linecap="round"/><path d="M${x - 3.5} ${y + .5}q3.5 4 7 0" fill="${ink}"/>`
  });
  const ey = 54;
  const eyes = c.eyes === 'wink' ? E(51, ey).dot + E(69, ey).happy : E(51, ey)[c.eyes || 'dot'] + E(69, ey)[c.eyes || 'dot'];
  const brows = c.brows ? `<path d="M46 ${ey - 8}q5-3 9-1M65 ${ey - 9}q5-2 9 1" fill="none" stroke="${c.hair === 'none' ? shade(sk, -.45) : hcE}" stroke-width="2.6" stroke-linecap="round"/>` : '';
  const M = {
    smile: `<path d="M51 64q9 8 18 0" fill="none" stroke="${ink}" stroke-width="3" stroke-linecap="round"/>`,
    grin: `<path d="M48 62q12 16 24 0z" fill="#fff" stroke="${ink}" stroke-width="2.6" stroke-linejoin="round"/><path d="M53 68q7 4 14 0" fill="none" stroke="#FF5A3C" stroke-width="3" stroke-linecap="round"/>`,
    flat: `<path d="M52 66h16" stroke="${ink}" stroke-width="3" stroke-linecap="round"/>`,
    o: `<ellipse cx="60" cy="66" rx="4.5" ry="5.5" fill="${ink}"/><ellipse cx="60" cy="68" rx="2.5" ry="2" fill="#FF7A7A"/>`,
    smirk: `<path d="M51 66q9 4 18-4" fill="none" stroke="${ink}" stroke-width="3" stroke-linecap="round"/>`
  }[c.mouth || 'smile'];
  const cheeks = c.cheeks ? `<circle cx="43" cy="63" r="4.5" fill="#FF7A9A" opacity=".35"/><circle cx="77" cy="63" r="4.5" fill="#FF7A9A" opacity=".35"/>` : '';
  const frk = c.freckles ? `<g fill="${shade(sk, -.4)}" opacity=".6">${[[45,60],[48,62],[44,64],[75,60],[72,62],[76,64]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.1"/>`).join('')}</g>` : '';

  const HT = `fill="url(#${u}ht)" stroke="${shade(hat, -.35)}" stroke-width="1.6"`;
  const hats = {
    headband: `<path d="M34 ${41 + hy / 2}c14-6 38-6 52 0v7c-14-6-38-6-52 0z" ${HT}/><path d="M86 ${43 + hy / 2}l9-4-2 8z" ${HT}/>`,
    cap: `<path d="M33 ${38 + hy}c2-13 14-19 27-19s25 6 27 19c-9-4-45-4-54 0z" ${HT}/><path d="M30 ${41 + hy}c11-5 50-6 64-1-3 3-6 4-9 3-14-4-38-4-48 0-3 0-6 0-7-2z" ${HT}/>`,
    beanie: `<path d="M34 ${44 + hy}c0-16 12-25 26-25s26 9 26 25z" ${HT}/><rect x="32" y="${40 + hy}" width="56" height="8" rx="4" ${HT}/><circle cx="60" cy="${17 + hy}" r="6" fill="#fff" stroke="${shade(hat, -.35)}" stroke-width="1.6"/>`,
    crown: `<path d="M40 ${36 + hy}l2-16 9 9 9-13 9 13 9-9 2 16z" fill="#FFD45C" stroke="#C99A1E" stroke-width="1.8" stroke-linejoin="round"/><circle cx="60" cy="${28 + hy}" r="2.6" fill="#FF5A3C"/>`,
    party: `<path d="M48 ${30 + hy}l12-26 12 26z" ${HT}/><path d="M52 ${22 + hy}h16M55 ${14 + hy}h10" stroke="#fff" stroke-width="3" opacity=".7"/><circle cx="60" cy="${4 + hy}" r="4" fill="#FFD45C"/>`
  };
  const eyew = {
    glasses: `<g fill="none" stroke="${ink}" stroke-width="2.4"><circle cx="51" cy="${ey}" r="7.5" fill="#fff" fill-opacity=".25"/><circle cx="69" cy="${ey}" r="7.5" fill="#fff" fill-opacity=".25"/><path d="M58.5 ${ey}h3M43.5 ${ey - 1}l-8-2M76.5 ${ey - 1}l8-2"/></g>`,
    shades: `<g><rect x="41" y="${ey - 6}" width="16" height="11" rx="5" fill="${ink}"/><rect x="63" y="${ey - 6}" width="16" height="11" rx="5" fill="${ink}"/><path d="M57 ${ey - 2}h6" stroke="${ink}" stroke-width="2.4"/><path d="M44 ${ey - 3}l5 0M66 ${ey - 3}l5 0" stroke="#fff" stroke-width="2" opacity=".6" stroke-linecap="round"/></g>`,
    monocle: `<circle cx="69" cy="${ey}" r="7.5" fill="#fff" fill-opacity=".25" stroke="#C99A1E" stroke-width="2.4"/><path d="M76 ${ey + 3}q4 14-6 22" fill="none" stroke="#C99A1E" stroke-width="1.4"/>`,
    blinding: `<g class="glare"><rect x="40" y="${ey - 7}" width="18" height="13" rx="3" fill="#fff" stroke="${ink}" stroke-width="2.6"/><rect x="62" y="${ey - 7}" width="18" height="13" rx="3" fill="#fff" stroke="${ink}" stroke-width="2.6"/>
      <path d="M58 ${ey - 2}h4" stroke="${ink}" stroke-width="2.6"/><circle cx="49" cy="${ey - 1}" r="10" fill="#FFF7B0" opacity=".55"/><circle cx="71" cy="${ey - 1}" r="10" fill="#FFF7B0" opacity=".55"/>
      <path d="M71 ${ey - 14}v26M58 ${ey - 1}h26M62 ${ey - 10}l18 18M80 ${ey - 10}l-18 18" stroke="#fff" stroke-width="1.6" stroke-linecap="round" class="spark"/></g>`
  };
  const crack = has('crack') ? `<path d="M70 ${24 + (tall ? -6 : 0)}l-3 6 5 3-4 6" fill="none" stroke="${skE}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>` : '';
  const bodyExtra = [
    has('bowtie') ? `<path d="M50 86l10 5 10-5v11l-10-5-10 5z" fill="#FFD45C" stroke="#C99A1E" stroke-width="1.6" stroke-linejoin="round"/><circle cx="60" cy="91.5" r="2.6" fill="#C99A1E"/>` : '',
    has('medal') ? `<path d="M52 84l8 14 8-14" fill="none" stroke="#FF5A3C" stroke-width="4"/><circle cx="60" cy="102" r="7" fill="#FFD45C" stroke="#C99A1E" stroke-width="2"/><path d="M57 102l2 2 4-4" fill="none" stroke="#C99A1E" stroke-width="1.6"/>` : '',
    has('shamrock') ? `<g transform="translate(76 98)"><circle cx="-3" cy="-2" r="3.2" fill="#2E9A55"/><circle cx="3" cy="-2" r="3.2" fill="#2E9A55"/><circle cx="0" cy="-6" r="3.2" fill="#2E9A55"/><path d="M0 -2l1 6" stroke="#1E6E3A" stroke-width="1.4"/></g>` : '',
    has('paddle') ? `<g transform="rotate(-24 100 74)"><rect x="96" y="76" width="8" height="22" rx="3" fill="#B07A4E" stroke="#7A5233" stroke-width="1.6"/><ellipse cx="100" cy="62" rx="14" ry="16" fill="#FF5A3C" stroke="#B8321C" stroke-width="2"/><ellipse cx="96" cy="56" rx="5" ry="3" fill="#fff" opacity=".35"/></g>` : '',
    has('mic') ? `<g transform="rotate(18 22 84)"><rect x="19" y="84" width="7" height="22" rx="3" fill="#2B2233"/><circle cx="22.5" cy="80" r="7.5" fill="#C9CBD6" stroke="#8D90A0" stroke-width="1.6"/><path d="M17 78h11M17 82h11" stroke="#8D90A0" stroke-width="1"/></g>` : ''
  ].join('');
  const body = `<g class="bodyg"><path d="M20 122c3-26 18-38 40-38s37 12 40 38z" fill="url(#${u}sh)" stroke="${shade(c.shirt, -.35)}" stroke-width="2"/>
      <path d="M50 84q10 8 20 0" fill="none" stroke="${shade(c.shirt, -.3)}" stroke-width="2"/>
      <rect x="53" y="74" width="14" height="12" rx="6" fill="${shade(sk, -.08)}"/>${bodyExtra}</g>`;

  return `<svg viewBox="0 0 120 120" class="av${o.bare ? ' bare' : ''}" aria-hidden="true">${defs}
    ${o.bare ? body : `<circle cx="60" cy="60" r="58" fill="url(#${u}bg)"/><g clip-path="url(#${u}cl)"><circle cx="96" cy="22" r="20" fill="#fff" opacity=".25"/>${body}</g>`}
    <g class="headg">
      ${hairBack}${head}${shine}${hairFront}${crack}
      ${frk}${cheeks}<g class="eyes">${eyes}</g>${brows}<g class="mouth">${M}</g>
      ${hats[c.hat] || ''}${eyew[c.eyewear] || ''}
    </g></svg>`;
}

const AV = {};
['chemmy', 'sichen', 'fyon', 'jacques'].forEach(k => Object.defineProperty(AV, k, {get: () => drawAvatar(PRESETS[k])}));
const AVB = k => drawAvatar(PRESETS[k], {bare: true});
