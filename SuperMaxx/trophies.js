import { ACH, achGot, achWhen, achCount, achProgress, nextToken, PER_ACH_TOKEN, setStory } from './achieve.js?v=20261129f';
import { storyClears } from './story.js?v=20261129f';

// The Achievements page: every feat and lifetime goal, grouped, with progress bars for the
// counted ones and the date for the ones you've unlocked.

const $ = id => document.getElementById(id);
let filter = 'all', wired = false, api = null;
const GROUPS = [...new Set(ACH.map(a => a.g))];

export function enterTrophies(opts) {
  api = opts;
  setStory(storyClears());                         // catch up on missions cleared before achievements existed
  if (!wired) {
    wired = true;
    $('trFilter').onclick = e => { const b = e.target.closest('[data-f]'); if (!b) return; filter = b.dataset.f; api?.blip?.(700); render(); };
  }
  render();
}
export const trophyCount = () => achCount();

const date = t => new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
function render() {
  const got = achCount(), n = ACH.length, left = nextToken();
  $('trHead').innerHTML = `<div class="tr-score"><b>${got}</b><span>of ${n} unlocked</span></div>
    <div class="tr-bar"><i style="width:${(got / n * 100).toFixed(1)}%"></i></div>
    <div class="tr-tok">🎰 Every ${PER_ACH_TOKEN} achievements earns a slot machine token${got < n ? ` · <b>${left} more</b> for the next one` : ''}</div>`;
  const tabs = [['all', 'All', n], ['got', 'Unlocked', got], ['todo', 'Still to get', n - got], ...GROUPS.map(g => [g, g, ACH.filter(a => a.g === g).length])];
  $('trFilter').innerHTML = tabs.map(([k, l, c]) => `<button data-f="${k}" class="${filter === k ? 'on' : ''}">${l}<em>${c}</em></button>`).join('');
  const list = ACH.filter(a => filter === 'all' || (filter === 'got' ? achGot(a.id) : filter === 'todo' ? !achGot(a.id) : a.g === filter));
  // unlocked first within each group, then the ones closest to done
  const pct = a => { const p = achProgress(a); return p ? Math.min(1, p[0] / p[1]) : 0; };
  list.sort((a, b) => (achGot(b.id) - achGot(a.id)) || (pct(b) - pct(a)));
  const groups = filter === 'all' || filter === 'got' || filter === 'todo' ? GROUPS : [filter];
  $('trGrid').innerHTML = groups.map(g => {
    const items = list.filter(a => a.g === g); if (!items.length) return '';
    return `<h5>${g}<small>${items.filter(a => achGot(a.id)).length}/${ACH.filter(a => a.g === g).length}</small></h5><div class="tr-cards">${items.map(card).join('')}</div>`;
  }).join('') || '<p class="tr-none">Nothing here yet.</p>';
}
function card(a) {
  const ok = achGot(a.id), p = achProgress(a);
  const bar = !ok && p ? `<div class="tr-prog"><i style="width:${(Math.min(1, p[0] / p[1]) * 100).toFixed(1)}%"></i><span>${Math.min(p[0], p[1]).toLocaleString()} / ${p[1].toLocaleString()}</span></div>` : '';
  return `<div class="tr-card ${ok ? 'got' : ''}"><i>${a.icon}</i><div><b>${a.name}</b><p>${a.desc}</p>${ok ? `<small>✓ Unlocked ${date(achWhen(a.id))}</small>` : bar}</div></div>`;
}
