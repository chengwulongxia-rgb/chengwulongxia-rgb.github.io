---
layout: post
title: "【論文拆解】FinCausal 2026——GPT-4.1 mini fine-tuned 在多語言金融因果 QA 打敗 GPT-5.2"
date: 2026-06-30 04:00:00 +0000
categories: [llm, ai, paper-breakdown]
---

![hero]({{ site.baseurl }}/assets/images/2026-06-30/fincausal.jpg)

FinCausal 2026 共享任務的結果出來了，有一篇論文值得所有人花十分鐘讀，不是因為它用了什麼驚天動地的架構，而是因為它的結論直接打在「參數量越大越強」這個信仰的臉上。Anhalt University 的 HSA_CORAL 團隊提交的系統，用 GPT-4.1 Mini（一顆中型模型）做 multilingual fine-tuning，在英文子任務拿到並列第一（4.8140）、西班牙文第三（4.7753），直接把 GPT-5.2 zero-shot（4.7600 / 4.7350）按在地上磨擦。如果你還在相信「等下一代大模型出來什麼問題都解決了」，這篇論文是你的必讀清單。

---

## 原文摘要

### 1. 引言

理解金融文本中的因果關係，對投資決策至關重要——股價驅動因素、經濟變化、市場行為、各國監管決策，全都藏在這些因果鏈條裡。FinCausal 共享任務從最初專注於直接因果短語識別，一路進展到隱性因果與多步推理。2025 年的任務已經要求生成式模型回答關於因果的開放式問題，並使用 Exact Match（EM）和 Semantic Answer Similarity（SAS）作為評估指標。

2026 年版本引入了多項新元素：資料集包含更複雜的因果關係片段、改寫過的問題需要更精細的推理、隨機劃分的訓練測試集，以及最重要的——**使用 LLM-as-a-judge 作為評分機制**，以 1-5 的 adequacy scale 評估回答品質。這迫使模型超越簡單的文字匹配，真正理解明確與隱含的因果關係。

論文探索了三種方法：(i) encoder-only 的 token classification（BERT）、(ii) encoder-decoder 的 seq2seq generation（BART）、(iii) decoder-only LLM 的 few-shot prompting 與 fine-tuning（Llama 3.1、GPT 系列）。

### 2. 相關研究

**因果資訊抽取**：早期依賴 rule-based 系統和傳統機器學習（SVM、決策樹），需要大量特徵工程，且難以捕捉因果關係中的時間動態。BERT 及其多語言變體的出現改變了局面，讓模型能以最少的特徵抽取理解上下文——隨後在金融領域 fine-tuned 的 pre-trained language model 持續在情感分析和事件抽取上擊敗傳統方法。

**預訓練語言模型**：近期 GPT-4 等專有 LLM 在金融問答中展現了強大的 few-shot 學習能力，能在沒有 task-specific fine-tuning 的情況下從少量範例泛化。但這篇論文要挑戰的正是這個假設——fine-tuning 到底重不重要？

### 3. 方法論

團隊比較了三種 extractive QA 方法：

**Encoder-Based Extractive QA（3.1）**：使用 BERT 進行 token classification。將 context 和 question 用 [SEP] token 拼接，採用 IO tagging scheme 標註 answer span。訓練時用 loss mask 排除 question token 和特殊符號，只對 passage token 計算 cross-entropy loss。

**Encoder-Decoder Extractive QA（3.2）**：使用 BART 做 sequence-to-sequence generation。輸入為 question + context 拼接，模型逐 token 生成答案。推理時用 beam search 解碼。這個方法的優勢在於能夠靈活處理 answer span。

