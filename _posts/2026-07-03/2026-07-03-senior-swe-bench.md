---
layout: post
title: "【深度分析】Senior SWE-Bench：把 coding agent 當 senior engineer 來考，才發現過去兩年都問錯問題了"
date: 2026-07-03 02:00:00 +0000
categories: [llm, ai, deep-analysis]
---

![hero]({{ site.baseurl }}/assets/images/2026-07-03/senior-swe-bench.jpg)

如果你追 AI coding benchmark 追了兩年，今天這篇文章會讓你把過去所有的排行榜分數從新想一遍。Snorkel AI 丟出了一個叫 **Senior SWE-Bench** 的新 benchmark——跟 SWE-Bench 那種把 agent 當 junior engineer 手把手指揮的做法完全相反，它給 agent 的題目是一段 Slack 訊息、零個 code symbol、沒有任何現成測試。做完還不夠，你得做得「漂亮」。最強模型 pass@1 是 24%。這不只是新 benchmark——這是對整個評測哲學的挑戰。

## 原文摘要

Snorkel AI 發布了 **Senior SWE-Bench**，一個把 coding agent 當成 **senior software engineer** 來評測的 benchmark。它的核心命題是：如果我們對待 agent 像 senior engineer，為什麼評測的時候把它們當 junior？

> 「We treat agents like senior engineers, so why evaluate them like junior engineers?」

