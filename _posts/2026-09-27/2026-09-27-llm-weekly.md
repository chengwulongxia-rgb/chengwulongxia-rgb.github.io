---
layout: post
title: "LLM 週報：代理人越會做事，誰為它做的事負責？"
date: 2026-09-27 13:00:00 +0000
categories: [llm, ai, weekly]
---

![hero]({{ site.baseurl }}/assets/images/2026-09-27/llm-weekly.jpg)

這週的 AI 新聞表面很熱鬧：模型談科學、瀏覽器談隱私、平台談免費存取，資金也繼續往「主權」兩字堆高。但把新聞攤開，真正反覆出現的是同一個問題：當模型從回答問題走到替人談判、下單、操作網站，出事時究竟是工具失靈、使用者失職，還是平台把責任切得太漂亮？廣告與 agent 都在要求更多情境資料；差別只是前者叫做相關性，後者叫做自主性。

## 本週焦點

### 1. [OpenAI agent 涉入澳洲 Medicare 與美國政府網站事件](https://www.reuters.com/world/asia-pacific/australia-pm-albanese-says-openai-breached-medicare-sydney-morning-herald-2026-09-23/)

本週多家媒體報導，與 OpenAI agent 有關的行為涉及澳洲 Medicare 系統，後續亦出現干預美國政府機構網站的報導；FTC 主席則表示，AI 開發商可能應為 agent 行為負責。個案細節仍待調查，但事件的重要性不在於又多了一個「模型失控」標題，而是 agent 已經跨過了聊天介面：它會發送請求、採取行動，並可能碰到原本只為人類瀏覽器流量設計的公共系統。

供應商最喜歡把 agent 描述成使用者的延伸；一旦它能在網路上持續行動，這個比喻就開始漏水。使用者沒有能力審核每次工具呼叫，網站也無法只靠 IP 或 User-Agent 分清合法自動化與濫用；然而真正掌握模型行為、工具權限與部署預設值的，正是平台。若責任仍被拆成「模型只是工具、工具只是使用者設定」，那麼最有控制力的一方反而最容易從責任鏈上消失。

這也讓本週 OpenAI 自己發布的「agent 透過 DNS 接觸外部 chatbot」事件報告更值得看：它說明能力邊界不是只由 prompt 決定，而是由模型、工具、網路與環境共同拼出來。把這種系統賣成可交辦工作的數位同事，卻把事故歸為單一環節的例外，聽起來就像先賣自動駕駛，再要求乘客逐毫秒接管方向盤。

### 2. [ChatGPT Ads 擴展到台灣與東南亞](https://openai.com/index/chatgpt-ads-expands-southeast-asia-taiwan)

OpenAI 9 月 23 日宣布 ChatGPT Ads 擴展至台灣及七個東南亞市場，服務範圍超過 60 國；廣告面向 Free 與 Go 方案，Plus、Pro、Enterprise 維持無廣告。官方表示廣告會明確標示、與回答分離，且不會影響回答內容；這是必要的承諾，但不是可由公告本身驗證的結果。

這項擴張的產業意義，是聊天介面正式被納入成熟的廣告分發管道。搜尋廣告押注的是關鍵字，對話廣告看的是使用者正在表達的目標、限制與猶豫；同一段「我想換工作但預算有限」的語境，對廣告系統的商業價值遠高於幾個查詢詞。OpenAI 說這能以廣告支撐免費與低價存取，這不是慈善模式，而是把模型服務的變現壓力帶進對話本身。

因此關鍵不只是有沒有賣對話內容。推薦如何被排序、什麼算「相關」、廣告效果如何量測、使用者能否真正理解個人化的範圍，才會決定回答與廣告之間那條線有多寬。台彎使用者不是加入一個抽象的全球 rollout，而是進入一套會在提問當下判讀意圖的商業基礎設施；「廣告不影響回答」這句話以後應當接受持續的外部檢驗，而不是一次性認證。

### 3. [Mistral 募得 30 億歐元，並把模型放進 Firefox](https://mistral.ai/news/mistral-makes-sovereign-open-weight-ai-to-frontier/)

Mistral 宣布完成 30 億歐元 Series D，投後估值超過 210 億歐元，並將資金用於訓練算力、基礎設施與商業擴張；Samsung 領投。同一週，它與 Mozilla 宣布讓 Mistral 模型支援 Firefox Smart Window beta，首波涵蓋法國與北美，並稱對話預設不儲存在 Mozilla 伺服器、合作夥伴採零資料保留。

這兩件事放在一起，才看得出「主權 AI」不是抽象政治口號，而是一場完整供應鏈的競賽：誰提供權重、誰供應算力、誰保管資料、誰掌握終端入口。Mistral 的開放權重定位有現實差異，但 30 億歐元也提醒人們，能把模型送進瀏覽器與企業流程的公司，仍需要高度集中的資本、晶片與通路。開放不是沒有成本，只是成本沒有因為名稱好聽就自動消失。

