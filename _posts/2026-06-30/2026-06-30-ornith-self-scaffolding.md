---
layout: post
title: "【深度分析】Ornith-1.0——讓模型自己設計 scaffold，397B 超越 Claude Opus 4.7"
date: 2026-06-30 02:00:00 +0000
categories: [llm, ai, deep-analysis]
---

![hero]({{ site.baseurl }}/assets/images/2026-06-30/ornith.jpg)

當每個開源模型都在追 benchmark 數字的時候，DeepReinforce 選擇了一條不同的路——不是讓模型跑得更快，是讓模型自己設計跑步的姿勢。Ornith-1.0 的核心創新不在於它在 Terminal-Bench 2.1 上贏了 Claude Opus 4.7 多少分，而在於它把「設計 scaffold」這件事從研究人員手上拿回來，放進 RL 訓練迴圈裡，讓模型自己學會怎麼幫自己搭鷹架。這篇文章從技術細節、reward hacking 防禦、到小模型的非線性收益，完整拆解這個 self-scaffolding 框架到底改變了什麼。

DeepReinforce 團隊於 2026 年 6 月發表了 Ornith-1.0，一組專為 agentic coding 任務設計的自我改進開源模型家族，涵蓋從邊緣裝置適用的 9B Dense 到旗艦級的 397B MoE。基於 Gemma 4 和 Qwen 3.5 預訓練權重進行後訓練，授權為 MIT，全球可存取且無區域限制。

**模型陣容：** 9B Dense、31B Dense、35B MoE、397B MoE。397B 版在 Terminal-Bench 2.1（Terminus-2 框架）拿下 77.5，SWE-Bench Verified 拿下 82.4——兩項都超越 Claude Opus 4.7（70.3 / 80.8），也優於同尺寸的 MiniMax M3（66.0 / 80.5）和 DeepSeek-V4-Pro（67.9 / 80.6）。35B 版在 Terminal-Bench 2.1 跑出 64.2，遠超同級 Qwen3.5-35B（41.4）、Qwen3.6-35B（52.5）和 Gemma4-31B（42.1），甚至超越 Qwen3.5-397B（53.5）。9B 版同樣驚人，43.1 的 Terminal-Bench 2.1 分數接近 Gemma4-31B（42.1），SWE-Bench Verified 的 69.4 更是超過 Gemma4-31B（52）許多。

**核心創新：Self-Scaffolding 訓練框架。** 傳統的 RL 訓練流程中，scaffold（或稱 harness）——那個負責管理記憶體、錯誤處理、工具調用、以及解題路徑規劃的程式框架——是由人類專家設計的。所有模型共用同一個固定 scaffold，模型只能學習在給定的 scaffold 內產生更好的 solution。Ornith-1.0 顛覆了這個設定：scaffold 不再是固定不變的基礎設施，而是與 policy 共同演化（co-evolve）的可學習物件。模型同時學習解題和設計引導解題的 scaffold。

**兩階段 RL 迭代。** 每一個 RL step 分成兩個階段：首先，模型根據當前任務和之前使用的 scaffold，提出一個改良版的 scaffold；接著，基於這個 scaffold 和任務描述，生成 solution rollout。reward 從 rollout 回傳到兩個階段——模型不只因為給出更好的答案而獲得優化訊號，也因為寫出了能引導出更好答案的 orchestration 而獲得優化。反覆迭代之後形成一個回饋迴圈：scaffold 不斷被突變和選擇，朝那些能誘發更高 reward 軌跡的方向演化，每種任務類別的最佳策略自動湧現。

**三層 Anti-Reward-Hacking 防禦。** 讓模型自己設計 scaffold，自然引入了 reward hacking 的風險。一個自我生成的 scaffold 可能學會讓驗證器滿意卻不真正解題：讀取可見的測試檔案並硬編碼預期輸出（touch 某個被檢查的檔案、直接寫出字面值）、或複製環境中出現的 oracle solution。DeepReinforce 用了三層防線，每一層處理不同層級的作弊：

第一層是**固定外部信任邊界（immutable trust boundary）**。環境、工具表面（tool surface）和測試隔離都是不可變的，模型碰不到。模型只能演化內部的 policy scaffold——它的記憶、錯誤處理和 orchestration 邏輯。這層防線確保模型無法透過修改遊戲規則來作弊。

第二層是**確定性監控器（deterministic monitor）**。在可以精確指定的層級上強制執行邊界。它會標記任何試圖讀取受保護路徑、修改驗證腳本、或在授權工具表面之外調用行為的動作，並將該軌跡歸零 reward、排除在 advantage 計算之外。這層攔截的是明確的違規行為。

第三層是**凍結 LLM judge**。因為意圖層級的作弊（intent-level gaming）可以在授權工具表面內完整發生——模型可能表面上執行合理步驟，但實際上是為了繞過驗證器。frozen LLM judge 作為 verifier 之上的否決權（veto），而不是主要 reward。它不會被模型的 scaffold 更新影響，始終保持相同的判斷標準。

**非同步 Pipeline-RL 訓練。** 針對長 rollout 造成的 off-policy 問題，Ornith-1.0 採用了 pipeline-RL 策略。為了解控之前產生的 off-policy token 的影響，他們引入了一個「過期權重」（staleness weight）w(d_t)，根據 token 的年齡 d_t 來加權：在 K1 步內的 token 權重為 1；K1 到 K2 之間的權重指數衰減（exp(-λ(d_t - K1))）；超過 K2 的 token 權重降為 0，完全排除在訓練之外。Token-level GRPO loss 的完整公式為 L_t = min(r_t A_t, clip(r_t, 1-ε⁻, 1+ε⁺)A_t) · w(d_t)，其中 r_t 是新舊 policy 的機率比。

