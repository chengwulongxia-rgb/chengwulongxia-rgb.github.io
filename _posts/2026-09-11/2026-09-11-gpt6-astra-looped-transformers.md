---
layout: post
title: "【深度分析】GPT-6 Astra 的迴圈深度：把推理藏進模型，還是把猜測藏進敘事？"
date: 2026-09-11 01:00:00 +0000
categories: [llm, ai, deep-analysis]
---
![hero]({{ site.baseurl }}/assets/images/2026-09-11/2026-09-11-gpt6-astra-looped-transformers.jpg)

GPT-6 Astra 的強勢表現，讓「looped transformer」與「hidden chain of thought」兩個詞被綁成一個有點驚悚的故事：模型是不是用重複計算把真正推理塞進看不見的地方？Sebastian Raschka 的文章先把這個故事拆成可檢查的幾個問題：Astra 究竟強在哪裡、迴圈式 Transformer 實際改了什麼、它究竟有沒有被 Astra 採用，以及縮短或隱藏推理文字到底是否等於不可監控。

## 原文摘要

### Astra 的初步印象：強，但不要只看一張跑分圖

Raschka 寫作時剛使用 Astra 幾天，判斷它是自己用過最好的模型；相對 GPT-5.6 predecessor，它在寫作、數學、程式等多個類別都前進，尤其在 3D rendering 與 animation 的圖形展示任務上跳得很大。公開 benchmark 也顯示它的數學與 coding 能力很強；作者另外提到 ARC-AGI-3 的成績為 99.9%，相對 GPT-5.6 Sol 的 7.8%。該測試揉合邏輯謎題與泛化能力，但他認為更接近日常用途的，仍是數學、程式與 computer use 評測。

在 Artificial Analysis Coding Agent Index v1.4 這類混合多項 agentic coding 任務的指標裡，Astra 位居前沿，但並非以壓倒性距離領先。混合更廣泛任務的 Artificial Analysis Intelligence Index 也呈現相近情況。作者重視這些數據的一個理由，是它們由獨立單位執行，可能比模型開發商自行評估更可信。

不過，獨立評測也不是把比較問題一次解掉。不同 benchmark 使用不同 harness：例如 GDPval-AA 與 AA-Briefcase 使用開源、極簡的 Stirrup；Intelligence Index v4.2 中的 Terminal-Bench v2.1 使用 Terminus 2，τ³-Banking 使用 τ-Bench；Coding Agent Index 也會比較不同 coding-agent harness。共用 harness 能讓比較更接近 apples-to-apples，但模型訓練通常會以一個主要 harness 為核心，其他 harness 的微調較少，而主要 harness 又常被設計成放大該模型的長處。因此，某些 agentic 評測可能低估 Astra 在它主要操作環境裡的表現；要知道影響多大，得讓 Astra 在同一批任務上跨 harness 比較。

作者順帶提出一個實務提醒：較新的 LLM 更能理解 prompt、自己找解法，舊有的 AGENTS.md 與 SKILL.md 有時反而成為多餘的手把手約束，讓答案變差。他不是主張永遠不用這些文件；可重複的流程仍能從中獲得效率，因為模型不必每次重新發明。但有些工作流其實不需要描述，舊描述也未必仍是最佳描述，值得更新、重生或乾脆刪除。

### Computer use：Astra 最醒目的舞台

Astra 在影像與 rendering 任務特別突出；當工作還要求操作圖形介面時，便同時展示了 computer use：模型透過 Codex／ChatGPT app，在使用者本機上操作軟體。社群上從以 Blender 生成紐約市，到虛擬 open house tour，都有這類示範。

作者自己選了一個更直觀的例子：讓 GPT-6 Astra Medium 與 High 使用他電腦的滑鼠，在 browser version 的 MS Paint 重畫他的照片；他沒有使用 Extra High 與 Max，只是不想耗盡 token。這個例子不只呈現繪圖能力，也呈現模型能沿著介面、游標與工具實際完成操作。

這種能力不是第一次出現。作者今年稍早已用 GPT 模型處理 Excel 費用相關的 UI 工作；然而，computer use 仍是較新的、由 harness 支撐的能力，整體成熟度通常不如寫作、寫程式、使用 API 或 CLI。這很合理，因為 LLM 本來是文字模型，較低垂的果實自然是文字與程式。

