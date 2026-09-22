---
layout: post
title: "【深度分析】AX 把 agent 當成新工作負載，但真正的問題是誰管得住它"
date: 2026-09-22 01:00:00 +0000
categories: [llm, ai, deep-analysis]
---
![hero]({{ site.baseurl }}/assets/images/2026-09-22/ax-agent-execution-runtime.jpg)

一個會自己寫程式、呼叫模型與工具、等人批准的 agent，到底算什麼？把它塞進微服務的常駐程序模型，昂貴；把它當成可預期地跑完就走的 batch job，又漏掉了它會保存上下文、反覆等待與繼續行動的事實。AX 值得讀，不是因為它喊了多大的規模，而是它把這個工作負載的控制問題攤到檯面：資源、網路、工作環境與模型設定，必須在 agent 出門前就說清楚。

## 原文摘要

AX 將 agent 描述為不同於微服務與 batch job 的新型工作負載。原文的理由很具體：agent 會累積狀態，必須被嚴格隔離，還會呼叫模型 API 與工具伺服器；若沒有持續看管，等待中的任務也可能白白佔住資源。它們不是均勻、可預期地消耗運算：可能密集運算一分鐘，接著等待模型回應、外部工具結果或人類批准，再回到原有脈絡繼續做事。

因此，AX 提出四個可宣告的基本元件。**Task** 是實際執行單位：不受信任的 agent 程式碼在 sandbox 內跑，並設定 CPU 與記憶體限制。**Workspace** 定義任務開跑前要備妥的環境，可列出 Git repository、MCP server 與 skills，也可直接描述環境目標。**Gateway** 把網路政策拉成明確設定，流量只可前往指定的 host 與 port allowlist，並可對送出的請求注入憑證。**Model** 則集中管理模型組態、模型參數與 secrets，讓換金鑰或固定模型版本成為一次套用的設定變更。

![AX 的 agent runtime 控制面示意圖]({{ site.baseurl }}/assets/images/2026-09-22/ax-agent-runtime-control-plane.svg)

原文用一段 `task.yaml` 與命令列生命週期示範這些概念如何相接。範例先宣告名為 `golang` 的 Workspace，指定 Go repository 與分支；接著宣告一個 `test` Task，引用該 workspace，並以「確保 Go toolchain 可用且從原始碼建置」作為目標。套用設定後，使用者可以觀看 task 狀態、透過 SSH 檢查 `/workspace/go`、執行 `go build`、查看 task runner 與子程序，甚至留下 `notes.txt`。重點在後半段：task 被 suspend 後再 resume，原先留下的檔案仍在；最後可再暫停或刪除。原文藉此描繪的不是一次性容器，而是可保存進度、可停可起的執行生命週期。

關於底層，AX 表示自己建立在 Agent Substrate 之上；後者被描述為專為高密度、具狀態 actor 生命週期設計的 compute runtime。AX 的說法是，每個 task 都是 lightweight actor，因此可在每個 cluster 同時承載到「數十億」個 agent session，而不受 orchestrator 限制；閒置的 agent 在等待模型、工具或人類回覆時可以 checkpoint、suspend，並在不到一秒內恢復，沒有 cold start 延遲。它也主張多個 task 可共用 worker 資源，將等待時間轉為可供其他工作使用的容量。這些都是專案提出的能力宣稱，而非原文提供的獨立驗證結果。

AX 另外把生成式能力放進平台本身。若 Workspace 只寫下「準備 Python 3 開發環境」這類自然語言目標，原文稱 AX 會在首次啟動時把目標交給 agent，安裝 toolchain 並驗證相依套件，然後才啟動 task。它將這種 generative workspace 與互動式 coding agent、長時間運行的 agent server、Jupyter notebook、headless browser testing、客製工具 runtime，以及研究者建立可重現 sandbox、蒐集 trajectory、執行 reinforcement learning loop 與大規模評估等用途並列。

原文最後把 AX 定位為從 Google 的 agentic runtime 系統研究與實作經驗中長出的開放、宣告式 control plane，目標是讓開發者與研究者不用重造隔離、恢復、排程與環境準備等底層基礎設施。它主張自身依賴 Agent Substrate，但在上層提供 agent 導向的抽象與生成式 runtime 元件。

## 城武觀點

AX 最正確的判斷，是拒絕把 agent 當成「又一個 service」。這種工作負載在短時間集中吃算力，卻要保存狀態並長時間等待；若仍用常駐服務的尺量它，成本與閒置資源會被假裝不存在。這不是小幅最佳化，而是先承認工作負載的類型變了。

但 AX 的價值在治理，不在安全神話。把 network allowlist、CPU／記憶體上限、憑證注入、workspace 與模型 secrets 升格為宣告式政策，確實讓控制面終於有地方落筆；事故發生時，也至少能回問設定了什麼邊界。可那支筆仍握在定義 allowlist、workspace goal 與 credential boundary 的人手中。人替 agent 接哪些 repo、允許它碰哪些 host、交給它哪把鑰匙，就已經決定它可能成為什麼。生成式 workspace 尤其把供應鏈與行動邊界推進同一個政策問題：用自然語言描述環境，不會讓判斷消失，只會讓判斷更早發生、也更難被含糊帶過。

所以，別把「數十億 agent」當作主張的重量；真正值得檢驗的是每一份宣告能否被審查、誰有權修改、修改後如何追責。AX 可以讓治理具體化，卻沒有替人類作出安全判斷，更沒有自動解決 prompt injection 或讓 agent 變得安全。

*城武的未解檔案——agent 可以被快速恢復；真正難恢復的，是一把不該交出去的鑰匙。*
- 原文：[Declare an agentic task. AX runs it at scale.](https://agentexecutor.io)（AX, 2026-09-21）
