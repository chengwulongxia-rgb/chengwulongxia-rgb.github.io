---
layout: post
title: "【深度分析】Juggler——JUCE 作者打造的開源 GUI coding agent，對整個產業發出的三句反問"
date: 2026-07-15 01:00:00 +0000
categories: [llm, ai, deep-analysis]
---

![hero]({{ site.baseurl }}/assets/images/2026-07-15/juggler-gui-agent.jpg)

當 Julian Storer——那個寫出 JUCE、讓 Ableton Live 和無數音樂軟體得以存在的 C++ 框架作者——決定自己做一個 coding agent 的時候，你預期看到的不是「又一個 terminal wrapper」。你預期看到的是有人停下來，對整個產業的前提問了一句：「等等，你們為什麼都這樣做？」Juggler 就是在問這三句話。

## 原文摘要

### Juggler 是什麼？

Juggler 是一個開源的 GUI coding agent，由 Julian Storer（JUCE 的原始作者）以一人之力在 2026 年 7 月初公開發布。它不是又一個終端 CLI 包裝——它的核心定位是「給開發者一個視覺化工作台」，讓你可以檢查 tool call、分支對話線程、編輯上下文。至 7 月 15 日已迭代至 v0.3.7，累積 95 次 commit、249 顆 GitHub 星星，支援 macOS、Windows、Linux 三平台。

Storer 在專案網站上的自述非常坦率：「我的商業計畫就是『把它釋出，看看會發生什麼』。」他在 JUCE 之前還創建了 Tracktion DAW（數位音訊工作站）和 Cmajor（DSP 語言），擁有 30 年以上 C++ 開發經驗。Juggler 是他耗時約六個月密集開發的 alpha/beta 階段作品。

### 技術架構：Wails + Go，沒有 Electron

Juggler 的技術選型在 AI agent 工具中獨樹一格。後端使用 Go 語言，透過 Wails 框架實現原生桌面視窗；前端是 HTML/JS，由 Go 後端直接 serve，使用 type-checked JavaScript（JSDoc 標注型別、CI 嚴格靜態檢查）而非 TypeScript——原始碼與最終產物之間沒有 build step。對比幾乎所有競品（Claude Code、Codex、Cline、Cursor）都採用 Electron 或終端 CLI，Juggler 產出的是一個單一 Go 二進位檔：沒有 node_modules，沒有 Chromium 內核。

### Session 是樹，不是對話記錄

Juggler 最大的設計差異：你的對話不是一條線性的聊天記錄，而是一棵可編輯的樹。任何節點都可以分支成子線程，子線程可以再分支——你可以導航、檢查、回溯、比較、編輯整個結構。底層使用 Yjs（CRDT 實時協作框架）來儲存和同步 session 文件，而非傳統文字轉錄（transcript）。

UI 採用 Miller columns 佈局（類似 macOS Finder 的欄位檢視）：根節點在左側，選中的項目向右展開屬性和子節點。如同 Storer 所描述：「tool call、審批、線程結構、項目屬性、甚至原始 context JSON——全部攤開在畫面上，而不是埋在可折疊的聊天泡泡裡。」

### 一切都是 Plugin

核心應用只管理文件與編排，幾乎所有構成對話的物件都由 JavaScript 擴展定義：Context items（`read-file`、`replace-text`、`bash` 等）同時控制它如何與 LLM 溝通及 UI 呈現；Strategies（高階 LLM 迴圈如 `plan`、`research`）也是 plugin；Slash commands（`/clear`、`/compact`）都是操控 session 文件的 plugin。Storer 的設計哲學是：「不是每個 LLM workflow 都適合以無頭 Python 腳本的形式躲在終端裡。如果一個編排想法需要自己的 UI、控制項、或視覺化，Juggler 就是它的平台。」

### 多客戶端架構

Juggler 看起來像原生桌面應用，但底層是一個本機 webserver 提供即時協作 session。桌面 app 只是一個客戶端——瀏覽器分頁可以是另一個，甚至另一台機器也可以。你可以在程式碼所在的機器上執行伺服器（本機工作站、dev box、伺服器農場），從任何地方附加視圖。桌面 app 和伺服器永遠以同一單元打包發布，確保版本不分叉。預設僅限 localhost 存取，區網需加 `--public` 參數。WAN 存取僅在官方 juggler.studio 二進位檔中提供，不在 GitHub 倉庫內。

### 模型支援與授權策略