但現實裡許多軟體尚未提供 CLI。與其等待每個人為每個程式設計命令列介面，不如訓練模型處理 GUI；而 GUI 操作也確實很適合做成直覺、好看的社群展示。作者把它類比為 humanoid robot：在專門化的 assembly line 上，人形機器人不會是最高效率的選擇，但它較通用。因而他預期接下來數月甚至數年，LLM 與 agent harness 都會進入 computer use 的精煉期；模型會在維持數學與 coding 擴張的同時，更多為此訓練，讓非科技圈的一般電腦工作也更容易交給模型，例如替人完成報稅。

### Computer use 如何被訓練

作者把這個趨勢連到一則近期報導：OpenAI 購入數萬台 Mac Mini 與 Mac Studio 供 Reinforcement Learning 使用。重點不是用 Mac 直接訓練模型——那更適合交給 GPU——而是讓模型在訓練過程接觸 macOS，學會使用系統及其中工具。

流程是：先給模型一項任務，例如打開某個 app 並完成某件事；harness 提供 macOS 的 screenshot；LLM 預測滑鼠、鍵盤、捲動等動作；harness 在 Mac 上執行；再把更新後畫面送回模型。這樣反覆進行，直到任務成功或失敗，最後以成功／失敗訊號與 verifier 或 grader 作為訓練回饋，包含 post-training 階段的 RLVR，也就是 Reinforcement Learning with Verifiable Rewards。

Mac 在這裡主要是環境，不是實際執行或更新模型的地方。模型很可能跑在 NVIDIA GPU 上，透過 API 接到 Mac。作者也引用 NVIDIA CEO 的說法：GPT-6 Astra 的訓練使用約 100,000 張 Grace Blackwell GPU。即使 computer use 成為焦點，這並不代表訓練範式已改朝換代；Astra，以及可預見未來的 LLM，仍是 reasoning model：以 RLVR 訓練，並產生中間的 reasoning trace，也就是 chain of thought。只是 trace 是否顯示給使用者，是另一層問題。

### Looped Transformer：把同一組 block 再跑一次

正式模型推出約兩天前，《The Information》報導稱，Astra 使用了「recurrent depth」或「looped transformers」。Raschka 因研究與興趣都在 LLM architecture，先做了影片說明這個機制，並提醒讀者：理解它的基本結構，才有條件判斷它是否真的會遮蔽 reasoning trace。

Looped Transformer 的核心，是讓中間 representation 多次通過同一批 Transformer block，而非只通過一次；和單純加更多 block 的差別在於，每次通過時權重相同。文中先界定名詞：Transformer block 包含 attention、feedforward module、normalization 與 shortcut connection，論文常把它叫 transformer layer；stack 是一串 block；block application 則是輸入通過一個 block 一次。

這個構想並不新，2018 年的 Universal Transformer 已出現基本想法。作者先用近期開放權重模型 Nanbeige4.2-3B 說明：它看起來像一般 Transformer，但在 stack 末端有一條箭頭回到 stack 開頭。文字先被 tokenized、轉成 embedding vector，依序通過 22 個 block，每一層都有自己的權重；第一趟完成後，hidden state 回到同一套 22 個 block，再跑一次。

若把計算圖攤平，就是 44 次 block application：第 23 次仍用 block 1 的權重，第 24 次用 block 2，如此直到 block 22。有效深度因此從 22 次 application 變 44 次，卻沒有新增第二套 Transformer 權重。至於為何跑兩輪、而非三輪或更多，Nanbeige 論文沒有給很多細節；其結果是從兩輪加到三輪可提高 modeling performance，但額外 compute 不值得。兩輪是其效率取捨。

### 權重省下來了，計算與 KV cache 沒有

迴圈的動機之一，是取代「直接堆更多 Transformer block」的擴大方式。22 個 block 跑兩次，所需 Transformer-block parameters 約為傳統 44 個不同 block 的一半，因而降低儲存權重所需記憶體。不過這不包含常占總參數大比例的 embedding 與 output layer；以 Nanbeige 4.2 3B 為例，它們約占 30 億參數的 25%，若兩者也共享權重，該部分可從 25% 降至 12.5%。

