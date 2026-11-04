import { $, el, button, ready, motion, hexAlpha, typewrite, botBubble, quizResult, rollNumber, scrollToSection, toast } from './common.js';
import { track, registerEvents } from './stats.js';
import { showCertificate } from './poster.js';
export function initQuiz(data, getChat) {
  const root = $('#quizContent'); ready(root); registerEvents('鉴定·', data.archetypes.map(a => a.id));
  let answers = [], index = 0, locked = false, generation = 0, writing = null;
  const grid = el('div', 'title-grid');
  for (const a of data.archetypes) { const badge = el('div', 'title-badge', a.name); badge.style.color = a.color; badge.style.background = hexAlpha(a.color, .1); grid.append(badge); }
  root.append(grid, button('开始鉴定', 'btn-primary', () => { track('鉴定开始'); restart(); }));
  function restart() { generation++; writing?.finish(); answers = []; index = 0; locked = false; drawQuestion(); }
  function drawQuestion() {
    root.replaceChildren(); root.classList.remove('quiz-result'); root.dataset.state = 'question'; root.dataset.question = String(index);
    const progress = el('div', 'quiz-progress', '第 ' + (index + 1) + ' / ' + data.questions.length + ' 题');
    const trackNode = el('div', 'progress-track'), fill = el('div', 'progress-fill'); fill.style.width = ((index + 1) / data.questions.length * 100) + '%'; trackNode.append(fill);
    const question = el('div', 'question');
    question.append(el('h3', 'question-title', data.questions[index].q));
    const options = el('div', 'options');
    data.questions[index].options.forEach((option, n) => {
      const b = button('', 'opt', async () => {
        if (locked) return;
        locked = true; answers[index] = n; b.classList.add('selected'); b.setAttribute('aria-pressed', 'true');
        const run = generation;
        await new Promise(r => setTimeout(r, 220));
        if (run !== generation) return;
        if (!motion.matches) await question.animate([{ opacity: 1, transform: 'translateX(0)' }, { opacity: 0, transform: 'translateX(-16px)' }], { duration: 160, fill: 'forwards' }).finished;
        if (run !== generation) return;
        index++; locked = false;
        if (index >= data.questions.length) drawResult(); else drawQuestion();
      });
      b.dataset.option = String(n); b.setAttribute('aria-pressed', 'false');
      b.append(el('span', 'opt-letter', 'ABCD'[n]), el('span', '', option.t)); options.append(b);
    });
    question.append(options); root.append(progress, trackNode, question);
    if (index > 0) root.append(button('上一题', 'text-button quiz-back', () => {
      if (locked) return;
      generation++; index--; answers.splice(index); drawQuestion();
    }));
    if (!motion.matches) question.animate([{ opacity: 0, transform: 'translateX(16px)' }, { opacity: 1, transform: 'translateX(0)' }], { duration: 200 });
  }
  function drawResult() {
    const result = quizResult(data, answers), a = result.archetype;
    track('鉴定完成'); track('鉴定·' + a.id);
    root.replaceChildren(); root.classList.add('quiz-result'); root.dataset.state = 'result'; root.dataset.aid = a.id; root.dataset.gold = String(result.gold); root.dataset.number = result.number;
    const name = el('div', 'result-name', a.name); name.style.color = a.color; name.style.textShadow = '0 0 24px ' + hexAlpha(a.color, .35);
    const score = el('div', 'gold-score'), number = el('span', 'gold-number', '0');
    score.append(el('span', 'gold-score-label', '含金量'), number, el('span', 'gold-percent', '%'));
    const meter = el('div', 'gold-track'), fill = el('div', 'gold-fill');
    fill.style.background = 'linear-gradient(90deg,' + a.color + ',#FFC83D)'; meter.append(fill);
    const line = el('p', 'result-line', '「' + a.line + '」'); line.style.color = a.color;
    const { row, bubble } = botBubble();
    root.append(el('div', 'result-label', '龙哥鉴定结果'), name, score, meter, line, el('p', 'result-desc', a.desc), row, el('p', 'certificate-number', '鉴定书编号 No.' + result.number));
    const actions = el('div', 'result-actions');
    const poster = button('生成鉴定书', 'btn-primary', async () => {
      writing?.finish(); poster.disabled = true;
      try { await showCertificate(result); track('鉴定书'); } catch { toast('图片没生成出来，再试一次'); } finally { poster.disabled = false; }
    }); poster.id = 'certificatePoster';
    actions.append(poster, button('再测一次', 'btn-small', restart), button('不服？让龙哥骂醒你', 'btn-ghost', () => { scrollToSection('chat'); setTimeout(() => getChat()?.random(), 600); }));
    root.append(actions);
    writing = typewrite(bubble, result.verdict); rollNumber(number, result.gold);
    requestAnimationFrame(() => requestAnimationFrame(() => { fill.style.width = result.gold + '%'; }));
  }
}
