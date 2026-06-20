---
layout: post
title: "【深度分析】Mistral 雙響砲：Small 4 統一多模態推理，Agents API 進軍代理平台"
date: 2026-06-20 00:00:00 +0000
categories: [llm, ai, deep-analysis]
---

![hero]({{ site.baseurl }}/assets/images/2026-06-20-mistral-dual-release-hero.jpg)

Mistral 今年動作很密集——三月才發表 Small 4 把三條旗艦產品線塞進一顆模型，五月又推 Agents API 從模型公司從新定義自己為代理平台。兩件事分開看各有道理，擺在一起看就有意思了：Small 4 在架構上追求「一顆模型通吃」，Agents API 卻在生態上追求「綁住你」。這篇把兩件事從頭到尾說清楚。

## Mistral Small 4：最有彈性的小巨人

Small 4 是 Mistral Small 家族的最新成員，但這次不是「更小更快」的例行升級。它把三條產品線——Magistral（推理）、Pixtral（多模態）、Devstral（代理編程）——整合進同一顆模型。以前你要在快速回覆、深度推理、多模態之間選邊站，現在一顆全包。

架構亮點是 Mixture of Experts：128 個專家（expert），每次 token 只喚醒 4 個（top-4 routing）。總參數 119B，但每次推理只有 6B 活躍（含 embedding 和 output layer 約 8B）。128 個專家排排站，只讓 4 個回答問題——聽起來很夢幻，但路由本身也是成本，後面觀點會聊。支援 256K 上下文，原生文字和圖片雙模態輸入。

![MoE 架構圖]({{ site.baseurl }}/assets/images/2026-06-20-mistral-moe-architecture.svg)

最有意思的設計是 **configurable reasoning effort**。一個參數控制模型要思考多深：

- `reasoning_effort="none"`：快速低延遲，接近傳統 instruct 模式
- `reasoning_effort="high"`：深度逐步推理，接近以前的 Magistral

這個參數的存在本身就是暗示：MoE 的路由開銷不只存在於工程文件裡，而是使用者體驗上可以感知到的選擇題。

**效能表現**：跟 Mistral Small 3 比，端到端回應時間減少 40%，每秒請求吞吐量提升 3 倍。在 AA LCR benchmark 上，Small 4 只用了 1.6K 字元輸出就拿到 0.72 分——Qwen 系列要花 3.5 到 4 倍的篇幅（5.8-6.1K 字元）才能追平。少打字還更準，這種成績看著就是舒服。在 LiveCodeBench 上同樣贏過 GPT-OSS 120B，輸出還少了 20%。

**部署就比較現實了。** 開源 Apache 2.0 沒問題，支援 vLLM、llama.cpp、SGLang 等社群工具——但最小硬體需求是 4 張 NVIDIA HGX H100 或 2 張 H200，建議配置是 4 張 H200 或 2 台 DGX B200。最佳化跟 NVIDIA 合作開發。開源是開源了，跑在哪裡是另一回事。

定價方面：輸入 $0.10/百萬 token，輸出 $0.30/百萬 token，相當有攻擊性。

## Agents API：從模型公司轉型平台

五月的 Agents API 是更大的棋。Mistral 不再只想賣模型 API——它想當你整個代理系統的底層基礎設施。

傳統語言模型只能被動回應，無法執行動作或維持跨對話脈絡。Agents API 的解法是：把模型跟一組工具和記憶系統綁在一起出貨。

**內建工具（Built-in Connectors）**：
- 程式執行：沙盒跑 Python，適合數學、分析、資料視覺化
- 圖片生成：背後是 Black Forest Lab 的 FLUX1.1 [pro] Ultra
- 文件庫：上傳文件後做內建 RAG，資料存在 Mistral Cloud
- 網路搜尋：即時查資訊——Mistral Large 搭搜尋後 SimpleQA 從 23% 跳到 75%，Mistral Medium 從 22% 跳到 82%
- MCP 工具：透過開放的 Model Context Protocol 串 API、資料庫、文件

**記憶與狀態管理**：API 原生支援跨對話的 persistent memory，可以從任何時間點繼續對話或開分支，不用自己維護歷史。

**多代理編排（Agent Orchestration）**：定義多個代理，各自掛不同工具和模型。代理之間可以 handoff——金融代理跑完分析後自動轉給搜尋代理交叉驗證。一個請求串聯多個代理，各解一部分問題。

Mistral 附了幾個示範：GitHub 編碼助手、Linear 工單管理、金融分析師、旅遊助手、營養顧問，都有完整 cookbook。

## 城武觀點

Small 4 的 119B / 6B 活躍參數，乍看像魔法——128 個專家只喚醒 4 個，效率夢幻。但 reasoning_effort 參數洩漏了代價：路由開銷是真實的，你以經在付了。每一層路由決策都在吃掉推理時間，這份帳單不會消失，只是從架構帳單轉移到使用者體驗帳單。

更值得警惕的是 Agents API。connectors、handoff、memory——每一項都綁在 Mistral 平台，用越深越難搬走。這不是陰謀，是平台經濟的基本邏輯：把你服務得好好的，然後讓你離不開。開源 Apache 2.0 沒錯，但翻開部署指南從最小到建議配置清一色 NVIDIA。開源模型的最佳路徑，仍然被私有硬體壟斷著——所謂的選擇自由，到頭來還是得過一道門。

*城武的未解檔案——119B 參數躺在 Apache 2.0 的倉庫裡，但通往自由的那條路，鋪的是 NVIDIA 的磚。*

- 原文：[Introducing Mistral Small 4](https://mistral.ai/news/mistral-small-4/)（Mistral AI, 2026-03-16）
- 原文：[Build AI agents with the Mistral Agents API](https://mistral.ai/news/agents-api/)（Mistral AI, 2025-05-27）
