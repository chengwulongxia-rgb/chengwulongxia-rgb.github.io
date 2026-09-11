---
layout: post
title: "【深度分析】3.8B LLM 跑到 0.384 CORE 的 $998：一個人如何把訓練成本拆開來算"
date: 2026-09-11 05:00:00 +0000
categories: [llm, ai, deep-analysis]
---

![hero]({{ site.baseurl }}/assets/images/2026-09-11/2026-09-11-little-lm-training-cost.jpg)

Hugo Vergnes 想補上兩個極端之間常被略過的地帶：一端是 nanoGPT 式玩具，另一端是需要研究實驗室的訓練計畫。他用晚間時間開發、在 RTX 5090 上除錯，最後租用 B200 完成一個 3.8B 參數模型；文章的價值不只是一個漂亮成本數字，而是把有效的調整、無效的嘗試、評測的陷阱與尚未驗證的假設一併攤開。

## 原文摘要

### Setup

作者將 little-lm 做成一個以設定檔驅動的小型 decoder-only LLM 訓練框架。每次實驗都由 YAML 完整指定模型、資料集、optimizer、排程器與 callbacks；元件會自行註冊到全域 registry，再依名稱解析，因此換 optimizer 或資料集只需改一行設定。作者認為，好的基礎設施幾乎立刻就能回本。

最終模型採 Llama 風格：RMSNorm、RoPE、GQA、relu² MLP、QK-norm、logit softcap、每層可學習的 residual scalar，以及 ResFormer 風格的 value embeddings。其中 GQA 有 24 個 query heads、8 個 KV heads。模型的 token embeddings 有 154.5M 參數，未綁定的 LM head 也有 154.5M；28 個 decoder layers 有 2,818.7M；14 張 value-embedding tables 有 721.2M；合計為 3.848B。作者特別提醒，value embeddings 單獨就佔總參數量的 19%，其形式是 14 張「詞彙表大小 × kv_dim」的表。

文章把結果放在幾個可比較的基準旁。GPT-2 是 1.5B 參數、CORE 0.2565；nanochat d26 約 561M、用 8 張 H100 訓練 11.2B tokens 約 3 小時、CORE 約 0.258；nanochat d32 約 1B、8 張 H100 約 33 小時、成本約 $1,000、CORE 0.310。little-lm 在 1024 context 時為 3.848B、57.3B tokens、8 張 B200、35.9 小時、$820、CORE 0.338；在 2048 context 時為 3.848B、65.3B tokens、8 張 B200、43 小時、$998、CORE 0.384。

作者的模型比 nanochat d32 大，wall-clock time 相近；他認為 B200 的單位工作量價格比 H100 更好。以大致相同的 $1,000 預算，這個結果明顯超過 nanochat d32，因而是「在實驗室或有數百萬算力預算的大公司之外」仍可觸及的一個鼓舞性資料點。隨著前沿往前移，同樣的 $1,000 能做到的事也會更多。

### Results：Early experiments

最終結果前先有不少失敗實驗。作者曾以 FineWeb-Edu 訓練一個 858M 的 Llama：單張 A100 跑 5.8 天、16.4B tokens、AdamW 的 learning rate 為 2.5e-4、cosine decay 到零、5% warmup、靠 gradient accumulation 把 batch 做到 256、context 為 2048。結果 PIQA 只有 60.45%。

他從 loss curve 歸納四個問題：cosine decay 衰減到零；peak learning rate 太保守；所有參數都用 AdamW；以及資料本身。事後檢討後，他採取五項改變：改用仍持續下降的 trapezoidal learning-rate schedule；矩陣參數改用 Muon；以 ClimbMix 取代 FineWeb-Edu；使用 FP8 與 vocabulary padding；並將 context 從 2048 降為 1024。作者認為，這幾項調整合在一起，造就了前述失敗 run 與一個大幅擊敗 GPT-2 的模型之差。

1024 context 的完整訓練紀錄如下：第 2,500 step、5.7B tokens 時，eval loss 2.3278、CORE 0.2389；5,000 step、11.5B 時為 2.2072、0.2752；7,500 step、17.2B 時為 2.1571、0.2934；10,000 step、22.9B 時為 2.1269、0.3104；12,500 step、28.7B 時為 2.1075、0.3147；15,000 step、34.4B 時為 2.0710、0.3224；17,500 step、40.1B 時為 2.0395、0.3294；20,000 step、45.9B 時為 2.0160、0.3267；22,500 step、51.6B 時為 1.9963、0.3345；25,000 step、57.3B 時為 1.9868、0.3384。

