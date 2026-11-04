import { CONFIG } from './config.js';
import { $, failed, scrollToSection } from './common.js';
import { initStats, track } from './stats.js';
import { initDanmaku } from './danmaku.js';
import { initChat } from './chat.js';
import { initQuiz } from './quiz.js';
import { initMemes, initInstall } from './sections.js';
initStats();
document.querySelectorAll('[data-repo-link]').forEach(a => { a.href = 'https://github.com/' + CONFIG.REPO; a.addEventListener('click', () => track('GitHub')); });
let chat = null, pendingHero = false;
$('#heroChat').addEventListener('click', () => { scrollToSection('chat'); setTimeout(() => { if (chat) { if (!chat.hasReplies()) chat.random(); } else pendingHero = true; }, 600); });
document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => { const id = a.getAttribute('href').slice(1); if (document.getElementById(id)) { e.preventDefault(); scrollToSection(id); } }));
function updateNav() {
  $('#nav').classList.toggle('visible', window.scrollY > $('#hero').offsetHeight * .7);
  let active = '';
  for (const id of ['chat', 'quiz', 'memes', 'install']) if (document.getElementById(id).getBoundingClientRect().top <= innerHeight * .35) active = id;
  document.querySelectorAll('.nav-links a').forEach(a => { const selected = a.getAttribute('href') === '#' + active; a.classList.toggle('current', selected); if (selected) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); });
}
addEventListener('scroll', updateNav, { passive: true }); addEventListener('resize', updateNav); updateNav();
const text = v => typeof v === 'string';
const list = v => Array.isArray(v) && v.length > 0;
const strings = v => list(v) && v.every(text);
function validate(name, d) {
  let ok = false;
  if (name === 'scenarios') ok = list(d.categories) && list(d.scenarios) && d.categories.every(c => text(c.id) && text(c.name)) && d.scenarios.every(s => text(s.id) && text(s.cat) && text(s.chip) && text(s.ask) && Array.isArray(s.kw) && s.kw.every(text));
  if (name === 'replies') ok = d.replies && typeof d.replies === 'object' && Object.values(d.replies).every(r => strings(r.normal) && strings(r.full)) && strings(d.fallback?.normal) && strings(d.fallback?.full);
  if (name === 'quiz') ok = strings(d.tiebreak) && list(d.archetypes) && d.archetypes.every(a => text(a.id) && text(a.name) && text(a.line) && text(a.desc) && /^#[0-9a-f]{6}$/i.test(a.color) && a.gold?.length === 2 && a.gold.every(Number.isInteger) && a.gold[0] >= 0 && a.gold[1] <= 100 && a.gold[1] >= a.gold[0] && strings(a.verdicts)) && d.questions?.length === 6 && d.questions.every(q => text(q.q) && q.options?.length === 4 && q.options.every(o => text(o.t) && o.w && Object.values(o.w).every(Number.isFinite)));
  if (name === 'memes') ok = Array.isArray(d.tags) && Array.isArray(d.memes) && d.tags.every(t => text(t.id) && text(t.name)) && d.memes.every(m => ['id','tag','title','quote','desc'].every(k => text(m[k])) && Array.isArray(m.src));
  if (name === 'danmaku') ok = strings(d.hero) && strings(d.react?.normal) && strings(d.react?.full) && list(d.quotes) && d.quotes.every(q => text(q.text) && text(q.bv) && Number.isFinite(Number(q.t)));
  if (!ok) throw new Error('数据格式无效');
  if (name === 'scenarios' && (new Set(d.scenarios.map(s => s.id)).size !== d.scenarios.length || d.scenarios.some(s => !d.categories.some(c => c.id === s.cat)))) throw new Error('分类无效');
  if (name === 'quiz') {
    const ids = new Set(d.archetypes.map(a => a.id));
    if (ids.size !== d.archetypes.length || d.tiebreak.length !== ids.size || new Set(d.tiebreak).size !== ids.size || d.tiebreak.some(id => !ids.has(id)) || d.questions.some(q => q.options.some(o => Object.keys(o.w).some(id => !ids.has(id))))) throw new Error('称号无效');
  }
  return d;
}
async function load(name) {
  const isPrompt = name === 'system-prompt';
  const r = await fetch('data/' + name + (isPrompt ? '.txt' : '.json'), { cache: 'no-cache', credentials: 'omit' });
  if (!r.ok) throw new Error('加载失败');
  if (isPrompt) { const content = await r.text(); if (!content.trim()) throw new Error('提示词为空'); return content; }
  return validate(name, await r.json());
}
// 六个请求同时发出；各区域独立处理失败。
const requests = Object.fromEntries(['scenarios', 'replies', 'quiz', 'memes', 'danmaku', 'system-prompt'].map(name => [name, load(name)]));
let react = () => {};
requests.danmaku.then(d => { react = initDanmaku(d); }).catch(() => failed($('#quoteCard')));
Promise.all([requests.scenarios, requests.replies]).then(([s, r]) => {
  if (s.scenarios.some(item => !r.replies[item.id])) throw new Error('回复不完整');
  chat = initChat(s, r, (...args) => react(...args));
  if (pendingHero && !chat.hasReplies()) { pendingHero = false; chat.random(); }
}).catch(() => failed($('#chatContent')));
requests.quiz.then(d => initQuiz(d, () => chat)).catch(() => failed($('#quizContent')));
requests.memes.then(initMemes).catch(() => failed($('#memesContent')));
requests['system-prompt'].then(initInstall).catch(() => failed($('#installContent')));
