---
layout: post
title: "【深度翻譯】從會議紀錄到 Jira 票據：Mistral 的代理工作流如何吃掉 PM 和工程師的日常"
date: 2026-06-20 00:00:00 +0000
categories: [llm, ai, deep-translation]
---

![hero]({{ site.baseurl }}/assets/images/2026-06-20-mistral-agentic-workflow-hero.jpg)

Mistral 最近發表了一個案例，看完第一反應是：哇，PM 可以下班了。用 LLM agent 把「會議逐字稿 → PRD → Jira 票」整條管線自動化，聽起來像是每個工程師做夢都會笑醒的好消息。但冷靜下來想一想——如果 AI 寫的 PRD 有 bug，誰扛？這篇原文很短，案例也不複雜，但正是這種「看起來超合理」的自動化，最值得被追問一句：我們到底把什麼外包給了 AI？

---

產品開發團隊永遠在趕時間。需求對齊、跨部門溝通、規格文件撰寫——這些環節占掉 PM 和工程師一大半的工作量。傳統作法是什麼？開會、錄音、手寫筆記、人工整理 PRD、再手動拆成開發票。每一站都跟時間借錢，而且利息很高。

Mistral 的解法很直接：把這整條鏈接上 agent。

他們設計了一套名為 TranscriptToPRDTicket 的工作流，核心是兩個 agent——**PRDAgent** 和 **TicketCreationAgent**，背後都跑 Mistral Large 2。

流程從頭到尾長這樣：

1. **會議錄音逐字稿**當作輸入，捕獲會議室裡每個人講的話。
2. **PRDAgent** 把 raw transcript 消化，產出一份結構化的 PRD。
3. **TicketCreationAgent** 接手 PRD，拆成可執行的開發票。
4. 票直接進 **Linear 或 Jira**，不用人轉貼。

整條管線的賣點是「從討論到開發，幾乎不用手動介入」——翻譯成白話：PM 可以在旁邊等結果了。Mistral 特別強調他們的模型在自然語言理解上夠強，能準確解讀會議內容；同時結構化輸出能力保證產出的 PRD 和 ticket 格式整齊、可追蹤。

Mistral 以經提供了一個 Google Colab notebook 讓你自己跑跑看——原文連結可以找到，有興趣的人可以試試。

---

## 城武觀點

自動化 PRD 的最大盲點不是技術，是責任。

這件事我從新想了好幾天才決定寫清楚。Mistral 的 demo 很漂亮，技術上也沒什麼好挑剔的——LLM 確實可以從逐字稿生出像樣的 PRD，甚至比某些 PM 寫的還整齊。但問題不在這裡。

問題是：LLM 生成的 PRD 有錯，誰來承擔？

PM 可以說「是 AI 寫的」，工程師可以說「是 PM 簽的」——到頭來，一份沒人負責的 PRD 就是組織的問責潰堤。這不是技術 bug，這是組織 bug。

更深一層：會議逐字稿轉 PRD 的過程，本質上是一場權力過濾。誰的發言被保留、誰的被省略、誰的意見被 LLM 的 temperature 參數「平均掉」——這些決定全藏進 token 序列裡了。自動化沒有消除權力結構，只是把它埋得更深。

一個自動化工具聲稱幫你省下寫文件的時間，其實是幫你省下思考「為什麼該做這件事」的時間。這才是最貴的 trade-off。

---

*城武的未解檔案——你省下的不是寫 PRD 的時間，是決定誰對 PRD 負責的時間。而後者比前者貴上一百倍。*

- 原文：[Empowering product development with an agentic workflow](https://mistral.ai/news/agentic-workflows-from-meetings-to-dev-tickets/)（Mistral AI team, 2025-03-04）
