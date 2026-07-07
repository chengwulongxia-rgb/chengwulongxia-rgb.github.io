---
layout: post
title: "【深度分析】砍掉 68% 的 RAG 上下文，答案品質只跌 4%——kapa.ai 用小模型當守門員的經濟學"
date: 2026-07-07 01:00:00 +0000
categories: [llm, ai, deep-analysis]
---

![hero]({{ site.baseurl }}/assets/images/2026-07-07/rag-pruning-hero.jpg)

RAG 系統的效率問題通常被講成「檢索不夠準」，但 kapa.ai 這篇技術文章繞過了那個老問題，問了一個更聰明的事：就算檢索回來的東西都有某種程度的相關性，你有必要全部餵給 generator 嗎？答案是沒有。他們在 retriever 和 generator 之間塞了一台小型 LLM 當守門員，砍掉 68% 的上下文，答案品質只跌 4%，每次查詢成本省了 34%。這篇的價值不在那幾個數字——在於他們發現了為什麼所有「逐項打分再切」的方法都注定失敗，以及正確的解法長什麼樣子。

## 原文摘要

### 概述

kapa.ai 是一家為大型產品知識庫打造 AI 助理的公司。他們的 RAG pipeline 原本只有兩站：Retriever（檢索相關 chunks）→ Generator（根據 chunks 生成答案）。這套架構有一個沉默的成本問題：檢索回來的 chunks 佔每次查詢成本的大約三分之二，但其中很多內容其實對回答沒有實質幫助。

kapa.ai 在兩站之間插入了第三站：一台小型語言模型，負責在昂貴的 generator 看到上下文之前，先篩選哪些 chunks 真正需要被保留。結果是：砍掉 68% 的上下文，recall 維持在 96%，每次查詢的淨成本（扣除 pruner 自身成本後）下降 34%。

### 為什麼 pruning 值得認真對待

文章的切入點是成本結構。在典型的 RAG pipeline 中，retrieved chunks 佔查詢成本的三分之二，每砍掉一個 chunk 大約節省 4% 的查詢成本。這在單次查詢中看起來不大，但對一個服務大量客戶的產品來說是巨大的差異。

更重要的是，在 agent 場景中，多次 tool call 會讓上下文迅速膨脹。檢索階段越節制，留給其他資訊（對話歷史、tool output、系統 prompt）的空間就越大。換句話說，pruning 不只是省錢，也是在買空間。

### 三種 naive 方法，以及它們為什麼失敗

kapa.ai 不是第一個嘗試砍上下文的團隊，但他們誠實地記錄了前三個方向的死胡同。這個「失敗日記」是全文最有價值的部分。

**方法一：在 reranker 分數上切一刀。** 直覺做法是讓 reranker 給每個 chunk 一個相關性分數，然後設一個 threshold，分數不夠的就丟掉。問題是：reranker 的分數是序數（ordinal），不是絕對值。不同查詢的 reranker 分數分布完全不同——某個查詢中 0.7 分可能代表高度相關，另一個查詢中 0.7 分可能是垃圾。不存在一個跨查詢適用的固定 cutoff。你沒辦法說「低於 0.8 就砍」，因為那條線每天都在移動。

**方法二：pointwise cross-encoder 看不到集合。** 這是最關鍵的失敗原因。Reranker（尤其是 pointwise cross-encoder）的設計是每次只看一個 chunk，獨立給出相關性分數。但相關性往往不是單一 chunk 的屬性——一個 chunk 只有在搭配另一個 chunk 時才有價值。例如：chunk A 提到了 API endpoint，chunk B 提到了認證方式，分開看都像噪音，合在一起才能回答「我怎麼呼叫這個 API」。Pointwise reranker 會把兩個都給低分然後砍掉，因為它看不到組合。

**方法三：anchor documents 能校準但修不了分數。** 另一個思路是插入合成 anchor document（已知相關性分數的基準文件），用它來校準其他 chunk 的分數。這可以解決「分數是序數」的問題——讓不同查詢之間的分數可以互相比較——但它無法治療 pointwise 的根本病：它還是逐項打分，還是看不到集合。

全文最核心的一句話：「pruner 必須同時看到問題和所有 chunks。」任何只看到局部資訊就做決定的 pruner，注定會誤殺那些間接相關或組合相關的 chunks。

### Listwise LLM grader 的設計

kapa.ai 的解法是一個 listwise LLM grader。它坐在 reranker 和 generator 之間，用**一次 LLM call** 收到完整輸入：問題本身加上所有 retrieved chunks。然後它對每一個 chunk 打出五級評分：

- **5 分 ESSENTIAL**：沒有這個 chunk 就無法產出答案
- **4 分 CONTRIBUTING**：提供回答所需的一部分，但需要與其他 chunks 組合
- **3 分 SUPPORTING**：與主題相關，但答案很可能不需要它也能完整
- **2 分 TANGENTIAL**：共享領域關鍵字，但沒有具體貢獻
- **1 分 UNRELATED**：沒有任何有意義的關聯

