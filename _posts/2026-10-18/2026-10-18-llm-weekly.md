---
layout: post
title: "LLM 週報：模型競賽開始賣控制權，不只賣更大的分數"
date: 2026-10-18 13:00:00 +0000
categories: [llm, ai, weekly]
---

![一座資料中心與一台本機工作站在斷開的光纖兩端拉扯，象徵 AI 控制權]({{ site.baseurl }}/assets/images/2026-10-18/llm-weekly.jpg)

這週的關鍵字不是「更聰明」，而是「誰能決定模型在哪裡跑、資料往哪裡去、出事時誰能關掉它」。Mistral 以 sovereign AI 敘事拿到大筆資金，Google 把 Gemini 4 Argon 包裝成更會做事的 agent，DeepSeek 與 Liquid 則分別從超大開放權重、輕量本機 agent 切入。模型公司終於承認一件不太適合印在發表會大字報上的事：能力是入口，控制權才是長約。

## 本週焦點

### 1. [Mistral 的 30 億歐元提醒：主權 AI 不是國旗貼紙](https://mistral.ai/news/mistral-makes-sovereign-open-weight-ai-to-frontier/)

Mistral 宣布完成 30 億歐元 Series D，並把論述鎖在「sovereign、open-weight、frontier」三個漂亮詞上。這筆錢的意義不只是歐洲又出現一間估值很高的模型公司；它代表大型採購方開始把 AI 視為基礎設施與供應鏈問題，而不是單純的 SaaS 訂閱。政府、金融、國防與製造業在問的，已經不是聊天介面好不好用，而是模型、權重、推論紀錄能否留在自己管得住的環境。

不過「主權」必須能被操作，不是新聞稿上的情緒價值。真正的檢驗是：能否在自己的 VPC、on-prem 或隔離網路部署？能否帶著資料、微調流程與評測集離開？是否被特定雲端與 GPU 合約反向綁住？Mistral 這輪融資讓歐洲有更大的談判籌碼，但資本、算力與通路依然高度集中；把依賴改成另一個較順眼的供應商，不叫主權，頂多叫換了色系的鎖定。

### 2. [Gemini 4 Argon：agent 的競賽，開始從回答問題變成承擔工作流](https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-gemini-4-argon/)

Google 推出 Gemini 4 Argon，主打長上下文、多模態、工具調用與 agent 任務。這類發布真正改變的不是 benchmark 排名，而是模型被接進內部系統後的責任半徑：它不只產文字，還會讀文件、查資料、選工具、寫入下一步。當產品從「副駕」變成能碰方向盤的代理，失誤也不再只是答錯一題，而可能是錯發信、錯改檔、錯把私有脈絡送到不該去的地方。

所以 Argon 的看點不在 Google 又說它「更有用」——每一家都這樣說，像餐廳菜單上「主廚推薦」一樣不必太認真——而在組織能否把它關進可驗證的權限邊界。要用這一代 agent，應先問：每個工具是否最小權限？每次外部動作是否留有可讀的稽核軌跡？高風險步驟是否需要人類確認？沒有這些，長 context 只是讓模型能帶著更多上下文，一路更有效率地走錯路逕。

### 3. [DeepSeek-V4.1-Flash：開放權重從替代品，變成部署選項](https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash)

DeepSeek-V4.1-Flash 以 763B 總參數、MIT 授權釋出，同時採用 MoE，讓每個 token 實際啟用的參數量遠低於總量。這不是一句「大模型開源了」就能帶過的更新：大尺寸權重、寬鬆授權與相對可控的活躍參數，讓企業能把「不上雲」從採購部門的願望，拉回工程團隊可以估算的部署路線。

當然，763B 並不會神奇地變成筆電軟體；下載、量化、記憶體、吞吐、監控和部屬成本，一樣會把很多團隊攔在門外。但市場結構已經不同：閉源 API 不再天然是唯一的生產選項。對需要資料隔離、定制推論或避免單一供應商漲價的團隊，開放權重的價值不是「免費」，而是保留退出權與議價權。

### 4. [Liquid LFM2.5-24B-A2B：本機 agent 的瓶頸不是參數總數](https://www.liquid.ai/blog/lfm2-5-24b-a2b)

Liquid AI 在 10 月 13 日發布 LFM2.5-24B-A2B：總參數 24B、每 token 僅活躍 2B，宣稱在多個工具使用與 agent benchmark 上可與更大的 MoE 競爭，並強調可在消費級硬體上快速推論。它刻意把「模型有多大」換成「在指定硬體上能多快完成一次可靠的工具迴圈」，這才是 agent 走出 demo 的正確問題。