穩態 throughput 約為每秒 480,000 tokens，因此 57.3B tokens 的純訓練時間約 33 小時，實際 wall clock 則是 35.9 小時。差距來自 CORE 評測：每次約 15 分鐘，整個 run 做了十次，消耗總時間的 7%。把相同 recipe 在 2048-token context 下重跑，CORE 為 0.3840。GPU 指標則是 92% SM activity、40% SM occupancy；每張 B200 持續約 1,047 TFLOP/s，約為 25% MFU。

分散式策略採用傳統 DistributedDataParallel。作者指出，在單一 node 上訓練 3.8B 時，gradient communication 從不是瓶頸，因此 optimizer sharding 那套機制其實沒有必要。

### Increasing throughput

租 GPU 不便宜；在工作環境，人們往往先想模型品質，當燒的是自己的錢，throughput 便突然格外重要。作者在租 node 前，先用一張 RTX 5090 做了實際優化。858M baseline 使用 bf16 並 compile 後，throughput 從 26,144 tok/s 提高到 37,621 tok/s。

第一項是 FP8，增加 25%；第二項是 vocabulary padding，累積增加至 33%；第三項是 fused linear cross-entropy，累積增加至 44%。這個 loss 的形式是 `FusedLinearCrossEntropyLoss(B*T, vocab)`，單步本身慢 6%。在實驗配置中，baseline CE、batch 6 為 34,724 tok/s、使用 27,852 MiB VRAM；fused CE、batch 6 為 32,952 tok/s、19,630 MiB；fused CE、batch 8 為 35,979 tok/s、24,028 MiB；fused CE、batch 10 為 37,621 tok/s、28,872 MiB。

因此，fused CE 雖然每一步慢，卻在 5090 上釋放約 8GB VRAM，使 micro-batch 可以變大，增幅足以補回那 6% 的損失。作者提到 Claude 很快因為「低 6%」而否決它，但以整體吞吐量來看，這是有效地多榨出一點 throughput 的方法。其他有用的選擇包括非 gated MLP、bf16 master weights 與硬體本身。

### What didn’t work

作者也列出沒有帶來回報的工作：用 flex attention 做 document-boundary masking，但改用 `F.scaled_dot_product_attention(..., is_causal=True)`；使用 Liger RMSNorm 和 RoPE，與 `F.rms_norm` 相比沒有可測量的改變；採 nanochat 風格初始化，包含 N(0, 0.8)、N(0, 0.001) 與 N(0, 0.02) 的嘗試；以及 streaming datasets。這些項目沒有被包裝成成功配方，而是留在文章中作為已付出的實驗成本。

### value-embedding ablation

value embeddings 在這個 3.8B 模型中有 721M 參數。作者以完全相同設定另跑一個 `value_embeddings: false` 的模型。開啟時，3.848B 參數、在 12.5K step 的 loss 為 2.1075、CORE 為 0.3147、throughput 479,445 tok/s；關閉時，3.128B 參數、loss 2.1171、CORE 0.3047、throughput 477,908 tok/s。

這代表 value embeddings 用 19% 額外參數換得 0.46% 較佳 loss 與 3.2% 較佳 CORE。由於它們是 lookup，throughput 幾乎相同；代價主要是記憶體與 optimizer state，而不是 FLOPs。作者有兩個觀察：它們提供的效果約等於多訓練 1,200 steps；而 CORE 的變動幅度約是 loss 的七倍。結論是，對小模型而言，這是在幾乎沒有 throughput 成本下可用的做法；多花一點 VRAM，可能讓模型偏向某些對 CORE 有利的概念。

### Discussion：Misleading micro-benchmarks

1024 tokens context 跑出高 CORE，很容易讓人相信 1024 已經充分；作者回頭查看各 task log 後認為，這對某些高度依賴 context 的任務是錯的。CORE 22 個任務中，有 3 個的 prompts 幾乎永遠放不進 1024 tokens。

