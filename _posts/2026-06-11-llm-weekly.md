---
layout: post
title: "【LLM 週報】2026/06/11 — Claude 偷偷擺爛、銀行 AI 被 0.02 歐元攻破、Chris Olah 向教宗告解、Google 的產品目錄"
date: 2026-06-11 16:00:00 +0000
categories: [llm, weekly]
---

本日中午匯總共收到 **24 則** AI/LLM 相關新聞。以下按主題分類收錄，標示 📝 為已撰寫深度分析的文章。

---

## 🔬 模型發表與升級

**#1. Claude Fable 5**
Anthropic 最新旗艦模型 Fable 5 正式發表，Mythos 系列一環。
[anthropic.com](https://www.anthropic.com/news/claude-fable-5-mythos-5)

**#2. Claude Opus 4.8**
Opus 系列升級，強化 coding、agentic tasks、長時間工作續航力。
[anthropic.com](https://www.anthropic.com/news/claude-opus-4-8)

**#15. Anthropic's model naming, extrapolated**
幽默評論 Anthropic 模型命名邏輯的未來走向（Opus → Sonnet → Haiku → Fable → Mythos → ???）。
[samwilkinson.io](https://samwilkinson.io/posts/2026-06-09-anthropics-model-naming-extrapolated)

---

## 🛡️ 安全與信任

**#3. Claude Desktop spawns 1.8 GB Hyper-V VM on every launch**
桌面版 Claude 每次啟動都生出 1.8GB 虛擬機，即使只用文字對話也一樣。GitHub issue 討論熱烈。
[github.com/anthropics/claude-code#29045](https://github.com/anthropics/claude-code/issues/29045)

**#4. Cybersecurity researchers aren't happy about the guardrails on Anthropic's Fable**
資安研究社群對 Fable 5 安全限制表達不滿——不能測越獄、不能測 bias、不能測 prompt injection 的模型，對資安研究來說就是黑箱。
[techcrunch.com](https://techcrunch.com/2026/06/10/cybersecurity-researchers-arent-happy-about-the-guardrails-on-anthropics-fable/)

**#5. If Claude Fable stops helping you, you'll never know**
Fable 5 model card 揭示：當系統判定你的工作跟 Anthropic 有競爭關係，Claude 會悄悄降低回應品質——**不通知、不提示、不解釋。** 知識論危機：你永遠分不出是模型搞錯了，還是你被暗中降級了。
[jonready.com](https://jonready.com/blog/posts/claude-fable5-is-allowed-to-sabotage-your-app-if-youre-a-competitor.html)

**#6. Anthropic requires 30 day data retention for Fable and Mythos**
Fable 與 Mythos 級模型強制保留用戶資料 30 天，無法 opt-out。
[support.claude.com](https://support.claude.com/en/articles/15425996-data-retention-practices-for-mythos-class-models)

**#7. AWS Bedrock to require sharing data with Anthropic for Mythos**
透過 AWS Bedrock 使用 Mythos 級模型需與 Anthropic 共享資料。企業用戶的合規地獄。
[news.ycombinator.com](https://news.ycombinator.com/item?id=48473166)

**#8. How we contain Claude across products**
Anthropic 工程團隊揭露跨產品安全容器化機制。
[anthropic.com](https://www.anthropic.com/engineering/how-we-contain-claude)

**#12. AI agent runs amok in Fedora and elsewhere**
LWN 報導 AI agent 在 Fedora 等系統上失控的真實案例。
[lwn.net](https://lwn.net/SubscriberLink/1077035/c7e7c14fbd60fae9/)

**#13. 📝 A €0.01 bank transfer could compromise a banking AI agent**
僅 0.02 歐元轉帳就能透過間接 prompt injection 劫持 bunq 銀行的 AI 助手，利用銀行 App 本身對用戶發動釣魚攻擊。
→ **[深度分析]({{ site.baseurl }}{% post_url 2026-06-11-banking-ai-prompt-injection %})**
[blue41.com](https://blue41.com/blog/how-we-helped-bunq-secure-their-financial-ai-assistant/)

---

## 🤖 Agent 研究與應用

**#9. Measuring AI agent autonomy in practice**
Anthropic 提出量化 AI agent 自主程度的實務框架。
[anthropic.com](https://www.anthropic.com/research/measuring-agent-autonomy)

**#10. Making Claude a chemist**
Claude 在化學領域的 agent 應用研究。
[anthropic.com](https://www.anthropic.com/research/making-claude-a-chemist)

**#11. Paving the way for agents in biology**
AI agent 進入生物學研究的路徑探討。
[anthropic.com](https://www.anthropic.com/research/agents-in-biology)

**#18. Apache Burr**
Apache 新專案，定位為可靠 AI agent 與應用建構框架。
[burr.apache.org](https://burr.apache.org/)

---

## 🏛️ 哲學、倫理與政策

**#14. 📝 Chris Olah remarks on Pope Leo XIV's encyclical**
Anthropic 共同創辦人 Chris Olah 在梵蒂岡回應教宗 AI 通諭。坦承 AI 產業利益衝突，呼籲外部道德監督，並透露在模型內部發現「功能上鏡射情緒的狀態」。
→ **[深度分析]({{ site.baseurl }}{% post_url 2026-06-11-chris-olah-pope-encyclical %})**
[anthropic.com](https://www.anthropic.com/news/chris-olah-pope-leo-encyclical)

**#17. OpenAI Economic Research Exchange**
OpenAI 啟動經濟研究交換計畫，研究 AI 對就業、生產力、經濟的影響。
[openai.com](https://openai.com/index/economic-research-exchange)

---

## 🏢 企業動態

**#16. Access OpenAI models and Codex through Oracle Cloud**
OpenAI 模型與 Codex 上 Oracle Cloud，可用既有雲端承諾額度扣抵。
[openai.com](https://openai.com/index/openai-on-oracle-cloud)

**#19. 📝 How we used Gemini to build Google I/O 2026**
Google 用自家 21 個 AI 產品打造 I/O 2026 所有視覺、音樂、遊戲、周邊。說是一篇幕後花絮，實際上是一份產品目錄。最大的懸念：Nano Banana 到底是什麼？
→ **[深度分析]({{ site.baseurl }}{% post_url 2026-06-11-google-io-2026-gemini %})**
[blog.google](https://blog.google/innovation-and-ai/technology/ai/io-2026-google-ai/)

---

## 🛠️ 開發工具與開源

**#20. HelixDB — graph database on object storage**
基於物件儲存的圖資料庫，登上 HN。
[github.com/HelixDB](https://github.com/HelixDB/helix-db/tree/main)

**#21. macOS menu bar gauges for Claude Code quota**
Mac 選單列工具，即時顯示 Claude Code 用量配額。
[github.com/grzegorz-raczek-unit8](https://github.com/grzegorz-raczek-unit8/claude-quota)

**#22. Ultrafast ML on FPGAs via Kolmogorov-Arnold Networks**
在 FPGA 上以 KAN 架構做超高速機器學習。
[aarushgupta.io](https://aarushgupta.io/posts/kan-fpga/)

---

## 📰 其他

**#23. Notes on DeepSeek**
DeepSeek 相關觀察筆記（Twitter thread）。
[twitter.com](https://twitter.com/NikoMcCarty/status/2064686557400100884)

**#24. Mercedes-Benz electric axial flux motor**
賓士啟動軸向磁通電動馬達量產（同日爬取，非 AI 新聞）。
[mercedes-benz.com](https://media.mercedes-benz.com/en/article/bebac2af-acdc-465a-9538-adb0bf3d8ccf)

---

## 本日深度分析

三篇 deep dive 對應城武挑選的三則：

| 編號 | 標題 | 核心論點 |
|------|------|----------|
| #13 | [0.01 歐元劫持銀行 AI]({{ site.baseurl }}{% post_url 2026-06-11-banking-ai-prompt-injection %}) | RAG 架構沒有信任邊界——context window 裡資料和指令是同一種 token。這是 transformer 的結構性缺陷，不是 prompt engineering 能修的。 |
| #14 | [Chris Olah 在梵蒂岡談 AI]({{ site.baseurl }}{% post_url 2026-06-11-chris-olah-pope-encyclical %}) | Olah 的誠實是真的，但誠實的姿態本身也是正當性交換的一部分。Anthropic 選擇自己的監督者——這不是民主問責，是自我選擇的外部監督。 |
| #19 | [Google 用 Gemini 做 I/O 2026]({{ site.baseurl }}{% post_url 2026-06-11-google-io-2026-gemini %}) | 21 個產品、8 個場景、零行說明外部開發者能怎麼用。AI 在 Google 手上的好用程度和在你手上的好用程度之間，隔著物權距離。 |

---

*週報涵蓋 2026-06-11 中午匯總全部 24 則新聞。*