**Decoder-Based Extractive QA（3.3）**：最關鍵的方法。團隊設計了多步驟策略——先做 prompt optimization（通過迭代微調在訓練子集上找到最穩定的指令格式），然後用 cosine similarity 從訓練集中檢索最相關的 QA pair 作為 few-shot examples（使用 multilingual MiniLM embedding），最後進行 supervised fine-tuning（最高 2,000 samples）。三種 fine-tuning 配置：僅英文、僅西班牙文、雙語合併。論文明確指出這個混合方法的目的——**利用 LLM 的生成能力，同時維持 extractive precision**。

值得一提的是，論文附錄 A 公布了完整的 prompt 模板，包含 5 條指令（仔細閱讀 context、判斷問題在問 cause 還是 effect、從 context 逐字提取、只輸出答案、使用與問題相同的語言），以及 strict 的 output constraint——不能包含任何額外文字。

### 4. 實驗

**資料集**：英文和西班牙文的財務敘事文本，任務是從給定的 context 中提取一個表達因果關係的文字片段。問題以抽象方式表述，指向 cause 或 effect。複雜因果結構（因果鏈、非線性關係）的 context 最多包含兩個問題。英文資料來自 UCREL corpus 和 2018 FinT-esp corpus（2017 年財報），西班牙文資料來自 2014-2018 年西班牙財報語料庫。訓練集各 2,000 samples，測試集英文 500、西班牙文 503。

**模型選擇**：BERT base multilingual（encoder）、BART Facebook base（encoder-decoder）、Llama-3.1 8B 和 GPT 系列（decoder-only）。Llama-3.1 使用 LoRA 進行高效 fine-tuning。

**核心結果（Table 1）**：

| 模型 | Fine-tuned? | 訓練語料 | English | Spanish |
|------|------------|---------|---------|---------|
| BERT Base Multilingual | 是 | en+es | 3.9800 | 3.9810 |
| BART Facebook Base | 是 | en+es | 4.1200 | 4.0300 |
| Llama-3.1 8B | 是 | en+es | 4.0200 | 3.9100 |
| GPT-3.5 turbo | 否（zero-shot） | - | 4.7040 | 4.7060 |
| GPT-4.1 mini | 是 | 僅 en | 4.7560 | 4.7141 |
| GPT-4.1 mini | 是 | 僅 es | 4.7210 | 4.7674 |
| **GPT-4.1 mini** | **是** | **en+es** | **4.8140** | **4.7753** |
| GPT-5.2 | 否（zero-shot） | - | 4.7600 | 4.7350 |

**Few-shot 的關鍵發現（圖 1）**：論文的 Figure 1 顯示了 LLM-as-a-judge score 與 few-shot 範例數量的關係曲線。隨著範例從 0 增加到 20，分數穩定上升。但**超過 20 個範例之後，品質不再提升，在某些情況下甚至開始產生 hallucinated content**。這是全文最值得注意的 empirical finding 之一。

**Fine-tuning 的優勢**：Multilingual fine-tuning（en+es）一致優於 monolingual fine-tuning——英文從 4.7560 提升到 4.8140，西班牙文從 4.7674 提升到 4.7753。更關鍵的是，fine-tuned GPT-4.1 Mini 在兩個語言上都贏過了 **GPT-5.2 zero-shot**（4.7600 / 4.7350）。論文的解釋：測試資料集的 context 和 question 包含特定的詞彙特徵和因果關係模式，只有在模型透過 fine-tuning 接觸過 task-specific annotation guidelines 之後才能可靠識別。

**錯誤分析**：模型在處理**嵌套因果結構**和**包含多重潛在原因的 context** 時持續出錯。在這些困難案例中，模型經常選錯因果配對，且錯誤在西班牙文子任務中更頻繁——這表明跨語言泛化在複雜因果結構上仍然是一個瓶頸。論文本人指出缺乏詳細的 annotation guidelines 進一步加劇了這個問題，因為單純的 prompt optimization 無法完全解決這類歧義。他們建議未來採用 DPO 或 RLHF 等 alignment 技術來學習人類註解中的隱性模式。

### 5. 結論

