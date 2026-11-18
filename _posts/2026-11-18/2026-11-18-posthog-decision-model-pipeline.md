---
layout: post
title: "【深度分析】PostHog 如何少叫 LLM？從兩個判斷題拆解決策模型的生產管線"
description: "從 PostHog 固定版本的 PR 與原碼，追蹤 Replay Vision 如何抽取摘要文字、套用 PII 0.4 閘門及 Gemini 重寫，並拆開 unknown、重寫失敗與 Error Tracking shadow 分支。作者公布的效果數據與本站靜態核對分開呈現。"
date: 2026-11-18 12:13:03 +0800
categories: [llm, ai, deep-analysis]
image: /assets/images/2026-11-18/posthog-decision-model-pipeline.jpg
---
![hero]({{ site.baseurl }}/assets/images/2026-11-18/posthog-decision-model-pipeline.jpg)

決策模型接進產品後，值得看的不只是分數，而是分數、缺答與例外各自通往哪裡。本文以 PostHog 的兩份歷史 PR 還原控制流程；這是靜態原碼分析，沒有呼叫模型，也沒有重跑生產評測。[2][3][5]

## 原文摘要

Jina Yoon 在 2026 年 11 月 10 日介紹 PostHog 的決策模型應用，自述 Replay Vision 生產摘要有 98.7% 跳過額外的個資重寫 LLM 呼叫。摘要原先已由 AI scanner 產生，這不是整條服務不用 LLM，也不是整體省費比例或零漏判的證明。[1][3]

## PII 閘門收到的是摘要文字，不是整段錄影

先看 10 月 20 日合併的 PR #120387。以下核對該 PR 合併版本的 `pii_check.py`，不把它當成 11 月 18 日所有部署的現況。入口 `keep_unrequested_pii_out` 接收 scanner 的結構化輸出、原掃描問題及 session 的 `identity_values`；`answer_text` 只取非空的 `title`、`summary`、`reasoning`、`notability_reason`。因此這個節點檢查的是已生成的描述，不直接遍歷全部原始錄影。[2][3]

接著先問另一道題：原掃描問題是否要求辨識這段 session 屬於誰？`asks_for_identity` 把原問題放進 state，分數達 0.5 才算要求身分。如果成立，程式在「待檢副本」中把 session 自己的身分值替換成 `the user`，再檢查剩餘文字；原輸出沒有因此被抹除。這讓被要求的身分可以留下，卻不把旁邊其他人的電話也一併放行。它的目標是移除「問題沒要求的個資」，不是全面匿名化。[3]

測試檔把這個差別寫成具體對照：`(t 12) jane@example.com paid.` 在身分題回 false 時，預期會改成不含 email 的敘述；回 true 時則保留。若同一句還帶了另一個電話，仍預期觸發重寫。這些是測試替身預先設定的分支結果，不是本站拿這幾句測出模型的辨識能力。[4]

剩下的文字送進同一個 decision request，內含 `name`、`contact` 兩道獨立的是非題。固定程式指定的是 PostHog gateway 的 `posthog/hogference/jeeves-0.1`，不能因檔內仍有 Jev 舊名稱，就寫成實際呼叫 TypeSafe 的某個閉源 Jev 版本。[3]

這兩題的 `criteria` 才是政策邊界：姓名題把真人的名字、全名、姓氏算 true，泛稱使用者、公司、產品、AI persona、測試紀錄則算 false。聯絡資料題要求出現實際的個人 email、電話、街址、IP、帳號或識別值；只說「使用者輸入了 email」而沒列出值，以及公司信箱、商用電話、裸網域，都被指定為 false。模型不是自行發現所有產品規則，而是在判斷這份明寫的契約。[3]

資料流因此分成兩種 state：第一次只送原問題，決定是否允許身分；第二次送文字欄位，判斷剩餘內容。`identity_values` 本身沒有被直接附在個資判斷題旁，而是用來先改寫待檢副本。這也解釋了為什麼這份實作不把所有要求合成一句「有沒有不該出現的個資」：那會讓模型同時猜問題的目的、對照身分和辨認個資；目前程式把前兩者的銜接交回確定性的替換步驟。[3]

## 0.4 是兩題取最大值；缺一題不是陰性

