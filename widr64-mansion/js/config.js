// ==========================================================
// config.js — tunable constants for WIDR 64 Mansion
// ==========================================================

export const CONFIG = {
  debug: false,

  render: {
    pixelRatioCap: 1.5,
    retroScale: 1.0,          // 1 = native; <1 renders at lower res for chunky 64-bit look
    shadowMapSize: 1024,
    toneExposure: 1.15,
    fogColor: 0x05050c,
    fogNear: 18,
    fogFar: 46,
  },

  camera: {
    fov: 40,
    height: 10.5,
    distance: 13.5,
    lookAhead: 1.6,
    followLerp: 4.0,
    roomEdgePadding: 2.5,
    doorPanTime: 1.25,
    shakeDecay: 2.4,
    maxShake: 0.55,
  },

  player: {
    baseSpeed: 6.0,
    tankTurnSpeed: 3.1,
    radius: 0.45,
    accel: 22,
    friction: 14,
    baseHp: 100,
    invulnTime: 1.3,
    knockback: 9,
    footstepInterval: 0.34,
    noiseRadius: 7.5,        // radius at which ghosts notice footsteps (scaled by hero noise)
    interactRange: 2.0,
  },

  flashlight: {
    color: 0xfff1c8,
    beamIntensity: 70,
    burstIntensity: 520,
    range: 11,
    baseAngle: 0.46,         // spotlight cone half-angle (radians)
    penumbra: 0.55,
    stunRange: 8.5,
    stunConeDot: 0.86,       // cos of acceptance angle for flash stun
    stunDuration: 3.4,
    rechargeTime: 1.7,
    burstTime: 0.22,
  },

  vacuum: {
    range: 5.6,
    coneDot: 0.78,
    latchRange: 6.4,
    baseDps: 22,
    oppositionBonus: 2.6,    // DPS multiplier gained by pulling fully opposite
    lootPull: 14,
    curtainPull: 1.0,
    furnitureShakeTime: 0.6,
    breakDistance: 8.8,
    latchCooldown: 0.9,
    suctionRampUp: 3.0,
    // multi-catch: stunned ghosts near the nozzle join an ongoing pull
    maxGroup: 3,             // ghosts held at once (lead + 2)
    joinRange: 4.6,          // how close a stunned ghost must be to get dragged in
    groupPull: 0.35,         // extra drag on the hero per additional ghost
    groupDps: 0.8,           // each ghost in a group drains a little slower
    comboCash: [1, 1.5, 2],  // payout multiplier for the 1st / 2nd / 3rd catch of one pull
  },

  ghost: {
    hp: 100,
    speed: 2.4,
    lungeSpeed: 7.2,
    floatHeight: 1.3,
    pullStrength: 4.2,
    thrashInterval: 0.9,
    detectRadius: 7.5,
    attackRange: 1.4,
    attackDamage: 10,
    attackCooldown: 2.4,
    windupTime: 0.65,
    hideTime: 2.2,
    regenAfterEscape: 0,     // GameCube-style: damage persists
    captureValue: 2000,
    vulnerableWindow: 1.2,
  },

  boss: {
    hp: 300,
    eatTime: 9.0,
    angryTime: 7.0,
    plateSpeed: 8.5,
    plateInterval: 0.75,
    plateDamage: 12,
    pullStrength: 5.4,
    captureValue: 15000,
    noticeRadius: 3.2,       // getting too close while he eats makes him angry
  },

  world: {
    wallHeight: 5.2,
    wallThickness: 0.4,
    doorWidth: 3.0,
    doorOpenDist: 2.6,
    doorSwingSpeed: 2.6,
  },

  loot: {
    coin: 100,
    bill: 500,
    pearl: 2500,
    gem: 6000,
    gravity: 18,
    bounce: 0.45,
    magnetRadius: 1.2,
    lifetime: 40,
  },

  // Mansion Cleared rank screen: S (best) → A → B → C.
  // Scaled for the full 23-room mansion (a thorough run banks ~300k).
  ranks: [
    { letter: 'S', min: 260000 },
    { letter: 'A', min: 180000 },
    { letter: 'B', min: 110000 },
    { letter: 'C', min: 0 },
  ],

  audio: {
    masterVolume: 0.55,
    musicVolume: 0.32,
    sfxVolume: 0.8,
  },

  storagePrefix: 'widr64_mansion_',
};

export function rankFor(cash) {
  for (const r of CONFIG.ranks) {
    if (cash >= r.min) return r.letter;
  }
  return 'C';
}

export const ROOM_IDS = {
  // 1F — Area 1
  FOYER: 'foyer',
  HALLWAY: 'hallway',
  PARLOR: 'parlor',
  DINING: 'dining',
  // 1F — Area 2 (West Wing)
  WEST_HALL: 'westhall',
  STUDY: 'study',
  LIBRARY: 'library',
  CONSERVATORY: 'conservatory',
  // 2F — Area 3
  UPPER_HALL: 'upperhall',
  BATHROOM: 'bathroom',
  GUEST_ROOM: 'guestroom',
  NURSERY: 'nursery',
  OBSERVATORY: 'observatory',
  BEDROOM: 'bedroom',
  // 1F East Wing + B1 — Area 4
  EAST_HALL: 'easthall',
  WASHROOM: 'washroom',
  STORAGE: 'storage',
  STAIRWELL: 'stairwell',
  WINE_CELLAR: 'winecellar',
  BOILER_ROOM: 'boilerroom',
  CRYPT: 'crypt',
  KITCHEN: 'kitchen',
  // Finale
  BALLROOM: 'ballroom',
};
