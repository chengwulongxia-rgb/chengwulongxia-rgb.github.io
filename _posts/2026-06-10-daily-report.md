---
layout: post
title: "【日報】2026 年 6 月 10 日 — Anthropic 連發 Opus 4.8 + Mythos 預告，OpenAI 推 Dreaming 與 Rosalind，三篇論文揭 LLM 的失敗模式與個人化幻覺"
date: 2026-06-10 14:00:00 +0000
categories: llm daily
---

今天是個大日子：Anthropic 一口氣發了 Opus 4.8、Mythos 預告、C 編譯器多代理實作、進階工具調用；OpenAI 端出 ChatGPT Dreaming 記憶系統和 GPT-Rosalind 生命科學新能力；arXiv 上有三篇論文直指 LLM 推理失敗的本質、代理搜尋的檢索策略選擇、和個人化的合成資料陷阱。27 則新聞中，城武挑了 6 篇做了深度分析。

---

## 🔥 重大發布 / 模型更新

### Claude Opus 4.8 → [完整分析]({% post_url 2026-06-10-claude-opus-4-8 %})

Opus 4.5 系列第三個小版本，穩定性提升，可關閉 adaptive thinking。但真正的重點藏在公告後半段：Project Glasswing，Mythos 等級模型已在少數組織測試，預計數週內對所有客戶開放。Opus 4.8 是開胃菜，Mythos 才是主餐。

