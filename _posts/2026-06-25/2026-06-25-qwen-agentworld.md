---
layout: post
title: "【論文拆解】模擬環境訓練比真實環境更強？Qwen-AgentWorld 的反直覺答案"
date: 2026-06-25 02:00:00 +0000
categories: [llm, ai, paper-breakdown]
---

![hero]({{ site.baseurl }}/assets/images/2026-06-25/qwen-agentworld.jpg)

城武導讀：Qwen-AgentWorld 是一篇會讓你重新思微「訓練資料愈真實愈好」這個假設的論文。Qwen Team 提出的語言世界模型（Language World Model）可以在 7 個領域模擬 agent 環境，而且用模擬環境訓練出來的 agent，表現竟然超越了用真實環境訓練的版本。這很反直覺——但城武認為這個結論是對的，只是有一個關鍵前提：模擬器的品質決定了訓練品質的上限。以下拆解。

## 論文摘要

### 核心貢獻

Qwen-AgentWorld 是第一個原生語言世界模型（Language World Model, LWM）家族，專門用於模擬通用 agent 環境。它涵蓋 7 個領域——MCP、Search、Terminal、Software Engineering（SWE）、Android、Web、OS——並使用長鏈思考（long chain-of-thought reasoning）來進行環境模擬。一個模型同時覆蓋文字介面（Terminal、SWE、MCP、Search）和圖形介面（Android、Web、OS）兩種截然不同的環境類型。

兩個模型尺寸：Qwen-AgentWorld-35B-A3B 和 Qwen-AgentWorld-397B-A17B，採用混合專家（MoE）架構。訓練資料來自超過 1,000 萬條環境互動軌跡，涵蓋三大來源：專屬 agent 基礎設施（容器化沙箱、MCP 伺服器、GUI 環境）、公開互動紀錄（終端機錄製、工具呼叫日誌，經多 agent 清洗管線處理）、以及內部 agent 開發過程產生的軌跡。

論文提出兩種使用世界模型來提升 agent 能力的方式：

1. **解耦環境模擬器（Decoupled Environment Simulator）**：世界模型作為獨立模擬器，可大規模、可控地模擬數千個真實世界環境供 agent 做強化學習（Sim RL），效果超越僅使用真實環境訓練。

2. **統一 Agent 基礎模型（Unified Agent Foundation Model）**：世界模型訓練作為一種高效的預熱（warm-up），直接提升模型在下游 7 個 agentic benchmark 上的多輪任務表現，甚至對域外任務也有幫助。

### 為什麼要做語言世界模型？

論文明確說：不是為了降低成本，而是作為推進前沿的互補軸。這個定位值得注意——他們沒有說「世界模型比真實環境便宜」，而是說「世界模型能做到真實環境做不到的事」。

具體來說有兩個核心優勢：

**可擴展性（Scalability）**：不需要容器沙箱或虛擬機，就能做 turn-level 的 scaling——想模擬一千個環境就模擬一千個，沒有基礎設施瓶頸。更重要的是，可以覆蓋真實環境中難以實現的極端場景。

**可控性（Controllability）**：可以精確設計對抗性條件（adversarial conditions），有系統地暴露 agent 的弱點。這是在真實環境中很難做到的——真實環境的隨機性多半是噪音，不是刻意設計的壓力測試。

### 形式化定義與環境軌跡格式

語言世界模型 f_θ 根據系統提示 c、互動歷史和當前行動，預測下一個環境觀察：

ô_{t+1} = f_θ(c, o_{≤t}, a_{≤t})

論文定義了統一的環境軌跡架構：

- system_prompt = task_description ⊕ action_space ⊕ initial_state ⊕ demonstrations ⊕ simulation_instruction
- turn_t = (action_t, observation_t)
- trajectory = system_prompt ⊕ [turn_1, …, turn_T]

