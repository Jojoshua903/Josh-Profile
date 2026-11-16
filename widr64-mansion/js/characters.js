// ==========================================================
// characters.js — official WIDR 64 roster, stats, accessories
// ==========================================================

/*
  Stat glossary (multipliers relative to the baseline hero):
    speed         movement speed multiplier
    maxHp         max hit points
    suction       vacuum damage-per-second multiplier during tug-of-war
    beamWidth     flashlight cone width multiplier
    stunRecharge  flash recharge time multiplier (lower = faster)
    anchor        0..1 resistance to ghost pull during tug-of-war
    noise         ghost detection radius multiplier (lower = sneakier)
    dodge         knockback taken multiplier (lower = more agile)
    latchRecovery vacuum latch cooldown multiplier (lower = faster re-latch)
    luck          loot multiplier for drops (1 = normal)
    shockRadius   radius of flash shockwave around the hero (0 = none)
    chill         0..1 slow applied to stunned ghosts' thrashing
    headlamp      extra point-light intensity carried by the hero
    scale         model scale
*/

export const CHARACTERS = [
  {
    id: 'nathan',
    name: 'Nathan',
    title: 'The Slugger',
    role: 'All-Rounder',
    description: 'The WIDR 64 main hero. Cap on backwards, baseball bat strapped to his Poltergust, and the steadiest hands in the mansion.',
    colors: { primary: 0xd8312e, secondary: 0x1f3f8f, skin: 0xf0c49a, hair: 0x5a3a22, accent: 0xffffff, light: 0xfff1c8, stream: 0x9fe8ff },
    css: { primary: '#d8312e', secondary: '#1f3f8f', bg: '#ffdf9e' },
    stats: { speed: 1.0, maxHp: 100, suction: 1.0, beamWidth: 1.0, stunRecharge: 1.0, anchor: 0.15, noise: 1.0, dodge: 1.0, latchRecovery: 1.0, luck: 1.0, shockRadius: 0, chill: 0, headlamp: 0, scale: 1.0 },
    display: { SPEED: 6, HP: 7, SUCTION: 6, FLASH: 6, STEALTH: 5 },
    passive: { name: 'Clutch Swing', text: 'Perfectly balanced. Tug-of-war damage builds 25% faster while you keep pulling in one direction.' },
    accessory: 'cap_bat',
    starter: true,
  },
  {
    id: 'josh',
    name: 'Josh',
    title: 'Tech Whiz',
    role: 'Drone Operator',
    description: 'Robotic cyan eye, high-tech visor and a custom-tuned Strobulb. Sees ghosts before they see him.',
    colors: { primary: 0x2b2f3a, secondary: 0x19c6e6, skin: 0xd9a77c, hair: 0x1b120c, accent: 0x5ff6ff, light: 0xd8fbff, stream: 0x6cf6ff },
    css: { primary: '#2b2f3a', secondary: '#19c6e6', bg: '#c7f4ff' },
    stats: { speed: 1.0, maxHp: 95, suction: 0.95, beamWidth: 1.28, stunRecharge: 0.62, anchor: 0.1, noise: 1.0, dodge: 1.0, latchRecovery: 0.9, luck: 1.0, shockRadius: 0, chill: 0, headlamp: 0, scale: 1.0 },
    display: { SPEED: 6, HP: 6, SUCTION: 5, FLASH: 10, STEALTH: 5 },
    passive: { name: 'Optic Overclock', text: 'Wider flashlight beam and a much faster stun recharge. Radar also pings hidden ghosts.' },
    accessory: 'visor_eye',
  },
  {
    id: 'milo',
    name: 'Milo',
    title: 'Lightning Wizard',
    role: 'Glass Cannon',
    description: 'A crackling pointed hat full of yellow sparks. Fast, fierce, and fragile.',
    colors: { primary: 0x4a2a8a, secondary: 0xffd21a, skin: 0xf2c8a2, hair: 0xc9c9c9, accent: 0xfff36b, light: 0xfff7a8, stream: 0xfff36b },
    css: { primary: '#4a2a8a', secondary: '#ffd21a', bg: '#e9dcff' },
    stats: { speed: 1.22, maxHp: 75, suction: 1.55, beamWidth: 1.0, stunRecharge: 0.95, anchor: 0.0, noise: 1.1, dodge: 0.9, latchRecovery: 1.0, luck: 1.0, shockRadius: 0, chill: 0, headlamp: 0, scale: 0.98 },
    display: { SPEED: 9, HP: 3, SUCTION: 10, FLASH: 6, STEALTH: 4 },
    passive: { name: 'Thunder Siphon', text: 'Massive vacuum DPS during tug-of-war, crackling with lightning. Max HP is only 75.' },
    accessory: 'wizard_hat',
  },
  {
    id: 'reshman',
    name: 'Reshman',
    title: 'Shadow Being',
    role: 'Infiltrator',
    description: 'A small, faceless black shadow blob with two glowing eyes. Nobody hears Reshman coming.',
    colors: { primary: 0x0b0b12, secondary: 0x1a1a26, skin: 0x0b0b12, hair: 0x0b0b12, accent: 0xb6ff4a, light: 0xe8ffd0, stream: 0xc7ff8a },
    css: { primary: '#0b0b12', secondary: '#b6ff4a', bg: '#d9e6c6' },
    stats: { speed: 1.12, maxHp: 90, suction: 0.85, beamWidth: 1.0, stunRecharge: 1.0, anchor: 0.0, noise: 0.4, dodge: 0.45, latchRecovery: 1.0, luck: 1.0, shockRadius: 0, chill: 0, headlamp: 0, scale: 0.82 },
    display: { SPEED: 8, HP: 5, SUCTION: 4, FLASH: 6, STEALTH: 10 },
    passive: { name: 'Silent Step', text: 'Quietest footsteps: ghosts notice him much later. Agile dodging halves knockback, but pull strength is lighter.' },
    accessory: 'shadow',
  },
  {
    id: 'lars',
    name: 'Lars',
    title: 'Stout Dwarf Miner',
    role: 'Anchor',
    description: 'Big beard, sturdy boots, headlamp helmet. His cats Kayo & Yara never stray far.',
    colors: { primary: 0x7a4a24, secondary: 0xe0a21a, skin: 0xf0b58a, hair: 0xb8541c, accent: 0xffe39a, light: 0xffe0a0, stream: 0xffd38a },
    css: { primary: '#7a4a24', secondary: '#e0a21a', bg: '#ffe4c2' },
    stats: { speed: 0.86, maxHp: 125, suction: 1.0, beamWidth: 1.0, stunRecharge: 1.05, anchor: 0.72, noise: 1.25, dodge: 0.7, latchRecovery: 1.0, luck: 1.0, shockRadius: 0, chill: 0, headlamp: 6, scale: 0.9 },
    display: { SPEED: 4, HP: 10, SUCTION: 6, FLASH: 6, STEALTH: 3 },
    passive: { name: 'Heavy Anchor', text: 'Resists ghost pull during tug-of-war. His headlamp lights a small circle around him. Kayo & Yara tag along.' },
    accessory: 'headlamp_beard',
  },
  {
    id: 'daniel',
    name: 'Daniel',
    title: 'Demolition Bomber',
    role: 'Area Stunner',
    description: 'Blast goggles and a bomber pack. When Daniel flashes, the whole room feels it.',
    colors: { primary: 0x3e4a2a, secondary: 0xff7a1a, skin: 0xe2b088, hair: 0x2a1a0e, accent: 0xffa040, light: 0xffe2b8, stream: 0xffb070 },
    css: { primary: '#3e4a2a', secondary: '#ff7a1a', bg: '#ffd9b8' },
    stats: { speed: 0.98, maxHp: 105, suction: 1.05, beamWidth: 1.0, stunRecharge: 1.1, anchor: 0.25, noise: 1.15, dodge: 1.0, latchRecovery: 1.0, luck: 1.0, shockRadius: 3.6, chill: 0, headlamp: 0, scale: 1.0 },
    display: { SPEED: 6, HP: 7, SUCTION: 6, FLASH: 9, STEALTH: 4 },
    passive: { name: 'Blast Radius', text: 'Flash releases a stun shockwave all around him. Captures explode into sparks.' },
    accessory: 'goggles_bomb',
  },
  {
    id: 'fionn',
    name: 'Fionn',
    title: 'Irish Geologist',
    role: 'Treasure Hunter',
    description: 'Explorer gear, a green shamrock patch, and a pack studded with glowing mineral crystals. Luck of the Irish, guaranteed.',
    colors: { primary: 0x2e7d3a, secondary: 0xc9a46a, skin: 0xf4cfae, hair: 0xd06a28, accent: 0x7dffb0, light: 0xeaffe0, stream: 0xa8ffcf },
    css: { primary: '#2e7d3a', secondary: '#c9a46a', bg: '#d8f5d8' },
    stats: { speed: 1.0, maxHp: 100, suction: 0.95, beamWidth: 1.0, stunRecharge: 1.0, anchor: 0.2, noise: 1.0, dodge: 1.0, latchRecovery: 1.0, luck: 1.9, shockRadius: 0, chill: 0, headlamp: 0, scale: 1.0 },
    display: { SPEED: 6, HP: 7, SUCTION: 5, FLASH: 6, STEALTH: 5 },
    passive: { name: 'Luck of the Geologist', text: 'Ghosts and furniture drop extra gold coins, bills, and rare gems.' },
    accessory: 'shamrock_crystals',
  },
  {
    id: 'renas',
    name: 'Renas',
    title: 'Gadget Kid',
    role: 'Speedster',
    description: "Josh's little brother. Compact frame, oversized prototype gadget backpack, and zero patience.",
    colors: { primary: 0xf0a020, secondary: 0x3a3fd0, skin: 0xd9a77c, hair: 0x1b120c, accent: 0x7affef, light: 0xfff4d8, stream: 0x8affef },
    css: { primary: '#f0a020', secondary: '#3a3fd0', bg: '#fff0c4' },
    stats: { speed: 1.16, maxHp: 85, suction: 0.95, beamWidth: 1.0, stunRecharge: 0.9, anchor: 0.05, noise: 0.9, dodge: 0.8, latchRecovery: 0.45, luck: 1.0, shockRadius: 0, chill: 0, headlamp: 0, scale: 0.84 },
    display: { SPEED: 8, HP: 4, SUCTION: 5, FLASH: 7, STEALTH: 6 },
    passive: { name: 'Quick Latch', text: 'Nimble movement and lightning-fast vacuum latch recovery after a ghost breaks free.' },
    accessory: 'gadget_pack',
  },
];

