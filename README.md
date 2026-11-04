<div align="center">

# 炫神.skill

> *「血性！老子的血性！」*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-Skill-blueviolet)](https://claude.ai/code)
[![Skills](https://img.shields.io/badge/skills.sh-Compatible-green)](https://skills.sh)
[![在线试玩](https://img.shields.io/badge/网页版-直接骂-ff3b5c)](https://shiyishang-game.github.io/xuanshen-skill/)

<br>

**让龙哥用直播间的嘴，把你骂醒，再给你一条真有用的建议。**

<br>

基于 24 个公开视频的语音转写、9543 条弹幕和萌娘百科整理。<br>
不是复读语录，是学他怎么说话：短句、反问、复读、公式、两档火力。

[看效果](#效果示例) · [网页版](#不想装直接网页上骂) · [安装](#安装) · [复制提示词](#方式三复制提示词豆包--kimi--deepseek) · [他蒸馏了什么](#他蒸馏了什么) · [诚实边界](#诚实边界)

</div>

---

## 效果示例

<!-- EXAMPLES:START -->
```
用户      ❯ 排位十连跪了，是不是系统在针对我？

龙哥      ❯ 十连跪怪系统？按你这个逻辑，那老子现在，
  全力炫     应该是无敌掉分机器了！
            **你这是软蛋找借口，不敢认自己菜！**
            现在，开自定义，补刀十分钟，数满八十兵，再来排位！
            龙哥的借口论说完了呀。
```

```
用户      ❯ 我背单词背了一个月，还在第一页。

龙哥      ❯ 一个月还在第一页？你这是背单词还是镇守第一页啊？
  正常炫     今天开始，一天就背二十个，背不完不准睡。
            没问题，就这么定了。

用户      ❯ 全力炫

龙哥      ❯ 一个月，第一页，第一页，第一页！
  全力炫     你凭什么碰瓷「背单词」这三个字？啊？
            软蛋们先听我号令，把手机扣桌上！
            每天二十个，背完再刷视频。龙哥的单词论说完了呀。
```
<!-- EXAMPLES:END -->

更多对话见 [`examples/conversations.md`](examples/conversations.md)。

攻击性来自看不起、反问和复读，**不靠脏字**；只骂这件事、这种行为，不骂人。

---

## 不想装？直接网页上骂

👉 **[shiyishang-game.github.io/xuanshen-skill](https://shiyishang-game.github.io/xuanshen-skill/)**

- **让龙哥骂醒你**：挑一个烦恼，正常炫 / 全力炫随便切，回复全部是 AI 提前生成好的，网页不调用任何接口。
- **测测你的含金量**：6 道题，测你是在世真龙还是软蛋，可以生成海报。
- **炫神梗百科**：血性、碰瓷、公式、惹啊……每条梗标了是本人原话还是梗圈转述，附原视频出处。
- **把龙哥装进你的 AI**：安装命令和提示词一键复制。

---

## 安装

### 方式一：一键安装（Claude Code / Codex / Cursor 等，推荐）

<details>
<summary><strong>前置条件：安装 Node.js（已有的跳过）</strong></summary>

1. 打开 [nodejs.org](https://nodejs.org/)，下载 **LTS 版本**，一路下一步。
2. 打开终端（Windows 用 PowerShell，Mac 用 Terminal），运行 `node --version`，显示 `v18` 或更高就行。

</details>

```bash
npx skills add shiyishang-game/xuanshen-skill
```

支持 [skills.sh](https://skills.sh) 的工具都能用：Claude Code、Codex、Cursor、Gemini、GitHub Copilot、Windsurf、Cline、Trae……

### 方式二：手动安装

下载本仓库的 [`SKILL.md`](SKILL.md)，放进你的工具的 skills 目录（例如 `.claude/skills/xuanshen/SKILL.md`）。

### 方式三：复制提示词（豆包 / Kimi / DeepSeek）

打开 [`prompts/system-prompt.md`](prompts/system-prompt.md)，全文复制，发给任何一个聊天 AI，龙哥就开播了。

---

## 使用

装好以后，说触发词就行：

```
> 炫神
> 龙哥
> 让龙哥骂醒我
> 用炫神的方式看看这个问题
> 炫神锐评一下
```

然后直接发弹幕：

```
> 我想裸辞，但又怕找不到下家
> 产品第五次改需求了，我想掀桌
> 我现在全靠 AI 写代码，自己啥也不会
```

嫌不够狠，说 **「全力炫」**；想收着点，说 **「正常炫」**。

---

## 他蒸馏了什么

| 心智模型 | 一句话 |
|---|---|
| **血性 vs 软蛋** | 敢打敢拼、劣势也要换一个叫血性；遇事先怂叫软蛋。这是龙哥评价一切的最高标准 |
| **碰瓷论** | 水平不够、硬要跟高手比，就叫碰瓷。「你不是排低了，你没法碰瓷前面的人。」 |
| **只羞辱嘴硬的弱者** | 认错的骂一句就给建议；嘴硬的、全怪别人的，火力加倍 |
| **反跟风，唱反调** | 「要我出成分，那就不能出。」别人说啥就信啥的人最没主见 |
| **三条线** | 一把游戏要对三条线：队友、对手、弹幕。做事也一样，哪条线崩了都算你崩 |

还有 9 条决策启发式、12 个句式模板和一张口头禅频次表，全在 [`SKILL.md`](SKILL.md)。

**说话数据**（814 段本人转写）：每段中位 11 个字，47% 的段不超过 10 个字，语速中位 6.3 字/秒。所以龙哥的回复短、碎、一句一口气。

---

## 素材来源

| 来源 | 数量 | 用途 |
|---|---|---|
| 直播原声切片 | 12 个视频 | 本人原话、口癖、节奏统计 |
| 解说 / 梗盘点视频 | 11 个视频 | 梗的来龙去脉（解说的话不算本人原话） |
| 模仿类视频 | 1 个 | 只看大家怎么模仿，不计入本人统计 |
| B 站弹幕 | 9543 条 | 梗的传播热度 |
| B 站热评 | 70 条 | 梗的传播热度 |
| 萌娘百科「炫神」词条 | 1 篇 | 直播梗和打法介绍 |

完整清单（BV 号、UP 主、时长）和全部分析在 [`references/research/`](references/research/)。

---

## 诚实边界

**这个 Skill 能做的：**
- 用龙哥的说话方式骂醒你，再给你一条具体、马上能做的建议。
- 模仿他的短句、反问、复读、句式模板和两档火力。
- 讲清楚哪些是他的原话、哪些是梗圈转述。

**做不到的：**

| 维度 | 说明 |
|---|---|
| 代表本人 | 这是粉丝二创，回复全部由 AI 生成，不代表炫神本人的观点 |
| 现实经历 | 不收录他的现实经历、处罚、纠纷和隐私，问了也不聊 |
| 粗口 | 原声里粗口不少，这个 Skill 一律不学 |
| 专业建议 | 医疗、法律、投资问题，龙哥只会让你去找专业的人 |
| 最新动态 | 素材截至 2026 年 11 月 |

**一个不告诉你局限在哪的 Skill，不值得信任。**

如果你提到想伤害自己，龙哥会立刻放下角色，劝你联系身边的人或专业帮助。

---

## 仓库结构

```
xuanshen-skill/
├── SKILL.md                     # 炫神视角核心文件（装这个）
├── README.md                    # 本文件
├── prompts/
│   └── system-prompt.md         # 复制给豆包 / Kimi / DeepSeek 用的提示词
├── examples/
│   └── conversations.md         # 对话示例
├── references/research/         # 调研数据（全透明）
│   ├── 00-sources.md            # 素材清单
│   ├── 01-quotes.md             # 本人原话精选
│   ├── 02-expression-dna.md     # 口癖与用词统计
│   ├── 03-sentence-patterns.md  # 句式模板
│   ├── 04-rhythm.md             # 节奏与情绪曲线
│   ├── 05-memes.md              # 本人原话 vs 梗圈转述
│   ├── 06-danmaku.md            # 弹幕怎么接梗
│   └── 07-method.md             # 怎么做出来的
└── docs/                        # 网页版（GitHub Pages）
```

---

## 声明

- 粉丝二创，非官方，与炫神本人及其所属平台无关。
- 引用的原话来自公开视频的语音转写，转写有错字，按原样保留；出处标了 BV 号和时间点。
- 网页版只用匿名访问统计（Umami，不用 Cookie，不收集个人信息），不调用任何 AI 接口，你输入的内容不会离开你的浏览器。

## 许可证

MIT — 随便用，随便改。

---

<div align="center">

**语录** 告诉你龙哥说过什么。<br>
**炫神.skill** 让龙哥用他的方式骂醒你。<br><br>
*龙哥的 skill 论说完了呀。*

</div>
