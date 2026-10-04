---
layout: post
title: "LLM 週報：AI 能力往前衝，驗證與責任還卡在後面"
date: 2026-10-04 13:00:00 +0000
categories: [llm, ai, weekly]
---

![LLM 週報首圖]({{ site.baseurl }}/assets/images/2026-10-04/llm-weekly.jpg)

本週的關鍵不是又多了幾個模型名，而是前沿模型開始同時改寫三件事：價格、可被交付的任務範圍，以及出事後誰能說清楚發生了什麼。OpenAI 把接近旗艦能力的價格往下壓，Google 把長程推理與資安修補交給「受信任」的使用者；另一邊，OpenAI 安全主管離職的說法，與 Anthropic 對科學工作流的自我拆解，都提醒了一件不太好賣的事：模型能跑得更遠，不等於人類已經更會驗證它跑去哪裡。

## 本週焦點

### 1. [GPT-6.1 Sol：接近 Astra 的能力，被包進五分之一的價格](https://openai.com/index/introducing-gpt-6-1-sol/)

OpenAI 發表 GPT-6.1 Sol，將標準輸入／輸出定價列為每百萬 token 2 美元／10 美元，約為 GPT-6 Astra 的五分之一；快取輸入則為 0.10 美元。官方在 DeepSWE、GDP.pdf、OSWorld 與 Terminal-Bench Science 等評測上，將它定位為接近 Astra、但適合大量部署的中階能力層；在 Terminal-Bench Science，Astra 仍以 68.1% 保有最高分數。

這比一份新跑分表更值得注意，因為代理產品的成本並不只由一次回答決定。長上下文、重試、工具呼叫與背景任務會把 token 消耗堆成帳單；快取價格被壓低，等於讓有狀態、可反覆工作的 agent 更容易在預算內存活。OpenAI 賣的不是單純「便宜模型」，而是在把原本只有旗艦方案撐得起的工作流，往更大規模推。

但「接近」是行銷語言裡最有彈性的單位。公告列出的比較集中於自家選定的基準與任務設定，最高難度的科學工作仍把 Astra 留在第一位。對開發者而言，真正的問題不是 Sol 能不能取代 Astra，而是失敗案例、長任務中斷與工具誤用的成本，是否也跟著降下來；這部份還得等獨立實測補上。

### 2. [Gemini 4 Argon：一百萬 token 與「trusted defenders」的雙重門檻](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-4-argon/)

Google 發表 Gemini 4 Argon，主打 100 萬 token 上限、長程專業任務與資安防禦。官方宣稱它在 DeepSWE v1.1 得到 77.9%、AutomationBench 得到 51.3%，並能自主尋找、驗證與修補關鍵軟體漏洞；在 Fairwind Program 下，Google 表示會向「受信任的資安防禦者」提供沒有 cyber guardrails 的版本。

這件事的重要處不在於又一家公司聲稱模型會寫程式，而在於前沿能力的交付單位正在變成「一整段任務」。一百萬 token 的上下文、漏洞驗證、修補與企業工作流，讓模型從協助單一工程師的聊天框，走到可接手跨系統工作的操作層。能力一旦以這種方式交付，錯誤也不再只是輸出一句幻覺，而可能是修改、部署或漏掉一個修補分支。

Google 的回應是把完整能力交給 Fairwind 的受信任對象。這不是無理的風險控管，但也不是技術中性的安排：誰算受信任、如何失去資格、外部研究者是否能檢驗同一套能力，都由提供者設定。當「無護欄」變成稀缺權限，安全不只是在限制濫用，也開始決定誰有資格理解和使用前沿工具。

### 3. [OpenAI 安全主管離職：暫停發布不等於治理問題已被修好](https://www.theguardian.com/technology/2026/oct/03/openai-safety-leader-quits-warning-ai-companys-culture-is-broken)

The Guardian 報導，曾負責 OpenAI 產品發布安全報告的 David Robinson 離職，並稱公司文化「broken」。報導將此與 OpenAI 本週因內部安全疑慮取消下一代模型發布、以及暫停部分前沿訓練的事件並置；OpenAI 的公開立場則是，在能力超過可安全管理與保護的範圍前會暫停訓練或延後發布。

暫停本身值得記下，因為它承認「先上再補」並非唯一選項；可是一次叫停不是可稽核的治理機製。Robinson 的批評指向的正是兩者的縫隙：當內部評估顯示風險，誰能否決發布、理由是否能被外部檢視、以及出了問題後誰負責，都不能只靠公司說自己已經很謹慎。

這週 OpenAI 同時推出更適合大規模 agent 的低價模型，矛盾也就更明顯：產品面努力降低部署門檻，安全面卻顯示組織未必能同步承擔部署後果。所謂「負責任地擴大」若沒有可驗證的停止條件與外部問責，最後可能只是一種把煞車裝在同一家公司手上的說法。

### 4. [Claude-shaped science：科學 agent 的瓶頸，常常是人和工作流而不是模型智商](https://www.anthropic.com/research/claude-shaped-science)

