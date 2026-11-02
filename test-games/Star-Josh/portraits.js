// SVG portraits for comms and character select.
const W = (bg, body) => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="${bg}"/>${body}</svg>`;
const eyes = (y = 52, gap = 11, c = '#132044', r = 4) => `<circle cx="${50 - gap}" cy="${y}" r="${r}" fill="${c}"/><circle cx="${50 + gap}" cy="${y}" r="${r}" fill="${c}"/><circle cx="${51 - gap}" cy="${y - 1.4}" r="1.3" fill="#fff"/><circle cx="${51 + gap}" cy="${y - 1.4}" r="1.3" fill="#fff"/>`;
const MOUTH = {
  smile: '<path d="M42 64 Q50 71 58 64" stroke="#5a1e2a" stroke-width="2.6" fill="none" stroke-linecap="round"/>',
  grin: '<path d="M40 62 Q50 74 60 62Z" fill="#5a1e2a"/><path d="M42 63 L58 63" stroke="#fff" stroke-width="2"/>',
  flat: '<path d="M43 65 L57 65" stroke="#5a1e2a" stroke-width="2.6" stroke-linecap="round"/>',
  frown: '<path d="M42 67 Q50 61 58 67" stroke="#5a1e2a" stroke-width="2.6" fill="none" stroke-linecap="round"/>',
  open: '<ellipse cx="50" cy="65" rx="6" ry="5" fill="#5a1e2a"/>',
  smirk: '<path d="M43 65 Q52 68 58 61" stroke="#5a1e2a" stroke-width="2.6" fill="none" stroke-linecap="round"/>',
};
const HAIR = {
  short: c => `<path d="M24 50 Q24 24 50 24 Q76 24 76 50 Q72 36 50 35 Q30 36 24 50Z" fill="${c}"/>`,
  messy: c => `<path d="M23 52 Q20 26 40 22 Q46 14 56 20 Q72 16 78 34 Q82 44 76 52 Q72 38 60 36 Q52 42 44 35 Q30 38 23 52Z" fill="${c}"/>`,
  spiky: c => `<path d="M24 48 L22 30 L32 36 L34 18 L44 30 L50 12 L56 30 L66 18 L68 36 L78 30 L76 48 Q66 36 50 36 Q34 36 24 48Z" fill="${c}"/>`,
  bun: c => `<circle cx="50" cy="18" r="11" fill="${c}"/><path d="M23 54 Q22 24 50 24 Q78 24 77 54 Q74 34 50 33 Q28 34 23 54Z" fill="${c}"/>`,
  none: () => '',
};
function human(o) {
  const skin = o.skin, h = HAIR[o.hair || 'short'](o.hairCol || '#2b1d14');
  return W(o.bg, `
    <path d="M14 100 Q18 76 50 74 Q82 76 86 100Z" fill="${o.shirt}"/>${o.collar || ''}
    <circle cx="23" cy="54" r="6" fill="${skin}"/><circle cx="77" cy="54" r="6" fill="${skin}"/>
    <ellipse cx="50" cy="52" rx="${o.fat ? 30 : 26}" ry="${o.fat ? 27 : 28}" fill="${skin}"/>${o.under || ''}${h}
    ${eyes(52, 11)}${o.brows || ''}<path d="M48 58 Q50 61 52 58" stroke="rgba(90,30,42,.5)" stroke-width="2" fill="none"/>
    ${MOUTH[o.mouth || 'smile']}${o.extra || ''}`);
}
const cap = (c, back) => back
  ? `<path d="M24 44 Q26 22 50 22 Q74 22 76 44Z" fill="${c}"/><rect x="66" y="38" width="20" height="6" rx="3" fill="${c}"/><circle cx="50" cy="22" r="3" fill="#fff"/>`
  : `<path d="M24 44 Q26 22 50 22 Q74 22 76 44Z" fill="${c}"/><path d="M22 44 Q50 36 84 46 L84 50 Q50 42 22 48Z" fill="${c}"/><circle cx="50" cy="22" r="3" fill="#fff"/>`;
const wizard = (c, trim) => `<path d="M22 40 Q50 32 78 40 L74 44 Q50 38 26 44Z" fill="${c}"/><path d="M30 40 L54 2 L70 40Z" fill="${c}"/><path d="M28 40 Q50 34 72 40" stroke="${trim}" stroke-width="3" fill="none"/>`;
const glassesSvg = c => `<circle cx="39" cy="52" r="8" fill="none" stroke="${c}" stroke-width="2.5"/><circle cx="61" cy="52" r="8" fill="none" stroke="${c}" stroke-width="2.5"/><path d="M47 51 L53 51" stroke="${c}" stroke-width="2.5"/>`;
const angry = '<path d="M32 42 L45 46 M68 42 L55 46" stroke="#2b1d14" stroke-width="3" stroke-linecap="round"/>';

export const PORTRAITS = {
  nathan: human({ bg: '#ffd6d6', skin: '#f1c27d', shirt: '#e63946', hairCol: '#3b2a1a', mouth: 'grin', extra: cap('#e63946') + '<text x="50" y="96" text-anchor="middle" font-size="14" font-weight="900" fill="#fff" font-family="Futura,Trebuchet MS,sans-serif">17</text><rect x="74" y="58" width="6" height="40" rx="3" fill="#c68642" transform="rotate(20 77 78)"/>' }),
  adam: human({ bg: '#e9f7c6', skin: '#e0ac69', shirt: '#fff', hair: 'messy', hairCol: '#6b4423', mouth: 'smirk', extra: '<rect x="24" y="36" width="52" height="6" rx="3" fill="#ff006e"/><circle cx="84" cy="80" r="11" fill="none" stroke="#ff006e" stroke-width="3"/><rect x="82" y="90" width="4" height="12" fill="#1b1b1b"/><circle cx="16" cy="86" r="5" fill="#d4ff3a"/>' }),
  ash: human({ bg: '#d6e4ff', skin: '#f1c27d', shirt: '#3a86ff', hairCol: '#1b1b1b', mouth: 'grin', extra: cap('#3a86ff', true) + '<circle cx="84" cy="84" r="7" fill="#fff"/><path d="M79 80 Q84 84 79 88 M89 80 Q84 84 89 88" stroke="#e63946" stroke-width="1.4" fill="none"/>' }),
  ati: human({ bg: '#ffd1dc', skin: '#d9a066', shirt: '#9d0208', hair: 'bun', hairCol: '#2b1d14', mouth: 'flat', brows: angry, extra: glassesSvg('#3d0a0a') + '<g transform="rotate(-25 82 72)"><rect x="74" y="56" width="14" height="32" rx="7" fill="#ff8fab"/><rect x="73" y="62" width="16" height="7" fill="#fff"/></g>' }),
  daniel: human({ bg: '#ffe0bd', skin: '#c68642', shirt: '#f77f00', hair: 'none', mouth: 'grin', collar: '<rect x="20" y="86" width="60" height="5" fill="#e8e8e8"/>', extra: '<path d="M22 44 Q24 18 50 18 Q76 18 78 44Z" fill="#ffd60a"/><rect x="16" y="40" width="68" height="6" rx="3" fill="#ffc300"/><circle cx="84" cy="84" r="9" fill="#1b1b1b"/><path d="M84 75 Q88 70 86 66" stroke="#c68642" stroke-width="2" fill="none"/><circle cx="86" cy="65" r="3" fill="#ffd23f"/>' }),
  dean: human({ bg: '#e7d4ff', skin: '#8d5524', shirt: '#7b2cbf', hairCol: '#111', mouth: 'smirk', extra: cap('#5a189a', true) + '<path d="M22 50 Q22 18 50 18 Q78 18 78 50" stroke="#111" stroke-width="4" fill="none"/><rect x="15" y="44" width="10" height="16" rx="4" fill="#00f5d4"/><rect x="75" y="44" width="10" height="16" rx="4" fill="#00f5d4"/>' }),
  deniz: human({ bg: '#d3f5ff', skin: '#f1c27d', shirt: '#1e6091', hairCol: '#1b1b1b', mouth: 'flat', extra: wizard('#1e6091', '#e0fbff') + '<path d="M84 100 L84 58" stroke="#e0fbff" stroke-width="3"/><path d="M84 46 L90 56 L84 66 L78 56Z" fill="#9be7ff"/><circle cx="16" cy="30" r="2" fill="#fff"/><circle cx="12" cy="70" r="2" fill="#fff"/>' }),
  dih: W('#ffe3ec', `<path d="M50 100 Q30 92 40 82 Q54 74 46 66" stroke="#ff8fab" stroke-width="20" fill="none" stroke-linecap="round"/><path d="M36 86 Q48 82 54 88" stroke="#ff5c8a" stroke-width="5" fill="none"/>
    <circle cx="50" cy="48" r="24" fill="#ff8fab"/><circle cx="41" cy="44" r="7" fill="#fff"/><circle cx="42" cy="45" r="3.6" fill="#132044"/><path d="M54 45 Q60 41 66 45" stroke="#132044" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M38 56 Q50 68 62 56" stroke="#5a1e2a" stroke-width="3" fill="none"/><path d="M52 61 Q55 70 60 63Z" fill="#ff3d7f"/>`),
  enno: human({ bg: '#cdeee9', skin: '#ffdbc4', shirt: '#f8f9fa', hair: 'messy', hairCol: '#8b5a2b', mouth: 'smile', collar: '<path d="M40 76 L50 90 L60 76" fill="#2a9d8f"/>', extra: glassesSvg('#1b1b1b') + '<text x="14" y="26" font-size="16" fill="#2a9d8f" font-family="Georgia">π</text><text x="78" y="28" font-size="16" fill="#2a9d8f" font-family="Georgia">Σ</text><text x="80" y="90" font-size="16" fill="#2a9d8f" font-family="Georgia">∫</text>' }),
  fionn: human({ bg: '#d8f3dc', skin: '#ffdbc4', shirt: '#2d6a4f', hairCol: '#c1440e', mouth: 'grin', under: '<path d="M26 56 Q30 86 50 86 Q70 86 74 56 Q66 70 50 70 Q34 70 26 56Z" fill="#c1440e"/>', extra: '<path d="M22 40 Q26 22 50 22 Q74 22 78 40Z" fill="#6b705c"/><path d="M22 40 Q50 32 82 42 L80 46 Q50 38 22 44Z" fill="#585f4b"/><polygon points="80,74 92,78 90,90 78,92 72,82" fill="#8d8d8d"/>' }),
  guiseppe: W('#ffe1d6', `<path d="M50 30 Q22 18 18 52 Q20 90 50 88 Q80 90 82 52 Q78 18 50 30Z" fill="#d62828"/><path d="M30 40 Q34 34 40 36" stroke="#ff8a8a" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M50 30 Q50 18 54 12" stroke="#6b4423" stroke-width="4" fill="none"/><path d="M54 18 Q66 10 72 18 Q62 24 54 18Z" fill="#52b788"/>
    ${eyes(50, 11)}<path d="M33 41 L45 44 M67 41 L55 44" stroke="#1b1b1b" stroke-width="3"/>
    <path d="M50 60 Q40 56 32 62 Q28 66 30 70 Q36 64 50 66 Q64 64 70 70 Q72 66 68 62 Q60 56 50 60Z" fill="#1b1b1b"/><path d="M44 72 Q50 76 56 72" stroke="#5a1e2a" stroke-width="2" fill="none"/>`),
  josh: human({ bg: '#caf0f8', skin: '#f1c27d', shirt: '#00b4d8', hairCol: '#2b1d14', mouth: 'smirk', extra: '<rect x="27" y="44" width="46" height="14" rx="6" fill="#111827"/><rect x="31" y="49" width="38" height="4" rx="2" fill="#48cae4"/><g transform="translate(80 22)"><rect x="-7" y="-2" width="14" height="4" fill="#343a40"/><ellipse cx="-8" cy="-4" rx="6" ry="1.5" fill="#48cae4"/><ellipse cx="8" cy="-4" rx="6" ry="1.5" fill="#48cae4"/></g>' }),
  lars: human({ bg: '#efe0d4', skin: '#ffcba4', shirt: '#8d6e63', hair: 'none', fat: true, mouth: 'flat', brows: angry, under: '<path d="M22 56 Q22 100 50 100 Q78 100 78 56 Q66 74 50 72 Q34 74 22 56Z" fill="#a0522d"/><path d="M34 64 Q50 58 66 64 Q50 70 34 64Z" fill="#8b4513"/>', extra: '<path d="M20 44 Q22 16 50 16 Q78 16 80 44Z" fill="#ffd60a"/><rect x="16" y="40" width="68" height="6" rx="3" fill="#e9c46a"/><rect x="43" y="22" width="14" height="12" rx="3" fill="#6c757d"/><circle cx="50" cy="28" r="4" fill="#fff3b0"/>' }),
  milo: human({ bg: '#fff3c4', skin: '#e0ac69', shirt: '#1d3557', hair: 'spiky', hairCol: '#ffbe0b', mouth: 'open', extra: wizard('#ffbe0b', '#1d3557') + '<path d="M86 50 L78 66 L86 66 L78 84" stroke="#ffbe0b" stroke-width="3.5" fill="none" stroke-linejoin="round"/><path d="M14 20 L18 30 L12 30 L16 40" stroke="#ffbe0b" stroke-width="2.5" fill="none"/>' }),
  renas: human({ bg: '#ffe3cc', skin: '#f1c27d', shirt: '#ff6d00', hair: 'messy', hairCol: '#1b1b1b', mouth: 'grin', extra: '<circle cx="39" cy="34" r="8" fill="#ffb703" stroke="#6b4423" stroke-width="2"/><circle cx="61" cy="34" r="8" fill="#ffb703" stroke="#6b4423" stroke-width="2"/><circle cx="39" cy="34" r="4" fill="#caf0f8"/><circle cx="61" cy="34" r="4" fill="#caf0f8"/><path d="M50 22 L50 10 M36 10 L64 10" stroke="#ff006e" stroke-width="3"/><circle cx="86" cy="84" r="7" fill="none" stroke="#adb5bd" stroke-width="3"/>' }),
  reshman: W('#d9c8f0', `<ellipse cx="50" cy="88" rx="30" ry="6" fill="rgba(16,0,43,.25)"/><path d="M50 26 Q80 26 80 58 Q80 84 50 84 Q20 84 20 58 Q20 26 50 26Z" fill="#10002b"/><path d="M28 78 Q22 92 34 96 M72 78 Q78 92 66 96" stroke="#10002b" stroke-width="6" fill="none" stroke-linecap="round"/><circle cx="50" cy="56" r="34" fill="none" stroke="#9d4edd" stroke-width="2" stroke-dasharray="3 5" opacity=".7"/>`),
  robin: human({ bg: '#c7f9e8', skin: '#ffdbc4', shirt: '#06d6a0', hair: 'messy', hairCol: '#e9c46a', fat: true, mouth: 'open', collar: '<rect x="30" y="78" width="6" height="22" fill="#1d3557"/><rect x="64" y="78" width="6" height="22" fill="#1d3557"/>', extra: '<path d="M37 58 Q35 66 37 72" stroke="#48cae4" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M63 58 Q65 66 63 72" stroke="#48cae4" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M33 44 L45 47 M67 44 L55 47" stroke="#8b5a2b" stroke-width="2.5" transform="rotate(8 50 46)"/>' }),
  thomas: W('#ffe5cc', `<circle cx="50" cy="56" r="34" fill="#f4a261"/><path d="M17 44 Q50 30 83 44" stroke="#e63946" stroke-width="6" fill="none"/><path d="M80 44 L92 36 M80 46 L90 52" stroke="#e63946" stroke-width="4"/>
    ${eyes(54, 12)}<path d="M33 45 L46 49 M67 45 L54 49" stroke="#2b1d14" stroke-width="3"/><path d="M42 70 L58 70" stroke="#5a1e2a" stroke-width="3" stroke-linecap="round"/>
    <circle cx="12" cy="76" r="10" fill="#d00000"/><circle cx="88" cy="76" r="10" fill="#d00000"/><rect x="38" y="84" width="24" height="10" rx="2" fill="#ffd60a"/>`),
  meta: W('#e8ecff', `<defs><linearGradient id="mg" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#0866ff"/><stop offset=".5" stop-color="#a033ff"/><stop offset="1" stop-color="#ff4fd8"/></linearGradient></defs>
    <circle cx="46" cy="56" r="28" fill="none" stroke="url(#mg)" stroke-width="13"/><ellipse cx="38" cy="54" rx="3.5" ry="6" fill="#132044"/><ellipse cx="54" cy="54" rx="3.5" ry="6" fill="#132044"/>
    <path d="M32 44 L42 47 M60 44 L50 47" stroke="#132044" stroke-width="2.5"/><path d="M38 66 Q46 72 54 66" stroke="#132044" stroke-width="2.5" fill="none"/>
    <rect x="62" y="10" width="32" height="20" rx="8" fill="#fff" stroke="#0866ff" stroke-width="2"/><circle cx="70" cy="20" r="2.5" fill="#0866ff"/><circle cx="78" cy="20" r="2.5" fill="#0866ff"/><circle cx="86" cy="20" r="2.5" fill="#0866ff"/>`),
  nar: '',
};
