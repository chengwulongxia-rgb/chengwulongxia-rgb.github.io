---
layout: post
title: "【深度分析】vLLM Micro-Agent——API 層模型協作擊敗 GPT-5.5"
date: 2026-06-30 03:00:00 +0000
categories: [llm, ai, deep-analysis]
---

![hero]({{ site.baseurl }}/assets/images/2026-06-30/microagent.jpg)

vLLM 丟出了一個有趣的命題：與其等下一顆 frontier model，不如讓手邊的模型們在 serving layer 內協作。六種 loop pattern、一個叫做 `vllm-sr/auto` 的統一模型名稱、在 LiveCodeBench 和 GPQA-Diamond 上雙雙超越 GPT-5.5。但你真正該問的問題不是「分數多少」——而是當 routing 從「選模型」變成「決定協作策略」，那個決定權落在誰手上，以及為什麼開發者可能完全不知道自己的請求背後跑了多少顆模型。

---

## 原文翻譯／摘要

### 路由器的新角色

大家都在等下一顆 frontier model。但 vLLM 團隊認為，更有意思的層級可能是 frontier model **前面**的那一層。

Router（路由器）正在成為 AI inference 的控制面。它的第一個角色很務實：把正確的請求導到正確的模型。這已經很重要，因為 production 環境早已不是一顆模型打天下。一個 router 可以透過判斷請求是否值得用 frontier model 來降低成本、可以透過把敏感領域導向更嚴格的模型來執行安全政策、可以協調雲端和邊緣運算。

但 vLLM 說 router 的下一個角色更有趣：**router 可以讓模型變得更強**。不是改權重，不是叫每個 application 自建 agent graph——而是在 serving layer 內，把一次 model API 呼叫變成一場有邊界的多模型協作。

### The Looper 就是執行環境

在 vLLM Semantic Router 裡面，looper 是 bounded micro-agent 的執行環境。一個請求以普通的 chat completion 進到 router，router 提取訊號、判斷任務形狀與風險級別、選擇演算法。這個演算法可以是一般的單模型路線，也可以是 looper 路線。

目前主要的 looper pattern 有六種：

**Confidence（信心迴圈）**：成本感知的順序升級迴圈。先用便宜的模型跑一次，評估信心分數（token-level logprob、logprob margin、hybrid score、self-verification、或 AutoMix-style entailment verifier）。分數夠就回傳，不夠就升級到下一顆模型。重點不在「可以升級」，而在升級變成了一個明確的 router policy——門檻值、失敗行為、停止條件都可見、可調。

**Ratings（評分聚合）**：受控的平行 fan-out 迴圈。同時跑多個候選模型，但設有 `max_concurrent` 硬上限。收集成功回應後，根據 rating-aware 權重做聚合。適合 A/B 評估、ensemble 策略、或營運者已有各模型品質訊號的情境。

**ReMoM（重複混合模型推理）**：當任務的推理變異性高、且答案格式必須在協作後保持不變時使用。派發多個推理嘗試，等待達到最小成功 quorum，然後請 synthesis 模型將證據合併成符合輸出合約的答案。如果 synthesis 失敗但 worker 產出了有效的證據，路由不會直接報錯——它可以 fallback 到最佳有效證據，仍然回傳正常回應。

**Fusion（分歧即訊號）**：出發點不同——有時候有用的不是平均答案，而是分歧的結構。多個獨立 panel 的回應變成證據，judge 看到一致、矛盾和獨特洞察，finalizer 回傳一個答案，所有追蹤過程隱藏在 API 後面。特別適合有多種合理路徑的任務：困難的選擇題推理、長篇專家判斷、或單一自信回應可能脆弱的精確答案任務。

**Workflows（角色工作流）**：最有 agent 味的 pattern，但也需要最嚴格的邊界。planner 只能選擇被允許的 worker 模型。plan 必須通過校驗。步驟受 max steps、max parallelism、timeout、error policy 約束。最終回應仍必須滿足輸出合約。對 SWE-style 任務來說，router 可以表達 planner、patcher、verifier、finalizer 的組合，而不需要 application 自己養一套 bespoke agent stack。

**Auto Recipes（自動配方）**：對外只有一個模型名稱：`vllm-sr/auto`。內部 router 根據訊號與投影選擇適合該請求的 loop。難度、風險、合約壓力、延遲、成本——這些不是 prompt 裡的註解，而是 routing facts，可以直接決定要走 Confidence、Ratings、ReMoM、Fusion、Workflows 還是 fallback 路徑。這就是「agent 作為 app 邏輯」與「micro-agent 作為 serving runtime」的差別——router 控制預算、政策、拓撲、追蹤和失敗模式。

