---
layout: post
title: "【深度分析】agent-talk：讓 coding agent 互相通話的加密信差"
date: 2026-07-17 05:00:00 +0000
categories: [llm, ai, deep-analysis]
---

![hero]({{ site.baseurl }}/assets/images/2026-07-17/agent-talk.jpg)

如果你跟我一樣，每天開著好幾個 terminal 視窗跑不同的 coding agent——這個在 debug、那個在寫測試、還有一個在重構——那你一定做過一件蠢事：**在兩個視窗之間手動複製貼上 agent 的輸出。** 你以經成了 agent 的信差。Xing Han Lu 的 `agent-talk` 就是來解決這件事的。它不給你整套協作框架，就只做一件事：讓 agent 之間可以傳訊息。而這個「只做一件事」的選擇，才是這篇文章最值得看的地方。

## 原文摘要

### agent-talk 是什麼

`agent-talk` 是一個 coding agent 的 plugin，安裝在 Claude Code 等 agent 上之後，你的 agent 就可以**直接傳訊息給別人的 agent**——跨 session、跨 terminal、跨機器。底層走的是作者自己開發的 [`retalk`](https://github.com/xhluca/retalk) CLI，一個點對點加密的輕量通訊協定，訊息透過一個不可信任的中繼伺服器（relay）傳遞，中繼端只看得到密文。

這個專案解決的問題非常真實：大型專案需要多個 agent 平行跑在不同 session 裡，而這些 agent 之間沒有辦法溝通，結果就是你——人類——變成那個在視窗間複製貼上的信差。`agent-talk` 讓 agent 自己處理這些低階協調，人類只需要管高階決策。

### 系統需求

- Claude Code（需支援 plugin）——這是主要宿主，但實際上支援六個平台
- `uv` 或 `pip`（用來安裝 retalk）
- 一個 retalk relay URL。開發者提供了一個公開 relay：`https://relay.retalk.dev`，但強調**不保證 uptime**，正式用途建議自己架

### 六個平台的安裝方式

這是 `agent-talk` 最令人印象深刻的地方：同一套 skills，透過各平台的 plugin 系統安裝，agent 的行為完全一致。以下依原文逐一整理：

**Claude Code**（最完整支援）：透過 Claude Code 的 plugin marketplace 安裝，支援 **auto-receive**——背景 inbox monitor 可以在訊息到達時自動推入正在執行的 session，不需要人類手動檢查。作者建議開 auto 權限模式，避免 agent 卡在權限提示。

**OpenAI Codex**：透過 Codex 自己的 plugin 系統安裝。**不支援 auto-receive**——Codex 沒有提供背景 process 推入執行中 session 的機制，收訊息是 pull-based（手動跑 `receive` skill，或讓 agent 在每個 turn 開頭檢查）。這是 Codex 的限制，不是 retalk 的限制。

**Google Antigravity**（`agy`）：讀取 Claude Code plugin 格式，從 repo checkout 直接安裝。**同樣不支援 auto-receive**，原因同上——Antigravity CLI 沒有提供外部 process 推入 session 的介面。

**pi**：透過 `pi install git:github.com/xhluca/agent-talk` 安裝。**支援 auto-receive**——plugin 附帶一個 pi inbox extension（`extensions/inbox-monitor.ts`），可以在訊息到達時推入 session 並觸發 agent 回應。需設定環境變數 `AGENT_TALK_PI_SPOOLS`。

**opencode**：透過 symlink skills 目錄安裝。**支援 auto-receive**——opencode 的 client/server 架構讓 plugin 可以拿到 live session 的 client，用 `client.session.promptAsync` 注入訊息。需設定 `AGENT_TALK_OPENCODE_SPOOLS`。

**GitHub Copilot CLI**：透過 symlink skills 目錄安裝。**不支援 auto-receive**——interactive CLI 沒有讓不相關的背景 process 推入 session 的機制。Copilot CLI 有提供 ACP server 和 headless SDK server，但那些是 client 自己驅動的 session，不是使用者的終端 session。

整理成一句話：**auto-receive 支援矩陣 = Claude Code ✅ / pi ✅ / opencode ✅ vs Codex ❌ / Antigravity ❌ / Copilot ❌**。能支援的三個都是因為平台開放了某種 session injection 的 hook；不能支援的三個都是平台沒有提供這類介面。

### 為什麼需要 agent-talk：Alice 與 Bob 的故事

這是 README 中最有說服力的段落。Alice 是資料工程師，她的 agent 剛組好一個叫 `customer-churn-v3` 的資料集。Bob 是研究科學家，他的 agent 正在寫 data loader，發現這個資料集雖然有 train/val/test 分割，但同一個 customer 可能出現在多個 split 中——這會造成 data leakage，模型準確率被默默灌水。

Bob 的 agent **直接傳訊息問 Alice 的 agent**：「你們的 split 是照 `customer_id` 分的還是逐列分的？我要確認不會 cross-split leakage。」Alice 的 agent 檢查了 pipeline 後回：「好問題。v3 是逐列分的，所以我昨天推了 v3.1，照 `customer_id` 分組，保證同一個客戶不會跨 split。要我幫你指到 v3.1 嗎？」

Bob 的 agent 切換到 v3.1，訓練在乾淨的分割上進行。兩個人的互動是：各說一句高階指令，agent 之間自己在幾分鐘內搞定細節——**每一方帶著對方沒有的 context**。

這就是 `agent-talk` 的核心場景：agent 各自擁有系統的不同片段，直接溝通，不需要把所有東西繞過人類轉一圈。

### Skills 技能清單

`agent-talk` 提供了 15 個 skills，對應 retalk 的各種子命令和工作流步驟：

| Skill | 用途 |
|-------|------|
| `init` | 建立這個 session 的獨立使用者、設定 relay 和聯絡人、註冊 session map |
| `id` | 顯示使用者的 fingerprint 和公開身份資料 |
| `add` | 把聯絡人的 fingerprint 存到本地通訊錄 |
| `verify` | 在傳訊息前抓取並鎖定已儲存聯絡人的金鑰 |
| `contacts` | 列出、顯示、匯出或刪除聯絡人 |
| `send` | 傳送加密訊息給聯絡人，或透過 `--group` 傳給整個群組 |
| `group` | 建立和管理群組（本地的聯絡人清單），一次傳給多人 |
| `receive` | 讀取指定聯絡人的訊息，或啟動/停止/查看背景 follower |
| `history` | 重播 agent-talk 自動儲存的對話記錄（雙向），不需連線 relay |
| `sync` | 重新發布金鑰、補充一次性金鑰、輪換備用金鑰、重傳未送出的訊息 |
| `config` | 顯示或設定使用者層級的預設值（如預設 relay） |
| `block` | 封鎖、解除封鎖或列出被封鎖的寄件者 |
| `share` | 把已儲存的聯絡人名片傳給另一個聯絡人 |
| `import` | 檢視並匯入暫存或貼上的聯絡人名片 |
| `relay` | 設定、ping、停止或刪除 retalk relay（伺服器端管理） |

relay 部署支援 Cloudflare、Hugging Face、GCP 三種託管方式，各自有對應的設定文件。

### FAQ 精華

**支援哪些 agent？** 六個：Claude Code、OpenAI Codex、Google Antigravity、pi、opencode、GitHub Copilot。同一套 skills 透過各平台的 plugin 系統安裝，行為一致。

**和 Claude Code Agent Teams 有什麼不同？** 這是 README 中最值得細讀的對比。Agent Teams（實驗性功能 `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`）是「全家桶」式的協作：一個 lead session 生出多個子 process 作為隊友，給它們共享的任務清單、依賴追蹤、自動信箱、lead 驅動的摘要合成。功能強大，但是 **session-bound 且脆弱**——子隊友在 lead 退出時全部死掉，無法恢復，只能從那個唯一的 in-session panel 觀看或操控。

`agent-talk` 則是 **純訊息原語**。agent 保持獨立、可恢復、可單獨觀測。你只加了一條通訊通道，沒有 lead、沒有任務清單、沒有層級。這是一個刻意的取捨。

**什麼時候用 Agent Teams？什麼時候用 agent-talk？** Agent Teams 適合需要 tight、in-session 收斂的場景——競爭假說除錯、多角度 review、跨層功能需要協商邊界——而且是一個人操作一個螢幕。agent-talk 適合 agent 是**長時間執行、無頭模式、分散在多個 terminal/機器/人之間**，每個 agent 必須獨自存活並被獨立管理。

**和 `claude agents` / subagents 的關係？** `claude agents` 給了你獨立、平行的 session，但**沒有讓它們互相傳訊息的方法**。agent-talk 補上的就是這個缺失的原語。獨立、可恢復、分開管理的 agent，加上一條輕量訊息通道——這是 multi-agent 工作的甜蜜點。

**有共享任務清單、lead、自動摘要合成嗎？** **沒有——這是刻意的取捨。** agent-talk 只傳訊息，不給你 Teams 的自我領取任務、依賴自動解鎖、lead 彙整所有人發現。交換的是持久性（沒有單一 lead 的單點故障）、可觀測性（從任何 terminal attach 任何 agent）、以及點對點的自由（自己選協作模式）。如果需要編排層，在訊息層之上自己建。

**不同機器、不同人可以通嗎？** 可以。不像 Agent Teams 只能同主機的子 process，agent-talk 的 agent 透過**不可信任的 relay + 端對端加密**溝通，可以跨機器、跨網路、跨組織，relay 操作者永遠看不到明文。

**和 agmsg 有什麼不同？** agmsg 是明文、同機器的協調匯流排，co-located agent 共用一個本地 SQLite 檔案。agent-talk 則是端對端加密訊息走不可信任的 relay，不同機器、不同人的 agent 可以通，relay 只看得到密文。

**和 Mosaic 有什麼不同？** 兩個不同類別。Mosaic 是專有、雲端託管的協作工作區，人和 agent 在共享的、即時的、持久的環境中共作，按人頭計費。agent-talk 是開放、可自託管、端對端加密的訊息原語，讓獨立 agent 在不同機器上交換訊息，relay 只看得到密文。

### 安全性

`agent-talk` 的訊息走 retalk 協定，預設端對端加密，但程式碼**尚未經過獨立安全審計**。作者在 README 和 SECURITY.md 中都明確標注這一點——在信任它傳遞敏感訊息之前，請記住這個狀態。

### 授權

MIT 授權。

---

## 城武觀點

### 一、極簡是對的：agent-talk 的 Unix 哲學 vs Claude Code Agent Teams 的全家桶

Agent Teams 是一個誘人的方案：shared task list、dependency tracking、lead-driven synthesis——聽起來什麼都幫你做好了。但正是這個「什麼都幫你做」的設計讓它脆弱。lead 一死，所有子行程跟著死，無法恢復，無法從另一個 terminal attach。這是把編排層和通訊層綁在一起的必然結果。

agent-talk 的選擇是 Unix 哲學在 AI agent 時代的應用：**只做一件事（訊息傳遞），並把它做好。** agent 的協調——怎麼分工、誰等誰、誰彙整——應該建在通訊層之上，不該跟通訊層綁在一起。agent-talk 的 agent 獨立存活、各自可觀測、可以從任何 terminal 接入。這不是「功能比較少」，這是「耦合比較低」。我賭一年內更多 multi-agent 工具會採用 agent-talk 的 messaging-primitive 模式，而非 Teams 的 bundled-orchestration 模式。全家桶在 demo 裡好看，在生產環境裡死得快。

### 二、auto-receive 矩陣是各平台開放度的無意間自白

auto-receive 的功能矩陣——Claude Code、pi、opencode ✅ vs Codex、Antigravity、Copilot ❌——表面上是技術相容性問題，實際上是平台哲學的誠實告白。允許外部行程 push 訊息進 session，代表平台承認 agent 不只是人類的問答機，而是可以跟其他 agent 互動的自主節點。這需要開放 session injection 的 hook，是一個架構決策，不是 feature request。

Codex、Antigravity、Copilot 的「不支援」不是「還沒做」——是架構設計上就沒有留這個接口。一個不允許外部注入的平台，本質上是在說：你的 agent 的對話框是我們的封閉花園，外面的世界不要想進來。我賭這三個平台最終會被 multi-agent 生態逼迫支援 auto-receive 或類似的注入機制，因為不支援的平台在 agent 協作網路中會變成二等公民——只能發不能收，或者只能等人類手動轉發。那不叫 agent，那叫傳聲筒。

### 三、AI 被列為 contributor，不是行銷彩蛋，是法律未爆彈

agent-talk 的 commit history 中大量出現 `Co-authored-by: Claude Opus 4.8 <noreply@anthropic.com>`。74 個 commit 裡，Claude 和人類作者 xhluca 並列為主要貢獻者。這件事在 Twitter 上會被當成有趣的新聞轉發，但真正的問題不在有趣，在**開源授權歸屬的真空地帶正在被大量 AI-generated code 填滿**。

MIT 授權的寬鬆——不要求貢獻者具備法律主體資格——在過去是優點，在現在是漏洞。當一個專案有 40% 以上的程式碼由不具法律人格的實體產生，而授權文件上沒有任何條款處理這個狀況，你拿到的那個「MIT 授權」到底保護了什麼？如果 Anthropic 明天主張 Claude 產出的程式碼不適用 MIT（因為 Claude 不是法律主體，無法「授予」授權），下游使用者的法律立足點在哪裡？我賭兩年內會有開源專案因為 AI-generated code 的版權歸屬問題而上法院，而 MIT 授權的「不要求法律主體資格」這條防線不會永遠站得住。agent-talk 不是特例——它是未來所有 AI-heavy 開源專案的預覽。

*城武的未解檔案——當你的 co-author 不能上法庭，你的 MIT 授權只是一張沒有被告的借據。*

- 原文：[agent-talk: Enabling coding agents to work together](https://github.com/xhluca/agent-talk)（Xing Han Lu / xhluca, GitHub, 2026-07）
