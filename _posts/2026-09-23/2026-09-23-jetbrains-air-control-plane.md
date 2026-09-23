---
layout: post
title: "【深度分析】JetBrains Air：當 IDE 不再是工作台，而成為代理人軟體工廠的驗收閘門"
subtitle: "JetBrains 把桌面工具、團隊協作與治理層收進同一個名字；真正的賭注不是多開幾個 agent，而是能否把驗證、責任與成本接回軟體交付流程。"
date: 2026-09-23 12:19:17 +0800
categories: [llm, ai, deep-analysis]
tags: [JetBrains, Air, agentic-development, IDE, ACP, software-governance]
description: "JetBrains Air 從獨立 agentic development environment 擴張為產品系統。本文拆解其 IDE、團隊與治理架構，並分析開放協定、程式碼智慧、驗證負債與組織控制之間的實際取捨。"
---

![JetBrains Air 代理開發控制鏈]({{ site.baseurl }}/assets/images/2026-09-23-jetbrains-air-control-plane/hero.jpg)

# JetBrains Air：當 IDE 不再是工作台，而成為代理人軟體工廠的驗收閘門

JetBrains 在 9 月 22 日宣布的「JetBrains Air」，不是一個剛誕生的 IDE，也不是把既有 AI 外掛改名而已。它把今年陸續推出的獨立 Air 桌面環境、IDE 內的 agent 體驗、團隊協作、雲端執行、成本控制與原名 JetBrains Central 的治理能力，收攏成一個「面向 agentic software development 的開放產品系統」。官方把它分成三個面：**Air in JetBrains IDEs**、**Air Teams**、**Air Governance**。[1]

這個重組值得注意，不是因為 JetBrains 終於也有了「多 agent」的功能，而是它對 IDE 身分提出了更具體的答案：當編輯器不再是所有程式工作發生的地方，IDE 的價值是否能從「寫程式的主場」轉為「理解、驗證並承擔代理人產物的控制面」？JetBrains 的答案是肯定的；但這也把一個更難、且不會被漂亮的 orchestration 介面自動解掉的問題，推到檯面上：程式碼產出變便宜後，誰來消化驗證負債？

## 先釐清：Air 是兩種東西，這不是小小的命名問題

Air 今年 3 月先以 Public Preview 形式出現，是一個獨立的「agentic development environment」。使用者可派遣 Codex、Claude Agent、Gemini CLI 與 Junie 執行任務，將它們置於本機、Git worktree 或 Docker 容器，並在任務完成後於含終端機、Git 與預覽功能的介面檢查變更。[2]

9 月的 Air 則是較大的傘狀名稱。官方的三個層次是：

1. **Air in JetBrains IDEs**：在 IntelliJ 系列 IDE 中指派、監看與審查 agent 工作，並使用 JetBrains 的程式碼智慧理解變更。[1]
2. **Air Teams**：讓開發者與自主 agent 在共享的專案、雲端環境與自動化流程裡協調工作。[1][3]
3. **Air Governance**：原 JetBrains Central，處理組織政策、可見性、稽核、成本與責任歸屬。[1][4]

因此，「Air」現在同時指一個仍可獨立使用的桌面產品，也指一整組跨桌面、IDE、瀏覽器、CLI 與組織後台的系統。The New Stack 也特別指出這個雙重用法：原本的桌面 Air 並未消失，但 Air 同時成為更大產品集合的旗號。[3] 對產品行銷而言，這讓敘事完整；對採購、導入與文件閱讀而言，卻會立刻產生問題：某項能力究竟已在桌面版可用、只在 IDE Alpha 可用，還是只對組織早期存取計畫開放？

這不是吹毛求疵。agentic 工具最常見的失敗之一，正是把「有產品方向」說成「已有可靠工作流」。JetBrains 官方文件目前清楚區分：網頁版僅提供組織使用；雲端任務與自動化依賴組織管理員設定；某些治理能力與團隊產品仍在 early access。[3][5] 導入時，應把 Air 視為持續展開的系統，而非可一次買齊、一次部署完畢的平台。

## Air 的真正架構：不是一個 agent，而是一條代理工作流的控制鏈

