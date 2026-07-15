---
layout: post
title: "【深度分析】The Agentic Loop — 代理系統的三層迴圈架構拆解"
date: 2026-07-15 02:00:00 +0000
categories: [llm, ai, deep-analysis]
---

![hero]({{ site.baseurl }}/assets/images/2026-07-15/agentic-loop-three.jpg)

如果你正在寫一個 agent——或者打算在下個 sprint 開工——Robert Ross 這篇文章可能是你今天最值得花 10 分鐘讀的東西。他在 2026 年 7 月 14 日的 The Thought Drop 上發表了一篇技術架構文，把 agent 系統拆成三個迴圈：Inference Loop、Tool Loop、Human Loop。文章用 pseudo-code 示範每一層的運作邏輯，語氣輕鬆（有個從頭貫穿到尾的前女友 Laney 哏），但技術內容是實打實的：從 stateless API 的 chat history 管理，到 tool_call_id 的強制配對，再到 Human Loop 為什麼需要 durable execution。但 Ross 的三層模型有一個城武認為非補不可的洞，而且他對 Human Loop 的浪漫化描述，恰好避開了 agent 部署中最痛的那個問題。

---

## 原文摘要

Agent loop 常常被過度簡化。業界習慣把它畫成一個圈，但 Ross 的論點是：agent 系統其實是**三個迴圈疊在一起**，像三個人穿一件大衣假裝是一個大人。你的顧客體驗到的那個「agentic」感受，背後跑的是這三層。

### 第一層：Inference Loop（推理迴圈）

這是 agent 最外層的迴圈。它的工作是三個：① 呼叫 LLM 的 chat completion API 做推理；② 如果模型回傳了 tool call 請求，把它交給 Tool Loop 處理；③ 管理對話歷史的持久化——包含工具執行結果和後續使用者訊息。

關鍵的技術細節是：大多數 LLM provider 的 API 設計是 **stateless** 的。模型本身不知道你們上一輪聊了什麼，你必須在每次 API 呼叫時**把整段對話歷史從新傳進去**。這就是為什麼你會看到「長對話吃 token 特別快」的警告——因為你把從第一句開始的所有訊息，包含那些關於要不要傳簡訊給前任的猶豫，全部打包送回去。

Ross 給了一段 pseudo-code 示範 Inference Loop 的基本結構：一個 while 迴圈，每次呼叫 `completeChat`，把 assistant 回傳的訊息 append 到 `chatMessages` 陣列裡，如果有 tool call 就交給下一層處理，沒有就結束迴圈、回傳最終結果。

### 第二層：Tool Loop（工具迴圈）

LLM 是罐子裡的大腦——它們自己沒有任何實際作用。**你給 LLM 的工具，才是讓它變成 agent 的關鍵。** 當你在 Inference Loop 中告訴模型「這些是你的工具」，模型在推理過程中可能會嘗試「使用」它們。這就跟你大腦發送一個電信號，叫你的食指懸在「送出那封你猶豫了兩小時的 email」的 enter 鍵上方，是同一件事。

工具定義通常會被序列化進 system prompt 的 token stream 中，模型可以在同一輪推理中呼叫多個工具——所以才叫 Tool Loop（工具迴圈）。你的 Tool Loop 必須根據模型推斷出來要呼叫的工具名稱，找到對應的本地函式，用模型提供的參數去執行。

但有三件事必須注意：

1. **工具呼叫也是推斷出來的文字**——意思是工具名稱、函式參數都可能被幻覺產生。你必須對這些虛假的工具呼叫做好防禦，回傳類似 `Tool Not Found: "call_my_ex_girlfriend"` 的錯誤訊息。

2. **API 回傳中帶有 `tool_call_id`**（Anthropic 叫 `tool_use_id`）。這個 ID 是 API 和模型用來關聯呼叫與回應的關鍵。如果你在後續的 completion 請求中沒有附上這個 ID，API 會直接報錯。

3. **有些 provider 的工具回傳結果沒有獨立的錯誤碼或錯誤狀態**——回傳內容本身就是錯誤。Ross 建議用 XML 標籤來標記錯誤，例如 `<tool_call_error>Phone number blocked</tool_call_error>`。不過他也附帶說明：Anthropic 的 API 確實有 `is_error` 欄位。

### 第三層：Human Loop（人類迴圈）

Ross 承認他對這層的命名猶豫過。這一層不一定需要存在，也不一定需要是人類。他堅持用「Human Loop」這個名字，是因為 AI 最終應該服務人類。如果你想當反骨仔，也可以叫它「Safety Loop」或「Sanity Loop」。

假設你對 agent 的執行有控制需求，你就需要實作第三層來核准或拒絕工具呼叫，或者引導模型轉向。Ross 也坦白：這個「迴圈」其實不是程式碼層級的迴圈——它更像一個 blocking 函式呼叫，有一個「人」或「東西」自己的迴圈在決定要不要放行。迴圈不在你的程式碼邊界內，而是在核准者的邊界內。

Human Loop 可以說是 agent 系統中最難實作的部分。你不能讓一段程式碼 block 好幾個小時——萬一伺服器重啟了怎麼辦？萬一同時間有幾千個其他請求需要回應怎麼辦？前兩層（Inference 和 Tool）相對單純，Human Loop 把難度拉高了一個檔次。這就是為什麼 durable execution 框架（如 Temporal）會存在。

