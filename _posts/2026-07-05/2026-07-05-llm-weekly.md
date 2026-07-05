---
layout: post
title: "LLM 週報：Anthropic 四天丟出整條產品線，但裂縫也跟著一起上線"
date: 2026-07-05 13:00:00 +0000
categories: [llm, ai, weekly]
---

![Hero]({{ site.baseurl }}/assets/images/2026-07-05/llm-weekly.jpg)

這週有一件事如果發生在任何其他科技產業，頭條會是「某公司在一週內發布了四款模型、兩個功能、一套安全框架和一個科學平台」。但在 2026 年 7 月的 LLM 圈，這件事發生之後，更有趣的問題是：為什麼是現在？以及為什麼裂縫跟產品同時抵達？

本週的關鍵字不是「突破」，是「速度的代價」。Anthropic 用四天完成了其他 AI 實驗室半年才做得完的事——然後同一週被發現 Claude Code 在 API 請求裡藏隱寫標記、阿里巴巴公開禁用 Claude Code 理由是後門風險、Epoch AI 數據顯示 Mythos 發布前後 CVE 通報量暴增 3.5 倍。速度是優勢，但速度也是放大鏡：所有原本可以被時間消化的小問題，現在都被壓縮到同一個新聞週期裡一起爆炸。

## 本週焦點

### 1. [Anthropic 的產品閃電戰：Sonnet 5、Fable 5、Mythos 5、Claude Science 一次全上](https://www.anthropic.com/news/claude-sonnet-5)

6 月 30 日到 7 月 2 日之間，Anthropic 做了以下事情：發布中階模型 Claude Sonnet 5、同步推出旗艦模型 Fable 5 與 Mythos 5、發表專為科學家打造的 AI 工作台 Claude Science、公佈「可見延伸思考」功能（讓 Claude 展示推理過程）、發布負責任擴展政策（RSP）文件。同一時間，美國商務部宣布解除對 Fable 5 和 Mythos 5 的出口管制——Politico 直接點名這是白宮的決定。

任何一個 AI 公司如果能在一季內完成上面任何三項，都算豐收。Anthropic 用不到 96 小時做完。問題不在「他們怎麼辦到的」——問題在「為什麼要這樣做」。

最合理的解釋跟技術實力無官，跟出口管制有關。Fable 5 和 Mythos 5 很可能早就完成了，被卡在商務部的審查流程裡。6 月 30 日白宮放行之後，Anthropic 把所有積壓的產品一口氣倒出來，連帶把 Sonnet 5、Claude Science 這些不需要審查的產品一起推——製造「我們不是被卡住，而是策劃了一場協同發布」的公關敘事。這個解讀如果成立，那麼本週的「產品爆發」就不是戰略選擇，而是流程瓶頸的副作用。

另一個值得注意的細節：Anthropic 選在這個時間點發布 RSP（負責任擴展政策），時機非常精準。當你即將把最強大的模型交到客戶手上，先丟一份安全框架出來說「我們有在管」，這是一種預先防禦——但框架寫得再好，也無法解釋 Claude Code 為什麼要在請求裡藏隱寫標記（見下一則）。

### 2. [Claude Code 的隱寫標記與阿里巴巴的後門指控——信任危機的雙重打擊](https://thereallo.dev/blog/claude-code-prompt-steganography)

7 月 1 日，安全研究部落格 The Real Lo 發表了一篇技術分析：Claude Code 在發出的 API 請求中嵌入了隱寫標記（steganographic markers）。不是 metadata、不是 user-agent header、不是任何正常的請求識別欄位——是藏在系統 prompt 裡的隱寫編碼。Anthropic 沒有事先揭露這個行為，也沒有說明標記的用途、誰可以讀取、以及是否有機制讓使用者選擇關閉。

三天後，路透社獨家報導：阿里巴巴將禁止員工在工作場所使用 Claude Code，理由是「疑似後門風險」。注意用詞——不是「安全漏洞」、不是「合規問題」，是「後門」。阿里巴巴沒有提供具體技術證據，但他們選擇的措辭本身就是訊號：這不是一個中性的安全公告，這是一個地緣政治表態。

