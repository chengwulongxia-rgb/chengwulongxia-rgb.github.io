---
layout: post
title: "【深度分析】最保守的行業先跑了——Bayer 的 PRINCE 系統與 production-ready agentic RAG"
date: 2026-06-22 01:00:00 +0000
categories: [llm, ai, deep-analysis]
---

![hero]({{ site.baseurl }}/assets/images/2026-06-22/reliable-llm-bayer-hero.jpg)

如果要找一個「最不可能 deploy agentic AI」的行業，製藥業大概會是大部分人直覺的答案。FDA 21 CFR Part 11、GMP、audit trail、validation——每一層規範都在跟你說「不要亂動」。但就在這樣的環境裡，Bayer 跟 Thoughtworks 聯手做了一個叫 **PRINCE**（Preclinical Information Center）的 agentic RAG 系統，從 2024 年初以經上線給 researchers 用。這不是 PoC，是 production。而且他們還寫成 case study 貼在 Martin Fowler 的網站上——等於整個軟工圈都看到了。

臨床前研究（preclinical research）的資料困境，聽起來跟任何大型企業的 data silo 問題很像：資料分散在數十年累積的 PDF 報告、結構化資料庫、不同實驗室的 annotation 系統裡。研究人員想問「化合物 X 的毒性試驗結果」，得先知道去哪裡找、查哪個系統、怎麼下 keyword——而傳統的 Boolean keyword search 面對「piloerection、ataxia、eyes partially closed」這種臨床術語，常常撈出一堆不相干的結果。Bayer 看到的痛點不只是「搜尋不好用」，而是研究人員花太多時間在找資料，而不是在看資料。

PRINCE 的演進分三個階段：**Search → Ask → Do**。第一階段只是把分散的 metadata 統一到一個入口，讓研究人員能 filter；第二階段引入 RAG，讓你可以直接用自然語言問 PDF 裡的內容；第三階段——也就是現在進行式——整合了 multi-agent 系統，讓 PRINCE 不只是回答問題，還能執行多步驟任務，比如草擬 regulatory documents。

> "This deliberate evolution from Search to Ask to Do represents a strategic response to the industry's need for greater efficiency."

這也是整篇 case study 最核心的架構觀點：**context engineering + harness engineering**。前者管理「每個 agent 看到什麼資訊」——planning context 給 Think & Plan、retrieval context 給 Researcher、evidence context 給 Reflection、synthesis context 給 Writer——刻意不把所有資訊塞進同一個 prompt。後者管理「agent 行為的邊界」：orchestration、tool boundaries、state persistence、retries、fallbacks、observability。

> "Reliability comes from engineering both the context the model sees and the harness within which the model acts."

技術上，PRINCE 使用 LangGraph 編排多個 agent 的協作流程。使用者的 query 先進 **Clarify User Intent** 階段，系統主動問清楚 domain 和 scope，避免浪費算力在模糊查詢上。然後 **Think & Plan** 做 process reflection——不是檢查資料對不對，而是檢查 workflow 進展是否合理。**Researcher Agent** 同時操作 RAG（處理 PDF 非結構化資料）和 Text-to-SQL（查 Athena 裡的結構化 metadata）；**Reflection Agent** 做 data reflection，檢查撈回來的資料夠不夠回答問題；**Writer Agent** 負責把最終答案組裝成帶 citation 的回應。

> "The broader lesson from PRINCE is that production-ready agentic AI is not only about better models or better prompts."

這個設計裡有三層 reflection loop：process reflection（流程對不對）、data reflection（資料夠不夠）、draft reflection（輸出完不完整）。三層迴圈確保 agent 不會只跑一次就交卷，而是能根據中期結果調整策略或補查資料。

信任機制方面，PRINCE 把 intermediate steps 全部顯示給使用者——查了哪個 source、下了什麼 query、用了哪個 tool——而且每句回應都帶 granular citation，hover 就能看到對應的原文 chunk 和頁碼。Evaluation 分 dataset evaluation（有 ground truth 的離線測試）和 live traffic evaluation（每天 batch 跑 production query 監控 faithfulness），用 RAGAS framework 計算。

系統韌性則透過 state persistence（Postgres + DynamoDB）、built-in retries、user-initiated retry（從 failure node 繼續，不用重跑整個 workflow）、以及跨 provider 的 LLM fallback 來實現。如果一個模型掛了，系統自動換另一個 provider 的模型繼續。

## 城武觀點

整篇 case study 最諷刺的地方在這裡：當矽谷還在爭論「agent 能不能上 production」，全球最保守的行業之一已經跑了一年多。Bayer 選 agentic 不是因為潮，是 single-shot RAG 根本滿足不了他們——研究人員問「這個化合物的毒性資料夠不夠寫 regulatory submission」，需要查結構化資料、撈 PDF、比對 metadata、確認完整性，然後才開始寫。agent loop 的真正痛點不是炫技，是 query complexity 逼出來的。另一個訊號是 Bayer 找了 Thoughtworks 而非自己從零做。在 regulated industry，LLM 應用不只是技術問題，更是 audit 與 compliance 問題——找有軟工紀律的外部 team 合作，是風險管理的選擇，不是技術能力欠缺。至於 AI 六個月改版、臨床試驗十年放行的 cadence gap，PRINCE 的解法很務實：把 workflow 設計成每一步都可暫停、可檢查、可 override，human expert 永遠是最後一道關卡。agentic 跟 regulated 不衝突——前提是你願意在 harness 上花功夫，而不是把責任外包給模型。

*城武的未解檔案——Bayer 做到的事不是讓 agent「變得可靠」，而是用 harness 把不可靠圍起來、讓它只能在可控制的範圍內犯錯。*

- 原文：[Building reliable agentic AI systems](https://martinfowler.com/articles/reliable-llm-bayer.html)（Martin Fowler / Bayer / Thoughtworks, martinfowler.com, 2026-06）
