---
layout: post
title: "【深度分析】Mistral Small 4：128 專家的統一者，把推理、多模態、編碼塞進一顆模型"
date: 2026-06-20 00:00:00 +0000
categories: [llm, ai, deep-analysis]
---

![Hero]({{ site.baseurl }}/assets/images/2026-06-20-mistral-dual-release-hero.jpg)

Mistral 在三月端出了一顆不太一樣的模型。Small 4 不是單純的「更強版 Small 3」——它把 Magistral（推理）、Pixtral（多模態）、Devstral（編碼 agent）三個旗艦能力全塞進同一顆 119B 參數的 MoE 裡，而且只需要 6B 活躍參數就能跑。聽起來像魔術，但真正有趣的，是它怎麼做到的。

## MoE 128/4：參數藏在櫃子裡，但只打開 4 個抽屜

Mistral Small 4 用的是 Mixture of Experts（MoE）架構，總共塞了 128 個專家，但每次前向傳播只啟動其中 4 個。總參數量 119B，每個 token 僅需 6B 活躍參數（含 embedding 和 output layer 則為 8B）。意思是它腦子裡裝了逼近 120B 模型的知識量，但每一句話的推理成本理論上只跟 6B-8B 模型差不多——至少再理論上如此。

![MoE 架構圖]({{ site.baseurl }}/assets/images/2026-06-20-mistral-moe-architecture.svg)

上下文視窗支援 256K tokens，夠吃一整份 codebase 或一疊論文。

## Reasoning Effort 參數：同一顆模型，兩個性格

Small 4 最有趣的設計是 `reasoning_effort` 參數——讓開發者在速度與深度之間切換：

```python
reasoning_effort="none"   # 秒回，像 Mistral Small 3.2
reasoning_effort="high"   # 慢慢想，像過去的 Magistral 推理模型
```

這意味著你不需要在 app 裡維護兩顆模型——同一顆 Small 4，調個參數就能從「聊天機器人」切到「數學家教」。

## 效率與跑分：輸出越短，贏面越大

跟 Small 3 比，端到端延遲降低了 40%，每秒請求數提升 3 倍。這些數字背後是 MoE 架構最佳化加上 NVIDIA 的推理引擎合作。

真正亮眼的 benchmark 數據有兩個：

**AA LCR（長文本檢索正確率）**：Small 4 拿到 0.72 分，輸出只用了 1.6K 字元。同樣的分數，Qwen 家族要吐出 5.8K 到 6.1K 字元——多花 3.5 到 4 倍的輸出量。

**LiveCodeBench（程式碼生成）**：Small 4 贏過 GPT-OSS 120B，而且輸出量少了 20%。

Mistral 的結倫很清楚：輸出越短，延遲越低，成本越少，體驗越好。

## 部署硬體：Apache 2.0 的靈魂，NVIDIA 的身體

Small 4 以 Apache 2.0 授權完全開源，Hugging Face 抓得到，vLLM、llama.cpp、SGLang、Transformers 都支援。但官方說的硬體最低需求是 4 張 H100、2 張 H200、或 1 台 DGX B200；推薦配置直接翻倍。Mistral 也是 NVIDIA Nemotron Coalition 的創始成員——這解釋了為什麼推理優化清一色綁在 NVIDIA 生態上。

定價方面，Mistral API 每百萬 token 輸入 $0.10、輸出 $0.30，放在開源模型裡非常有競爭力。可用平台包括 Mistral API、AI Studio、Hugging Face、以及 NVIDIA build.nvidia.com 免費試用、NIM 生產部署、NeMo 微調。

目標使用者橫跨開發者（編碼自動化、agent 工作流）、企業（客服、文件理解）、研究員（數學、科學推理）——一顆模型打三個市場。

## 城武觀點

Small 4 的「119B 總參數 / 6B 活躍」聽起來像魔法，但 `reasoning_effort` 參數的存在洩漏了 MoE 的代價——128 個專家的路由開銷是真實的，不是免費午餐。當你選擇 high 模式時，模型需要在 128 條路徑中找出 4 條最佳路線，這個決策本身就有計算成本。MoE 從來不是參數量的革命，是路由策略的革命。

更值得追問的是：Apache 2.0 開源了，但部署建議清一色 NVIDIA——從 H100、H200 到 DGX B200，沒有 AMD 沒有 Intel 沒有雲端自研晶片。Mistral 加入 Nemotron Coalition 讓這個關係更明顯——開源模型的最佳路徑，仍被私有硬體壟斷。當開源的出口只剩一條封閉道路，開放權的意義就打了折扣。

*城武的未解檔案——128 個專家只開 4 個，但路由那 128 條路的開關，不在你手上。*

- 原文：[Introducing Mistral Small 4](https://mistral.ai/news/mistral-small-4/)（Mistral AI, 2026-03-16）