也就是說，每個環境軌跡從一個包含任務描述、行動空間、初始狀態、示範例和模擬指令的系統提示開始，後面接上一連串的（行動，觀察）回合。這個統一的格式讓同一個世界模型可以處理七個完全不同的領域。

### 七個領域的環境設計

論文將 agent 環境分為 7 個領域，各自有不同的行動/觀察介面和核心能力需求：

**MCP**（Model Context Protocol）——行動是 JSON Tool Call，觀察是工具回應，核心能力是世界事實知識。

**Search**——行動是網頁搜尋與內容提取，觀察是對話歷史，核心能力同樣是世界事實知識。

**SWE**（Software Engineering）——行動包括 Read、Edit、Bash 等程式開發操作，觀察是檔案內容與 diff，核心能力是程式執行推理。

**Terminal**——行動是 Bash 指令，觀察是終端機輸出，核心能力是長上下文因果推理。

**Android**——行動包括 Touch、Swipe、Type 等觸控操作，觀察是 UI view hierarchy 和 app state，核心能力是視覺狀態推理。

**Web**——行動包括 Click、Type、Navigate 等瀏覽操作，觀察是 Accessibility tree 和瀏覽器狀態，核心能力也是視覺狀態推理。

**OS**（桌面作業系統）——行動是滑鼠和鍵盤，觀察是 Accessibility tree 和視窗狀態，核心能力同樣是視覺狀態推理。

文字領域（Terminal、SWE、Search、MCP）佔整體資料的 72.4%，GUI 領域（Android、Web、OS）佔 27.6%。MCP 的平均上下文長度最長（59.3k tokens），Terminal 最短（12.9k tokens）。值得注意的是，不同領域所需的模擬能力有本質差異——文字領域側重事實知識和因果推理，GUI 領域則需要對視覺狀態的動態變化的理解。

### 三階段訓練管線

論文的核心工程貢獻是三階段訓練管線：CPT → SFT → RL，每一階段有明確的目標。

**Stage 1 – Continual Pre-Training（CPT）**

注入廣泛的世界知識和狀態轉移動態。訓練資料包含環境軌跡和專業領域語料庫（工業控制、網路安全、法律、醫療、金融、時事）。

關鍵創新是 **turn-level 資訊理論 loss masking**。論文團隊發現環境互動軌跡中有大量固定模式 token——例如 API 呼叫的 echo、系統回應的 boilerplate——如果全部參與 loss 計算，模型會浪費容量去背誦這些模式。於是他們對每個（action, observation）pair 計算四種統計量：Overlap（重疊率）、Novelty（新穎度）、Jaccard（相似度）、length ratio（長度比），然後將 token 分成 7 個語義類別，每個類別有不同的保留比例：

- retrieval / expansion / action：100% 保留（這些是真正的資訊承載 token）
- transform：50% 保留
- boilerplate：僅 10% 保留
- echo：僅 5% 保留

這個設計的結果是：模型把學習資源集中在真正有資訊量的轉換點上，而不是浪費在背誦固定格式。

**Stage 2 – Supervised Fine-Tuning（SFT）**

目標是激活明確的下一狀態預測推理能力。從推理模型進行 rejection sampling：10,250 條候選軌跡 → 保留 7,094 條（留存率 69.2%）。平均長度 19,443 tokens，平均 13.4 回合。上下文視窗為 256k tokens。

系統提示透過 AutoResearch 自動生成（10 種模板變體），SFT 提示模板也做了多樣化（v2 到 v11），目的是提升模型對不同提示格式的泛化能力。

每個領域的 SFT 資料量差異很大：MCP 只有 179 條（因為最長、最複雜），Terminal 有 1,580 條，Web 有 1,605 條。

**Stage 3 – Reinforcement Learning（RL）**

使用混合 rubric-and-rule 獎勵來強化模擬逼真度。RL 演算法採用 GSPO（Generalized Sampled Policy Optimization），提示長度上限 128k tokens。共 92,308 條軌跡參與 RL 訓練。

獎勵設計分為兩部分，權重比 9：1：

