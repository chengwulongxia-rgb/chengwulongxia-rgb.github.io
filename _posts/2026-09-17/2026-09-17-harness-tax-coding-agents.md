---
layout: post
title: "【深度分析】同一個模型，為何可能多付五倍帳單？HarnessTax 拆開 coding agent 的隱形稅"
date: 2026-09-17 04:00:00 +0000
categories: [llm, ai, deep-analysis]
---
![hero]({{ site.baseurl }}/assets/images/2026-09-17/harness-tax-coding-agents.jpg)

大家比較 coding agent 時，通常先問模型是 Claude 還是 GPT，接著看它能不能解題；但模型從來不是獨自工作的。它需要一套 harness 管理工具、塞進上下文、執行命令、決定下一輪怎麼跑。HarnessTax 把同一批模型放進 Claude Code、Codex CLI 與 Pi，問題問得很不客氣：若解題率差不多，使用者究竟是在為模型付費，還是在為預設工作流付費？

## 原文摘要

### 不是只在選模型，也在選 harness

原文先界定 coding agent 的結構：語言模型提供核心推理能力，harness 則是包住模型的軟體系統，負責管理工具、上下文與任務執行。於是，使用者即使表面上只是在選模型，實際上也同時選了 harness。已經有數百萬人使用 coding agent，但相同模型換一套 harness，是否能做更多事或更省錢，影響仍不清楚。

研究團隊因此評估 21 組「模型 × harness」配對：七個模型各自搭配 Claude Code、Codex CLI、Pi 三種 harness，測試基準為 SWE-bench Lite 與 Terminal-Bench 2.0。作者強調，下列結論只針對這兩個開源 benchmark；結果概括起來有三點：harness 對成功率的影響不大，卻可能大幅改變成本；功能極簡的 Pi 仍有競爭力；模型在其他家的 harness 上，未必比在自家環境差。

圖表以每個模型—harness 點位的平均 token 成本與成功率呈現結果。每個點由 30 個隨機抽樣任務、每題重複三次組成；階梯線表示在某成本以下所觀察到的最高成功率，也就是成本—成功率的 Pareto frontier。另一張累積曲線則把完成的嘗試由便宜排到昂貴，逐一累積成本與成功；失敗嘗試會增加成本、卻不增加成功數，曲線使用九點移動平均，端點則與第一張圖一致。

### 發現一：harness 比較明顯地改變花費，而非正確性

作者首先發現，同一模型在不同 harness 裡往往能取得相近的成功率，成本卻可相差很大。兩個 benchmark 中，GPT-5.6 Luna 的成本最低；在 SWE-bench Lite，Claude Fable 5 的成功率最高。開放權重的 Kimi K3 在 SWE-bench Lite 靠近 GPT-5.6 Sol 所在的 Pareto frontier；在 Terminal-Bench 2.0 則略低於前緣。

關鍵不在這些模型彼此的名次，而在同一模型跨 harness 時沒有顯著的成功率落差。以 Claude Fable 5 為例，它在 Claude Code 的成功率為 97.8%，在 Codex 與 Pi 都是 96.7%；但 Claude Code 約花 1.33 美元，Pi 約 0.67 美元，前者幾乎是後者兩倍。

作者再以共同模型的成本比率幾何平均來看：SWE-bench Lite 上，Claude Code 的成本約為 Pi 的 2.0 倍、Codex 的 1.6 倍；Terminal-Bench 2.0 上，Claude Code 約為 Pi 的 1.5 倍。相對地，harness 對平均成功率的影響，在 SWE-bench Lite 落在正負 2% 內，在 Terminal-Bench 2.0 約為正負 5%。原文把這種為近似品質多付出的錢稱為「Harness Tax」：使用者若不比較替代方案，直接接受 agent 的預設 harness，就可能默默繳了這筆稅。作者因此主張，模型評測不該只列任務成功，還應比較同一模型在常見 harness 下的成本與成功率。

### 發現二：工具很少的 Pi 仍能站上前緣

Pi 是一個極簡、開源的 harness，只提供 read、write、edit、bash 四種工具，卻能在兩個 benchmark 的成本—成功率前緣上競爭。為了找出設計如何影響支出，研究者檢查成功嘗試的成本、記錄到的回合數，以及第一個主要模型呼叫時所帶入的上下文。

以 SWE-bench Lite 的 Fable 5 為例，Pi 每次嘗試平均 15.4 回合，Claude Code 是 15.3 回合，幾乎相同；但 Claude Code 以約兩倍成本換到的成功率增幅只有 1.1%。作者據此指出，差別在於每個被記錄回合所花的錢更高；不過他們也保留但書：不同 harness 對「一回合」的定義並不完全一樣。