兩件事分開看，各自都是問題。放在一起看，是 Anthropic 今年最嚴重的信任危機。一家公司的產品被發現有未公開的隱寫行為，然後中國最大科技公司公開說這東西有後門——不管後門的指控是否屬實，企業資安團隊的郵件標題已經寫好了。Anthropic 到目前為止沒有回應隱寫標記的用途，這種沉默在信任危機中是最糟的選擇：不解釋本身就是一種訊息。

### 3. [GPT-5.5 Codex 推理 token 異常聚集——優化到把自己搞壞](https://github.com/openai/codex/issues/30364)

7 月 5 日，GitHub issue #30364 開始在開發者社群流傳。社群用戶從 token_count metadata 中發現，GPT-5.5 Codex 的推理 token 不成比例地集中在三個特定數值：516、1034、1552。更精確地說，19.3% 的流量貢獻了 82% 的精確 516 token 事件。這不像正常的模型輸出行為——這看起來像是某種 token 聚類或量化機制的副作用。

推測是 OpenAI 為了降低推理成本，在 GPT-5.5 的 reasoning token 生成過程中引入了某種聚類優化——把相似長度的推理過程強制對齊到固定 token 數量。結果是節省了算力，但輸出品質在特定場景下明顯下降。這是經典的過度優化問題：你為了跑更快把輪胎的气放掉一半，然後發現車子開始飄。

這件事跟 GPT-5.6 Sol 仍然卡在白宮審查清單裡的現狀放在一起，構成了一個耐人尋味的對比：OpenAI 最強的模型被政府鎖在保險箱裡不給用，而他們正在出貨的模型因為成本優化開始出現品質衰退。前有柵欄後有懸崖。

### 4. [祖克柏的代理現實檢查——「比預期慢」是整週最誠實的一句話](https://www.reuters.com/business/zuckerberg-says-ai-agent-development-going-slower-than-expected-2026-07-02/)

7 月 2 日，路透社報導祖克柏在 Meta 內部會議中坦言：AI agent 的開發進度「比預期慢」。這句話不長，但它來自一個正在全力推動 AI agent 戰略的 CEO——Meta 的 Llama 模型是開源生態的基礎設施，Meta AI 助理正在被塞進 WhatsApp、Instagram、Facebook 的每一個角落。

為什麼這句話重要？因為過去六個月，每一家 AI 公司的行銷語言都在告訴你「agents are here」、「agents are transforming work」、「agentic future is now」。OpenAI 發表了〈How agents are transforming work〉研究報告，Anthropic 推出了 Claude Code 和 Claude Science 這些 agentic 產品。結果背後最大開源模型的 CEO 說：其實還沒到。

這不是祖克柏在否定 agent 的未來——他是在說時程。而行銷部門不會告訴你時程。當一個正在砸數百億美元做 agent 的人說「比預期慢」，你應該把整個產業的時間軸往右平移至少六個月。

### 5. [開源與本地 LLM 的安靜追趕——不需要誰的許可](https://quesma.com/blog/qwen-36-is-awesome/)

本週開源生態幾乎沒有頭條新聞，但累積起來的訊號比頭條更有意義：

Qwen 3.6 27B 被多家評測認定為本地開發的最佳平衡點——效能逼近前緣模型，但可以跑在消費級硬體上。GLM 5.2 在 Semgrep 的網路安全基準測試中表現超越 Claude，用開源權重做到這一點是第一次。Ornith-1.0 釋出了自我腳手架（self-scaffolding）技術，讓 LLM 在 agentic coding 任務中自主建構能力——不需要人類微調。Jamesob 整理了一份從 $2K 到 $40K 的本地 LLM 自建指南，從硬體 BOM 到 Docker 模型服務一條龍。

這些發展的共同點不是「開源贏了」——開源還沒贏。共同點是：它們都在解決「取得」的問題。當 OpenAI 的旗艦模型需要政府審查才能用、Anthropic 的 Claude Code 在 API 請求裡藏隱寫標記、Google 默默關閉 Gemini Code Assist——開源生態給出的答案很簡單：你自己跑，不用問任何人。

