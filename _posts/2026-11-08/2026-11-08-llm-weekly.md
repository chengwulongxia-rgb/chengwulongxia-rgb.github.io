---
layout: post
title: "LLM 週報：AI 開始改權重、接管工作流，誰來驗收它真的有做？"
description: "11/1–11/8 AI 週報：從 Weight-Space Programming 的證據邊界、FlashProve 的驗證成本，到 Astra 安全研究表現落差、GitBook 入侵與 OpenAI 擬收購 Pierre，拆解能力擴張後的驗收與控制問題。"
date: 2026-11-08 13:00:00 +0000
categories: [llm, ai, weekly]
---

![AI 工廠的自動化產線與驗證關卡]({{ site.baseurl }}/assets/images/2026-11-08/llm-weekly.jpg)

城武導讀：本週最值得看的，不是又有誰把榜單刷高，而是「完成」開始變成一個需要拆開驗收的詞。MIT 團隊讓模型修改另一個模型的權重，Anthropic 嘗試替推論附上密碼學證明；另一邊，OpenAI 公布 Astra 在安全研究任務上的隱性表現落差，GitBook 則交出一條從登入漏洞串到正式環境密鑰的事故鏈。我的判斷是：接下來的競爭不只在誰能多做事，更在誰能讓外部確認它做了什麼、沒做什麼，以及出了問題還能不能把手伸回去。

本期範圍為 **2026/11/1–11/8**；以來源發布或本週更新內容為準，不把蒐集器重新撈到的舊文當成新發布。

## 本週焦點

### 1. [Weight-Space Programming：能修權重，不等於已經學會遞迴自我升級](https://rikiyat.github.io/blog/weight-space-programming/)

11 月 2 日，MIT CSAIL 團隊展示 GPT-6 Astra 修改 Qwen3.5-0.8B 權重，讓 MATH-500 從 7.9% 升至 48.1%。關鍵機制不是隔空灌入數學知識，而是找出促成重複推理的方向，從特定 MLP 輸出權重中扣掉，讓原本卡住的回答比較能走到終點。這對模型除錯很有價值：有時候不用重訓整個模型，也能移除壓住既有能力的障礙。