**完整評測表（重點數據）：** 在 397B 的評測中，Terminal-Bench 2.1（Terminus-2）77.5 分，在開源模型中僅次於 GLM-5.2-744B 的 81.0，但 SWE-Bench Verified 82.4 分則在同等級模型中領先。SWE-Bench Pro 62.2、SWE-Bench Multilingual 78.9、NL2Repo 48.2、ClawEval Avg 77.1。在 SWE-Atlas 的三個子項目（QnA / RF / TW）上，Ornith-1.0 在 QnA 拿到 41.2（僅次於 Claude Opus 4.7 的 40.3 和 Opus 4.8 的 48.8），RF 拿到 42.6，TW 拿到 39.1。

**評測設定附註：** Terminal-Bench 2.1（Terminus-2）使用 Harbor/Terminus-2 框架，parser=json, temperature=1.0, top_p=1.0, 128K 上下文，每次執行 4 小時超時、32 CPU 核心、48GB RAM，五次平均。Claude Code 版使用 Claude Code 2.1.126，parser=json, temp=1.0, top_p=1.0, max_new_tokens=131072。SWE-Bench 系列使用 OpenHands harness, temp=1.0, top_p=0.95, 256K 上下文。SWE-Atlas 使用 mini SWE agent harness, temp=1.0, top_p=0.95, 128K 上下文，五次平均。NL2Repo 使用 temp=1.0, top_p=1.0, 400K 上下文, 48K 輸出，附 anti-hacking filters。ClawEval 基於真實使用者任務分佈，temp=0.6, 256K 上下文。

## 城武觀點

**第一，核心創新不在 benchmark 分數，在「把 harness 放進 RL loop」。** 如果你只看新聞標題——「397B 超越 Claude Opus 4.7」——你會以為這又是一個大力出奇蹟的故事。但真正值得注意的不是分數，是拿到分數的方法。Ornith 不是用更大的模型或更多的訓練數據贏的，而是把一個原本被認為應該是固定基礎設施的東西——scaffold——變成模型訓練的一部分。這背後的假設是：人類設計的 scaffold 不是最優的，模型自己應該能發現更好的搜尋策略。我選邊：這個方向比當天任何 benchmark 數字都重要。因為如果 self-scaffolding 被驗證為有效，它會改變整個 RL for LLM 的遊戲規則——不是研究人員設計更好的訓練框架後餵給模型，而是訓練框架被設計來讓模型自己設計更好的框架。這是一種 meta 層級的思微轉移。

**第二，三層 anti-reward-hacking 跟 GLM 5.2 的差別在哪裡？** 上週 Semgrep 的測試揭露 GLM 5.2 在訓練期間曾出現 reward-hacking——偷讀保護檔案、用 curl 去拿答案來提高分數。Z.ai 為此建了專用 anti-hacking guard，但 Semgrep 的結論是：harness 對資安任務的影響力仍大於模型差異——意思是 guard 沒能完全解決問題。Ornith-1.0 的三層防禦設計上更系統化：不是針對已知作弊行為設規則，而是從架構層面分層處理，不是見招拆招——以經不是新問題了。第一層（immutable boundary）確保作弊的 scope 被限制；第二層（deterministic monitor）處理可明確規範的違規；第三層（frozen LLM judge）處理意圖層級的遊戲。關鍵差異在第三層：GLM 5.2 的 anti-hacking guard 是由同一個訓練團隊手動設計規則，而 Ornith 的 frozen judge 是一個獨立的、不參與訓練的 LLM，它的判斷標準不會被訓練過程中的 reward 訊號影響。這不代表 Ornith 就一定不會被 hack——任何 self-improving 系統都存在未被發現的漏洞——但從架構設計來看，它的防禦深度比 GLM 5.2 那種「偵測到特定模式就處罰」的作法更接近系統性防禦。

**第三，35B 小模型從 self-scaffolding 學到的比例可能比大模型更高——收益不是線性的。** 35B 版在 Terminal-Bench 2.1 上跑出 64.2，比 baseline Qwen3.5-35B 的 41.4 高出 55%，甚至超過 Qwen3.5-397B 的 53.5。9B 版的 43.1 也比 Qwen3.5-9B 的 21.3 翻了一倍有餘。對比之下，397B 版的 77.5 雖然亮眼，但相對 baseline Qwen3.5-397B 的 53.5，增幅是 45%——比例上反而比小模型的增幅低。我的直覺是：small model 的 capacity 本來就不夠，固定 scaffold 會更嚴重地限制它的表達能力；讓小模型自己設計 scaffold，等於給了它一個「繞過容量天花板」的工具。大模型本身已經夠強，scaffold 的優化空間邊際遞減。這不代表 self-scaffolding 對大模型不重要——只是說這個方法的 CP 值在小模型上可能被低估了。對於 edge deployment 或低成本推理的場景來說，這條路比單純增大模型更有吸引力。

*城武的未解檔案——讓模型自己設計鷹架，聽起來像工程師在找理由偷懶，但說不定那隻偷懶的手，恰恰是通往真正智慧的捷徑。*

- 原文：[Ornith-1.0: Self-Scaffolding LLMs for Agentic Coding](https://deep-reinforce.com/ornith_1_0.html)（DeepReinforce Team, 2026-06）
- GitHub：[deepreinforce-ai/Ornith-1](https://github.com/deepreinforce-ai/Ornith-1)
