---
layout: post
title: "【深度分析】瀏覽器裡的 1-bit LLM——基礎設施準備好了，但模型還沒"
date: 2026-07-21 03:00:00 +0000
categories: [llm, ai, deep-analysis]
image: /assets/images/2026-07-21/bonsai-1bit-browser-hero.png
---

![hero]({{ site.baseurl }}/assets/images/2026-07-21/bonsai-1bit-browser-hero.png)

如果你最近有在關注瀏覽器端 AI，webml-community 在 Hugging Face 上推出了一個叫做 Bonsai 的 demo：一顆 1.7B 參數的 1-bit 量化 LLM，290MB，直接在瀏覽器裡透過 WebGPU 跑推理。模型品質以經不是重點了——這東西真正的訊號，藏在基礎設施層。WebGPU 現在是一個可行的推理目標，而這件事的意義，遠比那顆 1-bit 模型本身大得多。

## 原文摘要

Bonsai 是一個 Hugging Face Space 上的互動 demo，由 webml-community 維護，技術底層採用 Transformers.js 驅動，目標是在瀏覽器裡透過 WebGPU 執行 1-bit 量化的大型語言模型。Demo 頁面的標語寫著：「14× LESS MEMORY · 8× FASTER · 5× LESS ENERGY」，副標直接宣告：「1-bit LLMs, in your browser.」

目前開放的模型是 Bonsai 1.7B，大小僅 290MB，官方定位為「Pocket-class」，目標場景是穿戴裝置與常駐型代理（always-on agents）。路線圖上還有兩顆更大的模型：Bonsai 4B（584MB），定位為「甜蜜點」，具備裝置端延遲下的推理能力；以及 Bonsai 8B（1.2GB），號稱能提供「資料中心等級的推理」。後兩者目前狀態都是 Coming soon。所有運算都在裝置上完成，頁面明確標示「NO DATA LEAVES YOUR DEVICE」。

1-bit 量化的核心原理，是將模型的每一個權重壓縮為單一的二元值——只有 +1 或 -1，取代傳統的 32 位元或 16 位元浮點數。這樣的壓縮帶來最高 95% 的記憶體需求下降。具體數字：以 1.7B 參數為例，FP16 格式需要 1.7B × 2 bytes = 3.4GB；1-bit 的理論最小值是 1.7B ÷ 8 bits/byte ≈ 212MB，實際檔案落在約 290MB，差距來自 embedding 層、attention 機制以及格式開銷。

這套架構的學術基礎來自 Microsoft Research 的 BitNet 系列。原始 BitNet 論文於 2023 年發表在 arXiv，展示二元權重網路在語言基準測試上可以匹配或接近 INT8 的表現。後續的 BitNet b1.58（2024 年）進一步將權重擴展為三元值 {-1, 0, +1}，以極小的記憶體代價大幅改善了輸出品質。

量化方法的橫向對比非常直觀：以同一顆 1.7B 模型為基準，FP32 約 6.8GB（品質最高，需要 GPU）；FP16 約 3.4GB（接近無損，建議使用 GPU）；INT8 約 1.7GB（輕微退化，GPU 可選）；INT4 約 850MB（中度退化，GPU 可選）；1-bit 落在 212–290MB（複雜任務有意義的退化，不需要 GPU）。

系統需求門檻不高：瀏覽器需要 Chrome 113 或 Edge 113 以上（建議 Chrome 120+），系統記憶體最低 4GB（建議 8GB），不需要獨立顯卡，整合式顯示晶片即可啟用 WebGPU 加速。首次載入需要網路下載模型檔，一般寬頻即可。

實際效能方面，在中階筆電的整合式 Intel 或 AMD 顯示晶片上，透過 WebGPU 可以跑到每秒 5 到 12 個 token；如果降級到純 CPU 的 WASM 模式，速度落在每秒 1 到 3 個 token。推理期間的峰值記憶體使用量約在 500–700MB，完成後會趨於穩定。

品質取捨的誠實說明，才是 Bonsai 頁面最有價值的段落。1-bit 模型在以下任務上會犧牲準確度：多步驟數值推理、精確的事實回憶、長文本的綜合理解。保留的能力則包括：遵循指令、回答單輪問題、改寫文字、分類輸入、維持簡短的連貫對話。頁面直言不諱：與 ChatGPT 或 Claude 的品質差距不是邊緣性的，而是**類別性的**——GPT-4o 估計有數千億參數，Claude 3.5 Sonnet 屬同等級別，在複雜推理、程式碼生成、事實準確性上，1.7B 1-bit 模型完全不在同一個量級。Bonsai 的價值不在品質對等，而在於輕量任務的本地、隱私、零成本推理。

