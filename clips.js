// Play of the game clips. While the highlight plays, the game canvas is copied onto a 720p
// canvas with a title overlay and recorded (with the game's sound) using MediaRecorder.
// Saved clips live in the Clip Vault (IndexedDB, in this browser only); sending one hands the
// video file to the system share sheet, or downloads it where sharing files isn't supported.

const DB = 'supermaxx-clips', STORE = 'clips';
let dbP = null;
function db() {
  dbP ||= new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'id' });
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  return dbP;
}
const tx = async (mode, fn) => { const d = await db(); return new Promise((res, rej) => { const t = d.transaction(STORE, mode), q = fn(t.objectStore(STORE)); t.oncomplete = () => res(q?.result); t.onerror = () => rej(t.error); }); };
export const saveClip = clip => tx('readwrite', s => s.put(clip));
export const deleteClip = id => tx('readwrite', s => s.delete(id));
export const listClips = async () => ((await tx('readonly', s => s.getAll())) || []).sort((a, b) => b.date - a.date);

// The best container this browser can record: WebM in Chrome and Firefox, MP4 in Safari.
const MIME = typeof MediaRecorder === 'undefined' ? null
  : ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'].find(m => MediaRecorder.isTypeSupported(m)) || null;
export const canRecord = () => !!MIME && !!HTMLCanvasElement.prototype.captureStream;
export const clipExt = mime => (mime || '').includes('mp4') ? 'mp4' : 'webm';

// Start recording. meta: { who, callsign, label, color, map, mode }. audio: a MediaStream or null.
// Call frame(progress) right after every render; stop() resolves to the finished clip.
export function startClipRec(gl, meta, audio) {
  if (!canRecord()) return null;
  const W = 1280, H = 720, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const stream = cv.captureStream(30);
  audio?.getAudioTracks().forEach(t => stream.addTrack(t));
  let rec;
  try { rec = new MediaRecorder(stream, { mimeType: MIME, videoBitsPerSecond: 6e6 }); } catch { return null; }
  const chunks = [], t0 = performance.now();
  rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  rec.start(250);
  const col = '#' + meta.color.toString(16).padStart(6, '0');
  let thumb = null, prog = 0;
  const frame = p => {
    prog = p ?? prog;
    // cover-fit the game view into 16:9
    const s = Math.max(W / gl.width, H / gl.height), w = gl.width * s, h = gl.height * s;
    g.drawImage(gl, (W - w) / 2, (H - h) / 2, w, h);
    // overlay: title chip, the star's name plate, a progress bar and a watermark
    g.fillStyle = 'rgba(29,35,64,.85)'; g.fillRect(36, 30, 292, 44);
    g.fillStyle = '#ffc93c'; g.fillRect(36, 30, 8, 44);
    g.font = 'italic 900 22px Futura, "Avenir Next", "Trebuchet MS", sans-serif'; g.fillStyle = '#fff'; g.textBaseline = 'middle';
    g.fillText('PLAY OF THE GAME', 58, 53);
    g.fillStyle = 'rgba(29,35,64,.85)'; g.fillRect(36, H - 128, 520, 84);
    g.fillStyle = col; g.fillRect(36, H - 128, 10, 84);
    g.font = 'italic 900 38px Futura, "Avenir Next", "Trebuchet MS", sans-serif'; g.fillStyle = '#fff'; g.fillText(meta.who.toUpperCase(), 62, H - 98);
    g.font = '700 18px "Avenir Next", "Trebuchet MS", sans-serif'; g.fillStyle = 'rgba(255,255,255,.85)'; g.fillText(`${meta.callsign} · ${meta.label}`, 62, H - 62);
    g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(0, H - 8, W, 8); g.fillStyle = col; g.fillRect(0, H - 8, W * prog, 8);
    g.font = 'italic 900 20px Futura, "Avenir Next", "Trebuchet MS", sans-serif'; g.textAlign = 'right'; g.fillStyle = 'rgba(255,255,255,.75)';
    g.fillText('SUPERMAXX', W - 36, 53); g.textAlign = 'left';
    if (!thumb && prog > 0.45) {                      // a small still from the middle of the play
      const tc = document.createElement('canvas'); tc.width = 320; tc.height = 180;
      tc.getContext('2d').drawImage(cv, 0, 0, 320, 180); thumb = tc.toDataURL('image/jpeg', 0.72);
    }
  };
  let done = null;
  const stop = () => done ||= new Promise(res => {
    if (!thumb) { const tc = document.createElement('canvas'); tc.width = 320; tc.height = 180; tc.getContext('2d').drawImage(cv, 0, 0, 320, 180); thumb = tc.toDataURL('image/jpeg', 0.72); }
    rec.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      const blob = new Blob(chunks, { type: MIME.split(';')[0] });
      res(blob.size ? { id: 'c' + Date.now().toString(36), date: Date.now(), dur: (performance.now() - t0) / 1000, blob, thumb, mime: blob.type, ...meta } : null);
    };
    if (rec.state !== 'inactive') rec.stop(); else rec.onstop();
  });
  return { frame, stop };
}

const clipFile = c => new File([c.blob], `SuperMaxx - ${c.who} - ${c.label}.${clipExt(c.mime)}`.replace(/[\\/:*?"<>|]/g, ''), { type: c.mime });
export const canShareClips = () => !!navigator.canShare?.({ files: [new File([''], 'x.webm', { type: 'video/webm' })] });

// Save the video file to this computer.
export function downloadClip(c) {
  const file = clipFile(c), url = URL.createObjectURL(file), a = document.createElement('a');
  a.href = url; a.download = file.name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return 'downloaded';
}

// Send a clip: the share sheet if this browser can share files, otherwise a download.
export async function sendClip(c) {
  const file = clipFile(c);
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: `${c.who} · ${c.label}`, text: `Play of the game in SuperMaxx: ${c.who} (${c.callsign}) · ${c.label}` }); return 'shared'; }
    catch (e) { if (e?.name === 'AbortError') return 'cancelled'; }
  }
  return downloadClip(c);
}