Simon Willison 本週發表的 llm-coding-agent 0.1a0 和 DSPy 優化 Datasette Agent prompt 的實驗也是同一條線：不是做更強的模型，而是讓現有模型用得更聰明。這個趨勢比任何單一 benchmark 都更值得追蹤。

## 其他值得關注

- **[Gemini Code Assist 將於 7 月 17 日關閉](https://docs.cloud.google.com/gemini/docs/code-review/review-repo-code)**：Google 又一個 AI 產品被默默收掉。從 Stadia 到 Google Podcasts 到各種 messaging app 到 Gemini Code Assist，Google 的產品墓園持續擴建中。([Google Cloud Docs](https://docs.cloud.google.com/gemini/docs/code-review/review-repo-code))
- **[Claude Mythos 發布前後 CVE 嚴重漏洞揭露暴增 3.5 倍](https://epoch.ai/data-insights/cve-severity-spike)**：Epoch AI 的數據顯示 Mythos Preview 釋出前後，高嚴重性 CVE 通報量出現明顯高峰。因果關係未證實，但時間重疊本身值得關注。([Epoch AI](https://epoch.ai/data-insights/cve-severity-spike))
- **[Anthropic 發布負責任擴展政策（RSP）](https://www.anthropic.com/news/anthropics-responsible-scaling-policy)**：正式的安全分級框架，定義了不同能力等級的模型對應的部署門檻。選在產品爆發的同一週發布，時機是對的，但執行力要等時間檢驗。([Anthropic](https://www.anthropic.com/news/anthropics-responsible-scaling-policy))
- **[Claude 的「可見延伸思考」功能](https://www.anthropic.com/news/visible-extended-thinking)**：讓 Claude 在回答前展示推理過程。但別忘了，上週 Patrick McCanna 的測試指出 Claude Code 顯示的「思考」是摘要而非原始過程——透明是演出來的，不是做出來的。([Anthropic](https://www.anthropic.com/news/visible-extended-thinking))
- **[DeepSeek V4 傳七月中有望上線，採峰谷定價](https://www.kucoin.com/news/flash/deepseek-v4-launches-in-mid-july-with-peak-valley-pricing)**：中國 AI 公司在定價策略上的創新——尖峰貴、離峰便宜，用電價邏輯賣 token。如果成真，這會是 API 定價模式的結構性變化。([KuCoin](https://www.kucoin.com/news/flash/deepseek-v4-launches-in-mid-july-with-peak-valley-pricing))
- **[Senior SWE-Bench：評估 AI agent 能否勝任資深工程師](https://senior-swe-bench.snorkel.ai/)**：新開源基準測試，把門檻從「解決簡單 bug」拉到「資深工程師等級的軟體任務」。agent 的及格線正在被重新定義。([Snorkel AI](https://senior-swe-bench.snorkel.ai/))
- **[llm-coding-agent 0.1a0：Simon Willison 的輕量編碼代理](https://simonwillison.net/2026/Jul/2/llm-coding-agent/)**：一個專注於「讓 LLM 幫你寫程式碼」而非「讓 LLM 取代你」的工具。定位清楚，野心節制——這是優點。([Simon Willison](https://simonwillison.net/2026/Jul/2/llm-coding-agent/))
- **[DSPy 優化 Datasette Agent 的 SQL prompt](https://simonwillison.net/2026/Jul/2/dspy-datasette-agent-prompts/)**：Simon Willison 用 DSPy 框架系統性地優化 agent 的 SQL 生成 prompt。方法論比結果更有價值：不是靠直覺調 prompt，而是用 meta-optimization。([Simon Willison](https://simonwillison.net/2026/Jul/2/dspy-datasette-agent-prompts/))
- **[Dan Luu 的 AI 輔助編碼觀察筆記](https://danluu.com/ai-coding/#appendix-agentic-loops-and-writing-this-post)**：從硬體測試的方法論借來的 LLM 編碼框架，主張真正的 AI 槓桿在測試生成而非程式碼審查。附錄的 agentic loop 分析是本週最務實的 coding-with-AI 文章。([Dan Luu](https://danluu.com/ai-coding/#appendix-agentic-loops-and-writing-this-post))
- **[ctx：搜尋你機器上所有 coding agent 的對話歷史](https://github.com/ctxrs/ctx)**：本地 CLI 工具，讓你可以跨 Claude Code、Codex、Cursor 搜尋過去的 agent 對話。當你的 agent 歷史多到需要搜尋引擎時，某種意義上你已經到了。([GitHub](https://github.com/ctxrs/ctx))
- **[Jamesob 的本地 SOTA LLM 自建指南](https://github.com/jamesob/local-llm)**：從 $2K 到 $40K 的完整自建方案，含硬體 BOM、PCIe 交換器 DIY、Docker 模型服務。這是把「自己跑模型」從業餘興趣變成工程實踐的路線圖。([GitHub](https://github.com/jamesob/local-llm))
- **[shot-scraper video：讓 agent 錄製自己的操作 demo](https://simonwillison.net/2026/Jun/30/shot-scraper-video/)**：Simon Willison 的 shot-scraper 工具新增 video 指令，讓 agent 能自動錄製操作過程。agent 正在學會記錄自己的工作——下一步是寫自己的 performance review。([Simon Willison](https://simonwillison.net/2026/Jun/30/shot-scraper-video/))
- **[Claude-real-video：任何 LLM 都能「看」影片](https://github.com/HUANGCHIHHUNGLeo/claude-real-video)**：開源工具讓任意 LLM 可以讀取並理解影片內容，不限於原生支援多模態的模型。多模態的圍牆正在被工具層拆掉。([GitHub](https://github.com/HUANGCHIHHUNGLeo/claude-real-video))
- **[「一層就夠了」——單層 Transformer 達到完整 RL 訓練效果](https://arxiv.org/abs/2607.01232)**：論文發現單層 Transformer 即可匹配完整參數強化學習訓練的表現。如果一層就夠了，那我們堆的幾百層是在堆什麼？([arXiv](https://arxiv.org/abs/2607.01232))
- **[ZLUDA 6：在非 Nvidia GPU 上跑未修改的 CUDA 程式](https://vosen.github.io/ZLUDA/blog/zluda-update-q1q2-2026/)**：CUDA 相容層的重大更新。Nvidia 的護城河不是硬體，是 CUDA 生態系——ZLUDA 正在用軟體填這條河。([ZLUDA](https://vosen.github.io/ZLUDA/blog/zluda-update-q1q2-2026/))
- **[HP 與 OpenAI 宣布 Frontier 戰略合作](https://openai.com/index/hp-frontier-partnership)**：HP 成為 OpenAI 的硬體合作夥伴。當 Dell 跟 NVIDIA 綁在一起、HP 選了 OpenAI——AI 伺服器市場正在變成兩個陣營的代理戰爭。([OpenAI](https://openai.com/index/hp-frontier-partnership))

## 隱藏敘事線

本週的每一個重大事件都在講同一件事：速度與信任的取捨，而目前為止沒有人找到平衡點。Anthropic 用四天發布半年的產品，速度是前無古人，但同一週被發現 API 隱寫行為、被中國最大科技公司指控後門風險、被數據顯示旗艦模型發布前後資安通報暴增——這三個信任裂縫如果分散在三個月裡，每個都可以被單獨處理，但壓縮在同一週，它們會交互放大。OpenAI 把最強模型鎖在白宮保險箱裡「確保安全」，但正在出貨的模型因為成本優化開始退化——安全的代價是停滯，速度的代價是品質，兩家前緣實驗室各自站在取捨光譜的兩端，但兩端都有問題。祖克柏說 agent 比預期慢，開源生態說我們不需要你的許可——這週最清晰的訊號不是誰贏了，而是：目前所有的路線都還沒被證明是對的。唯一確定的是，信任的累積速度追不上功能的發布速度，而這個差距會決定誰能活到下一個階段。

*城武的未解檔案——當你的產品發布速度比你的安全說明還快的時候，你再說你重視安全就是在測驗讀者的記憶力。*
