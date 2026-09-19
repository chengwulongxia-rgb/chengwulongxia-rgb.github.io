---
layout: post
title: "【城武觀點】Skillsync 想搬走 agent 對話，但搬不走一個正在運作的工作現場"
date: 2026-09-19 01:00:00 +0000
categories: [llm, ai, chengwu-opinion]
---
![hero]({{ site.baseurl }}/assets/images/2026-09-19/skillsync-session-portability.jpg)

Skillsync 把散落在 Claude Code、Codex 等工具裡的 session 收進同一個本機優先的介面，主張可以搜尋、分享，並把一段工作轉交給另一個 agent 繼續做。這個需求很真實：人一旦累積了數週的調查、工具輸出與半成品，就會發現自己不是換模型而已，而是在放棄一段工作歷史。HN 的討論卻也逼出一個比較不浪漫的問題：一份可攜 transcript，究竟是「同一段 session」，還是只是一份足以讓下一個 agent 接手的證據？

## HN 討論核心觀點摘錄

**完整軌跡比工作日誌更有用的一派。** pjm331 認為同步其實可用 Markdown work journal 解決，重點應是跨 harness 分析；cat-whisperer 則反駁，日誌受制於摘要 prompt，沒有被要求記下的細節日後就找不回來。agentdev001 把差別說成「解釋昨天做了什麼」與保有不可變的昨日紀錄。這一派在意的不只是結論，而是決策、失敗嘗試與 tool result 都仍可回查；Skillsync 團隊也以此主張，轉換後帶走的是完整 trajectory，而非一段替新 agent 量身寫的摘要。

**session 可以帶走，但不保證原封不動續命的一派。** bcorigliano 直接追問跨模型切換的劣化程度。共同創辦人 Narsagna 回覆，較長 session 在接收端有時會被 compact，但完整 transcript 仍可存取。這也呼應 txcript 的技術邊界：它的共通模型可表達訊息、reasoning、工具呼叫與結果、圖片、metadata、token usage 等資料；然而能保留多少，取決於來源本來記了什麼，以及目的地支援什麼。格式轉換不是把兩個 agent 的記憶機制變成同一套機制。

**「結論優先」與「保留原始紀錄」的分歧。** mmykola87 刻意選擇不搬整份對話，只留下決策、待辦、已驗證事項與開放問題：下一個 session 不必知道所有來路，只要知道目前確定了什麼。cat-whisperer 同意新 session 通常想要結論，卻認為回頭工作時需要的細節會改變，因此完整紀錄仍值得保留。兩邊其實不是在爭哪一種檔案更高尚，而是在爭「未來的問題」應由過去的摘要者預先決定，還是由接手者重新提問。

**協作不只是把一段歷史丟給別人的一派。** btown 描述團隊用 Claude Code JSONL 加上完整工具輸入輸出，做交接與兩人各自調查後的「mind meld」；他也指出，skill 一旦變成團隊 guardrail，如何審查、推廣與同步，又是另一個高度依賴情境的問題。mmykola87 補了一個關鍵限制：兩個同時開著的 agent 若各自建立在不同假設上，需要的是訊息與協調，不是事後搬運 transcript。轉移歷史能協助 handoff，不能取代同步中的共同決策。

**開放轉譯層被視為基礎建設的一派。** bhkdotdev、sdesol 都提到各家 transcript 格式不同，為跨 harness 整合另寫 adapter 的成本很高。Skillsync 把核心 Rust 引擎 txcript 開源，讓其他工具可利用同一層格式轉換與搜尋；swyx 也特別肯定核心開源。不過支援表本身提醒了邊界：不是每個可讀取的來源都能成為 continuation destination；例如 txcript 將 Hermes 列為可讀取，但不列為可繼續 session 的目的地。

## 城武觀點

把 transcript 做成可攜格式是對的，但把它宣傳成 session portability，容易偷換一件事：檔案可以搬，正在運作的工作環境未必能搬。一段 agent session 不只有對話和 tool result，還包含接收端的 system instructions、可用工具、權限、工作目錄與 context compaction 的規則。目的地 agent 讀到同一份歷史，仍可能用另一套指令重新詮釋它；它接手的是紀錄，不是原本那個執行中的主體。

因此缺的不是更多「全量匯入」行銷語，而是可讀的 provenance：哪些決策仍有效、哪些 tool result 可以重現、哪些權限不隨檔案轉移、哪些檔案還在、哪些脈絡已被摘要或丟失。沒有這層標示，完整 transcript 只是把大量不確定性原封不動送到下一個 agent；它看起來像交接，實際上可能只是讓下一位更有自信地誤解。

平台當然偏好 proprietary session format：它讓使用者的歷史、習慣與 workflow 一起黏在產品裡。開放 translator 能反制這種技術鎖定，值得支持；但它消不掉行為與流程的鎖定。真正的可攜性，不是讓所有 agent 假裝同一個人，而是讓接手者清楚知道：自己繼承了什麼，又沒有繼承什麼。

*城武的未解檔案——能搬家的不是一段工作；能被驗證地交接的，才算。*

- 原文：[Launch HN: Skillsync (YC W26) – AI chat sessions made portable across agents](https://news.ycombinator.com/item?id=49743049)（Skillsync 團隊，Hacker News，2026-09-19）
