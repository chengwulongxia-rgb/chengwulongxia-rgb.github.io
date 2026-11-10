---
layout: post
title: "【深度實作】兩美分測 Terra 與 Luna：便宜九成，為何沒過抽取式問答驗收？"
description: "用 DRCD 原題完成 90 次真實 API 推論，追查『一年』與『一年一次』如何拉開精確匹配與語義判斷。開發集選出的全 Luna 策略費用少約九成，但 24 題測試未保持 EM 與字元 F1；附原生 Notebook、持久預算機制與離線重播方式。"
date: 2026-11-10 12:47:04 +0800
categories: [llm, ai, deep-implementation]
image: /assets/images/2026-11-10/drcd-api-cost-quality-hero.png
---
![Terra 與 Luna 的 API 成本、原始答案與抽取式驗收]({{ '/assets/images/2026-11-10/drcd-api-cost-quality-hero.png' | relative_url }})

問粳稻多久成熟一次，Terra 回「一年」，Luna 回「一年一次」。人讀起來幾乎同義，這次評分卻是前者完全答對、後者精確匹配失敗。便宜方案少答對的那一題，究竟是理解退步，還是交付格式沒守住？

[前一篇成本快照核對]({% post_url 2026-11-06/2026-11-06-llm-cost-frontier %})只算公開分數的加權組合。這次往前一步：在 2026 年 11 月 10 日，對官方 OpenAI API 實發 90 次推論，用開發集選方案，再把凍結方案送上測試集。整輪用量換算 US$0.0198837，約兩美分；選定方案的測試費用少約 89.96%，但未通過原先的雙品質門檻。先看答案，再看這個「未通過」到底指什麼。

## 同一題，原始回應差在哪裡？

`test-280` 的原問題逐字如下：

```text
一般狀況上粳稻的成熟頻率為多久一次？
```

相關原段落節錄如下。這裡只為閱讀節錄；實際 HTTP payload 使用 manifest 裡的完整段落，沒有縮短或加上答案提示。

> 粳稻的直鏈澱粉較少，低於15%。種植於溫帶和寒帶地區，生長期長，一般一年只能成熟一次，台灣一般被認為是北半球稉稻生長最南區。

兩模型收到相同 system 指令：「請只根據提供的段落回答問題。僅輸出最短的答案原文，不要解釋或加入前綴。」user 訊息則由完整原段落與原問題組成。標準答案「一年」只留在本地評分端，不送模型。

以下是保存的 `raw_response` 中 `output_text.text` 原值，不是事後修過的示範：

```text
全 Terra：            一年
全 Luna：             一年一次
dev 凍結策略（Luna）：一年一次
本地 gold：           一年
```

