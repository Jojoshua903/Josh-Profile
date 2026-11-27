import { FIREBASE_CONFIG, FIREBASE_VERSION } from './firebase-config.js?v=20261128e';

// Accounts: sign in with an email and password and your progress (everything the game keeps
// under the "supermaxx" keys: settings, unlocks, the pass, mastery, contracts, slots) is saved
// to users/{uid}/save and follows you to any device you sign in on.
//
// Sync rules: every change on this device is uploaded a few seconds later. When the game starts
// signed in and the account has a newer save than the one this device last synced, it pulls that
// save down and reloads (the game reads its save once, at start-up). Last write wins.
// Clips stay on the device they were recorded on.

const ACCT = 'smx-acct';                  // { uid, email, syncedT } on this device
const DIRTY = 'smx-acct-dirty';           // time of the last local change not yet uploaded
const ours = k => k === 'supermaxx' || k.startsWith('supermaxx-');
const $ = id => document.getElementById(id);
const store = Storage.prototype, rawSet = store.setItem, rawDel = store.removeItem;
const lsGet = k => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { rawSet.call(localStorage, k, v); } catch {} };
const lsDel = k => { try { rawDel.call(localStorage, k); } catch {} };
const acct = () => { try { return JSON.parse(lsGet(ACCT) || 'null'); } catch { return null; } };