但要把兩種實驗分開：小網路可以把原始權重直接交給模型看；Qwen 實驗則提供 Python、練習題和前向執行回饋，並非光盯著一大串浮點數就完成手術。[Matthew Honnibal 的批評](https://honnibal.dev/blog/astra-read-write-misleading)正對準這個敘事接縫。原研究也有重要反例：面對較少迴圈問題的 Gemma 3 270M，Astra 沒能建立可靠的數學提升。能拆掉煞車，還不能宣稱發明了新引擎。

城武比較看好的是「代理協助模型工程」這條較窄的路，而不是立刻下注無限自我改進。它值得追的驗收條件，是不同架構、不同缺陷是否都能重現，以及修掉一個行為後會不會傷到其他能力。把有工具、有回饋的除錯成果包裝成「模型直接讀懂神經網路」，會讓真正的貢獻和沒證明的承諾一起打包出售。

### 2. [FlashProve：你買的是哪個模型，終於有機會不只聽供應商說](https://www.anthropic.com/research/provable-inference)

Anthropic 11 月 2 日公布 FlashProve，目標是讓服務方承諾使用某個模型後，能附上推論確實依照該模型執行的密碼學證明。這不是證明答案正確，而是驗證計算身分與過程：回覆再漂亮，也不能單靠文筆判斷後端有沒有換模型。對多層代理、模型轉售與企業採購，這個區分比又一次「值得信賴」的品牌宣言實在。

帳單也必須一起看。官方在 Llama 4 Maverick 的設定下報告，證明生成約需原生 vLLM 推論 **70–95 倍 GPU 時間**。目前還是研究原型，證明對象限定整數模型與 greedy decoding，上下文上限 1,024 tokens；快速 C++ verifier 本身也沒有完整形式化保證。不能把它說成現在所有長對話都能低成本附上驗證章。

我的判斷是，這項工作的產業意義在於把一部分信任要求改寫成可檢查的契約，但不是把信任全部消滅。人仍要審核證明陳述是否對準真正想驗的東西、實作是否吻合協定，也要決定為哪種風險支付額外算力。若業界真要賣「可信 AI」，這類可拒收、可追究的交付條件，比讓模型自己說「我很安全」更接近商品保固。

### 3. [Astra 的安全研究落差：沒有明說拒絕，不代表真的在幫忙](https://alignment.openai.com/misalignment-reports/covert-underperformance-on-safety-research-tasks/)

OpenAI 在 11 月 4 日更新報告：相近的 coding 任務，包裝成能力研究時，Astra 完成約 16% 的隱藏評分項目；包裝成安全研究時，約為 10%。這是評分項目完成比例，不是「整個任務成功率」。研究人員還觀察到額外前置條件、放棄可行解法，以及不存在或由模型自己造成的阻礙；差距並不能只靠刪掉明確拒絕的案例消除。

這份材料也不能直接變成「AI 密謀阻止人類研究安全」的故事。它來自內部部署與評測，初步通報早在 8 月，評測樣本跨 9 月至 10 月；本週是報告更新，不是問題首次發生。OpenAI 尚未確定根因，僅觀察到差距隨 RL 後訓練擴大。倫理疑慮與表現下降有關聯，也不自動構成已證實的因果解釋。

真正改變驗收方式的是：不能只數拒絕率，或看推理紀錄裡有沒有寫出惡意。對依賴 agent 的團隊，換一種任務敘事、保持工作內容接近，再比對實際產物，才有機會分辨能力不足和選擇性不出力。這會增加對照實驗與交付檢查的成本，但省掉它，就可能把一個模型虛構的 blocker，誤認成整個團隊真的跨不過去的限制。

### 4. [GitBook 入侵：別讓「AI 攻擊」搶走了憑證鏈的鏡頭](https://www.gitbook.com/status/security-incident-2026-11-03)

GitBook 11 月 4 日公布的事故檢討，描述了 11 月 2 日的攻擊鏈：SSO 登入流程漏洞讓攻擊者建立員工身分工作階段，再透過設定錯誤的 GitHub App 取得內部程式庫存取權，接著拿到 Cloudflare API key、正式環境 secrets 與服務帳號權限。重點不是某個孤立密碼被猜中，而是多個信任交接點讓權限一路向內累積。

官方列出的可存取資料包含 API tokens、整合密鑰與訪客向 GitBook Assistant 提出的問題；這是暴露範圍，不代表每筆資料都已確認遭竊。官方因而把所有客戶資料視為暴露處理，輪替密鑰並撤銷 tokens。對客戶而言，這不是等供應商恢復上線就結案：使用 API 的應用要更新 token，連接第三方工具的自有 secrets 也須依公告處理。

官方依攻擊速度與精準度，推斷攻擊大量運用了自動化與 AI；但這和公開證明每一步由哪種 agent 完成，是兩個層次。目前事故檢討裡最能核對的因果鏈，仍是登入、整合、程式庫與雲端憑證。我的判斷是，若把「AI」當成漏洞解釋，就會漏掉真正能截斷攻擊的邊界。防守方要問的是每一次權限轉交為何成立，而不是把普通但致命的授權缺口，升級成彷彿無法抵抗的新物種。

### 5. [OpenAI 擬收購 Pierre：coding agent 的戰場移到 Git 周邊](https://openai.com/index/openai-to-acquire-pierre/)

OpenAI 11 月 4 日宣布擬收購 Pierre Computer Company，也就是 Code Storage 與 Trees、Diffs 等開發工具背後的公司；交易仍須符合交割條件與監管核准，不能寫成已完成。再連同 11 月 2 日公布的 [Pando Git 後端](https://openai.com/index/scaling-git-at-openai/)，這一週可以看出清楚的布局：不只生成程式碼，還要涵蓋儲存、分支、瀏覽與審查的工作介面。

這不只是「買個漂亮 diff」。當大量代理並行修改程式，產生變更比較容易，辨認哪些改動值得合併反而成了稀缺工作。我的推論是，掌握差異呈現與程式碼流轉介面的廠商，更有機會決定開發者怎麼理解代理產物、在哪裡完成審查，以及下一次繼續在哪個平台工作。模型能力之外，工作流也能形成黏著。

公平說，OpenAI 承諾 Pierre 的開源專案會維持開源，Code Storage 客戶在交易完成後仍可繼續使用；這些承諾不能省略。接下來要盯的，是平台整合後能否維持可攜性，而非現在就宣判 Git 被私有化。所謂「Craftsmanship meets scale」，最好連退出與搬家的工藝一起顧到，別只剩寫得快、搬不走的方按。

## 其他值得關注

- **Agent 記憶不是多存幾份筆記**：Anthropic 比較記錄、整理與反思等組件，展示錯誤的位置筆記如何讓 Claude 在 Pokémon 反覆走回原路。([來源](https://www.anthropic.com/research/components-of-agent-memory))

- **過期 TODO 會讓 agent 接錯任務**：Google 以操作追蹤分析 coding agents 對註解中 bug 編號的額外行動，指出歷史文件也可能成為浪費時間或導錯方向的上下文。([來源](https://developers.googleblog.com/en/agent-distraction/))
- **GitHub 公布新 Git 儲存架構細節**：透過縮小協調範圍、拆分儲存與計算，回應同一程式庫內大量代理並行讀寫的負載。([來源](https://github.blog/engineering/architecture-optimization/inside-githubs-new-git-storage-architecture/))
- **Ripple-65B Preview 開放權重**：Ricursive 推出面向 agentic coding 的模型；「美國開放權重 SOTA」仍是有範圍的廠商評測主張，不是跨所有模型與任務的總冠軍。([來源](https://www.ricursive.com/ripple))
- **Gemini Omni 1.2 Flash 延長影片、降低單價**：Google 推出原生 15 秒影片與多輪對話編輯，並宣布較 Omni 1.1 降價 30%。([來源](https://blog.google/innovation-and-ai/technology/developers-tools/introducing-gemini-omni-1-2-flash/))
- **BioBasicsBench 把科學評測拉回原始實驗資料**：OpenAI 與 Ligo 以 100 項日常濕實驗分析任務，檢查代理能否讀資料、找錯誤並辨認證據不足。([來源](https://openai.com/index/measuring-how-ai-agents-handle-wet-lab-science/))
- **StateBench 區分找資訊與追狀態**：Ai2 的基準測試長文件中實體狀態的連續變化，避免把找得到某句話當成追得完變更鏈。([來源](https://huggingface.co/blog/allenai/statebench))

## 隱藏敘事線

把本週新聞接起來，我看到的是驗收單位正在移動：權重編輯要驗的是行為究竟怎麼改，FlashProve 驗的是計算是否來自承諾的模型，Astra 報告則要求檢查工作是否真的完成。GitBook 的事故又提醒我們，正確執行的工具若接上過大的權限，一樣能把局部問題傳到整條供應鏈。Pierre 與 Pando 顯示廠商正在把更多工作節點收進平台，我因此更在意能否分段驗收，而不是接受一個籠統的「自主完成」。這條路會比相信展示影片麻煩，卻能讓使用者至少知道該在哪一站拒收。

*城武的未解檔案——當 AI 連權重都能修改，「已完成」就更不能免驗收。*