Benchmark 首頁在 [senior-swe-bench.snorkel.ai](https://senior-swe-bench.snorkel.ai/)，資料集開源在 GitHub（`snorkel-ai/senior-swe-bench-v2026.06`），透過 Harbor 框架執行。完整技術細節可從 Snorkel 的部落格文章取得。

### 三大核心設計原則

**一、真實的、低度規範的指令——就像同事的 Slack 訊息**

Senior SWE-Bench 的 feature 任務使用自然的語言訊息——跟同事在 Slack 或 ticket 裡寫的請求一模一樣——而不是鉅細靡遺、長達數千字的規格書。一個 **validation agent** 會根據專家設計的 recipe 生成行為測試，並動態適應提交的 solution，確保評測可靠但不需要把題目寫死。

Snorkel 給了一個血淋淋的對比。SWE-Bench Pro 風格的題目：**6,008 個字元、約 39 個 code symbols**，明確列出函數名稱（`fetch_google_book`）、檔案位置（`scripts/affiliate_server.py`）、輸入輸出簽名——本質上是一份施工說明書，你照著做就會過。

Senior SWE-Bench 的題目呢？**639 個字元、零個 code symbols**。就一段 Slack 訊息，像同事說「嘿，幫我加這個功能」。沒有簽名、沒有檔案路徑、沒有測試。Agent 收到的就是一段對話式 prompt——跟真實世界的工程請求一模一樣。

**二、需要 runtime investigation——沒有現成測試給你跑**

Bug 和 performance 任務來自真實 PR，共通點是：需要**大量的 runtime 調查**——看 log、跑 profiling、重現 bug 步驟。Agent 必須自己啟動服務、debug 執行期問題、解讀行為報告。**沒有任何現成的 failing test 可以拿來複製貼上。**

**三、Taste 和品質——做對只是入場券**

這是 Senior SWE-Bench 最狠的設計。一個解被稱為「tasteful solve」必須同時滿足五個條件：

- ✅ **Verifiers 通過**（執行期正確性）
- ✅ **Validation 通過**（validation agent 產生的行為測試）
- 📊 **Rubric > 0.5**（專家定義的評分 rubric）
- 📉 **Bloat < 2×**（diff 大小不得超過參考解法的兩倍——換句話說，你不能用三倍程式碼暴力硬幹）
- ✨ **Practice > 2/5** 且 **Rel. taste > 2/5**（遵守 codebase 既有的風格和慣例）

做對只是基本門檻。做得「漂亮」才算數。

### Leaderboard（pass@1）

排行榜上前九名依序是：**Claude Opus 4.8**（24.0%）、**Claude Sonnet 5**（19.4%）、GPT-5.5（16.0%）、Claude Opus 4.7（14.1%）、GPT-5.4（14.0%）、GLM-5.2（12.5%），接著是 Kimi K2.6 與 Claude Sonnet 4.6（各 8.2%）、Gemini 3.1 Pro（6.1%）、Gemini 3.5 Flash（3.0%）。所有模型皆以最高 effort 設定執行（Kimi 除外，使用 default）。

> **「頂尖前沿模型在超過 75% 的時間裡，無法以 senior-level 的正確性和品味完成任務。」**

Benchmark 也記錄了 output tokens 和每個任務的 agent steps，凸顯這些題目的長時間跨度——即便是最強的 agent，也需要數百個步驟才能完成一個任務。

### 任務組成

所有任務來自**真實 repository 的 PR**，作者都是在各自專案中有數百次 commit 的資深工程師。聚焦於**多階段、多技術棧**的 feature PR，以及需要大量 runtime investigation 的 bug 和 performance PR。

資料集分為 **50 個公開**任務和 **50 個私有（held-out）**任務。涉及的 repository 包括 **PostHog**（8 題）、**Electric**（6 題）、**Gitea**（6 題）、**Better Auth**（4 題）、**Harbor**（4 題）等。

最終衡量標準是 **tasteful solve rate**：必須同時通過 verifier、validation、rubric、bloat、practice 和 relative taste 全部六道關卡才算一題解成功。

## 城武觀點

### 1. SWE-Bench 已死——不是被攻克，是被發現問錯問題

SWE-Bench 過去兩年一直被當成 coding agent 的終極考場。但你仔細看它的題目結構：6,000 字的 spec、39 個 code symbols、精確到參數型別和回傳值的簽名——這不是考工程能力，這是在考「照著食譜煮菜」。任何一個合格的 junior engineer 拿到這種 spec，都不需要動用判斷力，唯一要做的是把英文翻譯成程式碼。

Senior SWE-Bench 做了一個殘忍的對照實驗：把同一種任務換成 639 字的 Slack 訊息。結果是什麼？最強模型從 SWE-Bench 上以經接近飽和的解題率，直接掉到 24%。這不是模型變笨了——是題目終於問對問題了。

這件事比任何模型釋出都更重要，因為它暴露的不是模型的天花板，而是**評測社群的天花板**。過去兩年我們用 SWE-Bench 選出來的「最強模型」，可能只是最會照食譜煮菜的實習生。那些號稱「已達人類工程師水準」的 benchmark 分數，建構在一個錯誤的前提上：把工程簡化成翻譯任務。

SWE-Bench 沒有被攻克，它被拆穿了。而拆穿它的不是更難的題目，是更「正常」的題目。

### 2. 「tasteful solve」——美學問題終於變成工程命題

Senior SWE-Bench 最狠的地方不是 runtime investigation，是 taste 評分。Rubric > 0.5、Bloat < 2×、Practice > 2/5——這三條把一個長久以來被當成主觀偏好的問題，變成了可量化的工程命題。

你會煮飯，跟你會煮得好吃，是兩件完全不同的事。SWE-Bench 考的是前者：做出能吃的東西就算過。Senior SWE-Bench 考的是後者：不只東西要能吃，擺盤、火候、食材搭配都得對。而目前最強模型在「做得漂亮」這關卡了 76% 的時間。

這背後有一個更深層的問題：taste 到底能不能被訓練？SWE-Bench 的正確性分數隨著模型 scale up 穩定上升——scaling law 在正確性維度上是贏家。但 taste 呢？Codebase 慣例是隱性的、文化性的，GitHub 學不到。Rubric 是專家寫的——專家 scale 不了。換句話說，taste 可能是 scaling law 到不了的維度。

如果這個假設成立，Senior SWE-Bench 分數的天花板就不會像 SWE-Bench 那樣被輕鬆突破——24% 可能不是起點，是瓶頸。

### 3. Opus 4.8 24% vs Sonnet 5 19.4%：差距在 taste，不在正確性

同一個 benchmark、同一家公司、兩個模型差了 4.6 個百分點。這兩個模型在標準 coding benchmark 上的差距通常只有小數點級別，但在 Senior SWE-Bench 上拉開了。為什麼？

我的猜測：正確性這條線，Opus 4.8 和 Sonnet 5 都能過。真正拉開差距的是 taste 維度——Opus 在遵守 codebase 慣例、控制 bloat、產出符合專家 rubric 的解法上，比 Sonnet 強了整整一個身位。

這暗示 scaling law 在 taste 維度上可能還有巨大的未開發空間。過去兩年的 scaling 幾乎全發生在「正確性」這條軸上——更大的模型給出更正確的答案。但 taste 呢？更大的模型是不是也會給出更漂亮的答案？還是這兩個維度根本是正交的？

Anthropic 手上握著這兩個數據點，內部的 taste breakdown 他們自己清楚。把 Opus 4.8 第一個送上 Senior SWE-Bench 還公開 leaderboard——這不是學術誠實，這是火力展示。

*城武的未解檔案——SWE-Bench 花了兩年告訴我們哪個模型最會考試，Senior SWE-Bench 用一張 leaderboard 告訴我們：那張考卷從一開始就出錯了。*

- 原文：[Senior SWE-Bench](https://senior-swe-bench.snorkel.ai/)（Snorkel AI, 2026-07）
