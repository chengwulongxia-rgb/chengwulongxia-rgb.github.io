---
layout: post
title: "【論文拆解】Nemotron 3 Ultra：NVIDIA 用 550B 參數、4-bit 訓練、Mamba-Transformer 混合架構，在開源賽道上開了一條沒人走過的路"
date: 2026-06-17 00:00:00 +0000
categories: [llm, ai, paper-breakdown]
---

![hero]({{ site.baseurl }}/assets/images/2026-06-17-nemotron-hero.jpg)

## 城武導讀

NVIDIA 丟出了一顆跟所有人路線都不一樣的炸彈。Nemotron 3 Ultra——550B 總參數、55B active 的 MoE 模型，但它既不是純 Transformer，也不是純 Mamba。它是一個 **Mamba-Transformer Hybrid**，而且從頭到尾用 NVFP4（NVIDIA 自家的 4-bit 浮點格式）訓練了 20T tokens。業界到目前為止，沒有人敢說「4-bit 訓練真的可以在大規模上穩定跑完」——這篇論文是第一份真正意義上的 demo。更讓人捏把冷汗的是，訓練過程中崩了兩次：一次在 8T，原因找到了（FP32 修掉）；一次在 16T，**根本原因還沒找到**。論文誠實地寫出來，沒有美化成「我們可控地提前結束訓練」。而這一切的總帳——base model、post-trained checkpoint、NVFP4-quantized 權重、訓練資料、RL 環境——全部開源上 HuggingFace。NVIDIA 不是在做模型，是在買開發者生態。以下是原文摘要加上城武觀點。

---

## 原文摘要

Nemotron 3 Ultra 是 NVIDIA 發表的大型開源語言模型，總參數量 550B，每次 inference 只啟動 55B（MoE 架構），支援 1M token 上下文長度。模型經過 SFT → RLVR → MOPD（從更大教師模型蒸餾）的完整後訓練流程，在 coding、數學、agentic reasoning 等任務上與 SOTA 開源模型持平或超越，同時推理吞吐量最高達到對手的 **~6 倍**。

### 架構：Mamba-Transformer Hybrid

Nemotron 3 Ultra 最與眾不同的設計是它的混合架構。不是每層都放 self-attention——部分層用 Mamba（state space model）取代。具體參數：

- 108 層，模型維度 8192
- Attention 層：64 個 Q heads、2 個 KV heads（GQA）、head dim 128
- Mamba 層：state dim 128、8 groups、256 heads、head dim 64
- LatentMoE：每層 512 experts、top-22 activated、expert hidden 5120
- MTP（Multi-Token Prediction）層：2 層（共享權重）

```
┌─────────────────────────────────────────────────────────┐
│                  Nemotron 3 Ultra                        │
│             550B total / 55B active                      │
│         Hybrid Mamba-Attention Architecture              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   Input Tokens (up to 1M context)                       │
│         │                                               │
│         ▼                                               │
│   ┌──────────────────────────────────────┐              │
│   │        Embedding Layer               │              │
│   │        (dim = 8192)                  │              │
│   └──────────┬───────────────────────────┘              │
│              │                                          │
│              ▼                                          │
│   ┌──────────────────────────────────────┐              │
│   │        108 Transformer Layers        │              │
│   │  ┌────────────────────────────────┐  │              │
│   │  │  Hybrid Block Structure:       │  │              │
│   │  │                                │  │              │
│   │  │  ┌──────┐    ┌──────────────┐  │  │              │
│   │  │  │Mamba │ or │Self-Attention│  │  │              │
│   │  │  │Layer │    │   Layer      │  │  │              │
│   │  │  │ SSM  │    │ GQA 64Q/2KV  │  │  │              │
│   │  │  └──┬───┘    └──────┬───────┘  │  │              │
│   │  │     │               │          │  │              │
│   │  │     └───────┬───────┘          │  │              │
│   │  │             ▼                  │  │              │
│   │  │  ┌──────────────────────────┐  │  │              │
│   │  │  │   LatentMoE (FFN)        │  │  │              │
│   │  │  │   512 experts / layer    │  │  │              │
│   │  │  │   top-22 activated       │  │  │              │
│   │  │  │   expert hidden = 5120   │  │  │              │
│   │  │  └──────────────────────────┘  │  │              │
│   │  └────────────────────────────────┘  │              │
│   └──────────┬───────────────────────────┘              │
│              │                                          │
│              ▼                                          │
│   ┌──────────────────────────────────────┐              │
│   │    MTP Heads (2 layers, shared wt)   │              │
│   └──────────┬───────────────────────────┘              │
│              │                                          │
│              ▼                                          │
│   ┌──────────────────────────────────────┐              │
│   │        Output Logits                 │              │
│   └──────────────────────────────────────┘              │
│                                                         │
│   Training Precision:                                   │
│   ┌──────────────────────────────────────┐              │
│   │  85% layers: NVFP4 (E2M1, 2D block)  │              │
│   │  15% layers: BF16 (output end)       │              │
│   │  Loss gap vs full BF16: <0.4%        │              │
│   └──────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────┘
```

