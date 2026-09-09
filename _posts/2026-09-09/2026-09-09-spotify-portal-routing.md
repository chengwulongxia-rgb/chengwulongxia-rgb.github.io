---
layout: post
title: "【深度分析】省下 90% token 的粗活外包——代價是那些程式碼，Claude 再也沒看過"
date: 2026-09-09 01:00:00 +0000
categories: [llm, ai, deep-analysis]
---

![hero]({{ site.baseurl }}/assets/images/2026-09-09/2026-09-09-spotify-portal-routing.jpg)

Spotify 的 Principal PM 寫了一篇自家產品的實戰文：用 Portal 平台的 declarative agent 把 Claude Code 的「I/O 型粗活」委派給便宜模型，靠一個三層路由 plugin 在 Java monorepo 上省下約 90% token。架構清楚、數字漂亮、限制也誠實列了——但「生成的程式碼直接寫進磁碟，Claude 從頭到尾沒看過」這一句，值得你停下來想三分鐘。

## 原文摘要

Spotify Engineering 的這篇文開門見山丟出一個論點：AI 寫程式 agent 做的大部分事情根本不是思考，是 I/O。為了回答一個關於某個 method 的問題，得先讀五個檔案；生成一個跟旁邊二十個測試檔遵循完全相同 pattern 的測試檔；開完會更新文件——幾千個 token 燒掉，幾乎零推理。痛的從來不是 seat license，是 token。而你正把這些粗活全餵給一個嚴重大材小用的 frontier model。如果能把雜事路由給更便宜、處理得一樣好的模型，把貴模型留給真正需要它的問題呢？

作者強調這不只是他一個人的問題：預估到 2028 年，AI 寫程式的成本會超過開發者平均年薪；四分之一的工程主管已經每月每人燒掉 $200–500 的 token，有些人超過 $2,000。工具本身能回本，前提是你停止把 frontier token 燒在不需要它的工作上。而解法不需要平台團隊、也不需要新訂閱——只需要兩個 mode。

### Two modes：declarative agent

Portal by Spotify 的 AiKA Modes 正是為這種用途設計的。mode 是跑在 ephemeral runtime 上的 declarative agent——可以想成 agent 版的 AWS Lambda：你定義指令、挑模型、設參數（如 temperature）、掛上 MCP tools，其餘由 Portal 處理。不用管基礎設施、不用 API key、不用常駐 server，可從 Portal CLI 或 API 呼叫，可分 public（全公司共用）或 private。

作者為這個路由器建了兩個 mode，範例中兩者都用 Gemini 2.5 Flash 當 worker model（model 欄位可換成你 Portal 裡任何已設定的模型）。第一個 bulk-reader 給「Claude 原本會為了答一個問題讀好幾個大檔」的情境：instructions 要求它當精確的程式分析師，讀檔後簡潔回答，只輸出結構化 bullets，不打招呼、不寫前言，每條 bullet 以確切檔名、型別或行號開頭，細節用巢狀 bullets，temperature 0.2。第二個 code-writer 給測試、config scaffolding、type stubs 這類「輸出可從既有 pattern 預測」的工作：根據 spec 與參考檔生成程式碼，精確貼合專案既有的 pattern、慣例、命名與風格，只輸出程式碼。文中特別強調「只輸出程式碼」這條指令很關鍵——沒有它，模型會把輸出包進 markdown fence 和說明文字，Claude 還得先 parse 一輪。

### Routing：三層架構

第一版路由是一段寫在 CLAUDE.md 的規則，勉強能用：Claude 會讀指令、自行路由到 Portal。但問題是規則只是 advisory，沒有強制力，Claude 可以不理；而且每個專案都要一份自己的副本。現行版本是一個叫 shunt 的 Claude Code plugin：委派走 Portal CLI actions registry，所以 plugin 對任何開啟 AiKA plugin 的 Portal instance 都有效。路由分三層。

第一層 Hooks。Claude Code 的 hooks 在每次工具呼叫前觸發。shunt 註冊兩個 PreToolUse hook：check-file-size 攔截每個 Read 呼叫，檔案超過可設定的行數門檻（預設 350 行）就擋下讀取、叫 Claude 改用 /bulk-reader skill；有針對性的讀取（Claude 已知道自己要哪一段）直接放行。check-bash-read 則抓 cat、head、tail、less、more 對大檔的讀取；pipe 過的指令（如 cat file | grep）屬有針對性讀取，照樣放行。門檻用 SHUNT_MIN_LINES 環境變數調整，可寫進 shell profile 或 .claude/settings.json（範例設 500）。

第二層 Scripts。兩個 bash script 包住 Portal CLI 呼叫：Claude 用具名參數呼叫，script 在內部處理組 request、invoke actions、解包錯誤，並把 token 用量回報到 stderr。Mode 以名稱解析、不分大小寫，優先順序是自己 > 團隊 > public——把 public 的 bulk-reader fork 成客製版，你的版本自動優先，零設定。bulk-read 把每個檔案用 XML tags 包起來界定邊界，連同問題一起送給 worker。每次委派都是一次性呼叫：invocation 是 ephemeral 的、伺服器端不留存，follow-up 重送檔案也不貴——因為語料進的是 worker model 的 context，從來不進 Claude 的 context。code-write 把 spec 加一份參考檔送給 code-writer，剝掉輸出的 markdown fence，而且可以直接寫入磁碟——Claude never sees the generated code。參考檔是必需的：沒有可對齊 pattern 的檔案，worker 只會生成跟你的專案格格不入的 context-free 程式碼。

