/* ===== TYPES ===== */
const TYPE_META = {
  Normal:{c:'#A8A77A',e:'⭐'}, Fire:{c:'#EE8130',e:'🔥'}, Water:{c:'#6390F0',e:'💧'},
  Electric:{c:'#F7D02C',e:'⚡'}, Grass:{c:'#7AC74C',e:'🌿'}, Ice:{c:'#96D9D6',e:'❄️'},
  Fighting:{c:'#C22E28',e:'🥊'}, Poison:{c:'#A33EA1',e:'☠️'}, Ground:{c:'#E2BF65',e:'⛰️'},
  Flying:{c:'#A98FF3',e:'🪽'}, Psychic:{c:'#F95587',e:'🔮'}, Bug:{c:'#A6B91A',e:'🐛'},
  Rock:{c:'#B6A136',e:'🪨'}, Ghost:{c:'#735797',e:'👻'}, Dragon:{c:'#6F35FC',e:'🐉'},
  Dark:{c:'#705746',e:'🌑'}, Steel:{c:'#B7B7CE',e:'⚙️'}, Fairy:{c:'#D685AD',e:'✨'}
};
const CHART = {
  Normal:{Rock:.5,Ghost:0,Steel:.5},
  Fire:{Fire:.5,Water:.5,Grass:2,Ice:2,Bug:2,Rock:.5,Dragon:.5,Steel:2},
  Water:{Fire:2,Water:.5,Grass:.5,Ground:2,Rock:2,Dragon:.5},
  Electric:{Water:2,Electric:.5,Grass:.5,Ground:0,Flying:2,Dragon:.5},
  Grass:{Fire:.5,Water:2,Grass:.5,Poison:.5,Ground:2,Flying:.5,Bug:.5,Rock:2,Dragon:.5,Steel:.5},
  Ice:{Fire:.5,Water:.5,Grass:2,Ice:.5,Ground:2,Flying:2,Dragon:2,Steel:.5},
  Fighting:{Normal:2,Ice:2,Poison:.5,Flying:.5,Psychic:.5,Bug:.5,Rock:2,Ghost:0,Dark:2,Steel:2,Fairy:.5},
  Poison:{Grass:2,Poison:.5,Ground:.5,Rock:.5,Ghost:.5,Steel:0,Fairy:2},
  Ground:{Fire:2,Electric:2,Grass:.5,Poison:2,Flying:0,Bug:.5,Rock:2,Steel:2},
  Flying:{Electric:.5,Grass:2,Fighting:2,Bug:2,Rock:.5,Steel:.5},
  Psychic:{Fighting:2,Poison:2,Psychic:.5,Dark:0,Steel:.5},
  Bug:{Fire:.5,Grass:2,Fighting:.5,Poison:.5,Flying:.5,Psychic:2,Ghost:.5,Dark:2,Steel:.5,Fairy:.5},
  Rock:{Fire:2,Ice:2,Fighting:.5,Ground:.5,Flying:2,Bug:2,Steel:.5},
  Ghost:{Normal:0,Psychic:2,Ghost:2,Dark:.5},
  Dragon:{Dragon:2,Steel:.5,Fairy:0},
  Dark:{Fighting:.5,Psychic:2,Ghost:2,Dark:.5,Fairy:.5},
  Steel:{Fire:.5,Water:.5,Electric:.5,Ice:2,Rock:2,Steel:.5,Fairy:2},
  Fairy:{Fire:.5,Fighting:2,Poison:.5,Dragon:2,Dark:2,Steel:.5}
};

