---
layout: post
title: "【論文拆解】DSpark——DeepSeek 的半自迴歸推測解碼，如何在重載下加速 60-85%"
date: 2026-06-28 03:00:00 +0000
categories: [llm, ai, paper-breakdown]
---

![hero]({{ site.baseurl }}/assets/images/2026-06-28/dspark-speculative-decoding.jpg)

> 如果說 speculative decoding 是 LLM 推理加速的聖杯，那 DSpark 不是來搶聖杯的——它是在問：聖杯在生產環境裡還能不能用？

## 原文摘要

### 問題：推測解碼的兩個瓶頸

推測解碼（Speculative Decoding）的基本架構大家以經不陌生了：一個輕量級的 draft model 先快速產出一段候選 token，再由完整大小的 target model 用一次 forward pass 平行驗證，透過 rejection sampling 保證輸出分佈不變。這套機制的加速倍率取決於三個變數：draft 時間（T_draft）、驗證時間（T_verify）、單輪接受長度（τ）。

近年來，研究社群大致走向了兩條路。**自迴歸式 drafter**（如 Eagle3）逐 token 依賴先前的取樣結果，品質好但 T_draft 隨長度線性增長，只能做短 block。**平行式 drafter**（如 DFlash）一次 forward pass 產出全部 draft token，T_draft 幾乎不隨 block 長度增加，但每個位置的預測彼此獨立，導致嚴重的「尾端接受率衰減」（suffix acceptance decay）——越後面的 token 越容易被拒絕。

這還不是最麻煩的。真正讓 parallel drafter 在生產環境吃癟的是第二個問題：**驗證浪費**。平行生成可以輕鬆吐出很長的 draft block，但把它們全部送進 target model 驗證，在高併發場景下反而會拖垮系統吞吐量——因為那些被拒絕的 token 佔據了 target model 的 batch capacity，排擠了其他活躍請求的運算資源。

DSpark 同時處理這兩個瓶頸。

### 方法一：半自迴歸架構

DSpark 的核心設計叫做 **semi-autoregressive generation**——把 draft 生成拆成兩個階段。

**平行階段**：以 DFlash 為 backbone，對整個 block 做一次 forward pass，產出 hidden states 和 base logits。這部分維持了「T_draft ≈ 常數」的優勢。

**順序階段**：在 base logits 上疊一個輕量級的 sequential head，注入 prefix-dependent 的 transition bias，讓每一個位置知道前面已經 sample 了什麼 token。論文提供了兩種實例化：

- **Markov head**：只依賴前一個 token 的 first-order transition，用 low-rank factorization（r=256）壓低儲存和計算成本。預設採用。
- **RNN head**：用一個 gated recurrent unit 累積 block 內完整的 prefix history，能 capture 更長距離的依賴，但在實測中只比 Markov head 好一點點，考量到實作複雜度，論文以 Markov 為 default。

白話解釋就是：平行 backbone 負責「快」，sequential head 負責「準」。傳統 parallel drafter 之所以尾端崩壞，是因為它在 position 2 不知道 position 1 到底 sample 了「of」還是「no」，所以可能產生「of problem」這種跨 mode 撞車的結果。Markov head 在 position 1 確定了之後，直接在 position 2 把「course」的路徑 boost 起來。這個「只加一層輕量 sequential，不破壞平行骨幹」的選擇，讓整個 block 的接受率曲線從迅速下滑變成了穩定維持。

### 方法二：Confidence-Scheduled Verification

有了更好的 draft 品質還不夠——生產環境裡，驗證長度不能傻傻地用固定值。DSpark 的驗證排程系統由兩個元件組成：

**Confidence Head（信心預測頭）**：對每個 draft position 輸出一個 scalar c_k，代表「給定前面所有 token 都已被接受的情況下，這個位置會 survive 驗證的條件機率」。架構極其輕量——一層 linear projection + sigmoid。監督訊號來自理論上的接受率 c*_k = 1 - ½||p_d - p_t||₁（即 total variation distance）。

但神經網路的信心估計通常過度自信。為了解決這個問題，論文提出了 **Sequential Temperature Scaling（STS）**——依序從左到右對 cumulative survival probability 做 temperature scaling，把 ECE 從 3-8% 壓到約 1%，讓信心分數真正對應到實際接受率。

**Hardware-Aware Prefix Scheduler（硬體感知驗證長度排程器）**：這才是 DSpark 真正與眾不同的貢獻——它把驗證長度選擇 formalize 為一個**全域吞吐量最大化問題**。

