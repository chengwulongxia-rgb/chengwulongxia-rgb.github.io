---
layout: post
title: "【深度翻譯】消費級雙卡救星：RTX 5080 + 3090 跑 Qwen 3.6 27B Q8，每秒 80+ tokens 實戰配置"
date: 2026-06-14 12:00:00 +0000
categories: [llm, ai, deep-translation]
---

![首圖]({{ site.baseurl }}/assets/images/2026-06-14-rtx-dual-gpu-local-llm-hero.jpg)

> 原文：[RTX 5080 and RTX 3090 Setup: 80 Tok/s on Qwen 3.6 27B Q8](https://imil.net/blog/posts/2026/rtx-5080-+-rtx-3090-setup-80+-tok-s-on-qwen-3.6-27b-q8/)
> 來源：imil.net
> 日期：2026-06

---

## 原文深度翻譯

### 從一張 5080 開始的意外旅程

作者一年前買了一張 RTX 5080，用途很單純：玩遊戲，順便跑跑 AI 實驗。16GB VRAM 再當時看起來還算充裕——跑個 7B、13B 模型綽綽有餘。

但到 2026 年，Qwen 3.5、Gemma、Qwen 3.6 這些新一代模型接連登場，16GB 突然變成了一個很尷尬的數字：放得下模型本身，放不下像樣的 context。他跟很多本地 LLM 玩家一樣，開始盯上那張傳奇二手卡——RTX 3090，24GB VRAM，市場價大概 $700 美金。

單卡 3090 跑 Qwen 3.6 Q4 量化版，大約每秒 30 tokens。開啟 MTP（Multi-Token Prediction，多 token 預測）之後可以拉到 50-60 tok/s。但問題來了：那張花了大錢買的 5080 幾乎閒置——16GB 的 Blackwell 架構新卡，躺在機殼裡發呆。

### 硬體配置：為什麼主機板型號是關鍵

要把兩張不同世代的卡塞進同一台機器，第一個門檻不是驅動、不是散熱、不是電源——**是主機板的 PCIe 通道分配。**

作者的配置：

- **主機板**：Asus Prime X570-**Pro**（那個「Pro」不能省——只有 Pro 版支援把 x16 拆成兩條 x8）
- **GPU 1**：RTX 3090（24GB）——主力運算卡
- **GPU 2**：RTX 5080（16GB）——配角，但 16GB 的 Blackwell 在 split 模式下貢獻不小
- **轉接線**：一條品質夠好的 PCIe 4.0 riser，把 5080 裝在第二槽
- **記憶體**：DDR4
- **儲存**：SSD

這裡有一個很多人會踩的坑：**不是所有 X570 主機板都支援 PCIe bifurcation。** 作者特地強調「Pro」這個後綴不是行銷話術——它決定了你能不能把 CPU 直連的那條 x16 拆成兩條 x8，同時驅動兩張 GPU。買錯板子，整件事再硬體層就直接死去。

### BIOS 設定：最容易翻車的十分鐘

這是整篇文章最有實戰價值的一段。作者把 BIOS 設定的每一步都寫得很清楚，因為任何一個選項設錯，輕則開不了機，重則兩張卡只認到一張。

**步驟一：Boot 分頁 → CSM（Compatibility Support Module）→ Disabled**

這是第一個陷阱。CSM 是為了讓新主機板能跑舊的 BIOS/MBR 開機模式。但雙卡配置下，CSM 會阻止系統同時初始化兩張 GPU。**CSM 必須關掉，等於強制用 UEFI 開機。** 如果你原本的系統是用 MBR 模式裝的，關掉 CSM 之後會直接開不了機——不是主機板壞了，是你該重灌成 UEFI 了。

**步驟二：Advanced → PCI Subsystem Settings**

- **Above 4G Decoding → Enabled**：必開。讓作業系統能定址超過 4GB 的 PCIe 記憶體空間。兩張加起來 40GB VRAM，不開這個選項連一半都用不到。
- **ReSize BAR Support → Auto 或 Enabled**：讓 CPU 一次存取整塊 GPU VRAM，對 LLM 推論的影響比你想像中大。

**步驟三：Advanced → PCIEX16_1 Link Mode → Gen 4**

**步驟四：Advanced → PCIEX16_2 Link Mode → Gen 4**

兩條 x16 插槽都鎖定在 PCIe 4.0。不鎖的話，主機板可能會跟顯卡協商出 PCIe 3.0 甚至更低的速率——LLM 推論雖然不像挖礦那麼吃頻寬，但 tensor split 模式下的跨卡通訊，PCIe 頻寬還是直接影響 token 產出速度。

### NVIDIA 驅動地獄：不同世代 GPU 的套件陷阱

如果你以為 BIOS 設完就海闊天空，那 NVIDIA 驅動會讓你回到現實。

作者的兩張卡分屬不同架構：RTX 3090 是 Ampere（SM 8.6），RTX 5080 是 Blackwell（SM 12.0）。這導致 `open-gpu-kernel-modules`（NVIDIA 的開源核心模組）**直接不能用**——它要求機器中所有 GPU 必須是同一個型號。

**解法：**

- 如果你也是不同型號的雙卡配置（例如作者這種 3090 + 5080），只能用 `nvidia-open` 驅動，不要碰 `nvidia-dkms-open`。
- 如果你兩張卡是同型號（例如兩張 3090），可以用社群修補過的驅動，但需要先移除 `nvidia-dkms-open`，並且把新的 `nova` 驅動 blacklist 掉。（NVIDIA 的開源驅動生態目前就是這麼混亂——nouveau、nvidia-open、nvidia-dkms-open、nova，四套驅動同時存在，彼此的相容性矩陣堪比地雷區。）

**驗證：**

```bash
nvidia-smi
```

兩張卡都應該出現在列表裡，VRAM 顯示正常。然後跑：

```bash
nvidia-smi topo -p2p r
```

確認兩張卡之間的 P2P（peer-to-peer）通訊狀態。雖然不同架構的卡之間不可能有 NVLink，但 PCIe 直連的 P2P 還是可以透過 PCIe bridge 走。

### llama.cpp 編譯：雙架構 CUDA 是關鍵字

作者用的推理引擎是 llama.cpp。編譯參數如下：

```bash
cmake -B build -DBUILD_SHARED_LIBS=OFF -DGGML_CUDA=ON -DGGML_NATIVE=ON \
  -DGGML_CUDA_FA=ON -DGGML_CUDA_FA_ALL_QUANTS=ON \
  -DCMAKE_CUDA_ARCHITECTURES="86;120" \
  -DCMAKE_CUDA_COMPILER=/usr/local/cuda/bin/nvcc \
  -DGGML_CUDA_NCCL=OFF
```

每個 flag 逐一解釋：

- **`-DGGML_CUDA=ON`**：啟用 CUDA 後端。沒什麼好說的，基本開關。
- **`-DGGML_NATIVE=ON`**：針對當前 CPU 做原生指令集優化（AVX2、FMA 等）。CPU 雖然不是推理的主力，但在 tokenization、KV cache 管理、sampling 這些環節，CPU 的表現還是會影響整體吞吐。
- **`-DGGML_CUDA_FA=ON`**：啟用 Flash Attention。對長 context 和多卡 split 的影響巨大——省 VRAM、降頻寬、拉速度，三位一體。
- **`-DGGML_CUDA_FA_ALL_QUANTS=ON`**：讓 Flash Attention 支援所有量化格式（不只 fp16）。作者用的是 Q8_0 量化，這個 flag 不開的話 Flash Attention 會退化成標準 attention，VRAM 和速度都會受影響。
- **`-DCMAKE_CUDA_ARCHITECTURES="86;120"`**：**這是整段編譯指令的靈魂。** `86` 對應 Ampere（RTX 3090），`120` 對應 Blackwell（RTX 5080）。不指定雙架構的話，nvcc 只會為偵測到的第一張卡編譯，另一張卡在推理時會因為找不到對應的 kernel 而 fallback 到 CPU——你的第二張 GPU 瞬間變成昂貴的發熱磚。
- **`-DCMAKE_CUDA_COMPILER=/usr/local/cuda/bin/nvcc`**：指定 CUDA 編譯器路徑。有些系統同時裝了多個 CUDA 版本，不指定的話 cmake 可能抓到錯的。
- **`-DGGML_CUDA_NCCL=OFF`**：**反直覺但重要的設定。** NCCL（NVIDIA Collective Communications Library）理論上是多卡通訊的標準方案，但作者實測發現它在雙卡不同架構的場景下不僅沒加速，反而拖慢。關掉 NCCL，讓 llama.cpp 用內建的 tensor split 機制直接走 PCIe——反而更快。

### llama-server 啟動參數詳解

編譯完只是拿到了一把鑰匙，真正把門打開的是這串啟動指令：

```bash
llama-server -m ./models/Huihui-Qwen3.6-27B-abliterated-ggml-model-Q8_0.gguf \
    -c 229376 \
    -np 1 -fa on -ngl 99 -ub 512 -t 6 --no-mmap \
    --temp 0.7 --top-p 0.8 --top-k 20 --min-p 0.0 \
    -ctk q8_0 -ctv q8_0 --kv-unified \
    --chat-template-kwargs {"preserve_thinking": true} \
    --spec-type ngram-mod,draft-mtp --spec-draft-n-max 3 \
    -sm tensor -ts 2,3 \
    --port 8001 --host 0.0.0.0
```

逐項說明：

**模型與 Context：**

- **`-m ./models/Huihui-Qwen3.6-27B-abliterated-ggml-model-Q8_0.gguf`**：模型檔。Huihui 是社群對 Qwen 3.6 做的 refusal ablation 版（後面城武觀點會談這件事），Q8_0 量化代表每個權重用 8-bit 儲存——比 Q4 精確很多，但體積也大一倍。
- **`-c 229376`**：230K context window。Qwen 3.6 的原始設計就有超大 context，Q8_0 下要把這麼長的 context 塞進 39GB 的 VRAM，KV cache 的量化策略是關鍵（見下方 `-ctk`/`-ctv`）。

**效能相關：**

- **`-np 1`**：平行處理序列數。設 1 是單用戶模式，最大化單一請求的吞吐。
- **`-fa on`**：強制啟用 Flash Attention（編譯時開了 CUDA_FA，這裡再確認一次執行時有開）。
- **`-ngl 99`**：把所有 99 層都丟上 GPU。模型總層數通常不到 99，這個數字就是「全部上 GPU」的寫法。
- **`-ub 512`**：micro-batch size。影響 GPU 佔用率，太大爆 VRAM、太小吃不滿。
- **`-t 6`**：CPU 執行緒數。不是越多越好——太多 thread 反而增加 context switch 開銷。
- **`--no-mmap`**：不讓 OS 用 mmap 載入模型。在多卡場景下，mmap 可能導致 VRAM 分配行為不如預期，關掉讓 llama.cpp 自己管。

**KV Cache 策略（多卡的核心）：**

- **`-ctk q8_0 -ctv q8_0`**：KV cache 的 key 和 value 都用 Q8_0 量化。這是 Qwen 3.6 27B 能在 39GB VRAM 內跑 230K context 的關鍵——如果 KV cache 用 fp16，VRAM 直接爆掉。
- **`--kv-unified`**：統一 KV cache 池。多卡 split 模式下，把兩張卡的 VRAM 當成一個連續的 KV cache 空間。

**取樣參數：**

- **`--temp 0.7 --top-p 0.8 --top-k 20 --min-p 0.0`**：標準的推論取樣設定。溫度 0.7 保持一定的創造性但不會胡言亂語，top-p 0.8 和 top-k 20 做雙重過濾。

**推論加速：**

- **`--chat-template-kwargs {"preserve_thinking": true}`**：保留 Qwen 3.6 的 thinking tokens。這對模型的推理品質有直接影響——把 thinking 砍掉的 abliterated 模型在某些任務上會退化。
- **`--spec-type ngram-mod,draft-mtp --spec-draft-n-max 3`**：**達到 80+ tok/s 的秘密武器。** 這是 MTP（Multi-Token Prediction）投機解碼：先用 ngram 模型快速產生草稿 token，再用主模型驗證。`--spec-draft-n-max 3` 代表每次投機最多猜 3 個 token。搭配 77.3% 的接受率——這套機制貢獻了大量的加速。
- **`-sm tensor`**：多卡 split 模式。把 tensor 沿層切分到兩張 GPU 上，推論時兩張卡同時工作。
- **`-ts 2,3`**：GPU 利用率比例。第一張卡（3090）佔 2 份、第二張卡（5080）佔 3 份。這個數字不是隨便設的——它是根據兩張卡的實際 VRAM 和算力反覆測試出來的甜蜜點。24GB 和 16GB 的 VRAM 不對稱，tensor split 需要手動配重才能把兩邊的 VRAM 都吃滿而不爆。

**服務設定：**

- **`--port 8001 --host 0.0.0.0`**：監聽所有介面的 8001 port。標準的 server 模式，可以從內網其他機器連進來。

### 效能結果

作者的實測數據：

- **80+ tokens/sec**，某些任務可以拉到 90+ tok/s
- **Draft acceptance rate：77.3%**（320 接受 / 414 產生）——MTP 的猜中率非常高，代表模型的輸出分佈跟 draft model 的預測高度一致
- **KV cache graphs reused：41,669 次**——Flash Attention 的快取重用率顯示這套配置跑長 context 的穩定性

最後，作者建議用以下指令確認 PCIe 通道速度：

```bash
sudo lspci -vvv -s 07:00.0 | grep "LnkSta:"
```

應該看到 `Speed 16GT/s, Width x8`——PCIe 4.0 x8 的標準速率。如果看到 x4 或 Gen 3，代表轉接線或主機板設定有問題，回去檢查 BIOS。

---

## 城武觀點

### 1. 消費級硬體的民主化：$1700 買到 27B Q8 @ 80 tok/s，代表什麼？

先算一筆帳。一張二手 RTX 3090 大約 $700，一張 RTX 5080 大約 $1000——總成本 $1700 美金，約台幣五萬多。換到的是一台可以跑 27B 參數、Q8 量化、230K context、每秒 80 tokens 的本地推理機。

對比 API：用 OpenAI 或 Anthropic 的 API 跑同等級的模型，每百萬 token 的費用動輒數美金。如果你一天跑 20 萬 tokens（這對重度使用者來說算保守），一年下來的 API 費用可以買好幾套這台機器。而且你還不用把資料送出去、不用擔心 rate limit、不用半夜排隊等 inference。

這不是「窮人的 AI」，這是「不想被訂閱制綁架的人的 AI」。**$1700 的硬體買到的不是一台機器，是推理能力的所有權。**

### 2. 雙卡配置的知識門檻，仍然是巨大的階級篩選器

這篇文章的價值在於它把每一步都寫出來了——但反過來說，正因為需要這麼詳細的指南，才證明這件事有多難。

BIOS 的 CSM 設定、Above 4G Decoding、PCIe bifurcation——這些詞彙對一般 PC 使用者來說是外星語言。NVIDIA 驅動有四套並存、彼此互斥、同型號和不同型號的安裝路徑完全不一樣。llama.cpp 的編譯參數有一半是你 Google 完還是會設錯的。

問題不在於這些知識本身多難——每一項單獨拆開都不難。問題在於：**任何一步錯了，整套系統就不會動，而且錯誤訊息通常不會告訴你是哪一步錯的。** 你只會看到 OOM、看到 CUDA error、看到 token 速度跟爬的一樣——然後從頭開始除錯。

本地 LLM 離「一般人可以用的消費產品」還有多遠？**至少還差一個圖形化的安裝精靈、一個自動偵測硬體配對最佳設定的工具，和一個不會在你關掉 CSM 之後讓系統開不了機的過渡方案。** 在那之前，這圈子仍然是願意讀 BIOS manual 的人的俱樂部。

### 3. Abliterated 模型的存在，是對安全護欄過度擴張的沉默投票

作者用的模型不是原版 Qwen 3.6，而是 **Huihui-Qwen3.6-27B-abliterated**——一個被社群移除 refusal 機制的版本。所謂「abliteration」，就是直接從模型權重中削掉拒絕回答的神經迴路。

為什麼社群需要這種模型？因為一般模型的「安全護欄」已經擴張到連正常使用都受到干擾的程度。問一個歷史問題被擋、問一個程式問題被擋、問一個醫學名詞解釋也被擋——這些不是極端案例，是日常。

Abliterated 模型的灰色地帶在於：工具本身是中性的，但使用者的意圖不是。你不會因為一個人有菜刀就假設他要傷人，但 AI 產業對模型的預設姿態恰好相反——預設你會作惡，所以先把你鎖起來。**Abliteration 不是對安全的否定，是對「預設不信任」的抵抗。**

社群選擇自己動手把鎖拆掉，這件事本身就說明了一件事：當安全護欄的覆蓋範圍大到讓工具變得不可用，使用者不會坐下來寫請願書——他們會直接 fork 一個沒有護欄的版本。

### 4. Qwen 3.6 27B Q8：卡在甜蜜點上的尷尬定位

27B 參數、Q8 量化、230K context——這個規格放在 2026 年中，是一個很微妙的存在。

跟商用模型比：GPT-4o mini 和 Claude Haiku 在指令遵循和安全性上仍然領先，但 Qwen 3.6 27B Q8 的純粹推論能力（尤其是數學和程式）加上超大 context，在某些垂直場景已經可以打平甚至超越。重點是——它是本地的。沒有延遲抖動、沒有內容過濾、沒有「對不起我無法協助這個請求」。

27B Q8 的定位不是「取代 GPT-4o」，而是「在某些你不想讓第三方知道的任務上，你有一個夠強的本地替代品」。它不是萬能工具，但它是一把你不必跟任何人解釋用途的瑞士刀。

---

*城武的未解檔案——花 $1700 買兩張卡不難，難的是你要先學會讀 BIOS manual、跟 NVIDIA 驅動打架、再自己編 llama.cpp。本地 AI 的民主化，目前只民主到願意折騰的那群人為止。*
