import { CONFIG } from './config.js';
import { $, el, button, ready, hexAlpha, external, sourceURL, toast } from './common.js';
import { registerEvents, track } from './stats.js';
export function initMemes(data) {
  const root = $('#memesContent'); ready(root); registerEvents('梗百科·', data.memes.map(m => m.id));
  const filters = el('div', 'chips meme-filters'), grid = el('div', 'meme-grid'); root.append(filters, grid);
  let selected = null;
  const colors = ['#FFC83D', '#34E7E4', '#FF3B5C', '#B48CFF', '#7CFF8A'];
  const checks = new Set();
  function draw() {
    filters.replaceChildren(); grid.replaceChildren(); checks.clear();
    for (const tag of [{ id: null, name: '全部' }, ...data.tags]) {
      const b = button(tag.name, 'chip' + (tag.id === selected ? ' selected' : ''), () => { selected = tag.id; draw(); });
      b.dataset.tag = tag.id || ''; b.setAttribute('aria-pressed', String(tag.id === selected)); filters.append(b);
    }
    for (const meme of data.memes.filter(m => selected === null || m.tag === selected)) {
      const card = el('article', 'meme'); card.dataset.mid = meme.id;
      const tag = data.tags.find(t => t.id === meme.tag), color = colors[Math.max(0, data.tags.indexOf(tag)) % colors.length];
      const badge = el('span', 'meme-tag', tag?.name || meme.tagName || meme.tag); badge.style.color = color; badge.style.background = hexAlpha(color, .12);
      const desc = el('p', 'meme-desc clamped', meme.desc);
      const toggle = button('展开', 'text-button meme-toggle', () => {
        const collapsed = desc.classList.toggle('clamped'); toggle.textContent = collapsed ? '展开' : '收起'; toggle.setAttribute('aria-expanded', String(!collapsed));
        if (!collapsed) track('梗百科·' + meme.id);
      }); toggle.hidden = true; toggle.setAttribute('aria-expanded', 'false');
      checks.add(() => { if (desc.classList.contains('clamped')) toggle.hidden = desc.scrollHeight <= desc.clientHeight + 1; });
      const sources = el('div', 'meme-sources'); sources.append(el('span', '', '出处'));
      for (const src of meme.src) { const url = sourceURL(src); if (url) sources.append(external(src.label + ' ▸', url)); }
      card.append(badge, el('h3', '', meme.title), el('p', 'meme-quote', '「' + meme.quote + '」'), desc, toggle, sources); grid.append(card);
    }
    requestAnimationFrame(() => checks.forEach(fn => fn()));
  }
  new ResizeObserver(() => checks.forEach(fn => fn())).observe(grid); draw();
}
export async function copyText(text) {
  try { if (!navigator.clipboard?.writeText) throw new Error('不可用'); await navigator.clipboard.writeText(text); return true; } catch { /* 兼容旧浏览器 */ }
  const area = el('textarea'); area.value = text; area.readOnly = true;
  area.style.position = 'fixed'; area.style.left = '-9999px'; area.style.top = '0';
  document.body.append(area);
  const previous = document.activeElement;
  try { area.select(); area.setSelectionRange(0, text.length); return document.execCommand('copy'); } catch { return false; } finally { area.remove(); previous?.focus({ preventScroll: true }); }
}
export function commandCode(text) {
  const code = el('code', 'cmd');
  code.append(el('span', 'command-prefix', '$ '));
  const parts = String(text).split('/');
  parts.forEach((part, i) => { code.append(document.createTextNode(part)); if (i < parts.length - 1) code.append(document.createTextNode('/'), el('wbr')); });
  return code;
}
export function initInstall(prompt) {
  const root = $('#installContent'); ready(root);
  const tabs = el('div', 'segments install-tabs'), panel = el('div', 'install-panel');
  tabs.setAttribute('role', 'tablist');
  const entries = [
    { id: 'npx', label: '一行命令', text: 'npx skills add ' + CONFIG.REPO, note: '需要 Node.js 18 以上。装完重启你的 AI 工具。' },
    { id: 'link', label: '发给 AI', text: '帮我安装这个 skill：https://github.com/' + CONFIG.REPO, note: '把这句话原样发给 Claude Code / Codex / Cursor，它会自己装好。' },
    { id: 'claude', label: 'Claude Code', text: 'git clone https://github.com/' + CONFIG.REPO + ' ~/.claude/skills/xuanshen', note: '装好后重启 Claude Code，说「龙哥，骂醒我」试试。' },
    { id: 'prompt', label: '提示词版', text: prompt, note: '粘进豆包 / Kimi / DeepSeek 的对话框，或者设成自定义指令。' },
  ];
  let selected = entries[0]; root.append(tabs, panel);
  function draw() {
    tabs.replaceChildren(); panel.replaceChildren();
    for (const entry of entries) {
      const b = button(entry.label, entry === selected ? 'selected' : '', () => { selected = entry; draw(); }); b.dataset.install = entry.id;
      b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(entry === selected)); tabs.append(b);
    }
    const entry = selected, isPrompt = entry.id === 'prompt';
    const box = el('div', 'code-box' + (isPrompt ? ' prompt-preview' : ''));
    if (entry.id === 'npx') { const scroll = el('div', 'command-scroll'); scroll.append(commandCode(entry.text)); box.append(scroll); }
    else {
      if (entry.id === 'claude') box.append(el('span', 'command-prefix', '$ '));
      box.append(el('code', '', isPrompt ? prompt.split('\n').slice(0, 8).join('\n') : entry.text));
    }
    const label = isPrompt ? '复制提示词（' + [...prompt].length + ' 字）' : '复制';
    const copy = button(label, isPrompt ? 'btn-primary copy-prompt' : 'btn-small copy-code', async () => {
      track('复制安装·' + entry.id);
      if (await copyText(entry.text)) { copy.textContent = '已复制 ✓'; setTimeout(() => { copy.textContent = label; }, 1600); }
      else toast('复制失败，长按手动复制吧');
    }); copy.dataset.copy = entry.id;
    if (isPrompt) panel.append(box, copy); else { box.append(copy); panel.append(box); }
    panel.append(el('p', 'install-note', entry.note));
  }
  draw();
}