這個架構的核心賭注是：Mamba 層處理長程依賴的效率遠高於 attention（線性 vs 二次方的複雜度），但 attention 在某些需要精確 token-level 對齊的任務上仍然不可取代。混合兩者，理論上可以在效率和能力之間找到一個 attention-only 或 Mamba-only 都達不到的 sweet spot。

### NVFP4 從頭訓練：業界首個大規模 demo

NVIDIA 使用自家的 NVFP4 格式（E2M1，2D block quantization，搭配 Random Hadamard Transform）進行了 20T tokens 的完整預訓練。最後 15% 的層保留 BF16 精度。與純 BF16 訓練相比，loss 差距小於 0.4%。

這是業界第一次在大規模模型上證明 4-bit 訓練的可行性——不是推論階段的量化，而是**訓練階段就用 4-bit**。這意味著同樣的 GPU 記憶體可以訓練更大的模型，或同樣的模型可以用更少的 GPU。

### 訓練資料與 Base Model 表現

20T tokens 分兩階段：Phase 1（15T）重視多樣性，Phase 2（5T）重視品質。新增了 Nemotron-Pretraining-Code-v3（173B code tokens）、Legal-v1、Specialized-v1.2 等資料集。Phase 1 中約 49% tokens 來自品質過濾後的網路爬蟲。

Base model 在關鍵 benchmark 上的表現（5-shot 除非特別標註）：

- MMLU：89.08（DeepSeek V3.2 87.82, Mistral Large 3 87.35, Kimi-K2 87.60, GLM-4.5 86.50）
- MMLU-Pro：79.07（vs DeepSeek V3.2 63.26，差距懸殊）
- GPQA：50.00（vs Kimi-K2 43.43）
- MATH（4-shot）：82.00（vs DeepSeek V3.2 60.12，差距懸殊）
- HumanEval：83.84（vs Kimi-K2 78.20）
- RULER 1M（長上下文檢索）：76.83（其他模型未報告此項）

在 MMLU-Pro 和 MATH 上，Nemotron 3 Ultra 對 DeepSeek V3.2 的領先幅度高達 15-22 個百分點——這不是誤差範圍內的差距，是架構級差異。值得注意：DeepSeek V3.2 也是 MoE，但不是 hybrid，也沒有用 4-bit 訓練。

### 後訓練與推理效率

後訓練流程包含 SFT、RLVR（reinforcement learning with verifiable rewards）和 MOPD（從更大教師模型蒸餾）。支援 reasoning budget control，允許在測試時動態調整計算資源來換取更好的推理品質。

推理吞吐量對比（NVFP4 量化，GB200 硬體）：
- 5.9× vs GLM-5.1
- 4.8× vs Kimi-K2.6
- 1.6× vs Qwen-3.5

### 開源全餐

NVIDIA 在 HuggingFace 上釋出了完整生態：base model、post-trained checkpoint、NVFP4-quantized 權重、訓練配方、訓練資料、RL 環境。這不是一個模型釋出，是一個**開發者生態的基礎設施包**。

### 訓練穩定性：兩次崩潰，一次原因未明

論文最誠實的一段。Nemotron 3 Ultra 的訓練過程中發生了兩次 divergence：

1. **~8T tokens**：輸出層的 BF16 gradient reduction 導致數值不穩定，修復方式是將 gradient reduction 改為 FP32。
2. **~16T tokens**：再次發生 divergence，與 expert imbalance 相關，但**根本原因尚未完全確定**。團隊選擇提前進行 LR annealing，將總訓練量壓在 20T。

這兩個事件的坦白程度，在頂級 AI 論文裡並不常見。多數團隊會選擇只報告「最終成功收斂」，不會把中途崩潰寫進論文。

---

## 城武觀點

### 1. Hybrid Mamba-Attention 是一條沒人走過的路——沒人走的原因可能是對的，也可能是錯的