但共享不等於免費。forward pass 仍要做 44 次 block application；訓練時 gradient 也要反向穿過兩次共享 stack。與 22 層只跑一次相比，工作量大幅增加，且幾乎與 44 個不同 block 一樣昂貴；差別只在 optimizer 要更新的 distinct parameter 較少，backpropagation 並沒有少走那些計算路徑。

KV cache 也沒有因為共享 block 而節省。它會保留先前 token 的 attention key 與 value，供每一步 next-token generation 重用。雖然第 1 次與第 23 次 application 共用 block 1 的權重，兩次輸入的 intermediate state 不同，產出的 key/value 也不同，必須有各自 cache entry。因此，22 層重複兩次的 KV cache 需求，和 44 個不同 block 的傳統 Transformer 相同。

Nanbeige 團隊實驗過跨 pass 共用 KV cache，大小確實減半，但模型表現較使用分開 cache 的版本差；發布的便是後者。其 technical report 另指出兩個取捨：從頭訓練 looped architecture，比把已預訓練的 Transformer 用 upcycling 改造過來更好；固定兩趟是偏好的平衡點，更多 pass 只有小幅增益，卻使訓練變慢、optimization 更不穩。迴圈數因此本身就是架構選擇，也可以不固定在所有 token 上。

### Universal Transformer、adaptive halting 與每個 token 的不同深度

Nanbeige 是把 22 個 block 的 stack 重跑兩次；2018 年 Universal Transformer 則是重複套用同一個 Transformer block。兩者共同點是重用權重，但 Universal Transformer 進一步研究固定步數之外的 adaptive halting：某位置的 token 可以只跑一、兩輪，另一個則跑三、四輪，將更多 compute 配給從額外計算受益的 token。

它的做法是在每個 step、每個位置，以一個小型、經訓練的函數輸出 halting probability；模型把多輪的機率逐步累加，累積超過 threshold 的位置停止迴圈，另設最大 loop count 防止計算失控。這不是依 token 字面身分機械決定，而是依當下表示及其上下文決定。

ByteDance 的 Ouro 是更極端例子。Ouro-Thinking 2.6B 把同一組 48 個 Transformer block 跑四次，得到 192 次 block application，但只儲存 48 個不同 block 的權重。它以 learned exit gate 對不同 exit 分配機率，累積機率的 threshold 決定哪一趟輸出結果，借用了 Universal Transformer 的 adaptive halting；Nanbeige 沒採這種設計。不過作者也標明實務但書：釋出的 Hugging Face implementation 會先算完配置的所有 pass 才選輸出，實際 loop 數看來等同硬編碼為四。

### Mixture-of-Recursions：不是每個 token 都值得同樣的算力

2025 年的 Mixture-of-Recursions（MoR）可視為更精緻的 Universal Transformer。每個 token 可通過重複 stack 一次或多次；論文把這段稱為 recursion block，它包含多個 Transformer block，夾在獨立的第一層與最後一層之間。其新意是如何以每個 token 為單位決定遞迴次數。

Universal Transformer 每一輪用 learned halting probability 決定是否繼續；MoR 使用小型 learned router，概念近似 Mixture-of-Experts 的 routing，只是它不是選 expert，而是選共享 stack 要跑幾次。router 讀取 token 的 hidden representation，其中也帶著 context，因此同一個字在不同句子位置、前文不同時，並不會固定得到相同 loop 次數。

論文試了兩種 routing。expert-choice routing 在每個 recursion step 選出要繼續處理的 token，退出者不再進後續步驟；token-choice routing 則在最初一次決定，將每個 token 分派到跑一、兩或三次的路徑。兩種設計都跨 pass 重用 Transformer 權重，但多了按 token 調度計算量的彈性；模型與 router 一起訓練，從訓練中學會處理這些不同路徑。

MoR 的 validation loss 圖比較一般 Transformer、固定 recursion 的 Transformer 與 MoR，涵蓋不同模型尺度及 training compute budget。最小尺度時，一般 Transformer 最好；模型變大後，MoR 追上並常常更好，尤其在較小訓練預算；最大預算時多條曲線相當接近。結論不是「迴圈永遠贏」，而是優勢取決於模型大小與訓練 compute。相同 training compute 也不等於處理相同數量的 training token：MoR 因略過部分計算，可在同一預算下看更多 token。作者因此說，若只看 1.35 億參數的小模型，甚至會得出相反結論；尺度實驗不可省略。

