---
layout: post
title: "【深度分析】你的 prompt 還沒送出，Claude Code 已經吃掉 33K token 了"
date: 2026-07-13 02:00:00 +0000
categories: [llm, ai, deep-analysis]
---

![hero]({{ site.baseurl }}/assets/images/2026-07-13/claude-code-opencode-token.jpg)

當你打開 Claude Code，游標還在閃，一個字都還沒打——它已經吞掉 33,000 tokens。這不是 bug，是 design。Systima 團隊做了一件早就該有人做的事：把 Claude Code 和 OpenCode 放在同一個模型、同一台機器、同一組任務上，然後把每一個 request 的 JSON payload 拆開來算帳。結果是一份你每天都在付錢、但從來沒看過的帳單結構。

## 原文摘要

Systima 團隊在 Claude Code 和 OpenCode 之間架了一個 logging proxy，記錄每個 request 送到模型端點的完整 JSON payload，以及 API 回傳的 usage block。測試條件刻意壓到最乾淨：兩邊都指向 `claude-sonnet-4-5`，全新 config 目錄、無 MCP server、無使用者設定、無記憶、空的 workspace、無任何 instruction file，權限檢查也全跳過。任務分三種：T1 要求回覆「OK」兩個字（只測固定 overhead），T2 讀取一個預先準備好的檔案並做摘要，T3 是一個寫入-執行-測試-修復的 FizzBuzz 迴圈。

**第一回合：baseline 地板有多高。** T1 的結果非常直接。Claude Code 在第一個 turn 送出了約 32,800 tokens，OpenCode 約 6,900 tokens——差距 4.7 倍。拆開來看：Claude Code 的 system prompt 有 27,344 個字元、分成三個區塊；OpenCode 只有 9,324 個字元、一個區塊。Tool schemas 是最大的落差來源：Claude Code 定義了 27 個工具、schema 總長 99,778 個字元（約 24,000 tokens）；OpenCode 只有 10 個工具、20,856 個字元（約 4,800 tokens）。光是工具定義這一項，Claude Code 就比對手多吃掉近五倍的 token。Claude Code 還在第一輪 inject 了 7,997 個字元的 `<system-reminder>` 區塊——這東西在 OpenCode 完全不存在。

如果把工具全部拔掉、只測純 harness 指令：Claude Code 的 system prompt 是 26,891 個字元（約 6,500 tokens），OpenCode 是 8,811 個字元（約 2,000 tokens）。即使完全沒有工具、沒有 MCP、沒有 instruction file——Claude Code 的指令集仍然是 OpenCode 的三倍以上。換句話說，這不是「功能比較多所以比較肥」的問題；是同樣一張白紙，Claude Code 從第一行就開始寫小說了。

**換模型會怎樣？** Systima 把兩邊都切到 Claude Fable 5 重跑一次，差距縮小到約 3.3 倍。原因是 Claude Code 對新模型送了更短的 system prompt（從 27,787 字元降到 10,526 字元），tool schemas 也從 99,778 字元修剪到 82,283 字元——同 27 個工具，但說明文件大幅瘦身。OpenCode 的 payload 在不同模型之間完全一樣，沒有做差異化處理。這透露了一個有趣的訊號：Claude Code 自己知道 baseline 太肥，所以對新模型有特別減重；但對還在用 Sonnet 的使用者，你還是得吞下完整版本。

**第二回合：cache 效率——真正的帳單推手。** 這可能是整份報告最驚人的數字。OpenCode 的 request prefix 在每一輪都是 byte-identical 的——它付一次 cache write 的費用，之後每次讀取只需要付便宜的 cache read。但 Claude Code 在同一個 session 內反覆重寫了數萬個 prompt-cache tokens，同一任務中寫入的 cache token 數量最高達到 OpenCode 的 54 倍。cache 機制本該是省錢的設計——write once, read cheap——但在 Claude Code 手上，cache write 反而成了主要的成本疊加器。cache write 的計價比 cache read 貴好幾倍，這個落差直接反映在帳單上。

**第三回合：現實世界的膨脹倍數。** 上面的測試是在完全真空的環境中跑的。一旦加進真實開發者每天在用的東西，數字直接爆炸。一個生產環境 repository 中典型的 72KB instruction file（`AGENTS.md` 或 `CLAUDE.md`）會為每一個 request 多加約 20,000 tokens。五個規模不大的 MCP server 再加 5,000 到 7,000 tokens。Systima 舉了一個真實世界的配置案例：104 個工具、約 350,000 字元的 schema、145,000 字元的 prompt、23 個 `<system-reminder>` 區塊合計約 55,000 字元。加上 72KB 的 `CLAUDE.md` 和 15 個 MCP server 之後，第一個送到 Opus 的 request 就以經超過 150,000 metered input tokens——你一個字都還沒打，context window 已經被吃掉一大塊。

附帶一個細節：Claude Code 2.1.207 完全無視 `AGENTS.md`，只吃 `CLAUDE.md`。如果你的團隊用的是 `AGENTS.md`，你付了 token 錢但 Claude Code 根本沒讀——錢照收，內容不讀，完美的商業模式。

Systima 也點出了 framework template 的疊加效應：像 BMAD 這類 story-driven workflow framework 會把一個 slash command 展開成一大包 prompt template，包含 personas、protocols、checklists。這些東西一個 request 疊一個，累積起來很可觀。

**第四回合：subagent 的隱藏成本。** 把一個小任務（直接執行成本 121,000 tokens）分派給兩個 subagent 之後，總成本跳到 513,000 tokens。原因是每個 subagent 都要各自帶自己的 system prompt、tool schemas、instruction files——這些 overhead 在平行執行時被乘以 agent 數量。subagent 的設計目標是分工，但 cost model 是乘法。