// The team's mentor (not playable). Deniz, the old Duke of Ice, swapped his
// crown for a lab coat: he built the Poltergust and the Koç Radar, and
// guides the hero over the radio like a ghost-hunting professor.
export const PROFESSOR = {
  id: 'koc',
  name: 'Professor Koç',
  short: 'Prof. Koç',
  title: 'Ghost Scientist',
  role: 'Mentor',
  description: 'Deniz, the former Duke of Ice, now a ghost scientist. He invented the Poltergust and the Koç Radar.',
  colors: { primary: 0xf2f5fa, secondary: 0x2f6fd6, skin: 0xe6c0a0, hair: 0xeaf6ff, accent: 0x9feaff, light: 0xdff6ff, stream: 0xbff3ff },
  css: { primary: '#2f6fd6', secondary: '#bfefff', bg: '#dff3ff' },
  stats: { scale: 0.96 },
  accessory: 'professor',
};

// Extra lore portraits hung in the mansion
export const LORE_PORTRAITS = [
  { id: 'kayo_yara', name: 'Kayo & Yara', caption: "Lars's cats" },
  { id: 'lawrence', name: 'Lawrence', caption: "Fionn's evolution (secret!)" },
  { id: 'grumbleclaw', name: 'Grumbleclaw', caption: 'From The Guiseppe Game' },
];