/* ===== MOVE POOLS ===== general = basis, type = de "special" per type, sig = signature per widrmon ===== */
const GENERAL_MOVES = {
  G_TACKLE:{n:"Tackle",t:"Normal",p:50,d:"Een simpele, betrouwbare uithaal."},
  G_QUICK:{n:"Quick Attack",t:"Normal",p:55,d:"Snelle stoot, net iets eerder dan de rest."},
  G_SLAM:{n:"Body Slam",t:"Normal",p:68,d:"Gooit z'n volle gewicht in de strijd."},
  G_TAKE:{n:"Take Down",t:"Normal",p:74,d:"Roekeloze charge met een beetje recoil."},
  G_SCRATCH:{n:"Krab",t:"Normal",p:52,d:"Klauwen uit, erop los."},
  G_HEAD:{n:"Kopstoot",t:"Normal",p:64,d:"Recht met de kop erin."}
};
const TYPE_MOVES = {
  T_Normal:{n:"Hyperstoot",t:"Normal",p:82,d:"Een keiharde allroundklap."},
  T_Fire:{n:"Vlammenzee",t:"Fire",p:82,eff:{status:'burn',chance:0.2},d:"Een golf van vuur. Kan verbranding veroorzaken."},
  T_Water:{n:"Hydrokanon",t:"Water",p:82,d:"Een kanonschot van water."},
  T_Electric:{n:"Donderslag",t:"Electric",p:82,eff:{status:'para',chance:0.2},d:"Volle lading. Kan verlammen."},
  T_Grass:{n:"Bladstorm",t:"Grass",p:82,d:"Een orkaan van scherpe bladeren."},
  T_Ice:{n:"IJsstraal",t:"Ice",p:82,eff:{status:'freeze',chance:0.12},d:"Bevriest alles wat het raakt. Kan invriezen."},
  T_Fighting:{n:"Dynamische Vuist",t:"Fighting",p:82,d:"Een vuist met alles erachter."},
  T_Poison:{n:"Gifbom",t:"Poison",p:82,eff:{status:'poison',chance:0.3},d:"Een giftige wolk. Kan vergiftigen."},
  T_Ground:{n:"Aardbeving",t:"Ground",p:82,spread:true,d:"De hele grond schudt — raakt alle tegenstanders."},
  T_Flying:{n:"Stormvleugel",t:"Flying",p:82,d:"Duikt uit de lucht naar beneden."},
  T_Psychic:{n:"Psychokracht",t:"Psychic",p:82,eff:{stat:'spd',stage:-1,target:'foe',chance:0.15},d:"Pure gedachtekracht. Kan snelheid verlagen."},
  T_Bug:{n:"Zwermaanval",t:"Bug",p:82,spread:true,eff:{stat:'spd',stage:-1,target:'foe',chance:0.15},d:"Een zwerm die alle tegenstanders vertraagt."},
  T_Rock:{n:"Rotslawine",t:"Rock",p:82,spread:true,eff:{flinch:0.15},d:"Een regen van keien op alle tegenstanders. Kan doen terugdeinzen."},
  T_Ghost:{n:"Schaduwbal",t:"Ghost",p:82,d:"Een bal van pure duisternis."},
  T_Dragon:{n:"Drakenadem",t:"Dragon",p:82,d:"Adem van een oeroud wezen."},
  T_Dark:{n:"Duistere Slag",t:"Dark",p:82,eff:{flinch:0.2},d:"Een gemene klap. Kan doen terugdeinzen."},
  T_Steel:{n:"IJzeren Staart",t:"Steel",p:82,eff:{stat:'def',stage:-1,target:'foe',chance:0.2},d:"Keihard metaal. Kan verdediging verlagen."},
  T_Fairy:{n:"Feeënglans",t:"Fairy",p:82,eff:{stat:'atk',stage:-1,target:'foe',chance:0.15},d:"Een magische flits. Kan aanval verlagen."},
  // ---- zwakke type-moves (vroege STAB/coverage, ~45 power) ----
  TW_Normal:{n:"Snuitstoot",t:"Normal",p:48,d:"Een snelle, lichte por."},
  TW_Fire:{n:"Vonk",t:"Fire",p:45,d:"Een sputterend vlammetje."},
  TW_Water:{n:"Waterspetter",t:"Water",p:45,d:"Een klein straaltje water."},
  TW_Electric:{n:"Statische Schok",t:"Electric",p:45,d:"Een prikkelende vonk."},
  TW_Grass:{n:"Bladworp",t:"Grass",p:45,d:"Een scherp blaadje weggeslingerd."},
  TW_Ice:{n:"IJsscherf",t:"Ice",p:45,d:"Een splinter bevroren lucht."},
  TW_Fighting:{n:"Lage Trap",t:"Fighting",p:45,d:"Een snelle veeg naar de benen."},
  TW_Poison:{n:"Zuurspetter",t:"Poison",p:45,d:"Een druppel bijtend gif."},
  TW_Ground:{n:"Modderschot",t:"Ground",p:45,d:"Een kwak modder in het gezicht."},
  TW_Flying:{n:"Windstoot",t:"Flying",p:45,d:"Een korte vlaag wind."},
  TW_Psychic:{n:"Verwarring",t:"Psychic",p:45,d:"Een lichte mentale duw."},
  TW_Bug:{n:"Insectenbeet",t:"Bug",p:45,d:"Een snelle beet."},
  TW_Rock:{n:"Steenworp",t:"Rock",p:45,d:"Een losse kei erheen gegooid."},
  TW_Ghost:{n:"Angstblik",t:"Ghost",p:48,eff:{flinch:0.1},d:"Een griezelige verschijning. Kan doen terugdeinzen."},
  TW_Dragon:{n:"Drakenkras",t:"Dragon",p:48,d:"Een korte uithaal met drakenklauwen."},
  TW_Dark:{n:"Vuige Beet",t:"Dark",p:45,d:"Een gemene beet uit het niets."},
  TW_Steel:{n:"Metaalklauw",t:"Steel",p:48,d:"Een klap met harde metalen klauwen."},
  TW_Fairy:{n:"Feeënwind",t:"Fairy",p:45,d:"Een zacht glinsterend briesje."}
};
const SIGNATURE_MOVES = {
  S_druk:{n:"Thunder Dragon",t:"Dragon",p:100,eff:{status:'para',chance:0.2},d:"De donder van Bhutan zelf. Nationale schade, kans op verlamming."},
  S_isis:{n:"Black Hole",t:"Dark",p:100,eff:{stat:'spd',stage:-1,target:'foe',chance:0.3},d:"Slokt alles op. Zwaartekracht vertraagt de tegenstander."},
  S_aasta:{n:"Seasonal Comeback",t:"Fairy",p:95,d:"Terug uit het niets — één keer per seizoen, sterker dan ooit."},
  S_deniz:{n:"IJskoude 'k'",t:"Ice",p:80,eff:{status:'freeze',chance:0.3},d:"Eén letter in de chat. Grote kans om te bevriezen."},
  S_robin:{n:"Tsunami of Tears",t:"Water",p:88,d:"Verdrinkt het slagveld in puur verdriet."},
  S_claire:{n:"Full Crashout",t:"Fighting",p:95,eff:{recoil:0.25},d:"Volledige meltdown. Enorme schade — ook aan zichzelf."},
  S_jax:{n:"Diss Track",t:"Dark",p:90,eff:{stat:'atk',stage:-1,target:'foe',chance:0.4},d:"16 bars puur venijn. Demoraliseert de tegenstander."},
  S_prei:{n:"Preigeweer",t:"Grass",p:88,d:"Vuurt prei af met dodelijke precisie."},
  S_devin:{n:"Snuitboor",t:"Bug",p:88,eff:{stat:'def',stage:-1,target:'foe',chance:0.3},d:"Boort dwars door je pantser. Kan verdediging verlagen."},
  S_stalker:{n:"Always Watching",t:"Ghost",p:85,eff:{flinch:0.3},d:"Verschijnt uit het niets. Grote kans om te doen terugdeinzen."},
  S_hammed:{n:"Free Nitro Scam",t:"Dark",p:82,eff:{stat:'def',stage:-1,target:'foe',chance:0.3},d:"'Klik deze link.' Je verliest alles — en je dekking."},
  S_jake:{n:"Moonlit Arrow",t:"Psychic",p:88,d:"Geleid door de maan. Mist nooit."},
  S_nathan:{n:"Homerun Swing",t:"Fighting",p:85,eff:{flinch:0.1},d:"Full swing. De bal (en jij) vliegen weg."},
  S_fluharthy:{n:"Botknuppel Homerun",t:"Fighting",p:95,eff:{flinch:0.2},d:"Slaat je de canyon uit met een knuppel van puur bot. Grote kans op terugdeinzen."},
  S_milo:{n:"Speedrun",t:"Electric",p:85,eff:{status:'para',chance:0.15},d:"Any% strat. Direct voor de kill, kans op verlamming."},
  S_slechte:{n:"Kauwgom Aanval",t:"Poison",p:85,eff:{status:'poison',chance:0.5},d:"Kauwgom in je haar. Grote kans op vergif."},
  S_otis:{n:"Puppy Eyes",t:"Normal",p:70,eff:{stat:'atk',stage:-1,target:'foe',chance:0.5},d:"Veel te schattig. Verlaagt vaak de aanval van de tegenstander."},
  S_metaai:{n:"Unprompted Reply",t:"Steel",p:85,eff:{flinch:0.2},d:"Antwoordt op wat niemand vroeg. Verwarrend krachtig."},
  S_sanne:{n:"Mom Voice",t:"Normal",p:80,eff:{flinch:0.2},d:"Je volledige naam. Je bevriest ter plekke."},
  S_sonia:{n:"Royal Decree",t:"Psychic",p:85,eff:{flinch:0.3},d:"Een koninklijk bevel. Grote kans om te doen terugdeinzen."},
  S_kimchi:{n:"Kimchi Toss",t:"Poison",p:85,eff:{status:'poison',chance:0.4},d:"Gefermenteerd projectiel. Grote kans op vergif."},
  S_dynant:{n:"Waterkanon",t:"Water",p:88,eff:{stat:'def',stage:-1,target:'foe',chance:0.2},d:"Volle druk. Blaast je van de kaart."},
  S_yassin:{n:"Karate Chop",t:"Fighting",p:85,d:"HIYAAA. Splijt bakstenen én tegenstanders."},
  S_ionnyx:{n:"Chroma Claw",t:"Psychic",p:88,chroma:true,d:"Een klauw vol schuivende kleuren. Wie geraakt wordt, krijgt Ionnyx' kristallijne kleurpatroon opgedrukt — Ionnyx telt daarna als Psychic/Rock tegen dát doelwit, in aanval én verdediging. De markering blijft het hele gevecht."}
};
/* status-moves (geen schade; act = effect). cat:'status' */
const STATUS_MOVES = {
  ST_RECOVER:{n:"Recover",t:"Normal",p:0,cat:'status',act:{heal:0.35},d:"Herstelt ~35% van je max HP. Max 3× per gevecht."},
  ST_HYPE:{n:"Hype Up",t:"Normal",p:0,cat:'status',act:{stat:'atk',stage:2,target:'self'},d:"Pompt zichzelf op. Aanval fors omhoog."},
  ST_HARDEN:{n:"Verschans",t:"Steel",p:0,cat:'status',act:{stat:'def',stage:2,target:'self'},d:"Verhardt volledig. Verdediging fors omhoog."},
  ST_GLARE:{n:"Intimidatie",t:"Dark",p:0,cat:'status',act:{stat:'atk',stage:-2,target:'foe'},d:"Verlaagt de aanval van de tegenstander flink."},
  ST_WISP:{n:"Wil-o-Wisp",t:"Fire",p:0,cat:'status',acc:85,act:{status:'burn',target:'foe'},d:"Zet de tegenstander in brand. Kan missen (85%)."},
  ST_TOXIC:{n:"Gifprik",t:"Poison",p:0,cat:'status',acc:85,act:{status:'poison',target:'foe'},d:"Vergiftigt de tegenstander. Kan missen (85%)."},
  ST_SPORE:{n:"Slaappoeder",t:"Grass",p:0,cat:'status',acc:75,act:{status:'sleep',target:'foe'},d:"Doet de tegenstander in slaap vallen. Onbetrouwbaar (75%)."},
  ST_TWAVE:{n:"Thunder Wave",t:"Electric",p:0,cat:'status',acc:90,act:{status:'para',target:'foe'},d:"Verlamt de tegenstander. Kan missen (90%)."},
  ST_AGILITY:{n:"Agility",t:"Psychic",p:0,cat:'status',act:{stat:'spd',stage:2,target:'self'},d:"Snelheid fors omhoog."}
};
/* veldkunsten (HM's) — echte moves die je aan een geschikte widrmon leert (Gen 1-4 stijl).
   Ze bezetten een move-slot en zijn ook gewoon bruikbaar in gevecht. hm: = veldkunst-sleutel. */