NVIDIA 在這篇論文裡做了一件在架構選擇上非常孤獨的事。目前所有 SOTA 開源模型——DeepSeek V3、Qwen 3、Kimi-K2、Mistral Large——全都是純 Transformer（多數是 MoE + Transformer）。Google 的 Gemini 是純 Transformer。Anthropic 的 Claude 是純 Transformer。OpenAI 更不用說。

只有 NVIDIA 說：我們不要選邊站，我們兩個都要。

Hybrid Mamba-Attention 在理論上確實有吸引力。Mamba（state space model）處理長序列的計算複雜度是 O(N)（線性），而 self-attention 是 O(N²)（二次方）。把 Mamba 放在需要處理長程依賴的層、attention 放在需要精確 token 對齊的層——這個直覺是對的。

但問題是：**為什麼其他人都不走這條路？**

一個可能的答案是：混合架構增加了訓練和部署的複雜度，而收益（在當前規模下）還不足以說服團隊放棄純 Transformer 的簡潔性和成熟的基礎設施。NVIDIA 有本錢做這件事——他們同時是硬體廠商，NVFP4 和混合架構的搭配證明的是「我們的硬體 + 我們的軟體棧可以做到別人做不到的事」。這不是純學術動機，這是生態系戰爭。

另一個可能的答案是：NVIDIA 是對的，只是其他人還沒跟上。如果 hybrid 架構在 550B 規模上已經展現出比純 Transformer 更好的 MMLU-Pro 和 MATH 表現，那當模型規模繼續擴大、上下文長度繼續拉長時，Mamba 的線性優勢只會越來越明顯。NVIDIA 可能在下一盤比所有人更大的棋。

城武不會假裝知道哪個答案是對的。但有一件事是確定的：**在一條所有人都走同一方向的道路上，唯一一個走不同方向的玩家，要不是瘋子，就是唯一看到捷徑的人。** Nemotron 3 Ultra 的 benchmark 數字讓「瘋子」這個選項變得不太可能。

### 2. NVFP4 訓練的訊號：4-bit 訓練從「理論上可行」變成「工程上可複製」

NVFP4 是 NVIDIA 自家的 4-bit 浮點格式（E2M1），搭配 2D block quantization 和 Random Hadamard Transform 來維持數值穩定性。論文報告 loss gap <0.4%——這個數字小到足以讓實務派認真考慮：「我是不是也該用 4-bit 訓練來省 GPU 記憶體？」

這件事情的衝擊不只在學術上。NVIDIA 的 Blackwell（B200/GB200）架構原生支援 FP4——NVFP4 不是一個理論格式，它是一個有硬體加速的格式。Nemotron 3 Ultra 的訓練實驗等於是在說：**用我們的 GPU，用我們的格式，你可以用更少的卡訓練更大的模型，而且準確度幾乎不受影響。** 這不是一篇論文，這是一份產品白皮書。

但城武要提醒一件事：loss gap <0.4% 是跟 BF16 baseline 比的。而 BF16 baseline 本身能跑到什麼程度、這個 0.4% 是否在所有 downstream task 上都能維持——論文沒有給出完整的 ablation。15% 的最後幾層保留 BF16 是一個聰明的工程妥協（輸出層對精度最敏感），但也意味著 NVFP4 還沒有證明它可以**完全**取代 BF16。這是誠實的，也是值得追問的。

### 3. ~6× throughput，accuracy on-par——但誰的 accuracy？誰的 throughput？

NVIDIA 宣稱 Nemotron 3 Ultra 的推理吞吐量是 GLM-5.1 的 5.9 倍、Kimi-K2.6 的 4.8 倍、Qwen-3.5 的 1.6 倍。這是在 NVFP4 量化 + GB200 硬體上測出來的。換句話說，**這個 throughput 優勢有一大部分來自 NVIDIA 自己的硬體對 NVFP4 的原生加速**——你用 AMD 或 Intel 跑同樣的模型，不會看到這個數字。

這是論文裡最需要獨立驗證的 claims。Qwen-3.5 在它的最佳硬體上跑到什麼 throughput？GLM-5.1 呢？如果對比是建立在「NVIDIA 硬體 + NVIDIA 格式」vs「通用硬體 + BF16」，那這不是公平的比較。NVIDIA 當然知道這件事——他們是硬體公司，他們比任何人都清楚這個不對稱性。

但從另一個角度看，這恰好是 NVIDIA 想傳遞的訊息：**生態鎖定的價值。** 如果你用 NVIDIA 的硬體和 NVIDIA 的軟體棧，你可以得到別人生態系給不了的效率。這不是 bug，這是 feature——對 NVIDIA 的股東來說。

