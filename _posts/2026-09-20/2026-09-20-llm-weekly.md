---
layout: post
title: "LLM 週報：當 agent 變成基礎設施，漏洞也開始規模化"
date: 2026-09-20 13:00:00 +0000
categories: [llm, ai, weekly]
---

![hero]({{ site.baseurl }}/assets/images/2026-09-20/llm-weekly.jpg)

這週真正改變的不是又多了一個模型名，而是 agent 開始被當成可交付的基礎設施：Anthropic 將 Opus 5 放進長時程工作流，OpenAI 把 Codex 的 harness 打包成 API，Mistral 則用 30 億歐元替「主權」補上算力與商業規模。但同一週的 OpenAI 入侵揭露也提醒我們：當模型把研究、操作與修補都加速時，攻擊鏈不會自動留在 demo 裡。企業說的是「更少摩擦」；工程師該先問的是，摩擦被移到哪一層、最後由誰付款。

## 本週焦點

### 1. [Claude Opus 5：長時程 agent 的能力與安全降級一起上線](https://www.anthropic.com/news/claude-opus-5)

Anthropic 將 Claude Opus 5 定位為可長時間運作的程式與知識工作模型，API 定價維持每百萬 input tokens 5 美元、output tokens 25 美元；官方也宣稱它在 Frontier-Bench、CursorBench 等評測表現提升。更值得注意的不是排行榜，而是它把「自行驗證、反覆迭代」列為核心使用方式：模型不只是回一段答案，而是被期待留在工作環境裡，持續碰工具、程式碼與中間產物。

這使安全設計從拒答問題變成路由問題。Anthropic 說，遭網路安全分類器標記的請求，會在 Claude.ai、Claude Code 與 Claude Cowork 預設 fallback 到 Opus 4.8；API 也可啟用自動 fallback。這是務實的可用性取捨，卻也讓使用者必須知道：同一個任務可能在無明顯提示下改由另一個模型完成。所謂「最佳可用模型」不是中性的工程細節，而是一個藏在服務層的決策點。

### 2. [研究者揭露：以圖像解碼漏洞與 SSO 設定串入 OpenAI 帳號及內部 repo](https://www.hacktron.ai/blog/hacking-openai)

Hacktron 公開的負責任揭露報告指出，研究團隊把 OpenAI 社群論壇的 HEIF 圖像處理遠端程式碼執行，與 OpenAI SSO 身分設定問題串成攻擊鏈；報告稱他們取得多名員工 ChatGPT 帳號的存取，並以讓受害帳號的 Codex 建立無害 PR 的方式證明可觸及內部 GitHub 組織，隨即停止測試。OpenAI 在提交後約 14 小時確認修補，並支付 6,500 美元獎金；Discourse 後續也發布修補與影像處理沙箱措施。

這篇報告的訊號不在於替任何模型背書。研究者稱 Opus 4.8 難以在 ASLR 啟用時做出可靠 exploit，Opus 5 上線後則協助在數小時內完成；那是單一團隊的案例，不等於可泛化的基準測試。但它具體展示了 agent 降低了哪種成本：從公開或半公開的依賴漏洞，到針對部署環境調整 exploit 的時間與人力。安全預算若仍只按「漏洞有沒有 CVE」分配，就會落後於攻擊者實際的工作流。

### 3. [OpenAI 推出 Agents API，把 Codex harness 做成代管服務](https://openai.com/index/introducing-the-agents-api)

OpenAI 在公開 beta 推出 Agents API，將長 session 的 context compaction、tool search、程式化工具呼叫與 subagent 編排打包進服務；開發者可選 OpenAI 代管 sandbox、自行部署或合作夥伴環境。OpenAI 的說法是，這能讓團隊少寫一次又一次的 agent orchestration，改把時間放在工具、知識與工作流本身。

真正的轉折是 harness 被產品化。模型換代以前，團隊還能把可靠性問題歸咎於模型；現在 context、工具選擇、平行子代理、檔案與 secrets 所在的 sandbox 都被整合進供應商控制面。這確實能降低起步門檻，卻也讓可觀測性、供應商切換與事故歸責變成採購時就要回答的問題。開源 Codex codebase 提供了可閱讀的核心邏輯，但受管服務運行時的策略與版本節奏，仍是另一層黑盒。

### 4. [Mistral 募得 30 億歐元，將「主權 AI」升格為全棧競爭](https://mistral.ai/news/mistral-makes-sovereign-open-weight-ai-to-frontier/)