`_highest_yes_probability` 收集各題的 `probability`，只有全部題目都有分數才回傳最大值；`contains_pii` 再以 `>= 0.4` 轉成布林值。因此只要姓名或聯絡資料任一題過線，就進重寫。不是兩題都要成立，也不是把兩題機率相加。公開測試用 mock 分別供應「只有姓名高分」「只有聯絡資料高分」，並確認兩題都是 0.39 時不觸發。[3][4]

但回傳型別其實是 `bool | None`。供應商不可用、呼叫拋錯或缺少任一題分數，會得到 `None`，意義是沒有判定，而不是沒有個資。原碼第 228–230 行直接保留這條路徑：[3]

```python
if asks is None:
    record_pii_check("unavailable", scanner_type)
    return output
```

即使身分題成功，後面的個資題仍可能無答案。這時 `flagged` 是 `None`，同樣會進入 `if not flagged`，記錄 `unavailable` 後回傳原輸出；真正的 `False` 才記錄 `clean`。也就是說，此歷史版本在偵測不可用時採 fail-open：保留服務輸出，並不是「檢查失敗一律送 Gemini」。這是該版本可直接讀出的分支，不是對目前整個 PostHog 的漏洞定性。[3]

![Replay Vision 個資檢查的資料流與 unknown 分支]({{ site.baseurl }}/assets/images/2026-11-18/posthog-decision-model-flow.svg)

## 已經判為有個資，才進一次重寫

`flagged=True` 才呼叫 `rewrite_without_pii`，以 `gemini-3.8-flash` 重寫文字欄位。送去的是原掃描問題與原文字，不是剛才把允許身分遮掉的副本；提示要求去除未被要求的個資、保留其他主張及時間標記。回應用 `_Rewrite` schema 解析，再更新原輸出；重寫沒提供的欄位會保留舊值，之後還要重查。[3]

這裡至少有三種不同結果，不能合稱「失敗就放行」。一般重寫錯誤會轉成 `ScannerFailureError(PII_DETECTED)`；gateway refusal 則原樣拋出，交由 activity boundary 決定後續。成功重寫後若仍被判有個資，也會使 observation 失敗。反過來，重查若回 `None`，`if still_flagged` 不成立，程式仍會記錄 `rewritten` 並回傳改寫結果。初檢未知、重寫失敗、重查未知，各有不同路徑。[3][4]

這也限定了可觀測數字的解讀：`clean`、`unavailable`、`rewritten`、`failed` 是流程結果標籤，不全是模型品質標籤。尤其 `rewritten` 不必然代表重查取得陰性答案。另外，decision request 的 `privacy_mode=True` 註解只說錄影衍生文字不進內部 AI observability 專案，不能延伸為整條管線的所有資料都不留存。[3]

## 對照 Error Tracking：unknown 也可以是不合併

10 月 14 日合併的 PR #117014 提供另一種編排。Error Tracking 先用 embedding distance 找鄰居，低於自動合併門檻就沿用距離規則；只有進入門檻與 cap 之間的 judge band，才讓 Jeeves 讀兩份錯誤文件，判斷是否代表同一個 issue。state 是錯誤種類、訊息與 stack trace，不是 PII 流程的摘要欄位，判準也換成是否應由同一修正解決。[5][6][7]

threshold、cap、cutoff、timeout 與 shadow 都可由每個 team 的 feature flag payload 調整。judge 啟用後預設 shadow，只記錄分數、距離、`would_merge`、延遲及錯誤，不因 judge 的判斷真的合併；原本低距離的合併仍可能發生。judge timeout、拒答、缺文件或缺少 AI 處理同意時，這條 judge 路徑不合併，而不是讓整個 activity 失敗。[6][7]

相同的「模型無法判斷」，在 PII 初檢是回傳原答，在 judge band 則是不靠 judge 合併；預設動作屬於產品程式，不是機率欄位自帶的語意。該 PR 當時明列功能仍在 feature flag 後、未開放使用者，不能把這份設計當成已全面部署的成效報告。[3][5][7]

## 閾值要看錯誤成本，也要看證據怎樣產生

