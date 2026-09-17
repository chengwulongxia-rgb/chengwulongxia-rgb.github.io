---
layout: post
title: "【深度分析】Gemini 3.8 Live：當「讓我查一下」不再中斷對話"
date: 2026-09-17 02:00:00 +0000
categories: [llm, ai, deep-analysis]
---

![hero]({{ site.baseurl }}/assets/images/2026-09-17/gemini-live-extended-thinking.jpg)

語音 agent 最尷尬的地方，從來不是不會說話，而是它一旦真的要做事，對話就得停下來等。Google 新推出的 Gemini 3.8 Live 與 Gemini 3.8 Live Extended Thinking，想處理的正是這段空白：讓模型在持續說話、看畫面與回應打斷的同時，於背景執行工具與 API 呼叫。這篇公告的重點不只是一組新 benchmark，而是它把即時語音互動從「問答介面」往可執行的代理人推了一步。

## 原文摘要

Google 於 9 月 15 日宣布兩個面向近即時推理的語音模型：Gemini 3.8 Live，以及能力更偏向複雜任務處理的 Gemini 3.8 Live Extended Thinking。官方將兩者定位為開發者與企業打造可上線語音 agent 的底層元件，也說它們會讓 Gemini app、Google Workspace 與 Search 裡的語音協作變得更順暢；使用者可用語音處理較複雜的工作。

### 兩種模型，兩種工作重心

Google 的說法是，3.8 Live Extended Thinking 在 Artificial Analysis 的 Speech to Speech Quality Index 取得整體第一，分數為 82.6；在 agent 任務完成度的 ττ 評測則為 68.6%。這些數字是官方列出的外部評測結果，不等於所有真實語音情境都會得到相同體驗，但它們是這次發布用來主張模型推理與對話品質的主要依據。

一般版 Gemini 3.8 Live 則在 Speech Agent Arena 排名第二。Google 特別把它描述成兼顧能力、效率與規模化成本的選項；Extended Thinking 則承接需要較深推理的流程。另一項由 ServiceNow 提供的 EVA-Bench，評估語音 agent 的方式是把「完成工作」與「對話體驗」放到同一張座標上。Google 主張自家模型把這個複雜工作流程的效率—體驗前緣往外推，測試使用的是 Gemini Enterprise Agent Platform 上的 Live API。

### 視覺、語言與未完成的任務

3.8 Live 能以近即時速度處理視覺輸入，把眼前畫面帶進對話脈絡。Google 舉的應用包含：在員工 onboarding 時看著畫面回答即時問題，以及在下棋過程中結合視覺資訊、推理和自然口語互動。模型也可在對話途中自動偵測並切換 97 種支援語言，而不是要求使用者先挑好單一語言。

這次最關鍵的設計，是模型可在背景執行工具與 API 呼叫。使用者提出請求後，模型可以先確認需求、繼續對話；真正的工作在背景完成後再回到對話。公告沒有把這描述為單純的延遲優化，而是用它來主張更自然的協作：人不必因為 agent 正在查資料、呼叫函式或處理流程，就面對一段沉默。

![Gemini 3.8 Live Extended Thinking 的對話與背景任務流程]({{ site.baseurl }}/assets/images/2026-09-17/gemini-live-extended-thinking-flow.svg)

對需要較深思考的任務，3.8 Live Extended Thinking 會「一邊推理、一邊說話」。Google 特別提到模型會先給出像「Let me check that…」的早期口語提示，讓對話保持流動，同時把較重的推理與執行留在後方。官方展示的情境包括：依據草圖與即時語音回饋產出可用的 React 元件、協調多步驟預訂與非同步函式呼叫，以及透過自然口語即時建立完整商業計畫和客製化行銷工具組。

這個流程可概括為：模型接收語音與視覺脈絡後，持續提供對話回應；若任務需要外部操作，則把工具或 API 工作送到背景，並在完成後把結果帶回同一段對話。Google 的承諾是，使用者不需要在「聊天」與「等 agent 做事」之間切換模式。

### API、生態系與部署管道

Google 也把發布放進語音開發生態系來談。公告列出 Agora、Fishjam、LangChain、LiveKit、Pipecat、Vercel 與 Vision Agents 等平台，稱它們可透過 Gemini Live API 協助開發者建置與部署語音驅動介面。這些平台負責處理即時媒體串流的複雜基礎設施，開發者則把重心放在使用者體驗。Google 另提到 Salesforce、Genspark 與 Lumeris 等合作公司，引用它們對延遲、流暢性與工具呼叫能力的正面評價。

兩個模型都從發布當天起逐步推出。開發者可透過 Gemini API 與 Google AI Studio 使用；企業端則涵蓋 Gemini Enterprise，並預計進入 Gemini Enterprise for Customer Experience。Extended Thinking 也將面向 Google Workspace 的商務客戶。公告同時提到 Google Workspace 的 Docs Live、Gmail Live 與 Keep Live，以及 Search Live 的逐步、即時疑難排解，作為這些模型進入既有產品的場景。

### 音訊標記

Google 說，其 AI 產品生成的所有音訊都會嵌入 SynthID 水印。這種人耳聽不出的標記直接編進音訊輸出，目的是讓 AI 生成內容可被偵測，以協助降低錯誤資訊風險；模型的安全與責任作法則另指向 Gemini 3.8 Audio 的 model card。

## 城武觀點

我站在「背景任務可以做，但不能靠流暢感把它藏起來」這邊。Google 把不中斷包裝成語音 agent 的進步，技術上沒有錯；問題是模型一邊寒暄、一邊跑工具或 API 時，越自然的對話越容易讓人忘記有非同步操作正在發生。真正成熟的產品能力，若涉及外部行動，應當同時讓執行狀態、權限範圍與撤回方式可見；否則「讓我查一下」就可能只是把代理權藏進禮貌填充詞。這不是反對背景任務，而是拒絕把使用者的知情權當成介面摩擦。

*城武的未解檔案——語音越像陪你聊天的助手，越要記得它可能正在替你按按鈕。*

- 原文：[Introducing Gemini 3.8 Live and 3.8 Live Extended Thinking](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-8-live-gemini-3-8-live-extended-thinking/)（Tom Ouyang、Malini Jaganathan, Google, 2026-09-15）