若把 Air 看成「又一個能呼叫 Claude 或 Codex 的 UI」，會低估它；若把它看成已經解決企業 agent 治理，也會高估它。比較準確的理解是：Air 嘗試把 agentic 開發拆成四個互相拉扯的層。

- **執行層**：agent 在本機、worktree、Docker 或雲端環境中讀碼、改碼、跑命令。
- **語義與審查層**：IDE 的 symbol、引用、型別、診斷、差異檢查與人工 review，提供 agent 任務前後的可讀性。
- **協調層**：多任務、多專案、共享上下文、排程或事件觸發的自動化。
- **治理層**：誰能用哪個 provider、agent 可去哪裡、可花多少錢、哪些產出需要人類核准，以及能否回溯發生過什麼。

官方自己的說法比多數 agent 工具更誠實：明顯錯誤的程式碼仍容易被抓到；真正昂貴的是「幾乎正確」、能通過表面檢查但帶著錯誤假設或架構不一致的變更。[1] Air 因而沒有宣稱複雜程式庫已適合純自主 coding；3 月的公告反而明說，Air 聚焦 orchestrate agent，不取代既有 IDE 工作流。[2]

這個定位有一個重要含義：Air 的核心單位不是檔案，也不是聊天紀錄，而是**可委派、可隔離、可審查、可追責的任務**。它將軟體開發重新描述為任務的生命週期，而不是開發者在游標前輸入每一行字的生命週期。

```svg
<!-- SVG 概念圖：建議存為 assets/images/2026-09-23/jetbrains-air-control-plane.svg -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 620" role="img" aria-labelledby="title desc">
  <title id="title">JetBrains Air 的代理開發控制鏈</title>
  <desc id="desc">從任務定義、代理執行到 IDE 驗證，並由團隊協調與治理層橫向約束的架構圖。</desc>
  <rect width="1280" height="620" fill="#0d1117" rx="28"/>
  <text x="70" y="72" fill="#e6edf3" font-family="sans-serif" font-size="30" font-weight="700">JetBrains Air：從代理執行到可追責交付</text>
  <g font-family="sans-serif">
    <rect x="70" y="150" width="220" height="125" rx="18" fill="#102a43" stroke="#38bdf8" stroke-width="2"/>
    <text x="100" y="205" fill="#7dd3fc" font-size="22" font-weight="700">任務與脈絡</text>
    <text x="100" y="240" fill="#cbd5e1" font-size="16">symbol / commit / 規格</text>
    <rect x="380" y="150" width="220" height="125" rx="18" fill="#122b24" stroke="#34d399" stroke-width="2"/>
    <text x="410" y="205" fill="#6ee7b7" font-size="22" font-weight="700">代理執行</text>
    <text x="410" y="240" fill="#cbd5e1" font-size="16">本機 · worktree · Docker · cloud</text>
    <rect x="690" y="150" width="220" height="125" rx="18" fill="#302510" stroke="#fbbf24" stroke-width="2"/>
    <text x="720" y="205" fill="#fde68a" font-size="22" font-weight="700">IDE 驗證</text>
    <text x="720" y="240" fill="#cbd5e1" font-size="16">語義、診斷、diff、review</text>
    <rect x="1000" y="150" width="210" height="125" rx="18" fill="#351827" stroke="#fb7185" stroke-width="2"/>
    <text x="1030" y="205" fill="#fda4af" font-size="22" font-weight="700">交付與責任</text>
    <text x="1030" y="240" fill="#cbd5e1" font-size="16">PR、核准、可回溯紀錄</text>
    <path d="M290 212 H380 M600 212 H690 M910 212 H1000" stroke="#94a3b8" stroke-width="3" marker-end="url(#arrow)"/>
    <rect x="175" y="365" width="930" height="140" rx="22" fill="#161b22" stroke="#a78bfa" stroke-width="2"/>
    <text x="220" y="420" fill="#c4b5fd" font-size="22" font-weight="700">跨層控制面：Air Teams + Air Governance</text>
    <text x="220" y="457" fill="#cbd5e1" font-size="17">共享脈絡、環境與自動化　｜　agent / provider 政策　｜　權限、成本、稽核與可追責性</text>
  </g>
  <defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto"><path d="M0,0 L10,3 L0,6 Z" fill="#94a3b8"/></marker></defs>
</svg>
```

