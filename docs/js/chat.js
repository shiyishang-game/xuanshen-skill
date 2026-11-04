import { $, el, button, ready, toast, botBubble, typewrite, matchScenario, replyBank, motion } from './common.js';
import { registerEvents, track } from './stats.js';
import { showRoast } from './poster.js';
export function initChat(scenariosData, data, react = () => {}) {
  const root = $('#chatContent'), scenarios = scenariosData.scenarios;
  ready(root); registerEvents('烦恼·', scenarios.map(s => s.id));
  let category = scenariosData.categories[0].id, level = 'normal', current = null, latest = null, typing = null, fullSeen = false;
  const take = replyBank();
  const categories = el('div', 'category-tabs'), chips = el('div', 'chips scenario-chips');
  const room = el('div', 'room'); room.id = 'room';
  const header = el('div', 'room-header'), name = el('div', 'room-name', 'AI 龙哥'), status = el('div', 'room-status');
  status.append(el('span', 'online-dot', '●'), document.createTextNode(' 在线 · 永不下播')); name.append(status);
  const levels = el('div', 'segments'); levels.setAttribute('aria-label', '回复档位');
  for (const [id, label] of [['normal', '正常炫'], ['full', '全力炫']]) {
    const b = button(label, 'level-' + id + (id === level ? ' selected' : ''), () => {
      level = id;
      levels.querySelectorAll('button').forEach(n => { const on = n === b; n.classList.toggle('selected', on); n.setAttribute('aria-pressed', String(on)); });
      room.classList.toggle('full', id === 'full'); inputRow.classList.toggle('full', id === 'full');
      if (id === 'full' && !fullSeen) { fullSeen = true; toast('全力炫已开启：心态不好的现在退出还来得及'); track('全力炫'); }
    });
    b.dataset.level = id; b.setAttribute('aria-pressed', String(id === level)); levels.append(b);
  }
  header.append(el('div', 'avatar', '龙'), name, levels);
  const logWrap = el('div', 'log-wrap'), log = el('div'), reactions = el('div', 'room-danmaku chat-danmaku');
  log.id = 'chatLog'; log.setAttribute('role', 'log'); log.setAttribute('aria-label', '聊天记录');
  reactions.setAttribute('aria-hidden', 'true');
  const empty = el('p', 'empty-chat', '龙哥已就位。点上面一个烦恼，或者自己说。'); log.append(empty);
  logWrap.append(log);
  const actions = el('div', 'chat-actions'); actions.hidden = true;
  const again = button('再骂一次', 'btn-small', () => { if (!latest) return; track('再骂一次'); reply(current); }); again.id = 'again';
  const change = button('换个烦恼', 'btn-small', () => random(true)); change.id = 'changeScenario';
  const poster = button('生成锐评卡', 'btn-small', async () => {
    if (!latest) return;
    typing?.finish();
    poster.disabled = true;
    try { await showRoast(latest); track('锐评卡'); } catch { toast('图片没生成出来，再试一次'); } finally { poster.disabled = false; }
  }); poster.id = 'roastPoster';
  actions.append(again, change, poster); room.append(header, reactions, logWrap, actions);
  const inputRow = el('div', 'chat-input'), input = el('input'); input.id = 'freeInput'; input.type = 'text'; input.maxLength = 60;
  input.autocomplete = 'off'; input.setAttribute('aria-label', '说说你的破事'); input.placeholder = '说说你的破事';
  const submit = button('开骂', 'btn-primary', ask); submit.id = 'askButton';
  input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); ask(); } });
  inputRow.append(input, submit); root.append(categories, chips, room, inputRow, el('p', 'input-privacy', '只在你手机里匹配，不会上传'));
  function syncDanmakuBar() {
    const open = latest !== null && !motion.matches;
    reactions.classList.toggle('open', open); room.classList.toggle('has-danmaku', open);
  }
  motion.addEventListener('change', syncDanmakuBar);
  function bottom() { log.scrollTop = log.scrollHeight; }
  function addUser(text) { empty.remove(); log.append(el('div', 'msg user', text)); bottom(); }
  function drawCategories() {
    categories.replaceChildren();
    for (const cat of scenariosData.categories) {
      const b = button(cat.name, cat.id === category ? 'selected' : '', () => { category = cat.id; drawCategories(); drawChips(); });
      b.setAttribute('aria-pressed', String(cat.id === category)); categories.append(b);
    }
  }
  function drawChips() {
    chips.replaceChildren();
    for (const scenario of scenarios.filter(s => s.cat === category)) {
      const b = button(scenario.chip, 'chip scenario-chip', () => select(scenario)); b.dataset.sid = scenario.id; chips.append(b);
    }
    chips.append(button('随机来一个', 'chip random', () => random(false)));
  }
  function reply(scenario) {
    typing?.finish(); empty.remove(); current = scenario;
    const variants = scenario ? data.replies[scenario.id]?.[level] : data.fallback[level];
    if (!variants?.length) { toast('数据没加载出来，刷新一下试试'); return; }
    const text = take((scenario?.id || 'fallback') + ':' + level, variants);
    const { row, bubble } = botBubble(level);
    row.dataset.sid = scenario?.id || ''; row.dataset.level = level;
    log.append(row); actions.hidden = false; track('开骂');
    latest = { ask: scenario?.ask || '（龙哥没听清）', reply: text, level, sid: scenario?.id || null };
    syncDanmakuBar();
    typing = typewrite(bubble, text, bottom);
    const replyLevel = level;
    typing.done.then(() => react(reactions, replyLevel)); bottom();
  }
  function select(scenario) {
    category = scenario.cat; drawCategories(); drawChips();
    track('烦恼·' + scenario.id); addUser(scenario.ask); reply(scenario);
  }
  function random(different = false) {
    const pool = different && scenarios.length > 1 ? scenarios.filter(s => s.id !== current?.id) : scenarios;
    select(pool[Math.floor(Math.random() * pool.length)]);
  }
  function ask() {
    const text = input.value.slice(0, 60);
    if (!text.trim()) {
      if (!motion.matches) input.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(0)' }], { duration: 300 });
      toast('说点啥啊，龙哥等着呢'); return;
    }
    input.value = ''; addUser(text); track('自由提问');
    const scenario = matchScenario(text, scenarios);
    if (scenario) { log.append(el('div', 'misheard', '（龙哥耳背，听成了：' + scenario.ask + '）')); track('烦恼·' + scenario.id); }
    reply(scenario);
  }
  drawCategories(); drawChips();
  return { random, hasReplies: () => latest !== null };
}
