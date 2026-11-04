export const motion = matchMedia('(prefers-reduced-motion: reduce)');
export const $ = (selector, root = document) => root.querySelector(selector);
export function el(tag, cls = '', text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = String(text);
  return node;
}
export function button(text, cls, fn) {
  const node = el('button', cls, text);
  node.type = 'button';
  if (fn) node.addEventListener('click', fn);
  return node;
}
export function ready(node) {
  node.replaceChildren();
  node.classList.remove('skeleton', 'loading-block');
  node.removeAttribute('aria-busy');
}
export function failed(node) {
  ready(node);
  node.append(el('p', 'data-error', '数据没加载出来，刷新一下试试'));
}
let toastTimer;
export function toast(text) {
  const node = $('#toast');
  clearTimeout(toastTimer);
  node.textContent = text;
  node.classList.add('visible');
  toastTimer = setTimeout(() => node.classList.remove('visible'), 2200);
}
export function sourceURL(src) {
  if (!src || !/^[A-Za-z0-9]+$/.test(src.bv) || !Number.isFinite(Number(src.t)) || Number(src.t) < 0) return '';
  return 'https://www.bilibili.com/video/' + src.bv + '/?t=' + Number(src.t);
}
export function external(text, href) {
  const node = el('a', '', text);
  if (href) node.href = href;
  node.target = '_blank';
  node.rel = 'noopener noreferrer';
  return node;
}
export function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: motion.matches ? 'instant' : 'smooth', block: 'start' });
}
export function hexAlpha(color, alpha) {
  const valid = /^#[0-9a-f]{6}$/i.test(color) ? color : '#FFC83D';
  return valid + Math.round(alpha * 255).toString(16).padStart(2, '0');
}
export function segments(text) {
  const result = [];
  let start = 0;
  const regex = /\*\*([\s\S]+?)\*\*/g;
  for (const m of String(text).matchAll(regex)) {
    if (m.index > start) result.push({ text: text.slice(start, m.index), bold: false });
    result.push({ text: m[1], bold: true });
    start = m.index + m[0].length;
  }
  if (start < text.length) result.push({ text: text.slice(start), bold: false });
  return result;
}
export function botBubble(level = 'normal') {
  const row = el('div', 'bot-row ' + level);
  const avatar = el('div', 'avatar', '龙');
  avatar.setAttribute('aria-hidden', 'true');
  const body = el('div', 'bot-body');
  body.append(el('div', 'bot-label', level === 'full' ? '全力炫' : '正常炫'));
  const bubble = el('div', 'msg bot');
  bubble.tabIndex = 0;
  bubble.setAttribute('aria-label', '龙哥回复，点按显示全文');
  body.append(bubble);
  row.append(avatar, body);
  return { row, bubble };
}
export function typewrite(node, text, onUpdate = () => {}) {
  let timer, complete = false, index = 0;
  let resolve;
  const done = new Promise(r => { resolve = r; });
  const parts = segments(String(text));
  const chars = [];
  function prepare() {
    chars.length = 0;
    node.replaceChildren();
    for (const part of parts) {
      const target = part.bold ? el('strong') : document.createTextNode('');
      if (part.bold) {
        const tn = document.createTextNode('');
        target.append(tn);
        for (const char of part.text) chars.push([tn, char]);
      } else for (const char of part.text) chars.push([target, char]);
      node.append(target);
    }
  }
  function finish() {
    if (complete) return;
    complete = true;
    clearTimeout(timer);
    prepare();
    for (const [target, char] of chars.splice(0)) target.appendData(char);
    node.dataset.typing = 'false';
    node.removeEventListener('click', finish);
    node.removeEventListener('keydown', skipKey);
    motion.removeEventListener('change', reduce);
    onUpdate();
    resolve();
  }
  function skipKey(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); finish(); } }
  function reduce() { if (motion.matches) finish(); }
  function tick() {
    if (complete) return;
    if (index >= chars.length) { finish(); return; }
    const [target, char] = chars[index++];
    target.appendData(char);
    onUpdate();
    const pause = '。！？'.includes(char) ? 160 : '，、；：'.includes(char) ? 90 : 0;
    timer = setTimeout(tick, 26 + pause);
  }
  node.dataset.typing = 'true';
  node.addEventListener('click', finish);
  node.addEventListener('keydown', skipKey);
  motion.addEventListener('change', reduce);
  if (motion.matches) finish();
  else {
    const dots = el('div', 'typing-dots');
    dots.setAttribute('aria-label', '龙哥正在组织语言');
    dots.append(el('span'), el('span'), el('span'));
    node.replaceChildren(dots);
    timer = setTimeout(() => { prepare(); tick(); }, 420);
  }
  return { finish, done };
}
export function rollNumber(node, value) {
  if (motion.matches) { node.textContent = String(value); return; }
  const start = performance.now();
  function frame(now) {
    const p = Math.min(1, (now - start) / 900);
    node.textContent = String(Math.round(value * (1 - (1 - p) ** 3)));
    if (p < 1 && node.isConnected) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
export function matchScenario(text, scenarios) {
  const input = text.toLowerCase();
  let winner = null, best = 0;
  for (const item of scenarios) {
    const score = item.kw.reduce((sum, kw) => sum + (kw && input.includes(kw.toLowerCase()) ? [...kw].length : 0), 0);
    if (score > best) { winner = item; best = score; }
  }
  return winner;
}
export function fnv1a(text) {
  let hash = 2166136261;
  for (const byte of new TextEncoder().encode(text)) hash = Math.imul(hash ^ byte, 16777619) >>> 0;
  return hash;
}
export function quizResult(data, answers) {
  if (answers.length !== data.questions.length || answers.some(a => !Number.isInteger(a) || a < 0 || a > 3)) throw new Error('答案无效');
  const scores = new Map(data.archetypes.map(a => [a.id, 0]));
  answers.forEach((a, i) => Object.entries(data.questions[i].options[a].w).forEach(([id, weight]) => scores.set(id, (scores.get(id) || 0) + weight)));
  const order = [...data.tiebreak, ...data.archetypes.map(a => a.id)];
  const winner = order.reduce((best, id) => scores.has(id) && (!best || scores.get(id) > scores.get(best)) ? id : best, null);
  const archetype = data.archetypes.find(a => a.id === winner);
  const hash = fnv1a(answers.join(''));
  const gold = archetype.gold[0] + hash % (archetype.gold[1] - archetype.gold[0] + 1);
  return { archetype, gold, number: String(hash % 1000000).padStart(6, '0'), verdict: archetype.verdicts[(hash >>> 8) % archetype.verdicts.length] };
}
export function shuffled(values) {
  const list = [...values];
  for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
  return list;
}
export function replyBank() {
  const states = new Map();
  return (key, variants) => {
    if (!Array.isArray(variants) || !variants.length) throw new Error('回复库为空');
    let state = states.get(key);
    if (!state) { state = { queue: [], last: null }; states.set(key, state); }
    if (!state.queue.length) {
      state.queue = shuffled(variants);
      if (state.queue.length > 1 && state.queue[0] === state.last) {
        const j = state.queue.findIndex(v => v !== state.last);
        if (j > 0) [state.queue[0], state.queue[j]] = [state.queue[j], state.queue[0]];
      }
    }
    state.last = state.queue.shift();
    return state.last;
  };
}