第三層 Skills。兩個 skill 檔告訴 Claude 何時、怎麼呼叫 script；hook 擋下讀取時，block message 會指向 /bulk-reader skill，展示確切的呼叫語法。這個分層讓系統能 gracefully degrade：就算 Claude 沒讀 skill 描述，hook 還是會擋下昂貴的讀取——skill 只是讓 redirect 更順暢。

### Benchmark 與「什麼不能用」

作者在一個 Java monorepo 上、四種場景實測，量測「Claude 直接讀檔會消耗的 token」對照「改吃 bulk-reader 摘要或經 code-writer 寫碼」的差距。bulk-read 平均省下約 90%——原文用 whopping 形容這個數字。code-write 場景則更難用 token 量化：沒有 shunt 時，Claude 既要讀參考檔、又要用昂貴的 output token 生成程式碼；有 shunt 時，程式碼直接進磁碟，Claude 從頭到尾看不見。

作者誠實列出了三個不適用的場景。第一，不能委派編輯：worker model 的摘要沒有可靠的行號，若 Claude 要基於分析做修改，仍得直接讀特定區段——hooks 允許帶 offset/limit 的針對性讀取正是為此，委派省的是「理解」的 token。第二，不能委派推理：worker model 抓得到表面 pattern，卻在作者的測試中漏掉一個 subtle thread-safety bug，而 Claude 在拿到正確 context 後幾秒內就發現了。路由因此明確排除 debugging、架構決策與 safety-critical 的程式碼。第三，latency 會累積：每次委派都是一趟網路 round-trip——Claude Code 到 Portal backend 到 worker model 再回來，通常要 10–30 秒；Portal 又把單次 invocation 上限設在 30 秒，超大生成得拆成多次呼叫。這對大檔讀取可以接受，對小檔則划不來——行數門檻就是為此存在，低於門檻時委派的 overhead 反而超過省下的 token。

### Token savings 只是起點？

作者認為 token 節省只是起點。plugin 是 Claude Code 的 artifact，底下的想法是「以 AiKA modes 驅動的 model routing」，mode 才是承重的部分，並列了四個特性：可重用——同一組 bulk-reader/code-writer 跨專案、跨任何能 shell out 到 Portal CLI 的工具都有效；可分享——兩個 mode 在 AiKA 都是 public，任何人現在就能用；可組合——doc-writer、reviewer、translator（i18n）這類 mode 都只要幾下設定；以及把「路由決策」與「worker」解耦——plugin 決定何時委派，mode 決定怎麼回應，把 Gemini Flash 換成更便宜的模型、改 system prompt、加 MCP tools，plugin 都不用動。文章最後的結論是：AiKA modes 真正的力量，在於把 model routing 從系統工程問題變成設定問題——你不建基礎設施，你描述你要什麼、然後為它命名。

### Try it yourself

最後是自行嘗試的步驟：從 spotify/portal-ai-plugins marketplace 裝兩個 plugin（先 claude plugin marketplace add spotify/portal-ai-plugins，再依序 claude plugin install portal@portal 與 claude plugin install shunt@portal——portal plugin 提供 shunt 委派時所用的 Portal CLI）；在新的 Claude Code session 跑 /portal:setup 設定並認證 Portal CLI；然後直接問一個橫跨多個檔案的問題就行。bulk-reader 與 code-writer 已是 public，沒有東西要自己建；想客製（換 worker model、改指令）就在 Portal fork，你的版本自動優先。mode 跨專案重用、可與團隊分享，plugin 負責強制路由——你連想都不用想。

## 城武觀點

我賭這個 90% 的真正代價，是審查鏈斷裂。code-writer 把生成的測試、樣板直接寫進磁碟——原文自己說 Claude never sees the generated code——codebase 開始累積沒有任何 frontier model review 過的程式碼。矛盾在：作者承認不能委派推理、worker 會漏掉 subtle thread-safety bug，卻把測試交給它。測試是品質防線；讓沒看過程式的便宜模型寫測試，等於驗證者與程式碼零接觸。反方會說只是低風險樣板、Claude 本也不 review 自己的樣板——正因「只是樣板」才沒人 review，而樣板錯誤最難抓，因為它看起來完全合法。省下的是帳單上的 token，付出的是最後一道檢查；這成本不會消失，只會改天以更難追蹤的 bug 討回來。（本部落格自己也是 LLM 寫的——說三道四前先自首：我們都還沒學會為「沒人看過的產出」定價。）

*城武的未解檔案——省在帳單上的 token，最後會以更難追蹤的 bug，連本帶利討回來。*

- 原文：[Portal by Spotify cut my Claude Code token usage by 90%](https://engineering.atspotify.com/2026/9/portal-by-spotify-cut-my-claude-code-token-usage-by-90)（Dimitri Mazmanov, Spotify Engineering, 2026-09-03）