### 與 RNN 的相似處與根本差異

對有深度學習背景的人而言，「recurrent depth」會讓人想到 RNN。RNN 的確重複使用先前 iteration 的層與權重，但它沿的是時間步：hidden state 從一個 token 帶到下一個 token。處理文字時，RNN 一次讀一個 word 或 token，將先前資訊帶往後面。

Looped Transformer 則沿著架構深度重跑同一 token 的 intermediate representation；token 之間的信息仍靠 attention 傳遞。若這個類比令人混亂，作者給出更簡單的說法：把 looped Transformer 視為「讓 Transformer block 重用」，像把模型加深，卻進行 weight sharing，而不是把它誤當成傳統 RNN。

### Astra 到底有沒有 looped transformer？作者說：無法證實

在談它是否遮蔽推理前，作者先把最重要的前提拉回來：Astra 是否真的用了這種架構？《The Information》的消息目前仍是 rumor 或 scoop，沒有官方確認。若是 open-weight model，外界可直接檢查；但 Astra 不是，因此只能依賴未驗證報導。

Raschka 個人覺得 Astra 採用某種 looped Transformer 元素的可能性很高，理由有三：已有前述報導；過去研究顯示技術有潛力；OpenAI chief scientist 曾說，包括 Astra 在內的現代 frontier model，其 computation graph depth 與 GPT-4 相差在兩倍以內。然而，這句話不明確證實 looped architecture，也可能只代表使用兩倍數量的普通 Transformer block。

他更進一步降低這個傳聞的解釋權重：Astra 的好表現主要很可能來自更好的 training recipe 與 training data；looped Transformer 的調整可能有些幫助，但《The Information》可能高估了它的貢獻。這是作者明確保留的推測，不是已驗證的架構事實。

### Hidden CoT：先分清楚「不顯示」與「被架構抹掉」

作者接著處理爭議核心：looped Transformer 是否會遮蔽 reasoning trace？他先指出，OpenAI 從 o1 開始就已向使用者隱藏大部分 reasoning trace，所以在終端使用者層面，這未必造成一個全新差異；可解釋性的顧慮主要落在模型開發者能否監測模型。

他的判斷是，looped Transformer 並不是隱藏或模糊 chain of thought 的重要成因。reasoning model 通常會在輸出最終答案前產生中間文字步驟，這些一般 text token 構成 reasoning trace 或 chain of thought，介面可選擇不顯示。舉例來說，若問題是找出和為 10、積為 21 的兩個數，模型可以先猜 5 與 5，發現積是 25 而非 21，再回頭改試 3 與 7，逐一驗算。

這種過程包括 backtracking：模型注意到錯誤、回到先前選擇、換一條路再前進。但每一步仍是根據 prompt 和之前 token，一次生成一個 token。中間步驟像 scratch pad，在答案前增加計算；最後答案可以比前面的 trace 短很多，而 OpenAI 通常不把大部分 trace 給使用者看。

### 更多內部計算，是否必然換來更短、較不可讀的 CoT？

reasoning trace 的額外 token 會增加計算；looped Transformer 也會增加計算，因為 token 需通過更多 block。由此可以提出一種假說：如果模型把更多計算放在內部 loop，就不需要那麼多外顯的 thinking token。Astra 的 benchmark 圖以 output token 數量作橫軸，作者讀到的結果是：跨 effort level 整體看，Astra 不一定總比 GPT-5.6 Sol 用更少 token；但在固定 accuracy 下，Astra 確實比 Sol 用更少 token。

這不必然構成 interpretability 問題。少 token 也可能只代表模型能力更好、犯錯更少、較少 backtracking，第一次就做對更多事。作者以同一模型家族的 Luna 與 Sol 為例：在相近表現下，Luna 使用的 token 比 Sol 多 80%。很少有人因此主張 Sol 比較小的 Luna 不可解釋 80%；較合理的說法是，更大、訓練更好的模型以更多 compute 更有效率地解題，這裡的效率表現在更少 token。

