// ---------- full maps for Map Guessr ----------
// Sources: WikiBound's map categories, and VGMaps (vgmaps.de mirror) for the EarthBound
// areas WikiBound is missing plus the ripped Mother 3 room sheets.
// Image sizes are read from the images when they load.
const WB = (dir, file) => ({url:`https://cdn.wikibound.info/${dir}/${file}`, page:`https://wikibound.info/wiki/File:${file}`, src:"WikiBound"});
const VG = (path, view) => ({url:`https://vgmaps.de/files/${path}`, page:`https://vgmaps.de/maps/view?m=${view}`, src:"VGMaps"});

// [game, name, source, enemy-data area or "", other names people might type]
const RAW_MAPS = [
  ["M1", "Podunk", WB("4/49", "PodunkMap.png"), "Podunk"],
  ["M1", "Merrysville", WB("c/cd", "MerrysvilleMap.png"), "Merrysville"],
  ["M1", "Reindeer", WB("e/ee", "ReindeerMap.png"), "Reindeer"],
  ["M1", "Spookane", WB("5/52", "SpookaneMap.png"), "Spookane"],
  ["M1", "Ellay", WB("f/fa", "EllayMap.png"), "Ellay"],
  ["M1", "Yucca Desert", WB("9/97", "Yucca_Desert.png"), "Yucca Desert", ["Yucca"]],
  ["M1", "Magicant", WB("c/cb", "Magicant_M1.png"), "Magicant"],
  ["M1", "Snowman", WB("6/67", "SnowmanMap.png"), "Snowman"],
  ["M1", "Swamp", WB("3/3e", "Swamp.png"), "Swamp", ["The Swamp"]],
  ["M1", "Duncan's Factory", WB("3/3e", "Duncans_Factory.png"), "Duncan's Factory", ["Duncan Factory"]],
  ["M1", "Canary Village", WB("f/f3", "CanaryVillageMap.png"), "", ["Canary"]],
  ["M1", "Mislay Triangle", WB("5/58", "MislayTriangle.png"), "Mislay Triangle"],
  ["M1", "Sweet's Little Factory", WB("b/b9", "SweetLittlesMap.png"), "Sweet's Little Factory", ["Sweet Little Factory", "Sweets Factory", "Sweet's Factory"]],
  ["M1", "Choucream Zoo", WB("f/f2", "ChoucreamZooMap.png"), "City Zoo", ["City Zoo", "Zoo"]],

  ["EB", "Onett", WB("f/f8", "OnettMap.png"), "Onett"],
  ["EB", "Road to Twoson", WB("6/68", "RoadToTwoson.png"), "", ["Onett to Twoson"]],
  ["EB", "Giant Step", VG("snes/maps/earthbound-giant-step-snes-map.webp", 8101), "Giant Step"],
  ["EB", "Twoson", VG("snes/maps/earthbound-twoson-snes-map.webp", 8102), "Twoson"],
  ["EB", "Peaceful Rest Valley", VG("snes/maps/earthbound-peaceful-rest-valley-snes-map.webp", 8104), "Peaceful Rest Valley", ["Peaceful Rest"]],
  ["EB", "Happy Happy Village", WB("9/9e", "HappyHappyVillageBlue.png"), "Happy Happy Village", ["Happy Happy"]],
  ["EB", "Lilliput Steps", VG("snes/maps/earthbound-lilliput-step-snes-map.webp", 8106), "Lilliput Steps", ["Lilliput Step", "Lilliput"]],
  ["EB", "Threed", WB("f/fb", "ThreedMap.png"), "Threed"],
  ["EB", "Winters", VG("snes/maps/earthbound-winters-snes-map.webp", 8109), "Winters"],
  ["EB", "Saturn Valley", WB("4/40", "SaturnValleyEB.png"), "Saturn Valley"],
  ["EB", "Grapefruit Falls", WB("4/49", "GrapefruitFallsMap.png"), "Grapefruit Falls"],
  ["EB", "Belch's Base", VG("snes/maps/earthbound-belch-base-snes-map.webp", 8112), "Belch's Base", ["Belch Base", "The Belch Base", "Belch's Factory", "Belch Factory"]],
  ["EB", "Milky Well", VG("snes/maps/earthbound-milky-well-snes-map.webp", 8113), "Milky Well"],
  ["EB", "Dusty Dunes Desert", VG("snes/maps/earthbound-dusty-dunes-desert-snes-map.webp", 8114), "Dusty Dunes Desert", ["Dusty Dunes"]],
  ["EB", "Fourside", VG("snes/maps/earthbound-fourside-snes-map.webp", 8115), "Fourside"],
  ["EB", "Gold Mine", VG("snes/maps/earthbound-gold-mine-unmarked-snes-map.webp", 8118), "Gold Mine", ["Desert Gold Mine", "Mine"]],
  ["EB", "Moonside", WB("e/e0", "MoonsideMap.png"), "Moonside"],
  ["EB", "Stonehenge Base", WB("4/42", "Stonehenge_base_1.png"), "Stonehenge Base", ["Stonehenge"]],
  ["EB", "Summers & Toto", WB("d/d9", "SummersToto.png"), "Summers", ["Summers", "Toto", "Summers and Toto"]],
  ["EB", "Dalaam", WB("a/a8", "MapofDalaam.png"), ""],
  ["EB", "Scaraba", WB("8/88", "Scaraba.png"), "Scaraba"],
  ["EB", "Pyramid", VG("snes/maps/earthbound-pyramid-snes-map.webp", 8126), "Pyramid", ["The Pyramid"]],
  ["EB", "Dungeon Man", VG("snes/maps/earthbound-dungeon-man-snes-map.webp", 8127), "Dungeon Man"],
  ["EB", "Deep Darkness", WB("b/bd", "DeepDarknessMap.png"), "Deep Darkness"],
  ["EB", "Lumine Hall", VG("snes/maps/earthbound-lumine-hall-snes-map.webp", 8131), "Lumine Hall"],
  ["EB", "Lost Underworld", WB("2/2a", "LostUnderworldMap.png"), "Lost Underworld"],
  ["EB", "Fire Spring", VG("snes/maps/earthbound-fire-spring-snes-map.webp", 8133), "Fire Spring", ["The Fire Spring"]],
  ["EB", "Pink Cloud cave", WB("8/86", "Pink_cloud_cave.png"), "Pink Cloud", ["Pink Cloud"]],
  ["EB", "Magicant", WB("b/b0", "Magicant_M2.png"), "Magicant"],
  ["EB", "Cave of the Past", VG("snes/maps/earthbound-cave-of-the-past-snes-map.webp", 8135), "Cave of the Past"],

  ["M3", "Club Titiboo attic", WB("9/96", "ClubTitibooAttic.png"), "Club Titiboo", ["Club Titiboo", "Titiboo"]],
  ["M3", "Clayman Factory (outside)", WB("2/21", "ClaymanFactory.png"), "", ["Clayman Factory"]],
  ["M3", "Clayman Factory (inside)", WB("4/4b", "ClaymanFactoryInterior.png"), "", ["Clayman Factory"]],
  ["M3", "Chimera Lab 1F", WB("d/d0", "ChimeraLab1F.png"), "Chimera Laboratory", ["Chimera Lab", "Chimera Laboratory"]],
  ["M3", "Chimera Lab 2F", WB("6/67", "ChimeraLab2F.png"), "Chimera Laboratory", ["Chimera Lab", "Chimera Laboratory"]],
  ["M3", "Chimera Lab basement", WB("3/37", "ChimeraLabBasement.png"), "Chimera Laboratory", ["Chimera Lab", "Chimera Laboratory"]],
  ["M3", "Mole Cricket Hole", VG("gba/maps/mother-3-mole-cricket-hole-animated-gba-map.webp", 22947), ""],
  ["M3", "Tazmily Village (Chapters 1–3)", WB("b/b9", "Tazmily1-3.png"), "", ["Tazmily", "Tazmily Village", "Tazumili"]],
  ["M3", "Tazmily Village (Chapters 4–7)", WB("e/ea", "Tazmily4-7.png"), "", ["Tazmily", "Tazmily Village", "Tazumili", "New Tazmily"]],
  ["M3", "Cerulean Beach (Chapters 1–3)", WB("d/d3", "CeruleanBeach1-3.png"), "", ["Cerulean Beach", "Cerulean", "Great Scale"]],
  ["M3", "Cerulean Beach (Chapters 4–7)", WB("a/a5", "CeruleanBeach4-7full.png"), "", ["Cerulean Beach", "Cerulean", "Great Scale"]],
  ["M3", "Sunshine Forest (before)", WB("c/cf", "Sunshine_forest_pre_day.png"), "Sunshine Forest", ["Sunshine Forest", "Sunshine"]],
  ["M3", "Sunshine Forest (after)", WB("b/bf", "Sunshine_forest_post_day.png"), "Sunshine Forest", ["Sunshine Forest", "Sunshine"]],
  ["M3", "Drago Plateau", WB("5/54", "Drago_Plateau_river.png"), "Drago Plateau", ["Drago"]],
  ["M3", "Tanetane Island jungle", WB("d/da", "Tanetane_Jungle_full.png"), "Tanetane Island", ["Tanetane", "Tanetane Island", "Tanehineri"]],
  ["M3", "Tanetane Island cave & mountain", WB("0/03", "Tanetane_Island_cave_and_mountain.png"), "Tanetane Island", ["Tanetane", "Tanetane Island", "Tanehineri"]],
  ["M3", "Murasaki Forest (Caeribe Falls)", WB("d/dc", "Murasaki_Forest_waterfall.png"), "Murasaki Forest", ["Murasaki Forest", "Murasaki", "Caeribe Falls"]],
  ["M3", "Murasaki Forest (Chimera Lab)", WB("e/e5", "Murasaki_Forest_Chimera_Lab.png"), "Murasaki Forest", ["Murasaki Forest", "Murasaki"]],
  ["M3", "Ropeway", WB("e/e5", "Murasaki_Forest_Ropeway.png"), "", ["Ropeway"]],
  ["M3", "Unknown Valley", WB("4/4f", "UnknownValley.png"), "", []],
  ["M3", "Thunder Tower scaffolding", WB("6/6c", "Thunder_Tower_scaffolding.png"), "Thunder Tower", ["Thunder Tower"]],
  // every room in the game, ripped onto four giant sheets (A–D)
  ["M3", "Room sheet A", VG("gba/maps/mother-3-a-gba-map.webp", 22932), "", ["Sheet A", "A"]],
  ["M3", "Room sheet B", VG("gba/maps/mother-3-b-gba-map.webp", 22933), "", ["Sheet B", "B"]],
  ["M3", "Room sheet C", VG("gba/maps/mother-3-c-gba-map.png", 22934), "", ["Sheet C", "C"]],
  ["M3", "Room sheet D", VG("gba/maps/mother-3-d-gba-map.png", 22935), "", ["Sheet D", "D"]]
];

// "The Belch Base" and "belch's base" should both find the same map
const mapKey = s => norm(s.replace(/^the\s+/i, "").replace(/&/g, "and"));
const MAPS = RAW_MAPS.map(([game, name, s, area, alt = []]) => ({
  id: game + ":" + name, game, name, area, w:0, h:0, ...s,
  keys: [...new Set([name, ...alt].map(mapKey))]
}));