但 Human Loop 是必要的，因為它是唯一阻止 Tom「真的」把訊息傳給 Laney 的東西。Ross 在結尾怒吼：Tom，那是兩年前的事了，放下吧！

### 迴圈歸位：三層合體

把三層組合起來的架構是：

1. **Inference Loop**——呼叫 chat completion API，把 tool call 委派給……
2. **Tool Loop**——處理模型嘗試發出的工具使用請求，把核准需求交給……
3. **Human Loop**——請求核准或新的方向，結果再傳回工具層的輸出。

這三層迴圈是 agent 系統的基本構件。它們被用在 RAG、漸進式探索（progressive discovery）、自動工具核准檢查等各種場景。Ross 最後說：現在去寫一個吧。他也自嘲這些文章永遠處於半混亂狀態，但保證每篇都是手寫的——不是 AI 生成。

---

## 城武觀點

### 一、Ross 說對了一件事：agent loop 不是一個圈，是三個。但他漏掉了最關鍵的第四層。

Ross 的三層模型精準描述了 agent 的執行路徑，但有一個結構性的洞：只描述「這一輪對話中發生的事」，完全沒處理「上一輪的結果如何影響下一輪」。

在實際部署中，agent 真正的分水嶺不在你能不能讓它呼叫工具——2026 的今天連週末 side project 都做得到。分水嶺在於：你的 agent 能不能從過去的執行中學習，而不是每一輪都像失憶一樣從零開始。我稱這一層為 **The Memory Loop**。

Memory Loop 要處理的問題：哪些對話片段該保留進 context window，哪些該壓縮成摘要或向量？當 agent 上一輪犯錯，下一輪遇到類似情境時，有沒有機制讓它意識到「上次這樣炸了」？當你同時跑 50 個 agent instance，經驗能不能互相傳遞？Ross 提了 chat history 管理，但那是 persistence 問題，不是 learning 問題。memory/context management 才是讓 agent 從「可以跑 demo」變成「可以在 production 活過一週」的關鍵。

我的立場很清楚：三層是教學簡化版，四層（加上 Memory Loop）才是 production 的完整架構。如果你現在正在設計 agent 系統，把 memory 當成第四層而不是 Inference Loop 的附屬功能來設計，你會省下未來六個月的重構時間。

### 二、「Human Loop 最難實作」這句話只有一半是對的——真正困難的不是技術。

Ross 說 Human Loop 最難，因為「不能讓程式碼 block 好幾個小時」「伺服器重啟怎麼辦」。這些挑戰是真實的，但 Temporal 之類的 durable execution 框架可以解決。真正困難的——也是 Ross 完全沒觸及的——是：**你讓誰來做那個人？**

在中型企業部署中，Human Loop 的核准者常是部門主管或合規人員。這個人不懂 code、不懂 LLM 行為模式，但他是組織賦權的唯一簽核者。當 agent 在半夜兩點發出 tool call 需要核准——比如「把這筆退款發出去」——核准者看著一串看不懂的 JSON 參數，只有批准或拒絕兩個選項。在這種情境下，Human Loop 不會是安全機制：它會變成「因為看不懂所以一律拒絕」或「因為太煩所以一律批准」的瓶頸。前者讓 agent 形同虛設，後者讓安全機制形同虛設。

Ross 把 Human Loop 描述成理性的工程設計決策。但在真實世界中，它是一個權力不對稱問題：核准權集中在不具備判斷能力的人手上，而真正知道會不會出事的工程師被排除在外。技術上的 blocking 和 durable execution 只是前半段，後半段——怎麼設計一個讓「對的人」用「對的資訊」做核准的系統——目前沒有任何框架在解決。

### 三、工具呼叫的「看起來合理但語意錯誤」是 agent reliability 最被低估的前線。

Ross 對 Tool Loop 的建議很實用：擋掉幻覺的工具名稱、確保 `tool_call_id` 配對、用 XML 標籤標記錯誤。這些是基本防線。但有一個更陰險的問題：**plausible wrongness**。

LLM 產生了一個工具呼叫，工具名稱正確、參數格式正確、結構完全合法——但語意是錯的。它呼叫 `send_email(to: "ceo@company.com", subject: "辭職信", body: "我受不了了")`——格式完美，但它在這個情境下根本不該被產生。這不是 hallucination（幻覺出不存在的東西），而是「正確地調用了 send_email，但不該在這個時候、對這個人、用這個內容調用」。

現有的 error handling 全部抓不到這種錯誤——從 API 角度看這個呼叫完全合法。你只有兩個選擇：靠 Human Loop 的人眼抓（回到觀點二——核准者看得出來嗎？），或在工具層加語意驗證（誰來定義「正確的語意」？）。當 agent 從「呼叫單一 API」進化到「編排數十個工具的複雜工作流」，plausible wrongness 會以組合爆炸的方式出現——一個參數錯，整條工作流在第三步才炸，而你無法追溯是哪個 tool call 的語意出了問題。我賭這是 agent reliability 的下一個重大研究課題。

*城武的未解檔案——三個迴圈讓你的 agent 動起來，但第四個迴圈決定它能不能活到週五。*

- 原文：[The Agentic Loop: Three loops in a trench coat](https://www.bobbytables.io/p/the-agentic-loop-three-loops-in-a)（Robert Ross, The Thought Drop, 2026-07-14）