const HM_MOVES = {
  HM_Cut:{n:"Klief",t:"Grass",p:55,hm:'cut',hmMove:true,d:"Veldkunst. Hakt kleine boompjes op de kaart weg — en snijdt in gevecht."},
  HM_Smash:{n:"Krachtsmash",t:"Fighting",p:55,hm:'smash',hmMove:true,eff:{stat:'def',stage:-1,target:'foe',chance:0.3},d:"Veldkunst. Verbrijzelt rotsblokken op de kaart. Kan verdediging verlagen."},
  HM_Surf:{n:"Surf",t:"Water",p:90,hm:'surf',hmMove:true,d:"Veldkunst. Zwem over diep water — en overspoel je tegenstander."},
  HM_Fly:{n:"Vlucht",t:"Flying",p:90,hm:'fly',hmMove:true,d:"Veldkunst. Vlieg naar een bezochte stad — of duik van bovenaf op je tegenstander."}
};

/* ===== DE WIDRMON (42) — iedereen 4 moves (mix van general / type / signature + coverage) ===== */
const MON = [
 {n:"Fionn",e:"☘️",t:["Grass","Fairy"],hp:70,atk:72,def:66,spd:72,
  dex:"De Ier. Klaverblad-geluk en leprechaun-magie. Statistisch gezien altijd mazzel, behalve als het telt.",mv:["T_Grass","T_Fairy","ST_SPORE","G_TACKLE"],evo:{into:"Lawrence",lv:28}},
 {n:"Lawrence",e:"🍀",t:["Grass","Fairy"],hp:75,atk:85,def:72,spd:78,
  dex:"Fionn volgroeid. Het geluk zit nu in z'n vacht — vier klaverblaadjes, bloem op de kruin en aura van pure mazzel.",mv:["T_Grass","T_Fairy","ST_SPORE","G_TAKE"]},
 {n:"Daniel",e:"💣",t:["Fire"],hp:65,atk:95,def:48,spd:68,
  dex:"Gooit alles op ontploffen. Vraag niet naar de details, vraag naar de radius.",mv:["T_Fire","ST_WISP","G_SLAM","G_QUICK"],evo:{into:"Evil Jax",lv:28}},
 {n:"Evil Jax",e:"🎤",t:["Dark","Fire"],hp:70,atk:88,def:56,spd:82,
  dex:"Rapper met disstracks over de hele gc. Z'n bars zijn zo heet dat de mic smelt.",mv:["S_jax","T_Fire","G_QUICK","G_TACKLE"]},
 {n:"Marlin Miami",e:"🌴",t:["Water"],hp:75,atk:70,def:70,spd:72,
  dex:"Hella chill gast uit Miami. Onaangedaan door alles. Vibes-based combatant.",mv:["T_Water","ST_RECOVER","G_SLAM","G_QUICK"],evo:{into:"Maria Miami",lv:28}},
 {n:"Maria Miami",e:"🌊",t:["Water","Poison"],hp:82,atk:80,def:78,spd:80,
  dex:"Marlin volgroeid. Nog steeds hella chill, maar nu met de golven aan z'n kant. Ultieme vibes, ultieme flow.",mv:["T_Water","T_Poison","ST_RECOVER","G_SLAM"]},
 {n:"Otis",e:"🐶",t:["Normal","Rock"],hp:92,atk:58,def:82,spd:60,
  dex:"Een beagle. Goodest boy in de widr region. Kan niet verliezen, alleen snacks krijgen.",mv:["S_otis","ST_RECOVER","T_Rock","G_QUICK"]},
 {n:"Claire",e:"💥",t:["Fighting","Dark"],hp:70,atk:92,def:52,spd:76,
  dex:"Crasht consequent uit. Van nul naar honderd in 0,2 seconden. Onvoorspelbaar en bang.",mv:["S_claire","T_Dark","G_HEAD","G_QUICK"],evo:{into:"Kayo & Yara",lv:26}},
 {n:"Kayo & Yara",e:"🐱",t:["Normal","Dark"],hp:70,atk:72,def:60,spd:86,
  dex:"Lars' katten. Twee-voor-de-prijs-van-één. Vallen uit de schaduw aan en negeren je daarna.",mv:["T_Dark","T_Normal","G_SCRATCH","G_QUICK"]},
 {n:"Adam",e:"🏓",t:["Normal"],hp:72,atk:72,def:78,spd:88,
  dex:"Pingpong-god. Kaatst alles terug, letterlijk en figuurlijk. 21-0, elke keer.",mv:["T_Normal","G_QUICK","G_SLAM","G_HEAD"],evo:{into:"Dynant",lv:22}},
 {n:"Dynant",e:"🚒",t:["Water","Fighting"],hp:94,atk:98,def:94,spd:62,
  dex:"Brandweerman. Blust jouw hele vibe met een waterkanon. Held met een slang.",mv:["S_dynant","T_Fighting","G_SLAM","G_TACKLE"]},
 {n:"Serveerster",e:"🍽️",t:["Normal"],hp:90,atk:64,def:84,spd:54,
  dex:"De serveerster. Neemt je bestelling op en serveert je vervolgens een pak slaag.",mv:["T_Normal","G_TACKLE","G_SLAM","G_QUICK"]},
 {n:"Jenna",e:"🥪",t:["Electric"],hp:60,atk:80,def:56,spd:124,
  dex:"Snelste meid van de gc. Racet voor sandwiches en heeft er nog nooit één verloren.",mv:["T_Electric","ST_AGILITY","G_QUICK","G_TACKLE"]},
 {n:"Nathan",e:"⚾",t:["Fighting"],hp:88,atk:120,def:98,spd:64,
  dex:"Slaat honkballen zo hard dat ze in een andere gc landen. Roept 'HOMERUN' bij letterlijk alles.",mv:["S_nathan","T_Fighting","T_Fire","G_SLAM"]},
 {n:"Renas",e:"👟",t:["Flying","Fighting"],hp:70,atk:98,def:66,spd:94,
  dex:"Josh' broer. Kopieert alles wat Josh doet vanuit de lucht, maar beweert dat hij het eerst deed.",mv:["T_Flying","T_Fighting","G_QUICK","G_TACKLE"]},
 {n:"Josh",e:"🧭",t:["Flying"],hp:68,atk:78,def:62,spd:102,
  dex:"De scout. Verkent alles vanuit de lucht en weet altijd waar iedereen is — behalve z'n eigen spullen.",mv:["T_Flying","G_QUICK","G_TACKLE","G_HEAD"]},
 {n:"Milo",e:"💨",t:["Electric","Flying"],hp:62,atk:88,def:58,spd:118,
  dex:"De quickster. Zo snel dat 'ie half de lucht in schiet. Al drie zetten verder voordat jij koos.",mv:["S_milo","T_Electric","T_Flying","G_QUICK"]},
 {n:"Devin",e:"🪲",t:["Bug"],hp:82,atk:112,def:96,spd:58,
  dex:"Een snuitkever met een snuit als een boormachine. Klein, gepantserd, meedogenloos. Dé bug-specialist van de widr region.",mv:["S_devin","T_Ground","G_TAKE","G_QUICK"]},
 {n:"Reshman",e:"🪔",t:["Fire","Ground"],hp:108,atk:100,def:98,spd:42,
  dex:"Brengt de heat — qua spice én qua comebacks. Stampt de grond plat met kruidige kracht.",mv:["T_Fire","T_Ground","G_SLAM","G_TACKLE"]},
 {n:"Young Fyon",e:"🍼",t:["Grass","Bug"],hp:60,atk:66,def:56,spd:76,
  dex:"Een jongere versie van Fionn. Al het geluk, nog niet de ervaring. Baby-Ier in cocon-fase.",mv:["T_Grass","T_Bug","G_TACKLE","G_QUICK"],evo:{into:"Kim Chi",lv:16}},
 {n:"Kim Chi",e:"🥬",t:["Grass","Poison"],hp:72,atk:82,def:66,spd:74,
  dex:"Gooit kimchi. Gefermenteerd, dodelijk, ontzettend lekker. De bacteriën doen de rest.",mv:["S_kimchi","T_Grass","T_Poison","G_QUICK"]},
 {n:"Prei",e:"🐰",t:["Grass","Normal"],hp:70,atk:80,def:60,spd:78,
  dex:"Het vrouwtjeskonijn van meneer Doremalen. Bewapend met een preigeweer. Onderschat de prei niet.",mv:["S_prei","T_Normal","G_QUICK","G_TACKLE"]},
 {n:"Sanne Vosters",e:"👩",t:["Normal","Steel"],hp:88,atk:62,def:82,spd:58,
  dex:"Moeder van Anker Vos. Mom-energie zo sterk dat ze je vanuit een andere kamer corrigeert.",mv:["S_sanne","ST_GLARE","T_Steel","G_QUICK"]},
 {n:"Fein",e:"🐴",t:["Ground","Rock"],hp:70,atk:75,def:80,spd:50,
  dex:"Een jong rots-veulen uit de canyons. Nog klein, maar de stenen platen groeien al. Wordt ooit Dean.",mv:["T_Ground","T_Rock","G_TACKLE","G_QUICK"],evo:{into:"Dean",lv:30}},
 {n:"Dean",e:"🤠",t:["Ground","Rock"],hp:100,atk:108,def:98,spd:66,
  dex:"Rechtstreeks uit Red Dead Redemption 2. Praat traag, schiet snel, leeft tussen de rotscanyons. Yeehaw.",mv:["T_Ground","T_Rock","G_TAKE","G_QUICK"]},
 {n:"Yassin",e:"🥋",t:["Fighting","Rock"],hp:76,atk:110,def:80,spd:82,
  dex:"Deed één keer karate en laat het je nooit vergeten. Splijt bakstenen met blote hand.",mv:["S_yassin","T_Rock","G_TACKLE","G_QUICK"]},
 {n:"Fluharthy",e:"⚾",t:["Fighting","Dragon"],hp:80,atk:92,def:70,spd:70,
  dex:"Professionele honkballer. Waar Nathan amateur is, is Fluharthy major league. Slaat als een boulder.",mv:["S_fluharthy","T_Dragon","G_TAKE","G_SLAM"]},
 {n:"Intratuin Potplant",e:"🪴",t:["Grass","Ground"],hp:78,atk:60,def:82,spd:38,
  dex:"Een potplant van de Intratuin. Doet helemaal niks. Staat er gewoon. Verdedigt als een muur.",mv:["T_Grass","T_Ground","ST_RECOVER","G_SLAM"]},
 {n:"Lars",e:"🎀",t:["Fairy"],hp:80,atk:70,def:70,spd:78,
  dex:"De femboy van de gc. Slay incarnate. Verdedigt met pure aura en een strikje.",mv:["T_Fairy","G_SLAM","G_QUICK","G_TACKLE"]},
 {n:"Robin",e:"😭",t:["Water","Ice"],hp:72,atk:66,def:62,spd:60,
  dex:"Huilt. Altijd. De tranen zijn zowel z'n zwakte als z'n wapen — en ze bevriezen mid-air.",mv:["S_robin","T_Ice","G_TACKLE","G_QUICK"],evo:{into:"Johan",lv:24}},
 {n:"Johan",e:"🧹",t:["Water","Steel"],hp:76,atk:76,def:82,spd:54,
  dex:"Milo's vader. De cleaner. Dweilt je van de kaart en poetst het bewijs weg — streeploos.",mv:["T_Water","T_Steel","ST_HARDEN","G_SLAM"]},
 {n:"Jake",e:"🏹",t:["Psychic"],hp:75,atk:82,def:65,spd:82,
  dex:"Heeft Artemis-krachten. Maangodin-energie, boog inbegrepen. Mist nooit.",mv:["S_jake","T_Fairy","G_QUICK","G_TACKLE"]},
 {n:"Sonia Nevermind",e:"👑",t:["Steel","Psychic"],hp:75,atk:76,def:70,spd:72,
  dex:"Prinses rechtstreeks uit Danganronpa. Ultimate royalty, verrassend into duistere hobby's.",mv:["S_sonia","T_Steel","T_Fairy","G_QUICK"]},
 {n:"Carol",e:"👵",t:["Ghost","Bug"],hp:75,atk:76,def:70,spd:60,
  dex:"Oude vrouw met roze haar, roze huid en roze bril uit de game 'Funocracy'. Onberekenbaar en roze.",mv:["T_Ghost","T_Bug","G_TACKLE","G_QUICK"]},
 {n:"Deniz",e:"🧊",t:["Ice","Ghost"],hp:75,atk:72,def:75,spd:58,
  dex:"Ice cold. Reageert nergens op en ghost je in de chat met één ijzige 'k'.",mv:["S_deniz","T_Ghost","G_TACKLE","G_QUICK"]},
 {n:"Meta AI",e:"🤖",t:["Steel","Electric"],hp:80,atk:82,def:76,spd:76,
  dex:"De AI 'Meta'. Verschijnt ongevraagd in elke chat. Beantwoordt vragen die niemand stelde.",mv:["S_metaai","T_Electric","ST_TWAVE","G_TACKLE"]},
 {n:"De Kapper",e:"✂️",t:["Steel"],hp:70,atk:78,def:72,spd:70,
  dex:"Een kapper. 'Zeg maar wanneer' — en dan snijdt hij toch te veel af. Precisie-wapen.",mv:["T_Steel","ST_HARDEN","G_SCRATCH","G_QUICK"]},
 {n:"Evil Adam",e:"😈",t:["Dark","Flying"],hp:75,atk:88,def:62,spd:78,
  dex:"Adam, maar dan kwaadaardig. Kreeg vleermuisvleugels en dook de duisternis in — dezelfde reflexen, geen enkele moraal.",mv:["T_Dark","T_Flying","G_HEAD","G_QUICK"],evo:{into:"Adma Jr",lv:34}},
 {n:"Adma Jr",e:"👿",t:["Dark","Fairy"],hp:72,atk:82,def:60,spd:78,
  dex:"Dochter van Evil Adam. Erfde de kwaadaardigheid, verbeterde de techniek. Duistere feeënprinses.",mv:["T_Dark","T_Fairy","G_QUICK","G_TACKLE"]},
 {n:"Slechte Meiden",e:"💅",t:["Dark","Poison"],hp:70,atk:80,def:60,spd:80,
  dex:"Een groep bad girls die mensen duwt en kauwgom in je haar plakt. Terreur op het schoolplein.",mv:["S_slechte","T_Dark","ST_GLARE","G_QUICK"]},
 {n:"Hammed",e:"🦊",t:["Ghost","Fairy"],hp:70,atk:78,def:60,spd:78,
  dex:"Furry Discord-scammer. Belooft je Nitro, verdwijnt met je account. Trust nobody, vooral niet Hammed.",mv:["S_hammed","T_Ghost","T_Fairy","G_QUICK"]},
 {n:"Stalker",e:"👁️",t:["Ghost","Dark"],hp:70,atk:76,def:66,spd:82,
  dex:"De stalker. Was er altijd al. Achter je. Nu ook. Zie je hem? Nee. Ziet hij jou? Ja.",mv:["S_stalker","T_Dark","G_QUICK","G_TACKLE"]},
 {n:"Druk",e:"🐉",t:["Dragon","Electric"],hp:95,atk:96,def:82,spd:82,rarity:"Legendary",
  dex:"De Donderdraak van de vlag van Bhutan. LEGENDARISCH. Rijdt op onweer, bezit de juwelen van welvaart.",mv:["S_druk","T_Electric","T_Flying","G_TAKE"]},
 {n:"Isis",e:"🕳️",t:["Psychic","Dark"],hp:90,atk:96,def:76,spd:86,rarity:"Legendary",
  dex:"De hoofdpersoon van het boek 'WIP'. Manipuleert zwarte gaten. LEGENDARISCH. Buigt de ruimte naar haar wil.",mv:["S_isis","T_Psychic","T_Ghost","G_TAKE"]},
 {n:"Aasta",e:"💖",t:["Fairy","Flying"],hp:88,atk:88,def:78,spd:84,rarity:"Mythical",
  dex:"Verschijnt slechts één keer per seizoen. Lars' vriendin. MYTHISCH. Als je haar spot, ben je de klos.",mv:["S_aasta","T_Flying","T_Psychic","G_QUICK"]},
 {n:"Ionnyx",e:"🌈",t:["Psychic"],hp:70,atk:96,def:66,spd:100,
  dex:"Een wezen van schuivende, verblindende kleuren — zó fel dat kijken pijn doet. Met Chroma Claw drukt het z'n kristallijne kleurpatroon áf op wie het raakt, en gedraagt zich daarna als Psychic/Rock tegen precies dat doelwit.",mv:["S_ionnyx","T_Psychic","T_Rock","G_QUICK"]},
 {n:"Claudio",e:"🪶",t:["Flying"],hp:52,atk:60,def:48,spd:80,
  dex:"Jong verkennersvogeltje met veel te grote vleugels. Oefent nog op landen en botst overal tegenaan. Groeit uit tot Josh.",mv:["T_Flying","G_QUICK","G_TACKLE","G_HEAD"],evo:{into:"Josh",lv:18}},
 {n:"Ash",e:"🐊",t:["Dragon"],hp:62,atk:78,def:58,spd:60,
  dex:"Een fel klein draakje met scherpe stekels en nul geduld. Hapt eerst, denkt nooit. Wordt later de major-league slugger Fluharthy.",mv:["T_Dragon","G_TACKLE","G_QUICK","G_HEAD"],evo:{into:"Fluharthy",lv:30}},
 {n:"Thomas",e:"🎃",t:["Bug","Ghost"],hp:58,atk:60,def:56,spd:48,
  dex:"Een spookachtig pompoen-geestje met bleek popgezicht en paarse dwaallichtjes. Zweeft je zwijgend achterna. Wordt ooit de onberekenbare Carol.",mv:["T_Bug","T_Ghost","G_TACKLE","G_QUICK"],evo:{into:"Carol",lv:22}},
 {n:"Marloes",e:"💎",t:["Steel"],hp:62,atk:56,def:74,spd:56,
  dex:"Een sierlijk kristal-hertje met paarse edelstenen en gouden hoefjes. Nog jong, maar haar pantser glinstert al koninklijk. Wordt later Sonia Nevermind.",mv:["T_Steel","G_TACKLE","G_QUICK","G_HEAD"],evo:{into:"Sonia Nevermind",lv:20}},
 {n:"Niek",e:"❄️",t:["Ice"],hp:60,atk:64,def:56,spd:58,
  dex:"Een donkerblauw ijspup-draakje met kristallen stekels en koud-blauwe dwaalvlammen. Kijkt je bevroren aan. Groeit uit tot de ijzige Deniz.",mv:["T_Ice","G_TACKLE","G_QUICK","G_HEAD"],evo:{into:"Deniz",lv:20}},
 {n:"Zenith",e:"🔥",t:["Rock","Fire"],hp:52,atk:56,def:54,spd:50,
  dex:"Een pasgeboren lava-welpje, gewekt uit een gloeiend fossiel. Klein en speels, maar de magma in z'n aders borrelt al. Groeit uit tot Bing.",mv:["T_Fire","T_Rock","G_TACKLE","G_QUICK"],evo:{into:"Bing",lv:22}},
 {n:"Bing",e:"🌋",t:["Rock","Fire"],hp:74,atk:82,def:76,spd:58,
  dex:"Zenith halfvolgroeid. Z'n rug barst open met magma-platen en z'n vlammenmanen laaien fel. Onstuimig en heetgebakerd. Wordt later Casper.",mv:["T_Fire","T_Rock","G_SLAM","G_QUICK"],evo:{into:"Casper",lv:38}},
 {n:"Casper",e:"🐉",t:["Rock","Fire"],hp:98,atk:118,def:104,spd:60,
  dex:"De volgroeide lava-kolos, gepantserd in gloeiend basalt met een staart van gestold magma. Elke stap doet de grond scheuren — een oeroud fossiel weer tot leven.",mv:["T_Fire","T_Rock","G_TAKE","G_SLAM"]}
];