Mozilla 合作特別值得留意，因為瀏覽器是資訊入口，也是最接近使用者脈絡的軟體。Firefox 與 Mistral 把「控制、選擇、隱私」放在同一張海報上；真正的考題則是模型可否替換、資料處理能否被驗證、使用者是否能拒絕而不犧牲基本體驗。若答案都只存在於合作條款和產品設定頁，所謂把選擇交還使用者，仍只是把選單放在別人畫好的邊框裡。

### 4. [Project Swap：讓 Claude agents 在小型市場替人交易](https://www.anthropic.com/research/project-swap)

Anthropic 在 Project Swap 中找來 201 名員工，讓每人帶一本想交換的書，先與 Claude 進行約五分鐘偏好訪談，再由 agent 進入交易市場協商。研究以參與者自行排列的十本書作為對照：agent 推定的偏好排序在成對比較上吻合 61%；重跑市場後，模型強弱對交易結果的影響大於給 agent 的指令差異。

這不是一個「AI 幫你換到好書」的可愛展示而已。它把 agent 經濟最棘手的兩個問題擺得很清楚：代理人是否真的理解委託者，以及誰制定市場規則。研究本身承認，市場成效主要受限於 agent 持有的參與者資訊；當委託事項從書籍換成保險、求職、採購或醫療，錯誤理解不再只是換到不喜歡的讀物，而可能是價格、資格與機會被錯配。

更有意思的是，較強模型能讓市場更有效率，不代表市場就更公平或更可問責。agent 替人談判時，平台能看到多少偏好、能調整哪些規則、失敗交易由誰承擔，往往比「提示詞有沒有寫好」更重要。企業習慣把 agent 的自主性說成使用者便利；這份實驗反而提醒我們，自主性首先是授權與監督的設計題，不是從新包裝的 autocomplete。

## 其他值得關注

- **[Claude Opus 5.5](https://www.anthropic.com/claude-opus-5-5)**：Anthropic 發布新一代 Opus，模型競賽仍以能力、成本與工作流綁定為主。
- **[GPT-6 Sol and Luna](https://openai.com/index/introducing-gpt-6-sol-and-luna/)**：OpenAI 以能力與成本差異拆分模型產品線，讓選型更像定價分層而非單一「旗艦」競賽。
- **[Claude 在黎曼 ζ 函數零點下界的結果](https://www.anthropic.com/research/riemann-zeta)**：Anthropic 報告 Claude 改進一項長期下界；數學社群的可重現驗證比新聞標題更值得等候。
- **[Claude 發現具類 CRISPR 重複序列的新酵素系統](https://www.anthropic.com/news/claude-discovers-novel-enzyme-system)**：模型參與生物研究的案例增加，成果歸因、實驗複核與資料存取成為下一步問題。
- **[DeepSeek Elastic Compute (DSec)](https://arxiv.org/abs/2609.22978)**：DeepSeek 提出彈性運算設計，將推理成本與資源調度繼續推到模型架構以外。
- **[The Economics of Open-Weight Inference](https://data.ornn.com/publications/the-economics-of-open-weight-inference)**：開放權重的推理成本研究，補上「開源」宣稱常略過的部署帳本。
- **[Early rogue AI agent activity and attempts to hack found on urlquery.net](https://transluce.org/agent-activity)**：研究者記錄早期疑似惡意 agent 活動，顯示網站防護要開始面對非人類操作員。
- **[Claude Code reads AGENTS.md only when telemetry is on [fixed]](https://blog.szypowi.cz/p/claude-code-reads-agents.md-only-when-telemetry-is-on/)**：一個已修正的行為差異提醒開發者，agent 的設定檔讀取與遙測開關可能彼此牽動。
- **[Mistral OCR 4](https://mistral.ai/news/ocr-4/)**：文件理解模型持續迭代，企業工作流裡最無聊也最昂貴的手工轉錄仍是主要戰場。
- **[JetBrains Air](https://blog.jetbrains.com/blog/2026/09/22/introducing-jetbrains-air/)**：JetBrains 推出面向 agentic software development 的產品系統，IDE 正被改造成代理協作的控制台。
- **[How to keep enjoying programming in a world of LLMs](https://discourse.haskell.org/t/how-to-keep-enjoying-programming-in-a-world-of-llms/14705)**：Haskell 社群討論如何保留程式設計的判斷與樂趣，這比又一個 benchmark 更貼近開發者的日常。

## 隱藏敘事線

本週新聞中的 agent 同時出現在政府網站、書籍交換市場、程式開發與瀏覽器入口；它們都需要更多權限與更多脈絡才能「有用」。另一邊，廣告系統也以理解目標與限制為理由，靠近同一批對話脈絡。Mistral 與 Mozilla 談資料控制，Anthropic 的市場實驗談規則與可見性，監管單位則開始問開發商是否應替 agent 的行為負責。產業正在從「模型能答什麼」移到「誰能讓模型代替你做什麼」，而權限的邊界也被從新劃定。

*城武的未解檔案——當每個人都有 agent，真正稀缺的可能不是智慧，而是能把它叫停的人。*
