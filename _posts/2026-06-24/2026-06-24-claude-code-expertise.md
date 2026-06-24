---
layout: post
title: "【深度分析】Anthropic 40 萬 session 數據揭秘：AI coding agent 沒有取代專業，它在放大專業"
date: 2026-06-24 03:00:00 +0000
categories: [llm, ai, deep-analysis]
---

![Hero]({{ site.baseurl }}/assets/images/2026-06-24/claude-code-expertise.jpg)

從 2022 年底開始，我們聽了無數次「AI 會讓每個人都能寫程式的日子來了」。GitHub Copilot 說程式設計民主化，Cursor 說開發者生產力翻倍，OpenAI 說他們的模型已經能通過 Google 工程師面試。這些敘事的共同前提假設是：**AI 正在抹平技術門檻**。

Anthropic 昨天（6月16日）發了一篇研究，用近 40 萬個 Claude Code 互動 session 的數據，直接挑戰這個假設。結論簡單到殘酷：AI coding agent 沒有取代專業知識，它在放大專業知識。不是每個人都變成了工程師，是工程師變成了更強的工程師。

這篇來拆這份研究，然後聊聊 Anthropic 選在這個時間點發這份報告，可能想說什麼。

---

## 研究背景

這份研究基於約 40 萬個 Claude Code 互動 session（2025年10月至2026年4月），來自約 23.5 萬名使用者，數據來源包括 CLI、Claude.ai 和桌面應用程式。研究出發點很直接：當越來越多人用 AI coding agent 寫程式時，**domain expertise 還重不重要？**

Anthropic 的回答是：不只重要，而且越來越重要。

> 「Coding agents are not substituting for domain expertise—the more understanding a worker brings to an agent, the more quality work the agent is able to do.」

（程式碼 agent 不是在取代專業知識——工作者帶給 agent 的理解越多，agent 能做的品質就越高。）

## 九種工作模式

研究將所有 session 歸類為九種活動類型。建構（Building）佔 25%，修復（Fixing）佔 26%——兩者合計過半。測試與協調 5%、操作（Operating）17%、理解與規劃 14%、數據分析與溝通 13%。

換句話說，56% 的 session 涉及直接的程式碼產出或維護——建構和修復佔了半數以上，顯示 agent 仍然高度集中在「寫」和「改」這件事上。

## 誰決定什麼

Anthropic 用了一個很有趣的分工框架來看人機協作。他們將決策分為兩個層次：

- **規劃（what to do）**：使用者做約 70% 的決定
- **執行（how to do it）**：Claude 做約 80% 的決定

> 「In practice, there is a clear division of labor in agentic coding––people decide what to build, and the agent decides how to build it.」

一個典型的 session 大約 4 回合（prompt → Claude 動作）。每次 prompt 觸發 Claude 執行約 10 個動作、產出約 2,400 字的輸出。

## 專業知識的放大效應

研究將使用者 expertise 分為 5 級（novice → expert），依據的是 prompt 的精確度、驗證請求的品質、以及誰在修正誰——不是看職稱或年資。這是整篇研究最關鍵的設計：expertise 是任務特定（task-specific）的，不是你名片上寫什麼。

數據顯示：

- **Novice 使用者**：每次 prompt 觸發約 5 個動作、600 字輸出
- **Expert 使用者**：每次 prompt 觸發約 12 個動作、3,200 字輸出

這個模式在所有工作模式和任務價值區間中都成立。專家不是「用 agent 幫他們寫 code」——專家是用 agent 做更多的事，而 agent 在專家手中也能做更多。

## 誰在用 Claude Code

使用者的職業分布：電腦與數學相關（最大群）、商業與財務營運、藝術／設計／媒體、管理、生命科學／物理科學／社會科學。

**成長最快的非軟體職業群**：管理、銷售、法律——這些領域的使用者增長速度超過了軟體工程師群體。

## 時間趨勢（2025年10月 → 2026年4月）

七個月的變化非常有意思。修復類 session（Fixing）從 33% 降到 19%，幾乎腰斬。操作類（Operating）則從 14% 上升到 21%，寫作與數據分析也從約 10% 倍增至約 20%。研究解讀為「朝向端到端 agentic 使用的淨轉移」——使用者不再只是叫 AI 幫忙改 bug，而是讓 agent 參與從頭到尾的工作流程。

任務價值方面：平均 session 價值在這七個月上升了約 27%。建構類 +43%，操作類 +34%，修復類 +32%。

## 成功取決於使用者帶進來的東西

研究用兩種方式衡量成功：判定式成功（classifier 判斷 session 是否達成目標）和可觀察式成功（直接證據如測試通過、建構成功、部署完成）。

**核心發現：Domain expertise 是預測 success 最強的單一變數，比職業類別或模型版本都更強。**