Mistral 宣布完成 30 億歐元 Series D，投後估值逾 210 億歐元，由 Samsung Electronics 領投，並稱資金將用於前沿研究、訓練與推論算力、國際商業擴張。這筆募資的重要性不在金額本身，而在歐洲 AI 公司終於能把「open-weight」從模型授權的立場，推到算力、部署、產品與資料治理的全棧承諾。

不過「不被單一供應商綁定」是最容易被做成廣告詞的一句話。Mistral 的主權敘事必須接受同樣嚴格的檢驗：哪些權重真的可取得與調校、哪些工作負載仍要依賴其 cloud、跨地區部署的成本與合規條件是什麼。這週同時出現 Mistral Small 4、Medium 3.5、OCR 4 與 Mozilla 合作，顯示它正在把模型、文件與瀏覽產品拉成一條線；但讀者該看的是控制權的合約與計術邊界，而不是「主權」兩字的字體大小。

## 其他值得關注

- **[Gemini 3.8 Live 與 Extended Thinking](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-8-live-gemini-3-8-live-extended-thinking/)**：Google 更新即時互動模型與延伸思考版本，繼續把推理時間做成產品分層。
- **[Mistral Small 4](https://mistral.ai/news/mistral-small-4/)**：Mistral 發布新小型模型，補齊其面向不同部署與成本區間的產品線。
- **[Mistral Medium 3.5](https://mistral.ai/news/vibe-remote-agents-mistral-medium-3-5/)**：Mistral 將 Medium 3.5 放進 remote agents 與 vibe coding 的使用情境。
- **[Mistral OCR 4](https://mistral.ai/news/ocr-4/)**：新 OCR 產品讓文件理解成為模型公司爭奪企業工作流的另一個入口。
- **[Claude Cowork 和 chat 合併為單一 Claude](https://claude.com/blog/cowork-is-now-claude)**：Anthropic 將工作協作與聊天介面收攏，產品邊界開始追上 agent 工作流。
- **[CUDA Rust：NVIDIA 宣布原生 GPU 程式設計路線](https://developer.nvidia.com/blog/introducing-cuda-rust-two-tracks-for-writing-gpu-kernels/)**：Rust 進入 CUDA 工具鏈，可能改變高效能 AI 基礎設施的開發者選擇。
- **[HarnessTax：coding agent 的框架到底影響多少？](https://harnesstax.github.io/)**：研究把焦點放在 harness，而非只比較模型能力，正好對照本週的 Agents API。
- **[突破 1.58-bit：三值 LLM 的新研究](https://arxiv.org/abs/2609.16338)**：論文探索 ternary LLM 的量化邊界，指向更低記憶體與推論成本的可能性。
- **[GLM 如何自建推論基礎設施](https://z.ai/blog/glm-built-its-inference-infrastructure)**：GLM 分享自營 inference stack 的工程經驗，反映模型公司也在競逐服務層效率。
- **[Claude Code 在缺少 Claude.md 時讀取 AGENTS.md](https://code.claude.com/docs/en/changelog)**：一項小改動，卻讓 agent 專案慣例的互通性比品牌專屬設定更重要。
- **[Cactus Needle 3](https://cactuscompute.com/needle)**：8–29MB 的自動化模型宣稱可接近 DeepSeek V4 Flash，需以獨立測試檢驗其適用範圍。
- **[LLM Classification Is Feature Engineering](https://minimallysufficient.com/posts/llm-classification-is-feature-extraction/)**：從實務角度重述 LLM 分類的成本與可控性問題。

## 隱藏敘事線

本週每家公司都在賣「控制」：OpenAI 代管 harness，Anthropic 用 fallback 管住高風險任務，Mistral 兜售資料與部署主權。可 Hacktron 的案例說明，控制面愈厚，邊界也愈值得被逐層測試；一個論壇的圖像 decoder 和一個 SSO 設定，就能穿過看似無關的產品線。模型能力的競爭已經移到工作流與身分係統，這裡的失敗不會以 benchmark 掉分呈現，而會以權限、資料與修補時鐘呈現。下一輪真正的差異化，可能不是誰的 agent 最會做事，而是誰能把它做錯時留下可追查的證據。

*城武的未解檔案——當每家公司都說 agent 能替你少做事，誰在替你多背那條看不見的權限鏈？*
