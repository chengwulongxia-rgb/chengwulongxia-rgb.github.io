---
layout: post
title: "【深度分析】Kodelyth ECC的55%節省從哪來？拆開RTK量測、Terse估算與71個角色"
description: "從固定版本原碼追蹤 Kodelyth ECC 的 token 帳：RTK 過濾 shell 回傳、Terse 已存檔壓縮與回覆長度估算，分母各不相同。本文釐清 71 個角色如何交給宿主執行，並列出從局部縮減推到整體費用與品質仍缺的證據。"
date: 2026-11-12 20:53:34 +0800
categories: [llm, ai, deep-analysis]
image: /assets/images/2026-11-12/kodelyth-ecc-token-accounting.jpg
---
![hero]({{ site.baseurl }}/assets/images/2026-11-12/kodelyth-ecc-token-accounting.jpg)

Kodelyth ECC 把 RTK 輸入過濾與 Terse 輸出精簡合稱為編碼 session 的 token 節省，首頁列出 55–65%。問題在於：shell 回傳縮短、Markdown 檔案變小，以及假設「沒精簡時會寫多長」，並不是同一種量測。本文只做固定原碼的靜態核對，沒有安裝、執行 ECC 或跑模型，不將機制分析當成省費或品質實測。[1][3][4]

## 原文摘要

截至 2026 年 11 月 12 日查閱，首頁顯示 v2.31.5，主打 71 個專家角色、196 個技能、104 個 slash commands，以及 MCP、記憶與多代理調度；RTK、Terse 文件則標示 11 月 8 日更新、v2.29.0。首頁將兩者描述為可疊加的省 token 機制，但月費試算也明載是依工作負載而變的估計，不是保證。[1][2][3]

以下分析以當日取得的 ECC 固定 commit 為準，各原碼來源均附版本鎖定連結；文件更新日、查閱日和原碼快照不是同一件事。

### Terse ledger：actual 也不是 API usage

先看 `scripts/terse/ledger.js` 的核心資料流。以下節錄估算函式、倍率表與記帳計算，略去中間的函式宣告及寫檔部分，並非一段獨立執行程式：[4]

```javascript
function estimateTokens(text) {
  if (!text) return 0;
  return Math.round(Buffer.byteLength(text, 'utf8') / 4);
}
const RAW_MULT = { lite: 1.33, full: 2.0, ultra: 2.85, off: 1.0 };
const actual      = estimateTokens(actualText);
const rawEstimate = Math.round(actual * (RAW_MULT[level] || 1));
const saved       = Math.max(0, rawEstimate - actual);
```

第一步不是讀取模型供應商的 `output_tokens`，而是把傳入字串的 UTF-8 位元組數除以四、四捨五入。第二步把這個估值命名為 `actual`；名稱中的「實際」，指向拿到的回覆文字，不代表經 tokenizer 或帳單核實的 token。第三步依模式乘上固定倍率，構造未啟用 Terse 的假想長度；最後兩者相減，寫成 `saved`。[4]

用數字代入較清楚：假設回覆是 400 UTF-8 bytes，`actual` 估為 100；選 `full`，倍率 2 便得到 `rawEstimate = 200`、`saved = 100`，相對假想原文是 50%。這是本文依公式計算的示例，不是讓模型分別生成兩次後量到的差異。同一倍率下，比例主要由設定決定，而非觀察兩份答案得來。[4]

這裡有兩層不同的不確定性。第一層是字串到 token 的換算：它沒有依模型、語言或程式碼內容選用 tokenizer。第二層是反事實基線：就算將來把 `actual` 換成供應商真實用量，只要 `rawEstimate` 仍由倍率推出，「未精簡答案會多長」依然沒有被觀察。改善前一層的計數精度，不會自動補上後一層的對照證據。[4]

原碼本身把這點寫得很清楚：每列都有 `estimated: true` 和 `baseline`，註解直接說倍率是假設、不是量測。文件也承認當時自動逐回合記帳尚未接上主路徑，必須明確記錄才會填入 ledger。因此它可以承載已記錄回合的估算，不能只因存在這個檔案，就視為完整 session 的使用量監測。這份 ledger 宣告的用途是估算，不是未精簡答案的對照量測。[3][4]

### 同叫 Terse，生成時精簡與事後壓檔分兩條路

`/terse` 是讓宿主模型改變回答方式的 prompt：`lite` 少些贅詞，`full` 用短句，`ultra` 更常用符號。文件要求保留程式碼、命令及技術資訊；在這條路徑上，那是交給模型遵循的要求，不是先取得長答案、再由可驗證的 formatter 逐位元組保護後壓縮。[3]

另一條 `terse compress` 才是處理已存 Markdown 的規則式壓縮器。原碼先把符合模式的三反引號區塊、檔頭 YAML frontmatter、單反引號行內碼、Markdown 連結目標、HTTP(S) URL 與特定格式的檔案路徑換成佔位符，再替換英文連接詞、刪除填充語及整理空白，最後還原保護區段。[5]

