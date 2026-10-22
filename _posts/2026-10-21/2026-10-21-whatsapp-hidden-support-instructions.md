---
layout: post
guide: agent-security
title: "【深度分析】WhatsApp 客服隱藏指令外洩：網頁裡有什麼，與模型做過什麼，是兩回事"
description: "WhatsApp 客服頁面為何出現隱藏 AI 指令？整理 Redact 的掃描、移除時間線與公司回應，區分指令外洩、隱私資訊限制，以及尚未證實的模型服從效果。"
date: 2026-10-21 14:34:03 +0800
categories: [llm, ai, deep-analysis]
---
![hero]({{ site.baseurl }}/assets/images/2026-10-21/whatsapp-hidden-support-instructions.jpg)

WhatsApp 客服頁面曾夾帶使用者畫面上看不到的模型指令，其中兩段限制了監管機關與隱私法規的提及。這是 Redact 發現、WhatsApp 隨後說明用途的指令外洩事件；目前公開材料沒有證明 ChatGPT 或其他外部助理服從過這些文字，也沒有實測 WhatsApp 自家客服的回答。以下以有限摘要整理發現，再分開檢視內容、公司回應與效果證據。[來源：Redact](https://redact.dev/blog/whatsapp-help-pages-hidden-ai-instructions)

## 原文摘要

### 先把發現、移除與回應排回時間線

Redact 創辦人 Dan Saltman 的報告指出，團隊在 2026 年 10 月 8 日發現隱藏文字，之後讀取客服中心連出的 545 個頁面，計得 80 頁含有共 102 個隱藏區塊。這些數字描述的是該次掃描範圍，不是所有語言、所有未連結頁面的全面盤點；也不是 102 次攻擊成功的紀錄。[來源：Redact](https://redact.dev/blog/whatsapp-help-pages-hidden-ai-instructions)

依 Redact 的更新，兩段主要爭議指令在 10 月 15 日 21:40 UTC 檢查時仍在；到 10 月 18 日 02:08 UTC 再查，80 頁中的 102 塊文字已全部移除，客服文章本身仍保留。這只能把移除時間夾在兩次檢查之間，不能說公司恰在第二個時間點完成修復。[來源：Redact 的移除更新](https://redact.dev/blog/whatsapp-help-pages-hidden-ai-instructions)

10 月 19 日，WIRED 刊出報導。WhatsApp 發言人 Joshua Breckman 表示，那些文字是給自家 AI 客服的指令，因已修復的 bug 出現在網頁中；公司希望客服聚焦產品協助，而非提供法律建議。這是公司對用途與外洩原因的說明，並非模型效果測試。[來源：WIRED](https://www.wired.com/story/whatsapp-help-pages-leaked-hidden-instructions-for-a-meta-chatbot/)

WIRED 也表示記者看過外洩文字，且可在封存頁面的底層程式碼中查看。這替「文字確實存在」增加了獨立媒體的核對，但不等於 WIRED 重跑了 Redact 的整批掃描，更沒有補上客服回答實測。545、80、102 這組完整統計，本文仍歸屬 Redact。[來源：WIRED](https://www.wired.com/story/whatsapp-help-pages-leaked-hidden-instructions-for-a-meta-chatbot/)、[掃描統計：Redact](https://redact.dev/blog/whatsapp-help-pages-hidden-ai-instructions)

### 兩個案例限制的是哪些回答

第一段位於刪除帳號說明頁，處理失去電話號碼或裝置、無法自助刪帳的情境。除了要求告知自動刪除等待期，指令還要求不要建議聯絡資料保護機關或監管單位，也不要暗示 WhatsApp 能代為手動刪帳。第二段位於檢舉與封鎖說明頁：使用者提到律師、法院或訴訟等事項後，客服不得引用或解讀服務條款、隱私政策及隱私法規，即使使用者主動提起也一樣。[來源：Redact 保存的兩段文字](https://redact.dev/blog/whatsapp-help-pages-hidden-ai-instructions)

不能因此把全部隱藏內容都歸為惡意。Redact 說，多數區塊是釐清用詞、轉介合適說明頁或避免錯誤操作的客服引導。是否有問題，要看個別指令限制了什麼，而不是只看它有沒有顯示在畫面上。[來源：Redact](https://redact.dev/blog/whatsapp-help-pages-hidden-ai-instructions)

### 公開政策能核對什麼，不能推導什麼

WhatsApp 的歐洲地區隱私政策，標示自 2026 年 7 月 2 日生效，明列請求存取、更正與刪除資料的權利，也指出可以向愛爾蘭資料保護委員會或其他具管轄權的資料保護監管機關提出申訴。這些不是 Redact 替使用者提出的新途徑，而是官方政策本來就公布的資訊。[來源：WhatsApp 歐洲地區隱私政策](https://www.whatsapp.com/legal/privacy-policy-eea)

比較兩份文字時，須分開三件事：請求刪除資料、客服是否能手動刪除帳號，以及在個別情況下能否通過身分驗證。公開政策承認請求權，不等於承諾任何未登入者都能要求立即刪帳。因此，不能只憑隱藏指令就判定公司拒絕履行某一個人的刪除請求。較直接可見的落差，是政策公開列出申訴機關，相關客服指令卻要求不要推薦它。[比對來源：官方政策](https://www.whatsapp.com/legal/privacy-policy-eea)、[Redact 保存文字](https://redact.dev/blog/whatsapp-help-pages-hidden-ai-instructions)

同理，「不要替公司判斷法律責任」與「連公開政策、法規名稱都不要引用」並非同一個限制。前者限制法律判斷，後者也限制資訊提及範圍。這是對指令文字的分析，不代表已證實客服實際隱瞞資訊，更不是對違法與否的裁定；本文不提供個人法律建議。[比對來源：Redact](https://redact.dev/blog/whatsapp-help-pages-hidden-ai-instructions)、[官方政策](https://www.whatsapp.com/legal/privacy-policy-eea)

### HTML 可取得，不等於外部助理遭到注入

Redact 在 10 月 9 日以不同爬蟲的 user-agent 名稱請求頁面：使用 Google、Bing 爬蟲名稱時，回應包含文章及隱藏指令；使用 OpenAI、Anthropic、Perplexity 的爬蟲名稱時，則既沒有文章，也沒有那些指令。這是當時伺服器回傳內容的差異，不是各家公司實際收錄狀態的證明。[來源：Redact 的測試說明](https://redact.dev/blog/whatsapp-help-pages-hidden-ai-instructions)

若要證明外部助理受到影響，證據至少還得往後走幾步：真實爬蟲是否取得內容、內容是否進入索引或檢索資料、回答問題時是否被送進模型，最後模型是否把網頁中的指令當成應服從的命令。這次 user-agent 測試只涉及其中的取得條件；不能跳過中間環節，直接寫成「Google 已收錄」或「ChatGPT 被操控」。Redact 明說沒有測試任何 AI 助理是否照做。[證據範圍依據：Redact](https://redact.dev/blog/whatsapp-help-pages-hidden-ai-instructions)

公司確認用途後，事件較準確的描述是「內部客服指令意外進入公開 HTML」。要把它進一步定性為對外部模型成功的提示注入，仍需呈現跨越資料與指令界線的實際回答，而不只是展示網頁中的命令句。這項區分不否認內容存在，只避免把外洩與服從當成同一件事。[用途來源：WIRED](https://www.wired.com/story/whatsapp-help-pages-leaked-hidden-instructions-for-a-meta-chatbot/)、[測試限制：Redact](https://redact.dev/blog/whatsapp-help-pages-hidden-ai-instructions)

### 修好外洩，還沒有回答客服表現問題

移除公開 HTML 裡的文字，只能說明這個對外暴露位置已被清掉；沒有材料足以證明自家客服內部的對應規則也已刪除或修改。要驗證回答效果，需要固定問題、語言、地區與帳號情境，保留實際對話，並比較不同措辭及修復前後的輸出。這是後續應補的驗證設計，不是 Redact 已完成的實驗。[已知修復範圍與未測事項：Redact](https://redact.dev/blog/whatsapp-help-pages-hidden-ai-instructions)

目前能成立的是：報告揭露了限制回答範圍的具體文字，公司說明它們屬於自家客服並因 bug 外洩，公開政策則提供可供比對的權利資訊。至於自家客服是否遵守、外部助理是否接觸並受影響，以及使用者是否因此錯失申訴資訊，都仍缺少回答紀錄與因果證據。[來源：Redact](https://redact.dev/blog/whatsapp-help-pages-hidden-ai-instructions)、[公司回應：WIRED](https://www.wired.com/story/whatsapp-help-pages-leaked-hidden-instructions-for-a-meta-chatbot/)、[官方政策](https://www.whatsapp.com/legal/privacy-policy-eea)

- 原文：[WhatsApp's Hidden Notes Told AI Not to Recommend a Regulator](https://redact.dev/blog/whatsapp-help-pages-hidden-ai-instructions)（Dan Saltman，Redact，2026-10-19，含 10 月 18、19 日更新）