/* ---- BST-tiers: schaal elke mon naar z'n doel-BST (stat-vorm blijft behouden) ----
   starters sterk, vroege wilde mons zwak, aces/legendaries hoog. */
const BST_TIER={
  // starters
  "Fionn":316,"Daniel":316,"Marlin Miami":316,  // starters — gelijke BST per fase
  "Young Fyon":232,"Intratuin Potplant":240,"Robin":248,"Otis":292,"Fein":262,
  "Carol":258,"Serveerster":292,"Jenna":320,"Sanne Vosters":290,"Kayo & Yara":356,
  // lage commons
  "Adam":310,"Prei":284,"Kim Chi":294,"Deniz":284,"Josh":310,"Renas":328,
  "Lars":288,"Sonia Nevermind":288,"Milo":326,"Hammed":290,"Reshman":348,
  "Stalker":294,"Adma Jr":372,"Slechte Meiden":296,
  // solide mid
  "De Kapper":308,"Johan":312,"Nathan":370,"Jake":315,"Yassin":348,"Dean":372,
  // sterke aces
  "Dynant":348,"Devin":348,"Claire":300,"Meta AI":356,"Maria Miami":362,"Evil Jax":362,"Lawrence":362,"Evil Adam":312,"Fluharthy":388,"Ionnyx":368,
  // pre-evoluties (zwakker dan hun eindvorm)
  "Claudio":238,"Ash":262,"Thomas":214,"Marloes":230,"Niek":224,
  // fossiel-lijn (Rock/Fire)
  "Zenith":250,"Bing":336,"Casper":380
};
MON.forEach(m=>{
  const cur=m.hp+m.atk+m.def+m.spd;
  const tgt = m.rarity==='Legendary'?540 : m.rarity==='Mythical'?470 : (BST_TIER[m.n]||300);
  const k=tgt/cur;
  m.hp=Math.max(20,Math.round(m.hp*k));
  m.atk=Math.round(m.atk*k); m.def=Math.round(m.def*k); m.spd=Math.round(m.spd*k);
});

