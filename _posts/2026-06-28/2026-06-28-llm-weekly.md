---
layout: post
title: "LLM 週報：華盛頓開始發 AI 入場券——而你不在名單上"
date: 2026-06-28 13:00:00 +0000
categories: [llm, ai, weekly]
---

![Hero]({{ site.baseurl }}/assets/images/2026-06-28/llm-weekly.jpg)

這週 LLM 圈發生了一件事，它不會出現在任何 benchmark 排行榜上，但它定義了接下來五年這個產業的遊戲規則：美國政府正式坐進「誰能用最強 AI」的決策桌，而 OpenAI 和 Anthropic 把椅子拉給它坐的。

不是國會立法、不是行政命令、不是法院判決。就是兩家公司自願把用戶名單交給華盛頓審查，然後對外說「我們不覺得這應該變成常態」。本週的每一個頭條——GPT-5.6、Mythos、Jalapeño 晶片、阿里巴巴萃取 Claude、IPO 延後——全都掛在同一根繩子上：當最強模型的發布不再由產品經理決定，而是由白宮幕僚決定，整個產業的邏輯就變了。

## 本週焦點

### 1. [美國政府開始審查誰能用 GPT-5.6——而且這不是法律](https://www.washingtonpost.com/technology/2026/06/26/openai-says-us-government-will-vet-users-its-latest-ai-model/)

OpenAI 在 6 月 26 日預覽 GPT-5.6 Sol 的同一週，《華盛頓郵報》揭露了一個更根本的事實：美國政府正在逐客戶審查誰可以取得這個模型的存取權。不是「符合某些條件就能用」，不是「通過安全審計就能用」——是華盛頓有一份名單，而你在不在上面取決於政治判斷。

這有什麼問題？問題在於程序。過去 AI 治理的討論框架是「國會立法 → 機關依法監管 → 業界遵守」。但現在發生的事完全跳過了前兩步：行政部門直接要求公司限制發布對象，公司照辦，沒有公告審查標準、沒有申訴機制、沒有日落條款。OpenAI 的官方說法是「我們不認為政府審查應該成為常態」——這句話的諷刺之處在於，他們正在用實際行動讓它變成先例。

同一天，路透社和 Semafor 報導美國政府也批准 Anthropic 向「受信任的美國組織」釋出 Mythos 模型。兩家最領先的 AI 實驗室，同一份劇本，同一組形容詞——「trusted partners」、「verified organizations」、「limited preview」。語言的一致性本身就是訊號：這不是各別公司的安全政策，這是一個正在形成的體制，而法律基礎並不存在。

### 2. [OpenAI GPT-5.6 Sol：模型很強，但發布方式才是新聞](https://openai.com/index/previewing-gpt-5-6-sol/)

GPT-5.6 系列包含三個 tier：Sol（旗艦）、Terra（平衡型）、Luna（輕量型）。技術上，Sol 在 Terminal-Bench 2.1、GeneBench v1、ExploitBench² 都拿下 SOTA——這些數字是真的，問題不在模型。問題在 OpenAI 選擇了一種前所未見的發布模式：模型完成後不公開發布，而是先送白宮審閱，再由政府決定誰可以存取。

這跟 Anthropic 在 {% post_url 2026-06-28-gpt56-gov-vetting-ipo %} 中分析的情況一致：OpenAI 自己的公告裡說「我們致力於安全部署」，但完全沒有說明什麼是「安全」的操作型定義、由誰定義、被拒絕的人有沒有補救管道。當一家公司說「我們相信負責任的 AI」，你要問的不是他們相不相信——你要問的是誰在負責任，以及責任的邊界在哪裡。

Simon Willison 在他的部落格中引述了 OpenAI 的關鍵句："We're beginning a limited preview of the GPT-5.6 family of models with a small set of trusted partners, whose identities we've shared with the U.S. government." 注意那個詞：「shared with」——不是「approved by」、不是「reviewed by」、不是「vetted by」。OpenAI 仔細選擇了一個被動的動詞，把主動權的歸屬模糊掉。但《華盛頓郵報》的報導標題直接寫「U.S. government will decide who gets to use GPT-5.6」。兩個版本之間的落差，就是本週最值得追問的空間。

### 3. [Anthropic 指控阿里巴巴非法萃取 Claude——AI 地緣政治升溫](https://www.reuters.com/world/china/anthropic-says-alibaba-illicitly-extracted-claude-ai-model-capabilities-2026-06-24/)

6 月 24 日，路透社和彭博社同時報導：Anthropic 正式指控阿里巴巴「非法萃取」Claude 模型能力。用詞是 "illicitly extracted"——不是抄襲程式碼、不是盜用權重、不是逆向工程，而是透過某種不透明的機制「提取」了 Claude 的能力。

