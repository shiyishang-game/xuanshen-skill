import { CONFIG } from './config.js';
const limits = new Map([
  ['开骂', 1], ['烦恼·', 8], ['自由提问', 5], ['全力炫', 1], ['再骂一次', 1], ['锐评卡', 1],
  ['鉴定开始', 1], ['鉴定完成', 1], ['鉴定·', 3], ['鉴定书', 1], ['复制安装·', 3], ['梗百科·', 5], ['GitHub', 1], ['扫码进入', 1],
]);
const ids = new Set(['复制安装·npx', '复制安装·link', '复制安装·claude', '复制安装·prompt']);
const counts = new Map();
let enabled = false, debug = false, total = 0, viewed = false, ref = '';
export function registerEvents(prefix, values) { values.forEach(id => ids.add(prefix + id)); }
export function initStats() {
  const params = new URLSearchParams(location.search);
  const optedOut = ['1', 'yes'].includes(navigator.doNotTrack) || ['1', 'yes'].includes(window.doNotTrack) || navigator.globalPrivacyControl === true;
  debug = params.has('debug') && !optedOut && !params.has('rec');
  if (debug) window.__xsDebug = [];
  enabled = !params.has('debug') && !params.has('rec') && !optedOut && !!CONFIG.UMAMI_WEBSITE && location.protocol === 'https:' && location.hostname === CONFIG.HOST && location.pathname.startsWith(CONFIG.PATH_PREFIX);
  try {
    const u = new URL(document.referrer);
    if (u.hostname !== CONFIG.HOST && /^https?:$/.test(u.protocol)) ref = u.protocol + '//' + u.hostname + '/';
  } catch { /* 没有来源 */ }
  pageview();
  if (params.get('s') === 'qr') {
    track('扫码进入');
    const url = new URL(location.href);
    url.searchParams.delete('s');
    history.replaceState(null, '', url.pathname + url.search + url.hash);
  }
}
function base() {
  const payload = { website: CONFIG.UMAMI_WEBSITE, hostname: CONFIG.HOST, url: CONFIG.PATH_PREFIX, title: '炫神.skill', language: String(navigator.language || '').slice(0, 35), screen: (screen.width | 0) + 'x' + (screen.height | 0) };
  if (ref) payload.referrer = ref;
  return payload;
}
function send(payload) {
  if (debug) { window.__xsDebug.push(payload); console.info('[stats]', payload.name || 'pageview'); return true; }
  if (!enabled) return false;
  try {
    fetch(CONFIG.UMAMI_ENDPOINT, { method: 'POST', body: JSON.stringify({ type: 'event', payload }), headers: { 'Content-Type': 'application/json' }, credentials: 'omit', referrerPolicy: 'no-referrer', keepalive: true, mode: 'cors', cache: 'no-store' }).catch(() => {});
    return true;
  } catch { return false; }
}
export function pageview() {
  if (viewed || (!enabled && !debug)) return false;
  viewed = true;
  return send(base());
}
export function track(name) {
  if ((!enabled && !debug) || typeof name !== 'string' || total >= 25) return false;
  const group = limits.has(name) ? name : [...limits.keys()].find(k => k.endsWith('·') && name.startsWith(k) && ids.has(name));
  if (!group || (counts.get(group) || 0) >= limits.get(group)) return false;
  counts.set(group, (counts.get(group) || 0) + 1);
  total++;
  return send({ ...base(), name });
}
