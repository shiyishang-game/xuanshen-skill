import { $, el, motion, ready, sourceURL } from './common.js';
export function initDanmaku(data) {
  const hero = $('#heroDanmaku'), quotes = data.quotes;
  ready($('#quoteCard'));
  const label = el('div', 'quote-label', '今日龙言'), text = el('p'), link = el('a', '', '出处 ▸');
  text.id = 'quoteText'; link.id = 'quoteSource'; link.target = '_blank'; link.rel = 'noopener noreferrer';
  $('#quoteCard').append(label, text, link);
  let quoteIndex = Math.floor(Math.random() * quotes.length);
  function showQuote() { const q = quotes[quoteIndex]; text.textContent = q.text; link.href = sourceURL(q); }
  showQuote();
  setInterval(() => {
    if (document.hidden) return;
    quoteIndex = (quoteIndex + 1) % quotes.length;
    if (motion.matches) showQuote();
    else { text.classList.add('fading'); setTimeout(() => { showQuote(); text.classList.remove('fading'); }, 150); }
  }, 4000);
  const animations = new Set(), chats = new Map();
  let lanes = [], visible = true, resizeTimer = null, lastLayout = -Infinity;
  function sync() { for (const entry of animations) { if (document.hidden || (!visible && entry.layer === hero)) entry.animation.pause(); else entry.animation.play(); } }
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }).observe($('#hero'));
  document.addEventListener('visibilitychange', sync);
  function launch(layer, content, lane, duration, gap) {
    const node = el('span', 'danmaku', content);
    node.style.top = lane.top + 'px'; node.dataset.lane = String(lane.top);
    if (Math.random() < .12) node.style.color = ['#FFC83D', '#34E7E4', '#FF3B5C', '#A6FF7A'][Math.floor(Math.random() * 4)];
    layer.append(node);
    const width = layer.clientWidth, nw = node.offsetWidth;
    if (lane.last?.node.isConnected) {
      // 同轨后发的文字保持不快于前一条，避免进入画面后追尾。
      duration = Math.max(duration, (width + nw) / lane.last.speed);
      if (duration > (layer === hero ? 15000 : 9000)) { node.remove(); return false; }
      if (layer.getBoundingClientRect().right - lane.last.node.getBoundingClientRect().right < gap) { node.remove(); return false; }
    }
    const animation = node.animate([{ transform: 'translateX(' + width + 'px)' }, { transform: 'translateX(-' + nw + 'px)' }], { duration, easing: 'linear' });
    const entry = { node, animation, layer, speed: (width + nw) / duration };
    lane.last = entry; animations.add(entry);
    entry.remove = () => { node.remove(); animation.cancel(); animations.delete(entry); if (lane.last === entry) lane.last = null; };
    animation.onfinish = entry.remove;
    return true;
  }
  function clearHero() {
    for (const entry of [...animations]) if (entry.layer === hero) entry.remove();
    hero.replaceChildren(); lanes = [];
  }
  function rebuildLanes() {
    resizeTimer = null; lastLayout = performance.now(); clearHero();
    const heroRect = hero.getBoundingClientRect(), content = $('.hero-content').getBoundingClientRect();
    const first = $('#nav').offsetHeight, top = content.top - heroRect.top - 12, bottom = content.bottom - heroRect.top + 12;
    for (let y = first; y + 36 <= hero.clientHeight; y += 36) {
      if (y + 36 <= top || y >= bottom) lanes.push({ top: y, last: null });
    }
    hero.classList.toggle('reduced', motion.matches);
    if (!motion.matches || !lanes.length) return;
    let seed = 63;
    const rand = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    for (let i = 0; i < 10; i++) {
      const node = el('span', 'danmaku static', data.hero[Math.floor(rand() * data.hero.length)]);
      const lane = lanes[Math.floor(rand() * lanes.length)];
      node.style.left = (rand() * 64) + '%'; node.style.top = lane.top + 'px'; node.dataset.lane = String(lane.top); hero.append(node);
    }
  }
  function scheduleLanes() {
    clearHero();
    if (resizeTimer !== null) return;
    const wait = 200 - (performance.now() - lastLayout);
    if (wait <= 0) rebuildLanes(); else resizeTimer = setTimeout(rebuildLanes, wait);
  }
  function reset() {
    for (const entry of [...animations]) entry.remove();
    for (const state of chats.values()) state.queue = [];
    clearTimeout(resizeTimer); rebuildLanes();
  }
  motion.addEventListener('change', reset); reset();
  addEventListener('resize', () => {
    for (const entry of [...animations]) if (entry.layer !== hero) entry.remove();
    scheduleLanes();
  });
  new ResizeObserver(scheduleLanes).observe($('.hero-content'));
  document.fonts.ready.then(scheduleLanes);
  setInterval(() => {
    if (motion.matches || document.hidden || !visible || hero.children.length >= 14) return;
    const edge = hero.getBoundingClientRect().right;
    const available = lanes.filter(lane => !lane.last || edge - lane.last.node.getBoundingClientRect().right >= 48);
    if (!available.length) return;
    const lane = available[Math.floor(Math.random() * available.length)];
    launch(hero, data.hero[Math.floor(Math.random() * data.hero.length)], lane, 9000 + Math.random() * 6000, 48);
  }, 650);
  setInterval(() => {
    const now = performance.now();
    for (const [layer, state] of chats) {
      if (!layer.isConnected) { chats.delete(layer); continue; }
      state.queue = state.queue.filter(item => now - item.at <= 4000);
      if (motion.matches || document.hidden || layer.clientHeight < 58) continue;
      while (state.queue.length) {
        const edge = layer.getBoundingClientRect().right;
        const available = state.lanes.filter(lane => !lane.last || edge - lane.last.node.getBoundingClientRect().right >= 24);
        if (!available.some(lane => launch(layer, state.queue[0].text, lane, 7000 + Math.random() * 2000, 24))) break;
        state.queue.shift();
      }
    }
  }, 150);
  return (layer, level) => {
    let state = chats.get(layer);
    if (!state) { state = { lanes: [8, 32].map(top => ({ top, last: null })), queue: [] }; chats.set(layer, state); }
    state.queue = [];
    if (motion.matches || document.hidden) return;
    const items = data.react[level] || [];
    if (!items.length) return;
    for (let i = 0; i < 4; i++) state.queue.push({ text: items[Math.floor(Math.random() * items.length)], at: performance.now() });
  };
}