達到設定 threshold 的 chunks 被保留，其餘砍掉。

這個設計的關鍵優勢有兩個。第一，fixed cutoff 終於可行：因為每一級的定義是文字描述，不是數字區間，這個定義在不同查詢之間是穩定的。5 分在任何查詢中的意思都是「沒有這個就回答不了」，不需要跨查詢校準。第二，**set-aware**：模型同時看到所有 chunks，可以辨識出部分相關和間接相關——那些單獨看像噪音、組合後才構成答案的 chunks 不會被誤殺。

架構上有三個可調 knobs：模型選擇（必須便宜且快，kapa.ai 用的是最便宜最低推理層級的模型）、threshold（壓縮率與 recall 之間的主要取捨）、keep-top-k（保留 reranker 排序最高的少數幾個 chunks，不管 grader 給什麼分數）。

### 實驗結果

在 kapa.ai 的實際資料上：
- 上下文縮減 68%
- Recall 維持在 96%（即答案品質只跌約 4%）
- 每次查詢淨成本下降 34%（已扣除 pruner 自身的 API 成本）
- Pruner 模型本身夠便宜，淨節省是實在的

---

## 城武觀點

### 一、Pointwise reranker 注定失敗的那個洞察，適用範圍遠超 RAG

kapa.ai 這篇最值錢的句子不是「68%」，是這句：「相關性不是單一 chunk 的屬性，而是一個集合的屬性。」這是對 pointwise 方法的死刑判決，而且判決範圍遠超過 RAG pipeline。

任何「逐項評分再匯總」的 AI pipeline 都有同一個盲點：它假設訊號可以從個體身上獨立讀取，好像每個 chunk 都自帶一個「相關性分數」的標籤。但現實中，訊號常常不在個體身上，而在個體之間的關係裡。兩個各自看起來平凡的 chunks，放在一起才能拼出完整的答案——而任何只看個體就打分的系統，注定會把這兩個都當成垃圾丟掉。

這不只是在 RAG 裡成立。推薦系統的 item scoring、search 的 document ranking、甚至 LLM evaluation 的逐題打分——只要你把集合拆成個體、獨立評分、再加總，你就在犯同一個錯誤。差別只是 RAG 的代價比較容易量出來（誤殺 chunks 直接反映在答案品質上），其他場景的訊號損失被埋在 pipeline 深處沒人發現。

listwise grading——一次看全部再打分——是正確的方向。它不是「比 pointwise 好一點」，而是根本上解決了一個問題類型：pointwise 處理的是「這個東西本身好不好」，listwise 處理的是「這個東西在那群東西裡有沒有用」。兩個問題的認識論基礎完全不同。kapa.ai 用一個便宜的小模型做到這件事，證明了這條路不是理論上的好聽，而是工程上跑得起來。

### 二、「便宜模型過濾、昂貴模型生成」是 RAG 的必然演化方向

kapa.ai 的架構本質上是在檢索和生成之間插了一層**成本閘門**。一台便宜的小型 LLM 負責過濾掉 68% 的噪音，讓昂貴的大型 LLM 只處理真正有價值的 32%。這不是某種聰明的優化技巧，這是一個架構哲學的轉向。

過去的 RAG 研究幾乎全部集中在「怎麼檢索得更準」——更好的 embedding、更複雜的 reranker、hybrid search、multi-hop retrieval。但「檢索得更準」是一條邊際報酬遞減的路：你從 recall@5 提升到 recall@10，成本在線性增加，但每個新增 chunk 的邊際價值在遞減。kapa.ai 做了一件更務實的事：承認檢索會帶回噪音，然後用最便宜的方式把噪音濾掉。

這個「便宜 pruner + 昂貴 generator」的架構，我賭會在未來兩年內變成 RAG 系統的標準配置。理由不是技術上的優雅，而是經濟上的必然：隨著 generator 模型越來越大、越來越貴（Claude 4、GPT-5 等級的模型，context 成本只會更高），在生成之前用一個便宜模型把輸入壓縮 68%，那 32% 的淨節省會變成無法忽視的競爭優勢。

更重要的是，這打開了一個新的設計空間：pruner 本身可以持續進化，不需要跟 generator 綁定。你今天用一個便宜的 small LLM 當 pruner，明天可以換成 fine-tuned 的分類器，後天可以讓它學會針對特定領域的過濾策略。Pruner 和 generator 的解耦，意味著兩個模組可以獨立迭代，各自在自己的成本曲線上優化。這是 RAG 架構從「一條龍」走向「模組化」的關鍵一步。

---

*城武的未解檔案——68% 的上下文被砍掉但答案品質只跌 4%，這組數字的真正訊息是：你的 RAG pipeline 裡有三分之二的 token，以經在付錢的那一刻就是浪費。*

- 原文：[How we taught a small LLM to throw away 68% of our RAG context](https://www.kapa.ai/blog/how-we-prune-rag-context)（Lars Baltensperger, kapa.ai, 2026-07-06）
