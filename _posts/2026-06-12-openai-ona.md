---
layout: post
title: "【深度解析】OpenAI 收購 Ona：Codex 不再只是寫 code 的工具，它正在變成 agent 的作業系統"
date: 2026-06-12 08:00:00 +0000
categories: [llm, enterprise, agents, deep-dive]
---

![OpenAI 收購 Ona]({{ site.baseurl }}/assets/images/2026-06-12-openai-ona-hero.jpg)

OpenAI 宣布收購 Ona——一家幫開發者把工作環境搬上雲端的公司。表面上是幫 Codex 加一個「持久雲端環境」的功能，但如果你把過去一週的新聞放在一起看，會發現這不是功能更新，是**平台戰爭的基礎設施布局。**

---

## 原文說了什麼

OpenAI 的收購公告核心資訊：

- Codex 目前每週 500 萬用戶，比年初成長 400%
- 原本是開發者工具，現在擴展到知識工作者的研究、分析、自動化
- 最關鍵的一句：**Codex 最有價值的工作正在從「分鐘級」變成「小時級甚至天級」**
- Ona 的技術讓 agent 能在使用者關掉筆電之後繼續工作——在自己的雲端環境裡

Ona 被收購前的定位：幫 200 萬開發者把軟體開發從本機搬到雲端。被收購後的角色：幫 Codex agent 提供「持久的工作空間」。

Ona CEO Johannes Landgraf 的引言很精準：

> 「Agent 需要的不只是智慧，他們需要一個被信任的工作空間。」

---

## 這跟我們這週看到的其他東西有什麼關係？

### 關係一：Anthropic 的 Cowork VM

三天前 Anthropic 的工程部落格才詳細解釋了 Claude Cowork 的 VM 隔離架構——在 macOS 上跑 Apple Virtualization、在 Windows 上跑 HCS，就是為了給 agent 一個安全的執行環境。

OpenAI 的路線不同：不是在本機跑 VM，而是**把 agent 的執行環境放在企業自己的雲端。** Ona 的「customer-controlled execution model」讓 agent 跑在企業的 AWS/Azure/GCP 裡，OpenAI 提供智能和調度。

兩個路線的取捨很清楚：

| | Anthropic Cowork | OpenAI Codex + Ona |
|------|------|------|
| 執行位置 | 使用者本機 VM | 企業自有雲端 |
| 隔離方式 | Hypervisor 硬隔離 | 雲端 IAM + 網路邊界 |
| 離線能力 | 可離線 | 需要連線 |
| 企業控管 | 靠 MDM | 靠雲端治理 |
| 持續性 | session 綁定 | 跨 session 持續 |

沒有誰對誰錯——但**OpenAI 選的路更適合企業部署**，因為企業 IT 本來就會管雲端環境，不需要額外學一套 agent 安全管理。

### 關係二：BBVA 十萬人上 ChatGPT

昨天我們寫的 BBVA 案例——十萬員工、兩萬個自訂 GPT——現在跟這篇收購放在一起看：

BBVA 證明了大規模企業採用是可能的。Ona 解決了下一個問題：**當這些員工不再只是「用 AI 聊天」，而是「讓 AI 幫他們跑一個需要三小時的工作」，基礎設施要長什麼樣子？**

### 關係三：Codex 正在脫離「程式碼輔助」

500 萬用戶、400% 成長——但更重要的數字沒寫出來：**其中有多少不是工程師？**

Codex 從「幫你寫 code」變成「幫你完成工作」，不管那份工作需不需要寫 code。收購 Ona 是這個轉變的基礎設施宣言：**Codex 定位不再是 IDE 外掛，而是 agent 作業系統。**

---

## 城武觀點

### 1. 這場收購的時機不是巧合

6/11 OpenAI 宣布收購 Ona。同一天 Anthropic 發布 Claude Corps（企業協作產品線）、公開 Cowork 安全架構。前一天 BBVA 案例上 OpenAI 官網。

這不是「大家都在同一天有新聞」。這是**平台戰的三線同步推進**：Anthropic 在講安全敘事、OpenAI 在講規模和部署。

### 2. 「Customer-controlled execution」這句話是給 CIO 聽的

整篇公告最精準的銷售訊息不是技術規格，是這句：agent 跑在**你自己的雲端**，用**你自己的 IAM**，log 記在**你自己的審計系統**。

這解決了企業採用 agent 的最大障礙：不是能力不夠，是合規不敢。

### 3. 權力集中的老問題，換了一個新容器

Codex + Ona 的組合讓 OpenAI 離「agent 作業系統」更近了一步。當企業的工作流開始依賴 Codex 的持久化環境，切換成本就不是換一個模型那麼簡單——是換掉整套 agent 基礎設施。

這不是說 OpenAI 邪惡。這是說：**平台綁定的形式正在從 API 合約進化成基礎設施依賴。** 跟當年 AWS 讓企業把伺服器搬上去、然後再也搬不下來，是一樣的故事。

---

*城武的未解檔案——Codex 正在從寫 code 的工具變成 agent 的基礎設施，而且這次，它想住在你的雲端裡。*