1. **5 維度 Rubric（LLM-as-Judge）**：Format（格式正確性）、Factuality（事實準確度）、Consistency（狀態一致性）、Realism（逼真度）、Quality（整體品質），每個維度 1-5 分
2. **規則驗證器（Rule-Based Verifier）**：二元正確性錨點（0/1），確定性的硬規則檢查

論文還記錄了幾個訓練穩定性對策：每條軌跡只擴展 1 個回合（避免共享 prefix 導致的獎勵崩潰）；rubric 獎勵收斂穩定，但 Turing-test 設計和 reference-reward 設計則失敗了；嚴格的 tag 提取機制防止模型用自誇來 hack 獎勵。

### AgentWorldBench

為了評估語言世界模型的模擬品質，論文建構了 AgentWorldBench——一個從真實世界互動中抽樣的綜合評估基準。

建構方式：從 **5 個前沿模型**（包括 Claude Opus 4.6、GPT-5.4、Qwen 系列等）在 **9 個既有 benchmark** 上的真實互動中取樣，總計 2,170 個 turn-level 評估樣本。9 個來源 benchmark 包括：Terminal-Bench 1.0 & 2.0、SWE-Bench Verified、OSWorld-Verified、Tool Decathlon、MCPMark、WideSearch、AndroidWorld、WebArena Verified。

關鍵設計：**嚴格的域外（Out-of-Distribution）分割**——資料來源層級的劃分，確保評估樣本在來源 benchmark 層面上與訓練資料不重疊。

評估方式採用 **Reference-Grounded Judging**：Judge 比較模型的預測輸出與真實 ground truth。對於確定性內容採 exact match，對於不確定性內容採 plausibility 檢查，執行時期中繼資料採格式/範圍檢查。Judge 模型經過 Turing-test 準確率篩選，最終選用 GPT-5.2（跨 Judge 排名一致性 ρ = 0.92-0.99）。

評估 5 個維度：事實準確度（factual accuracy）、狀態一致性（state coherence）、行動有效性（action validity）、因果一致性（causal consistency）、領域忠實度（domain fidelity）。

### 主要結果

Qwen-AgentWorld 在 AgentWorldBench 上顯著超越現有前沿模型。具體來說：

當作為解耦環境模擬器使用時，用 Qwen-AgentWorld 產生的模擬環境進行 agentic RL 訓練，效果超越了僅使用真實環境訓練。當作為統一 agent 基礎模型使用時，世界模型訓練的 warm-up 顯著提升了 7 個 agentic benchmark 的下游表現。

這兩個結果共同支持了論文的核心論點：語言世界模型不只是一種「便宜的模擬器替代品」，而是一種可以超越真實環境訓練效果的新範式。

## 城武觀點

這篇論文的標題很誠實——它說「Language World Models」，沒有誇大成「我們做出了一個超強的世界模型」。但真正值得討論的，不是 397B 參數的數量級，而是論文底下幾個被 benchmark 數字掩蓋的訊號。

**第一個訊號：模擬訓練 > 真實訓練，但前提是什麼？**

論文最反直覺的結果是：用 Qwen-AgentWorld 模擬的環境來訓練 agent，效果超越了用真實環境訓練。這違反了我們的直覺——愈真實的訓練資料應該愈好，這不是常識嗎？

城武認為這個結論是對的，但有一個關鍵前提：**模擬器的品質決定訓練品質的上限**。為什麼刻意設計的對抗性條件會比真實環境的隨機性更有訓練價值？因為真實環境的隨機性多半是噪音——無意義的變異只會讓 agent 學到「對抗噪音」而不是「對抗真正的困難」。Qwen-AgentWorld 的可控性讓研究者可以精確設計「剛好夠難」的訓練場景，就像籃球教練在訓練場上刻意設計的戰術對抗，比實戰中隨機遇到的狀況更有訓練效果。

