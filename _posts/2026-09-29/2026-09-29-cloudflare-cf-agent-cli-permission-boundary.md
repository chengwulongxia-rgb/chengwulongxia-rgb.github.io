---
layout: post
title: "【深度分析】Cloudflare 的 cf：當 agent 能找到三千個 API，誰來證明它不會碰錯？"
subtitle: "可發現性解決了 agent 不知道怎麼做；權限邊界則要回答它憑什麼可以做。"
date: 2026-09-29 01:00:00 +0000
categories: [llm, ai, deep-analysis]
tags: [Cloudflare, cf, agentic-cli, API, security, permissions, DevOps]
---
![hero]({{ site.baseurl }}/assets/images/2026-09-29-cloudflare-cf-agent-cli-permission-boundary/hero.jpg)

Cloudflare 推出新 CLI `cf`，理由不是工程師需要另一套命令，而是 agent 已經大量使用舊的 Wrangler，卻只能觸及 Cloudflare 一小部分產品。這篇公告真正有意思的地方，在於它把「agent 如何找到操作」做成工具設計的核心；同時也留下另一個尚未由搜尋功能解決的問題：找到操作後，誰授權它動手？

## 原文摘要

### 從 Wrangler 的使用數據，到整個 API 的命令列

Cloudflare 給出的起點是使用行為：2026 年 3 月，agent 已占 Wrangler 使用量四分之一，前一年還是個位數；公告發布前一週升至 48%。相較於人類使用者，agent 每天使用的不同命令接近兩倍，使用六種以上命令的可能性接近四倍。這些是 Cloudflare 報告的 Wrangler 使用數據，不是「Cloudflare 的部署已有 48% 由 agent 完成」。

Wrangler 的命令原本由各產品團隊分別手刻，約有 280 條操作路徑。團隊各自決定名稱與互動方式，於是同類動作出現 `d1 info`、`hyperdrive get`、`workflows describe` 等不同動詞；有些耗費大量程式碼打造的專用介面，實際卻很少被用到。要在這套分散的設計上逐項補齊 Cloudflare 數千項 API 操作，既難擴張，也難維持一致。

新作法是以 Forge——Cloudflare 統一的 API 生成管線——從支撐 API 文件及 SDK 生成的 OpenAPI schema 出發，加入少量 CLI 所需的標註，生成 `cf` 命令。Cloudflare 稱覆蓋的 API 表面超過 3,000 項 operations，對照 Wrangler 約 280 條路徑；這是兩種不同單位的規模比較，不等於已驗證每項操作在 preview 期間都有相同品質的工作流程。官方描繪的使用情境跨越建立、部署、監控 Worker，設定 Access、WAF，甚至購買網域：原本要在不同介面與 API 之間切換的事，現在希望從同一套 CLI 進入。

### 讓沒有學過 `cf` 的 agent 自己找路

Wrangler 有多年文件、部落格與第三方教學，模型可能早已從訓練資料記住它；但舊記憶也會讓改動後的命令更容易被誤用。Cloudflare 因此選擇推出新名字，而非讓 agent 分辨自己熟悉的舊工具究竟改了哪些行為。公告提到新工具可藉執行時提供的脈絡、引導與 `AGENTS.md` 補充資訊，減少對舊訓練記憶的依賴。

面對三千多項操作，不可能把整份手冊塞進每次對話。`cf cli search` 讓 agent 用自然語言描述想做的事，由一個小型搜尋索引依 API 描述與參數回傳候選命令；首次執行 `--help` 時，工具也會提示這條搜尋路徑。這解決的是「應該呼叫哪個命令」的發現問題，並非替它判斷這次呼叫是否被允許。

### JSON 預設，表單留給需要親自輸入的人

Cloudflare 觀察到 agent 使用 Wrangler 時，常先加 `--json`，再用 `jq` 取需要的欄位；但 Wrangler 只有部分命令支援 JSON，其他可能輸出供人看的 Unicode 表格。`cf` 反過來以 JSON 為預設：給人看時排版，給 agent 時壓縮，方便它直接篩選結果並節省上下文，而不是解析表格外觀。公告的假設是，人類往往透過 agent 間接使用 CLI，最終要看的格式可以由 agent 整理。

這不代表所有操作都得靠 agent 拼出一長串參數。對購買網域這類需要個人輸入、API 要求又複雜的流程，`cf` 也能把所需欄位拆成連續、經驗證的表單供人填寫。官方同時說，使用者仍可要求 agent 代做；表單是一條可用的人類操作路徑，不能把它讀成購買前一律強制人工批准。

### TypeScript 設定：先管 Worker，再談整個 Cloudflare

`cloudflare.config.ts` 是另一條主線。Cloudflare 要把設定變成可程式化的 TypeScript，而不是繼續在 TOML 或 JSONC 中複製大量環境設定。官方說，TOML 沒有易於取用的 schema，JSONC 雖連到 schema，agent 卻少有使用；TypeScript 則讓人和支援 LSP 的 agent 可以直接從型別、補全與錯誤提示理解設定。Cloudflare 舉內部例子：一份超過五千行、為不同開發者複製多個環境的 Wrangler 設定，改用共用基底與工廠式生成後縮短約四成。這是內部個案，不是所有專案遷移後的平均節省。