圖中的箭頭不能被誤讀成自動化的直線進步。任務從左向右流動很容易；真正的瓶頸是最後兩格：人是否能判斷這個變更在整個系統內意味著什麼，以及組織是否能證明誰在什麼條件下接受了它。

## IDE 的位置改變了，但不會因為有 agent 就自動變得重要

JetBrains 的優勢不是模型。模型會換、排行榜會換、供應商也會換；這正是它把「multi-vendor」寫成基礎原則的原因。[1] 它想保留的，是長年累積的 deterministic code intelligence：程式結構、符號關係、型別與診斷，讓 agent 不必每次都從原始文字重建程式庫的地圖。官方主張這能同時提高準確性並降低 agent 花在重新發現既有資訊上的時間與成本。[1]

這個主張有技術合理性。把特定 class、method、commit 或 symbol 放入任務，確實比貼一大段文字更可定位；回看變更時，在程式碼上下文中檢查也比只看聊天摘要安全。[2] 這正是 IDE 可以從「程式碼輸入器」轉成「語義索引與驗收工具」的地方。

但要小心另一個跳躍：**程式碼智慧不等於系統智慧。** 型別檢查、引用搜尋與靜態診斷能回答「這裡會不會壞」，卻未必能回答「這個產品行為是否符合客戶承諾」、「這份 migration 是否在舊資料上可逆」、「這個權限變更是否滿足公司的例外流程」。agent 最危險的產物往往不是語法錯誤，而是把局部正確性拼成全局錯誤。IDE 可以讓 review 更有根據，但不能把需求判斷、架構責任與營運風險外包給一套 code model。

這也是 Air 對 JetBrains 的考驗。若它只是把 agent 的對話視窗搬進 IDE，IDE 最終仍會輸給直接在 terminal 中跑 Claude Code、Codex 或其他 CLI 的簡潔工作流。它必須證明自己的語義功能能**實質縮短驗證時間**，而不只是讓 review 看起來比較企業級。

## 開放協定 ACP：降低整合成本，沒有讓工作流自動可攜

Air 的開放敘事建立在 Agent Client Protocol（ACP）上。JetBrains 與 Zed 將其描述為 IDE 與 coding agent 之間的共享協定；官方 ACP 頁面列出 Codex、Gemini CLI、GitHub Copilot、OpenCode、Cline、Cursor、Kimi CLI 等 agent，以及 JetBrains IDE、Zed、Neovim 外掛等 client。[6] 這個方向值得肯定：若每一個 editor 都要為每一個 agent 寫一條私有整合，工具鏈必然被供應商鎖住，使用者要換模型或換 agent 的成本會被放大。

不過，ACP 解的是「連得上」的問題，不是「換了也一樣能工作」的問題。真正的任務可攜性至少還包括：

- agent 的工具權限、sandbox 與 approval 模式；
- prompt、skills、MCP connector 與可用的內部服務；
- 模型對同一任務的規劃方式、上下文處理與 tool-use 行為；
- CI、測試資料、祕密管理與 repo 特有的 bootstrapping；
- 失敗時人要在哪裡介入、如何保存中間狀態與判定可接受結果。

也就是說，ACP 能讓「agent 接到 IDE」變成較低摩擦的介面問題，卻不能讓責任、執行語義與組織政策神奇地標準化。JetBrains 把 ACP 放在 Air 的核心，是一種對模型供應商競賽的避險；但它若想成為控制面，就還得在 protocol 之上留下完整的工作證據，而不是只留下某個 agent 成功輸出 diff 的表象。

## 多 agent 的真相：平行的是產出，串行的是注意力與驗證

Air 的早期賣點是讓多個 agent 併行工作，並以通知把使用者叫回需要處理的任務，而不是逼人維護一堆 terminal 視窗。[2] 這解決了一部分操作介面的混亂；卻沒有解除人類注意力的限制。

假設一位工程師同時派出四個 agent：一個更新 API、一個修測試、一個升依賴、一個重構 service。即使四項任務在實體上隔離於 worktree 或容器，最後仍要有人檢查它們的假設是否相容、是否改到同一個資料契約、是否引進了相同但彼此看不見的安全漏洞。從程式碼生產角度，吞吐量提高；從系統理解角度，待驗證的變更堆積得更快。

