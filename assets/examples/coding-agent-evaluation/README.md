# Coding Agent 紀錄彙整與成本工具

**本目錄所有範例均為「示意數據，不是任何模型實測」**。`demo` 不是模型名稱；token、時間、費用與驗收結果都是教學用的手填示意數。這不是 benchmark、模型排名或付費 API 實驗。公開範例把人工修補分鐘數全部設為 0，避免將人工改好的成果記成 agent 自主成功；人工審查則另外計時。

純 Python 3.9+ 標準函式庫；金額與時間使用 `Decimal`，不安裝依賴、不下載專案、不執行專案或模型、不連網。工具只讀 CSV，不對輸入使用 `exec` / `eval`。

## 檔案與執行方式

把這五個檔案下載到同一目錄：

- `summarize.py`：檢查紀錄格式，將彙整結果輸出為 JSON。
- `tasks-template.csv`：三個示意 task 的預先凍結 manifest。
- `attempts-template.csv`：只有欄名的空白紀錄表，供填寫自己的紀錄；不是零成本、零成功的評測結果。
- `illustrative-attempts.csv`：四筆教學用示意紀錄，每列 notes 均標明不是模型實測。
- `README.md`：本說明。

在下載目錄執行：

```sh
python summarize.py --tasks tasks-template.csv --attempts illustrative-attempts.csv
```

成功時 stdout 只有 JSON，exit code 為 0；可直接重導向存檔：

```sh
python summarize.py --tasks tasks-template.csv --attempts illustrative-attempts.csv > summary.json
```

以下為上面示意檔案的**精確 stdout**（示意數據，不是任何模型實測）：

```json
{
  "configurations": [
    {
      "configuration": "demo",
      "currency": "USD",
      "status": "complete",
      "planned_tasks": 3,
      "observed_tasks": 3,
      "not_attempted": [],
      "attempts": 4,
      "unique_accepted_tasks": 2,
      "first_attempt_successful_tasks": 1,
      "known_cost_subtotal": "0.40",
      "missing_cost_count": 0,
      "total_cost": "0.40",
      "cost_per_accepted_task": "0.20",
      "input_uncached_tokens": 400,
      "input_cached_tokens": 80,
      "output_tokens": 120,
      "cumulative_attempt_duration_seconds": "240",
      "human_review_minutes": "8",
      "human_fix_minutes": "0"
    }
  ]
}
```

金額與時間在 JSON 中是十進位**字串**，不是二進位浮點數；計數為整數，未知／不適用為 `null`。在下列支援範圍內，總和依輸入位數動態設定 Decimal 精度；單位成本除法使用至少 50 位有效數字的運算精度，使用 half-even，不自動四捨五入成貨幣小數位。

金額與時間的數值文字最多 2048 字元，Decimal 係數最多 1000 位；最末位的十進位 exponent 須介於 -1000 與 1000，最高有效位的十進位 exponent 亦不得超過 1000。超界會回報錯誤、exit 2，不截斷也不把極小非零值變成 0；這些界限同樣適用於人工分鐘與執行秒數。

## 先凍結驗收，再填紀錄

`tasks-template.csv` 必須至少有以下欄位：

| 欄位 | 定義 |
| --- | --- |
| `task_id` | 預定任務的唯一 ID；禁止重複或空白 |
| `acceptance_id` | 在執行前固定的驗收規格／測試版本 ID；禁止空白 |

請自行保存 acceptance_id 對應的驗收定義、測試版本、環境及外部證據。**這個工具不自行判斷程式是否正確，也無法驗證驗收規格真的曾被凍結。** `accepted` 必須來自該外部驗收，不能因 agent 自稱完成就填 true；人工修正後才通過也應另存證據與一致政策，不可混稱模型獨立成功。若更改驗收規格，應建立新的 evaluation block 與 manifest，而非事後放寬門檻。

`attempts-template.csv` 的欄位（全部必須存在）：

| 欄位 | 填寫規則 |
| --- | --- |
| `configuration` | 同一個 evaluation block 內固定的配置 ID；模型、版本、harness、工具、預算、重試政策等另附不可變設定 |
| `task_id` | 必須存在於 manifest |
| `attempt` | 正整數，從 1 開始記錄；只接受標準十進位寫法，如 `1`、`2`，拒絕 `01`、`+1`、`1.0`；工具不要求序號連續，但缺列必須自行揭露 |
| `acceptance_id` | 必須與該 task 在 manifest 中的值完全相符 |
| `accepted` | 只接受小寫 `true` 或 `false`，不能空白、不能用 `1`、`yes` 或 `TRUE` |
| `billed_cost` | 本次 attempt 的帳單成本，非負且 finite；**空白代表未知，不是 0**；只有確知免費才填 `0` |
| `currency` | 每列必填，同 configuration 必須完全一致；不換匯、不把不同幣別加總 |
| `input_uncached_tokens` | 本次未快取輸入 token，非負整數 |
| `input_cached_tokens` | 本次快取輸入 token，非負整數 |
| `output_tokens` | 本次輸出 token，非負整數 |
| `wall_seconds` | 本次 attempt 的經過秒數，必填非負 finite 數值 |
| `human_review_minutes` | 本次人工審查分鐘，必填非負 finite 數值 |
| `human_fix_minutes` | 本次人工修補分鐘，必填非負 finite 數值 |
| `stop_reason` | 保留外部停止原因，如 `accepted`、`acceptance_failed`、`timeout`；不作成功判斷，可空白但建議填寫 |
| `notes` | 補充驗收證據、帳單依據等；當作純文字，可空白 |