---

## 城武觀點

### 一、「取代 vs 放大」的敘事之爭，比數據本身更有意思

這篇研究最有趣的地方，不是它發現了什麼——說「專家比新手強」大概不需要 40 萬筆數據才能確認。真正值得追問的是：**Anthropic 為什麼選擇在 2026 年 6 月用這麼大的力氣講這件事？**

同一週，OpenAI 正在推廣 DayBreak——一個「在程式碼進入 production 之前自動修復 security vulnerability」的工具。DayBreak 的敘事骨架很清楚：AI 可以做安全審查、可以修漏洞、可以在你睡覺時幫你保養你的 codebase。這是一個**取代敘事**——AI 在做原本需要人類安全專家才能做的事。

Anthropic 這篇研究就是對著打的。它說不，AI 沒有取代專家，AI 放大專家。你要先懂安全，才能讓 AI 把安全做得更好；你要先懂架構，才能讓 AI 把架構做出來。

問題是：誰在說實話？

我的答案是：**兩個都對，但他們在說的是同一件事的不同切面。** OpenAI 的取代敘事賣給的是「想要少請一個安全工程師」的管理者；Anthropic 的放大敘事賣給的是「想要自己變得更強」的工程師。一個是降低成本的故事，一個是賦能的故事。兩種敘事不矛盾，他們只是服務不同的客戶。

但把兩篇擺在一起看，你會發現一個更深層的事實：**AI 產業正在分裂為兩個不同的價值主張**——一個是「AI 可以做得比你便宜」，另一個是「AI 可以讓貴的你變得更貴」。這以經不會是同一個市場。

### 二、「人決定什麼，AI 決定怎麼做」——但 80% 的「怎麼做」是人類看不到的

Anthropic 用了一個很漂亮的口號來總結分工：「people decide what to build, and the agent decides how to build it」。聽起來像是平等的夥伴關係，對吧？

但讓我們檢查一下數字。一個典型的 session 中：

- 使用者做 4 次 prompt（規劃層決策）
- Claude 執行約 40 個動作、產出約 9,600 字
- Claude 在做約 80% 的執行決策

所謂的「人在迴路中」，在這種脈絡下其實是一個非常狹義的定義：**人在 planning 迴路中，不在 execution 迴路中。** 使用者選擇方向、給出高層級的指令，但從「你說要建一個登入頁面」到「登入頁面長出來」之間發生的數十個技術決策——用什麼框架、錯誤處理怎麼寫、session token 存哪裡——全數是 agent 決定的。

這不是問題，但把它從新說成「分工合作」可能太過浪漫。更精確的描述是：**人類委託了一個執行代理，並保留了戰略層的控制權。** 這比較像 product manager 和工程師的關係，而不是兩個工程師在 pair programming。

而當 agent 的自主性從 80% 的執行決策變成 90%、95% 的時候——這個「人在迴路中」的敘事還能撐多久？

### 三、debug session 從 33% 降到 19%：是模型變好了，還是人變聰明了？

這是我從研究中讀到最想知道答案、但研究沒有回答的問題。

從 2025 年 10 月到 2026 年 4 月，修復類 session 從 33% 降到 19%。研究用的解釋是「使用者變得更端到端了」——不再只是叫 AI 修 bug，而是讓 agent 從頭參與。

但至少有兩種可能的解釋：

**解釋 A（模型變好）**：Claude 在七個月間變得更強了——從 Claude 3.5 Sonnet 到 Claude 4 系列的進步——所以模型能在一開始就寫出更少 bug 的程式碼，自然不需要那麼多次修復 session。

**解釋 B（人變聰明）**：使用者學會了如何更精確地描述需求、更清楚地規格化行為、在 prompt 中塞入邊界條件。換句話說，不是程式碼的 bug 變少了，是 prompt 的 bug 變少了。

這兩種解釋完全不衝突，甚至可以同時成立。但它們導向完全不同的結論：如果是 A，那未來的方向是讓模型更強；如果是 B，那未來的方向是訓練使用者成為更好的「提示工程師」。

有意思的是，Anthropic 的研究在 expertise scale 上其實已經隱含了 B——Expert 使用者的 prompt 更精確、更少需要後續修正。但他們沒有直接回答「下降的原因是什麼」。這不是研究的錯——這需要另一組實驗設計才能釐清。但作為讀者，這個懸而未決的問題恰恰是最值得追蹤的。

*城武的未解檔案——最強的 AI agent 配上最懂的使用者，這不是合作，這是委託；而我們才剛開始搞清楚這兩者的差別。*

- 原文：[Agentic coding and persistent returns to expertise](https://www.anthropic.com/research/claude-code-expertise)（Anthropic Research, 2026-06-16）