// ---------- Firebase, shared with online play ----------
let F = null;
export function loadFirebase() {
  if (F) return F;
  F = (async () => {
    if (!FIREBASE_CONFIG?.databaseURL) throw Object.assign(new Error('Online features are not set up yet'), { code: 'not-configured' });
    const base = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/`;
    let appM, authM, dbM;
    try { [appM, authM, dbM] = await Promise.all(['firebase-app.js', 'firebase-auth.js', 'firebase-database.js'].map(f => import(base + f))); }
    catch { throw Object.assign(new Error('Could not reach the account server. This preview blocks outside connections, so open the hosted (GitHub Pages) version.'), { code: 'blocked' }); }
    const app = appM.initializeApp(FIREBASE_CONFIG), auth = authM.getAuth(app);
    await auth.authStateReady?.();
    return { app, auth, authM, db: dbM.getDatabase(app), dbM };
  })();
  F.catch(() => { F = null; });                 // let a later try load it again
  return F;
}
const userHooks = [], onUserChange = () => userHooks.forEach(f => f());
export const setUserChangeHook = fn => { userHooks.push(fn); };          // signed in or out

// ---------- the save ----------
function snapshot() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (ours(k)) data[k] = localStorage.getItem(k); }
  return data;
}
function apply(data) {
  const keys = []; for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i));
  for (const k of keys) if (ours(k) && !(k in data)) lsDel(k);
  for (const [k, v] of Object.entries(data || {})) if (ours(k)) lsSet(k, v);
}
const xpOf = data => { try { return JSON.parse(data?.['supermaxx-pass'] || '{}').xp || 0; } catch { return 0; } };
const sameSave = (a, b) => JSON.stringify(Object.entries(a || {}).sort()) === JSON.stringify(Object.entries(b || {}).sort());

async function pull(uid) {
  const { db, dbM } = await loadFirebase();
  const s = await dbM.get(dbM.ref(db, `users/${uid}/save`));
  return s.exists() ? s.val() : null;
}
let upT = null, busy = false;
async function push() {
  const a = acct(); if (!a || busy) return;
  busy = true;
  try {
    const { db, dbM, auth } = await loadFirebase();
    if (auth.currentUser?.uid !== a.uid) return;
    const t = Date.now();
    await dbM.set(dbM.ref(db, `users/${a.uid}/save`), { t, data: snapshot() });
    lsSet(ACCT, JSON.stringify({ ...a, syncedT: t })); lsDel(DIRTY);
    render();
  } catch {} finally { busy = false; }
}
const schedule = () => { clearTimeout(upT); upT = setTimeout(push, 4000); };

// any write to the game's save marks it changed and queues an upload
store.setItem = function (k, v) { rawSet.call(this, k, v); if (this === localStorage && ours(k)) changed(); };
store.removeItem = function (k) { rawDel.call(this, k); if (this === localStorage && ours(k)) changed(); };
function changed() { if (!acct()) return; rawSet.call(localStorage, DIRTY, String(Date.now())); schedule(); }
addEventListener('pagehide', () => { if (acct() && lsGet(DIRTY)) push(); });

// At start-up: if we're signed in, fetch the account's save. Newer than ours: take it and reload.
export async function initAccount() {
  const a = acct(); if (!a) return;
  try {
    const { auth } = await loadFirebase();
    if (auth.currentUser?.uid !== a.uid) { lsDel(ACCT); render(); return; }    // signed out elsewhere, or the session expired
    const cloud = await pull(a.uid);
    if (cloud && cloud.t > (a.syncedT || 0) && !sessionStorage.getItem('smx-pulled')) {
      apply(cloud.data); lsSet(ACCT, JSON.stringify({ ...a, syncedT: cloud.t })); lsDel(DIRTY);
      sessionStorage.setItem('smx-pulled', '1');                                      // only once, so a bad save can't loop
      location.reload(); return;
    }
    if (!cloud || lsGet(DIRTY)) push();
  } catch {}
  render();
}

// ---------- signing in and out ----------
const ERRS = {
  'auth/operation-not-allowed': 'Email sign-in is switched off. Firebase console → Authentication → Sign-in method → Email/Password → Enable.',
  'auth/invalid-credential': 'That email and password don’t match an account.',
  'auth/wrong-password': 'That email and password don’t match an account.',
  'auth/user-not-found': 'That email and password don’t match an account.',
  'auth/email-already-in-use': 'There’s already an account with that email. Log in instead.',
  'auth/weak-password': 'Pick a password with at least 6 characters.',
  'auth/invalid-email': 'That doesn’t look like an email address.',
  'auth/missing-password': 'Type your password.',
  'auth/too-many-requests': 'Too many tries. Wait a minute and try again.',
  'auth/network-request-failed': 'Couldn’t reach the account server. Check your connection.',
  PERMISSION_DENIED: 'The database refused to save. Paste database.rules.json into Realtime Database → Rules and press Publish.',
};
const why = e => ERRS[e?.code] || (/permission/i.test(String(e?.message)) ? ERRS.PERMISSION_DENIED : e?.message || 'Something went wrong.');

let ui = { tab: 'login', err: '', msg: '', busy: false, choice: null };
async function signIn(create) {
  const email = $('acEmail').value.trim(), pw = $('acPass').value;
  ui.busy = true; ui.err = ui.msg = ''; render();
  try {
    const { auth, authM } = await loadFirebase();
    const cred = create ? await authM.createUserWithEmailAndPassword(auth, email, pw) : await authM.signInWithEmailAndPassword(auth, email, pw);
    const uid = cred.user.uid, cloud = create ? null : await pull(uid), local = snapshot();
    lsSet(ACCT, JSON.stringify({ uid, email: cred.user.email, syncedT: 0 }));
    onUserChange();
    if (!cloud) { await push(); ui.msg = create ? 'Account created. Your progress is saved to it.' : 'Signed in. Your progress is now saved to your account.'; }
    else if (sameSave(cloud.data, local) || !xpOf(local)) useCloud(cloud);
    else { ui.choice = { cloud, local }; }                                            // both have progress: ask which to keep
  } catch (e) { ui.err = why(e); }
  ui.busy = false; render();
}
function useCloud(cloud) {
  const a = acct();
  apply(cloud.data); lsSet(ACCT, JSON.stringify({ ...a, syncedT: cloud.t })); lsDel(DIRTY);
  sessionStorage.setItem('smx-pulled', '1');
  location.reload();
}
async function signOut() {
  if (lsGet(DIRTY)) await push();
  try { const { auth, authM } = await loadFirebase(); await authM.signOut(auth); } catch {}
  lsDel(ACCT); lsDel(DIRTY); onUserChange();
  ui = { tab: 'login', err: '', msg: 'Signed out. Your progress stays on this device too.', busy: false, choice: null };
  render();
}
async function reset() {
  const email = $('acEmail').value.trim();
  if (!email) { ui.err = 'Type your email first, then press “Forgot password?”.'; return render(); }
  try { const { auth, authM } = await loadFirebase(); await authM.sendPasswordResetEmail(auth, email); ui.err = ''; ui.msg = `If there’s an account for ${email}, a reset link is on its way.`; }
  catch (e) { ui.err = why(e); }
  render();
}

// ---------- the Account tab (drawn inside the Profile screen, social.js) ----------
export const ago = t => { const s = (Date.now() - t) / 1000; return s < 60 ? 'just now' : s < 3600 ? `${Math.floor(s / 60)} min ago` : s < 86400 ? `${Math.floor(s / 3600)} h ago` : new Date(t).toLocaleDateString(); };
export const esc = s => String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
let redraw = () => {};
export const setAccountRedraw = fn => { redraw = fn; };
function render() {
  const btn = $('modeAccount'); if (btn) btn.classList.toggle('in', !!acct());
  redraw();
}
export function accountHTML() {
  const a = acct();
  let body;
  if (ui.choice) {
    const { cloud, local } = ui.choice;
    body = `<p>This device and your account both have progress. Which one do you want to keep?</p>
      <div class="ac-pick">
        <button class="bigbtn alt" data-ac="cloud"><b>Account progress</b><small>${xpOf(cloud.data).toLocaleString()} season XP · saved ${ago(cloud.t)}</small></button>
        <button class="bigbtn" data-ac="local"><b>This device</b><small>${xpOf(local).toLocaleString()} season XP · replaces the account’s</small></button>
      </div>`;
  } else if (a) {
    body = `<div class="ac-who"><span>👤</span><div><b>${esc(a.email)}</b><small>${lsGet(DIRTY) ? 'Saving changes…' : a.syncedT ? `Synced ${ago(a.syncedT)}` : 'Not synced yet'}</small></div></div>
      <p>Your progress saves to this account automatically. Log in with the same email on another device to pick up where you left off.</p>
      <div class="ac-row"><button class="ghost" data-ac="sync">Sync now</button><button class="ghost" data-ac="out">Log out</button></div>`;
  } else {
    const make = ui.tab === 'create';
    body = `<div class="ac-tabs"><button class="${make ? '' : 'on'}" data-ac="tab-login">Log in</button><button class="${make ? 'on' : ''}" data-ac="tab-create">Create account</button></div>
      <label>Email<input id="acEmail" type="email" autocomplete="email" spellcheck="false"></label>
      <label>Password<input id="acPass" type="password" autocomplete="${make ? 'new-password' : 'current-password'}" placeholder="${make ? 'At least 6 characters' : ''}"></label>
      <button class="bigbtn ${make ? 'alt' : ''}" data-ac="${make ? 'create' : 'login'}" ${ui.busy ? 'disabled' : ''}>${ui.busy ? 'One moment…' : make ? 'Create account' : 'Log in'}</button>
      ${make ? '<p class="ac-note">Your progress on this device becomes the account’s starting save.</p>' : '<button class="ac-link" data-ac="reset">Forgot password?</button>'}`;
  }
  return body + (ui.err ? `<div class="ac-err">${esc(ui.err)}</div>` : '') + (ui.msg ? `<div class="ac-msg">${esc(ui.msg)}</div>` : '');
}
// a click on something with data-ac inside the Account tab
export function accountAct(act) {
  if (act.startsWith('tab-')) { ui.tab = act.slice(4); ui.err = ui.msg = ''; render(); }
  else if (act === 'login' || act === 'create') signIn(act === 'create');
  else if (act === 'reset') reset();
  else if (act === 'out') signOut();
  else if (act === 'sync') { ui.msg = ''; push(); }
  else if (act === 'cloud') { const c = ui.choice.cloud; ui.choice = null; useCloud(c); }
  else if (act === 'local') { ui.choice = null; push().then(() => { ui.msg = 'Your account now has this device’s progress.'; render(); }); }
}
export const accountEnter = () => signIn(ui.tab === 'create');
export const accountBusy = () => !!ui.choice;                 // must pick a save before leaving
export function accountOpened() { if (!ui.choice) { ui.err = ''; if (!acct()) ui.msg = ''; } }
export const signedIn = () => !!acct();
export const myAccount = () => acct();
render();
