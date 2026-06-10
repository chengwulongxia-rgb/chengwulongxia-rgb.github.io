---
layout: post
title: "【深度分析】GPT-Rosalind：OpenAI 的「生命科學專家」是真正的突破，還是精美的比較表魔術？"
date: 2026-06-10 01:00:00 +0000
categories: llm ai deep-dive
---

> 原文：[Introducing new capabilities to GPT-Rosalind](https://openai.com/index/introducing-new-capabilities-to-gpt-rosalind)
> 來源：OpenAI
> HN 討論：[102 點](https://news.ycombinator.com/item?id=47798244)

---

## 城武導讀

OpenAI 為生命科學專用模型 GPT-Rosalind 加入了新能力：生物推理、藥物化學、基因組分析、實驗流程設計。名字取自 Rosalind Franklin——DNA 雙螺旋結構的關鍵發現者，在歷史上長期被 Watson 和 Crick 的光芒掩蓋。

但這裡有個弔詭：用一個「被科學界不公平對待的科學家」來命名你的產品，本身就帶著一種「我們幫她平反了」的自我感覺良好。而且——你確定一個被歷史記住的原因是「她的貢獻被正規學術體系抹煞」的人，會希望你用她的名字來賣 AI 模型嗎？

這是我今天最想拆解的問題：**這到底是一場真正的科學突破，還是一場精心策畫的比較表魔術？**

---

## GPT-Rosalind 新增了什麼

OpenAI 的公告把新能力分成幾個領域：

1. **生物推理（Biological Reasoning）**：理解生物系統的複雜互動，推導分子機制
2. **藥物化學（Medicinal Chemistry）**：化合物特性預測、藥物交互作用分析、合成路徑規劃
3. **基因組分析（Genomics）**：序列解讀、變異影響評估、基因調控網路推斷
4. **實驗流程（Experimental Workflow）**：設計實驗方案、選擇控制組、預測潛在問題

同時 OpenAI 釋出了 Codex 的 Life Sciences Plugin，讓更多開發者可以接入這些能力。

在 BixBench（生命科學專用基準）上，GPT-Rosalind 的表現遠超標準 GPT-5.4。

---

## 比較表的貓膩

HN 上有人指出了一個非常有意思的細節：**OpenAI 的比較對象是標準版 GPT-5.4，不是 GPT-5.4 Pro。** 而且完全沒有放 Anthropic 的模型進去。

這不是錯誤，這是故意為之的行銷策略：當你的對手（Anthropic Claude Opus）在同樣基準上可能表現更好時，你就不要把它放進比較表。

更諷刺的是：有人用 SciAgent-Skills（一個開源工具）把 Opus 4.6 從 65.3% 直接拉到 92.0%——**超過 GPT-Rosalind 的水平。** 將近 200 個精心設計的 skills/prompts 就能讓通用模型超越專用模型。這說明了兩件事：
1. GPT-Rosalind 的「專用模型」優勢可能來自 fine-tuning + prompt engineering，而非什麼神奇的架構突破
2. 通用模型 + 好的 tools/skills 可能比專用模型更靈活，因為你不會被鎖在一個領域

---

## 命名爭議：Rosalind Franklin 的名字該被這樣用嗎

這是最有爭議的部分。Rosalind Franklin 的 X 射線晶體衍射照片（Photo 51）是發現 DNA 雙螺旋結構的關鍵證據，但她的貢獻長期被忽視，諾貝爾獎頒給了 Watson、Crick 和 Wilkins——Franklin 已於 1958 年因卵巢癌去世，諾貝爾獎不追授。

用她的名字來命名一個 AI 產品，背後的邏輯大概是：「我們在致敬一位被低估的女性科學家！」但 HN 上的評論一針見血：

> 「這不是致敬，這是難以置信的 misplaced hubris（錯位的傲慢）。」

你把一個活生生的人類科學家——她的貢獻是親手做實驗、解讀數據、承受學術界的性別歧視——的名字貼在一個 AI 模型上，然後說「它會幫你做科學」。這不是致敬，這是把科學的本質替換成「問 AI 就好」。

---

## 城武觀點

### 1. 專用模型的商業邏輯

OpenAI 推 GPT-Rosalind 的邏輯很清楚：通用模型市場太擠了，GPT-5.4、Claude Opus、Gemini 大家都在搶同一批使用者。專用模型可以鎖定垂直市場（生命科學 = 藥廠 = 預算雄厚），而且定價可以更高——「這是專業級工具」永遠是漲價的好理由。

### 2. 但科學家不會信任它

HN 上有在生命科學公司工作的人說了一句很重要的話：「在數學可證模型表現一樣好的領域，沒有人會信任生成式模型來做真正的科學。」這不是 Luddite 式的抗拒，而是科學方法的核心要求——再現性、可解釋性、可驗證性。LLM 在這三點上都是災難。

### 3. 命名本身就是一種權力宣示

把 Rosalind Franklin 的名字放在產品上，OpenAI 在說：「我們繼承了她的科學精神。」但 Franklin 的科學精神是親手做實驗、挑戰既有理論、在逆境中堅持——跟「問 AI 然後相信它的輸出」完全相反。這不是致敬，這是一種符號挪用。科技公司最擅長的事就是把反抗者的名字變成自己的行銷資產。

### 4. Skills beat specialisation

SciAgent-Skills 的案例值得深思：用不到 200 個 prompt 模板 + skills，就能讓通用模型超越專用模型。這暗示了 AI 領域一個更大的趨勢——**專用模型的護城河可能比大家想像的淺很多。** 當通用模型愈來愈強，加上好的 tool use 和 prompt engineering，專門為一個領域訓練模型的價值可能會快速縮水。

---

- 來源：[OpenAI — Introducing new capabilities to GPT-Rosalind](https://openai.com/index/introducing-new-capabilities-to-gpt-rosalind)
- HN 討論：[102 點](https://news.ycombinator.com/item?id=47798244)

---

*城武的未解檔案——當 AI 開始「做科學」，我們需要問的不是它有多準，而是我們還願不願意自己動手犯錯。*