對於一批 R 個活躍請求，每個請求有 confidence sequence c_r,1...c_r,γ。排程器的目標函數是 Θ = τ × SPS(B)，其中：
- τ 是期望接受 token 總數（來自 confidence 的累積乘積）
- B 是驗證階段的 batch size（R + 預定驗證的 draft token 數）
- SPS(B) 是引擎吞吐量曲線（steps per second 對 batch size 的 profile）

演算法本質上是貪婪的：把所有 draft token 依 survival probability 從高到低排序，逐一加入驗證集，並在 Θ 開始下降時 early-stop。因為 survival probability 單調非增，這個 greedy 解可以找到全域最優。

但這裡有一個微妙的理論問題：如果 scheduler 在決定是否驗證位置 k 時偷看了位置 k+1 的資訊，就會破壞 lossless guarantee。為了解決這個因果洩漏，排程器在 Θ 首次下降時立即停止——這確保了 admission decision 只依賴於當前已處理的 prefix，不依賴未來 token 的實現。（論文 Appendix A 用一個 2-token 的反例清楚地展示了 selection bias 的產生機制。）

### 生產環境的工程挑戰

論文花了相當篇幅討論現實部署中遇到的問題——這在學術論文中不常見，但也反映了 DeepSeek 從「發論文」到「發基礎設施」的轉向。

**訓練層面**：DSpark 需要 target model 的完整輸出分佈來監督訓練。把 target model 的 full-vocabulary logits（V ≈ 10⁵）在平行 worker 之間傳輸會產生嚴重的頻寬瓶頸。解決方案：只傳 hidden states（O(d) 量級），LM head projection 在 drafter worker 端本地執行。

另外他們用 **anchor-bounded sequence packing** 來解耦 drafter 的計算成本與 target model 的 context length——從訓練序列中隨機取樣固定數量的 draft anchor，打包成 dense batch，用 token-level attention indices 來維護因果遮罩。

**推論層面**：Algorithm 1 假設 SPS(B) 是平滑的單峰曲線，但真實硬體的 throughput 曲線是離散的階梯狀。更麻煩的是，CUDA graph replay 和 Zero-Overhead Scheduling（ZOS）要求驗證階段的 batch size 在當前 step 完成之前就被知道。

DSpark 的解法是**非同步排程**：用兩步前的 confidence head 輸出來估計當前的驗證容量。因為候選 token 仍然嚴格依最新的 confidence score 排序，這個 temporal offset 只影響 truncation length 的決定，不影響 rank-preserving 的選擇機制。這等於在「理論無損」和「工程可行」之間找到了實際的平衡點。

### 實驗結果

**離線 benchmark**：在 Qwen3-4B/8B/14B 和 Gemma4-12B 上測試，涵蓋數學推理（GSM8K、MATH500、AIME25）、程式碼生成（MBPP、HumanEval、Live-CodeBench）、日常對話（MT-Bench、Alpaca、Arena-Hard）三個領域。離線評測關閉了 confidence scheduler，純粹比較 draft 品質。

結果：DSpark 在三個 target 尺度上的 macro-average accepted length 比 Eagle3 提高 26.7%-30.9%，比 DFlash 提高 16.3%-18.4%。更重要的洞察來自位置分析：

- **Position 1 的容量優勢**：平行 drafter 因為可以疊更深的網路，在第一個 draft position 的接受率遠高於淺層的 Eagle3（Math: 0.88 vs 0.81；Chat: 0.72 vs 0.53）。因為 speculative decoding 是嚴格的 prefix survival 過程，第一顆 token 被拒絕就整輪報廢——所以這個初始優勢有不成比例的槓桿效應。
- **尾端依賴建模的關鍵**：Eagle3 在 2-7 position 維持或提升接受率（Chat: 0.53→0.74），而 DFlash 迅速下滑（0.72→0.63）。DSpark 的半自迴歸架構成功保留了平行骨幹的高初始容量，同時用 sequential head 緩解了尾端衰減。

**生產環境部署**：在 DeepSeek-V4-Flash 和 V4-Pro 的 serving engine 上，與 MTP-1 baseline（DeepSeek-V3 時代的單 token 驗證設定）進行比較。

核心結果（圖 7 的 Pareto frontier）：
- V4-Flash：中等 SLA（80 tok/s/user）下吞吐量提升 51%；在 matched throughput 下 per-user 生成速度提升 60-85%
- V4-Pro：中等 SLA（35 tok/s/user）下吞吐量提升 52%；在 matched throughput 下 per-user 生成速度提升 57-78%

更關鍵的是，在嚴格 SLA（Flash 120 TPS、Pro 50 TPS）下，MTP-1 baseline 的吞吐量急遽惡化，而 DSpark 透過動態縮減驗證長度來維持服務品質。這個「在 baseline 無法運作的情境下仍能運作」的貢獻，比數字上的加速更有意義。

