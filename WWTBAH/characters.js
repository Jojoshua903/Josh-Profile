const AV = {
  chemmy: `<svg viewBox="0 0 120 120" class="av"><circle cx="60" cy="60" r="56" fill="#F2B230" stroke="#2A1F1A" stroke-width="4"/>
    <path d="M24 112c4-24 18-34 36-34s32 10 36 34" fill="#E2412B" stroke="#2A1F1A" stroke-width="4"/>
    <circle cx="60" cy="98" r="7" fill="#FFD15C" stroke="#2A1F1A" stroke-width="3"/><path d="M53 80l7 12 7-12" fill="none" stroke="#24345C" stroke-width="4"/>
    <circle cx="60" cy="54" r="26" fill="#F6C9A0" stroke="#2A1F1A" stroke-width="4"/>
    <path d="M33 46c0-14 12-22 27-22s27 8 27 22c-6-6-12-6-14-4-4-6-22-6-26 0-2-2-8-2-14 4z" fill="#DADADA" stroke="#2A1F1A" stroke-width="3.5"/>
    <rect x="33" y="40" width="54" height="8" rx="4" fill="#E2412B" stroke="#2A1F1A" stroke-width="3"/>
    <circle cx="51" cy="56" r="3" fill="#2A1F1A"/><circle cx="69" cy="56" r="3" fill="#2A1F1A"/>
    <path d="M50 66q10 8 20 0" fill="none" stroke="#2A1F1A" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M47 50l7-1M66 49l7 1" stroke="#2A1F1A" stroke-width="3" stroke-linecap="round"/>
    <g transform="rotate(-25 98 70)"><rect x="94" y="72" width="8" height="22" rx="3" fill="#8a5a3a" stroke="#2A1F1A" stroke-width="3"/><ellipse cx="98" cy="58" rx="15" ry="17" fill="#E2412B" stroke="#2A1F1A" stroke-width="4"/></g>
    <circle cx="20" cy="30" r="6" fill="#fff" stroke="#2A1F1A" stroke-width="3"/></svg>`,
  sichen: `<svg viewBox="0 0 120 120" class="av"><circle cx="60" cy="60" r="56" fill="#F49AA8" stroke="#2A1F1A" stroke-width="4"/>
    <path d="M24 112c4-24 18-34 36-34s32 10 36 34" fill="#1E8C84" stroke="#2A1F1A" stroke-width="4"/>
    <path d="M48 84l12 6 12-6v12l-12-6-12 6z" fill="#F2B230" stroke="#2A1F1A" stroke-width="3"/>
    <circle cx="60" cy="54" r="26" fill="#EBB98E" stroke="#2A1F1A" stroke-width="4"/>
    <path d="M34 48l4-18 8 10 6-14 6 12 8-13 5 13 9-8 1 18c-10-6-36-8-47 0z" fill="#2A1F1A"/>
    <path d="M47 53q4-4 8 0M65 53q4-4 8 0" fill="none" stroke="#2A1F1A" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M44 62q16 20 32 0z" fill="#fff" stroke="#2A1F1A" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M52 69q8 4 16 0" fill="none" stroke="#E2412B" stroke-width="3"/>
    <circle cx="42" cy="62" r="4" fill="#F49AA8" opacity=".8"/><circle cx="78" cy="62" r="4" fill="#F49AA8" opacity=".8"/>
    <path d="M90 26l10-8M94 34l12-2M86 20l2-12" stroke="#2A1F1A" stroke-width="3" stroke-linecap="round"/></svg>`,
  fyon: `<svg viewBox="0 0 120 120" class="av"><circle cx="60" cy="60" r="56" fill="#BFE6C9" stroke="#2A1F1A" stroke-width="4"/>
    <path d="M24 112c4-24 18-34 36-34s32 10 36 34" fill="#3d7a3a" stroke="#2A1F1A" stroke-width="4"/>
    <path d="M70 92c4-4 10-2 8 3-5 0-6 3-8-3zm0 0c-2-6 4-8 6-3-3 3-2 5-6 3zm0 0c-6 0-6 6-1 6 1-3 4-3 1-6z" fill="#2fa84f" stroke="#2A1F1A" stroke-width="1.5"/>
    <ellipse cx="60" cy="56" rx="25" ry="31" fill="#FFF6E2" stroke="#2A1F1A" stroke-width="4"/>
    <path d="M33 38c2-12 14-18 27-18s25 6 27 18c-8-4-46-4-54 0z" fill="#3d7a3a" stroke="#2A1F1A" stroke-width="3.5"/>
    <path d="M30 40c10-4 50-4 64 0" fill="none" stroke="#2A1F1A" stroke-width="4" stroke-linecap="round"/>
    <circle cx="51" cy="56" r="3" fill="#2A1F1A"/><circle cx="69" cy="56" r="3" fill="#2A1F1A"/>
    <path d="M51 70q9 6 18 0" fill="none" stroke="#2A1F1A" stroke-width="3.5" stroke-linecap="round"/>
    <g fill="#d28a5a"><circle cx="45" cy="63" r="1.4"/><circle cx="48" cy="65" r="1.4"/><circle cx="43" cy="66" r="1.4"/><circle cx="75" cy="63" r="1.4"/><circle cx="72" cy="65" r="1.4"/><circle cx="77" cy="66" r="1.4"/></g>
    <path d="M78 76l4 4M80 74l-1 6" stroke="#2A1F1A" stroke-width="2" opacity=".5"/></svg>`,
  you: (n, col = '#F2B230', shirt = '#24345C') => `<svg viewBox="0 0 120 120" class="av"><circle cx="60" cy="60" r="56" fill="#FFF9EC" stroke="#2A1F1A" stroke-width="4"/>
    <path d="M24 112c4-24 18-34 36-34s32 10 36 34" fill="${shirt}" stroke="#2A1F1A" stroke-width="4"/>
    <circle cx="60" cy="52" r="24" fill="${col}" stroke="#2A1F1A" stroke-width="4"/>
    <text x="60" y="62" text-anchor="middle" font-family="Rockwell,Georgia,serif" font-weight="900" font-size="28" fill="#2A1F1A">${(n||'?').trim().charAt(0).toUpperCase()||'?'}</text>
    <path d="M60 4l4 10 10 1-8 6 3 10-9-6-9 6 3-10-8-6 10-1z" fill="#E2412B" stroke="#2A1F1A" stroke-width="2.5"/></svg>`
};

