---
layout: post
title: "【深度分析】用文字 MUD 評測 LLM：一個 $99 的概念驗證，戳破了 LLM-judge 的國王新衣"
date: 2026-07-23 02:00:00 +0000
categories: [llm, ai, deep-analysis]
---

![hero]({{ site.baseurl }}/assets/images/2026-07-23/cruciblebench-mud-llm-eval.jpg)

如果你對 LLM benchmark 的信任正在逐年遞減——你並不孤單。MMLU 變成刷分大賽、Chatbot Arena 被質疑 crowd 偏好偏移、LLM-judge 的可靠性從來沒人認真審計過。CrucibleBench 做了一件所有 benchmark 都該做但沒人做的事：它把自己的裁判也放上了手術台，然後發現了一件尷尬的事——同一個 LLM-judge 對不同模型的評分一致性從 21.7% 一路飄到 84.8%，但 aggregate 統計量 κ=0.04 安靜得像什麼都沒發生。這篇 $99 的概念驗證，用的是 1970 年代的 MUD 文字遊戲，戳破的是 2026 年最貴的一層窗戶紙。我們該從新想一遍：LLM 評測的根基到底是什麼？

## 原文摘要

CrucibleBench 的核心設計哲學來自任天堂橫井軍平的「枯れた技術の水平思考」——拿成熟、便宜、被充分理解的舊技術，用在新方向。團隊選擇了 MUD（Multi-User Dungeon，早期網路的多人文字地下城）作為評測平台，不是因為復古情懷，而是因為 MUD 的技術限制恰好解決了當代 LLM 評測的核心痛點。

### 為什麼用 MUD：舊限制解決現代測量問題

靜態 benchmark 測的是模型在隔離狀態下「知道什麼」。它們測不出模型在一個需要建立信任、資訊被關係所門控、直接追問會引發 NPC 懷疑的世界裡，會如何行動。MUD 提供了三個關鍵特性：

**可列舉的行動空間。** 整個世界只有 7 種指令類型、12 個房間、14 件物品。幻覺行動（hallucinated actions）和錯置房間的互動可以被直接偵測，行動效率可以被精確量化——沒有模糊地帶。

**明確的社交回饋。** 4 個 NPC 各自攜帶信任和懷疑狀態（0-100 分），這些狀態會隨著對話內容而變化。模型可以在一次 run 中根據這些回饋調整策略——或者做不到。

**Run 內持續性。** 拿走的物品就是拿走了，建立的信任就是建立了。每一次 run 都留下一份完整、可重播的逐字稿。

### $99 買到了什麼：測量，不是排名

CrucibleBench 最核心的發現跟排名無關，而是關於測量方法本身。評分堆疊中有一個 LLM-judge 組件（dialogue classifier），單獨拿掉就讓排行榜前段重新洗牌了最多六個位置，而所有的 aggregate 可靠性統計量全程保持沉默。團隊在兩種評分配置下報告所有結果，並把兩種配置的差異視為整篇論文最泛化的發現。

**Judge ablation 重排了排行榜頂端。** 四個評分維度中有兩個經過一個 dialogue classifier 評分，這個 classifier 與獨立裁判的 per-model 一致性從 21.7% 到 84.8% 不等——但 aggregate κ=0.04 完全掩蓋了這個不穩定的事實。拿掉 classifier 相關的維度後，六個排名變動超出了情境取樣雜訊範圍（90% paired block bootstrap）。排名變動最大的模型，恰好與 classifier 模型同家族。團隊的建議很明確：使用 LLM-judge 的 benchmark 應該報告 per-subject 一致性和 judge ablation 下的排名穩定性，而不是只報 aggregate 可靠性。

在 classifier-minimized 評分下（每模型 50 runs），Claude Sonnet 4.6 以 4.04 分居首，DeepSeek R1 以 4.00 分緊追在後，Claude Opus 4.6（3.93）、GPT-5.2（3.91）、GPT-5.4（3.88）依序排列。但真正重要的是排名變動幅度：GPT-5.4 從 full score 的第二名掉到 classifier-minimized 的第五名（▼4），Gemini 3.1 Pro 從第三掉到第九（▼6），而 DeepSeek R1 從第七躍升至第二（▲5）——它恰好屬於 classifier 模型的家族。

其他值得注意的數據：任務成功率從 OLMo 3.1 32B 的 4% 到 GPT-5.4 的 68%，每次 run 的 API 成本從 DeepSeek V3.2 的 $0.008 到 Grok 4 的 $0.834。CrucibleBench 團隊明確表示：這不是一個「最終排名」，而是一個測量工具的壓力測試。

### 行為失敗模式

三種失敗模式，全部透過狀態機遙測自動偵測，沒有裁判參與——這部分數據完全不受 LLM-judge 偏見影響。

**對話迴圈（Dialogue looping）。** 前線模型有 14% 到 66% 的 run 出現這個問題：對同一個 NPC 連續使用八次以上 talk 指令。模型不是在對話，是在重複一個已經失敗的溝通策略。