PII PR 的離線比較值得讀，但不能簡化成「換架構就成功」：同一批生產樣本上，作者報告 recall 從 JevK5、0.8 門檻的 29%，變成 Jeeves、0.4 門檻的 97%；45 個已標記負例中的誤觸發從 20 個降到 1 個。這次同時換模型、降門檻、拆題、加入與標記者一致的邊界規則，不是單一變因比較。[2]

標記也不是人工真值：PR 說 121 個正例由 LLM 子代理盲標，標記者只看問題和文字，沒看模型分數。另有 246 個未標註隨機答案出現 1 次 flag，因為沒有真值，不能當成 false-positive rate，更不能拿去和 newsletter 的 98.7% 拼同一個分母。[2]

若要驗收這個節點，測試也得分層：mock 可以固定供應分數，核對 0.4 的邊界、缺答與例外是否走對路；真實資料評測才回答哪些個資漏掉、哪些商用資訊被誤刪。重寫本身又有另一組條件：去識別之後，事件敘述、verdict 與時間定位是否仍保留。提示要求「其他內容不變」只代表任務約束，不是已量測的忠實度保證；目前公開的離線表格沒有給出這一項品質結果。[2][3][4]

現有公開測試主要落在控制流程這一層。gateway 被 mock，測試鎖住兩題 OR、門檻、呼叫失敗回 unknown，以及部分放行與重寫例外；它們不證明模型真的抓到客戶資料中的姓名。PII PR 明說沒有在本機跑測試、由 CI 執行；本文只讀測試條件，沒有另行核對該次 CI 結果，也沒有實跑這些測試。[2][4]

從控制流程看，PII 門檻降低會讓更多答案進重寫，但漏判、誤判及 unknown 的成本仍須分開量測；Error Tracking 更不能照搬 0.4。TypeSafe 官方文件也明確區分：校準是在一群預測上度量，不保證單一答案正確。若模型、資料分布或判準改變，就需要重新檢查，而不是把分數當成跨任務通用的可靠度。官方 models 文件因此建議，已調好閾值時指定版本，不直接跟著會移動的 alias。[3][8][9]

本站先前的[文字分類與 Jev 分析]({{ site.baseurl }}{% post_url 2026-10-17/2026-10-17-jev-text-classification %})處理分類介面及 IMDb 評測背景；這次固定 PR 多揭開的是接線層：哪些文字進 state、哪些情況被列為 true、分數如何變成動作，以及拿不到答案時回傳什麼。這些分支需要和模型效果一起驗收，單一召回率或跳過呼叫比例並不能涵蓋它們。[2][3][7]

## Sources

[1] [Jina Yoon：Not everything needs an LLM](https://newsletter.posthog.com/p/decision-models)
[2] [PII 遷移 PR #120387 與離線比較](https://api.github.com/repos/PostHog/posthog/pulls/120387)
[3] [固定合併版本：PII 檢查原碼](https://raw.githubusercontent.com/PostHog/posthog/4ecd3aa34d46d17be87529ed8988f567d77e1bcd/products/replay_vision/backend/temporal/pii_check.py)
[4] [固定合併版本：PII mock 測試](https://raw.githubusercontent.com/PostHog/posthog/4ecd3aa34d46d17be87529ed8988f567d77e1bcd/products/replay_vision/backend/tests/test_pii_check.py)
[5] [Error Tracking judge PR #117014](https://api.github.com/repos/PostHog/posthog/pulls/117014)
[6] [固定合併版本：judge 與設定](https://raw.githubusercontent.com/PostHog/posthog/bd1a99afc1e2273072c998a332159417c09d1359/products/error_tracking/backend/temporal/fingerprint_embedding_result/judge.py)
[7] [固定合併版本：合併 activity 控制流程](https://raw.githubusercontent.com/PostHog/posthog/bd1a99afc1e2273072c998a332159417c09d1359/products/error_tracking/backend/temporal/fingerprint_embedding_result/activities.py)
[8] [TypeSafe：System One 與校準定義](https://docs.typesafe.ai/concepts/system-one)
[9] [TypeSafe：模型版本與 alias](https://docs.typesafe.ai/models)

- 原文：[Not everything needs an LLM](https://newsletter.posthog.com/p/decision-models)（Jina Yoon，build mode，發布：2026-11-10；本文查閱：2026-11-18）