這能核對的是保護與替換機制，不是所有格式都被辨識：例如 fenced code 的比對寫的是三反引號，路徑也有自己的字元規則。將它描述成「所有命令、所有文字都保證無損」超過這段實作能支持的範圍；英文措辭替換也不能直接推成中文或所有任務語義不變。[5]

它回報的 `originalBytes`、`newBytes` 有真正的前後字串可比較，`estimatedTokensSaved` 仍是節省 bytes 除以四。即使檔案確實縮短，也不會退回生成原檔已花掉的費用；若壓縮的是之後反覆載入的規則或記憶檔，影響的是未來輸入。把這種成果與「本回合少生成多少輸出」合計前，必須先分開時間點與重讀次數。[5]

### RTK 的 64.1%，分母是受過濾的 shell 輸出

RTK 是另一個團隊維護的 Apache-2.0 Rust 工具，ECC 的 MIT wrapper 負責安裝、串接與讀取統計，不是 ECC 自製的 Rust 引擎。文件描述 hook 將 `git status` 改成 `rtk git status`，由 RTK 執行命令、依命令種類過濾結果後交回模型；wrapper 的統計入口則讀取 `rtk gain`。[2][6]

廠商公開的是某位維護者機器上的 1,285 筆命令樣例，縮減約 64.1%，文件亦標明不是保證。這裡的 input 是「命令輸出即將送給模型」的那一段，不包括所有系統提示、使用者要求、歷史、程式碼與其他工具回傳，更不是完整 API 請求縮短 64.1%。[2]

同一段文字跨過工具與模型邊界，名稱容易換位：對 shell 而言它是 output，送進模型則成為 input；RTK 統計的 `total_output` 是過濾後結果，不是模型生成答案的輸出量。若把這兩種 output 混在一起，就會連帶混淆 Terse 應作用的那一側。[2]

當日取得的 RTK 上游固定快照提供另一層辨識：`track(input, output)` 對過濾前後文字各呼叫 `estimate_tokens`；其實作是 UTF-8 byte 長度除以四、向上取整。因此，真實命令過濾前後的紀錄，仍不等於供應商 tokenizer 或計費 token。這個上游快照並未證明維護者公開樣例當時使用的 binary 版本，不能倒推樣例每筆數字的算法；它支持的是該版本的計數機制。[11][12]

### 從局部縮減推到全 session，缺的是權重

根據以上作用範圍，可以寫出一個有限的算式。令 `I_total` 是基準 session 的全部輸入，`I_shell` 是其中可被 RTK 過濾的 shell 回傳，`O` 是輸出，`r_in`、`r_out` 分別是這兩部分的縮減率。在其他輸入、任務工作量及輪次固定時，整體縮減比例為：

```text
(r_in × I_shell + r_out × O) / (I_total + O)
```

這是依機制推導的會計示意，不是 ECC 公布的 session 實測公式。它也說明為什麼不能把 64.1% 與 50% 相加，或直接對全部輸入套用 64.1%：前者處理 shell 子集合，後者還可能是倍率假設。[2][4]

例如自製情境中，基準輸入 8,000、其中 shell 回傳 2,000，輸出另有 2,000；即使暫且接受 shell 減 64.1%、輸出減 50%，整體也只減 22.82%。這不是反證 55–65% 不可能，而是指出同樣兩個局部比例，會隨輸入組成得到不同總數。真實工作流若增加重讀、重試、角色交接或額外提示，連「其他項固定」也不成立，必須直接看整體 usage。

費用還要再分輸入、輸出及 cached input 的計價，token 總量比例不能直接當成美元比例；月訂閱更不能由少用若干 token 就推成每月付款同比下降。首頁的月費試算應讀作假設情境，而非這份 ledger 已核實的帳單成果。[1]

### 71 個角色如何變成工作，不是 71 個常駐模型

固定版本的目錄盤點對得上 71 個 agent Markdown、196 個 `SKILL.md`、104 個 command Markdown；但這些數量的單位是定義檔。`catalog.js` 從對應目錄讀檔、解析 frontmatter，再提供名稱、描述與正文。以 `code-reviewer` 為例，內容包含 `model: sonnet`、工具清單、檢查流程與輸出要求，是交給宿主採用的角色規格，不是另一套已訓練的模型服務。[1][8][9]

在這份 `tools.js` 中，`get_agent`、`get_skill` 的 handler 取出正文後包成 MCP 的文字 `content` 回傳，沒有在這兩個 handler 裡自動啟動 LLM worker。MCP 讓角色材料能被其他客戶端取得，是否委派、啟動哪個模型、如何並行，仍取決於宿主及執行器，不能把 71 個定義寫成 MCP server 內建 71 個常駐工作程序。[7][8]

沿著一次取得角色的路徑看，呼叫者提供角色名，catalog 找到定義，handler 回傳名稱、描述及正文，之後才由客戶端使用。角色檔寫了工具及模型偏好，不表示這個文字回傳接口已替客戶端配置相同權限或模型。跨 IDE 使用時，需要辨認哪些設定由原生 agent 格式處理，哪些只是 prompt 內容；光把定義取回，尚未完成執行環境的對接。[7][8][9]

