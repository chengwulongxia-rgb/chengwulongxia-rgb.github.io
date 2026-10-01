---
layout: post
title: "【深度分析】OpenAI Decisions API 與 Jev：選得快之前，先問選項漏了什麼"
date: 2026-10-01 05:45:00 +0000
categories: [llm, ai, deep-analysis]
---
![hero]({{ site.baseurl }}/assets/images/2026-10-01/decisions-api-jev-comparison.jpg)

讓 agent 決定下一步，不一定要請一個大型模型寫一段解釋。OpenAI 在 DevDay 宣布 Decisions API：給定脈絡、問題和有限的預設答案，讓 Luna 選出結果。這個介面與 Jev 處理的問題相近；真正值得比的，除了答對幾題和花了幾毫秒，還有兩者的證據成熟度，以及「沒有正確選項」時誰負責停下來。

## 原文摘要

### 公告說了什麼，還沒說什麼

[OpenAI 的 DevDay 2026 總覽](https://openai.com/index/devday-2026-recap)把 Decisions API 放在開發者工具一節。官方用語是把 Luna 的能力聚焦在使用者定義的特定問題與有限、預先定義的答案上。開發者可提供文字或圖片脈絡，取得用來分類內容、路由請求或選擇 agent 下一個動作的答案。公告寫的是當天開放限量預覽，並計畫在接下來幾天廣泛推出；「計畫」不是已經全面可用。公告沒有列出價格、公開的請求／回應 schema、延遲分布、錯誤率或校準方法。這不是宣稱那些功能不存在，而是這份可公開查閱的公告還不足以讓人照著寫一份可靠的整合教學。

有限答案的意思，是呼叫端先界定可以回什麼，不是讓模型自由寫一篇回覆。例如把一封客服信送到「帳務／技術／人工覆核」，再由程式根據所選類別接下一步；這是本文依公告能力構造的說明情境，**不是官方 API 範例或已確認的參數格式**。如果候選中沒有人工覆核，問題再含糊也得由使用者的流程另行處理；公告並未交代 API 是否內建拒答、棄權或信心閾值。圖片輸入則是官方已明說的能力，但它如何編碼與計價仍不能從這段公告推定。

### Every 的早期實測：兩道題，兩種速度結論

[Every 的 DevDay 親測](https://every.to/vibe-check/vibe-check-openai-devday-2026)提供比官方公告更具體、也更有限的觀察。資深編輯 Jack Cheng 把電腦操作任務改成純文字重播，要求模型在每個步驟選正確控制項；78 個計分步驟中，Decisions 選對 76 步、Jev 選對 73 步。文中說兩者的典型回應時間約為 230 毫秒與 500 毫秒。注意「純文字重播」：這組數字沒有測 Decisions 看圖片時的表現，也不是完整的真實電腦操作成功率。

同一篇文章引述 Cora 總經理 Kieran Klaassen 做的另一組對話串分類：兩者準確度幾乎相同，但 Jev 中位回應時間為 161 毫秒，Decisions 為 309 毫秒。前一組 Decisions 快，後一組 Jev 快；任務、輸入與計時統計口徑並未在那段報導裡充分展開，不能把兩個毫秒值湊成一張跨任務排行榜。Every 還指出 Decisions 能接圖片，而 Jev 沒有對應的圖片輸入；但這不表示圖片任務已經有同條件的競品對照。Every 寫稿時價格尚未公布，並把廣泛推出描述為預期，而非已實現。

### 跟 Jev 比，哪些是同類，哪些不是

[Jev 的供應商 TypeSafe AI](https://typesafe.ai/blog/introducing-system-one-models-and-jev)把它定位為快速回傳結構化決策的模型，稱自己採用新的架構、平行採樣器與 Reinforcement Learning for Calibrated Decisions（RLCD）；細節仍是廠商陳述，不能據此推斷 OpenAI 的 Luna 用了相同技術。Jev 已有公開使用介面的描述：Choice 可在有限選項間選擇，Noul 回答是非問題，Score 用事先定義的等級評分。[Raschka 的 Jev 實測與技術史整理](https://magazine.sebastianraschka.com/p/classifier-history-and-jev)還區分 API 示範數值與經過驗證的機率校準；`confidence` 不能隨手當成「這次一定答對」的機率。

功能形態確有重疊：兩者都把自由生成縮成可供程式使用的有限判斷；Every 也直接拿兩者跑同類小測試。差異在於，官方已明示 Decisions 接受文字和圖片，而前述 Jev 介面重點是文字情境下的多種決策形式；Jev 的公開介面與第三方測試資料較多，Decisions 目前仍以限量預覽和簡短公告為主。這**不是**「Jev 全面比較慢」或「Decisions 已證明比較準」。Raschka 另曾用 Jev 跑 IMDb 影評分類，那是另一套資料、指標與執行環境，不能拿 IMDb 成績直接對接 Every 的 78 步控制項測試。

### 接到 agent 上時，測試單位得換

若把選項定為「點擊確認／返回上一頁」，選錯一次可能只是多按一下；換成「退款／拒絕退款」或「執行／刪除」，同樣的分類錯誤會進到完全不同的風險層級。前述 Every 測試計的是單步選擇，不是長流程裡錯誤是否會累積、是否可撤銷，也沒有測答案集合漏掉正解時的行為。比較時應另準備含糊、超出範圍與惡意輸入，在相同任務資料上記錄每一類錯誤與尾端延遲；將「交人工／不執行」做成可用選項或外部守衛，而不是期待模型自動發明第三條路。這些是依有限選項介面提出的工程驗證建議，不是對任一產品已測得的功能聲稱。

## 城武觀點

我看好這類決策模型進入低風險、可回退的路由層；但不贊成把「在候選裡選對」直接升格成「有權執行下一步」。Decisions 的公告和 Every 的測試都以**已有正確答案的有限集合**為前提。最危險的輸入可能不是模型選錯，而是設計者一開始就沒列出「不處理」：模型只能在兩個壞選項之間挑一個，程式卻把回值當成授權。這裡的權力不對稱不只在模型供應商，也在設計答案集合的人；最後承擔錯誤的使用者通常看不到那份清單。

反面說法也成立：答案本來就由開發者定義，完全可以加入人工覆核，沒必要怪 API。正因如此，評估不該停在 76／78 或 230 毫秒。我會先要求產品團隊公開「都不適用」的測試比例、停機規則與錯誤後果，再決定是否讓它按下那個按鈕。若後續公開測試能證明在答案缺漏與分布變動時仍能可靠地停下，我願意改判。

*城武的未解檔案——選項是人寫的，責任不能交給回傳的那一格。*

- 原文：[Vibe Check: OpenAI DevDay 2026](https://every.to/vibe-check/vibe-check-openai-devday-2026)（Dan Shipper, Every, 2026-09-29）；[DevDay 2026 Recap](https://openai.com/index/devday-2026-recap)（OpenAI, 2026-09-29）；[Language Models for Text Classification: From Bag-of-Words to Jev](https://magazine.sebastianraschka.com/p/classifier-history-and-jev)（Sebastian Raschka, Ahead of AI, 2026-09-29）