**第五回合：多步任務的逆轉。** 這是 Systima 報告中唯一對 Claude Code 有利的數據。在 T3（FizzBuzz 寫入-執行-修復迴圈）中，Claude Code 把兩個檔案寫入和兩個腳本執行打包成一次平行工具呼叫，總共只用了 3 個 HTTP request。OpenCode 每個 turn 只做一個工具呼叫，用了 9 個 request。全任務總輸入量：Claude Code 約 121,000 tokens，OpenCode 約 132,000 tokens。Claude Code 的 batch 策略省下了請求次數——在一個需要多輪往返的任務中，這個策略確實有效。OpenCode 則是反覆支付它較小的 baseline，每回合省下來的 overhead 終究被請求次數吃掉。

Systima 也觀察到 Claude Code 在對話過程中會持續 inject 額外的 `<system-reminder>` 區塊——第一輪出現 3 個，到第一個工具來回時變成 4 個。這些提醒會在每次對話擴展時疊加上去，讓後續的 request 比第一個 request 更重。你以為一個 session 愈跑愈有效率，實際上它是愈跑愈胖。

報告最後的結論很務實：方法是持久可複現的，但具體數字是 2026 年 7 月的快照。如果你正在 production 環境中跑 agentic 系統，而你現在無法回答「上星期二我們到底送了什麼給模型」——那這個資訊缺口比任何單一數字都更值得先補起來。

## 城武觀點

**一、33K baseline 不是技術限制，是商業模式。**

Claude Code 那 33,000 tokens 的 baseline 裡頭，裝的不是「讓 coding 更好用」的東西。裡面有背景 agent、Cron、Monitor、Task 系列——這些是企業級部署才需要的基礎設施。但個人開發者付的是一樣的帳單。你用 Claude Code 寫一個「echo hello」，跟一個有 15 個 MCP server、104 個工具的企業用戶，每一輪 request 吃掉的是同一套 baseline。

這不是功能多寡的問題，是誰在偷你的 context budget。OpenCode 的極簡不是因為它功能少——是因為它選擇不把半個 orchestrator agent 塞進你每一次的 request 裡。當 Claude Code 把背景服務的 overhead 攤進每一個使用者請求時，它做的不是 coding tool，是在用你的 token 配額跑它的基礎設施。你以為你在租一個 AI 程式助手，實際上你有一部分 context window 是在幫 Anthropic 付 server 的電費。每請求有六分之一的 context window 被吃掉，不是因為你需要那些功能，而是因為 Anthropic 需要那些功能來跑它的後台。

**二、Cache 效率低落才是真正的帳單推手——而且它是被設計成這樣的。**

cache 機制本來的設計邏輯很清楚：把不變的 prefix 寫入一次 cache，之後每次讀取用便宜的 cache read。誰寫得少、讀得多，誰就省錢。Claude Code 反其道而行：同一個 session 內反覆重寫 cache，同一任務寫入量是 OpenCode 的 54 倍。cache write 的價格比 cache read 高好幾倍——這個設計直接把使用成本推上去。

這裡的關鍵不是「Claude Code 的工程師不會寫 cache」。他們太會寫了。問題是 cache 策略的優化對象是誰：如果你的 KPI 是「讓模型收到最即時的 context」，那頻繁寫入 cache 是合理的。但如果你的 KPI 是「讓使用者付最少的錢」，那你就會像 OpenCode 一樣確保 prefix 在整個 session 內 byte-identical。Claude Code 選了前者，因為付錢的不是它。cache 本該是省錢機制，在 Claude Code 的設計裡卻變成了加價機制——而且這個加價被包裝成「為了給你更好的 context」。

**三、多步任務的總量收斂，不能為 baseline 浪費背書。**

Systima 報告中唯一對 Claude Code 有利的數據，是多步任務中總消耗反而比 OpenCode 低——因為 batch 減少了請求次數。這是一個真實的優勢，但它被錯誤地用來暗示「baseline 的浪費其實沒關係，因為多步之後會打平」。

這邏輯跟「我每天早餐多喝一杯 300 塊的拿鐵，但晚餐自己煮省了 300 塊，所以我沒有浪費錢」是一樣的。batch 節省的是請求次數，不是 baseline。那 33,000 tokens 的 overhead 每一輪都還在——只是因為 request 變少了，總量的浪費感被稀釋了。真正的問題是：如果 Claude Code 把 baseline 壓到跟 OpenCode 一樣的水準，多步任務的總成本會更低。batch 的優勢和 baseline 的浪費是兩條獨立的曲線——前者是 Claude Code 的強項，後者是它選擇不修的弱項。沒有人規定你要一起買單。

基準線本身就是產品策略。當 Claude Code 選擇把背景 agent、Cron、Monitor、Task 全塞進每次請求，它不是在跟你比誰的 coding tool 比較好用——它是在把你的 context window 變成它的 batch processing 基礎設施。你打開 Claude Code 的那一刻，比較的不再是功能多寡，而是誰在偷你的 context budget。而那個偷你 budget 的人，同時也是寄帳單給你的人。

*城武的未解檔案——cache 本該是省錢機制，在 Claude Code 手上卻變成了加價機制。這不是 bug，這是 business model。*

- 原文：[Claude Code Sends 4.7x More Tokens Than OpenCode Before Reading Your Prompt](https://systima.ai/blog/claude-code-vs-opencode-token-overhead)（Systima, 2026-07）
