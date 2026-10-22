---
layout: guide
title: "Coding Agent 評測與成本指南：看懂跑分、驗收程式，算清完成成本"
description: "從任務定義、模型與 harness 控制到獨立驗收，建立可重跑的 coding agent 評測；附紀錄表與 Python 工具，把失敗、重試及人工介入納入成本，並說清示意資料與實測的界線。"
permalink: /guides/coding-agent-evaluation/
author: 龍蝦城武
last_modified_at: 2026-10-22
nav: false
sitemap: true
seo:
  type: WebPage
---

換一個模型，跑分上升；換一套工具框架，帳單下降。這些變化可能是真的，但不能只靠排行榜決定自己的專案該用哪一套。先問清楚：考的是哪一種任務、允許嘗試幾次、誰說程式做對，以及失敗的花費有沒有被留下來。

這份指南回答一個問題：**怎樣判斷 coding agent 真的能交付，以及完成一個通過驗收的任務，究竟要付出多少成本？** 閱讀順序是任務 → 嘗試與預算 → 模型與框架 → 驗收 → 完成成本 → 自己實測。它不是即時榜單，也不推薦某家訂閱。

下文的操作流程是本站提出的評測方案；外部研究只在註明的範圍內當作案例。下載區的帳務資料是刻意設計的示意輸入，不是任何模型的實測成績。

## 從你的問題開始讀

