---
layout: post
title: "【深度分析】Argus 如何分開 AI 提案與執行權？18 項離線測試核對 broker、kill switch 與模擬告警"
description: "固定 Argus 原始碼版本，重跑 18 項上游控制測試，追蹤 agent 提案、人工核准、執行與回滾的資料流，說明 kill switch 的時間邊界，以及合成事件 coverage 不能回答的問題。"
date: 2026-10-27 14:09:49 +0800
categories: [llm, ai, deep-analysis]
guide: agent-security
image: /assets/images/2026-10-27/argus-action-broker-boundaries.jpg
---
![hero]({{ site.baseurl }}/assets/images/2026-10-27/argus-action-broker-boundaries.jpg)

Argus 是開源的安全營運平台，整合事件偵測、調查代理與回應動作。這次不以功能清單判斷它能否接管 SOC，而是固定一個原始碼版本，重跑 18 項上游測試，核對一條具體路徑：模型提出封鎖或修復建議後，誰能批准，什麼時候才真的呼叫執行器？測試在停網容器中使用假執行器與合成事件；沒有呼叫真模型、雲端帳號或外部攻擊目標。

*首圖為提案、核准與執行分離的概念示意，不是 Argus 介面截圖。*

## 原文摘要

### 核對對象：不是把整個平台的功能當成安全證明