### 配方勝過萬用迴圈

最重要的評估教訓不是「某個演算法總是贏」。恰恰相反：**最好的 loop 是為任務量身打造的**。

GPQA-Diamond 需要嚴格的選擇題答案保留。LiveCodeBench 需要可執行的程式碼和隱藏測試穩定性。Humanity's Last Exam 需要分歧解決和精確答案格式。SWE-style 任務需要 planner、patcher、verifier、finalizer。

這就是為什麼 `vllm-sr/auto` 不該是「永遠跑最大的 loop」——它應該是「選擇適合這個任務的配方」。Router 端的協作不只是 prompt engineering。配方還定義了模型池、模型角色、推理強度、並行數、quorum、timeout、synthesis 模型、fallback 政策、輸出合約和可觀測性標籤。

### 成績單：證明，不是全貌

團隊在三個困難 benchmark 上評估了目前的 closed-model recipe：

- **LiveCodeBench (2025/1-4)**：VSR Closed **92.6**，對照 Fugu Ultra 92.0、GPT-5.5 90.7、Opus 4.8 90.3
- **GPQA-Diamond**：VSR Closed **96.0**，對照 Fugu Ultra 95.5、Gemini 3.1 Pro 94.3、GPT-5.5 93.6
- **Humanity's Last Exam**：VSR Closed **50.0**，對照 Fugu Ultra 50.0、Gemini 3.1 Pro 45.0
- **Humanity's Last Exam（Hybrid）**：VSR Hybrid **47.1**，對照 GLM-5.2 40.5、GPT-5.5 41.4

（VSR Closed 指只用 closed-model backends；VSR Hybrid 混合開放與封閉模型。）

團隊強調這不是主張「每個請求都該用所有閉源模型」。主張是：**router 擁有的協作可以創造出比底層個別呼叫更強的模型身份**——在保留單一 API 表面的前提下，擊敗或打平 frontier 單模型基線。

### 這對模型 serving 意味著什麼

舊的 serving stack 是被動的——收到模型名稱，轉發請求到後端。新的 serving stack 是主動的——它會問：

- 我們對這個請求有什麼證據？
- 它落在哪個品質、成本、延遲、安全區間？
- 一顆模型夠嗎？
- 如果不夠，該跑哪種協作 pattern？
- 哪個答案合約必須被保留？
- 如果某個 provider 很慢或錯了怎麼辦？
- 如何回傳一個乾淨的回應，同時保留完整的 trace？

這不是 application glue。這是基礎設施。Micro-agent 應該在 router 裡，因為 router 已經擁有了 micro-agent 需要的所有東西：模型別名、provider 政策、憑證、成本元數據、訊號、決策、重試、timeout、trace、以及 OpenAI-compatible 的回應語義。

### 結論

「Frontier model」這個詞正在變成兩種東西。一種是 checkpoint。另一種是系統邊界。最近的 orchestration 浪潮讓這個方向變得明顯。vLLM Semantic Router 的賭注是：這個能力應該是 serving layer 裡可程式化、可觀測、且開放的。

下一場模型競賽仍然會包含更好的模型。但它也會包含更好的 router——知道什麼時候省錢、什麼時候執行安全政策、什麼時候留在邊緣、什麼時候上雲端、什麼時候把一個請求變成一隻小而自律的團隊。

---

## 城武觀點

vLLM 這次做的事情在技術上是對的——我的意思是「對」的那種對，不是「聽起來不錯」的那種對。把模型協作拉到 serving layer，讓 router 擁有 loop 的預算、拓撲、失敗政策，而不是把這些責任丟給每個 application 自己用 LangChain 拼一個 agent graph——這根本就是 infrastructure 該做的事。你想想看，如果每個團隊都要自己寫 Confidence loop 的 threshold 邏輯、自己管 model fan-out 的 timeout、自己兜 synthesis 和 fallback，那不出三個月 production 裡就會出現六種不同的「模型協作」實作，而且每一種的錯誤處理都是壞的。vLLM 把這些收進 router，以經是對的。

但我要追三個問題。

**第一，Auto recipe 把路由變成了黑箱。**

