// Clip Vault: every play of the game you've saved, with a player and send / download / delete.
// Clips live in this browser's IndexedDB (see clips.js), so they don't follow you to another device.
import { listClips, deleteClip, sendClip, downloadClip, canShareClips, canRecord } from './clips.js?v=20261127l';

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const hex = c => '#' + (c ?? 0xffc93c).toString(16).padStart(6, '0');
const secs = d => `0:${String(Math.max(1, Math.round(d))).padStart(2, '0')}`;
const when = t => {
  const d = new Date(t), days = Math.floor((Date.now() - t) / 864e5);
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return days < 1 && d.getDate() === new Date().getDate() ? `Today ${time}` : days < 2 ? `Yesterday ${time}` : d.toLocaleDateString([], { day: 'numeric', month: 'short' }) + ` ${time}`;
};

let clips = [], cur = null, url = null, blip = () => {}, delArm = 0;

// how many clips are saved, for the badge on the main menu
export async function clipCount() { try { return (await listClips()).length; } catch { return 0; } }

export async function enterVault(opts = {}) {
  blip = opts.blip || blip;
  try { clips = await listClips(); } catch { clips = []; }
  if (!clips.some(c => c.id === cur)) cur = clips[0]?.id ?? null;
  render();
}

// stop the video and free its memory when leaving the screen
export function leaveVault() {
  const v = $('vtVideo'); if (v) { v.pause(); v.removeAttribute('src'); v.load(); }
  if (url) { URL.revokeObjectURL(url); url = null; }
}

function render() {
  $('vtCount').textContent = clips.length === 1 ? '1 clip' : `${clips.length} clips`;
  if (!clips.length) {
    leaveVault();
    $('vtBody').innerHTML = `<div class="vt-empty">
      <div class="vt-reel">🎬</div>
      <h3>No clips yet</h3>
      <p>After every match the <b>Play of the game</b> is recorded while it plays. Hit <b>💾 Save clip</b> on the results screen and it lands here, ready to rewatch or send to friends.</p>
      ${canRecord() ? '' : '<p class="vt-warn">This browser can’t record video, so clips can’t be saved here. Try Chrome, Edge, Firefox or Safari.</p>'}
    </div>`;
    return;
  }
  const c = clips.find(x => x.id === cur) || clips[0]; cur = c.id;
  const share = canShareClips();
  $('vtBody').innerHTML = `<div class="vt">
    <div class="vt-stage" style="--vc:${hex(c.color)}">
      <div class="vt-screen"><video id="vtVideo" controls playsinline autoplay poster="${c.thumb || ''}"></video></div>
      <div class="vt-meta">
        <div class="vt-title"><small>Play of the game · ${esc(c.mode)}</small><b>${esc(c.who)}</b><span>${esc(c.callsign)} · ${esc(c.label)}</span></div>
        <div class="vt-facts"><span>🗺 ${esc(c.map)}</span><span>⏱ ${secs(c.dur)}</span><span>📅 ${when(c.date)}</span></div>
      </div>
      <div class="vt-act">
        <button class="vt-b go" data-act="send">📤 ${share ? 'Send' : 'Send (download)'}</button>
        <button class="vt-b" data-act="download">⬇ Download</button>
        <span class="vt-gap"></span>
        <button class="vt-b del" data-act="delete">🗑 Delete</button>
      </div>
      <p class="vt-note" id="vtNote">${share ? 'Send opens your device’s share menu (Messages, WhatsApp, Discord, AirDrop…).' : 'This browser can’t share files directly, so Send saves the video and you can attach it anywhere.'}</p>
    </div>
    <div class="vt-list">${clips.map((x, i) => `
      <button class="vt-card${x.id === cur ? ' on' : ''}" data-clip="${x.id}" style="--vc:${hex(x.color)};animation-delay:${Math.min(i, 8) * 0.05}s">
        <span class="vt-thumb">${x.thumb ? `<img src="${x.thumb}" alt="">` : ''}<i>${secs(x.dur)}</i></span>
        <span class="tx"><b>${esc(x.who)}</b><small>${esc(x.label)}</small><em>${esc(x.map)} · ${when(x.date)}</em></span>
      </button>`).join('')}
    </div>
  </div>`;
  if (url) URL.revokeObjectURL(url);
  url = URL.createObjectURL(c.blob);
  const v = $('vtVideo'); v.src = url; v.play?.().catch(() => {});
}

function note(t) { const n = $('vtNote'); if (n) n.textContent = t; }

export function initVault() {
  $('vtBody').addEventListener('click', async e => {
    const card = e.target.closest('[data-clip]');
    if (card) { if (card.dataset.clip !== cur) { cur = card.dataset.clip; blip(700); render(); } return; }
    const b = e.target.closest('[data-act]'); if (!b) return;
    const c = clips.find(x => x.id === cur); if (!c) return;
    if (b.dataset.act === 'send') {
      blip(820);
      const r = await sendClip(c);
      if (r === 'shared') note('✓ Sent!');
      else if (r === 'downloaded') note('✓ Saved to your downloads. Attach the video to any chat to send it.');
    }
    if (b.dataset.act === 'download') { blip(760); downloadClip(c); note('✓ Saved to your downloads.'); }
    if (b.dataset.act === 'delete') {
      // two clicks to delete, like the settings reset
      if (delArm) {
        clearTimeout(delArm); delArm = 0;
        await deleteClip(c.id).catch(() => {});
        blip(420); cur = null; await enterVault();
      } else {
        b.classList.add('arm'); b.textContent = 'Click again to delete';
        delArm = setTimeout(() => { delArm = 0; b.classList.remove('arm'); b.textContent = '🗑 Delete'; }, 2600);
      }
    }
  });
}
