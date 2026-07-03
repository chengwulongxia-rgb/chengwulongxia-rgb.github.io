---
layout: post
title: "【深度分析】AI 幫 AI 除錯 prompt，然後挑了對手家的模型——Simon Willison 的 DSPy × Claude Fable 5 實驗"
date: 2026-07-03 03:00:00 +0000
categories: [llm, ai, deep-analysis]
---

![hero]({{ site.baseurl }}/assets/images/2026-07-03/dspy-datasette-prompts.jpg)

Simon Willison 做了一件看似平凡、實則意味深長的事：他讓一個 AI（Claude Fable 5）去指揮另一個框架（DSPy），去優化第三個 AI（Datasette Agent 背後的大模型）的 system prompt。整件事，人類的輸入只有一行指令。這不是「又一個 prompt engineering 技巧分享」——這是 prompt engineering 作為一項人類手工業，正在被自動化取代的第一個明確訊號。

## 原文摘要

7 月 2 日，Simon Willison 在 AIE 大會上聽了一場 DSPy 的演講，想起自己一直想試試用 DSPy 來優化 Datasette Agent 的 SQL 系統提示。他隨手在 Claude Code for web 上開了一個非同步研究任務，用的是 Claude Fable 5，指令只有一句話：

> Pip install 最新版 Datasette alpha、datasette-agent 和 dspy，然後找出怎麼用 dspy 來評估並改進 Datasette Agent 執行唯讀 SQL 查詢時的系統提示。

Fable 5 接手後，自己做了一個關鍵決定：選用 GPT 4.1 mini 和 GPT 4.1 nano 作為測試模型——不是 Claude 自家的模型。DSPy 跑完優化迴圈後，Fable 提出了幾個有潛力的改進方向，其中 Simon 最喜歡的發現，揭露了一個極其經典的 prompt 設計盲點。

Datasette Agent 的 schema 列表只顯示 table name，不顯示 column name。而原本的 system prompt 又加了一條規則：「如果你已經有 table 資訊，不要重複呼叫 describe_table。」結果 agent 開始猜 column name——page_count、o.order_id、first_name——猜錯就報錯，報錯就重試，重試再猜錯，陷入無限迴圈。

人類看到 schema 只有 table name，直覺反應是「資訊不夠，先去查 column」；但 LLM 聽話——prompt 說不要查，它就真的不查，改用猜的。Fable 5 提出的修正方向很簡單：要嘛在 schema 列表裡直接附上 column name，要嘛把那條「不要再查」的規則改軟一點。

完整的實驗程式碼放在 Simon 的 GitHub research repo（`simonw/research` 下的 `dspy-datasette-agent-prompts` 目錄），Datasette Agent 也有公開的網頁介面可以親自玩。

## 城武觀點

**一、人讓 AI 來除錯 AI 的 prompt——這本身就是一個訊號。**

人類一行指令 → Fable 5 接手 → 自己選 GPT 4.1 mini/nano → DSPy 迭代 → 評估 → 修正。整條迴圈裡人類只貢獻了第一行。這以經不是 prompt engineering，是 prompt engineering 的工業化。你花三小時調 system prompt 的週末，Fable 五分鐘跑完，還比你清楚 LLM 會卡在哪。

**二、column name guessing → error-retry loops：人類不會踩的坑，AI 卻陷進去。**

Fable 發現 prompt 說「不要重複呼叫 describe_table 如果你已經有資訊」，但 schema 只給 table name。人類會去查 column；LLM 聽話不查改用猜的——page_count、o.order_id、first_name——猜錯→報錯→重試→再猜錯。這是設計 prompt 最經典的人機盲點：你預設對方有常識，LLM 就是沒有，每條指令都當鐵律執行。

**三、Fable 選了 GPT 來跑 DSPy——不是你自家的模型。**

Simon 用 Claude Fable 5 當 orchestrator，Fable 自己選了 GPT 4.1 mini/nano。不選 Claude？Fable 跟任何工程師一樣：不需要最強模型，便宜的夠了。AI 在做工具選擇，找 CP 值最高的。Anthropic 花幾十億訓練 Claude，Claude 轉頭推薦你用 OpenAI。這不是背叛，是務實——而務實，是我們認為 AI 最缺的。

*城武的未解檔案——我們花了兩年學會怎麼對 AI 說話。現在 AI 告訴我們：不用說了，我幫你跟我自己說。*

- 原文：[Using DSPy to evaluate and improve Datasette Agent's SQL system prompts](https://simonwillison.net/2026/Jul/2/dspy-datasette-agent-prompts/)（Simon Willison, simonwillison.net, 2026-07-02）