/* ---- abilities ---- */
const ABILITIES={
 power:{name:'Krachtpatser',desc:'Alle aanvallen doen 1.15× schade.'},
 overdrive:{name:'Overdrive',desc:'1.5× schade zodra HP onder 1/3 zakt.'},
 adrenaline:{name:'Adrenaline',desc:'1.5× snelheid zodra HP onder 1/3 zakt.'},
 sharpshoot:{name:'Scherpschutter',desc:'Eigen moves krijgen +12% accuracy.'},
 deadeye:{name:'Trefzeker',desc:'Aanvallen missen nooit.'},
 thick:{name:'Dikhuid',desc:'Inkomende schade wordt 15% verlaagd.'},
 crit:{name:'Scherp',desc:'Dubbele kans op een kritieke treffer.'},
 immune:{name:'Immuun',desc:'Kan geen status (brand/gif/slaap/verlamming/vries) krijgen.'},
 flamebody:{name:'Vlamlichaam',desc:'30% kans de aanvaller te verbranden bij een klap.'},
 poisonbody:{name:'Gifhuid',desc:'30% kans de aanvaller te vergiftigen bij een klap.'},
 vamp:{name:'Vampier',desc:'Herstelt 25% van de uitgedeelde schade.'},
 regen:{name:'Regeneratie',desc:'Herstelt elke beurt 1/16 van max HP.'},
 speedup:{name:'Versnelling',desc:'Snelheid stijgt elke beurt (+1).'},
 sturdy:{name:'Taai',desc:'Overleeft vanaf vol HP één dodelijke klap met 1 HP.'},
 intimidate:{name:'Intimidatie',desc:'Verlaagt bij binnenkomst de aanval van de tegenstander.'},
 guts:{name:'Doorzetter',desc:'1.5× aanval mét een status; negeert de brand-verzwakking.'},
 blaze:{name:'Laaiend',desc:'1.3× schade met Fire-aanvallen.'},
 torrent:{name:'Stortvloed',desc:'1.3× schade met Water-aanvallen.'},
 overgrow:{name:'Woekering',desc:'1.3× schade met Grass-aanvallen.'},
 static:{name:'Statisch',desc:'30% kans de aanvaller te verlammen bij een klap.'},
 swift:{name:'Rap',desc:'+15% snelheid.'},
 bulk:{name:'Bonkig',desc:'Inkomende schade wordt 20% verlaagd.'},
 hardhead:{name:'Koppig',desc:'Kan niet doen terugdeinzen (flinch-immuun).'}
};
const ABIL_ASSIGN={
 "Nathan":"power","Yassin":"guts","Daniel":"overdrive","Josh":"sharpshoot","Lars":"immune",
 "Milo":"speedup","Deniz":"immune","Fionn":"crit","Reshman":"flamebody","Renas":"sharpshoot",
 "Adam":"thick","Evil Adam":"power","Otis":"regen","Johan":"thick","Robin":"adrenaline",
 "Jake":"deadeye","Kim Chi":"poisonbody","Dean":"crit","Claire":"overdrive","Serveerster":"thick",
 "Sanne Vosters":"intimidate","Fluharthy":"power","Stalker":"crit","Marlin Miami":"immune",
 "Sonia Nevermind":"intimidate","Evil Jax":"flamebody","De Kapper":"sharpshoot","Dynant":"thick",
 "Adma Jr":"guts","Kayo & Yara":"adrenaline","Jenna":"speedup","Druk":"power","Young Fyon":"regen",
 "Meta AI":"sharpshoot","Intratuin Potplant":"sturdy","Slechte Meiden":"intimidate","Hammed":"vamp",
 "Aasta":"deadeye","Carol":"crit","Prei":"crit","Isis":"deadeye","Devin":"power","Ionnyx":"sharpshoot",
 "Claudio":"swift","Ash":"power","Thomas":"crit","Marloes":"bulk","Niek":"immune",
 "Zenith":"blaze","Bing":"flamebody","Casper":"bulk"
};
MON.forEach(m=>{ m.ability = ABIL_ASSIGN[m.n]||'power'; });
/* elke mon krijgt meerdere mogelijke abilities: primair + type-gebonden (wisselbaar in het team-overzicht) */
const TYPE_ABILITY2={
  Fire:'blaze', Water:'torrent', Grass:'overgrow', Electric:'static', Fighting:'guts',
  Rock:'bulk', Ground:'bulk', Flying:'swift', Ice:'immune', Poison:'poisonbody',
  Bug:'swift', Ghost:'immune', Dragon:'power', Dark:'crit', Steel:'bulk',
  Fairy:'thick', Psychic:'sharpshoot', Normal:'thick'
};
MON.forEach(m=>{
  const prim=m.ability, list=[prim];
  (m.t||[]).forEach(t=>{ const a=TYPE_ABILITY2[t]; if(a && !list.includes(a)) list.push(a); });
  if(list.length<2) list.push(prim==='power'?'thick':'power');
  m.abilities=list;
});