這是中美 AI 競爭的一個轉折點。過去這類爭議停留在「開源模型被中國公司拿去訓練自己的模型」的層次——Meta 的 Llama 被解放軍使用的故事已經是老哏。但 Anthropic 的指控不一樣：目標是閉源模型、手法據稱是萃取而非複製、被告是中國最大的科技公司之一。如果屬實，這意味著模型層級的安全漏洞不只是「被越獄」，而是「被系統性抽取」。

Bloomberg 的版本補充了一個關鍵背景：Anthropic 沒有公開具體技術證據，也沒有說明萃取是如何進行的。阿里巴巴截至目前沒有正式回應。這件事的後續發展——有沒有獨立驗證、有沒有法律行動、美國政府會不會藉此加速出口管制——將直接影響接下來半年全球 AI 競爭的規則。

### 4. [OpenAI 首款自製推論晶片 Jalapeño：從軟體走向硬體自主](https://openai.com/index/openai-broadcom-jalapeno-inference-chip)

6 月 24 日，OpenAI 與 Broadcom 聯手發表了第一款專為 LLM 推論設計的客製晶片 Jalapeño。這不只是「OpenAI 也要做晶片了」的公關稿——它是一個結構性變化的信號。

截至目前，所有大型 AI 實驗室的推論成本都高度依賴 NVIDIA GPU。NVIDIA 不是單純的供應商，它是整個 AI 算力市場的定價者。OpenAI 做自己的推論晶片，意味著它在試圖打破這個單一依賴。與 Broadcom 合作而非從零自建晶圓廠，是一個務實的選擇——但關鍵不在誰生產晶片，而在誰設計架構。一旦推論晶片可以脫離 NVIDIA 生態系，模型部署的經濟學就改變了：成本的瓶頸從「NVIDIA 給你多少 H200」變成「你自己能跑多少 Jalapeño」。

但這件事還有另一面。OpenAI 一邊推出自己的硬體、降低對 NVIDIA 的依賴，一邊卻在軟體層面大幅增加對美國政府的依賴（見第 1 則）。硬體自主 vs 軟體審查——這兩條線的矛盾，會是接下來觀察 OpenAI 的核心維度。

### 5. [Mistral 四連發：Mistral 3、Small 4、Medium 3.5、OCR 4](https://mistral.ai/news/mistral-3/)

同一週，當美國實驗室忙著跟華盛頓喬名單的時候，法國 Mistral 默默推出了四款模型：旗艦的 Mistral 3、輕量的 Small 4、主打 agent 場景的 Medium 3.5、以及支援 170 種語言的 OCR 4。歐洲的戰略很清楚：不跟你在「誰能得到最強模型」的遊戲裡競爭，而是在「誰能用得到夠好的模型」的市場裡搶地盤。

Mistral 的路線跟 OpenAI/Anthropic 形成了一個值得注意的對比：一邊是極致性能但附帶政府審查，一邊是夠好性能但開放取用。這不是技術路線的選擇，這是商業模式的選擇。如果美國模型的取得成本越來越高——不只是金錢成本，還有政治成本——Mistral 的「夠好 + 開放」就會從替代方案變成首選。

## 其他值得關注

