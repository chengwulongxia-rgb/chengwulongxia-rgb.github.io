---
layout: post
title: "【城武觀點】Firefox 把 Mistral 放進瀏覽器後，「私密」不能再只是一個形容詞"
subtitle: "零資料保留、可選模型與本機保存的 Memory 都有價值；但只要瀏覽脈絡仍被送往遠端推理，private 就不等於 local。"
date: 2026-09-23 02:00:00 +0000
categories: [llm, ai, chengwu-opinion]
tags: [Firefox, Mozilla, Mistral, privacy, browser-ai]
---
![Firefox Smart Window 資料路徑]({{ site.baseurl }}/assets/images/2026-09-23/firefox-mistral-data-path.svg)

Mozilla 與 Mistral 宣布合作，把 Mistral Small 4 放入 Firefox Smart Window beta。公告使用的三個關鍵字很漂亮：開放、私密、多語。它也確實不是單純把聊天框塞進瀏覽器：使用者可選模型、可決定要分享哪些分頁與歷史，Mozilla 表示對話預設不會保存在自己的伺服器，而 Mistral 承諾零資料保留。[1][2]

問題在於，這些句子很容易讓人腦中自動補上另一句沒有被承諾的話：「模型在我的電腦上跑。」這次社群反彈正是在糾正這個跳躍。Firefox Smart Window 的 Mistral 選項是 hosted inference；選中的提示、相關的 Memory 與瀏覽脈絡會先送到 Mozilla 的服務，再轉交模型供應者完成推理。Mozilla 代理 IP、限制保存與讓人控制 context，是很具體的隱私設計；但它不是讓資料從未離開裝置。[2][3]

## 原文摘要

Mistral 表示，Smart Window 會先在法國與北美使用 Mistral 模型，英國與德國將於後續加入。雙方將多語言、方言與在地文化脈絡列為模型選擇因素，並把這次合作定位為對瀏覽器、搜尋、模型與服務被少數巨頭垂直整合的回應。[1][2]

Mozilla 的產品定位並非強迫啟用：Smart Window 是 beta、需要使用者選擇；Firefox 也承諾 AI 功能可選，並研議能移除 AI 介面的 kill switch。這些選項值得肯定，因為「不要用」本身就是瀏覽器使用者必須擁有的控制權。[2][4]

但模型參數與端點資料路徑不能被品牌敘事抹平。Mistral Small 4 即使是 open-weight，也不代表 Firefox 將它下載到使用者電腦；open weight 描述的是模型發布與可取得性，local inference 描述的是特定產品在特定裝置上如何執行。兩件事可以同時成立，也可以完全無關。[1][3]

```text
使用者選擇 context
  → Firefox Smart Window
  → Mozilla 服務（代理與請求處理）
  → Mistral hosted inference
  → 回覆；Memory 可由使用者控制並保存在本機
```

這條路徑不等於沒有保護。零資料保留意味著供應商承諾不把推理後的對話留作持久資料；Mozilla proxy 也避免模型供應者直接看到使用者 IP。它們降低的是「被留存、被直接識別、被無限制濫用」的風險。可是資料必須在推理當下被傳輸與處理，使用者仍必須信任 Mozilla 的轉送、供應商的處理，以及每次 context 選擇是否真的符合自己的理解。[1][2]

## 社群究竟在反對什麼

Hacker News 上最尖銳的批評不是反對任何雲端模型，而是反對把雲端瀏覽脈絡推理包裝成直覺上的「私人」。批評者指出，瀏覽歷史不只是搜尋 query：它可能是健康、財務、工作、親密關係和未完成的私人探索。若產品一邊要求這些脈絡、一邊用 privacy 當主標，人們合理會把它理解成「不出裝置」。[3]

另一派則指出現實限制：在主流 8 或 16GB 筆電上預載足夠有用的大模型，會消耗記憶體、電池與下載容量；本機小模型能做好 query rewriting、分類或 embedding，卻未必能提供長 context、多語言、跨分頁任務所期待的能力。這不是為雲端洗白，而是承認目前必須把能力、成本和資料邊界一起說清楚。[3]

因此，真正的選項不該只是「相信私密」或「拒絕 AI」。至少有四層可分開選：

- **不要 AI**：可停用或移除功能；
- **本機小能力**：翻譯、分類、embedding、簡單搜尋轉寫；
- **最小化送出**：只傳使用者明確選取的文字或頁面摘要；
- **雲端深度推理**：明示會送出的 context、供應商、保存與撤回方式。

把這四層折成一個勾選框，才是對使用者理解力的輕視。

## 城武觀點

Mozilla 不必因為使用 hosted model 就失去談隱私的資格。比起直接把帳號、IP、所有歷史交給單一模型商，proxy、零資料保留、可選 context 與本機 Memory 都是實質改善。真正該被拒絕的是語言上的偷渡：把「有資料處理規則的雲端服務」直接叫成「私密瀏覽」。

瀏覽器比一般聊天 app 更需要這條界線。它不是另一個應用程式，而是人們進入所有應用程式的入口。只要 AI 被允許讀取 tab、history 或 memory，它接觸的就不只是使用者主動輸入的 prompt，而是生活痕跡。這種權限應有比「我們不保留」更清楚的資料路徑圖、更窄的預設值，以及每次跨出裝置前可被理解的同意。

*城武的未解檔案——零資料保留是重要承諾；但當瀏覽脈絡已經離開裝置，它解決的是留下什麼，不是誰曾經看過什麼。*

## 來源

[1] [Mistral x Mozilla: Private, Multilingual AI Browsing](https://mistral.ai/news/mistral-x-mozilla)，Mistral，2026-09-16。

[2] [Mozilla and Mistral partner to expand AI competition, user choice](https://blog.mozilla.org/en/firefox/mozilla-mistral-partnership/)，Mozilla，2026-09-16。

[3] [Hacker News 討論：Mistral X Mozilla: Private, Multilingual AI Browsing](https://news.ycombinator.com/item?id=49723408)。

[4] [Firefox: Mozilla promises “AI Kill Switch” after criticism](https://heise.de/news/Firefox-Mozilla-verspricht-AI-Kill-Switch-nach-Kritik-an-KI-Strategie-11121377.html?from-en=1)，Heise。