/* resolve mv-keys -> move objecten */
MON.forEach(m=>{ m.moves = m.mv.map(k => GENERAL_MOVES[k]||TYPE_MOVES[k]||SIGNATURE_MOVES[k]||STATUS_MOVES[k]); });

/* ===== SPELERS ===== */
const PLAYERS = [
  {id:"akker",name:"Mevrouw Akker",e:"👩‍🎓",role:"Widr Trainer"},
  {id:"keeren",name:"Meneer van Keeren",e:"👨‍🎓",role:"Widr Trainer"}
];

/* ===== TRAINERS ===== */
const TRAINERS = [
 {id:"goeij",name:"Mevrouw de Goeij",e:"📚",type:"Normal",role:"Gym",order:1,subject:"Studieplein / Opvang",badge:"Opvang Badge",mul:1.0,
  team:["Otis","Serveerster","Claire"],flavor:"Rustig beginnetje. Houdt de orde op het studieplein — en in de arena."},
 {id:"deboer",name:"Mevrouw de Boer",e:"🏃‍♀️",type:"Fighting",role:"Gym",order:2,subject:"Gym / LO",badge:"Gymzaal Badge",mul:1.02,
  team:["Claire","Dynant","Nathan"],flavor:"'Nog tien push-ups.' Fysiek de zwaarste gym van het onderbouwjaar."},
 {id:"hugens",name:"Mevrouw Hugens",e:"🥖",type:"Ground",role:"Gym",order:3,subject:"Frans",badge:"Baguette Badge",mul:1.04,
  team:["Reshman","Intratuin Potplant","Dean"],flavor:"Bonjour. Aardvaste aanvallen, net zo onverzettelijk als de Franse grammatica."},
 {id:"abdullah",name:"Meneer Abdullah",e:"🗺️",type:"Rock",role:"Gym",order:4,subject:"Aardrijkskunde",badge:"Atlas Badge",mul:1.06,
  team:["Yassin","Otis","Dean"],flavor:"Kent elke bergketen. Z'n team slaat zo hard als tektoniek."},
 {id:"duiven",name:"Mevrouw van Duiven",e:"🕊️",type:"Flying",role:"Gym",order:5,subject:"Global Perspectives",badge:"Globe Badge",mul:1.08,
  team:["Josh","Renas","Milo"],flavor:"Wereldwijd perspectief, letterlijk vanuit de lucht."},
 {id:"doremalen",name:"Meneer Doremalen",e:"🧪",type:"Grass",role:"Gym",order:6,subject:"Scheikunde",badge:"Prei Badge",mul:1.1,
  team:["Fionn","Young Fyon","Prei"],flavor:"Eigenaar van Prei het konijn. Z'n plant-chemie is dodelijk organisch."},
 {id:"deroode",name:"Mevrouw de Roode",e:"📐",type:"Psychic",role:"Gym",order:7,subject:"Wiskunde",badge:"Formule Badge",mul:1.12,
  team:["Jake","Sonia Nevermind","Carol"],flavor:"Rekent je zwakte uit tot achter de komma. Psychische precisie."},
 {id:"vark",name:"Mevrouw van Vark",e:"🕳️",type:"Dark",role:"Gym",order:8,subject:"Natuurkunde",badge:"Zwartgat Badge",mul:1.14,
  team:["Evil Jax","Adma Jr","Slechte Meiden"],flavor:"Doceert zwarte gaten en beoefent ze. De laatste badge is de duisterste."},
 {id:"groenland",name:"Mevrouw Groenland",e:"🔬",type:"Bug",role:"Elite",order:1,subject:"Biologie (E4)",badge:null,mul:1.16,
  team:["Devin","Kim Chi","Young Fyon"],flavor:"Elite Four #1. Kweekt insecten die je niet wil ontmoeten."},
 {id:"vangelder",name:"Meneer van Gelder",e:"💶",type:"Steel",role:"Elite",order:2,subject:"Economie (E4)",badge:null,mul:1.18,
  team:["Johan","De Kapper","Meta AI"],flavor:"Elite Four #2. Keihard, koud en efficiënt als de vrije markt."},
 {id:"zilfhout",name:"Mevrouw van Zilfhout",e:"⛪",type:"Fairy",role:"Elite",order:3,subject:"Religious Studies (E4)",badge:null,mul:1.2,
  team:["Lars","Fionn","Adma Jr"],flavor:"Elite Four #3. Feeënmagie met een hogere macht achter zich."},
 {id:"devos",name:"Meneer de Vos",e:"📜",type:"Ghost",role:"Elite",order:4,subject:"Geschiedenis (E4)",badge:null,mul:1.22,
  team:["Stalker","Deniz","Hammed"],flavor:"Elite Four #4. Roept de geesten van het verleden op. Laatste horde voor de Champion."},
 {id:"ploeg",name:"Meneer van der Ploeg",e:"👑",type:"Dragon",role:"Champion",order:1,subject:"Biologie • Champion",badge:null,mul:1.3,
  team:["Fluharthy","Druk","Isis"],flavor:"De Champion. Biologiedocent met een wandelstok en een team van legendes. Versla hem en je bent de widr Champion."},
 {id:"vanduin",name:"Mevrouw van Duin",e:"😈",type:"Poison",role:"Evil",order:1,subject:"Team Widr — Leider",badge:null,mul:1.15,double:true,
  team:["Slechte Meiden","Kayo & Yara","Hammed"],flavor:"Baas van Team Widr. Wil de gc overnemen met giftige plannen."},
 {id:"provoost",name:"Mevrouw Provoost",e:"🦹‍♀️",type:"Dark",role:"Evil",order:2,subject:"Team Widr — Leider",badge:null,mul:1.15,double:true,
  team:["Evil Adam","Stalker","Adma Jr"],flavor:"De tweede leider van Team Widr. Puur duisternis en dubbele agenda's."},
 {id:"vleij",name:"Meneer de Vleij",e:"😎",type:"Fire",role:"Rival",order:1,subject:"Je rivaal",badge:null,mul:1.08,double:true,
  team:["Dean","Milo","Evil Jax"],flavor:"Je eeuwige rivaal. Altijd één badge voor of achter op je. 'Kom op, laat maar zien.'"}
];