常見的故障情境有三種：WebGPU 不支援（更新瀏覽器，企業裝置可能被 IT 政策關閉 GPU 存取）、載入時分頁崩潰（幾乎都是 RAM 不足，關閉其他分頁即可）、生成速度太慢（到 chrome://gpu 確認 WebGPU 是否已啟用）。

開發者整合方面，底層的推理引擎（llama.cpp 的網頁移植版，或 MLC AI 的 WebLLM runtime）都是開源的。開發者可以將 GGUF 權重檔託管在任何 CDN 上，導入對應的 JavaScript 推理函式庫，用標準 HTML/JS 實作聊天介面，不需要任何後端程式碼。Hugging Face 的 Transformers.js 則提供了更高階的 API 封裝。

## 城武觀點

先把話說清楚：Bonsai 的 1.7B 1-bit 模型，品質爛到你不會想拿它來做任何需要「思考」的事。原文也很誠實地說了，它跟 ChatGPT 的差距是「類別性的」。這沒什麼好辯的。

但這件事真正的價值，跟模型品質一點關係都沒有。

這個 demo 證明的核心命題只有一個：**WebGPU 現在是可行的推理目標了。** 瀏覽器裡跑 LLM 這件事，從「理論上可以」變成了「有個能動的東西擺在那裡給你玩」。Transformers.js 驅動的 WebGPU 推理管線，從模型載入、權重解壓、到 token 生成，整條路徑是通的。這才是 Bonsai 的訊號——不是模型，是管線。

那個行銷標語「14× LESS MEMORY · 8× FASTER · 5× LESS ENERGY」，你必須看清楚它在跟誰比。它比較的對象是**同參數量**的 FP16 模型，不是同任務品質的模型。一顆 1.7B 的 1-bit 模型佔 290MB 沒錯，但一顆 7B 的 INT4 模型只需要 ~3.5GB 就能在大部分筆電上跑，而且回答的品質是碾壓級的。拿記憶體數字來比，是選了一個對自己有利但不誠實的比較維度。

但這不影響我的結論。**我賭這件事。**

基礎設施的成熟是一個不可逆的過程。WebGPU 成為推理目標這條路一旦打開，就不會關回去。瀏覽器廠商有動機持續優化 WebGPU 的機器學習運算效能（Google 自己就在推 Chrome 的 WebNN API），框架層（Transformers.js、WebLLM）會持續降低整合門檻，硬體端每一代整合顯示晶片的 AI 加速單元都在變強。這三條線——瀏覽器 API、框架、硬體——全部往上走，而且方向一致。

模型的問題反而是最好解決的。1-bit 量化技術本身還在快速迭代——BitNet b1.58 從二元進步到三元只花了一年，微軟和學術界對極低位元量化的研究才剛開始加溫。現在 1.7B 在非平凡任務上被 7B INT4 碾壓，但三年後一顆 8B 的 1.58-bit 模型呢？五年後呢？當量化技術從「能用」進步到「好用」，290MB 這個數字會開始對整個生態系產生真正的槓桿。

Bonsai 是 1993 年的 Mosaic。當年 Mosaic 的網頁渲染粗糙到可笑，圖片載入慢到讓人想關掉數據機，但它的意義不是「這東西現在能取代什麼」——它的意義是「從此之後，網頁瀏覽器是一個所有人都要認真對待的平台了」。Bonsai 做了一樣的事：它把瀏覽器端 LLM 推理從概念驗證推進到了「可以玩了」的階段。現在所有人——框架開發者、模型研究者、應用開發者——都可以從新把瀏覽器當成一個推理目標來思考，而不是當成一個「也許五年後可以」的備註。

你不需要現在就去用 Bonsai。你只需要知道：管線通了。接下來的問題，是模型什麼時候追上。

*城武的未解檔案——290MB 的 1-bit 模型不值得你放棄 ChatGPT。但它背後的那條管線，會在三五年後讓你忘記自己曾經需要一台 GPU 才能跑 LLM。*

- 原文：[Bonsai 1-bit WebGPU](https://huggingface.co/spaces/webml-community/bonsai-webgpu)（webml-community, Hugging Face, 2026-07）