export const BOSS_INFO = {
  id: 'grumbleclaw',
  name: 'Grumbleclaw',
  epithet: 'the Goon of the Banquet',
  origin: 'The Guiseppe Game',
};

export const STICKERS = {
  first_capture: { label: 'First Capture', emoji: '👻' },
  double_catch: { label: 'Double Catch', emoji: '👻👻' },
  triple_catch: { label: 'Triple Catch', emoji: '🎰' },
  first_boo: { label: 'Boo Caught', emoji: '😝' },
  speedy_spirit: { label: 'Speedy Spirit Caught', emoji: '💎' },
  speedy_all: { label: 'Every Speedy Spirit', emoji: '💨' },
  elemental_stun: { label: 'Elemental Stun', emoji: '🔥' },
  elementalist: { label: 'Fire, Water and Ice', emoji: '🌊' },
  candle_keeper: { label: 'Candle Keeper', emoji: '🕯️' },
  lights_on: { label: 'Mansion Restored', emoji: '💡' },
  hero_master: { label: 'Hero Mastery (LV 10)', emoji: '🏅' },
  veteran: { label: 'Veteran Ghost Hunter', emoji: '🎖️' },
  legend: { label: 'Living Legend (LV 20)', emoji: '👑' },
  full_team: { label: 'The Whole Team', emoji: '🤝' },
  boo_buster: { label: 'Boo Buster: Every Boo', emoji: '📟' },
  parlor_clear: { label: 'Parlor Cleaned', emoji: '🔥' },
  boss_grumbleclaw: { label: 'Grumbleclaw Bagged', emoji: '🍗' },
  rescue: { label: 'Teammate Rescued', emoji: '🖼️' },
  rich: { label: 'Rank S Treasure', emoji: '💎' },
  untouchable: { label: 'No Damage Run', emoji: '🛡️' },
  secret_lawrence: { label: 'Found Lawrence', emoji: '🪨' },
  cats: { label: 'Kayo & Yara Spotted', emoji: '🐈' },
  boss_sonata: { label: 'Sonata Silenced', emoji: '🎹' },
  boss_patchnotes: { label: 'Patchnotes Debugged', emoji: '💾' },
  boss_pip: { label: 'Game Over, Pixel Pip', emoji: '🎮' },
  key_master: { label: 'Key Master', emoji: '🗝️' },
  frame_first: { label: 'First Portrait Framed', emoji: '🖼️' },
  frame_gold: { label: 'Gold Frame', emoji: '🥇' },
  gallery_gold: { label: 'Golden Gallery: Every Frame Gold', emoji: '🏆' },
  boss_snoozewell: { label: 'Snoozewell Tucked In', emoji: '💤' },
  boss_boilerbeard: { label: 'Boilerbeard Cooled', emoji: '🔥' },
  boss_varnish: { label: 'Varnish Unframed', emoji: '🎨' },
  stargazer: { label: 'Stargazer', emoji: '🔭' },
  crypt: { label: 'Crypt Keeper', emoji: '⚰️' },
  explorer: { label: 'Every Room Explored', emoji: '🗺️' },
  full_clear: { label: 'Mansion Fully Lit', emoji: '💡' },
};

export function getCharacter(id) {
  return CHARACTERS.find((c) => c.id === id) || CHARACTERS[0];
}

export function stickerIdForHero(id) {
  return `clear_${id}`;
}