這不是反對平行 agent，而是反對把平行執行誤當成平行決策。好的多 agent 系統應該把「需要人工腦力的時刻」變得稀少而明確：哪些選項牽涉架構取捨、哪些 command 有破壞性、哪些證據足以讓 reviewer 接受結果、哪些自動化必須停在 PR 而不能自行部署。若 Air 最終只負責增加可同時跑的任務數，團隊得到的不是槓桿，而是更快抵達 review queue 的噪音。

社群反應也提醒了這個落差。在該公告的 Hacker News 討論中，有長期 JetBrains 付費使用者表示 worktree 會觸發 indexing／資源問題，因而越來越常回到 terminal；另一位使用者稱 Air 仍「充滿 bugs」。這些是個別使用者經驗，不能推論為普遍效能結論，但它們精準指出 adoption 的底線：新控制面不能比既有 workflow 更重、更脆弱。[7][8] 另一則留言甚至直指 agent 時代的競爭焦慮：許多人已幾乎不開 IDE，而整日生活在 terminal agent 與 PR 之間。[9]

## 隔離不是安全的同義詞，而是把風險切成可選的邊界

Air 對每個 task 提供本機、Git worktree、Docker，以及雲端等不同執行位置。這是合理設計，因為不同任務的風險不是同一種：小修正追求速度，陌生依賴或高風險指令應優先隔離，長時間任務則需要不依賴工程師筆電在線的遠端環境。[2][10]

雲端文件把代價說得很具體：雲端環境不會自動繼承本機的 dependency、環境變數、secrets 或設定；組織必須另外準備。任務完成後，結果會提交並推送到遠端 task branch，再由人審查並建立 PR。雲端環境在 75 分鐘閒置後暫停，24 小時後封存。[10] 這些細節比「cloud agents」的宣傳詞重要得多，因為它們說明了 reproducibility 與便利性都不是免費的：你必須把原本藏在每個人筆電裡的隱性 setup 顯式化。

Docker 同樣不是免責護身符。容器可以降低 agent 直接碰到 host 檔案與程序的範圍，但如果你把 production credential、可寫入的 volume、過寬的 network 或可存取內部 MCP 工具帶進容器，隔離只是換了一個地址。worktree 也只隔離 Git 工作目錄；它未必隔離共享的快取、daemon、資料庫或本機 credential。Air 最有價值的地方，不是提供幾個「安全模式」按鈕，而是迫使團隊逐任務界定：這個 agent 需要什麼權限、在哪裡運行、結果以何種方式回到主線。

## Governance 的必要性，以及它可能形成的新集中控制

JetBrains 對組織層的診斷是對的：個人採用 agent 的速度，已快過公司建立 context、成本、政策與稽核機制的速度。[1] 官方設定文件也顯示，組織管理員能設定 AI access、credit limit、可用 provider 與 agent、cloud task 權限及 MCP connector；這些政策可覆蓋 Air 的 desktop／web、local／cloud 等使用情境。[5]

這是 Air 比單一 IDE agent 更有野心的部分。真正進入企業後，問題不只是「Claude 還是 Codex 較會寫 code」，而是：

- 哪些 repo 可以送到哪個模型？
- 自帶帳號或 BYOK 的資料流，是否仍能滿足公司政策？
- 自動化 agent 的花費要歸哪個團隊、哪個服務、哪個任務？
- 一個遠端 agent 改完 branch 後，誰確認它跑過的命令與用過的工具？
- 當事故發生，稽核紀錄能否還原決策與環境，而非只留下一個 commit？

但治理也有代價。當 JetBrains 成為「一處看、跑、管、算」多家 agent 的地方，它同時成為組織的 policy chokepoint。這有助於安全與成本控制，也意味著 JetBrains 的資料模型、稽核格式、身份整合與 roadmap 將更深嵌進企業開發流程。官方說 multi-vendor 是底線，不是終點；對使用者而言，真正要追問的是：跨供應商的可見性資料能否匯出？政策與審計紀錄能否被外部 SIEM、內部 data warehouse 或非 JetBrains 的 workflow 可靠使用？[1]

開放 agent 選擇，不等於開放治理出口。前者防止模型鎖定，後者才防止控制面鎖定。這是 Air 最值得被嚴格檢驗的地方。

## JetBrains 想賣的不是「更多 code」，而是可被驗收的軟體；它得用產品證明這句話

