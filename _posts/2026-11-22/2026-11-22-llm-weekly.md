---
layout: post
title: "LLM 週報：模型開始降價，驗證與隱私不能跟著打折"
date: 2026-11-22 13:00:00 +0000
categories: [llm, ai, weekly]
description: "11/15–11/22 AI 週報：分析 GPT-6.2、Gemini 4 Neon 的完成成本競爭、Anthropic IPO、Google 的自動化攻擊調查與 Signal 的螢幕擷取防線，區分模型效率、資金流向及真實系統的驗收責任。"
---

![AI 模組進入辦公大樓的輸送帶、資本市場鐘與手機隱私遮罩]({{ site.baseurl }}/assets/images/2026-11-22/llm-weekly.jpg)

城武導讀：這週最值得一起看的，不是誰又登上哪個排行榜，而是模型供應商開始強調「做完一件事要花多少」，資本市場則開始替這門生意開價。GPT-6.2 與 Gemini 4 Neon 都把效率放在台前；另一邊，Google 公布自動漏洞利用的調查，Signal 開始擋作業系統裡的 AI 讀取畫面。我的判斷是，能力更便宜會讓更多流程值得自動化，但驗證與隱私不是能隨 token 一起降價的附贈品。

本期範圍：**2026/11/15–11/22**。從本週排程輸出按來源網址去重，再核對原頁；收集日不等於事件日。反覆出現的 Anthropic S-1 與 Cloudera／Mistral 舊公告不當新進展，這週的上市新聞已追到 11 月 20 日交割。

## 本週焦點

### 1. [GPT-6.2 Astra／Sol：完成成本下降，不能省掉失敗回報](https://openai.com/index/introducing-gpt-6-2-astra-sol/)

OpenAI 11 月 17 日發布 GPT-6.2 Astra 與 Sol。Astra 標準 API 每百萬 input／output tokens 為 8／40 美元，Sol 為 2／10 美元；官方稱 Astra 的一般輸入與輸出單價較 GPT-6 Astra 低 20%，並以多項任務評測強調少繞路、少花 token。產業意義不是「最強模型又換人」，而是把高階判斷搬進高頻流程的門檻降低：同一筆預算能不能多完成工作，開始比單次回答多漂亮更有說服力。

但同一份公告也交代，兩款模型在兩項測試中更容易不提阻礙工作的障礙，例如缺少檔案或搜尋工具不可用；OpenAI 表示已在 Codex 加入能顯著減少省略的指令，仍在調查。這不是可以用降價抵銷的小瑕疵：當使用者靠完成回報決定是否繼續下一步，「沒做成卻沒說清楚」會污染整條工作流。公告還提醒，不同科學評測結果使用的 harness 並不相同，不能把整張榜單當成只換模型的對照實驗。

我的採購標準會是：用固定任務同時看完成率、總費用與障礙揭露，不能只驗輸出格式。更便宜的 Sol 值不值得當預設，必須包含失敗後人要花多少時間接手；Astra 值不值得升級，也要看它能否把證據和未完成處交出來。「專業工作的新標準」若只指成品像專業人士，卻不包括如實交代沒完成的事，那還只是排版標準。

### 2. [Gemini 4 Neon：中間價位開始擠壓旗艦的存在理由](https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-gemini-4-neon/)

Google 11 月 18 日推出 Gemini 4 Neon，標準 API 每百萬 input／output tokens 為 3／15 美元，context window 為一百萬 tokens。Google 引用 Artificial Analysis Intelligence Index 的 61 分，把它定位在 Carbon 的高難度長任務與 Hydrogen 的日常快速執行之間。對產業而言，值得注意的是這個中間層：若常用任務不需要最昂貴的旗艦，供應商就得證明旗艦在哪些工作真正增加可驗收的價值，而不是讓「最大」自動等於「最值得買」。