token 計數只接受標準非負十進位整數字串；時間或人工投入未知時，不得拿 0 代替：應先補齊，否則工具拒絕輸入。確定未投入才填 0。成本是這條規則的特例，允許留空以明確保留未知狀態。ID、configuration 與 currency 不接受前後空白，不會擅自修正識別值。

同 `(configuration, task_id, attempt)` 不得重複。禁止負數、NaN、Infinity；缺必要欄位、重複欄名、欄數錯誤、格式錯誤、空 CSV 或只有欄名皆拒絕，錯誤寫到 stderr、exit code 為 2，stdout 不產生部分結果。可附加額外欄位，但本工具不使用它們。

## 分母、重試與成本的定義

每個 configuration 各自彙整，不把不同配置合併：

- `planned_tasks`：**manifest 的任務總數**；不能刪掉沒跑或沒成功的任務以縮小分母。
- `observed_tasks`：紀錄中至少出現一次的唯一任務數。
- `not_attempted`：manifest 有、但該 configuration 沒有紀錄的 task ID 清單。
- `status`：全數任務至少有一筆紀錄才為 `complete`，否則為 `incomplete`。此狀態**僅代表任務覆蓋完整**，不表示全部成功、帳單齊全、沒有漏記 attempt，或評測方法已受認證。
- `attempts`：所有紀錄的列數，包含成功、失敗、timeout、retry；停止原因不影響費用加總。
- `unique_accepted_tasks`：曾有 `accepted=true` 的唯一 task 數，每個 task 最多計一次。任務成功率若另計，分母必須用 `planned_tasks`，不是 attempts 或 observed_tasks。
- `first_attempt_successful_tasks`：明確記為 `attempt=1` 且驗收通過的唯一 task 數；沒有 attempt 1 時，不能把第一筆觀測到的 attempt 2 充當首試。
- `known_cost_subtotal`：所有有已知成本的 attempts 加總；即使全數未知，此值為 0 也僅是「已知部分」的空集合總和，不代表免費。
- `missing_cost_count`：成本空白的 attempt 數；只要大於 0，`total_cost` 與 `cost_per_accepted_task` 都是 `null`。
- `total_cost`：帳單齊全時的**所有 attempts** 成本總和，不只成功列。覆蓋不全時即使帳單齊全，也只代表已記錄 attempts 的成本。
- `cost_per_accepted_task`：只有 coverage 完整、成本全已知且至少有一個 accepted task，才輸出 `total_cost / unique_accepted_tasks`；其他情況為 `null`，不冒稱完整評測的完成成本。
- `cumulative_attempt_duration_seconds`：所有 `wall_seconds` 的 **cumulative attempt duration（累積嘗試耗時）**，**不是平行執行的 makespan**，也不是使用者的端到端等待時間。後者須另存起訖時間及排程證據。
- `human_review_minutes` 與 `human_fix_minutes`：分開加總，不自動換算工資、不加進 billed cost；若人工時間跨多個 attempts 共用，應先決定分攤政策，避免重複填寫。
- 三種 token 欄位分開加總；不以 token 數推估帳單，不知道價格、計費折扣、工具費或帳單範圍時不要自行補值。

**示意計算例，不是任何模型實測：**

- task001：第 1 次失敗 0.06，第 2 次成功 0.04。
- task002：第 1 次 timeout，未通過，花費 0.10。
- task003：第 1 次成功，花費 0.20。
- 正確：`(0.06 + 0.04 + 0.10 + 0.20) / 2 = 0.40 / 2 = 0.20`。
- 錯誤：只加 accepted rows 得到 `(0.04 + 0.20) / 2 = 0.24 / 2 = 0.12`，漏掉失敗與重試的成本；測試明確攔住這個錯法。

同一 task 若有多次 accepted，仍只算一個成功 task，但**所有成本照加**。若那些紀錄其實是獨立 replicates，請分成獨立的 evaluation block（各自的 CSV／報告），不可混為本工具的 retries，更不可將這個去重後的完成數宣稱為 pass@k。本工具不估計 pass@k、不提供信賴區間、不推論跨任務可比性。

## 完整性邊界與測試

工具只知道 manifest 與提供的 attempts：整個 configuration 若完全沒有列，無法被發現；請在執行前另存配置清單，核對預定配置是否都已出現在報告中。它也不能偵測被刪掉的失敗紀錄、帳單是否漏算外部工具費、token 是否實填，或不實的 accepted。請保存原始紀錄與帳單，不能把 coverage complete 等同原始資料完整。

在原始 repo 根目錄重跑測試（不下載、不執行專案或模型，只測 CSV 彙整器）：

```sh
python -B -m unittest discover -s _tests -p test_coding_agent_costs.py -v
```

測試包含總成本、重試唯一成功分母、未跑任務不縮分母、未知成本、零成功、重複列、負值／NaN／Inf、非法 accepted、驗收 ID、混幣、空表、欄位錯誤、Decimal 精確加總，以及本 README 的 JSON 與 demo 真實 stdout 完全一致。