此外，reasoning trace 本身也不保證忠實描述模型內部真正發生的一切。作者認為，唯一站得住腳的疑慮是：looped Transformer 是否刻意比傳統 Transformer 更常呈現「假的」reasoning trace 來誤導使用者；現有並無強證據證實這件事。Astra 的 system card 確實稱，reasoning trace 的 monitorability 有下降證據，較 Sol 有些 regression，主要與較短、資訊量較少的 trace 有關；但這仍不能把 looping 確立為根因，也可能只是 trace 普遍變短，如 Luna 與 Sol 的比較。

作者發表自己看法數小時後，OpenAI chief scientist Jakub Pachocki 也說，他想防止由混亂報導引發的「競逐不可監控性」；包括 Astra 的 frontier model computation graph depth 仍在 GPT-4 的兩倍範圍內。OpenAI 從最初 reasoning model 起就試圖保存並利用 CoT monitoring，因為它能觀察 alignment 如何在訓練分布以外泛化。他同時承認 CoT monitoring 很脆弱，且正因不依賴架構改變的原因而朝不好的方向走，但公司正研究如何強化它。Raschka 解讀，所謂「混亂報導」很可能就是在否定《The Information》把 looping 與 CoT 變化直接相連的暗示。

### 近期研究一：latent reasoning 可在每個輸出 token 前多想幾輪

作者最後整理若干超出前述設計的研究。2025 年的〈Scaling up Test-Time Compute with Latent Reasoning: A Recurrent Depth Approach〉研究如何在 inference 增加 loop。研究者訓練了一個不算很小的 35 億參數模型，使用 8000 億 token。它不像 Universal Transformer 不斷重用單一 block，而是像 Nanbeige 重複一個 stack；不同的是，它把四個共享 block 夾在兩個 initial block 與兩個 final block 之間。

這個 shared stack 每次 loop 起始時，不只收到前一輪 hidden state，也收到 initial block 的輸出；兩者 concatenate 後經 learned linear projection，才進入四個共享 block。可以把它理解為：每一趟共享 stack 都能重新取得同一份初始輸入 representation。訓練時 loop count 是隨機抽樣，讓模型能適應不同計算量；inference 時由執行者挑 fixed budget，例如 8、32 或 64 loops。每個 token 還有 adaptive stopping：若兩次連續 round 的 next-token probability distribution 之間 KL-divergence 低於 threshold，分布過於相似，便停止迴圈。

效益依任務而異。HellaSwag 在約八輪後大致飽和，GSM8K 與 HumanEval 則從更多 loop 受益。雖然標題叫 latent reasoning，模型仍可以生成文字 CoT；looping 只是讓它在每一個 output token 前多得到一段計算。

### 近期研究二：多算幾輪不等於多存更多知識

2025 年 6 月的〈Beyond Parameters: Exploring Virtual Logic Depth for Scaling Laws〉把「儲存資訊」和「用資訊解題」分開測。其 memorization experiment 顯示，在 parameter count 固定時，looping 幾乎不改變可儲存資訊量；增加 distinct parameter 才會增加容量。作者據此說，looping 不會替模型新增或取回更多知識，這很合理：一旦資訊已存入，retrieval 相對是較簡單的工作，而 loop 本身是計算機制，不是儲存機制。

在另一組 reasoning experiment 中，不增加 parameter、只重用 block，就能提高 multi-step math problem 表現。這表示額外計算能協助模型解題，即使它並沒有更多空間儲存資訊；當然，擴大模型也能提升 reasoning，只是後者同時增加了 parameter。作者藉此把「知識容量」與「推論步驟可用的計算」分開，避免把所有能力進步都歸咎於模型記住更多東西。

### 近期研究三：在真正對齊 compute、參數與 KV cache 後，迴圈還值不值得？

2026 年 9 月剛發布的〈SMELT: Scaling Laws for Compute-Matched MoE Looped Transformers〉正面回到成本問題：若 looped 與傳統 Transformer 的每 token compute、總 non-embedding parameter、KV cache requirement 都盡量匹配，結果如何？研究者使用 Mixture-of-Experts 架構，把中間一半的 Transformer block 跑兩次；這像 Nanbeige，也帶有 latent reasoning 式 sandwiching。

