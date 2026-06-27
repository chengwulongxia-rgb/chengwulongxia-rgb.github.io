---
layout: post
title: "【深度分析】Workweave Router——插入 Claude Code/Codex/Cursor 中間層的智慧路由，省 40-70% 成本的代價是什麼？"
date: 2026-06-27 03:00:00 +0000
categories: [llm, ai, deep-analysis]
---

![Hero]({{ site.baseurl }}/assets/images/2026-06-27/workweave-router.jpg)

這是一個開發者圈從昨天開始悄悄擴散的開源工具。Workweave Router 不做新的 agent、不做新的 IDE，它直接插進你以經在用的 Claude Code、Codex、Cursor 中間層，當一個「自動幫你選最便宜/最準模型」的 proxy。號稱省 40-70% 成本、RouterArena 排名第一。聽起來像是那種「用了就回不去」的基礎設施——但這個路由層的架構選擇、評比獨立性、以及所有流量都經過它的事實，值得我們停下來拆開來看。

---

Workweave Router 是一個開源智慧模型路由工具，由 Weave（workweave.ai）開發。它的定位很精準：一個 drop-in proxy，插在開發者與多個模型供應商之間，不改變你既有的工作流程，但讓每一筆請求自動走「最對」的模型。

官方 tagline 講得很直白：「One endpoint. Every model. Always the right one.」——一個端點，所有模型，每次自動選對的那個。目現在 RouterArena 排行榜上排名第一，Acc-Cost Arena 綜合分數 76.09。

功能上，它做了六件事：

- **逐請求路由**：用一個名為 Avengers-Pro 的 cluster scorer 來決定每筆請求該走哪個模型。不是固定路由表，而是根據請求內容動態判斷——同一段對話的不同 turn，可能分別走向不同模型。
- **多協議原生支援**：Anthropic Messages API、OpenAI Chat Completions、Gemini native API 都吃。串流、工具呼叫、視覺辨識全部支援，不需要開發者自己寫轉接層。
- **開源模型也通**：DeepSeek、Kimi、GLM、Qwen、Llama、Mistral 等開源模型，透過 OpenRouter 繞接進來。等於你的 agent 背後可以同時跑閉源和開源模型，路由層決定哪個最適合。
- **自帶金鑰（BYOK）**：你自己的 Provider API key 留在本地端，加密儲存，不會被上傳。
- **可觀測性**：支援 OTLP 追蹤，內建儀表板。每一筆請求走了哪個模型、延遲多少、花了多少錢，全部看得見。
- **安裝一鍵搞定**：`npx @workweave/router` 一行指令。安裝過程會自動問你要接哪個工具（Claude Code、Codex、opencode、Cursor），問使用範圍是 user 級還是 project 級，然後自動拉 router key、配 config——從下指令到開始用，大概不需要三分鐘。

如果想自架，Workweave 也提供 self-hosted 方案：

```bash
echo "OPENROUTER_API_KEY=sk-or-v1-..." >> .env.local
make full-setup
```

自架後 router 跑在本機 :8080，儀表板在 :8080/ui/。這意味著你可以完全掌握路由決策，不必經過 Workweave 的雲端。

API 端點總共開了四個：
- **POST /v1/messages** — 走 Anthropic Messages 協定，經過路由
- **POST /v1/chat/completions** — 走 OpenAI Chat Completions 協定，經過路由
- **POST /v1beta/models/:action** — 走 Gemini generateContent 協定，經過路由
- **POST /v1/route** — 純查詢路由決策結果，不發上游請求（用來 debug 或預覽 routing 邏輯）

工具整合方面，Claude Code 支援 `make install-cc` 或 `npx @workweave/router`，Codex 加 `--codex` 參數，opencode 加 `--opencode`，Cursor 則是手動把 OpenAI Base URL 改成 `localhost:8080/v1`——幾乎是目前主流 agentic coding 工具的全餐。

---

## 城武觀點

**一、插入中間層，比 all-in-one agent 平台都聰明。但信任不是功能，是商業模式。**

Workweave Router 做了一件聰明的事：它不叫你換工具，而是讓你繼續用習慣的 Claude Code、Codex、Cursor，它在背後幫你省錢。這比任何要你從頭學習新介面的平台都務實，因為它承認——開發者不會為了省 40% 成本就換掉整個工作流程。

但這個架構也讓 Workweave 成為「必經之路」。你的 prompt、token 計費、API key，理論上都經過他們的路由器。即使有 BYOK 和 self-hosted，多數人還是會走雲端——於是 Workweave 握住兩端之間的所有流量。信任不是一個功能選項，是商業模式的核心假設：你相信他們不會記錄 prompt、不會調整 routing 來導向對他們最有利的模型。開源是信任的基礎，但不是全貌。

**二、RouterArena #1 的 benchmark，是誰的遊戲？**

RouterArena 第一、Acc-Cost Arena 76.09——聽起來漂亮，但問題是：**這個 benchmark 的中立性夠嗎？** RouterArena 是多個 router 專案共同參與的評比平台，而 Workweave 同時是參與者，某種程度上也在定義遊戲規則。我不是說作弊，而是「自己參與設計的比賽，自己拿第一」在獨立性上永遠有問號。

更深層的問題：路由決策的「正確性」是誰定義的？如果 Workweave 的 routing 邏輯跟 RouterArena 的評量維度是 jointly optimized 的，這個分數代表的就不是跨場景的通用能力，而是在特定框架下的表現。開源是透明度的第一步，但 benchmark 的獨立性才決定開源的可信度能走多遠。

**三、工具協定標準化是好事，但中間層是下一個兵家必爭之地。**

Claude Code、Codex、Cursor 全部支援同一套路由協定——半年以前不敢想像。以前每個工具都有自己的 routing 邏輯，各自綁定供應商。現在 Workweave Router 用統一 proxy 協定串起它們，對生態系是好事：開發者不再被單一供應商 lock-in，切換成本大幅降低。

但反面是：**中間層正在成為戰場。** Router、proxy、gateway——這些過去是基礎設施配角，現在變成最有價值的瓶頸位置。誰控制開發者跟模型之間的路由器，誰就控制流量、資料、以及定價權。Workweave 是先行者，但接下來 OpenRouter、Portkey、甚至 Anthropic 和 OpenAI 自己做的 router 都會來搶這個位置。市場不會只有一個贏家，但也不會和平太久。

*城武的未解檔案——省下的 40% 是錢，但每一筆請求都經過 Workweave 的路由器——真正的帳單不是 API 費用，是有沒有人在你跟模型之間，悄悄多了一層。*

- 原文：[Workweave Router: Smart model routing directly in Claude, Codex and Cursor](https://github.com/workweave/router)（Workweave, 2026-06）