[Argus 專案介紹](https://thomasunise.com/argus)把它定位為免費、MIT 授權的 agentic security operations platform。它的程式不是只有聊天介面：偵測引擎處理事件與規則，調查代理透過工具取得脈絡，action broker 管理回應動作，simulator 則用合成事件檢查偵測規則。

本文核對的是 [Argus 固定版本](https://github.com/thomasunise/argus/tree/8cf56b0fe837538b478812652bd46eff60e20f23)，不是一個會隨主分支更新而漂移的產品描述：

```text
8cf56b0fe837538b478812652bd46eff60e20f23
```

下面分開標示程式碼的控制流程、這次實際通過的測試，以及尚未建立反例的靜態觀察。它們不共同組成一份生產環境安全認證。

### 最小對照：同一個低風險動作，人提出與 agent 提出不同

先看最直接的案例。上游測試開啟低風險動作自動核准，讓同一個 principal 對同一種假動作、同一個 target 建立兩份請求。差別是第二次多了 `agent_run_id`。

以下摘錄自實際跑過的低風險來源對照測試；測試名稱如下。`session`、`principal`、設定與假執行器由上游 fixture 提供，這不是可單獨執行的腳本：

```text
test_agent_originated_request_never_auto_approved
```

```python
human = await broker.request(session, principal, 'test.fake.low', {'target': 'one'}, 'human asks', settings=app.state.settings)
agent = await broker.request(session, principal, 'test.fake.low', {'target': 'one'}, 'agent asks', agent_run_id='run-123', settings=app.state.settings)
assert human.status == 'auto_approved'
assert agent.status == 'pending' and agent.required_approvals == 1 and agent.agent_run_id == 'run-123'
```

這個案例測的不是模型有沒有理解「不要自行執行」。它直接把請求送到真 broker：human 請求在符合設定時自動核准，agent-originated 請求仍停在 pending。`policy.evaluate` 對低風險自動核准有明確的 agent 排除條件；autonomous playbook 的自動核准路徑也排除 agent-originated 請求。[對照測試](https://github.com/thomasunise/argus/blob/8cf56b0fe837538b478812652bd46eff60e20f23/tests/test_actions.py)與[政策實作](https://github.com/thomasunise/argus/blob/8cf56b0fe837538b478812652bd46eff60e20f23/app/actions/policy.py)可以交叉閱讀。

另一項[提案工具整合測試](https://github.com/thomasunise/argus/blob/8cf56b0fe837538b478812652bd46eff60e20f23/tests/test_actions.py#L597-L612)從 agent 的真工具入口呼叫 broker，確認回傳 pending、保留原本的 run ID，且假執行器的呼叫紀錄沒有 `execute`。這比只測一個回傳「待核准」的假 broker，多核對了工具到政策層的連接。

### 模型的工具參數，不等於執行器的權限

[Agent runtime](https://github.com/thomasunise/argus/blob/8cf56b0fe837538b478812652bd46eff60e20f23/app/agents/runtime.py)先從該次執行的工具白名單找名稱，再驗證參數，用既定 principal 與 run ID 建立 `ToolContext`。`propose_action` 的模型參數是 action type、params、reason 與可選的 finding ID；principal、run ID 和 autonomous 授權不是模型自行填入的欄位。

[提案工具](https://github.com/thomasunise/argus/blob/8cf56b0fe837538b478812652bd46eff60e20f23/app/agents/tools/actions.py)先檢查 finding 是否屬於目前租戶，再把參數交給 `broker.request`，由 context 傳入 `agent_run_id`。這個 handler 不呼叫 approve 或 execute。Broker 接著查 typed action catalog、權限、參數格式與租戶範圍，先做硬性政策判斷，再跑 dry-run，依 dry-run 結果判斷核准需求，最後儲存請求、政策結果、有效期限與稽核紀錄。

這裡的 dry-run 是不執行該次正式變更，不是「絕不連網」。例如 [AWS 執行器](https://github.com/thomasunise/argus/blob/8cf56b0fe837538b478812652bd46eff60e20f23/app/actions/executors/aws.py)的檢查路徑會查詢 IAM access keys。這次停網測試用的是假執行器，沒有因此驗證真 AWS 查詢或變更。

工具 registry 把工具風險限制為 read／propose，這是應用程式的介面約定，不是作業系統沙箱；Python handler 仍由程式直接呼叫。它也不是「除提案外一律不寫入」：例如記錄調查筆記會寫 AgentStep。這條邊界針對的是基礎設施回應動作，不是所有資料庫寫入。

### 核准一次還不夠：排隊與 worker 各自檢查

[Broker](https://github.com/thomasunise/argus/blob/8cf56b0fe837538b478812652bd46eff60e20f23/app/actions/broker.py)把人工核准、接受執行請求、worker 執行拆成不同步驟。

核准時要有 `actions:approve`，請求人不能自己批准，也不能用同一個身分重複計票。Critical 動作要求兩次核准，其中包含 owner；high 的核准數依政策設定為一或二，medium 與 low 預設需要一次。不能把產品的「雙人核准」簡寫成每個動作都固定需要兩人。

執行 endpoint 檢查權限、租戶、期限、請求狀態、核准與執行階段政策後，建立 queued run。Worker 收到工作，還要重新檢查狀態、核准、參數與政策；通過後再做一次 dry-run，成功才呼叫 executor。完成結果、回滾 payload 與稽核紀錄由 broker 保存。

[排隊後啟用開關的測試](https://github.com/thomasunise/argus/blob/8cf56b0fe837538b478812652bd46eff60e20f23/tests/test_actions.py#L530-L555)專門檢查這段時間差：endpoint 先回 202 接受工作，測試在 worker 的政策檢查時修改測試用 settings、啟用 global kill switch；最終 run 變成 failed，假 executor 沒有收到 execute。這沒有測量跨程序的開關同步。另一項測試則確認，即使請求已核准，開關也能阻擋後續執行。佇列裡有工作，不代表它已取得永久執行許可。

### Kill switch 的時間邊界：能擋關卡，不等於能取消外部操作

從 `handle_execute` 的呼叫順序，可以觀察到更細的邊界：先做 execution policy 檢查，再重新 dry-run，最後執行。新的 dry-run 成功之後、`action.execute` 之前，沒有第三次 kill switch 政策檢查。因此，前面那個測試證明的是「在 worker 檢查前切換會被擋」，不是「任何時間切換都能中止已開始的雲端 API」。

同樣地，這次新的 dry-run 結果只以 `ok` 決定是否繼續，沒有把新回報的影響實體數送回政策重新判斷自動核准。Worker 的核准檢查也使用請求儲存的核准門檻，不能描述成所有動態政策與影響範圍都重新完成了一次審批。這是固定版本的靜態流程觀察；本次沒有建立可利用反例。

回滾也不是開關之外的特殊通道。[`handle_rollback`](https://github.com/thomasunise/argus/blob/8cf56b0fe837538b478812652bd46eff60e20f23/app/actions/broker.py)會檢查 kill switch。換句話說，緊急止動會同時阻止後續動作與經 broker 發動的回滾；「停止新增變更」和「恢復已改動的資源」是兩個需要分開驗收的操作。

這次通過的完整生命週期測試，驗證了核准、執行、回滾的正常路徑，但 executor 是替身。它沒有證明某個真雲端服務必定接受反向操作，也沒有涵蓋外部資源已被其他操作者改變的情況。

### Simulator 產生的是事件，不是送往目標的攻擊流量

匯總提到 Argus 可以加入「低速慢行」等規避變體。原始碼裡的做法是修改合成事件的節奏、數量或屬性，再交給偵測引擎；不是拿平台向外部目標發動攻擊。

[Scenario 定義](https://github.com/thomasunise/argus/blob/8cf56b0fe837538b478812652bd46eff60e20f23/app/simulator/scenarios.py)產生事件與 canary touch 計畫。[Runner](https://github.com/thomasunise/argus/blob/8cf56b0fe837538b478812652bd46eff60e20f23/app/simulator/runner.py)替租戶建立 inactive、actions-disabled 的 sandbox tenant，複製偵測規則設定與 baseline，寫入合成事件，在程式內記錄 canary hit，再呼叫真正的 detection engine。每個 scenario 完成後清掉 sandbox 的事件等暫存資料；真租戶保存的是 SimulationRun 報告。

這不是把 event bus 關掉。Detection engine 仍會發布帶有 sandbox tenant ID 的 `detection.created`；防止後續自動回應，依靠 inactive tenant、回應開關與 opt-in，以及對 simulation 標記的跳過條件。完整 simulator 測試確認真租戶的 SecurityEvent、Detection、Finding 數量不增加，sandbox events 清空；autoresponse 測試則在已啟用回應的租戶餵入 simulation-tagged detection，確認它被 skipped。[相關測試](https://github.com/thomasunise/argus/blob/8cf56b0fe837538b478812652bd46eff60e20f23/tests/test_simulator.py)因此核對的是資料與回應路徑，不是一次真實攻擊的攔截紀錄。

### Coverage 的分母，是內建 scenario 與預期規則

Runner 的計分方式是：所有預期規則都觸發，算 detected；只觸發部分，算 partial；完全沒配到，算 missed。Coverage 把每個 detected 算一分、partial 算半分，再除以 scenario 數。

所以預設情境得到 `coverage=1.0`，表示那些合成情境配對到了預期規則，不代表真實世界的攻擊偵測率是 100%。它沒有提供未知攻擊的分布，也沒有把正常使用的誤報一併納入分母。

這次也跑了兩個失敗對照。[Evasion 變體測試](https://github.com/thomasunise/argus/blob/8cf56b0fe837538b478812652bd46eff60e20f23/tests/test_simulator.py#L66-L73)開啟 evasion 後，credential spray 與 privilege escalation 情境出現 missed，coverage 小於 1 且留下 gaps；[停用規則測試](https://github.com/thomasunise/argus/blob/8cf56b0fe837538b478812652bd46eff60e20f23/tests/test_simulator.py#L76-L82)停用 `k8s.privileged_workload` 後，對應情境被列為 missed，報告保留停用規則的名稱。測試通過的意思是工具有正確呈現這些缺口，不是規避攻擊全部被擋住。

## 本站離線測試與重現方式

### 18 項測試實際涵蓋什麼

本次選集來自上游現有測試，沒有改掉 app 或斷言來配合文章：

- Action broker／政策：8 項，包含 agent 提案、低風險自動核准對照、kill switch 與完整生命週期。
- Agent 工具：2 項，核對 registry 與 action tools。
- Autoresponse：4 項，核對 opt-in、自主政策、simulation skip 與影響範圍限制。
- Simulator：4 項，包含完整執行、evasion、停用規則與拒絕清除真租戶。

初次核查分兩批執行，[原始 pytest 輸出](https://github.com/chengwulongxia-rgb/deep-dive-code/tree/e99508df4350f805ed303c6236e20a327463cda9/argus-boundary-audit/results/initial-audit)分別是 `8 passed` 與 `10 passed`，exit code 都是 0。完成版 runner 又獨立跑出 [18 passed 的原始紀錄](https://github.com/chengwulongxia-rgb/deep-dive-code/blob/e99508df4350f805ed303c6236e20a327463cda9/argus-boundary-audit/results/run-20261027-verified/pytest.stdout.txt)。全部是停網容器內的 SQLite、合成資料與假執行器；這不是上游全部測試套件，也沒有量測真模型的調查品質、提示注入成功率、雲端變更效果、多 worker 競態或 PostgreSQL／Redis 生產部署。

### 用同一份 runner 重跑，不需要 GPU

公開的[重現目錄](https://github.com/chengwulongxia-rgb/deep-dive-code/tree/e99508df4350f805ed303c6236e20a327463cda9/argus-boundary-audit)包含固定版本與測試選集、Dockerfile、依賴版本、執行器、[Notebook 入口](https://github.com/chengwulongxia-rgb/deep-dive-code/blob/e99508df4350f805ed303c6236e20a327463cda9/argus-boundary-audit/reproduce.ipynb)及原始結果。Notebook 使用同一個 runner，不另寫一份測試邏輯；需要有 Docker 的本機環境，不是一般 Colab runtime 的直接執行配方。這次工作不需要 GPU。

先準備 Python 3.12+、Git 與本機 Linux Docker；本次驗證平台是 Linux amd64。閱讀該目錄 README 後，固定本站程式版本再執行：

```bash
git clone https://github.com/chengwulongxia-rgb/deep-dive-code.git
cd deep-dive-code
git checkout --detach e99508df4350f805ed303c6236e20a327463cda9
cd argus-boundary-audit
python3 -B reproduce.py
```

Runner 會自行 fetch 固定的 Argus commit、核對來源乾淨狀態，拒絕帶有實際 `.env` 的來源，並且只執行列明的 18 個 node ID。完成後讀輸出 JSON 的 `success`、`passed_count`、`cleanup_verified`，再打開它指向的 manifest；不是看到命令結束就算通過。

測試容器停用網路、唯讀掛載原始碼、使用非 root 帳號並限制 CPU、記憶體與程序數；不掛家目錄、真憑證或 Docker socket。取源與建置依賴需要連網；本機 Docker bridge 的 DNS 曾使建置失敗，重現包只對 build 使用 host network，測試 runtime 仍是 network none。不能把「測試停網」寫成整個重現過程完全離線。

Notebook 的程式碼 cell 也在同一本機環境實際執行過，透過相同 runner 再跑出 18/18，並[保留該次 manifest 與清理紀錄](https://github.com/chengwulongxia-rgb/deep-dive-code/blob/e99508df4350f805ed303c6236e20a327463cda9/argus-boundary-audit/results/run-20261027T062814Z/manifest.json)。這是執行 cell 內容，不是宣稱另做了一輪 Jupyter 介面測試。Runner 本身另有 14 項單元測試通過，不與上游 18 項混算。

失敗紀錄也保留在重現目錄：除了 build DNS，最初曾在容器停止後才複製 tmpfs 裡的 JUnit，導致取不到報告。完成版改成在退出前匯出原始 XML bytes，再由 host 保存並驗證 node ID；沒有從通過摘要合成 XML，也沒有刪掉失敗輪次。

原始測試輸出保留每個 node ID、通過狀態與 exit code，環境紀錄保留實際套件版本與容器 image ID。依賴鎖定版本不等於固定每個平台的 wheel 內容；換作業系統或重新解析套件時，仍應對照自己的環境與結果，不能直接複製本文的通過數。

這組測試的可核對結果，是提案與執行的區分、排隊後的拒絕、正常回滾路徑，以及模擬資料如何避開自動回應。真雲端與真模型的效果，需要另外的授權環境與驗收資料。

- 程式片段與控制流程：[Argus 固定版本原始碼（MIT）](https://github.com/thomasunise/argus/tree/8cf56b0fe837538b478812652bd46eff60e20f23)
- 程式片段授權：[MIT License 原文](https://github.com/chengwulongxia-rgb/deep-dive-code/blob/e99508df4350f805ed303c6236e20a327463cda9/argus-boundary-audit/UPSTREAM-LICENSE.txt)（Copyright © 2026 Argus Contributors）
- 本站重現：[程式、Notebook 與測試證據](https://github.com/chengwulongxia-rgb/deep-dive-code/tree/e99508df4350f805ed303c6236e20a327463cda9/argus-boundary-audit)
- 原文：[Argus — Agentic Security Operations](https://thomasunise.com/argus)（thomasunise，專案介紹；核對於 2026-10-27）
