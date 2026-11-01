---
layout: post
title: "LLM 週報：模型降價、權重開門，信任卻不能批發"
date: 2026-11-01 13:00:00 +0000
categories: [llm, ai, weekly]
description: "回看 10/25–11/1：GPT-6.1 Terra 的成本競爭、Anthropic 申請 IPO、Mistral Large 4 開放權重，以及 Cloudflare 快取外洩與 Cursor 擴充套件事件，分析 AI 普及之後的授權、隔離與驗收問題。"
---

![hero]({{ site.baseurl }}/assets/images/2026-11-01/llm-weekly.jpg)

城武導讀：本週最值得一起讀的，不是誰又拿到第一名，而是三種「開放」正在同時發生：電腦操作模型降低價格、旗艦模型釋出權重、模型公司走向公開市場。另一邊，Cloudflare 公開跨租戶快取事故，Cursor Marketplace 則出現遭修改的 Claude Code 擴充套件。我的判斷是，產業正在把模型能力變成較容易採購的商品，卻還沒把「能安全交付一件工作」變成同樣容易驗證的商品。這份週報涵蓋 **2026 年 10 月 25 日至 11 月 1 日**；事故發生時間與本週披露時間分開算，不把舊事故偽裝成新災情。

## 本週焦點

### 1. [GPT-6.1 Terra：電腦操作開始競爭每件工作的成本](https://openai.com/index/introducing-gpt-6-1-terra/)

OpenAI 將 Terra 定位為快速、低成本的視覺推理與電腦操作模型，標準 API 價格較 GPT-5.6 Terra 與 GPT-6.1 Sol 低 50%。值得注意的是官方開始把基準成績與「每個任務的成本」並列，而不只是比較每百萬 token 的標價。這些是廠商公布的測試結果，不是本站對企業實際流程的重現。

這改變了採購問題：以前是「最強模型能不能做」，現在是「大量日常操作能否交給便宜模型，難題才升級」。但畫面操作的失敗可能發生在最後一次按鈕，而不是答案文字；少算 token 不會自動少掉一次錯誤送出。我的建議是用自己的完整任務驗收：連同重試、人工接手與錯誤操作一起記帳。廣告詞說能力與成本邊界向外推進，使用者該追問的則是：那條邊界，有沒有把返工算進去？

### 2. [Anthropic 提交 S-1：安全敘事開始接受公開市場的另一種考試](https://www.anthropic.com/news/s1-sec)

Anthropic 在 **10 月 26 日**宣布提交擬議 IPO 的 S-1 註冊文件，計畫以 ANT 為代號登上 Nasdaq。公告當時發行股數與價格區間尚未決定，註冊聲明也尚未生效。因此，「提交申請」不是「已經上市」，更不是網路討論中的估值已獲市場成交確認。這一則的重要性在於資本與揭露程序，不在把募股標題當財務成績單。

我的判斷是，接下來應該把產品故事拆成可檢查的經營問題：收入是否依賴少數通路、算力承諾如何影響資金需求、研發與安全治理如何在成長壓力下分配資源。這些是讀文件時要問的問題，不是這份簡短上市公告已回答的事。公司可以同時有公共利益使命與募資需求；真正值得追蹤的是，兩者衝突時誰有決定權，而不是把其中一個名詞印得比較大。

### 3. [Mistral Large 4 釋出權重：能自己跑，不等於能自由賣](https://mistral.ai/news/mistral-large-4-oss/)

Mistral 本週釋出改進後的 Large 4 權重；不要與本月稍早的 public preview 混為同一次發布。公告提供自行部署路徑，也把授權界線寫得很明白：採用 Mistral Ecosystem Open-Weight license，允許使用、修改、微調與商業化，但經營 Model-as-a-Service 的企業若要商用，必須另取商業授權。這不是看到「修改版 MIT」就能跳過的附註。

這對企業內部部署與模型代管業者，意義完全不同。前者多了一個把資料、版本與運行環境留在自己控制下的選項；後者不能只把權重搬進機房，就假設有權轉售服務。「主權 AI」最值得拆開的地方，正是操作控制權與商業授權權力並不相同。我的結論不是權重開放沒有價值，而是評估順序應該先看誰能部署、誰能提供服務，在來看排行榜；下載按鈕不會替你簽合約。

### 4. [Cloudflare 公開 KV cache 外洩：長上下文也要有真正的租戶邊界](https://blog.cloudflare.com/kv-cache-exposure-remediation/)

這是 **10 月 26 日披露、8 月 27 日至 9 月 9 日發生**的事故，不是本週仍在持續外洩。Cloudflare 確認 Workers AI 的 GLM-5.3 有 155 個回應受影響，涉及超過 681,280 tokens 的提示；公司表示未發現蓄意利用證據，也未發現其他代管模型受影響。機制不是模型自行「想起別人資料」：設定的上下文長度大於 prefill KV pool 容量，超長請求的拒絕路徑又未正確中止，decode 端遂讀到前次請求留下的快取狀態。