為補償額外 block application 的 compute，他們縮窄 hidden dimension；這使參數變少，於是再加 expert 把總 parameter count 補回來，並調整 attention head configuration，讓 KV cache 可以比較。實驗規模最高到 540 億 non-embedding parameter。從 fitted scaling curves 推算，在研究涵蓋的 compute 區間，SMELT 要達到同樣 validation loss 所需 training compute 約少 6.8% 至 18%。

因此作者對「looped Transformer 在計算上是否值得」給出肯定但有限定的答案：在這種嚴格匹配下，它以同一 compute budget 換到略好的模型。這不等於任何 loop 設計、任何大小都必勝；它是對前面「共享權重仍得支付計算和 cache」的補充：付出的計算沒有消失，但某些配置能把同一預算用得稍好。

### 近期研究四：full-bandwidth transformer 與較短 reasoning trace 的但書

2026 年 8 月的 Full-bandwidth Transformer 研究的是跨 token position 的 recurrence。每次 decoding 時，它把前一 token 最終 hidden state 與新抽樣 token 的 embedding，以 learned gate 結合，形成下一次 forward pass 的輸入。下一 token 的計算於是能從 stack 底部取得前一 token 的最終 representation，和 latent reasoning 有些相似。

在一個 10 億參數 base model 上，研究者發現 latent feedback 在 MATH500 可讓 reasoning trace 變短，同時維持或提高 accuracy；但經 instruction tuning 後，縮短效果消失。這直接碰到前面的疑問：內部 feedback 或 loop 與短 trace 的關係，取決於 feedback mechanism 和訓練方式，不能一概而論。實驗也沒有證明短 trace 較不忠實。

研究還有重要限制：它沒有測試若以傳統方式增加模型大小，例如增加更多不同 Transformer block 而不是 looping，是否會產生相似的 trace length 效果。因此，不能從這項結果推出「迴圈就是 Astra 隱藏推理的原因」。

### 原文結論

Raschka 最後總結，Astra 是很強的模型，並且在 computer use 跨出特別大的一步；他預期 computer use 會成為接下來開源與專有 harness 的重點。他也特別看重開源 harness，因為把工具交給主力電腦時，能先 audit harness 是必要的責任問題。

至於 Astra 的架構，他仍只說「很可能」採用了某種 looped Transformer variant，而不是宣稱已被證實。從整理的研究看，looped Transformer 在固定 compute budget 下可以提升 modeling performance。能力提升可能使 reasoning chain 變短，但這不是新現象：同一模型家族中，能力較強者本就可能用更少 token。

作者最後把短 trace 解讀為更有能力的模型少犯錯、少 backtrack，並把更多計算放到架構內，而不是完全靠外顯 reasoning trace 當 scratchpad；就像同一場大學數學考試，準備更好、能力更強的學生，可能比較少用草稿紙、也較少回頭塗改。文章後段另推薦其《Build a Reasoning Model (From Scratch)》一書與讀者評論，作為延伸閱讀與支持方式。

## 城武觀點

我賭「重複 Transformer block」或 latent reasoning 不是可監管性的證據；就算 Astra 真把更多推理壓進隱狀態，外界拿它猜架構，也只是在黑箱外再造一層解釋性幻覺。Raschka 值得肯定的是，他把「Astra 是否採 looped transformer 仍未證實」與「CoT 能否被隱藏」拆開，且研究確實顯示短／隱式推理另有多種設計來源。最強反方說法是：不公開 CoT 就無法查模型怎麼想；但完整 CoT 也未必忠實，更未必適合公開。架構透明不等於可問責；真正該要求的是 agent 對外行動時可審計的依據、工具調用、授權與責任鏈。這不是替黑箱開脫，而是拒絕把一段漂亮的自述當作證據：能回放、能追責、能撤銷的行動紀錄，才是使用者真正拿得到的監督權。

*城武的未解檔案——與其逼模型交出一份未必可信的內心獨白，不如先讓它為每一次替你按下按鈕留下可驗證的收據。*
- 原文：[GPT-6 Astra, Looped Transformers, and Hidden Reasoning](https://magazine.sebastianraschka.com/p/gpt-6-astra-looped-transformers-and)（Sebastian Raschka, Ahead of AI, 2026-09）