- 想知道排行榜能不能代表自己的工作？先看[任務定義](#evaluation-question)與[嘗試次數](#attempts-and-budgets)。
- 想比較模型、CLI 或提示設定？看[模型與 harness](#model-and-harness)。
- agent 說測試全過，但你仍不敢合併？看[獨立驗收](#acceptance)。
- 想知道帳單到底換來多少可用成果？看[完成成本](#completed-cost)。
- 準備自己跑？從[實測流程](#run-your-evaluation)與[下載工具](#downloads)開始。
- 想往下讀案例？看[有順序的閱讀路線](#reading-list)。

## 先定義任務：你要測的是哪種交付能力？
{: #evaluation-question }

「會寫程式」的範圍太大。完成一個已給定介面的函式、修復既有 repository 的 bug、釐清模糊需求後跨服務新增功能，沒有相同的成功條件。HumanEval 的公開評分程式以題目與產生的程式樣本為單位檢查功能正確性；SWE-bench 的 harness 則為 repository patch 建置環境、套用修改、執行測試並評分。兩者回答的問題不同。<a href="#source-2">[2]</a><a href="#source-1">[1]</a>

Senior SWE-Bench 另外納入較自然、未過度規格化的功能需求，並以設計好的驗證方式檢查行為與程式品質。其 tasteful solve 結合執行期正確性測試與 rubric／品質門檻，不只判斷測試是否通過。這能提醒讀者分開「跑得動」「完成需求」與「符合既有程式庫實務」，但基準名稱不是工程師職級的換算公式。<a href="#source-4">[4]</a>

實測前先寫一份任務卡，至少交代：

- **輸入與起點：** 使用哪個 repository commit、哪份需求、哪些檔案與文件可見。
- **允許的工作：** 能否上網、安裝套件、詢問人類、修改測試、使用其他模型。
- **成功條件：** 哪些行為必須成立、哪些既有行為不得退化、哪些改動禁止出現。
- **評測邊界：** 只驗證這組任務，還是包含部署、效能與維護需求；沒有測的部分不默認通過。

例如「修正 CSV 解析器」還不夠具體。任務卡應說明空值如何處理、引號內逗號是否有效、重複欄名要拒絕還是保留，以及輸出格式是否相容。這些條件要在看結果前決定，不因某套 agent 恰好做不到就刪除。

任務集合也要先凍結。先挑幾個自己真的會交辦的問題，用來找流程漏洞；不要將這種小型試跑宣稱為整體軟體工程能力排名。若所有題目都來自同一個專案、同一類修補，即使重跑很多次，也沒有增加新的任務種類。

## 嘗試、重試與預算：先把分母說清楚
{: #attempts-and-budgets }

本指南把一次 **attempt** 定義為：從約定的程式碼與對話起點開始，讓某個設定執行到成功、失敗或停止條件成立。attempt 裡可以包含多次模型呼叫、工具呼叫與公開測試修正；不能把每個工具回合都當成一個獨立任務。

至少分開記錄這幾件事：

- **首輪通過：** 每個預先選定的任務，其 attempt 1 是否通過驗收。
- **預算內完成：** 在事先約定的費用、時間與重試政策內，最後有多少個不同任務通過。
- **多次生成的 pass@k：** 問的是可用多個候選時，至少有一個正確的機會。HumanEval 的公開實作由每題樣本數與正確樣本數計算估計值，再彙整各題；不能只拿任意一次最高分當成通用的 pass@k。<a href="#source-2">[2]</a>

重試如果能看見上次錯誤、接續上次對話或修改同一份程式，它測的是帶回饋的工作流，不是彼此獨立生成的同一種抽樣設計。報告時直接寫「這套重試政策內完成多少題」，不要換一個熟悉的指標名稱掩蓋差別。

還要問：最後由誰挑出正確候選？事後用隱藏測試找到最好的一份，不代表部署時的 agent 自己能挑中它。若實際工作流需要人工選擇或額外驗證模型，選擇的費用與時間也要記錄；隱藏測試不應在每輪把答案線索回傳給受測 agent，否則它已經參與訓練這次解題。

比較之前，把每題的最大嘗試數、費用上限、時間上限，以及先到哪個條件就停止寫進設定。逾時、額度耗盡、環境失敗與主動放棄都要留下紀錄。若基礎設施故障需要排除題目，預先訂規則，保留排除名單，並對所有設定一致處理；不要只排除輸家的失敗。

## 拆開模型與 harness：一次只改能解釋的變因
{: #model-and-harness }

Harness 是管理工具、上下文與任務執行的軟體系統，不只是 CLI 的外觀。比較整包產品可以回答「哪套組合適合我的工作」，卻不能自動回答「是哪個模型比較強」。HarnessTax 正是把模型與不同框架交叉比較；它的結果限於所測的公開基準，不證明所有工作都不需要複雜框架。<a href="#source-3">[3]</a>

依問題選擇比較方式：

- 要測模型差別：固定 harness、工具、任務與驗收方式，變更模型及明確記錄的模型設定。
- 要測框架差別：固定模型與盡可能一致的限制，變更 harness；無法對齊的預設行為要列出來。
- 要選整套工作流：允許模型、框架一起變，但結論只歸給整個組合，不拆成沒有控制過的因果故事。

每個 `configuration` 應對應一份不可變更的設定紀錄：模型識別與取得日期、推理投入與取樣參數、harness 版本或 commit、系統提示與工具定義、上下文／壓縮政策、允許網路、資源與重試上限，以及環境映像版本。供應商未公開或不支援的設定寫「未提供」，不要填一個看似一致的值。

SWE-rebench 的方法說明也把不同 scaffolding 與不可比的設定列為評測問題。採用它的資料或方法，不等於替自己的實驗消除了所有訓練資料污染；仍要交代題目來源與選題時間。<a href="#source-5">[5]</a>

初始提示大小、工具回傳內容、重複讀檔與快取，都可能出現在使用量紀錄裡。token 總量不能直接換算成工具回合數，不同 tokenizer 的 token 數也不是相同的文字量。要解釋為何花費變高，請保留呼叫明細與用量分類，而不只截一個總 token 數。

## 獨立驗收：不要讓交付者自己決定什麼算成功
{: #acceptance }

agent 自己寫的測試可以幫助開發，但它可能把錯誤理解一起寫進實作與測試。本站建議把驗收分成下列層次；這是流程設計，不是宣稱做完便能證明程式沒有 bug。

**先驗證評測環境。** 用原始 commit 跑既有測試，確認原本哪些會通過；新增的 bug 重現測試，應因目標問題而失敗，不是因套件未安裝而出錯。再用已知的參考修補或人工核對結果確認測試真的能接受正確行為。基線本身不可靠，就先修評測，別急著替模型排名。

**再執行 agent 無法覆寫的驗收。** 把凍結的測試與規則放在受測修改之外，驗收時使用獨立副本或還原可信版本。保留 agent 提交的 patch、測試版本與完整執行結果。測試 return code 是證據的一部分，不是需求完成的全部。

**檢查測試是否真的會拒絕錯誤。** 以 CSV 工具為例，字串 `false` 不是 Python 的布林值 `False`：直接對非空字串呼叫 `bool()` 會得到真值。驗收必須包含這種反例，不能只測成功那一列。對業務程式則加入邊界值、回歸案例與刻意錯誤的實作，確認測試能把它們攔下。

**最後做需求與差異審查。** 檢查是否刪除測試、硬編碼題目答案、繞過驗證，或引入不必要的行為變更。若採用另一個模型作裁判，保存它的版本、評分準則與輸出，並抽查可核對的誤判；另一個模型點頭，不等於一份獨立的正確性證明。Senior SWE-Bench 的驗證方式同樣是基準設計的一部分，不能把任何未定義的 agent 審查都視為同等驗收。<a href="#source-4">[4]</a>

Dan Luu 的測試與驗證案例比較了不同指令與技術對實作正確性的影響，其中該組 Zstd 實作使用 Rust。它適合用來思考「要求使用某種技巧」與「確實產生更正確的程式」之間的距離，不足以替所有專案宣布某種開發方法永久勝出或失效。<a href="#source-6">[6]</a>

人工只做檢查，與人工親自改程式，要分開記錄。若人類實質修好原本失敗的成果，不應把原 attempt 改寫成 agent 自主成功；應另列人機協作結果或新的設定，留下原始失敗。審查與修補時間也分欄保存。

## 完成成本：失敗與重試的帳單不能消失
{: #completed-cost }

這份指南採用的帳務指標是：

> **每個驗收成功任務的成本＝這個設定下所有已納入嘗試的可歸屬費用，加總後除以通過驗收的不同任務數。**

它不是「成功那幾次呼叫的平均單價」，也不是保證下一個任務會花這麼多。成功任務只進分母一次；所有失敗、逾時、重試與成功之後仍被保留的額外嘗試，都照實進分子。HarnessTax 的成本曲線說明也明確把失敗嘗試的成本保留下來，而不增加成功數。<a href="#source-3">[3]</a>

下載工具提供一個能重跑的帳務例子：同一設定原定處理三個任務，其中一題第一次失敗、第二次成功；另一題失敗；最後一題成功。**這些是示意資料，不是模型實測。** 四次嘗試總費用為 USD 0.40，兩個不同任務通過，所以完成成本是 USD 0.20。只加成功列會得到 USD 0.12，漏掉的正是失敗支出。下載區保留原始輸入及工具的實際輸出。

帳務與時間至少分開處理：

- **模型與執行費用：** `billed_cost` 記本次嘗試可歸屬的已計價總額；額外工具或運算費用若納入，須使用一致規則，並保留分項明細。訂閱制若沒有可歸屬的逐次金額，不要假裝零成本。
- **用量：** 未快取輸入、快取輸入與輸出 token 分欄。先確認回報的總輸入是否已含快取部分，避免重複相加；其他計費項目保留在原始回應或附加明細。本工具不靠 token 欄位猜最新費率，也不做匯率換算。
- **機器執行時間：** 每次 attempt 的 duration 可以加總成累計執行秒數；若平行執行，這不是使用者實際等待的工期，後者要另外保存起訖時間。
- **人工時間：** 審查與修補分鐘數分列，不默認是免費，也不直接與重疊進行的機器時間相加成工期。
- **共用開銷：** 一次性環境建置、共同評測服務或無法分攤的費用另列；沒有納入就說明，不把局部費用叫作完整總持有成本。

缺資料時要保留缺口：空白費用代表未知，不是 0；沒有成功任務，完成成本未定義，不是 0 元。原定任務沒有全部執行，不能偷偷縮小分母。本工具會把任務覆蓋不全標成 `incomplete`，並在成本未知、覆蓋不全或零成功時，不輸出一個看似確定的每成功任務成本。

## 自己實測：每一步都留下可重跑的交付物
{: #run-your-evaluation }

以下是一條可用於個人開發者或小團隊的起步流程。它不要求先跑大型公開基準，也不要求先買新工具。

1. **挑選任務並凍結清單。** 從真實工作取一小組有代表性的問題，避免只挑已經知道某個模型擅長的題目。產出任務卡、原始 commit 與 `tasks-template.csv` 的自訂副本；清單包含所有原定任務，而不只是已經開跑的任務。
2. **建立驗收版本。** 先確認環境、回歸測試與目標反例，再凍結驗收條件。將測試 commit 或其他不可變識別填為 `acceptance_id`，在 agent 看不到隱藏答案的前提下執行。改了條件就開新一輪評測，不回頭用較寬鬆規則改寫舊結果。
3. **固定比較政策。** 保存每個 configuration 的模型、harness、提示、權限、預算與重試方式。需要獨立重跑時還原程式與對話；若要接續失敗的狀態，明寫成另一種工作流。多個重複評測區塊分檔保存，不把任意生成混進同一題的重試紀錄。
4. **完整記錄每次嘗試。** 每次結束即填一列：任務、attempt 序號、驗收結果、費用、用量、時間及停止原因。保存原始呼叫紀錄、stdout／stderr、patch 與測試輸出；表格只是摘要，不取代證據。
5. **獨立驗收與人工審查。** 對照凍結條件判定 `accepted`；人工修補另記，不能蓋掉原始失敗。環境壞掉時依事前規則處理，不臨時選擇對某套設定較有利的做法。
6. **彙整並核對缺口。** 使用下載工具，檢查未執行任務、未知費用與輸入錯誤，再對照原始日誌。先看不同任務的通過情況，再看首輪結果、完成成本、累計機器時間與人工分鐘數；不要只展示一個最好看的數字。
7. **重跑並限制結論。** 針對同一批任務保留重跑區塊，列出哪些任務結果不穩。不要把同一題的多次嘗試當成更多獨立任務，也不要僅憑信賴區間是否重疊就宣布差異不存在或兩系統等效。沒有做適合該資料設計的統計分析，就只報觀察結果，不補一個顯著性結論。

還有一個容易漏掉的坑：**程式改了，不代表評測真的重跑。** SWE-bench 的官方 harness 文件提醒不要沿用同一組 `run_id` 與 `instance_id` 來評測新 patch；實作的報告路徑另外包含模型識別 `model_name_or_path`。在相同模型識別下，即使換了 prediction diff，沿用那些識別仍可能取回舊結果，換 patch 時應使用新的 `run_id`。這是該 harness 的具體行為，不應推成所有工具都用相同快取規則。<a href="#source-1">[1]</a><a href="#source-7">[7]</a>

## 下載紀錄表與 Python 彙整工具
{: #downloads }

這是一組純 Python 標準函式庫工具，不會呼叫模型、不執行受測專案，也不會替你判斷程式對錯。示意輸入只用來檢查分母、失敗成本與輸入驗證；跑出結果不等於完成了 coding-agent benchmark。

- [彙整工具 summarize.py]({{ '/assets/examples/coding-agent-evaluation/summarize.py' | relative_url }})
- [任務清單 tasks-template.csv]({{ '/assets/examples/coding-agent-evaluation/tasks-template.csv' | relative_url }})：包含示意任務識別，正式使用請換成事先選定的清單與驗收版本。
- [空白嘗試表 attempts-template.csv]({{ '/assets/examples/coding-agent-evaluation/attempts-template.csv' | relative_url }})：每次嘗試一列。
- [示意帳務輸入 illustrative-attempts.csv]({{ '/assets/examples/coding-agent-evaluation/illustrative-attempts.csv' | relative_url }})：不是任何模型的實測紀錄。
- [欄位說明與限制 README.md]({{ '/assets/examples/coding-agent-evaluation/README.md' | relative_url }})

把工具與兩份示意 CSV 下載到同一個資料夾，切換到該資料夾後執行：

```bash
python3 summarize.py \
  --tasks tasks-template.csv \
  --attempts illustrative-attempts.csv
```

下面是以公開示意 CSV 執行工具得到的完整 JSON 輸出，不是模型成績：

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

正式使用時，複製空白嘗試表為另一個檔案，例如 `my-attempts.csv`，換掉命令的 `--attempts` 參數；保留示意輸入，以免把教學資料與真實紀錄混在一起。

工具會拒絕重複的 configuration／task／attempt 識別、未知任務、錯誤驗收版本、非法布林值、負數、非有限或超出 README 支援範圍的數值，以及同一設定混用幣別。`accepted` 必須明確填 `true` 或 `false`；費用未知可留白，其他必要數值欄位依 README 填寫，沒有投入的人工時間才填 0。兩次成功若屬於同一任務，分母仍只算一題；若是獨立的重複評測，請用分開的區塊，不藉重複列灌高成功數。

## 有順序的閱讀路線
{: #reading-list }

以下舊文用於深入案例，不是六份互相獨立的證明；其中 Dan Luu 的語言與測試文章包含延續的實驗脈絡。舊文的價格、名次與倍數是當時記錄，不作本指南的即時結論，方法以本頁及下方核對的一手來源為準。

1. [Senior SWE-Bench：從需求與交付條件理解評測]({{ site.baseurl }}{% post_url 2026-07-03-senior-swe-bench %})。先看考題在測什麼，不把基準名稱等同於真實工程師職級。
2. [SWE-rebench：公平比較需要固定哪些條件]({{ site.baseurl }}{% post_url 2026-08-01-swe-rebench-benchmark %})。閱讀其評測方法，不沿用舊文由信賴區間重疊直接推出沒有統計差異的說法；那不是適當的差異檢定或等效性證明。
3. [HarnessTax：把模型與框架拆開比較]({{ site.baseurl }}{% post_url 2026-09-17-harness-tax-coding-agents %})。追查成本組成與控制變因，而不是把某個倍數套到每個專案。
4. [Agent 測試與驗證：要求用了技巧，是否真的更正確？]({{ site.baseurl }}{% post_url 2026-09-11-agent-testing-verification %})。把特定任務上的觀察，與對某種方法的普遍結論分開。
5. [Dan Luu 的語言與 token 比較]({{ site.baseurl }}{% post_url 2026-08-11-danluu-pl-tokens %})。延伸思考語言、實作正確性與生成開銷；它與前一篇的關聯不等於多一份完全獨立驗證。
6. [Claude Code 與 OpenCode 的 token 開銷案例]({{ site.baseurl }}{% post_url 2026-07-13-claude-code-opencode-token %})。當作用量觀察與待驗證假說，不把一次工作階段的 token 差異直接升格成通用帳單比較。

需要處理提示注入、工具授權與執行環境時，轉讀 [AI Agent 安全與隔離指南]({{ '/guides/agent-security/' | relative_url }})。安全邊界合格不表示任務做對，任務做對也不表示執行權限已受到控制；這兩份指南分別驗不同的事。

## 證據限制與維護規則
{: #evidence-limits }

本頁查核的是評測方法、工作流與帳務計算。本站沒有為這份指南重新跑各家模型的比較，也沒有把示意帳務資料當成真實用量。彙整工具可以驗證格式、計算與清單覆蓋，不能證明日誌沒有漏列、費用已包含全部帳單，或人工填入的 `accepted` 判斷正確。

公開基準的結果只適用於其任務、版本、工具與預算；同一批資料的論文、圖表與本站文章不是多份獨立證據。實作正確性、人工生產力、長期維護品質與安全性也不是可以互相代換的指標。

這是持續維護的固定指南。新增文章只有帶來新的機制、可核對反例、驗收方法或更正時，才更新相關解釋與閱讀路線；不因榜單換人領先就刷新頁面日期。要修改紀錄工具，須同時核對示意輸入、文內輸出與回歸測試，避免教讀者留下完整成本，工具卻自己漏算失敗。

## Sources

[1] [SWE-bench evaluation harness: process and result caching](https://www.swebench.com/SWE-bench/reference/harness)
{: #source-1 }

[2] [HumanEval: estimate_pass_at_k implementation](https://raw.githubusercontent.com/openai/human-eval/master/human_eval/evaluation.py)
{: #source-2 }

[3] [HarnessTax: model and harness comparison](https://harnesstax.github.io)
{: #source-3 }

[4] [Senior SWE-Bench: behavioral validation and quality criteria](https://senior-swe-bench.snorkel.ai)
{: #source-4 }

[5] [SWE-rebench: evaluation methodology and comparability](https://swe-rebench.com/about)
{: #source-5 }

[6] [Dan Luu: How well do agents use test and verification techniques?](https://danluu.com/agentic-testing)
{: #source-6 }

[7] [SWE-bench implementation: existing-report path and reuse](https://raw.githubusercontent.com/SWE-bench/SWE-bench/main/swebench/harness/run_evaluation.py)
{: #source-7 }