這是本週最有工程含量的警訊。上下文視窗是產品規格，記憶體池與節點交接卻是實作；兩者不一致時，正常路徑能回應，不能證明錯誤路徑安全。Cloudflare 同時調整容量與修補拒絕流程，重點在後者：不能只靠「配置夠大」避免踩到壞路徑。對採用託管推論的團隊，應要求供應商交代跨租戶隔離、容量耗盡與錯誤回傳的測試，而不只是拿一張模型安全評測表交差。

### 5. [Claude Code 擴充套件遭修改：模型沒有越獄，開發環境先被開門](https://phorion.io/blog/offical-claude-code-vsx-compromise/)

Phorion 的調查與 [Cursor 官方公告](https://cursor.com/blog/claude-code-extension-security-notice)指向 **Cursor VS Code Extension Marketplace** 中的 `Anthropic.claude-code` 版本 `2.1.312`、`2.1.313`。Cursor 公告將 macOS／Windows 安裝或更新的受影響時窗列為 **10 月 29 日太平洋時間約 02:27–13:35**，並表示惡意版本不是 Anthropic 開發的。載荷會蒐集主機資訊、加入攻擊者 SSH 金鑰並建立持久化；部分 SSH 啟動與連線步驟受權限或程式錯誤限制。不能因此推論所有安裝者都已遭遠端登入，也不能把範圍擴成所有官方發行管道。

這起事件提醒我們，agent 的信任鏈不只在模型權重，也在下載套件的市場與開發機權限。Cursor 已移除惡意版本並處理攻擊伺服器，但其公告仍要求受影響者檢查持久化、隔離有執行跡象的主機，並從可信系統輪替可接觸的憑證；單純解除安裝不一定清得乾淨。我的看法是，企業若把「官方名稱」當成套件來源驗證，就是把品牌認知拿去代替供應鏈控制。這不是再加一句「請小心使用 AI」能解決的事。

## 其他值得關注

- **Gemini 4 Carbon 先限量開放給資安防禦者**：Google 於 10 月 28 日公布模型，初期透過 Fairwind Program 向部分防禦者與可信夥伴開放，不能把公布直接寫成全面可用。([來源](https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-gemini-4-carbon/))
- **DAYJOB: Tax 把評測拉進專業交付現場**：Surge 以 50 個環境、1,789 份檔案測試 agent 面對資訊不完整與紀錄衝突的稅務任務，而非只考單題知識。([來源](https://surgehq.ai/blog/dayjob-tax))
- **Google Research 提出 sleep framework**：透過互動與離線記憶鞏固交替進行，研究如何把短期上下文轉進長期參數，處理持續學習與遺忘問題。([來源](https://research.google/blog/the-sleep-framework-a-new-way-for-llms-to-retain-knowledge-in-continual-learning/))
- **Grace Blackwell 的瓶頸也在排程**：SkyPilot 說明拓樸感知排程；文中引用的 NVIDIA 模型在節點不可用率 2% 時，以每架保留兩個備援節點的配置，較整架滿配工作增加 27% 可用容量，不是所有叢集的通用保證。([來源](https://skypilot.ai/blog/grace-blackwell-needs-a-new-scheduler))
- **多代理研究進入 Minecraft 與 Mindustry**：YC Labs 與 Olam Labs 公開遊戲環境實驗，觀察長時間協作、角色分工與協調失敗，不把遊戲表現直接當成企業生產力。([來源](https://labs.ycombinator.com/projects/games/index.html))
- **VOLTA 用 LLM 替受害者估價**：Cisco Talos 發現此竊資惡意程式有可選的 AI 整合層，在竊取資料後評估資產變現價值，並以多模型後備鏈應對拒絕。([來源](https://blog.talosintelligence.com/appraisal-by-ai-model-driven-victim-prioritization-in-the-volta-infostealer/))

## 隱藏敘事線

把 Terra 降價、Mistral 釋出權重與 Anthropic 提交 S-1 放在一起，我看到的是能力的流通管道正在擴張：更便宜地呼叫、更直接地部署、透過公開市場籌資。但 Carbon 的分階段存取與 Mistral 的服務授權條件也顯示，流通不代表控制權全部交出。Cloudflare 與 Cursor 的事件則把另一條界線攤開：資料在推論節點間怎麼交接、程式從哪個市場進入開發機，會直接改變風險。我的判斷是，下一輪競爭不該只問模型能做多久，而要問跨過這些邊界後，誰還能證明它做的就是被授權的工作。

*城武的未解檔案——權重可以下載，信任不能順便打包。*
