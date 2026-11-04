import { CONFIG } from '../js/config.js';
const API_BASES = ['https://cloud.umami.is/analytics/us/api', 'https://cloud.umami.is/analytics/eu/api'];
const TZ = 'Asia/Shanghai', TZ_MS = 8 * 3600e3, DAY = 864e5, REFRESH_MS = 60e3, GH_MS = 15 * 60e3;
const LAUNCH = Date.UTC(2026, 10, 3) - TZ_MS, SHARE_RE = /^[A-Za-z0-9_-]{4,64}$/;
const GH_ERROR = 'GitHub 接口暂时打不开（可能是限流），稍后自动重试';
const DEVICES = { mobile: '手机', desktop: '电脑', laptop: '笔记本', tablet: '平板' };
const BROWSERS = { ios: 'iPhone Safari', 'ios-webview': 'App 内打开（iOS）', 'chromium-webview': 'App 内打开（安卓）', crios: 'iPhone Chrome', chrome: 'Chrome', safari: 'Safari', 'edge-chromium': 'Edge', edge: 'Edge', firefox: 'Firefox', samsung: '三星浏览器', miui: '小米浏览器' };
const RANGES = [
  { id: 'today', name: '今天', start: n => dayStart(n), unit: 'hour' },
  { id: 'd7', name: '7 天', start: n => dayStart(n) - 6 * DAY, unit: 'day' },
  { id: 'd30', name: '30 天', start: n => dayStart(n) - 29 * DAY, unit: 'day' },
  { id: 'all', name: '上线以来', start: () => LAUNCH, unit: 'day' },
];
function h(tag, cls = '', text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = String(text); return e; }
function clear(e) { e.replaceChildren(); return e; }
function btn(text, fn, cls = '') { const b = h('button', cls, text); b.type = 'button'; b.addEventListener('click', fn); return b; }
function num(v) { const n = Number(v && typeof v === 'object' ? v.value : v); return Number.isFinite(n) ? Math.max(0, n) : 0; }
function pct(a, b) { return b > 0 ? Math.round(a * 100 / b) + '%' : '0%'; }
function dayStart(t) { return Math.floor((t + TZ_MS) / DAY) * DAY - TZ_MS; }
const fmtTime = new Intl.DateTimeFormat('zh-CN', { timeZone: TZ, month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
const fmtClock = new Intl.DateTimeFormat('zh-CN', { timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
function timeText(s) { const t = Date.parse(s); return Number.isFinite(t) ? fmtTime.format(t) : '—'; }
let regionNames = null;
try { regionNames = new Intl.DisplayNames(['zh-CN'], { type: 'region' }); } catch { /* 显示地区代码 */ }
function normalizeShare(raw) { const match = /\/share\/([A-Za-z0-9_-]+)/.exec(raw); const s = (match ? match[1] : raw).trim(); return SHARE_RE.test(s) ? s : ''; }
function readShare() {
  try { const fromHash = normalizeShare(decodeURIComponent(location.hash.slice(1))); if (fromHash) { localStorage.setItem('xs.dash.share', fromHash); return fromHash; } } catch { /* 继续读本地 */ }
  try { const own = localStorage.getItem('xs.dash.share'); return normalizeShare(own || localStorage.getItem('dash.share') || ''); } catch { return ''; }
}
const um = { slug: readShare(), base: '', token: '', wid: '', err: '' };
let requireLogin = false;
async function umLogin() {
  um.token = '';
  for (const base of API_BASES) {
    try {
      const r = await fetch(base + '/share/' + encodeURIComponent(um.slug), { credentials: 'omit', cache: 'no-store' });
      if (!r.ok) continue;
      const j = await r.json(), wid = j.websiteId || j.websiteIds?.[0];
      if (j.token && wid) { um.base = base; um.token = j.token; um.wid = wid; um.err = ''; return; }
    } catch { /* 试另一个区 */ }
  }
  throw new Error('分享码打不开（失效 / 没开分享 / 网络不通）');
}
async function umGet(path, query = {}) {
  const u = new URL(um.base + '/websites/' + encodeURIComponent(um.wid) + path);
  Object.entries(query).forEach(([k, v]) => u.searchParams.set(k, v));
  u.searchParams.set('path', 'c.' + CONFIG.PATH_PREFIX.replace(/\/$/, ''));
  const r = await fetch(u, { headers: { 'x-umami-share-token': um.token, 'x-umami-share-context': '1' }, credentials: 'omit', cache: 'no-store' });
  if (r.status === 401 || r.status === 403) { um.token = ''; requireLogin = true; throw new Error('auth'); }
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}
function rows(res) { const v = res?.status === 'fulfilled' ? res.value : null; const a = Array.isArray(v) ? v : v?.data || []; return a.map(x => [x.x == null || x.x === '' ? '（直接打开）' : String(x.x), num(x.y)]); }
async function localJSON(path) { const r = await fetch(path, { cache: 'no-cache', credentials: 'omit' }); if (!r.ok) throw new Error('读取失败'); return r.json(); }
const maps = { scenarios: new Map(), archetypes: [], memes: new Map() };
async function loadMaps() {
  const r = await Promise.allSettled([localJSON('../data/scenarios.json'), localJSON('../data/quiz.json'), localJSON('../data/memes.json')]);
  if (r[0].status === 'fulfilled') maps.scenarios = new Map((r[0].value.scenarios || []).map(s => [s.id, s.chip]));
  if (r[1].status === 'fulfilled') maps.archetypes = r[1].value.archetypes || [];
  if (r[2].status === 'fulfilled') maps.memes = new Map((r[2].value.memes || []).map(m => [m.id, m.title]));
}
const app = clear(document.getElementById('app'));
const top = h('div', 'top'), title = h('h1'), home = h('a', '', '炫神.skill · 看板'); home.href = '../'; title.append(home);
const upd = h('div', 'upd', '加载中…'); top.append(title, upd);
const tabs = h('div', 'btnrow');
const secStatus = h('section', 'panel'); secStatus.id = 'status';
const secLogin = h('section', 'panel'); secLogin.id = 'login'; secLogin.hidden = true;
const statsRoot = h('div'); statsRoot.id = 'statistics';
const secKpi = h('section', 'kpis'); secKpi.id = 'kpis';
const secTrend = h('section', 'panel'); secTrend.id = 'trend';
const funnels = h('div', 'cols2'), secRoast = h('section', 'panel'), secQuiz = h('section', 'panel'); secRoast.id = 'roastFunnel'; secQuiz.id = 'quizFunnel'; funnels.append(secRoast, secQuiz);
const breakdowns = h('div', 'cols2'), secHot = h('section', 'panel'), secResults = h('section', 'panel'); secHot.id = 'hot'; secResults.id = 'results'; breakdowns.append(secHot, secResults);
const pairs = h('div', 'cols2'), secInstall = h('section', 'panel'), secMemes = h('section', 'panel'); secInstall.id = 'installs'; secMemes.id = 'memes'; pairs.append(secInstall, secMemes);
const secWho = h('section', 'panel'); secWho.id = 'who';
const secOther = h('section', 'panel'); secOther.id = 'events';
statsRoot.append(secKpi, secTrend, funnels, breakdowns, pairs, secWho, secOther);
const secGH = h('section', 'panel'); secGH.id = 'github';
const footer = h('footer', 'footer'); footer.append(h('p', '', '数据来自 Umami（匿名统计）和 GitHub 公开接口'), btn('忘记分享码', forget));
app.append(top, tabs, secStatus, secLogin, statsRoot, secGH, footer);
let range = RANGES[0], busy = false, lastOk = 0, revision = 0;
const site = { online: null, replies: null, checked: 0, gh: null, ghError: false, ghAt: 0 };
function forget() {
  revision++; try { localStorage.removeItem('xs.dash.share'); } catch { /* 无痕模式 */ }
  history.replaceState(null, '', location.pathname + location.search);
  um.slug = ''; um.token = ''; um.err = ''; requireLogin = true; drawNoShare(); drawStatus();
}
function drawTabs() {
  clear(tabs);
  for (const r of RANGES) tabs.append(btn(r.name, () => { range = r; drawTabs(); refresh(); }, r === range ? 'on' : ''));
  tabs.append(btn('刷新', () => { refresh(); checkSite(); checkGithub(true); }));
}
function drawNoShare() {
  statsRoot.hidden = true; secLogin.hidden = false; clear(secLogin);
  secLogin.append(h('h2', '', '使用统计'), h('p', '', '这台设备还没记住统计的分享码。'), h('p', 'note', '输入 Umami 分享链接最后一段，或在网址后加 #分享码。分享码仅保存在本机。'));
  if (um.err) secLogin.append(h('p', 'warn', um.err));
  const box = h('div', 'login'), input = h('input'); input.id = 'shareInput'; input.placeholder = '分享码或分享链接'; input.autocomplete = 'off'; input.setAttribute('aria-label', 'Umami 分享码');
  function submit() {
    const slug = normalizeShare(input.value);
    if (!slug) { input.setCustomValidity('分享码格式不对'); input.reportValidity(); return; }
    input.setCustomValidity(''); try { localStorage.setItem('xs.dash.share', slug); } catch { /* 无痕模式 */ }
    um.slug = slug; um.token = ''; um.err = ''; requireLogin = false; history.replaceState(null, '', location.pathname + location.search + '#' + slug); refresh();
  }
  input.addEventListener('input', () => input.setCustomValidity(''));
  input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
  box.append(input, btn('连接统计', submit)); secLogin.append(box); upd.textContent = um.err || '';
}
function statusItem(parent, label, value, state = '') { const box = h('div', 'st'), v = h('span', 'v'); if (state) v.append(h('span', 'dot ' + state)); v.append(document.createTextNode(value)); box.append(h('span', 'k', label), v); parent.append(box); }
function drawStatus() {
  clear(secStatus).append(h('h2', '', '运行状态')); const grid = h('div', 'status');
  statusItem(grid, '网站', site.online === null ? '检查中…' : site.online ? '正常' : '打不开', site.online === null ? 'wait' : site.online ? 'ok' : 'bad');
  statusItem(grid, '回复库', site.replies === null ? '读取中…' : site.replies < 0 ? '打不开' : site.replies + ' 条', site.replies >= 0 ? 'ok' : 'wait');
  const run = site.gh?.run;
  statusItem(grid, '部署', site.ghError ? '暂时查不到' : !run ? '检查中…' : (run.status === 'completed' ? (run.conclusion === 'success' ? '成功' : '失败：' + run.conclusion) : '构建中') + ' · ' + timeText(run.updated_at), run?.conclusion === 'success' ? 'ok' : 'wait');
  statusItem(grid, '统计', um.token && !um.err && !requireLogin ? '已连接' : '未连接', um.token && !um.err && !requireLogin ? 'ok' : 'wait');
  secStatus.append(grid);
}
async function checkSite() {
  const res = await Promise.allSettled([fetch('../index.html', { credentials: 'omit', cache: 'no-store' }), localJSON('../data/replies.json')]);
  site.online = res[0].status === 'fulfilled' && res[0].value.ok;
  if (res[1].status === 'fulfilled') {
    const d = res[1].value;
    site.replies = [...Object.values(d.replies || {}), d.fallback || {}].reduce((n, x) => n + (Array.isArray(x.normal) ? x.normal.length : 0) + (Array.isArray(x.full) ? x.full.length : 0), 0);
  } else site.replies = -1;
  site.checked = Date.now(); drawStatus();
}
function table(headers, data) {
  const wrap = h('div', 'table-wrap'), t = h('table', 'tbl'), head = h('thead'), hr = h('tr'), body = h('tbody');
  headers.forEach(name => hr.append(h('th', '', name))); head.append(hr);
  for (const row of data) { const tr = h('tr'); row.forEach(cell => tr.append(h('td', '', cell))); body.append(tr); }
  t.append(head, body); wrap.append(t); return wrap;
}
function visual(parent, name, chart, dataTable) {
  const block = h('div', 'viz'), heading = h('div', 'viz-heading'), toggle = btn('看表格', () => { const show = dataTable.hidden; dataTable.hidden = !show; chart.hidden = show; toggle.textContent = show ? '看图表' : '看表格'; toggle.setAttribute('aria-pressed', String(show)); }, 'table-toggle');
  toggle.setAttribute('aria-pressed', 'false'); heading.append(h('h3', '', name), toggle); dataTable.hidden = true; block.append(heading, chart, dataTable); parent.append(block);
}
function bars(parent, titleText, data, first = null) {
  const box = h('div', 'bars'), max = first === null ? Math.max(1, ...data.map(r => r[1])) : Math.max(1, first);
  for (const [label, value, color] of data) {
    const row = h('div', 'row'), name = h('span', 'name'); name.title = label;
    if (color && /^#[0-9a-f]{6}$/i.test(color)) { const dot = h('span', 'dot'); dot.style.background = color; name.append(dot); }
    name.append(document.createTextNode(label)); const track = h('div', 'track'), fill = h('div', 'fill'); fill.style.width = Math.min(100, value / max * 100) + '%'; track.append(fill);
    const count = h('span', 'num', value); if (first !== null) count.append(h('small', '', pct(value, first)));
    row.append(name, track, count); box.append(row);
  }
  if (!data.length) box.append(h('p', 'empty', '还没有数据'));
  visual(parent, titleText, box, table(first === null ? ['项目', '次数'] : ['步骤', '次数', '占第一步'], data.map(r => first === null ? r.slice(0, 2) : [r[0], r[1], pct(r[1], first)])));
}
function svgNode(tag, attrs = {}, text) { const n = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const [k,v] of Object.entries(attrs)) n.setAttribute(k, v); if (text != null) n.textContent = String(text); return n; }
function lineChart(parent, name, labels, series) {
  const wrap = h('div', 'chart-wrap'), svg = svgNode('svg', { viewBox: '0 0 800 250', class: 'line-chart', role: 'img', 'aria-label': name, tabindex: '0' });
  const x0 = 40, y0 = 18, height = 192, max = Math.max(1, ...series.flatMap(s => s.values));
  let viewWidth = 800, w = 680, cursor = null;
  const x = i => x0 + (labels.length > 1 ? i / (labels.length - 1) : .5) * w, y = v => y0 + height * (1 - v / max);
  const tip = h('div', 'chart-tip'); tip.hidden = true;
  function render(width) {
    viewWidth = width; w = Math.max(120, width - 120); clear(svg); svg.setAttribute('viewBox', '0 0 ' + width + ' 250'); tip.hidden = true;
    for (let i = 0; i <= 4; i++) { const yy = y0 + i * height / 4; svg.append(svgNode('line', { x1: x0, y1: yy, x2: x0 + w, y2: yy, stroke: '#262638', 'stroke-opacity': '.6' }), svgNode('text', { x: x0 - 8, y: yy + 4, 'text-anchor': 'end' }, Math.round(max * (1 - i / 4)))); }
    const stride = Math.max(1, Math.ceil(labels.length / Math.max(2, Math.floor(w / 56))));
    labels.forEach((label, i) => { if ((i % stride === 0 && i < labels.length - 1 - stride / 2) || i === labels.length - 1) svg.append(svgNode('text', { x: x(i), y: 234, 'text-anchor': 'middle' }, label)); });
    let lastLabelY = -100;
    for (const s of series) {
      const pts = s.values.map((v, i) => x(i) + ',' + y(v)).join(' ');
      svg.append(svgNode('polyline', { points: pts, fill: 'none', stroke: s.color, 'stroke-width': '2', 'vector-effect': 'non-scaling-stroke' }));
      s.values.forEach((v, i) => svg.append(svgNode('circle', { cx: x(i), cy: y(v), r: '4', fill: s.color })));
      const tailY = Math.max(18, Math.min(208, y(s.values[s.values.length - 1] || 0)));
      const labelY = Math.abs(tailY - lastLabelY) < 18 ? (tailY + 20 <= 208 ? tailY + 20 : tailY - 20) : tailY;
      const dot = svgNode('circle', { cx: x0 + w + 10, cy: labelY, r: '4', fill: s.color, class: 'tail-dot' });
      const tail = svgNode('text', { x: x0 + w + 22, y: labelY + 4, class: 'tail-label' }, s.name); svg.append(dot, tail); lastLabelY = labelY;
    }
    cursor = svgNode('line', { x1: 0, y1: y0, x2: 0, y2: y0 + height, stroke: '#9A9AB0', 'stroke-dasharray': '4 4', visibility: 'hidden' }); svg.append(cursor);
  }
  let hoverIndex = 0;
  function show(i) {
    if (!labels.length) return;
    hoverIndex = i; cursor.setAttribute('x1', x(i)); cursor.setAttribute('x2', x(i)); cursor.setAttribute('visibility', 'visible');
    tip.textContent = labels[i] + ' · ' + series.map(s => s.name + ' ' + (s.values[i] || 0)).join(' / '); tip.hidden = false;
  }
  svg.addEventListener('pointermove', e => { const r = svg.getBoundingClientRect(); show(Math.max(0, Math.min(labels.length - 1, Math.round((((e.clientX - r.left) / r.width * viewWidth - x0) / w) * (labels.length - 1))))); });
  svg.addEventListener('pointerleave', () => { tip.hidden = true; cursor.setAttribute('visibility', 'hidden'); });
  svg.addEventListener('keydown', e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); show(Math.max(0, Math.min(labels.length - 1, hoverIndex + (e.key === 'ArrowLeft' ? -1 : 1)))); } });
  const legend = h('div', 'legend'); series.forEach((s, i) => { const n = h('span'), swatch = h('i', i ? 'pv' : 'uv'); swatch.style.background = s.color; n.append(swatch, document.createTextNode(s.name)); legend.append(n); });
  wrap.append(svg, tip, legend);
  visual(parent, name, wrap, table(['时间', ...series.map(s => s.name)], labels.map((l,i) => [l, ...series.map(s => s.values[i] || 0)])));
  render(svg.getBoundingClientRect().width || 800);
  const resize = new ResizeObserver(() => {
    if (!svg.isConnected) { resize.disconnect(); return; }
    const width = svg.getBoundingClientRect().width;
    if (width > 0 && Math.abs(width - viewWidth) > .1) render(width);
  });
  resize.observe(svg);
}
// Umami 的时间戳是北京时间字面值（末尾仍有 Z），不再做二次时区转换。
function bucketKey(x, unit) { const s = String(x).replace('T', ' '); return unit === 'hour' ? s.slice(0, 13) : s.slice(0, 10); }
function drawTrend(data, start, now) {
  clear(secTrend); const pv = new Map(), uv = new Map();
  (data?.pageviews || []).forEach(p => pv.set(bucketKey(p.x, range.unit), num(p.y)));
  (data?.sessions || []).forEach(p => uv.set(bucketKey(p.x, range.unit), num(p.y)));
  const keys = [], step = range.unit === 'hour' ? 3600e3 : DAY;
  for (let t = start; t <= now && keys.length < 5000; t += step) keys.push(bucketKey(new Date(t + TZ_MS).toISOString(), range.unit));
  const labels = keys.map(k => range.unit === 'hour' ? (+k.slice(11,13)) + '时' : k.slice(5));
  lineChart(secTrend, range.unit === 'hour' ? '今天每小时' : '每天', labels, [ { name: '访客', color: '#C2861A', values: keys.map(k => uv.get(k) || 0) }, { name: '打开次数', color: '#1C9FA0', values: keys.map(k => pv.get(k) || 0) } ]);
}
function kpi(label, value, cls = '') { const box = h('div', 'kpi ' + cls); box.dataset.kpi = label; box.append(h('div', 'k', label), h('div', 'v', value)); secKpi.append(box); }
const sum = (events, prefix) => Object.entries(events).reduce((n,[k,v]) => n + (k.startsWith(prefix) ? v : 0), 0);
function eventList(events, prefix, mapping) { return Object.entries(events).filter(([k]) => k.startsWith(prefix)).map(([k,v]) => [mapping.get(k.slice(prefix.length)) || k.slice(prefix.length), v]).sort((a,b) => b[1] - a[1]).slice(0,10); }
function drawStats(res, start, now) {
  const s = res[0].value, ev = Object.create(null); rows(res[2]).forEach(([k,v]) => { ev[k] = (ev[k] || 0) + v; });
  clear(secKpi); kpi('正在看（5 分钟内）', res[3].status === 'fulfilled' ? num(res[3].value.visitors) : '—', 'live'); kpi('访客', num(s.visitors)); kpi('打开次数', num(s.pageviews)); kpi('开骂', ev['开骂'] || 0); kpi('鉴定完成', ev['鉴定完成'] || 0); kpi('复制安装', sum(ev, '复制安装·')); kpi('扫码进入', ev['扫码进入'] || 0); kpi('GitHub ⭐', site.gh?.repo.stargazers_count ?? '—');
  drawTrend(res[1].status === 'fulfilled' ? res[1].value : null, start, now);
  clear(secRoast); bars(secRoast, '骂醒漏斗', [['打开',num(s.pageviews)],['开骂',ev['开骂']||0],['再骂一次',ev['再骂一次']||0],['锐评卡',ev['锐评卡']||0]], num(s.pageviews));
  clear(secQuiz); bars(secQuiz, '鉴定漏斗', [['打开',num(s.pageviews)],['鉴定开始',ev['鉴定开始']||0],['鉴定完成',ev['鉴定完成']||0],['鉴定书',ev['鉴定书']||0]], num(s.pageviews));
  clear(secHot); bars(secHot, '最热烦恼 Top 10', eventList(ev, '烦恼·', maps.scenarios));
  clear(secResults); bars(secResults, '鉴定结果分布', maps.archetypes.map(a => [a.name, ev['鉴定·'+a.id]||0, a.color]));
  clear(secInstall); bars(secInstall, '安装方式', [['一行命令',ev['复制安装·npx']||0],['发给 AI',ev['复制安装·link']||0],['Claude Code',ev['复制安装·claude']||0],['提示词版',ev['复制安装·prompt']||0]]);
  clear(secMemes); bars(secMemes, '梗百科热度', eventList(ev, '梗百科·', maps.memes));
  clear(secWho); secWho.append(h('h2', '', '来源 / 地区 / 设备')); const grid = h('div', 'cols2');
  const blocks = [ ['来源网站',rows(res[4]),x=>x.replace(/^https?:\/\//,'').replace(/\/$/,'')], ['地区',rows(res[5]),x=>{ try{return regionNames && /^[A-Z]{2}$/.test(x) ? regionNames.of(x) : x;}catch{return x;} }], ['设备',rows(res[6]),x=>DEVICES[x]||x], ['浏览器',rows(res[7]),x=>BROWSERS[x]||x], ['系统',rows(res[8]),x=>x] ];
  for (const [label, data, map] of blocks) { const box = h('div'); bars(box, label, data.map(([k,v]) => [map(k),v])); grid.append(box); } secWho.append(grid);
  clear(secOther); bars(secOther, '事件明细', Object.entries(ev).sort((a,b)=>b[1]-a[1]));
}
async function github(path, stars = false) {
  const r = await fetch('https://api.github.com/repos/' + CONFIG.REPO + path, { headers: { Accept: stars ? 'application/vnd.github.star+json' : 'application/vnd.github+json' }, credentials: 'omit', cache: 'no-store' });
  if (!r.ok) throw new Error('GitHub'); return r.json();
}
let githubBusy = false;
async function checkGithub(force = false) {
  if (githubBusy || (!force && site.gh && Date.now() - site.ghAt < GH_MS)) return;
  githubBusy = true;
  try {
    const [repo, runs, commits] = await Promise.all([github(''), github('/actions/runs?per_page=1'), github('/commits?per_page=1')]);
    const stars = []; let truncated = false;
    for (let page = 1; page <= 10; page++) { const batch = await github('/stargazers?per_page=100&page=' + page, true); if (!Array.isArray(batch)) throw new Error('GitHub'); stars.push(...batch); if (batch.length < 100) break; if (page === 10) truncated = true; }
    site.gh = { repo, run: runs.workflow_runs?.[0], commit: commits[0]?.commit, stars, truncated }; site.ghAt = Date.now(); site.ghError = false;
  } catch { site.ghError = true; site.ghAt = 0; }
  finally { githubBusy = false; drawGithub(); drawStatus(); const star = [...secKpi.children].find(n => n.dataset.kpi === 'GitHub ⭐'); if (star) star.querySelector('.v').textContent = site.gh?.repo.stargazers_count ?? '—'; }
}
function drawGithub() {
  clear(secGH).append(h('h2', '', 'GitHub'));
  if (site.ghError) { secGH.append(h('p', 'note', GH_ERROR)); return; }
  const g = site.gh;
  if (!g) { secGH.append(h('p','note','加载中…')); return; }
  const summary = h('div', 'github-summary');
  const values = [['Stars',num(g.repo.stargazers_count)],['Forks',num(g.repo.forks_count)],['Watchers',num(g.repo.subscribers_count)]];
  for (const [label,value] of values) { const item=h('div','note',label); item.append(h('strong','',value)); summary.append(item); }
  visual(secGH, '仓库', summary, table(['项目','数量'], values));
  const commit = g.commit;
  secGH.append(h('p','commit-message', '最新提交：' + (commit ? String(commit.message || '').split('\n')[0] : '—') + ' · ' + timeText(commit?.committer?.date || commit?.author?.date)));
  const days = new Map(); for (const item of g.stars) { const t = Date.parse(item.starred_at); if (Number.isFinite(t)) { const key = new Date(t+TZ_MS).toISOString().slice(0,10); days.set(key,(days.get(key)||0)+1); } }
  const dates = [...days.keys()].sort(), labels = [], valuesStar = []; let total=0;
  if (dates.length) {
    const start = Date.parse(dates[0] + 'T00:00:00Z'), end = Date.parse(new Date(Date.now() + TZ_MS).toISOString().slice(0,10) + 'T00:00:00Z');
    for (let t = start; t <= end && labels.length < 5000; t += DAY) {
      const label = new Date(t).toISOString().slice(0,10); labels.push(label); total += days.get(label) || 0; valuesStar.push(total);
    }
  }
  lineChart(secGH, 'Star 增长', labels, [{name:'累计 Star',color:'#C2861A',values:valuesStar}]);
  if (g.truncated) secGH.append(h('p','note','累计基于接口返回的最多 1000 条记录'));
}
async function refresh() {
  if (!um.slug || requireLogin) { drawNoShare(); return; }
  if (busy) return;
  busy = true; const run = revision; upd.textContent = '更新中…';
  try {
    if (!um.token) await umLogin();
    const now = Date.now(), start = Math.min(now, range.start(now)), q = {startAt:start,endAt:now};
    const res = await Promise.allSettled([
      umGet('/stats',q), umGet('/pageviews',{...q,unit:range.unit,timezone:TZ}), umGet('/metrics',{...q,type:'event',limit:500}),
      umGet('/stats',{startAt:now-5*60e3,endAt:now}), ...['referrer','country','device','browser','os'].map(type=>umGet('/metrics',{...q,type,limit:10})),
    ]);
    if (run !== revision) return;
    if (res.some(r => r.status === 'rejected' && r.reason.message === 'auth')) throw new Error('auth');
    if (res[0].status !== 'fulfilled') throw res[0].reason;
    statsRoot.hidden = false; secLogin.hidden = true; um.err = ''; drawStats(res,start,now); lastOk=Date.now(); upd.textContent='更新于 '+fmtClock.format(lastOk)+' · 每分钟自动刷新'; upd.classList.remove('warn');
  } catch (e) {
    if (run !== revision) return;
    um.err = e.message === 'auth' ? '令牌过期，请重新输入分享码' : e.message;
    if (e.message === 'auth' || !um.token) drawNoShare();
    upd.textContent = um.err; upd.classList.add('warn');
  } finally { busy=false; drawStatus(); }
}
drawTabs(); drawStatus(); drawGithub(); if (!um.slug) drawNoShare();
loadMaps().then(refresh); checkSite(); checkGithub();
setInterval(() => { if (!document.hidden) { refresh(); checkSite(); checkGithub(); } }, REFRESH_MS);
document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now()-lastOk>=REFRESH_MS) { refresh(); checkSite(); checkGithub(); } });
addEventListener('hashchange', () => { revision++; um.slug=readShare(); um.token=''; requireLogin=false; if (busy) { busy=false; } refresh(); });
