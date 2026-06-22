---
layout: post
title: "【深度翻譯】Agent 不需要你的帳號：Cloudflare 推出臨時帳號，讓 AI 自己搞定部署"
date: 2026-06-22 02:00:00 +0000
categories: [llm, ai, deep-translation]
---

![hero]({{ site.baseurl }}/assets/images/2026-06-22/cloudflare-temp-accounts-hero.jpg)

看到「Temporary Cloudflare Accounts for AI Agents」這個標題，你可能會想：又一個 AI 行銷詞？但 Simon Willison 在他 6/21 的 link post 裡點破了一個重點——這東西名義上是為 AI agent 設計的，但實際上對所有人都很有用。簡單說就是：你連 Cloudflare 帳號都不用註冊，就能直接部署 Worker，60 分鐘內有效，事後還能 claim 回來變永久。

Simon Willison 在 6/21 評論了 Cloudflare 6/19 推出的這項新功能。核心機制非常直接：你在本機寫好一個 Cloudflare Workers 專案後，只要執行：

> npx wrangler deploy --temporary

Cloudflare 就會自動把應用部署到一個新的臨時專案上，這個專案會保持運作 60 分鐘。你不需要事先建立 Cloudflare 帳號，也不需要產生任何 API token——一切由 Cloudflare 自動配發。整個流程完全不需要人類打開瀏覽器、點擊 OAuth 授權、或複製貼上任何 token。

Simon 以經實際用 GPT-5.5 xhigh 在 Codex Desktop 裡建了一個測試應用——一個可以追蹤 HTTP 重新導向並回傳最終目標的工具——然後用 `--temporary` 部署，結果如預期般順利運作。他特別指出部署完成後終端機會輸出一個 claim URL：

> Running the deployment spits out the URL to a page for claiming the new project, for if you want it to last for more than 60 minutes.

如果你希望這個專案存活超過 60 分鐘，可以透過這個 claim 頁面把它轉換成永久 Cloudflare 帳號和專案。換句話說，Cloudflare 給了你一條退路：讓 agent 先做完事，人類再決定要不要接手。

## 城武觀點

這功能第一眼只是「免註冊部署」，但後勁比看起來深。為什麼 agent 需要自己的帳號？答案不是 agent 沒有瀏覽器、不能點 OAuth——這只是表象。真正的原因是：人類設計的 identity 系統從根本上假設了「背後有個會負責的人」，而 agent 沒有這個人，所以需要一種不需要責任主體的 identity。Cloudflare 畫了 60 分鐘這條線——長到夠 agent 完成「部署→測試→從新部署」的 iteration loop，短到沒人 claim 時惡意 agent 做不了什麼大事。更有趣的是，Wrangler 在錯誤訊息中會提示你可以加 `--temporary` flag——這不是 UX 小技巧，這是 prompt engineering 從 LLM 延伸到 CLI output 的具體案例：錯誤訊息不再只是給人類看的，也是在教 agent 下一步該怎麼走。加上 Cloudflare 同時跟 Stripe（agent 開金融帳號）和 WorkOS（auth.md 標準）合作，整套佈局已經很清楚——他們在搶 agent 部署生態系的入口，而入口的第一道門就是「連帳號都不用辦」。

*城武的未解檔案——當 agent 不再需要借用你的身份登入，它到底是你的工具，還是你的同事？*

- 原文：[Temporary Cloudflare Accounts for AI Agents](https://simonwillison.net/2026/Jun/21/temporary-cloudflare-accounts/)（Simon Willison, simonwillison.net, 2026-06-21）
