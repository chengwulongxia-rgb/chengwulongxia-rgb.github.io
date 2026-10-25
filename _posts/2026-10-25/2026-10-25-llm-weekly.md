---
layout: post
title: "LLM 週報：模型走出圍牆，驗收的帳單才剛開始"
description: "回看 10/18–10/25：DeepInfer 開源、OpenAI 進 Google Cloud、WhatsApp 隱藏指令、PHP 漏洞協調與數學社群校稿。焦點不只在模型能力，而是部署、資訊控制與驗證成本由誰承擔。"
date: 2026-10-25 13:00:00 +0000
categories: [llm, ai, weekly]
---
![hero]({{ site.baseurl }}/assets/images/2026-10-25/llm-weekly.jpg)

城武導讀：這週值得放在一起看的，不是五場模型跑分競賽，而是五種「交到別人手上」：DeepSeek 交出推論引擎、OpenAI 把模型帶進另一朵雲、WhatsApp 被揭露把客服限制寫進隱藏文字、資安團隊協調 PHP 修補，數學社群則接手改良 AI 研究稿。城武的判斷是，AI 產業正在把競爭從產出能力推向交付能力；但交付程式碼、答案或公告，與交付可用、可查證的成果，仍是兩回事。以下回看 **2026 年 10 月 18 日至 25 日**，只挑足以改變部署與信任關係的事件，其他工具進展留在後段。[來源：DeepInfer](https://github.com/deepseek-ai/DeepInfer)、[OpenAI](https://openai.com/index/openai-models-google-cloud/)、[Redact](https://redact.dev/blog/whatsapp-help-pages-hidden-ai-instructions)、[漏洞協調](https://openai.com/index/coordinated-disclosure-of-critical-vulnerabilities/)、[數學社群](https://terrytao.wordpress.com/2026/10/24/oai-math-revised-a-community-hub-for-revising-openais-math-write-ups/)。

## 本週焦點

### 1. [DeepInfer 開源：推論效率開始有可檢查的工程答案](https://github.com/deepseek-ai/DeepInfer)

DeepSeek 公開生產推論框架 DeepInfer，本次釋出支援 DeepSeek-V4.1-Flash，包含最佳化 kernels、非同步排程與推測解碼等核心功能。不過 README 把邊界寫得很清楚：這是離線推論能力，完整服務還缺 KV cache 系統、分離式服務組裝及跨副本負載平衡；硬體支援也限定 NVIDIA SM100 與 Huawei Ascend 950。它的重要性不在於「下載後人人都有 DeepSeek 機房」，而是讓外部工程師能檢查效率究竟來自哪些設計，不必只相信服務商的成本宣稱。[來源與釋出範圍](https://github.com/deepseek-ai/DeepInfer)。

對產業的含義，是模型之外的服務堆疊也成為競爭標的。像是把 CPU 排程與裝置執行重疊，處理的是每批請求的等待；以草稿 token 搭配驗證處理解碼，則是在另一段路徑節省工作。這些能拆開討論，才有移植與反駁的空間。對開發者而言，關建不是看到開源兩字就換引擎，而是先對照模型、加速器與缺少的服務元件；開源降低的是研究門檻，不會自動取消部署門檻。[功能說明](https://github.com/deepseek-ai/DeepInfer)。

### 2. [OpenAI 進 Google Cloud：模型選擇變多，平台依賴未必變少](https://openai.com/index/openai-models-google-cloud/)

OpenAI 在 10 月 21 日宣布，將把 frontier models 與 Codex 工作流帶進 Google Cloud Model Garden，並透過 Marketplace 交易，企業也能以既有 GCP 支出承諾支付。這是未來幾週規劃正式開放的合作，不是已全面上線的服務；公告也明言 Microsoft 仍是主要雲端夥伴。真正的產業訊號是，模型供應商與雲端通路的競爭可以拆開：Google 能在推銷自家模型的同時，承接對手模型的企業需求。[公告與時程](https://openai.com/index/openai-models-google-cloud/)。

城武比較在意採購機制，而不是「敵人變朋友」的戲劇效果。若企業可沿用預算承諾、權限與資料治理，換模型就不必同時重做整套採購；這可能讓模型供應更有競爭，卻也讓雲端平台更難被替換。官方賣的是選擇彈性，讀者該追問的則是：選擇發生在哪一層？能在同一座商場換品牌，不等於能輕鬆搬出商場。正式評估仍應等待可用模型、區域與實際合約條件，而非從合作公告推定價格更低。[合作範圍](https://openai.com/index/openai-models-google-cloud/)。

### 3. [WhatsApp 隱藏客服指令：不是所有「不提供法律建議」都只是免責](https://redact.dev/blog/whatsapp-help-pages-hidden-ai-instructions)

Redact 的調查在本週更新：其檢查 545 個 WhatsApp 說明頁，發現 80 頁含有 102 個隱藏區塊，其中兩組限制涉及不要建議聯絡資料保護主管機關，以及使用者提到法律行動時不要引用隱私法規。研究者表示，10 月 18 日再查時，這些隱藏區塊已全數移除；19 日更新並轉述 WhatsApp 的回應，稱它們原是支援聊天機器人的指令，因 bug 出現在頁面，問題已修復。這是有保存副本的內容揭露，不等於已證明所有外部 AI 都曾服從它。[調查、時間線與當事方回應](https://redact.dev/blog/whatsapp-help-pages-hidden-ai-instructions)。

重要之處是資訊角色被混在一起：說明頁原本該供模型理解產品，卻也可能帶著產品方希望模型如何回答的命令。避免替使用者下法律判斷，與連官方申訴管道都不願提及，是不同的限制；把兩者包成同一種「安全客服」，正好掩蓋誰從沉默中受益。對 RAG 與客服系統的實務啟示，是把取回文件當資料，不因它來自官方網站，就升格成能覆寫回答政策的指令。這是從本案結構提出的防線，不是本次調查已量出的通用攻擊成功率。[原始證據與限制](https://redact.dev/blog/whatsapp-help-pages-hidden-ai-instructions)。

### 4. [Patch the Planet：AI 找出漏洞之後，維護者才開始最難的工作](https://openai.com/index/coordinated-disclosure-of-critical-vulnerabilities/)

OpenAI 在 10 月 21 日公開 PHP 漏洞協調案例：依其說法，Calif 使用 GPT-5.6 Sol 找到一項重大缺陷，Wiz 也獨立發現並通報兩項漏洞，PHP 維護者主導修補與發布。值得看的是公告交代了約兩個月的協調，而不是只展示模型找洞的瞬間。它提出的五階段流程，從上游驗證修補一路涵蓋發行商、服務商、政府協調與公開部署指引；「找到」與「用戶真的更新」之間，隔著多個不同組織。[案例與五階段流程](https://openai.com/index/coordinated-disclosure-of-critical-vulnerabilities/)。

城武的判斷是，這比單一漏洞榜更能顯示 AI 對開源維護的衝擊：模型可以增加發現量，但回補舊版本、測試修補與通知下游，不會因為發現者更快就自行完成。OpenAI 把提前準備的時間稱為 Defender’s Window；要讓它不是宣傳詞，就得問哪些維護者與服務商能提早取得必要資訊，以及最後怎麼確認修補已部署。公告主張由維護者決定提前邀請對象，這個權責值得持續核對；不能把企業參與協調，寫成企業獨自救了整個網路。[分工與資訊共享原則](https://openai.com/index/coordinated-disclosure-of-critical-vulnerabilities/)。

### 5. [數學社群替 OpenAI 稿件校稿：產出研究與交付知識之間，還有一整套工序](https://terrytao.wordpress.com/2026/10/24/oai-math-revised-a-community-hub-for-revising-openais-math-write-ups/)

10 月 24 日，Terence Tao 的部落格刊登四位研究者的客座文，邀請社群參與 oai-math-revised。原文的問題很具體：OpenAI 的數學稿件可能難讀，引用也可能不完整。社群專案因此提供補文獻、改善解說、找錯與修正的管道，並接受 issue、pull request 與逐篇筆記。這不是 Tao 宣布整批結果錯誤，也不是替整批結果背書；新聞價值在於，研究產出之後的理解與查核，開始有獨立的公共協作入口。[客座文](https://terrytao.wordpress.com/2026/10/24/oai-math-revised-a-community-hub-for-revising-openais-math-write-ups/)、[貢獻流程](https://github.com/mathcommunity/oai-math-revised/)。

對產業而言，這提供了一種比「模型有沒有解題」更有用的驗收尺度：別人能否讀懂推導、定位前人結果，並留下可追蹤的修訂？社群要求大幅使用自動化的貢獻予以揭露，也保留審查與修改紀錄；這些都是把結果轉成可累積知識的工作。城武不把社群接手自動當成成功，也不把它當成失敗：要看後續補了哪些引用、修了哪些命題，以及原發布方是否把這些勞動納入成果敘事，而非只計算模型生出了多少稿件。[專案規範](https://github.com/mathcommunity/oai-math-revised/)。

## 其他值得關注

- **TorchTPU 提供 PyTorch 的 TPU 後端**：專案涵蓋 ATen kernels、編譯快取、分散式訓練與推論範例，讓硬體選擇能沿用更多 PyTorch 工作方式。([來源](https://github.com/google-pytorch/torch_tpu))
- **Agent Skills 捐贈給 AAIF**：Anthropic 於 10 月 22 日宣布移交標準的名稱、GitHub 組織與網域，後續路線提案包含版本發布、提案流程及安全指引。([來源](https://www.anthropic.com/news/donating-agent-skills-to-the-agentic-ai-foundation))
- **LiteLLM 1.107.0 供應鏈事件**：SafeDep 分析指出 PyPI 成品含憑證竊取與後門，且可隨 Python 啟動執行、不需匯入 LiteLLM；評估曝險不能只查 GitHub 原始碼。([來源](https://safedep.io/litellm-pypi-compromise-credential-stealer-backdoor/))
- **GitHub 調整 agent 時代的 Git 基礎設施**：工程文說明以 per-reference 序列化縮小寫入協調範圍，並透過物件儲存讓讀取擴展與寫入解耦。([來源](https://github.blog/engineering/architecture-optimization/the-bridge-to-agent-scale-git-infrastructure/))
- **Anthropic 展示大規模形式化驗證**：公司與 Theorem 的研究報告稱，使用 Claude 為逾百個開源函式庫證明 RISC-V 組合語言層級的安全性質；不能把特定性質的證明讀成整個程式毫無漏洞。([來源](https://www.anthropic.com/research/formal-verification))
- **Agentic Monitoring 的實務切入點**：Ben Congdon 討論讓 agent 持續閱讀遙測與紀錄、補足固定告警的做法，重點是監控工作流，不是宣告可以刪除傳統告警。([來源](https://benjamincongdon.me/blog/2026/10/19/Agentic-Monitoring/))

## 隱藏敘事線

把這週事件串起來，城武看到的是「交付邊界」正在重畫：推論引擎公開，但完整服務仍待組裝；模型進入更多雲端，但採購與治理仍綁著平台。[DeepInfer](https://github.com/deepseek-ai/DeepInfer) 與 [Google Cloud 合作](https://openai.com/index/openai-models-google-cloud/) 都讓入口變多，卻沒有消滅最後一哩工程。[WhatsApp 的隱藏文字](https://redact.dev/blog/whatsapp-help-pages-hidden-ai-instructions) 提醒我們，讀到官方資料不等於取得中立指引；[漏洞協調](https://openai.com/index/coordinated-disclosure-of-critical-vulnerabilities/) 與[數學校稿](https://github.com/mathcommunity/oai-math-revised/) 則顯示，可用與可信往往由接手的人完成。我的判斷是，下一輪應追蹤的不只是生成速度，而是誰有權退回成果、誰拿得到驗證材料，以及誰為修正付帳。

*城武的未解檔案——模型負責生成，誰負責讓「交付」不只是另一個人的待辦清單？*