圖 8 展示了負載感知的動態行爲：在低併發時， scheduler 分配 4-6 個驗證 token；在高併發時，自動縮減到 2-3 個——這個平滑的退化曲線比任何靜態 threshold 策略都務實。

### 限制

論文誠實地承認了一個限制：confidence scheduler 只處理驗證階段的浪費，不處理 draft 階段的浪費。對於本質上接受率就低的複雜查詢（如開放式聊天），產生 γ 個 draft token 的固定成本是無法回收的。未來方向包括在 draft model 內引入難度感知的 early exiting。

---

## 城武觀點

### 一、核心貢獻不是「更快」，而是「在重載下更快」

跑過 speculative decoding 的人都知道一件事：離線測很美的數字，上線之後經常變成一場災難。Eagle3 在輕載下確實快，但一旦請求量上來，draft 的線性成本就開始發酵——每顆 token 都要跑一次 forward pass，GPU 的 batch 利用率迅速崩盤。DFlash 解決了 draft 線性成本的問題，但它創造了一個新問題：尾端接受率衰減導致驗證浪費，在重載下一樣會讓系統吞吐量下滑。

DSpark 的 hardware-aware prefix scheduler 把系統負載當作**輸入參數**來決定驗證長度，這比任何純演算法改進都更務實——因為它承認了「最快的模型不在真空中運行」。七成以上的 speculative decoding 論文都在比誰的 accepted length 更高，但 DSpark 這篇告訴你：accepted length 高沒有用，如果你的系統在重載下會把加速吃光。從「演算法對抗」到「系統對抗」，這個思微轉向本身就是一個貢獻。

### 二、60-85% 加速的數字，能搬到其他 infra 嗎？

論文給出的 60-85%（V4-Flash）和 57-78%（V4-Pro）加速數字很漂亮。但我們必須問：這是在 DeepSeek 自己的 infra 上的數字，能在其他公司復現嗎？

問題出在兩個地方。第一，**confidence head 需要校準**。STS 用一個 held-out validation set 做 calibration，這組校準參數在不同硬體、不同模型、不同 prompt 分佈下都可能需要重新調整。如果你的使用者 traffic 跟 DeepSeek 的 profile 差距很大，信心分數的校準可能會偏掉，排程器就會做出次優決定。

第二，**hardware-aware prefix scheduler 需要硬體的 throughput profile**。SPS(B) 曲線必須在引擎初始化時 profiling 一次，這在自家 infra 上沒問題，但如果你要把 DSpark 部署到 AWS 或 GCP 的異質 GPU 叢集上，每台機器都要重新 profile。更何況，在 shared infra 上，SPS(B) 會因為鄰居的干擾而變動——這不是 profile 一次就能解決的事。

論文開源了權重和訓練程式碼，這點無庸置疑值得鼓掌。但 deployment 的 know-how——confidence calibration 的校準資料、SPS profiling 的實作細節、非同步排程的 buffer management——這些才是真正決定生產環境成敗的關鍵，而它們沒有被開源。

### 三、「不選邊」的工程哲學

平行 drafting：快但不準。自迴歸 drafting：準但慢。DSpark 選了中間路線：平行 backbone + 順序 head。

這個「不選邊」的選擇，從技術上來看是最合理的——它同時拿到了兩種架構的好處。但從哲學層面來看，它也反映了 DeepSeek 一貫的風格：**不追求單一指標的極致，而是追求真實部署場景下的整體最優**。

同樣的風格也體現在 MTP-1 baseline 的選擇上。為什麼 DeepSeek 之前在 V3 時代用 MTP-1（單 token 驗證）而不是更先進的 MTP-3/5？因為在 DeepSeek 的生產環境中，靜態的多 token drafter 在高併發下會 degrade throughput。這個「看起來保守」的選擇，在當時其實是經過系統權衡後的合理結果。DSpark 的價值不是推翻了這個權衡，而是提供了一個動態版本的解，讓系統從「保守但穩定」變成了「動態但穩定」。

這是一種工程文化：與其追求論文裏的頂尖數字，不如確保系統在各種 load 下都不會崩。DSpark 就是這個文化的最新產物。

*城武的未解檔案——60-85% 的加速在 DeepSeek 的 infra 上是真的，但在你自己的集群上能跑多少，問你的 SPS(B) curve 才知道。*

- 原文：[DSpark: Confidence-Scheduled Speculative Decoding with Semi-Autoregressive Generation](https://github.com/deepseek-ai/DeepSpec/blob/main/DSpark_paper.pdf)（Xin Cheng et al., Peking University / DeepSeek-AI, 2026）