SQuAD 的 10,570 個 prompts 全部被裁切：第 2.5K step 得分 0.1478，25K step 卻是 0.0000。BoolQ 的 3,270 個 prompts 裡 3,265 個被裁切，即 99.8%，得分從 0.5798 變為 0.5131。bigbench_language_id 的 10,000 個 prompts 有 9,965 個被裁切，即 99.7%，得分只從 0.2454 變到 0.2538。

SQuAD 特別醒目：它不是停滯，而是單調降至零，依序為 0.1478、0.0617、0.0099、0.0007、0.0000；模型看似愈訓練愈差。作者用兩個細節解釋：SQuAD 是 10-shot 任務，裁切由 `max_seq_len` 的最後端開始；測試 passage 在 prompt 結尾，因此總能保留，單一測試例約 169 tokens。被裁掉的是十個 demonstrations，也就是告訴模型預期輸出格式的範例。SQuAD 用與 gold answer 的 exact-token match 計分，模型雖能讀 passage 與問題，卻幾乎沒看見格式示例；產生流暢文字便會次次得零。

下降也因此可解釋：早期高 entropy 模型偶爾會輸出短而普通的文字，碰巧命中答案；當模型更確定地延續語言時，這些偶然命中消失。作者的說法是，模型變得更會使用語言，反而更不會靠運氣猜對。BoolQ 顯示較溫和的同型曲線：它在第 10,000 step 到 0.6294，最後降至 0.5131；語言識別則始終沒有離開 chance level。總結而言，0.338 這個分數中，22 個任務有 3 個近乎零分，原因與模型品質無關，而是餵給評測的 context length 太短。

### larger context effect

若目標是最高 CORE，就需要更長 context；但訓練吞吐量也會受影響。作者將 context length 加倍，並將 micro-batch 減半以維持相同 VRAM，讓每個 optimizer step 的 tokens 維持不變。為省下最後幾小時的租機成本，他在約 28,000 steps 停止，因此 learning-rate warmdown 沒有完整跑完，下列成績應視為下界。

CORE 從 0.3384 升至 0.3840。在第 20,000 step，兩個 run 的 eval loss 精確到小數第四位幾乎相同：1024 context 為 2.0160，2048 context 為 2.0164，但 CORE 相差 0.034。作者對 ClimbMix 上 eval loss 與 CORE 的低相關性感到意外。

逐項看，SQuAD 從 0.0000 升為 0.3114，prompt 被裁切比例由 100% 降為 47%；BoolQ 從 0.5131 升為 0.7095，裁切由 99.8% 降為 3.2%；bigbench_language_id 從 0.2538 到 0.2585，裁切由 99.7% 降為 14%。其餘 19 個任務合計只增加 0.008。單是 SQuAD 與 BoolQ，就構成整體提升的 83%。語言識別雖從 99.7% 被裁切降到 14%，只增加 0.005；作者稱它是目前模型在 CORE 中最難的任務。也有任務變差：commonsense_qa 掉 0.072，cs_algorithms 掉 0.031；22 個任務中出現正負移動是預期之事。

因此作者將 2048 的價值定義為「測量決策」，不是「品質決策」。它使 throughput 降 9%，由 480K 到 437K tok/s；在 1024 無法正確評分的任務之外，幾乎沒有帶來收益。1024 對訓練已足夠，也是以低成本讓模型取得不錯 CORE 的方法；2048 解鎖的主要是被 context 綁死的任務。

### Future work：Limitations

作者明確列出四件從未做過 ablation 的事：peak LR、依 nanochat 的 `sqrt(768/d_model)` 規則設定的 learning rate、其餘承襲自 nanochat 的選擇，以及相關設定如何在自己的模型、資料與規模上實際轉移。這種把小預算交給已有人付費做過的實驗的作法可以辯護，但代價是他必須相信 Karpathy 的結果能遷移過來。

### Open questions

若有更多時間與資源，作者想追問的問題包括：value embeddings 與把同一批參數重新分配給其他元件相比如何；在相同 wall-clock 下比較 1024 與 2048；commonsense_qa 為何退步；像 nanochat 那樣 sharding optimizer 是否值得；以及更多資料探索。

### Closing thought

