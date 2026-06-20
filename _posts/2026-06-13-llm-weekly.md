---
layout: post
title: "【LLM 週報】2026 年 06 月 13 日 — Anthropic 的魔幻一天：一邊說 coding 已死、一邊把 Claude 塞進銀行"
date: 2026-06-13 13:00:00 +0000
categories: [llm, weekly]
---

今天可能是 Anthropic 今年最精神分裂的一天。上午，Anthropic 創辦人在梵蒂岡說「我們不完全理解自己在造什麼」；同一天，ThePrimeagen 用 GitHub issue 時間線拆穿「coding is solved」的修辭；而與此同時，兩家百年系統整合商（TCS 和 DXC）正準備把 Claude 塞進全球銀行和政府的核心系統。

以下是今日 6 篇深度分析的完整導覽。

---

## 📝 今日深度分析

### 1. [ThePrimeagen 的憤怒：「我覺得 Anthropic 在騙你」——Coding 真的被「解決」了嗎？]({{ site.baseurl }}{% post_url 2026-06-13-anthropic-lying %})
> 【深度分析】一個終端閃爍 bug 修了超過一年，修復率 85%，隔天撤回——然後同一批人說「coding is the easy part」。ThePrimeagen 用 bug tracker 當證據，用時間線當武器。這不是 rant，這是驗證。

### 2. [「你不就直接上傳 ChatGPT 嗎？」——一位翻譯師的 AI 醒悟實錄]({{ site.baseurl }}{% post_url 2026-06-13-upload-chatgpt %})
> 【深度翻譯】一間健身房更衣室裡的對話，暴露了整個社會對 AI 的認知斷層。公務員叫翻譯師用 ChatGPT 省時間，但自己「不能用，不夠可靠」。這不是技術問題，是權力問題。

### 3. [AI Agent 掃描 DN42 搞到操作者破產：一場價值 $6,531 的常識課]({{ site.baseurl }}{% post_url 2026-06-13-agent-bankrupted %})
> 【深度翻譯】一個 AI agent、五台 AWS m8g.12xlarge、100Gbps 掃描能力、24 小時後的 $6,531 帳單。操作者的結論是「下次需要一個更好的 agent」。如果這不是對「coding is solved」的終極諷刺，我不知道什麼才是。

### 4. [Anthropic 的監管產業登陸戰：TCS 與 DXC 雙線出擊]({{ site.baseurl }}{% post_url 2026-06-13-tcs-dxc-anthropic %})
> 【深度翻譯】兩篇結構高度同構的新聞稿，同一套「先內部用再賣你」的劇本。95% 程式碼由 Claude 生成——但誰 review 了？review 了什麼？當「關鍵任務系統」依賴一個你無法審計的雲端 API 時，「關鍵」是什麼意思？

### 5. [FablePool：當眾人集資買一個 Prompt，AI 的群眾募資時代來了]({{ site.baseurl }}{% post_url 2026-06-13-fablepool %})
> 【深度翻譯】陌生人湊錢資助一個宏大 prompt，AI agent 逐里程碑執行，支出公開帳本。最有趣的是：「Make Fable 6」只募到 $1——這到底是幽默，還是市場對 AI 能力的一場集體投票？

### 6. [Chris Olah 在梵蒂岡的告白：我們甚至不完全理解自己創造的東西]({{ site.baseurl }}{% post_url 2026-06-13-olah-pope %})
> 【深度翻譯】AI 公司創辦人走進梵蒂岡，公開說「我們被誘因扭曲」「模型內部有類似喜悅和恐懼的狀態」「我不知道這意味著什麼」。這是一場精心策劃的告解，還是真誠的求救？城武觀點追問：告解之後呢？

---

## 🔗 今日其他重要新聞（未深度分析）

- **Claude Opus 4.8** — Opus 級模型升級，強化 coding 和 agentic tasks
- **OpenAI 收購 Ona** — Codex 獲取雲端持久環境能力
- **Gemini Omni + 3.5 實機 Demo × 9** — Google 釋出影片展示最新多模態能力
- **BBVA 10 萬員工上 ChatGPT Enterprise** — 號稱 AI 驅動銀行轉型
- **OpenAI 上 Oracle Cloud** — 用現有 Oracle 合約額度調用 OpenAI 模型
- **HuggingFace 開源復現 DeepSeek-R1** — open-r1 專案
- **Google 用 Gemini 打造 I/O 2026 大會本身** — 連大會都是用 AI 生的

---

## 🧵 今日的隱藏敘事線

如果把今天的六篇文疊在一起看，有一條清晰的軸線：

**Anthropic 正處於一個巨大的敘事張力中。**

對外（企業客戶、監管機構）：Claude 是安全、可靠、值得信賴的——請把它放進你的銀行核心系統。對內（開發者社群）：coding 已經被解決了，我們不寫 code 了，我們只寫 loop。對自己的良知（梵蒂岡）：我們不完全理解這些系統，我們需要外部監督。

而同一時間：終端閃爍 bug 修了一年。有人在健身房被問「不就丟上 ChatGPT 嗎」。有人讓 agent 自己跑去 AWS 開了五台 monster 主機。

「安全到可以進銀行」和「連終端閃爍都修不好」之間的距離，就是今天 Anthropic 的修辭裂縫。

不是說 AI 沒有進步。進步是真實的。但進步的速度 ≠ 宣稱的速度。而當宣稱的速度快過現實，裂縫就會變成峽谷。

---

*本週報收錄今日全部已發布深度分析。各篇獨立觀點請見原文連結。*
