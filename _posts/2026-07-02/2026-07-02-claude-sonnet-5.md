---
layout: post
title: "【深度分析】Claude Sonnet 5：沒漲價的漲價，與被回收的控制權"
date: 2026-07-02 01:00:00 +0000
categories: [llm, ai, deep-analysis]
---

![hero]({{ site.baseurl }}/assets/images/2026-07-02/2026-07-02-claude-sonnet-5.jpg)

Anthropic 在 2026 年 6 月 30 日發布了 Claude Sonnet 5，官方說這是「迄今最有 agent 能力的 Sonnet」，效能接近 Opus 4.8、價格不變。但如果你只讀到這裡，你會錯過三件事：一個偽裝成技術升級的實質漲價、一次以「簡化」為名的控制權回收，以及一張系統卡裡最誠實的一句自白。這三件事，才是今天這篇文章真正要拆的。

## 原文摘要

Claude Sonnet 5 是 Anthropic 在 2026 年 6 月 30 日發布的新一代中型模型，官方定位為「迄今最有 agent 能力的 Sonnet」，效能接近 Opus 4.8，但價格維持在 Sonnet 4.6 的水準。在代理搜尋（BrowseComp）和電腦操作（OSWorld-Verified）兩項 benchmark 上，Sonnet 5 對比上一代 Sonnet 4.6 全面提升；若開啟高努力（high effort）設定，表現可匹敵 Opus 4.8。

Anthropic 引述了多位早期使用者的回饋。ClickHouse 表示 Sonnet 5 的推理步驟更緊湊、更快抵達正確答案。Lovable 指出在維持同樣輸出品質的前提下，所需的推理步驟減少了，而且對不安全請求的拒絕反應乾淨且一致。一位 Rust 工程師回報 Sonnet 5 在無任何人為提示的情況下，自己寫了重現測試、找到 bug、修復，並執行了 git stash 做驗證。Pace 使用 Sonnet 5 進行電腦操作代理，跑保險工作流時持續選對正確動作。法律科技公司 Eve 則認為 Sonnet 5 在法律研究分析場景中是性價比最佳的選擇。

在安全方面，Anthropic 表示 Sonnet 5 的不當行為比率低於 Sonnet 4.6，對惡意請求的拒絕能力以及對提示注入攻擊的抵抗力都有提升。但官方也坦承，幻覺率（hallucination）和諂媚率（sycophancy）仍然是需要持續關注的問題。

系統卡中有一句關鍵表述：「Sonnet 5 的資安能力明顯低於 Mythos 5，因此不需要類似 Fable 5 的分類器——安全措施和 Opus 4.7/4.8 類似。」這句話表面上是安全說明，實際上透露了模型出口管制的真正評估標準。

開發者 Simon Willison 在他的部落格上詳細拆解了 Sonnet 5 的 API 變更。首先是參數層面：Sonnet 5 的 API 不再支援 temperature、top_p、top_k 這三個取樣參數，開發者無法再手動調整模型輸出的隨機性。其次，adaptive thinking 功能預設開啟，除非開發者手動關閉。模型支援 100 萬 token 的 context window，最大輸出為 128K token，工具和平台功能與 Sonnet 4.6 相同。

定價方面，Anthropic 宣布 Sonnet 5 的 API 價格與 Sonnet 4.6 完全一致：每百萬輸入 token 收費 3 美元，每百萬輸出 token 收費 15 美元（在 2026 年 8 月 31 日前有優惠價，分別為 2 美元和 10 美元）。但真正的關鍵藏在一個技術細節裡：Sonnet 5 使用了新的 tokenizer，導致「相同輸入文本產生約 30% 更多的 token」。

Simon Willison 親自做了 token 計數的跨模型比較。他以四份文本進行測試——世界人權宣言英文版、西班牙文版、簡體中文版，以及一個 4,279 行的 Python 檔案（sqlite_utils/db.py）。結果顯示：英文文本在 Sonnet 4.6 上是 2,356 token，到了 Sonnet 5 變成 3,341 token，增幅高達 1.42 倍。西班牙文從 3,572 增加到 4,747 token，增幅 1.33 倍。Python 程式碼從 44,014 增加到 56,113 token，增幅 1.27 倍。唯獨簡體中文幾乎持平：Sonnet 4.6 是 3,334 token，Sonnet 5 是 3,360 token，增幅僅 1.01 倍。

