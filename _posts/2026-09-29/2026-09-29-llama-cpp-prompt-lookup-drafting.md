---
layout: post
title: "【深度分析】llama.cpp 的 prompt lookup 為何能快 140 倍：先看清它加速的是草稿"
subtitle: "frozen"
date: 2026-09-29 03:00:00 +0000
categories: [llm, ai, deep-analysis]
tags: [llama.cpp, Prompt Lookup, Speculative Decoding, n-gram, 本地推論, 效能最佳化, Daniel Lemire]
---
{{ site.baseurl }}/assets/images/2026-09-29-llama-cpp-prompt-lookup-drafting/hero.jpg

本地推論的效能新聞很容易把一個局部數字翻成整台機器都突然飛起來。Hayder Tirmazi 這次針對 llama.cpp 的工作，恰好提供了較好的反例：他優化的是 prompt lookup decoding 裡「找下一批草稿 token」的資料結構與判斷路徑；它值得注意，但不能被翻譯成所有模型生成、所有使用者工作負載都快了 140 倍。真正的問題是：草稿取得本身原來花多少時間、模型驗證能接受多少草稿，以及快取的建立、載入與記憶體代價各是多少。

## 原文摘要

prompt lookup decoding，也被稱為 n-gram speculative decoding，是 speculative decoding 的一個簡化分支。一般 speculative decoding 會先由較小的草稿模型提出多個下一 token，再由目標模型批次驗證；prompt lookup 則不用另一個神經網路，而是從已見文字的 n-gram 統計中猜測後續。若某段前文後面曾經反覆接同一個 token，系統便把它當成候選草稿；目標模型仍須驗證，接受後才節省後續生成的工作。因此，本文 benchmark 的核心數字是**每個 drafted token 的草稿延遲**，不是包含目標模型前向運算、驗證、採樣、I/O 與實際回答品質的端到端 token/s。

llama.cpp 的 lookup 路徑有三份 n-gram 快取。context cache 保存當前上下文中 1 到 4-gram 的出現與後繼 token 計數，並隨著本次生成持續更新；dynamic cache 保存先前執行累積的模式，例如過去對話；static cache 則由 `llama-lookup-create` 從固定語料預建 2-gram。實際挑選時，系統先從 context cache 嘗試較長的 4-gram，依序退到 1-gram；沒有合格候選才查看 dynamic cache。static cache 一方面會提高同時符合靜態語料的候選權重，前兩者都失敗時也能自己提出 2-gram 候選。候選還必須通過最少出現次數與最高頻後繼比例兩道門檻，才會成為草稿。

這個安排的含義是，lookup 不是保證正確的「背答案」，而是以重複與局部規律換取可能被驗證器接受的提案。官方範例 README 也把可調旋鈕明確列為 `ngram_min`、`ngram_max` 與 `n_draft`：前兩者決定在 prompt 裡找多長的匹配片段，後者決定找到後一次先草擬多少 token。草稿長度調大並不自動等於端到端更快；如果候選不常被接受，驗證成本仍會把收益吃掉。

這也說明三個 cache 不該被混成一個「知識庫」。context cache 是正在進行的序列所留下的短期統計；dynamic cache 的價值取決於先前工作是否與當前輸入相似；static cache 則把外部語料的常見接續帶進來。它們共享的是計數與候選選擇介面，來源、更新時機與可能偏誤卻不同。靜態語料越大，不只是候選來源更多，也會改變預建時間、檔案大小、載入延遲與記憶體壓力；這些都不是模型驗證階段自動消失的成本。

Tirmazi 的測試在 14 核、48GB 記憶體的 Apple M4 Pro 上進行。他用 WikiText-103 訓練文字建立靜態快取，涵蓋 25、50、100、200 與完整約 541MB 語料，再用 WikiText-103 測試文字由 `llama-lookup-stats` 重播。這個工具把檔案 token 視為模型輸出，跑 lookup 草稿迴圈，記錄草稿是否吻合、草稿耗時與靜態快取載入時間；它不是讓一個模型實際回答問題的完整對話 benchmark。作者報告三次執行的中位數，並以 4096 token context 模擬環境。

原始工作先移除每輪草稿時不必要的內層 map 複製，接著把外層 `std::unordered_map` 換成較快、分段成長的 flat hash map，再把多數很小的內層 map 改為排序 vector 與固定步數的二分搜尋。對不再改動的 static cache，他再以 Daniel Lemire 的 `constmap` 與連續的 token-count 陣列取代可變 map；完整 541MB 語料的靜態快取載入，文中從 3.76 秒降到 0.23 秒，且快取峰值記憶體下降。這一組改動使作者最初報告 prompt lookup 草稿最高約 42 倍加速，並可降低記憶體占用。

後續 Lemire 的 precheck 更直接：在逐一計算所有候選分數之前，先檢查 n-gram 的總計數是否已達最低門檻；若最高頻後繼 token 也不可能達到比例門檻，其餘候選更不可能通過，整批分數計算可以跳過。作者稱，這個額外 PR 在既有優化上，讓有 static cache 的草稿最高再快 4.2 倍，合計可達最高 140 倍 drafting speed。因為它改的是失敗候選的判斷順序而非 lookup 規則，評估的接受率預期不變，作者亦以近乎相同的 acceptance rate 檢查結果。不過，這不等於所有使用者推論快 140 倍，也不能據此宣稱改動已合併進 llama.cpp 上游；本文來源只能支持作者的實驗、PR 與範例文件所描述的範圍。

## 城武觀點

本地推論最廉價的敘事，是把最快的子迴圈當成整個體驗。草稿延遲可以快 140 倍，卻不替目標模型的驗證付帳，也不替低接受率、快取建置與載入、常駐記憶體，或使用者真正在跑的 RAG、長對話與工具呼叫付帳。效能宣稱應拆成四張帳：drafting latency、verification／acceptance、cache build/load/memory，以及實際工作負載的 E2E。否則「本地更快」只是把成本藏到沒被量的欄位。

*城武的未解檔案——最快的草稿，不是最快的回答；未被列入 benchmark 的那段時間，才最容易被行銷拿走。*

## 來源

- [Hayder Tirmazi：42x Faster Prompt Lookup Drafting in llama.cpp](https://jadidbourbaki.github.io/blog/prompt-lookup-llama-cpp/)
- [llama.cpp：examples/lookup README](https://github.com/ggml-org/llama.cpp/blob/master/examples/lookup/README.md)
- [Hacker News 討論串](https://news.ycombinator.com/item?id=49859982)