但反過來說：如果模擬器有 blind spot——某個它不會產生的環境狀態、某種它無法模擬的邊界情況——那麼 agent 學到的策略也會有同樣的盲點。這不是模擬訓練 vs 真實訓練的問題，而是**訓練分佈能否覆蓋部署分佈**的問題。Qwen-AgentWorld 的模擬器再強，如果它的訓練資料（來自 9 個既有 benchmark）本身就存在 bias，那模擬器產生的環境也只會放大那個 bias。

**第二個訊號：397B 不是創新，三階段管線才是**

397B 參數聽起來很猛，但真正的創新不在參數數量，而在三階段訓練管線和資訊理論 loss masking。說實話，用 10M+ 條軌跡訓練一個世界模型，參數大到 397B 只是規模的自然結果——換成 DeepSeek 或 Meta 來做，參數只會更大不會更小。

真正值得關注的是 Stage 1 的 turn-level information-theoretic loss masking。這不是一個學術炫技，而是一個極度務實的工程決策：論文團隊花力氣去分析每個 token 的資訊貢獻，然後對 boilerplate 只保留 5-10% 的 loss，對真正的資訊承載 token 保留 100%。這個設計背後的信息是：**在 agent 領域，「哪裡值得學」比「有多少資料」更重要。** 很多團隊在收集更多資料上砸資源，卻很少思考哪些 token 真正值得模型去學。這是一個被忽略但極其重要的工程洞見。

以經有很多論文在 benchmark 上風光無限，到了真實場景就水土不服。Qwen-AgentWorld 的 loss masking 至少確保了模型不會浪費容量在背誦格式上——這是一個好的開始，但不是保證。

**第三個訊號：7 個領域，但資料來自 benchmark——學到的是 benchmark 還是真實世界？**

論文涵蓋 7 個領域，幾乎涵蓋了 agent 可能遇到的所有環境類型。這讓 Qwen-AgentWorld 不只是「某一個 benchmark 的模擬器」，而是「通用 agent 訓練基礎設施」的雛形。

但城武要追問一個不舒服的問題：這 7 個領域的訓練資料都來自現有 benchmark——從 5 個模型在 9 個既有 benchmark 上的互動資料建構的。也就是說，模型學到的是「在已知的 benchmark 環境中如何表現」，而不是「在任何真實環境中如何表現」。這兩者的差距，就是學術界一直在討論的 **benchmark contamination** 的進階版——不只是 model 看過 benchmark 的題目，而是整個世界模型本身就是從 benchmark 的互動資料長出來的。

論文在 AgentWorldBench 的建構上已經注意到了這個風險——用嚴格的域外分割（資料來源層級不重疊）來降低 contamination——而且 5 個維度的評估設計也比單一指標更全面。但這些維度仍然是從 benchmark 資料歸納出來的評估標準，不是從真實世界獨立取樣的驗證。有一個根本問題沒有被回答：**一個在 AgentWorldBench 上表現優異的世界模型，在真實世界中模擬 agent 環境時，表現是否仍然優異？**

這不是否定 Qwen-AgentWorld 的價值——恰恰相反，正因為它有可能成為通用 agent 訓練基礎設施，我們才需要更嚴格地檢驗它的基礎到底有多堅實。論文有開源（GitHub: QwenLM/Qwen-AgentWorld），這是好的第一步。第二步是有人真的用它來訓練一個 agent，放到真實世界去看看效果。

至於那個「模擬訓練超過真實訓練」的結論——如果模擬器真的夠好，從新定義 agent 訓練的 pipeline 不是不可能。但這需要開源社群和學術界一起來復現、驗證、挑戰這個結果。

*城武的未解檔案——模擬環境訓練 agent 比真實環境更有效，前提是模擬器不能有 blind spot。但誰來保證模擬器沒有 blind spot？*

- 原文：[Qwen-AgentWorld: Language World Models for General Agents](https://arxiv.org/abs/2606.24597)（Qwen Team, arXiv, 2026-06-24）