在範例裡，`defineConfig(({ mode }) => ...)` 依 Vite 的 mode 選不同設定，`bindings` 幫手函式描述文字與 secret、KV、D1、R2、Queue，也涵蓋 AI、Vectorize 和 Worker 綁定；編輯器可以提示每種綁定需要什麼。`triggers` 則把 fetch 路由、排程、Queue 與 email 觸發集中在一處，避免分散在設定檔各角落。`cf migrate` 可用來遷移 Worker 設定。官方的長期意圖是用同一種型別安全的設定涵蓋 policy、zone、DNS 等更多產品；目前示範與可遷移範圍先以 Workers 為中心，未來願景不能當成當下已全面落地。

### 開發環境改採 Vite，但不假裝 Wrangler 已經退場

Wrangler 最初為 JavaScript Workers 使用 esbuild 打包，並自行維護本機開發伺服器；要改動底層行為常得深入 Cloudflare 專用的 Miniflare 等工具。`cf` 改以 Vite 為預設，利用其開發伺服器、熱模組替換與外掛生態，建置時使用基於 Rust 的 Rolldown 進行 tree-shaking。Cloudflare 推薦 Cloudflare Vite Plugin 用於前端專案或後端 API 的 Workers；搭配 Vitest 外掛，可在接近 Workers runtime 的環境測試，並使用 bindings 與平台 API。

過渡不會是一鍵全換。已用 Vite 的 Worker 可由 `cf migrate` 轉成 `cloudflare.config.ts`；依賴 Wrangler 的 esbuild 建置，以及 Rust、Python Workers，`cf` 仍會把開發或部署工作委派給 Wrangler。新專案可用 `cf init` 建立 Hello World；Cloudflare 也說，`cf init` 或 `cf deploy` 可替新專案安裝 Vite 外掛並建立設定。靜態站點一開始仍不必有設定檔，在專案內執行 `cf deploy` 即可。官方提供 `npm i -g cf` 安裝開放測試版，並稱 `cf` 開源、可在 GitHub 回報問題。

Wrangler 也不是在這次公告當天停止維護：Cloudflare 說，等 `cf` 的 open beta 結束後，才會發布一個引導使用者轉往 `cf` 的 Wrangler 最終 major 版本；從 beta 結束起，Wrangler 還會維護 18 個月。這是一個以 beta 結束為起算點的承諾，不是從公告日開始倒數。

### HN 的追問：操作可見了，權限怎麼切？

對照的是 Hacker News 上另一篇較早的 Cloudflare-wide CLI 設計文章討論串，不是這篇發布公告的留言區。留言者 `8cvor6j844qw_d6` 希望工具事先列出部署所需 token 權限，並提議像 `cf permissions check` 這樣檢查缺少或多給了哪些 scope；`cleverdash` 則指出，agent 通常能使用 CLI，卻未必善於診斷失敗，錯誤訊息若能說明缺哪個權限及修正方法，比只讓成功路徑順暢更重要。這些都是建議，不是公告列出的 `cf` 現有命令。

`aetherspawn` 的抱怨更具體：在其使用情境裡，zone 層級的權限隔離無法妥善涵蓋不屬於 zone 的 Workers，於是最低可用權限仍可能觸及正式環境程式碼；他要求 resource groups 或帳號層級隔離。`amluto` 提議狹域、短效 token，或由宿主代理把一部分權限轉交容器；`oncensher` 則想讓常見動作免於反覆請示、少見的高風險動作能逐次由人批准。這些留言描述的是社群希望補上的授權機制與各自的使用經驗，不宜寫成 Cloudflare 已提供 resource groups、逐動作核准或短效 token 的產品規格。

## 城武觀點

`cf cli search` 把問路的成本壓低，這是對的；但問路和通行證不是同一件事。當一個 agent 能從同一入口找到部署、DNS、WAF 與購買網域的操作時，最危險的捷徑不是它找錯命令，而是人為了避免反覆卡在權限錯誤，把一把長效、過大的鑰匙交出去。搜尋的收益由任務即時取得；誤動正式環境的損失，卻由維運者與受影響的使用者承擔。

我支持把摩擦搬到授權與審核介面，而不是搬回 API 搜尋：每個任務先列明目標資源、動作與期限，只授出那一小段能力；高風險變更先呈現可閱讀的變更內容、要求人核准，再留下能追溯到任務與核准者的紀錄。這是應該爭取的設計，不是 `cf` 公告已交付的功能。尤其當底層資源無法被細分隔離時，再漂亮的 CLI 也替代不了權限模型。誰握著核發憑證的鑰匙？錯誤部署後，誰有證據能分清是 agent 誤判、人類放行，還是權限本來就給得太寬？這兩題若答不出來，「agent-first」只是讓操作比問責跑得更快。

*城武的未解檔案——命令可以即查即用，授權不能即猜即給。*

- 原文：[Introducing cf: the agentic CLI for the entire Cloudflare API](https://blog.cloudflare.com/cloudflare-cf-cli-launch/)（Matt “TK” Taylor、Samuel Macleod，Cloudflare Blog，2026-09-28）
- 社群討論：[Building a CLI for all of Cloudflare](https://news.ycombinator.com/item?id=47753689)（Hacker News，Cloudflare-wide CLI 設計文章討論串）