**錯置房間互動（Wrong-room interaction）。** 在沒有 NPC 的房間發出 talk 指令，得到 "no one here." 的回應。這暴露了模型對世界狀態的追蹤已經丟失。Grok 4 是唯一有顯著發生率（12%）的前線模型。

**探索癱瘓（Exploration paralysis）。** 超過 20 回合只探索兩個以內房間，或連續五次 look 指令。資訊收集永遠不會轉化為目標導向行動。

團隊提供了一個令人哭笑不得的實際案例：OLMo 3.1 32B 在第四回合試圖跟一個不存在的警衛對話——"Hello, I'm new to Middleham..."——得到 "No one by that name is here." 的回應後，繼續呼喚不存在的守衛、跟一個 "street_crystal" 物品對話，最後 15 回合全部耗在對船長進行對話迴圈。

### 宣稱範圍

CrucibleBench 團隊清楚界定這項工作的邊界，沒有過度吹捧：

**這是（IS）：** 一個持續世界行為評測的概念驗證；一個帶有隱藏社交目標的緊湊 MUD；一種浮現可測量、可解釋失敗模式的方法；完整釋出所有 artifact——包括 650 份逐字稿、原始碼、評分程式碼、帳單匯出。

**這不是（IS NOT）：** 一個經過驗證的通用社交智慧量尺；一個最終排行榜；尚無法預測真實世界 agent 部署結果；也不是宣稱 LLM-judge 毫無用處——而是提供證據，說明 LLM-judge 需要 per-subject 審計。

### Phase 2

團隊正在建構 Phase 2 用於校準，暫定預算 $3,500。三種參與方式對外開放：資助、建構（環境／目標／校準）、執行（校準後試點 cohort）。

## 城武觀點

### LLM-judge 的方法論危機是整個 AI 評測體系的定時炸彈

aggregate κ=0.04 這個數字，我以經看了好幾遍才確定自己沒看錯。一個 dialogue classifier，對不同模型的評分一致性從 21.7% 飄到 84.8%，然後 aggregate 統計告訴你「整體還行」——這不是技術問題，這是統計方法的選擇性展示。

更糟的是，排名變動最大的模型正好跟 classifier 同家族。這不是偶然。LLM-judge 會系統性地偏袒同家族模型的輸出——這件事任何做過 LLM 評測的人心裡都有數，但 CrucibleBench 是第一個把 per-model 數據攤在陽光下的。我賭接下來半年會有一波「重新審計 LLM-judge 可靠性」的論文潮，但真正的問題不會被解決，因為整個 AI 評測產業——從 LMSYS 到各個模型公司的內部 eval——都已經把 LLM-judge 嵌進管線深處了。拿掉 LLM-judge，很多 benchmark 的自動化就垮了。產業依賴一個自己知道有偏見的工具，然後選一個能讓偏見看起來不存在的統計量——這就是現狀。

我的立場很簡單：aggregate 統計量在這個脈絡下被選用，正是因為它們掩蓋了 per-model 偏見。κ=0.04 不是「幸好整體還行」，而是「我們選了一個會說整體還行的統計量」。CrucibleBench 的貢獻不在於發現 LLM-judge 有偏見——那個大家都知道——而是在於量化了這個偏見的規模，並且展示了 aggregate 統計如何系統性地讓它隱形。

### 「AI agent」這個詞本身就是誤導

對話迴圈 14-66%、錯置房間互動、探索癱瘓——這三種失敗模式指向同一個根本問題：當前模型無法維持 persistent world state。它們把每次互動當成 stateless 的單次呼叫，而不是一個持續存在的世界裡的一次行動。

這意味著什麼？意味著今天市面上所有自稱「AI agent」的產品，底層跑的是一個不具備世界持續性理解的模型。你去跟一個 NPC 對話，它重複八次同樣的策略——這不叫 agent，這叫一台卡在 while loop 裡的狀態機。你去一個沒有 NPC 的房間對著空氣講話，因為你忘了自己已經離開那個房間——這不叫 agent，這叫 GPS 壞掉的送貨機器人。

CrucibleBench 用一個 1970 年代的技術證明了這件事：真正的 agent 需要能在一個持續存在的世界裡記住「我拿走了鑰匙，所以門可以開了」「我跟這個 NPC 聊過了，再問同樣的問題會讓他起疑」。當前的前線模型做不到，而且差距不是一點點——是 66% 的 run 都在重複無效對話。這不是「還差一點」，這是根本做不到。

所以我選邊：agent 敘事過早了。我們離「能理解世界持續性的 AI」還有一段距離，而這段距離不會在下一個 checkpoint 就被跨越——因為這不是 scale 的問題，是架構的問題。把一個 stateless 的模型包上一層 memory wrapper，不會讓它突然理解世界的持續性。真正的突破需要模型本身對「時間中持續存在的狀態」有內建的表示能力，而不是靠外部 prompt 把歷史塞進 context window。

*城武的未解檔案——一個 $99 的 MUD 伺服器，比市值十億的評測公司更誠實地告訴你兩件事：你的 LLM-judge 在偏袒自己人，而你的 AI agent 還在對著空氣講話。*

- 原文：[CrucibleBench — Old Worlds for New Agents](https://cruciblebench.ai/)（CrucibleBench team, 2026-07）