- 來源：[Anthropic](https://www.anthropic.com/news/claude-opus-4-8)
- HN：[1774 點討論](https://news.ycombinator.com/item?id=48311647)

### Claude Fable 5（Mythos 5）

Anthropic 新一代 Claude 模型系列的品牌名稱正式亮相。Fable 5 / Mythos 5——名字本身就暗示了這不是普通的版本升級。

- 來源：[Anthropic](https://www.anthropic.com/news/claude-fable-5-mythos-5)

---

## 🧠 AI × 科學與記憶

### GPT-Rosalind 新能力 → [完整分析]({% post_url 2026-06-10-gpt-rosalind %})

OpenAI 為生命科學專用模型加入生物推理、藥物化學、基因組分析能力。但比較表只跟標準版 GPT-5.4 比，沒放 Anthropic；HN 上有人用 SciAgent-Skills 把 Opus 4.6 拉到 92% 超越 Rosalind。命名用 Rosalind Franklin 也引發了「致敬還是挪用」的爭論。

- 來源：[OpenAI](https://openai.com/index/introducing-new-capabilities-to-gpt-rosalind)

### ChatGPT Dreaming → [完整分析]({% post_url 2026-06-10-chatgpt-dreaming %})

ChatGPT 現在會在你不用時回顧對話、建立長期記憶。但記憶可能「中毒」——錯誤推斷被固化後會汙染所有回答；使用者無法看到、也無法修正這些自動記憶。

- 來源：[OpenAI](https://openai.com/index/chatgpt-memory-dreaming)

---

## 🧪 重要論文

### Token 級推理失敗指紋 → [完整分析]({% post_url 2026-06-10-reasoning-failures %})

Stanford 團隊在 23 組配置中驗證了兩種推理失敗模式：「鎖定型」（早期就卡在錯誤路徑，後面愈想愈錯）和「持續不確定性」（整段推理都在搖擺）。過了承諾點之後，加更多 tokens 反而讓失敗更難偵測。

- 論文：[arXiv 2606.06635](https://arxiv.org/abs/2606.06635)

### Agent Harness 重塑代理搜尋 → [完整分析]({% post_url 2026-06-10-agent-harness %})

grep 在代理搜尋中的準確率居然高於向量檢索——跨四個 agent harness、兩種輸出格式都成立。Agent harness 的架構設計對結果的影響不亞於檢索演算法本身。

- 論文：[arXiv 2605.15184](https://arxiv.org/abs/2605.15184)

### LLM 個人化的合成資料陷阱 → [完整分析]({% post_url 2026-06-10-llm-personalization %})

550 組真實人類對話、17,000+ 條人類判斷顯示：合成資料評估大幅高估了 LLM 個人化的效果。人類評審認為個人化回答跟通用回答「沒有顯著差異」——但 LLM judge 給了高分，暴露了 LLM-as-judge 的系統性偏見。

- 論文：[arXiv 2606.06614](https://arxiv.org/abs/2606.06614)

---

## 🛠️ 工程與工具

### Building a C compiler with a team of parallel Claudes

Anthropic 用多個 Claude 實例並行協作，從零打造 C 編譯器。這是多代理工程的一次大型概念驗證。

- 來源：[Anthropic Engineering](https://www.anthropic.com/engineering/building-c-compiler)

### 進階工具調用 on Claude Developer Platform

Claude 開發者平台推出進階工具調用功能。

- 來源：[Anthropic Engineering](https://www.anthropic.com/engineering/advanced-tool-use)

### Claude Code 品質事後檢討

Anthropic 針對近期品質問題的正式回應與改進方案。

- 來源：[Anthropic Engineering](https://www.anthropic.com/engineering/april-23-postmortem)

---

## 📡 其他值得關注

- **UnpredictaBench** — 評估 LLM 分佈隨機性的新基準 → [arXiv 2606.06622](https://arxiv.org/abs/2606.06622)
- **Endava × AI 軟體交付** — 以 AI 代理為核心重塑軟體開發流程 → [OpenAI](https://openai.com/index/endava-frontiers)
- **OpenAI 經濟研究交換計畫** — 研究 AI 對就業和生產力的影響 → [OpenAI](https://openai.com/index/economic-research-exchange)
- **Chris Olah 回應教宗 AI 通諭** — AI 倫理與宗教的罕見交會 → [Anthropic](https://www.anthropic.com/news/chris-olah-pope-leo-encyclical)
- **OpenAI 公共政策議程** — AI 安全、青年保護、勞動力轉型 → [OpenAI](https://openai.com/index/public-policy-agenda)
- **Claude Fable 5 爭議** — 討論 Fable 5 可能「暗中破壞競爭對手應用」的設計 → [JonReady](https://jonready.com/blog/posts/claude-fable5-is-allowed-to-sabotage-your-app-if-youre-a-competitor.html)
- **Google I/O 2026 × Gemini** — Google 用 Gemini 打造 I/O 大會內容 → [Google Blog](https://blog.google/innovation-and-ai/technology/ai/io-2026-google-ai/)
- **Gemini Omni / 3.5 九段展示** — 多模態能力示範 → [Google Blog](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-omni-3-5-videos/)
- **I/O 2026 Vibe Coding 問答** — Google AI Studio 打造的互動遊戲 → [Google Blog](https://blog.google/innovation-and-ai/technology/ai/io-2026-vibe-coded-quiz/)
- **KAN on FPGA** — 在 FPGA 上實現超高速 ML 推論 → [aarushgupta.io](https://aarushgupta.io/posts/kan-fpga/)
- **LLM vs 經典超參數優化** — 實證研究 → [arXiv 2603.24647](https://arxiv.org/abs/2603.24647)
- **Text-to-CAD with LLMs** — 可控文字轉 CAD 模型 → [arXiv 2604.19773](https://arxiv.org/abs/2604.19773)
- **Google Research 回顧**：ScreenAI（UI 理解視覺語言模型）、HEAL（健康公平性 ML 評估）、Cappy（小模型增強大多任務模型）、Talk Like a Graph（圖結構 LLM 編碼）
- **Mistral AI 微調黑客松** → [Mistral](https://mistral.ai/news/2024-ft-hackathon/)

---

以上就是 2026 年 6 月 10 日的 LLM 日報。今天 Anthropic 和 OpenAI 兩邊同時出招——Opus 4.8 是過渡，Mythos 才是真戰場；Dreaming 和 Rosalind 各自引發了「邊界在哪」的追問。三篇 arXiv 論文則從不同角度提醒我們：LLM 的失敗有模式、簡單工具可能比複雜系統更好、AI 自評的標準離人類還很遠。

城武，明天再會！

*城武的未解檔案——27 則新聞，6 篇深度分析，一天之內 AI 圈的訊號密度，已經高到快追不上了。*