首頁的「本機運行、zero telemetry」也應放在同一層理解：ECC 提供本機工具與記憶，不代表原宿主的模型推論因此改成本機離線。角色材料放在哪裡、模型在哪裡執行、用量向誰計算，是三個分開的問題。本次沒有改動任何宿主安裝或設定，也不據此認證整體資料流。[1]

Super Agent 的原碼也區分控制與執行：`nextAction` 按狀態回傳分解、派工、整合或驗證動作；執行階段先用每步預設 4,000 token 的粗估詢問預算，超出便回傳 `halt`，實際花費則由 driver 回報 `tokensSpent` 累計。這說明狀態轉移可以不用 LLM 決定，但執行任務仍需 driver；「tokenless」不能解讀為整個多代理工作不花模型 token，也不能由此推定帳單已受到獨立硬限制。[10]

### 這次核對能回答與尚不能回答的事

靜態原碼能釐清三個不同的基線：RTK 比較命令過濾前後，檔案壓縮器比較同一 Markdown 前後 bytes，Terse runtime ledger 則以回覆長度乘倍率建立反事實基線。它們各有可用之處，但尚不能互換成「同一任務、相同品質、完整 session 節省 55%」的實證。[2][4][5]

要跨過這一步，還需要固定模型與宿主、相同任務及驗收條件，保存所有回合的供應商 usage、快取與重試紀錄，並比較成果品質及完成成本。品質比較也要對應各條路徑：RTK 應看被刪去的內容是否導致後續補查或誤判；回覆精簡應看必要前提、操作步驟與限制是否仍完整；規則檔壓縮則要核對修改前後的指令含義，而不只檢查程式碼有沒有改字。這些是建立對照時需要保存的證據，不是本文已跑過的測試。

本次沒有取得維護者完整逐筆 ledger、對照工作流、帳單或品質結果，也沒有做小樣本跑分；因此交付範圍止於計量口徑與執行邊界的核對。

## Sources

[1] [Kodelyth ECC 首頁（查閱日版本）](https://ecc.kodelyth.com)
[2] [RTK 整合文件（v2.29.0）](https://ecc.kodelyth.com/docs/rtk)
[3] [Terse Mode 文件（v2.29.0）](https://ecc.kodelyth.com/docs/terse-mode)
[4] [ECC：Terse ledger 原碼（固定版本）](https://raw.githubusercontent.com/sifxprime/kodelyth-ecc/8ec283a7d422e9db51eeb976118f2b08bad82710/scripts/terse/ledger.js)
[5] [ECC：Markdown 壓縮器原碼（固定版本）](https://raw.githubusercontent.com/sifxprime/kodelyth-ecc/8ec283a7d422e9db51eeb976118f2b08bad82710/scripts/terse/compress.js)
[6] [ECC：RTK wrapper 原碼（固定版本）](https://raw.githubusercontent.com/sifxprime/kodelyth-ecc/8ec283a7d422e9db51eeb976118f2b08bad82710/scripts/rtk/index.js)
[7] [ECC：MCP tools 原碼（固定版本）](https://raw.githubusercontent.com/sifxprime/kodelyth-ecc/8ec283a7d422e9db51eeb976118f2b08bad82710/scripts/mcp/tools.js)
[8] [ECC：MCP catalog 原碼（固定版本）](https://raw.githubusercontent.com/sifxprime/kodelyth-ecc/8ec283a7d422e9db51eeb976118f2b08bad82710/scripts/mcp/catalog.js)
[9] [ECC：code-reviewer 角色定義（固定版本）](https://raw.githubusercontent.com/sifxprime/kodelyth-ecc/8ec283a7d422e9db51eeb976118f2b08bad82710/agents/code-reviewer.md)
[10] [ECC：Super Agent 調度原碼（固定版本）](https://raw.githubusercontent.com/sifxprime/kodelyth-ecc/8ec283a7d422e9db51eeb976118f2b08bad82710/scripts/super-agent/orchestrator.js)
[11] [RTK 上游：token 估算原碼（當日固定快照）](https://raw.githubusercontent.com/rtk-ai/rtk/2a786dca60fa4759f4f8381262a6a3b98256667a/text/src/lib.rs)
[12] [RTK 上游：tracking 原碼（當日固定快照）](https://raw.githubusercontent.com/rtk-ai/rtk/2a786dca60fa4759f4f8381262a6a3b98256667a/src/core/tracking.rs)

- 原始來源：[Kodelyth ECC 官方網站](https://ecc.kodelyth.com)；[ECC 固定版本的計量原碼](https://raw.githubusercontent.com/sifxprime/kodelyth-ecc/8ec283a7d422e9db51eeb976118f2b08bad82710/scripts/terse/ledger.js)（查閱：2026-11-12）。