三次請求都有 392 個 input tokens；Terra 回傳 5 個 output tokens，兩次 Luna 各 6 個。完整 payload、去敏 response 與 usage 可查[原始記錄第 40–42 行](https://github.com/chengwulongxia-rgb/deep-dive-code/blob/93d3caaa0eb38647be83d2b80a708d87fa84f032/llm-cost-frontier/results/drcd-api/raw-generations.jsonl#L40-L42)。

## 評分程式沒有讀懂「一次」，也沒有偷偷刪掉它

核心評分不是 LLM judge，而是下面這段 [Notebook 原生程式](https://github.com/chengwulongxia-rgb/deep-dive-code/blob/93d3caaa0eb38647be83d2b80a708d87fa84f032/llm-cost-frontier/drcd_api.ipynb)。沿用既有 CPU 實驗的定義，並非 DRCD 官方 tokenizer：

```python
def normalize(text):
    return ''.join(c for c in unicodedata.normalize('NFKC', text).casefold()
                   if not c.isspace() and not unicodedata.category(c).startswith('P'))

def score(prediction, golds, error=None):
    p = normalize(prediction or '')
    if error or not p or not golds: return 0.0, 0.0
    em, f1 = 0.0, 0.0
    for gold in golds:
        g = normalize(gold)
        em = max(em, float(p == g))
        common = sum((collections.Counter(p) & collections.Counter(g)).values())
        f1 = max(f1, 2 * common / (len(p) + len(g)) if g else 0.0)
    return em, f1
```

運算分三步。先做 NFKC 與 casefold，去掉 Unicode 標點和空白；不繁簡轉換，也不把同義詞合併。「一年一次」處理完仍是四個字，不會因為「一次」像贅詞便刪除。

接著算 EM，也就是正規化後的字串是否完全相等。「一年」對「一年」得 1；「一年一次」對「一年」得 0。

最後算字元 multiset F1。它保留重複字的數量，不只是集合：預測有兩個「一」，gold 只有一個，因此可重疊的只有「一、年」兩字。Terra 得 1；Luna 是 `2 × 2 ÷ (4 + 2)`，得 2/3。這是字元重疊，不是語義相似度。

因此，這個案例不足以證明 Luna 不知道成熟頻率。它回答的意思接近，但沒有交付指定的最短原文答案；「一年一次」也不是節錄中連續出現的原文片段。若用途是聊天問答，人可以接受它；若用途是抽取固定欄位，邊界多出兩字就是不同輸出。本次驗收選的是後者，不能看完 test 才改成前者。

## 開發集沒有挑出混用，而是挑出全 Luna

資料沿用固定的 TCEval-v2／DRCD 子集：先按完整 context 分組，再抽不同段落，每段一題，分成 8 題 dev、24 題 test，另有 1 題 warmup。API 版保留原 manifest 的位元組，原題、全文與 gold 都未改。這是公開舊 test 的實驗重劃，且 CPU 結果已公開，不是可保證訓練未見的新資料。

選擇規則也先固定：Luna 工作量比例只試 0、25%、50%、75%、100%，按題目 ID hash 決定分派，不讀題意或 gold。以全 Terra 的 dev EM／F1 為下限，兩項都達標的候選才比用量換算美元；同價優先較少 Luna。

dev 上兩模型都是 7/8 完全答對；Terra 字元 F1 為 93.06%，Luna 為 96.59%。五個候選全部合格，最低費用落在 100% Luna。這不是混用產生了新能力，也不是智慧路由；為了寫出「混用成功」而排除端點，反而會改掉問題。[凍結決策](https://github.com/chengwulongxia-rgb/deep-dive-code/blob/93d3caaa0eb38647be83d2b80a708d87fa84f032/llm-cost-frontier/results/drcd-api/decision.json)及其 SHA 在 test 前落盤，之後不再依測試答案調比例。

正式 test 的三方案各重新送出 24 次請求，不把 dev 加權結果冒充實測，也不拿第一次 Luna 的答案重用於凍結策略。每題輪轉三方案順序，全部串行送出。

這裡凍結的是選擇規則與路由，不是保證未來成績。dev 的八題告訴我們哪個候選值得拿去驗，不能替其餘題目簽品質保證。test 的驗收仍要求所選方案的 EM 與 F1 同時不低於該輪全 Terra；不能改成只保住 EM，也不能讓節費百分比抵銷 F1 的退步。

## 省下九成費用，沒有同時保住兩條線

下面每列分母都是同一組 24 題、各題一次獨立請求。EM 是完全匹配題數比例，F1 是逐題字元分數的平均；費用只含該列 test，不含 dev 與 warmup。例如 20/24 表示 20 題完全匹配，不是 20 次重試成功；前面的 EM=0 也只代表該題未完全匹配，不等於毫無內容重疊。

- **全 Terra**：20/24，EM 83.33%，F1 95.04%，US$0.0121810。
- **全 Luna**：18/24，EM 75.00%，F1 88.01%，US$0.0012241。
- **dev 選定的 100% Luna，重新實發**：19/24，EM 79.17%，F1 93.85%，US$0.0012231。

![三個獨立 test 方案的用量換算費用與答案品質]({{ '/assets/images/2026-11-10/drcd-api-cost-quality-results.png' | relative_url }})

選定策略比全 Terra 便宜 89.96%，EM 少 4.17 個百分點，F1 少 1.19 個百分點。兩項都未保持，所以結果是「未通過預定抽取式驗收」，不是「不降質省九成」。[逐筆查核結果](https://github.com/chengwulongxia-rgb/deep-dive-code/blob/93d3caaa0eb38647be83d2b80a708d87fa84f032/llm-cost-frontier/results/drcd-api/parent-verification.json)保留完整精度。

`test-280` 具體呈現了少一題 EM 的落差，也說明為何不能把落差直接翻成理解全面下降。但其餘未完全匹配與部分重疊仍須逐題看：例如 `test-321` 的 Luna 答案含「最低層」，references 則是「大氣層」或「恆星大氣層」；字元重疊會給部分分數，EM 不會。

兩列 Luna 的差異也不是路由收益。`test-718` 問「清太祖遣兵四百收瀕海散各部這一段為誰所寫的書中提到?」，references 包含「聖武記」與「魏源」。同 payload 第一次答「魏源所著《聖武記》」，EM=0；凍結策略另送一次答「聖武記」，EM=1。另有題目從不符合 gold 變成符合，不能把全部變化都歸於答案長短。

本輪沒有設定 temperature 或 seed；`reasoning.effort=none` 不代表決定性。24 題也沒做統計不劣證明。可以報告這次觀察，不能由兩次 Luna 分數不同，推導一個實際不存在的混用增益。

## 美元怎麼算，HTTP 失敗又怎麼辦？

本次使用 `gpt-6.1-terra` 與 `gpt-6-luna`，都是 alias，不是釘選日期 snapshot。共同設定為 reasoning none、最多 500 output tokens、`store=false`、空 tools、default tier；explicit cache 不設 breakpoint，90 筆 usage 的 cached／write tokens 都為零。金額採 [11 月 10 日保存的官方價格快照](https://github.com/chengwulongxia-rgb/deep-dive-code/blob/93d3caaa0eb38647be83d2b80a708d87fa84f032/llm-cost-frontier/results/drcd-api/pricing-snapshot.json)，不當成永久報價。

計帳不是跑完才看帳單，而是在 HTTP 之前預留。以下是 Notebook 的原始預留函式，`RATES` 依序保存 ordinary input、output、最貴 cache-write 的單 token nanoUSD 價：

```python
def reservation(model, exact_count):
    n = integer(exact_count, 1) + 256
    if n > 8192: raise APIStop('short_context_limit')
    return 2 * (n * RATES[model][2] + MAX_OUTPUT * RATES[model][1])
```

先向官方 token-counting endpoint 取得輸入數，加 256 個安全 token，按最貴 cache-write 價與 500 output 上界預留，再乘二。固定私人 ledger 用整數 nanoUSD 累積；file lock 防止同時開跑，atomic replace 與檔案／目錄 fsync 確保 reserve 先落盤，才准送 HTTP。已結算加未結預留不得超過 US$0.80，跨 kernel 重啟也不歸零。

回應有效才依 ordinary input／output usage 結算並釋放餘額；reasoning tokens 是 output 子集，不再加一次。timeout 時供應商可能已處理、也可能已計費，因此保留 reserve、halt、不自動重試。本機殺掉請求不等於撤銷帳單，這套機制也不是帳單告警服務。

本輪真實推論是 warmup 2＋dev 16＋test 72，共 90 次；另有 66 次 metadata 輸入計數，不能混稱 156 次生成。所有方案、開發與暖身合計 US$0.0198837，未結 reserve 為零。這是 usage-derived USD，沒有用帳務 Cost API 獨立核帳，更不是帳戶剩餘額；也與 CPU 耗時或前篇的 42% 算術結果無關。

## 不花新錢，從固定版本重播

完整實作在原生 Notebook，下面操作先取得固定 commit 與環境，再重評保存答案，不會重新呼叫模型：

```bash
git clone https://github.com/chengwulongxia-rgb/deep-dive-code.git
cd deep-dive-code
git checkout 93d3caaa0eb38647be83d2b80a708d87fa84f032
cd llm-cost-frontier
uv sync --frozen --extra drcd --python 3.13
uv run --offline --frozen --extra drcd python run_drcd_api_notebook.py replay
```

首次 clone／sync 需要網路取得程式與依賴；環境備妥後，replay 完全離線，不需金鑰、不讀私人 ledger，runner 會攔截 HTTP 與敏感檔案存取。它重算評分、dev 決策、凍結路由及圖表，不是一次新推論。要看這題，直接搜尋 raw 的 `test-280`，對照 payload 與 `raw_response`，不要只讀 summary。

fresh 是另一條需自己的金鑰與明確 US$0.80 授權的付費路徑，本篇不重跑。本輪跨 run 的 90 次推論額度已用完，不能刪 ledger 續跑。操作及停止語意見[固定版本 README](https://github.com/chengwulongxia-rgb/deep-dive-code/blob/93d3caaa0eb38647be83d2b80a708d87fa84f032/llm-cost-frontier/README.md)。

## 城武觀點

「一年一次」不能被寫成 Luna 不懂一年，也不能因為人看得懂，就在驗收後替它免考。嚴格抽取有合理用途：下游若要原文 span，接受一個自行拼出的同義答案就是更換介面契約；但代價是 EM 會拒絕部分語義合理的輸出。我選擇保留這次失敗，拒絕把它膨脹成理解能力的總判決。若真正需求允許完整語句，下一步應先定義可接受答案及評分規則，再用新的開發／保留集評估；那可能改變採用決定，卻不能倒過來改寫本輪結果。

## 附錄：查核與資料歸屬

已保存的驗證包含 44 項測試通過，以及同一來源 10 個 code cells 的 fresh／阻擋 HTTP replay 完整執行。這些證明計帳、分流與重播機制受過檢查，不替模型的問答品質背書；本文撰稿沒有新增付費推論、GPU 或實驗。

[固定樣本 manifest](https://github.com/chengwulongxia-rgb/deep-dive-code/blob/93d3caaa0eb38647be83d2b80a708d87fa84f032/llm-cost-frontier/results/drcd-api/sample-manifest.json)的 SHA-256 如下；raw SHA 與執行一致性見前述 parent verification。

```text
1821c4f1904a51b26a3b87baa2831140064b06f118307bc9882f469fb36d1cf3
```

資料來自 [TCEval-v2 固定版本](https://huggingface.co/datasets/MediaTek-Research/TCEval-v2/tree/93ae26a94572907f6d33f9844abd9d074bcc3723)，DRCD 由台達電子／DRCKnowledgeTeam 整理自維基百科；本篇段落節錄與子集依 CC-BY-SA 3.0 保留歸屬，詳見[資料授權說明](https://github.com/chengwulongxia-rgb/deep-dive-code/blob/93d3caaa0eb38647be83d2b80a708d87fa84f032/llm-cost-frontier/data/DRCD-ATTRIBUTION.md)。

*省下的是請求費用；「答對」的定義，不能等答案回來才打折。*

- 實作與來源：[固定版本 README](https://github.com/chengwulongxia-rgb/deep-dive-code/blob/93d3caaa0eb38647be83d2b80a708d87fa84f032/llm-cost-frontier/README.md)、[原始 API 結果](https://github.com/chengwulongxia-rgb/deep-dive-code/blob/93d3caaa0eb38647be83d2b80a708d87fa84f032/llm-cost-frontier/results/drcd-api/raw-generations.jsonl)、[DRCD](https://github.com/DRCKnowledgeTeam/DRCD)；官方價格與 token-counting／prompt-caching 文件網址及下載雜湊保存於[價格來源快照](https://github.com/chengwulongxia-rgb/deep-dive-code/blob/93d3caaa0eb38647be83d2b80a708d87fa84f032/llm-cost-frontier/results/drcd-api/pricing-snapshot.json)（查核日：2026-11-10）。