Simon 的結論很直接：英文用戶實質上多付了約 40% 的費用，西班牙文用戶多付 33%，程式碼用戶多付 28%，但中文用戶幾乎不受影響。至於實際使用體驗，Simon 只給了一個簡短的評價：他請 Sonnet 5 畫一隻騎腳踏車的 pelican（鵜鶘），但模型畫出來的是一隻鵝——「沒什麼好寫的，Sonnet 5 覺得那看起來像鵝。」

最後，Simon 對系統卡那句話的解毒是：「這解釋了為什麼模型能發布而不被美國政府阻擋。」換句話說，出口管制的那條線，不是 Anthropic 畫的，但 Anthropic 很清楚那條線在哪裡。

## 城武觀點

### 1. Tokenizer 的定價魔術：漲價就漲價，不要假裝沒漲

Anthropic 說「價格不變」，技術上沒說謊——每百萬 token 的美元標價確實一樣。但換了新 tokenizer 之後，同樣一段英文文本從 2,356 token 膨脹到 3,341 token，實質漲價 42%。帳單不寫在定價表上，藏在 tokenizer 的技術細節裡。這不是技術決策，是定價策略偽裝成技術決策。

最值得追問的是：中文用戶幾乎不受影響，token 增幅只有 1.01 倍。這不是巧合。中國市場是 Anthropic 極度想搶的市場，連中文用戶一起漲等於親手把客戶推給 DeepSeek 和 Qwen。所以漲價效果只針對既有市場——那些以經綁在 Claude 生態系裡、轉換成本高的英文和程式碼用戶。漲價不是問題，不承認你在漲價才是。

### 2. 幫你決定，不是幫你簡化

temperature、top_p、top_k 被拔掉，adaptive thinking 預設開啟。Anthropic 的說法是「提供更一致的體驗」，但城武的翻譯是：這和 Fable 5 的安全分類器同一套邏輯——「你不需要控制，我們幫你決定。」

temperature 是開發者控制模型創造力與確定性的最基本手段。寫程式要 temperature=0，腦力激盪拉到 0.8。拔掉它等於告訴開發者：「我們比你更清楚你需要什麼。」這是用戶控制權的系統性回收，不是 UX 簡化。今天拔 temperature，明天會不會連 system prompt 都不讓你寫？這不是滑坡——OpenAI 以經在調低 GPT-5 的 system prompt 優先級了。Anthropic 只是換了更溫柔的方式走同一條路。

### 3. 全篇最誠實的一句話，藏在系統卡裡

「Sonnet 5 的資安能力明顯低於 Mythos 5，因此不需要類似 Fable 5 的分類器。」

這句是整篇公告最誠實的自白。不是因為它證明 Sonnet 5 安全，而是因為它承認了出口管制的真正標準：不是「模型安不安全」，是「模型夠不夠危險」。Fable 5 踩到了美國商務部的紅線所以上分類器，Sonnet 5 沒踩所以不用。安全措施的強度，不是 Anthropic 的安全理念決定的，是那條政府畫的線決定的。

那條線是誰畫的？美國商務部。用什麼標準畫的？我們不知道。誰有發言權？不是我們。Anthropic 非常清楚那條線在哪裡——他們只是沒有義務告訴你。這才是讓開發者最不舒服的地方：所有「安全決策」的背後，都有一個你無法參與的政府標準在運作。

*城武的未解檔案——定價不變，是你付的 token 變了；參數簡化，是你的選擇權被簡化了。而全篇最誠實的一句自白，藏在沒有人讀的系統卡裡。*

- 原文：[Introducing Claude Sonnet 5](https://www.anthropic.com/news/claude-sonnet-5)（Anthropic, 2026-06-30）
- 原文：[What's new in Claude Sonnet 5](https://simonwillison.net/2026/Jun/30/claude-sonnet-5/)（Simon Willison, 2026-06-30）