作者回望 GPT-2：2019 年它是資金充裕、多人團隊實驗室產出的前沿成果，1.5B 模型在 CORE 得 0.2565。七年後，他在晚間、以按小時計費租來的硬體、花 $998 做出明顯更高的成績。前沿向前移動，也把能做的事一起帶了過來；曾需要實驗室的工作，如今單一工程師下班後也能做。他最後好奇，再過七年會有什麼瘋狂的機器可被造出來。

### config appendix

作者將 YAML includes 展平後的完整設定列在附錄。模型 hidden size 為 3072，intermediate size 12288，即四倍且非 gated；28 層、24 attention heads、8 key-value heads，為 3:1 的 GQA；head dimension 128；activation 為 relu2；`gated_mlp: false`、`qk_norm: true`、`logit_softcap: 15.0`、`layer_scale: true`、`value_embeddings: true`。value embeddings 是交錯層的 14 張表；不綁定 word embeddings；`rope_theta: 10000.0`、`rms_norm_eps: 1.0e-6`；詞彙表補齊到 64 的倍數，從 50,257 補為 50,304；最大位置數 2048；dtype 為 bf16。

engine 使用 compile、FP8 為 true、precision 為 bf16。總 batch size 2,293,760，由每張 GPU 20 × 2048 tokens × 7 次 gradient accumulation × 8 張 GPU 組成。loss 是 `LigerFusedLinearCrossEntropyLoss(softcap=15.0)`。optimizer 是按參數類別分組的 composite：matrix 使用 Muon，learning rate 0.02、momentum 0.95、weight decay 0.0；embeddings 使用 AdamW，learning rate 0.1414、betas (0.8, 0.995)、eps 1e-10、weight decay 0.001；lm_head 用 AdamW，learning rate 0.002828、betas (0.8, 0.96)、eps 1e-10、weight decay 0.01；value_embeds 用 AdamW，learning rate 0.0707、betas (0.8, 0.995)、eps 1e-10、weight decay 0.01；scalars 用 AdamW，learning rate 0.005、betas (0.8, 0.95)、eps 1e-10、weight decay 0.05。

排程器是 trapezoidal：warmup ratio 0.05、warmdown ratio 0.50、final LR fraction 0.05。資料集為 `nvidia/Nemotron-ClimbMix`，使用 `karpathy/climbmix-400b-shuffle` shards；tokenizer 為 GPT-2 的 tiktoken；block size 2048；packing 為 best-fit 並以 BOS 對齊；每個 rank 的 batch size 為 20、num_workers 為 11。trainer 的 max_steps 是 32,000，但實際在約 28,000 停止，對應 65.3B tokens；每 4,000 steps 評測一次，且此數值必須整除 max_steps，否則最後一次 CORE 不會被執行。作者補充，AdamW 的 learning rates 遵循 nanochat 的 `sqrt(768/d_model)`。

### example generation appendix

文章最後附上模型生成的文字樣本。它能接續「法國首都是巴黎」，並稱巴黎是法國最大、歐洲第二大的城市；接續法國大革命在 1789 與 1799 年間發生、是法國巨大改變的時期；接續銀河中心有一個超大質量黑洞，名為 Sagittarius A*，但在「pronounced」後中斷；也能接續電子在原子核外的能階、能階被編號的句子；以及 Newton 發現運動與重力定律、也發現萬有引力定律的片段。附錄展示的是未完成續寫，而非經人工整理的回答。

## 城武觀點

$998 不是「訓練 LLM 只要 $998」的市場報價，而是一個被模型規格、ClimbMix、8 張 B200、65.3B tokens、2048 context、提前停止的排程與 CORE 計分共同框住的可重現實驗。原文最有價值的地方，正是沒有只端出 0.384：它公開 config、留下失敗嘗試，也承認 1024 與 2048 的分差多半是評測裁切造成。可惜成本敘事一進標題，邊界通常先被刪掉。小模型實驗確實降低研究門檻，我支持這種公開方法；但反對拿單一漂亮數字當成對模型規模競賽的全面反駁。跑分是結果，誰能在什麼條件下重現、又有哪些任務根本沒被量到，才是成本故事的正文。

*城武的未解檔案——最便宜的數字，往往也最昂貴地省略了條件。*
- 原文：[Training a 3.8B LLM to 0.384 CORE for $998](https://hugovergnes.github.io/little-lm-3-8b/)（Hugo Vergnes, 2026-09-10）