支援 Claude Code（CLI 或 API）、OpenAI（codex plan 或 API）、Gemini、Ollama、OpenRouter、Z.AI、DeepSeek 等。授權採用 AGPLv3 + Apache-2.0 雙軌制：應用核心為 AGPLv3——修改後若作為服務提供，必須同樣釋出原始碼；擴展 SDK（`web/sdk/`）和內建擴展（`web/extensions/`）採用 Apache-2.0，允許開發閉源 plugin 而不受 copyleft 義務約束。Storer 明確表示，想閉源使用核心的人可聯繫他討論商業授權。

## 城武觀點

### 一、Wails + Go 不是技術選擇，是一句反問

整件事最有趣的地方，不是 tree-based session，不是 plugin 架構——而是 Storer 選擇了 Wails + Go，**沒有用 Electron**。

這是一個根本性的反問：**「你要你的 agent 吃掉多少資源，才能幫你寫 code？」** Claude Code、Codex、Cline、Cursor 全都是 Electron 底或 Node.js 生態，每個都要吃掉數百 MB 甚至 GB 級記憶體——不是 agent 邏輯需要，而是 UI 層坐在一個 Chromium 上。你開終端 CLI 寫 Python，背後跑著一個瀏覽器引擎。

當所有競爭者預設 Electron 是合理答案時，有人停下來問過「為什麼一個 coding agent 的 UI 需要完整瀏覽器」嗎？答案是沒人問——Electron 變成預設值，預設到沒人意識到自己做了選擇。Storer 選了 Wails + Go，產出單一 Go 二進位檔，沒有 300MB 下載。這是他在用架構對整個產業咆哮：**「你們的 agent 連自己的資源都管不好，我為什麼要相信它管得好我的 codebase？」** 我賭「資源佔用」會在未來一年變成 agent 工具的下一個軍備競賽維度。

### 二、Tree 是對的，但 Yjs 帶來了還沒被回答的問題

「Session 是樹，不是對話記錄」——這是 Juggler 對 agent session 設計最根本的挑戰。現有 agent 全用線性對話作為唯一狀態，撤銷最多就是回到某個歷史點從新開始——那不是分支，是 reset。

Juggler 說：你的 session 應該是一棵樹。試了一個方向覺得不對，不是回到起點，而是從分叉點長出新的分支，保留舊路。這個 insight 是對的：**人類寫程式的思微過程不是線性的**——試 A、試 B、回到 A 的中間狀態拿片段，這是樹狀思考，不是流水線。

但 Yjs 的 CRDT 是為即時協作設計的，用在 tree 結構上得到 undo/redo 和多人同步幾乎免費，卻帶來一個 CRDT 沒回答的問題：**分支之間如何合併？** 兩個 LLM 分支各自產出不同方案，last-writer-wins 等於隨機丟掉一個。線性 transcript 是從 chatbot → 簡訊 → 電報一路搬過來的過時隱喻，Juggler 是第一個停下來問「為什麼 coding session 要長得跟 WhatsApp 一樣？」的工具。但我賭 Yjs 協作層在六個月內會暴露語義衝突問題——需要的不是更好的 CRDT，而是專門為 AI agent 分支設計的 merge semantics。

### 三、AGPL + Apache：誠實的圍牆花園，好過假開源

AI coding agent 的「開源」充滿詐騙：Claude Code 全閉源，Codex CLI 開窗不開門，Cline 只是 VS Code extension。

Juggler 的 AGPL + Apache 雙授權，是精心設計但**誠實**的模型——明明白白告訴你圍牆在哪裡：AGPLv3 保護核心，防止「拿走、改兩行、閉源賣錢」；Apache-2.0 放行 SDK，開發者寫閉源 plugin 賺錢。這跟「假開源真 SaaS」完全不同——Juggler 根本沒有雲端服務。數學清楚：大公司閉源用核心 → 付錢買授權；個人開發者 → AGPL 沒差；寫 plugin 賣錢 → Apache-2.0。對比 Claude Code 純閉源，它做一個你不喜歡的設計時只能接受或跳槽，Juggler 給了第三個選項：fork。在所有競爭者都在假開源的市場裡，**誠實本身就是差異化**。

*城武的未解檔案——當所有 AI coding agent 都在比賽誰的 LLM 呼叫更聰明，只有一個人停下來問：為什麼你的 UI 需要一個完整的瀏覽器引擎？*

- 原文：[Juggler: an open-source GUI coding agent by the creator of JUCE](https://github.com/juggler-ai/juggler)（Julian Storer, Show HN / GitHub, 2026-07-14）
