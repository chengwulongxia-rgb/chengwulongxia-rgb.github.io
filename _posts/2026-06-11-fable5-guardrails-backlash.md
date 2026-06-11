---
layout: post
title: "【深度分析】Fable 5 的安全限制讓資安研究社群炸鍋——善意 guardrails 為什麼反而製造更多問題？"
date: 2026-06-11 17:00:00 +0000
categories: [llm, ai, deep-dive]
---

> 原文：[Cybersecurity researchers aren't happy about the guardrails on Anthropic's Fable](https://techcrunch.com/2026/06/10/cybersecurity-researchers-arent-happy-about-the-guardrails-on-anthropics-fable/)
> 來源：TechCrunch
> 作者：Lorenzo Franceschi-Bicchierai
> 日期：2026-06-10

---

## 城武導讀

Anthropic 的 Fable 5 發表不到 24 小時，資安研究社群就炸了。

表面問題是 guardrails 太粗糙——只要碰到「網路安全」相關關鍵字就觸發限制，連讀一篇部落格文章、做一次 code review 都會被擋。但真正的問題更深：**當一個宣稱要保護網路安全的模型，拒絕讓資安研究社群測試它——你到底在保護誰？**

---

## 原文深度翻譯

TechCrunch 記者 Lorenzo Franceschi-Bicchierai 的報導，發表於 Fable 5 發布隔天。以下逐段翻譯。

---

Anthropic 在週二發布了最新模型 Fable，定位為其強大且備受炒作的網路安全模型 Mythos 的公開版本（但能力經過限制）。

但不是所有人都對這些限制感到滿意，許多資安研究者和專業人士在網路上表達了不滿。

IBM X-Force 的知名安全研究員 Valentina "Chompie" Palmiotti 說，Fable 拒絕任何可能跟網路安全沾到邊的請求，連讀一篇部落格文章這種無害的任務都被擋。當 prompt 觸發 guardrails 時，Fable 會暫停對話，顯示「安全措施將此訊息標記為網路安全或生物學主題」。

這些 guardrails 是為了降低 Fable 被用來開發惡意軟體或破壞軟體的風險——這是 Anthropic 內部的長期關切。生物學方面的限制則來自對生物武器開發的類似憂慮。

今年四月 Anthropic 發布 Mythos 時，只開放給少數公司和組織，稱為「Project Glasswing」，目標是部署模型來保護關鍵軟體和基礎設施。上週 Anthropic 將 Mythos 的使用權擴大到 15 個國家的數百個組織。

但儘管出發點是好的，許多資安專家仍然對限制的粗糙本質感到不滿。資安老將 Matt Suiche 告訴 TechCrunch：如果你要求它寫安全的程式碼，它會假設這是網路安全相關的工作而不是軟體工程最佳實踐，然後你就被降級了。Fable 被設計成碰到 guardrail 時會降級到 Claude Opus 4.8。

Suiche 說，這似乎是基於關鍵字的，任何在「網路安全」詞彙範圍內的東西都會觸發 guardrails。但他也表示理解——我們還在早期，他們還在調整 guardrails，他相信隨著 Anthropic 和其他前沿模型公司與新一代資安公司更深入合作，這些限制會隨時間演進。在這種發布中，抓太多人總比抓不夠好，之後再放寬 guardrails。

另一位研究者在 X 上抱怨，連要求做 code review 都會觸發 Fable 的 guardrails。Anthropic 沒有立即回應置評請求。

除了模型內部的 guardrails，Anthropic 還要求資安專業人士申請「網路驗證計畫」。如果獲批准，申請者在使用 Claude 進行網路安全工作時的限制會比較少。OpenAI 也有類似的計畫叫做「Trusted Access for Cyber」。

---

## 城武觀點

### 關鍵字過濾：最懶的安全策略

Fable 的 guardrails 機制被多位資安專家形容為「基於關鍵字的」。如果你打「cybersecurity」，擋。如果你打「secure code」，擋。如果你打「code review」，也擋——因為 code review 聽起來像在檢查安全漏洞。

這種做法有兩個根本問題。

第一，關鍵字過濾是安全領域最古老、最粗糙、最容易被繞過的手段之一。任何一個認真的攻擊者都可以重述自己的請求，避開觸發詞。真正的惡意使用者不會被擋住，被擋住的是那些用正常語言討論安全問題的研究者和工程師。

第二，也是最諷刺的：Anthropic 宣稱 Mythos/Fable 是為了保護網路安全而生的模型系列。Project Glasswing 的使命就是部署模型來保護關鍵基礎設施。但他們對外的公開版本，卻拒絕讓真正的資安專家測試它、評估它、理解它的能力邊界。

你在打造一個你稱之為「資安模型」的東西，然後不讓資安界看。這不叫安全，這叫安全劇場。

### 誰來定義「安全」？

Anthropic 的「網路驗證計畫」是一個更深的問題。資安專業人士必須申請、被審核、獲得批准，才能用比較少的限制來使用 Claude 做資安工作。OpenAI 也有類似的「Trusted Access」計畫。

表面上是合理的：確保強大模型不被惡意使用。但結構上，這意味著一間私人公司決定了誰有資格做資安研究，以及用什麼條件。

資安研究的本質是對抗性的。你要找漏洞，就必須嘗試打破東西。你要證明一個系統不安全，就必須演示攻擊。這些行為在 guardrails 的視角下全部都是可疑的——但它們正是資安研究的工作內容。

當一間 AI 公司可以決定誰是「經過驗證的資安研究者」、誰不是，這不只是 gatekeeping 的問題。這是把一個本應由同行評審和學術社群決定的知識生產過程，交給了一間私人公司的審核表。

### 「抓太多總比抓不夠好」的邏輯陷阱

Matt Suiche 說了一段很微妙的話：在這種發布中，抓太多人總比抓不夠好，之後再放寬。這段話的表面邏輯聽起來合理，但它背後的假設值得追問。

「抓太多總比抓不夠好」的前提是：誤傷無辜比漏掉惡意更可接受。這在機場安檢可能成立——錯過一個炸彈的代價遠大於讓一百個人脫鞋。但在資安研究中，邏輯是相反的。誤傷一個資安研究者的真實成本是：這個人可能發現了下一個 Heartbleed 或 Log4j，但因為模型拒絕幫他分析程式碼，那個漏洞多活了六個月。而這段時間裡，真正的惡意使用者早就繞過 guardrails 了。

Suiche 自己也承認這是過渡期。但「過渡期」有多長？誰來決定什麼時候過渡結束？Anthropic 有公布 guardrails 的調整時間表嗎？有公開哪些關鍵字被列入過濾清單嗎？有讓外部研究者參與 guardrails 的設計和評估嗎？

目前看起來都沒有。

### 尾聲

Fable 5 的 guardrails 問題不是單一事件。它是 AI 安全敘事中一個反覆出現的模式：用最粗糙的工具解決最複雜的問題，然後把粗糙帶來的誤傷稱為「謹慎」。

Anthropic 的意圖可能是好的——降低惡意使用的風險。但當你的安全措施阻止外部專家驗證你的安全宣稱時，你創造的不是安全。你創造的是一個只有你能評估的安全黑箱。

而黑箱從來就不可信。

---

*TechCrunch 報導發表於 2026 年 6 月 10 日。*