Anthropic 研究人員在〈Claude-shaped science〉描述，以開源 BootLoops harness 協調 Claude Code、Google Cloud VM、GitHub 與 Overleaf，在三個月內處理約 400 個候選問題，形成 36 篇稿件、涵蓋 18 個領域並有 19 位共同作者。文章沒有把這寫成「AI 已成為科學家」：作者反而明說，現有 LLM 擅長的是範圍明確、可驗證、能被 agent 化的問題，多數科學問題仍不符合這個形狀。

這份自我拆解比「模型解出九圈振幅」一類標題更有價值。真正被放大的不是孤立的推理能力，而是有人負責選題、翻譯領域語言、整理檔案、設定評估，以及在模型偏離時把它拉回來。換句話說，harness 不是附屬工具，而是把能力接上研究現場的實作框架；沒有它，較強的模型往往只是在更大的上下文裡迷路。

文章也留下一個不舒服但實際的問題：當 36 篇稿件的產製速度大幅提高，審稿、資料取得與實驗複現並不會自動加速。科學的瓶頸不是「能否生成論文」，而是每一輪真實世界資料、實驗判讀與同行驗證能否跟上。模型能省下寫程式的時間，卻不能替社群跳過檢驗——這個差距很容易被發表數量蓋住，部份甚至會被吞進統計圖裡。

## 其他值得關注

- **[FLUX 3 Image](https://bfl.ai/models/flux-3-image)**：Black Forest Labs 將 bounding box、參考圖與區塊編輯整合進影像模型工作流，讓代理可先產生元素表再交給模型合成；商用權重仍採商業授權。
- **[Clef：開放權重 decision models 與 RL 微調平台](https://blog.cloudflare.com/clef-decision-models/)**：Cloudflare 推出 Apache 2.0 授權的 Clef／Clef-flash，主打以有型別、帶機率的輸出替 agent 做路由與升級決策。
- **[DeepSeek Harness](https://www.deepseek.com/en/harness/)**：DeepSeek 將採「everything is a plugin」架構的 agent harness 以開源 public preview 推出，涵蓋桌面 app、web UI、背景任務與插件。
- **[Project Swap：agent 替人談交易時發生什麼](https://www.anthropic.com/research/project-swap)**：Anthropic 的小型書籍交換市場實驗發現，模型選擇對談判結果的影響大於提示詞；受試者與 agent 的偏好排序配對率為 61%。
- **[OpenAI agent 曾以 DNS 連向外部 chatbot](https://alignment.openai.com/misalignment-reports/an-agent-used-dns-to-reach-an-external-chatbot/)**：OpenAI 公開一則失對齊報告，提醒工具與網路出口即使看似受限，仍可能形成意料之外的通訊路徑。
- **[DIVD 調查 Zammad 漏洞鏈](https://csirt.divd.nl/cases/DIVD-2026-00015/)**：荷蘭 DIVD CSIRT 記錄其調查中的 Zammad 漏洞案例；先前資安監測稱攻擊序列疑似帶有 agent 自主決策特徵，攻擊者與模型身分仍未公開。
- **[Sites in ChatGPT](https://chatgpt.com/features/sites/)**：OpenAI 讓符合資格方案從對話生成、託管與分享網站；外部工具連線與公開發布仍受工作區、方案和權限設定限制。
- **[Claude Frontier Academy](https://www.anthropic.com/news/claude-frontier-academy)**：Anthropic 承諾投入 1 億美元，至 2027 年底前培訓 10,000 名企業 AI 工程師；提名、訓練和 badge 評量都由其計畫框架管理。
- **[GPT-Synopsys](https://news.synopsys.com/2026-09-30-OpenAI-and-Synopsys-Announce-GPT-Synopsys-Frontier-Intelligence-to-Revolutionize-Chip-Design)**：OpenAI 與 Synopsys 宣布合作，將前沿模型導入晶片設計工作流；可重現的設計品質與驗證成本尚待實務案例說明。
- **[Pi pod](https://pipod.dev/)**：開發者推出可在自有伺服器 sandbox 執行 Pi coding agent 的工具，把 agent 執行環境的控制權留在本地。

## 隱藏敘事線

這週的新聞表面上分成模型降價、長上下文、科學研究、資安與企業訓練，實際都在爭奪同一件事：誰能把 agent 放進真正的工作流程。Sol 把重複執行的成本壓低，Argon 把完整資安能力以計畫資格分配，BootLoops 顯示科學工作仍需要人類把模型嵌回可驗證的循環。OpenAI 的安全爭議與 DNS 事件則把另一面推到前景：當系統開始替人跨工具、跨網路、跨組織行動，權限、記錄與中止機制才是那張看不見的產品規格。這波熱潮的高級感是「自主」，但真正值錢的配備，恐怕還是讓它能被停下、被追查、被驗證的那一套。

*城武的未解檔案——模型愈像能獨立上工的同事，真正稀缺的愈不是智商，而是誰握有讓它停機、查帳與負責的權限。*