- **[DeepSeek 開源 DSpark：MIT 授權的 speculative decoding 框架](https://github.com/deepseek-ai/DeepSpec/blob/main/DSpark_paper.pdf)**：含 DSpark、DFlash、Eagle3 三種演算法。程式碼開源了，但跑起來需要 38TB cache 和 8 GPU——硬體門檻沒開源。([GitHub](https://github.com/deepseek-ai/DeepSpec/blob/main/DSpark_paper.pdf))
- **[GLM-5.2 被評為開源 agent 的階躍式突破](https://www.interconnects.ai/p/glm-52-is-the-step-change-for-open)**：在 agent 任務上的表現拉近與閉源模型的差距，開源生態終於有能打的 agent 模型了。([Interconnects](https://www.interconnects.ai/p/glm-52-is-the-step-change-for-open))
- **[Anthropic 發布 2026 年 6 月經濟指數報告](https://www.anthropic.com/research/economic-index-june-2026-report)**：追蹤 AI 對經濟的影響節奏，強調不同產業的採用速度差異。([Anthropic](https://www.anthropic.com/research/economic-index-june-2026-report))
- **[GPT-5 破解免疫學三年懸案](https://openai.com/index/gpt-5-immunology-mystery)**：GPT-5 Pro 幫免疫學家 Derya Unutmaz 破解困擾三年的 T 細胞行為之謎。真實科學貢獻，但選擇在政府要求延後 GPT-5.6 的同一週發這篇公關文不是巧合。([OpenAI](https://openai.com/index/gpt-5-immunology-mystery))
- **[OpenAI IPO 傾向推遲到明年](https://www.nytimes.com/2026/06/25/technology/openai-ipo-artificial-intelligence.html)**：$852B 估值的大型 IPO 推遲——當你的產品能不能賣取決於華盛頓，華爾街沒辦法給你定價。([NYT](https://www.nytimes.com/2026/06/25/technology/openai-ipo-artificial-intelligence.html))
- **[Anthropic × 蓋茲基金會 $200M 合作](https://www.anthropic.com/news/gates-foundation-partnership)**：AI 用於全球健康與發展，這是 Anthropic 本週少數跟「政府審查」無關的正面新聞。([Anthropic](https://www.anthropic.com/news/gates-foundation-partnership))
- **[NSA 失去 Mythos 存取權](https://www.nytimes.com/2026/06/23/us/politics/nsa-lost-access-anthropic-tool.html)**：因 Anthropic 內部爭議，國安局對 Mythos 的存取被中斷——政府想監控 AI，但 AI 公司也可以反過來監控政府。([NYT](https://www.nytimes.com/2026/06/23/us/politics/nsa-lost-access-anthropic-tool.html))
- **[AlphaFold 之父 John Jumper 從 DeepMind 跳槽 Anthropic](https://www.reuters.com/technology/us-scientist-john-jumper-leave-google-deepmind-anthropic-2026-06-19/)**：諾貝爾獎級科學家從 Google 轉投 Anthropic，AI 人才爭奪戰進入諾獎級別。([Reuters](https://www.reuters.com/technology/us-scientist-john-jumper-leave-google-deepmind-anthropic-2026-06-19/))
- **[Claude Tag 上線](https://www.anthropic.com/news/introducing-claude-tag)**：Anthropic 為 Claude 推出標籤功能。Slack 裡的 AI 同事會記得一切、主動追蹤，但 log 只有管理員看得到——透明是單向的。([Anthropic](https://www.anthropic.com/news/introducing-claude-tag))
- **[Gemini 3.5 Flash 加入電腦操控能力](https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-computer-use-gemini-3-5-flash/)**：Google 讓 Gemini 直接操作桌面介面，AI agent 從「對話框」跨入「滑鼠鍵盤」。([Google](https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-computer-use-gemini-3-5-flash/))
- **[開源 vs 閉源 LLM 差距分析](https://blog.doubleword.ai/frontier-os-llm)**：看哪張圖表結論完全相反——綜合指標顯示差距縮小，但 18 個 benchmark 平均差距穩定在 5 個月。([Doubleword](https://blog.doubleword.ai/frontier-os-llm))
- **[Samsung 全球部署 ChatGPT Enterprise 與 Codex](https://openai.com/index/samsung-electronics-chatgpt-codex-deployment)**：OpenAI 史上最大規模企業導入之一，但發生在政府審查機制的陰影下——三星的員工沒被攔，但下一個客戶呢？([OpenAI](https://openai.com/index/samsung-electronics-chatgpt-codex-deployment))
- **[Prompt Injection 作為角色混淆](https://simonwillison.net/2026/Jun/22/prompt-injection-as-role-confusion/)**：新論文將 prompt injection 重新框架為「角色混淆」，Simon Willison 推薦為今年最重要的安全論文之一。([Simon Willison](https://simonwillison.net/2026/Jun/22/prompt-injection-as-role-confusion/))
- **[Claude Code 的 Extended Thinking 輸出不是真實思考過程](https://patrickmccanna.net/the-text-in-claude-codes-extended-thinking-output-is-not-authentic/)**：揭露 Claude Code 顯示的「思考」是摘要而非原始過程——Anthropic 的透明承諾出現信用裂痕。([Patrick McCanna](https://patrickmccanna.net/the-text-in-claude-codes-extended-thinking-output-is-not-authentic/))

## 隱藏敘事線

本週的新聞如果只看表面，是 OpenAI 出新模型、Anthropic 告阿里巴巴、Mistral 發四款模型——看起來是三家公司在不同賽道各跑各的。但把這幾條線疊在一起，一個更深的結構浮現出來：AI 的「准入政治」在本週正式成型。美國政府首次直接介入單一模型的使用者審查，這個先例不是國會立的法、不是法院判的案，而是 OpenAI 和 Anthropic 自願把決定權交出去創造出來的。同一週，Mistral 在歐洲默默推出四款模型、DeepSeek 開源推論加速框架、GLM-5.2 突破開源 agent 門檻——兩條軌道正在分岔：一條是「政府幫你把門」的美國前緣模型，一條是「不需要那扇門」的開放替代方案。但最深的矛盾在 OpenAI 身上：一邊把鑰匙交給華盛頓，一邊把 IPO 推到明年。當你的旗艦產品能不能賣、賣給誰都取決於政治判斷，華爾街沒辦法給你定價。

*城武的未解檔案——OpenAI 說「我們不覺得政府審查應該變成常態」，但他們正在讓它變成先例。Anthropic 說「這是為了安全」，但他們沒有說安全的名單誰來寫。兩家公司都在做同一件事：把最強的 AI 放進一個需要政治通行證才能進入的房間，然後對門外的人說「我們也覺得這樣不太好」。*