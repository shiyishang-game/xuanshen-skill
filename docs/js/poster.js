import { CONFIG } from './config.js';
import { el, button, segments, hexAlpha } from './common.js';
const FONT = '"PingFang SC","HarmonyOS Sans SC","MiSans","Noto Sans CJK SC","Source Han Sans SC","Microsoft YaHei",sans-serif';
const MONO = '"SF Mono","JetBrains Mono",Menlo,Consolas,monospace';
const SITE = CONFIG.SITE.replace(/^https:\/\//, '').replace(/\/$/, '');
const BAD_START = '，。！？、：；」』）》…';
let qrPromise = null, closeCurrent = null;
function qrImage() {
  if (!qrPromise) qrPromise = new Promise((resolve, reject) => {
    const image = new Image(); image.onload = () => resolve(image); image.onerror = () => { qrPromise = null; reject(new Error('二维码读取失败')); }; image.src = 'img/qr.png';
  });
  return qrPromise;
}
function font(ctx, size, weight = 700) { ctx.font = weight + ' ' + size + 'px ' + FONT; }
function round(ctx, x, y, width, height, radius, color, stroke = false, lineWidth = 1) {
  ctx.beginPath(); ctx.roundRect(x, y, width, height, radius);
  if (stroke) { ctx.strokeStyle = color; ctx.lineWidth = lineWidth; ctx.stroke(); } else { ctx.fillStyle = color; ctx.fill(); }
}
function write(ctx, text, x, y, size, weight, color, align = 'left') {
  font(ctx, size, weight); ctx.fillStyle = color; ctx.textAlign = align; ctx.fillText(text, x, y); ctx.textAlign = 'left';
}
function gold(ctx, y0, y1) { const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, '#FFE27A'); g.addColorStop(1, '#FF9F1C'); return g; }
function skewText(ctx, text, x, y, size, color, align = 'left', glow = null) {
  ctx.save(); ctx.setTransform(1, 0, -.14, 1, x, y); if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 32; }
  write(ctx, text, 0, 0, size, 900, color, align); ctx.restore();
}
function wrapLines(ctx, text, width, size) {
  const chars = segments(String(text)).flatMap(part => [...part.text].map(char => ({ char, bold: part.bold })));
  const lines = [[]]; let used = 0;
  for (const item of chars) {
    if (item.char === '\n') { lines.push([]); used = 0; continue; }
    font(ctx, size, item.bold ? 800 : 700); const cw = ctx.measureText(item.char).width;
    if (used + cw > width && lines[lines.length - 1].length && !BAD_START.includes(item.char)) { lines.push([]); used = 0; }
    lines[lines.length - 1].push(item); used += cw;
  }
  return lines;
}
function lineBounds(ctx, lines, size, lineHeight) {
  let top = Infinity, bottom = -Infinity;
  lines.forEach((line, i) => {
    let ascent = 0, descent = 0;
    for (const item of line) {
      font(ctx, size, item.bold ? 800 : 700);
      const m = ctx.measureText(item.char);
      ascent = Math.max(ascent, m.actualBoundingBoxAscent || 0);
      descent = Math.max(descent, m.actualBoundingBoxDescent || 0);
    }
    if (!line.length) { ascent = size * .8; descent = size * .2; }
    top = Math.min(top, i * lineHeight - ascent); bottom = Math.max(bottom, i * lineHeight + descent);
  });
  return { top, bottom, height: bottom - top };
}
function fittedText(ctx, text, x, width, areaTop, areaBottom, tiers, highlight = '#FFC83D') {
  let lines, bounds, size, lineHeight, truncated = false;
  for (const tier of tiers) {
    [size, lineHeight] = tier; lines = wrapLines(ctx, text, width, size); bounds = lineBounds(ctx, lines, size, lineHeight);
    if (bounds.height <= areaBottom - areaTop) break;
  }
  if (bounds.height > areaBottom - areaTop) {
    truncated = true;
    while (lines.length > 1 && lineBounds(ctx, lines, size, lineHeight).height > areaBottom - areaTop) lines.pop();
    const last = lines[lines.length - 1], ellipsis = [{ char: '…', bold: false }, { char: '…', bold: false }];
    const measure = item => { font(ctx, size, item.bold ? 800 : 700); return ctx.measureText(item.char).width; };
    let used = last.reduce((sum, item) => sum + measure(item), 0);
    const tail = ellipsis.reduce((sum, item) => sum + measure(item), 0);
    while (last.length && used + tail > width) used -= measure(last.pop());
    last.push(...ellipsis); bounds = lineBounds(ctx, lines, size, lineHeight);
  }
  const baseline = (areaTop + areaBottom - bounds.height) / 2 - bounds.top;
  lines.forEach((line, i) => {
    let cx = x;
    for (const item of line) { font(ctx, size, item.bold ? 800 : 700); ctx.fillStyle = item.bold ? highlight : '#F2F2F7'; ctx.fillText(item.char, cx, baseline + i * lineHeight); cx += ctx.measureText(item.char).width; }
  });
  return { fontSize: size, lineHeight, lineCount: lines.length, truncated, top: baseline + bounds.top, bottom: baseline + bounds.bottom, areaTop, areaBottom };
}
function base() {
  const canvas = el('canvas'); canvas.width = 1080; canvas.height = 1440;
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('绘图不可用');
  ctx.fillStyle = '#0B0B12'; ctx.fillRect(0, 0, 1080, 1440);
  const glow = ctx.createRadialGradient(540, 0, 0, 540, 0, 900); glow.addColorStop(0, 'rgba(255,200,61,.16)'); glow.addColorStop(1, 'rgba(255,200,61,0)');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, 1080, 1440);
  round(ctx, 32, 32, 1016, 1376, 40, 'rgba(255,200,61,.35)', true, 2);
  return { canvas, ctx };
}
async function display(canvas, filename) {
  const blob = await new Promise((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('导出失败')), 'image/png'));
  closeCurrent?.();
  const url = URL.createObjectURL(blob), file = new File([blob], filename, { type: 'image/png' });
  const overlay = el('div', 'poster-overlay'); overlay.id = 'posterOverlay'; overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true'); overlay.setAttribute('aria-label', '保存图片');
  const image = el('img'); image.src = url; image.alt = filename === 'xuanshen-ruiping.png' ? 'AI 龙哥锐评卡' : '含金量鉴定书';
  const row = el('div', 'poster-buttons'); let action;
  let canShare = false;
  try { canShare = !!navigator.canShare?.({ files: [file] }); } catch { /* 使用下载 */ }
  if (canShare) action = button('分享图片', 'btn-primary', () => navigator.share({ files: [file] }).catch(() => {}));
  else { action = el('a', 'btn-primary', '下载图片'); action.href = url; action.download = filename; }
  const previous = document.activeElement;
  function close() {
    URL.revokeObjectURL(url); overlay.remove(); document.body.classList.remove('modal-open'); document.removeEventListener('keydown', key); closeCurrent = null; previous?.focus({ preventScroll: true });
  }
  function key(e) {
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') {
      const nodes = [...row.querySelectorAll('button,a')], first = nodes[0], last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }
  row.append(action, button('关闭', 'btn-small', close));
  overlay.append(image, el('p', 'poster-hint', '长按保存图片'), row);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); }); document.addEventListener('keydown', key);
  document.body.append(overlay); document.body.classList.add('modal-open'); action.focus(); closeCurrent = close;
}
export async function showRoast(result) {
  const qr = await qrImage(), { canvas, ctx } = base();
  const full = result.level === 'full', accent = full ? '#FF3B5C' : '#FFC83D';
  const ask = result.sid ? result.ask : '（龙哥没听清）';
  // 仅供浏览器检查导出内容，所有字段均来自公开回复库。
  window.__xsPoster = { kind: 'roast', ask, reply: result.reply, level: result.level };
  round(ctx, 80, 80, 112, 48, 24, '#FF3B5C'); write(ctx, 'LIVE', 136, 114, 28, 900, '#FFF', 'center');
  write(ctx, '炫神直播间 · AI 版', 212, 116, 32, 700, '#9A9AB0');
  const title = 'AI 龙哥锐评'; font(ctx, 64, 900); const titleMetrics = ctx.measureText(title);
  const titleRight = 80 + Math.max(titleMetrics.width, titleMetrics.actualBoundingBoxRight || 0) + .14 * (titleMetrics.actualBoundingBoxAscent || 64);
  const centerY = 222 + ((titleMetrics.actualBoundingBoxDescent || 0) - (titleMetrics.actualBoundingBoxAscent || 48)) / 2;
  const capsuleX = titleRight + 28, label = full ? '全力炫' : '正常炫';
  skewText(ctx, title, 80, 222, 64, gold(ctx, 158, 222));
  round(ctx, capsuleX, centerY - 27, 152, 54, 27, accent);
  font(ctx, 26, 900); const labelMetrics = ctx.measureText(label);
  write(ctx, label, capsuleX + 76, centerY + ((labelMetrics.actualBoundingBoxAscent || 26) - (labelMetrics.actualBoundingBoxDescent || 0)) / 2, 26, 900, full ? '#FFF' : '#0B0B12', 'center');
  // 观众行仅显示预设问题。
  ctx.save();
  const chars = [...('观众：' + ask)]; font(ctx, 38, 700);
  let lines = [''];
  for (const c of chars) { let last = lines.length - 1; if (ctx.measureText(lines[last] + c).width > 920 && lines[last] && !BAD_START.includes(c)) { lines.push(''); last++; } lines[last] += c; }
  if (lines.length > 2) { lines = lines.slice(0, 2); while (ctx.measureText(lines[1] + '……').width > 920) lines[1] = [...lines[1]].slice(0, -1).join(''); lines[1] += '……'; }
  lines.forEach((line, i) => write(ctx, line, 80, 290 + i * 54, 38, 700, '#9A9AB0')); ctx.restore();
  round(ctx, 64, 384, 952, 734, 32, '#1B1B2B');
  ctx.save(); ctx.beginPath(); ctx.roundRect(64, 384, 952, 734, 32); ctx.clip(); ctx.fillStyle = accent; ctx.fillRect(64, 384, 8, 734); ctx.restore();
  const layout = fittedText(ctx, result.reply, 112, 856, 440, 1070, [[44,64], [40,58], [36,52], [32,46]], full ? '#FF6B81' : '#FFC83D');
  window.__xsPoster.layout = layout; window.__xsPoster.title = { right: titleRight, capsuleX, centerY };
  round(ctx, 72, 1152, 216, 216, 16, '#FFF'); ctx.drawImage(qr, 80, 1160, 200, 200);
  write(ctx, '炫神.skill', 320, 1216, 52, 900, '#FFC83D'); write(ctx, '扫码让龙哥骂醒你', 320, 1270, 30, 700, '#F2F2F7');
  write(ctx, SITE, 320, 1314, 24, 700, '#9A9AB0'); write(ctx, 'AI 生成 · 非本人 · 图一乐', 320, 1356, 22, 700, '#6E6E86');
  await display(canvas, 'xuanshen-ruiping.png');
  return layout;
}
export async function showCertificate(result) {
  const qr = await qrImage(), { canvas, ctx } = base(), a = result.archetype;
  window.__xsPoster = { kind: 'certificate', name: a.name, gold: result.gold, number: result.number, verdict: result.verdict };
  round(ctx, 48, 48, 984, 1344, 32, 'rgba(255,200,61,.18)', true);
  write(ctx, '炫神.skill · 含金量鉴定书', 540, 130, 36, 900, '#FFC83D', 'center');
  ctx.font = '24px ' + MONO; ctx.fillStyle = '#6E6E86'; ctx.textAlign = 'center'; ctx.fillText('No.' + result.number, 540, 176); ctx.textAlign = 'left';
  ctx.beginPath(); ctx.moveTo(140, 212); ctx.lineTo(940, 212); ctx.strokeStyle = 'rgba(255,200,61,.4)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.save(); ctx.translate(540, 212); ctx.rotate(Math.PI / 4); ctx.fillStyle = '#FFC83D'; ctx.fillRect(-6, -6, 12, 12); ctx.restore();
  write(ctx, '鉴定结果', 540, 280, 28, 700, '#9A9AB0', 'center');
  skewText(ctx, a.name, 540, 420, 120, a.color, 'center', hexAlpha(a.color, .5));
  font(ctx, 34); const leftWidth = ctx.measureText('含金量 ').width; font(ctx, 72, 900); const rightWidth = ctx.measureText(result.gold + '%').width;
  const left = (1080 - leftWidth - rightWidth) / 2;
  write(ctx, '含金量 ', left, 530, 34, 700, '#9A9AB0'); write(ctx, result.gold + '%', left + leftWidth, 530, 72, 900, '#F2F2F7');
  round(ctx, 120, 570, 840, 28, 14, '#262638'); const gradient = ctx.createLinearGradient(120, 570, 960, 570); gradient.addColorStop(0, a.color); gradient.addColorStop(1, '#FFC83D');
  if (result.gold > 0) round(ctx, 120, 570, 840 * result.gold / 100, 28, 14, gradient);
  write(ctx, '「' + a.line + '」', 540, 690, 44, 900, a.color, 'center');
  const layout = fittedText(ctx, result.verdict, 120, 840, 750, 1130, [[40,60], [36,54], [32,48], [30,44]]);
  window.__xsPoster.layout = layout;
  ctx.save(); ctx.translate(900, 1240); ctx.rotate(-12 * Math.PI / 180); ctx.globalAlpha = .92; ctx.strokeStyle = '#FF3B5C';
  ctx.beginPath(); ctx.arc(0, 0, 100, 0, Math.PI * 2); ctx.lineWidth = 10; ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 84, 0, Math.PI * 2); ctx.lineWidth = 3; ctx.stroke();
  write(ctx, '龙哥认证', 0, 4, 44, 900, '#FF3B5C', 'center'); write(ctx, 'S6第一个王者', 0, 42, 22, 800, '#FF3B5C', 'center'); ctx.restore();
  round(ctx, 72, 1176, 200, 200, 16, '#FFF'); ctx.drawImage(qr, 80, 1184, 184, 184);
  write(ctx, '扫码测你的含金量', 300, 1240, 30, 700, '#F2F2F7'); write(ctx, SITE, 300, 1284, 22, 700, '#9A9AB0'); write(ctx, 'AI 生成 · 非本人 · 图一乐', 300, 1324, 22, 700, '#6E6E86');
  await display(canvas, 'xuanshen-jiandingshu.png');
  return layout;
}