成本可能在第一個模型呼叫前就開始拉開。SWE-bench Lite 的第一輪主要呼叫統計中，作者量測指令與工具 schema 的字元長度，以及供應商回報、包含任務 prompt 的初始輸入 token。跨越七個模型，Claude Code 的平均初始上下文超過 Pi 的十倍，原因是前者有更長的指令與更大的工具 schema。這些額外上下文會推高成本，但總支出還會受到快取、生成 token 與後續呼叫影響，不能只用第一輪解釋全部差距。

原文並未把「簡單一定更好」說成定論。Pi 與 Codex 的表現顯示，研究者即使沒有專有 harness 或模型共同訓練的存取權，也能以既有模型研究先進 coding harness；但較豐富的功能仍可能在其他模型、工作負載或互動情境有利。harness 複雜度應被當成可實驗檢驗的取捨，而非預設的優點。

### 發現三：自家模型不保證自家 harness 最佳

模型供應商可能會針對自家 coding 環境最佳化模型。原文以 OpenAI 為例：它曾描述 GPT-5-Codex 是為 Codex 的軟體工程工作最佳化。但這種供應商專屬最佳化，沒有保證最佳配對一定留在自家產品裡。

在六個 Anthropic 與 OpenAI 模型、兩個 benchmark 的 12 個比較中，有 9 個比較裡，最高觀察成功率出現在替代 harness。SWE-bench Lite 上，Sonnet 4.6 在 Codex 的成功率為 68.9%，高於 Claude Code 的 66.7%，成本則相近。Terminal-Bench 2.0 上，GPT-5.6 Sol 在 Pi 的成功率是 83.3%，高於 Codex 的 78.9%，成本約為一半：0.42 美元對 0.76 美元。

作者的解讀是：模型能力能相容並遷移到其他 harness；同一家供應商，並不保證產出最佳組合。真正實務上的問題，仍是針對某一模型與某一工作負載，哪一個 harness 給出最好的成本—任務成功平衡。

### 結論、邊界與下一步

作者總結，在所測 benchmark 上，同一模型可以用大不相同的成本取得相近成功率；簡單的開源 harness 有競爭力，模型也能在非自家 harness 表現良好。若評估只盯著任務成功率，harness tax 很容易被遮住。整體而言，Pi 和 Codex 常以低於 Claude Code 的成本取得相近成功率。

但這不是對所有實際開發工作的普遍判決。研究只測 SWE-bench Lite 與 Terminal-Bench 2.0，兩者都是開源 benchmark，模型也可能在訓練中見過它們；其他 benchmark 與工作負載可能得出不同結果。原文也提到，先前關於 retrieval agent 的研究早已顯示，模型與系統設定要一起選。對 coding agent 而言，下一步應是在真正的開發流程中評估與自動選擇 harness：需求會改、開發者會回饋，任務也會跨越多個 session。

作者最後把 harness 的角色分成兩種情境。日常工作裡，它主要是模型智慧的介面，處理上下文、工具存取與任務執行；隨模型變強，今日許多鷹架可能不再必要，所以通用 coding agent 應優先追求成本效率與可靠性。至於處在模型能力邊界的困難問題，例如科學發現，agent 可能仍受益於有結構的引導，用來探索想法、評估候選答案並從回饋中學習。理想中的新 harness，不應逼使用者自己做配置選擇，而是隨任務演進調整，同時維持通用性。

原文提供了引用格式，將此計畫列為 Pan 等人的 2026 年 HarnessTax。致謝部分說明，實驗運算與 API 存取獲得 Amazon AI Fellowship、Arena、Laude Institute 等支持；Sky Lab 的開放研究也受到多家企業捐助。文末引用包含 Claude Code、Codex agent loop、SWE-bench Lite、Terminal-Bench、Pi README 與相關 retrieval agent、互動 session 評測研究等資料。

## 城武觀點

我站在「把模型和預設 workflow 拆開比」這邊。coding agent 的品牌體驗很容易讓人把長 context、工具 schema 與執行開銷，誤認成模型本身比較強；但這份測試裡，同一模型跨 Claude Code、Codex CLI、Pi 的成功率差異很小，成本卻可到五倍，真正該比較的是特定工作負載下的成本—成功率曲線，不是把整包產品的帳單算進模型神話裡。當然，這份結論只來自 SWE-bench Lite 與 Terminal-Bench 2.0，不能外推成所有真實開發工作；但正因如此，產品商更不該拿預設 workflow 的便利，偷換成模型能力的證明。

*城武的未解檔案——模型在寫程式，帳單裡真正加班的，可能是那套沒人拿來比較的 harness。*

- 原文：[HarnessTax: How Much Does the Harness Matter for Coding Agents?](https://harnesstax.github.io/)（Melissa Z. Pan、Shuo Yang、Negar Arabzadeh、Wei-Lin Chiang、Ion Stoica、Matei Zaharia, HarnessTax, 2026）