const JOKE = "You know the joke about the airplane? Well, it didn't really land for most people!";

const LINES = {
  sichenRight: [
    JOKE + " Unlike that answer. Nailed it.",
    "Correct! And you know the joke about the airplane? Well, it didn't really land for most people!",
    "Got it! Speaking of things that land: you know the joke about the airplane?… It didn't really land for most people!",
    "Smooth touchdown! Which is more than I can say for my airplane joke. It didn't really land for most people!"
  ],
  sichenWrong: [
    "Ah, missed. Like my airplane joke. You know it? It didn't really land for most people!",
    JOKE,
    "Wrong, but hey: you know the joke about the airplane? Well, it didn't really land for most people! …Still nothing? Tough crowd.",
    "That answer had turbulence. You know the joke about the airplane? Well, it didn't really land for most people!"
  ],
  fyonRight: [
    "Grand so! I'm not just a pretty shell.",
    "Sure that was eggs-actly what I was thinking.",
    "Ah, I'm on a roll now. Not a sausage roll, mind.",
    "Get in! Me mammy back in Mullingar'll be delighted.",
    "Hard-boiled genius, so I am."
  ],
  fyonWrong: [
    "Ah no, I'm after cracking under the pressure.",
    "That's me scrambled, so.",
    "Jaysus, I'm only a shell of meself today.",
    "Ah sure look, it's not all it's cracked up to be.",
    "I had a feeling in me yolk that was wrong."
  ],
  chemmyRight: ["Topspin! Clean winner.", "Straight down the line, beautiful!", "That's a smash, that is!", "Edge of the table and IN!", "Like my backhand in '91. Unreturnable."],
  chemmyWrong: ["Into the net, I'm afraid.", "Ooh, long! Off the end of the table.", "That one had too much sidespin.", "Let. No, wait, that's just wrong.", "A miss! Happens to the best of us. Rarely to me, but still."],
  chemmyTimeout: ["Time's up! You froze like a rookie at the Worlds.", "Clock ran out! Serve faster next time.", "Too slow! I could've played a full rally in that time."],
  roundIntro: [
    "Shake out those wrists, we're starting with some proper obscure trivia.",
    "The stakes go up! Bit of topspin on these.",
    "Careful now. Every question this round has a trick in it. Read every word!",
    "Welcome to the Obscure Corner, where facts go to hide.",
    "MATCH POINT! The biggest money of the night. Anything can happen."
  ]
};