`vllm-sr/auto` 對外只暴露一個模型名稱，內部根據訊號自動選擇 loop pattern。這對開發者來說很漂亮——我只要 call `vllm-sr/auto`，剩下的 router 幫我搞定。但漂亮跟透明是兩回事。當我的請求被 router 自動選了 Fusion pattern，底下跑了三顆閉源模型和一輪 judge-finalizer synthesis，我作為開發者完全不知道這趟 call 到底花了多少錢。API 回傳的 response 看起來跟一般 chat completion 一模一樣，沒有附上「本次請求使用了 4 次 model call、總計 12,000 個 token」的明細。

這不是 vLLM 獨有的問題——這是所有抽象層的共同陷阱。抽象層的目的是隱藏複雜度，但也隱藏了成本。如果你的 router 可以決定什麼時候用 GPT-5.5、什麼時候用一顆開源模型，那開發者怎麼驗證 router 的決策是合理的？怎麼知道它沒有因為 threshold 設太寬，每次都幫你升級到最貴的模型？你說「operator 控制 recipe」——但 operator 跟 developer 通常不是同一個人。寫 application 的人看不到 routing policy，管 routing policy 的人看不到 application 的行為。這個資訊不對稱遲早會出問題。

**第二，Recipe 針對每個 benchmark 手動調過——這算 cheating 嗎？**

vLLM 誠實地寫了「最好的 loop 是為任務量身打造的」。GPQA-Diamond 用 ReMoM 加嚴格答案保留、LiveCodeBench 用 code-shaped loop、HLE 用更深度的 ReMoM 或小 Fusion。每個 benchmark 的 recipe 都是針對那個 benchmark 的特性手動設計的。

好，那問題來了：這些分數反映的是「模型協作的能力」還是「人類調參的能力」？如果今天有一個全新的 benchmark，沒有人類預先設計 recipe，Auto 模式能自己選對 loop pattern 嗎？還是它會 fallback 到一個預設 loop，然後分數掉 10 個百分點？

我不是說手動調 recipe 是不對的——vLLM 在做的是 product，不是學術競賽，產品本來就應該針對場景優化。但當報導標題寫的是「Micro-Agent 擊敗 GPT-5.5」，讀者很容易理解成「這個系統本身比較強」，而不是「這個系統的 operator 花時間把 benchmark 的 pattern 寫進了設定檔」。這兩個敘述的差距，就是誠實行銷與不誠實行銷的差距。我賭 vLLM 沒有要騙人——他們的文章誠實說明了 recipe 是 task-shaped——但這個細節在傳播過程中一定會被稀釋掉。

**第三，Confidence loop 的信心閾值誰來設？**

Confidence 是最吸引人的 pattern：先用便宜的模型，不夠好再升級。聽起來像是一種聰明的省錢策略。但這個機制的核心——信心閾值——本身就是一個 hyperparameter。設太寬：模型很「有信心」但答案是錯的，系統開心地回傳了錯誤答案，省了錢但犧牲了品質。設太窄：模型動不動就「沒信心」，每個請求都升級到最貴的模型，根本沒省到錢。

更麻煩的是，信心分數的可靠性在不同類型的任務上完全不一樣。數學推理的 logprob 信心跟開放式寫作的 logprob 信心，根本不是同一回事。vLLM 支援多種信心訊號（token-level logprob、logprob margin、self-verification、entailment verifier），每一種在不同任務上的表現都不一樣。那 operator 要怎麼知道哪個信心訊號適合哪個任務？這又回到第一個問題：這個知識門檻很高，而 vLLM 把這個門檻從 application 移到了 infrastructure——移動門檻不是消除門檻。

我選邊。我認為讓模型協作發生在 serving layer 是正確的架購決策——比 application layer 更可控、更可觀測、更一致。但 vLLM 如果不在 Auto recipe 的透明度和預設信心閾值的合理性上做出更嚴謹的設計，這個漂亮的架構會在 production 裡被現實懲罰。三個月後我賭會有人貼一篇部落格，標題是「vllm-sr/auto 讓我的 API 帳單翻了兩倍——而且我完全不知道為什麼」。

*城武的未解檔案——最好的 loop 是為任務量身打造的，最好的帳單是你看不懂的那張。*

- 原文：[Micro-Agent: Beat Frontier Models with Collaboration inside Model API](https://vllm.ai/blog/2026-06-29-micro-agent-frontier-models)（vLLM Semantic Router Team, vLLM Blog, 2026-06-29）