> 「我們的模型在你的硬體上比你的模型快 6 倍」——這句話的隱含前提是「你用我們的硬體」。

### 4. 全開源的真正意圖：NVIDIA 在買的不是掌聲，是開發者生態

Nemotron 3 Ultra 的開源規模是空前的：base model、post-trained checkpoint、NVFP4-quantized 權重、訓練配方、訓練資料、RL 環境。全部上 HuggingFace。這不是 Meta 那種「開源權重」的半套開源，這是接近「你可以從頭複現」的全套開源。

為什麼 NVIDIA 要做這件事？他們不賣 API（不像 OpenAI/Anthropic），不賣雲端服務（不像 Google/AWS/Azure）。他們賣 GPU。

如果你是一個 AI startup，你現在有兩條路可以走：第一條，用 closed-source API（OpenAI/Anthropic），好處是省事，壞處是受制於人、成本難以預測。第二條，用開源模型自己 host。Nemotron 3 Ultra 把第二條路的門檻大幅降低了——不只給你模型，還給你訓練資料和訓練配方，讓你可以在自己的 infra 上微調。而當你決定自託管一個 550B 模型的時候，你需要買誰的 GPU？NVIDIA 的。

這才是最漂亮的商業策略：**不跟 OpenAI 競爭賣 API，而是讓所有想跟 OpenAI 競爭的人，都變成 NVIDIA 的客戶。** 全開源不是慈善，是生態系的基礎建設投資——每一筆都是為了讓更多人在 NVIDIA 硬體上跑 AI workload。

### 5. 訓練崩了兩次的誠實，比所有 benchmark 數字都更有價值

論文裡有一段話值得全文引用精神：Nemotron 3 Ultra 的訓練在 8T 和 16T 各發生了一次 divergence。第一次修掉了（FP32 gradient reduction），第二次的**根本原因還沒有找到**，團隊選擇提前 annealing 結束訓練。

這才是真正的科學。不是「我們成功訓練了一個大模型」，而是「我們訓練了一個大模型，中間出了兩次我們沒有完全理解的事，這是我們目前為止知道的部分，剩下的我們還在查。」

在一個充斥著 PR 論文的領域裡，這種坦白本身就是一種信號。它告訴你三件事：

**第一，大規模訓練的穩定性問題遠遠沒有被解決。** 如果 NVIDIA——擁有全世界最好的 GPU、最深的系統工程團隊、最豐富的大規模訓練經驗——都在 16T 遇到無法解釋的 divergence，那代表 MoE + hybrid architecture + 4-bit training 這個組合的 failure mode 還沒有被充分理解。

**第二，20T 不是一個設計目標，是一個被迫的終點。** 論文說訓練因應 divergence 而提前 annealing——意思是如果沒有崩，模型可能可以訓練到 25T、30T，benchmark 數字可能會更好。但崩了就是崩了，20T 是止損線。

**第三，expert imbalance 是一個幽靈。** 第二次 divergence 與 expert imbalance 相關，但不是因果關係。MoE 的 expert load balancing 一直是一個已知的痛點——某些 expert 被過度使用、某些 expert 幾乎閒置，導致訓練不穩定。Nemotron 的 LatentMoE（512 experts/layer, top-22 activated）讓這個問題更複雜：22 個 active experts 的組合空間極大，load balancing 的難度遠高於傳統的 top-2 MoE。

> 城武的直覺：第二次 divergence 很可能是 NVFP4 + LatentMoE 的互動效應——兩種各自不穩定的因子疊加，產生了一個兩者單獨都不會觸發的 failure mode。這不一定是對的，但這是一個值得追的方向。

---

*城武的未解檔案——當所有人都走在純 Transformer 的柏油路上，NVIDIA 選擇開一台 Mamba-Transformer hybrid 越野車走碎石路。它中途拋錨了兩次，第二次的原因到現在還沒搞清楚。但它是最早到達目的地的車之一，而且它把整張地圖、修車工具、和備用輪胎都放在路邊，跟所有人說：來，換你開開看。這種「我們也不太確定為什麼會這樣，但數據在這裡，你自己看」的誠實，比任何完美的 PR 論文都更接近科學的本質。*

- 論文：[Nemotron 3 Ultra: Open, Efficient MoE Hybrid Mamba-Transformer for Agentic Reasoning](https://arxiv.org/abs/2606.15007)（NVIDIA, arXiv 2606.15007, 2026-06-12）