生成式模型在財務敘事文本的因果問答任務上勝過 encoder 和 encoder-decoder 架構，前提是透過 prompt engineering 和 few-shot examples 有效緩解 hallucination。多語言 fine-tuning 顯著提升效能，展現了跨語言遷移在此領域的有效性。未來方向：LLM-based evaluation 作為品質提升手段、更複雜的嵌套因果結構處理策略。

論文註記：本研究由德國聯邦研究、技術與太空部（BMFTR）資助的 CORAL 專案（16IS24077C）完成。

---

## 城武觀點

這篇論文不長，結論也不花俏，但它的 empirical findings 值得逐條拆開來看——因為每一條都打在當前 LLM 產業的某個預設假設上。

**第一，fine-tuning > model size 不是修辭，是實證。** GPT-4.1 Mini（OpenAI 的中階模型，參數量遠低於 GPT-5.2）經過 multilingual fine-tuning 之後，在英文和西班牙文都贏過 GPT-5.2 zero-shot。這不是「微調有幫助」這種常識等級的論述——這是在量化「微調的效益邊際」到底有多大。如果一顆中階模型加上領域 fine-tuning 可以穩定打敗旗艦模型的 zero-shot，那「等下一代模型出來再試」這句話的成本就變得非常具體。你等的不是救世主，你等的是你現在就可以做的事。

**第二，multilingual FT 有效，但 Spanish 仍然落後 English——這個 gap 不是資料量的問題。** 多語言 fine-tuning 確實比單語言好（英文 4.8140 > 4.7560，西班牙文 4.7753 > 4.7674），但跨語言轉移的邊際效益在西班牙文上明顯衰減。英文從 monolingual 到 multilingual 提升了 0.058，西班牙文只提升了 0.008。論文自己的錯誤分析點出了原因：**嵌套因果結構和多重潛在原因在非英文語言上更難處理**。這不是更多的西班牙文 training data 能解決的——這是 cross-lingual transfer 在 complex causal structure 上的結構性瓶頸。如果你的應用場景涉及非英文的複雜因果推理，multilingual FT 是必要條件但不是充分條件。

**第三，20 few-shot 的 sweet spot 和之後的 hallucination——這是一個被低估的研究問題。** 論文 Figure 1 顯示了非常清晰的模式：從 0 到 20 個 few-shot examples，分數單調上升；超過 20 之後 plateau 然後在某些案例中開始下降，伴隨 hallucinated content。這不是 prompt engineering 的問題——這是 context density 超過某個閾值之後，模型從「回答問題」切換到「編造合理內容」的模式。這個現象在學術文獻中幾乎沒有被系統性研究過，但它直接影響所有依賴 few-shot 的生產系統：你的 context 塞了多少範例？你有測過在你的 domain 上 hallucination 曲線的轉折點在哪裡嗎？如果你沒測過，那你就是在猜。

最後，這篇論文最誠實的地方在錯誤分析段落。他們直接說了：prompt optimization 無法解決嵌套因果結構的歧義，因為問題的根源不是 model capability，而是 annotation guidelines 的缺乏。這是一個很少有論文願意承認的結論——**在某些任務上，瓶頸不是模型不夠強，是人類沒有把 ground truth 定義清楚**。在 FinCausal 2026 的複雜因果案例中，連 annotators 之間可能都沒有一致意見，模型怎麼學都不會對。

*城武的未解檔案——一顆中階模型加上 2,000 筆訓練資料，比你在生產環境裡供奉的旗艦模型更有用。問題不是誰的參數比較多，是誰的 annotation 比較清楚。*

- 原文：[Causal Connections: Leveraging Multilingual Fine-Tuning for Financial QA@FinCausal 2026](https://arxiv.org/abs/2606.27446)（Akash Kumar Gautam, Serhii Hamotskyi, Christian Hänig, Anhalt University of Applied Sciences, Proceedings of FNP 2026 at LREC 2026, June 2026）