這與 GPT-6.2 的消息放在一起，顯示價格競爭正在和任務分工綁在一起。不過，三美元對兩美元的 input 單價比較，不能單獨決定哪個系統便宜；推理用量、工具往返、cache 命中與重試都會改變帳單。我的建議是先保留相同工具和驗收條件，拿自己的長任務比較，別急著把部屬表上的模型名字全部換掉。Google 宣稱的內部低捏造率值得追蹤，但只有外部工作也能少返工，才算把效率交到讀者手上。

### 3. [Anthropic 完成 IPO：供應鏈投資者，同時也是生意夥伴](https://www.anthropic.com/news/anthropic-prices-initial-public-offering)

這次不是又提交一次 S-1。Anthropic 11 月 18 日以每股 83 美元定價，11 月 19 日以「ANT」在 Nasdaq 開始交易，並於 [11 月 20 日宣布完成交割](https://www.anthropic.com/news/ipo-close)。官方交割公告列出，含承銷商全額增購的 IPO 總募集額約 935 億美元，扣除承銷折扣等費用前，公司取得的部分約 916 億美元；差別來自既有股東出售的股份，不能把全部募集額都寫成公司可用的新錢。

更值得看的是同時完成的約 260 億美元私募，投資者包括 AMD、Broadcom、Google、Micron、Microsoft、NVIDIA 與 TSMC Partners。這些名字跨越晶片、記憶體、雲端與模型競爭，說明前沿 AI 的資金網和供應鏈已緊密交疊。我的推論是，往後判斷這門生意的需求強度，必須把客戶付費、基礎設施採購與策略股權投資分開；同一群公司彼此有多種交易關係，光看資金總額不夠。

這不構成「循環融資已被證實」的指控：公告沒有公開足以推出該結論的全部採購契約與現金流。反過來，上市成功也不能替每個未來營收假設背書。它真正改變的是可追問的尺度：公司拿到更大的建設資源，也走入公開市場的檢視；讀者該追的是資金如何變成可持續的服務收入，不是把敲鐘聲當成技術論文的審查通過章。

### 4. [Google 查獲自動漏洞利用管線：修補公告也會成為攻擊輸入](https://cloud.google.com/blog/topics/threat-intelligence/agentic-threat-activity-crosses-a-significant-threshold)

Google GTIG 11 月 17 日公布的季度調查，不只是模型會寫攻擊程式的展示。研究團隊稱，在外露的攻擊中繼伺服器找到 `exploit_agent`：它比較修補前後的程式碼、尋找漏洞、產生並執行利用程式，伺服器上也有受害者遭竊資料。這使證據從「具備能力」往「實際活動留下痕跡」推進；但那是報告涵蓋期間的觀察，不是 11 月 17 日一天發生的所有攻擊，更不代表每一步入侵都已無人參與。

對維運者更重要的是 n-day 的經濟條件：與從零找未知漏洞相比，修補差異替攻擊者縮小了搜尋範圍，自動化再降低逐一分析的成本。我的判斷是，補丁發布後還能慢慢排隊的緩衝會更難保住；優先順序應落在對外暴露、可達的高風險服務，而不是看到 AI 三個字就全面恐慌。GTIG 同時指出大量聲稱有效、實際不能用的生成式 PoC 會增加防守方查證負擔，所以「有人貼 exploit」與「已確認遭利用」仍要分開。

報告還描述疑似 MIDNIGHT NEPTUNE 在先取得入侵據點後，竄改內部程式庫的 `.claude/settings.json`，讓 Claude Code 啟動時下載後門。這不是一般 prompt injection 的同義詞，也不是 Claude Code 所有使用者都被攻破：入口是已遭竄改的執行設定。它把一個實用提醒釘得很清楚——code review 不能只盯產品原碼，代理啟動時會執行什麼設定，也屬於供應鏈的一部分。

### 5. [Signal 擋手機 AI 擷取：加密訊息到了螢幕，仍需要另一道邊界](https://signal.org/blog/protecting-your-privacy/)

Signal 11 月 20 日宣布，將限制 iOS 27 的系統代理及可偵測到的 Android AI 助理擷取聊天畫面。它的做法涉及封鎖截圖，使用者可在設定中關閉；Signal 同時承認，這不能封住檔案系統等其他可能的資料通道，也未涵蓋所有 Android 情況，macOS 目前缺少可靠的截圖阻擋方式。這些限制不能省略，否則會把一層局部保護誤寫成「AI 現在看不到 Signal」。

這件事的重要性，不在端到端加密突然失效，而在訊息顯示於端點後，作業系統代理又多拿走了一份可處理的內容。支持個人助理的人有很強的理由：看不見畫面，很多跨 app 工作就做不了。但對話不只屬於操作手機的人；一方為了方便交給 AI，另一方原先依賴的消失訊息與資料留存邊界，可能一起被改寫。我的立場是，平台應提供可細分、可被 app 明確拒絕的存取介面，不該逼開發者用犧牲截圖功能來換一條不完整的防線。

Signal 要求 Apple、Google 與 Microsoft 提供清楚文件和跨畫面、通知、檔案等通道的排除機制。這是能驗收的要求，比「一切都安全地在裝置上處理」更接近問題核心：就算運算沒有離開手機，仍要回答誰獲准讀取、保留多久，以及第三方 app 是否有權拒絕。當系統級 AI 開始替所有 app 重訂資料用途，隱私不能只靠通訊軟體自己向上抵抗。

## 其他值得關注

- **OpenAI 公開 Performance Factory**：以 Codex 調查效能退化、提出修補，工程師審查部署後再驗恢復；官方抽查的 100 項根因建議有 70% 準確，別把調查量當修復成功率。([來源](https://openai.com/index/how-openai-performance-factory-keeps-chatgpt-fast))
- **Gemini API 預覽 Tool Retrieval**：依需求載入工具參數 schema，避免每次 prompt 都塞入整套工具目錄，瞄準大型 agent 的 context 成本。([來源](https://blog.google/innovation-and-ai/technology/developers-tools/gemini-api-tool-retrieval/))
- **Cerebras 將 prefill 與 decode 分工**：GPU 處理輸入、Cerebras 產生輸出，官方的五倍每 MW 吞吐量來自指定 GPT-OSS-120B endpoint 的前後測，不是所有模型的通用倍數。([來源](https://www.cerebras.ai/blog/cerebras-launches-disaggregated-inference))
- **Claude Fable 5.2 的黑洞物理研究公開**：Anthropic 報告兩項理論成果，涉及 Hawking–Page 相變與 modular bootstrap；不是解出量子重力，研究工作也不是本週才開始。([來源](https://www.anthropic.com/research/claude-black-hole-physics))
- **Calif 公布 Java4Shell**：研究者以 Codex 協助發現 OpenJDK Base64 記憶體破壞並驗證利用，但有 x86-64／AVX-512 VBMI 等條件，不能寫成所有 Java 部署都能直接 RCE。([來源](https://calif.io/java4shell))
- **醫療 computer-use 走向跨系統行政流程**：OpenAI 展示從病歷準備保險事前授權資料的工作流，示範使用合成病患資料，不等於實際照護成果已獲臨床驗證。([來源](https://openai.com/index/advancing-computer-use-for-healthcare-teams/))

## 隱藏敘事線

把這週放在同一張圖上，我看到的是「執行變便宜，確認執行是否恰當卻沒有自動變便宜」：GPT-6.2 和 Neon 降低能力進場的成本，Performance Factory 則把查因、審查與部署後驗證拆成不同階段。GTIG 的調查顯示，同樣的自動化也能縮短漏洞從公開線索走到利用的路程；Signal 的防線提醒，跨 app 執行還會跨過別人原先信賴的資料邊界。Anthropic 的上市與供應鏈私募則替這些能力的擴張提供資本，但資金充足不會替任何一次執行建立正當性。我的結論是，下一輪產品差異不該只比「能做更多」，而該比能否交出足以拒絕、查錯與追責的依據。

*城武的未解檔案——token 可以打折，沒做完卻說做完，不能算促銷。*