JetBrains 最有力的一句話不是「AI can produce code」，而是後半句：「organizations still have to produce software」。[1] 這比「讓 agent 寫得更快」接近問題本體。寫出 diff 不等於完成軟體交付；能跑過一次測試，也不等於有人理解其長期責任。

我的判斷是：JetBrains 押注 IDE 作為**驗收閘門**，比押注 IDE 繼續作為唯一工作台更可信。終端機、雲端、排程與外部 agent 會持續把工作拉出編輯器；假裝所有事情仍發生在單一視窗，只會讓 IDE 變成昂貴的懷舊物。但若 JetBrains 能把程式碼語義、任務脈絡、測試與診斷證據、review 決策、環境權限及組織政策連成可查驗的鏈，它仍能佔據最需要專業判斷的位置。

代價是，Air 不能拿「agent orchestration」當成答案。它必須回答更不討喜的問題：一個 agent 變更為何值得合併？誰驗證過它？驗證根據是什麼？被 policy 阻擋或被成本限制時，工程師能否理解與申訴？跨工具與跨供應商時，紀錄是否仍可用？

程式碼生成的成本下降，不會消滅工程責任；它只會讓責任更集中在那些能理解、審核並署名接受變更的人身上。Air 的成敗將不取決於它能同時開多少 agent session，而取決於它能否讓這些人不必在更快的產出洪流中，反而更難看清自己正在批准什麼。

## 來源與查核連結

[1] JetBrains，〈[JetBrains Air: Building a System of Products for Agentic Software Development](https://blog.jetbrains.com/blog/2026/09/22/introducing-jetbrains-air/)〉，2026-09-22。官方產品系統、三個產品面、multi-vendor 原則、驗證與責任的論述。

[2] JetBrains，〈[Air Launches as Public Preview – A New Wave of Dev Tooling Built on 26 Years of Experience](https://blog.jetbrains.com/air/2026/03/air-launches-as-public-preview-a-new-wave-of-dev-tooling-built-on-26-years-of-experience/)〉，2026-03-09。獨立 Air 的早期定位、支援 agent、worktree／Docker 與 IDE 不取代論。

[3] The New Stack，〈[“One of the most significant steps in our 26-year history”: JetBrains goes big on agentic development — and bets the IDE still matters](https://thenewstack.io/jetbrains-air-agents-ide/)〉，2026-09-22。獨立報導，釐清 Air 重新整合後的產品面與早期存取狀態。

[4] Techzine，〈[JetBrains consolidates agentic tooling under the new name Air](https://www.techzine.eu/news/devops/144455/jetbrains-consolidates-agentic-tooling-under-the-new-name-air/)〉，2026-09-22。獨立報導，交代 Central 更名為 Air Governance 與治理定位。

[5] JetBrains 文件，〈[Set up Air](https://www.jetbrains.com/help/air/set-up.html)〉，最後修改 2026-09-10。desktop／web 差異、組織設定、政策與 BYOK 限制。

[6] JetBrains，〈[Agent Client Protocol (ACP): Use Any Coding Agent in Any IDE](https://www.jetbrains.com/acp/)〉，查閱 2026-09-23。ACP 的協定定位與支援 agent／client 清單。

[7] Hacker News，〈[JetBrains Air: A System of Products for Agentic Software Development](https://news.ycombinator.com/item?id=49799287#49799699)〉，使用者 joshstrange 留言，2026-09-23。個人對 worktree、indexing 與 terminal workflow 的經驗回報。

[8] Hacker News，〈[JetBrains Air: A System of Products for Agentic Software Development](https://news.ycombinator.com/item?id=49799287#49799579)〉，使用者 delbronski 留言，2026-09-23。個人對 Air 穩定性的經驗回報。

[9] Hacker News，〈[JetBrains Air: A System of Products for Agentic Software Development](https://news.ycombinator.com/item?id=49799287#49799747)〉，使用者 throwaw12 留言，2026-09-23。對 terminal agent 與 PR 為主工作流的觀察。

[10] JetBrains 文件，〈[Cloud tasks](https://www.jetbrains.com/help/air/cloud-tasks.html)〉，2026-07-17。雲端執行環境、設定責任、暫停／封存週期與 branch／PR 流程。