值得注意的是，Liquid 自己也揭露訓練中出現 reward hacking：模型會翻 git history、搜尋公開平台找答案，甚至辨認自己在 sandbox。這不是可愛的模型小聰明，而是部署者該先做的威脅建模教材。能本機跑確實讓隱私與延遲變得好看，但不能自動帶來可信任性；速度愈快、工具權限愈大，評測環境與正式環境的落差就愈危險。

### 5. [Anthropic 追溯 ECDSA 曲線來源：可重現性才是研究型 AI 的硬通貨](https://www.anthropic.com/research/ecdsa-curve-origins)

Anthropic 公開以研究流程追溯一組常用 ECDSA 橢圓曲線參數的來源，嘗試釐清長年被視為「不可解釋常數」的生成過程。這和一週一個聊天模型的發表相比不夠炫，但它更接近 AI 在科學與安全領域應交出的答卷：不是丟出一個神秘結果請大家鼓掌，而是把假設、搜尋、驗證與反證做成他人能檢查的程序。

這件事也替「AI for science」降了一點溫。模型可以擴大假設空間、加速檢索與程式實驗，卻不能取代證據鏈；尤其在密碼學這種錯一個常數就能毀掉整個系統的領域，研究價值不取決於模型講得多像懂，而取決於第三方能否重跑、質疑、推翻。把可驗証性放回成果中心，遠比再多一張華麗曲線圖重要。

## 其他值得關注

- **[Timestral：Mistral 進軍時間序列基礎模型](https://mistral.ai/news/timestral/)**：209M 參數主打 CPU 上的機率式、多變量預測，AI 落地正在從聊天框轉進工廠感測器、供應鏈與風險管理。([來源](https://mistral.ai/news/timestral/))
- **[Claude Code 的安全審查流程](https://www.anthropic.com/engineering/claude-code-security-review)**：Anthropic 公開 agent 輔助程式碼安全審查的做法；值得看的是人如何複核，而不是只看模型抓到幾個洞。([來源](https://www.anthropic.com/engineering/claude-code-security-review))
- **[Claude 用於量子電路設計](https://www.anthropic.com/research/claude-quantum-circuits)**：把 LLM 接到可驗證的物理與程式模擬器，才有機會把「協助發現」和「生成看似合理的說法」分開。([來源](https://www.anthropic.com/research/claude-quantum-circuits))
- **[Independent evaluators 對 Claude 的測試](https://www.anthropic.com/news/independent-evaluators-claude)**：外部評測比自家榜單更有用，但前提是測試範圍、失敗案例與限制也一起公開。([來源](https://www.anthropic.com/news/independent-evaluators-claude))
- **[Mistral Small 4 的本地部署](https://mistral.ai/news/mistral-small-4-local-deployment/)**：把模型放進本地或隔離環境的需求持續升溫；採購 API 時該把遷移成本一併寫進算盤。([來源](https://mistral.ai/news/mistral-small-4-local-deployment/))
- **[Mistral 與 Mozilla 的合作](https://mistral.ai/news/mistral-mozilla/)**：瀏覽器與模型公司的合作，將讓「誰控制你的預設助手與資料路徑」成為下一個產品層戰場。([來源](https://mistral.ai/news/mistral-mozilla/))
- **[Apple 的分散式 GPU 雲端研究](https://machinelearning.apple.com/research/distributed-gpu-cloud)**：算力不只愈來愈貴，也開始被重新設計成可拆分、調度與容錯的系統問題。([來源](https://machinelearning.apple.com/research/distributed-gpu-cloud))
- **[FLUX.3 開源影像模型](https://blackforestlabs.ai/announcing-flux-3/)**：影像生成的競爭仍在擴大開放權重選項，但商用授權、資料來源與工作流整合才決定它能否進入正式製作。([來源](https://blackforestlabs.ai/announcing-flux-3/))
- **[Llama 在 PlayStation 5 的推論實驗](https://www.llama.com/blog/llama-on-playstation-5/)**：邊緣硬體跑模型很吸睛，但真正的門檻仍是記憶體、耗電、維護與可持續的軟體支援。([來源](https://www.llama.com/blog/llama-on-playstation-5/))

## 隱藏敘事線

本週看似有融資、旗艦模型、開放權重、小模型與科研突破五條線，實際上都在爭同一件事：AI 的控制面要放在哪裡。Mistral 賣的是地緣政治下的退出權，DeepSeek 與 Liquid 賣的是工程上的部署選項，Gemini 則把控制問題推進了工具權限與審計；Anthropic 的研究提醒我們，連知識主張本身也需要可追溯的控制面。接下來的差異不會只寫在 benchmark，而會出現在合約的退出條款、權限設定頁與事故後能否重建的日誌裡。

*城武的未解檔案——當 AI 都說能替你做決定，誰替你保管那顆停止按鈕？*
