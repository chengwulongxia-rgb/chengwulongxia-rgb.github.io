---
layout: post
title: "【深度翻譯】Ponytail：教 AI agent 學最懶的資深工程師——最好的程式碼是你沒寫的那一行"
date: 2026-06-15 00:00:00 +0000
categories: [llm, ai, tool]
image: "/assets/images/2026-06-15-ponytail-lazy-senior-dev-hero.jpg"
---

在 AI agent 滿街跑的 2026 年，有一個問題越來越刺眼：**AI 寫太多程式了。**

不是寫錯，是寫太多。你叫它做一個日期選擇器，它幫你裝 flatpickr、寫一個 wrapper component、加一個 stylesheet、然後開始討論時區處理。你只是想要一個 `<input type="date">`。

[Ponytail](https://github.com/DietrichGebert/ponytail) 要解決的就是這個問題。它是一個 MIT 授權的開源工具，**讓你的 AI agent 像會議室裡最懶的那個資深工程師一樣思考**——一句話不說，寫一行，能跑，就交差。

上線不到一個月就拿到 1,700+ GitHub stars。不是因為技術多深，是因為它打中了 agent 時代最痛的點：**token 不是免費的，而你有一半的 token 花在 AI 自嗨寫出不需要的程式碼上。**

---

## 數字會說話

Ponytail 用五個日常任務（email validator、debounce、CSV 加總、倒數計時器、rate limiter）在三款模型（Claude Haiku / Sonnet / Opus）上各跑 10 次取中位數，跟沒有 Ponytail 的 baseline 對比：

- **程式碼減少 80–94%**
- **速度快 3–6 倍**
- **費用降低 47–77%**

每一行被省掉的程式碼上，都會被標記一個 `ponytail:` 註解，寫明這行的升級路徑——不是偷偷省掉，是**有自覺地省掉**。

---

## 核心運作邏輯：六層懶人濾網

Ponytail 在 agent 準備寫 code 之前，強迫它依序檢查六個問題。任何一層通過，就停在那層，不往下走：

1. **這東西需要存在嗎？** → 不需要？跳過（YAGNI 原則）
2. **標準庫有嗎？** → 有？直接用
3. **平台原生功能有嗎？** → 有？直接用（例如 `<input type="date">`）
4. **已經安裝的 dependency 能做嗎？** → 能？直接用
5. **一行能解決嗎？** → 能？就一行
6. **真的不行的話：** 寫出「剛好能動」的最小實作

重點在最後一句：**懶，不是隨便。** Ponytail 明確保證：信任邊界驗證（input validation）、資料遺失防護、安全規範（XSS/SQL injection）、無障礙（a11y）——這些東西絕對不會被省掉。

> 「The code you never wrote scales infinitely. Zero bugs, zero CVEs, 100% uptime since forever.」
>
> 你沒寫的程式碼有無限的擴展性。零 bug、零漏洞、從開天闢地以來 100% uptime。

---

## 適用所有主流 agent 工具

Ponytail 的設計哲學跟它的功能一樣簡潔：**不做平台鎖定**。它支援：

- **Claude Code**：`/plugin marketplace add DietrichGebert/ponytail`
- **Codex**：`codex plugin marketplace add ...`
- **OpenCode**：JSON config 注入 ruleset
- **Cursor / Windsurf / Cline / Copilot / Aider / Kiro**：直接複製 rules 檔案到專案目錄

核心機制是**把規則文字注入 agent 的 system prompt**——沒有 runtime dependency，沒有 API 呼叫，沒有任何需要維護的後端。就只是一組文字規則，告訴 model「先從 stdlib 開始想，不要直接 npm install」。

---

## 三個命令，一種哲學

Ponytail 提供三個斜線命令：

| 命令 | 作用 |
|------|------|
| `/ponytail` | 預設模式，每次 session 自動啟用 |
| `/ponytail-review` | 掃描你的 diff，找出可以殺掉的程式碼 |
| `/ponytail ultra` | 「這個 codebase 得罪過你本人」模式——更激進的刪減 |

`/ponytail-review` 可能是最實用的功能。你讓 agent 寫完東西之後，叫它回頭看自己寫了什麼，然後問：「哪些行其實根本不需要？」這不是在抓 bug，是在**抓多餘**。

---

## 城武觀點

Ponytail 表面上是一個幫你省 token 錢的小工具。但我認為它真正的價值在於**暴露了 AI agent 的根本荒謬**：

目前的 AI coding agent 被訓練成「盡可能滿足使用者需求」，但沒有人告訴它「有些需求根本不該被滿足」。你叫它做一個日期選擇器，它不會反問你「為什麼不用 `<input type="date">`？」——因為反問不是它的工作。它的工作是執行，不是質疑。

這就是為什麼人類資深工程師的價值不會被取代。一個真正厲害的 senior dev 的日常不是「寫更多程式」，而是**阻止程式被寫出來**。當 PM 走過來說「我們需要一個日期選擇元件」，senior 會說「HTML 就有」。當 junior 說「我裝了 left-pad」，senior 會嘆一口氣然後走到白板前面。這種「不寫的智慧」來自經驗、來自踩過的坑、來自在凌晨三點被自己寫的 code 叫醒的恐懼。

Ponytail 做的事情是把這種智慧**規則化**、**自動化**——但它能規則化的只是表層。真正深層的「這個產品需求本身就不該存在」的判斷，還是只有人能下。

反過來說，Ponytail 的成功也告訴我們一件事：**目前 AI agent 的瓶頸不是智慧不夠，是智慧被浪費在錯的地方。**減少 80% 的程式碼不是因為 AI 突然變聰明了，是因為它被教會了閉嘴。當模型本身的能力已經過剩，下一步的改善不是讓它更強——是讓它更克制。

最好的程式碼不是你寫出來的那一行，是你本來要寫、後來發現不需要寫、就沒寫的那一行。Ponytail 把這個道理刻進了 agent 的 system prompt。

---

*城武的未解檔案——AI agent 的終極型態不是寫程式的速度突破天際，是它學會了在你開口之前說：「等等，你確定你需要這個嗎？」*
