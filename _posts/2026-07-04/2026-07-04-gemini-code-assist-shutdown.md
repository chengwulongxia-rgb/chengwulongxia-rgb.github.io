---
layout: post
title: "【深度翻譯】Google Gemini Code Assist 消費者版關閉，整合進 Antigravity"
date: 2026-07-04 01:00:00 +0000
categories: [llm, ai, deep-translation]
---

![hero]({{ site.baseurl }}/assets/images/2026-07-04/gemini-code-assist-shutdown-hero.jpg)

Google 宣布要把 Gemini CLI 和 Gemini Code Assist 消費者版「整合」進 Antigravity 平台——但如果你真的讀完官方公告，就會發現這不是整合，是砍產品。Gemini CLI 在宣布當天立刻死亡，Code Assist 消費者版只有不到一個月的遷移窗口，而接班人 Antigravity CLI 自己都承認「沒有 1:1 功能對等」。這是一堂經典的科技巨頭公關課：用「為了服務你更好」來包裝「我們不想維護這個產品了」。

## 原文翻譯

2026 年 6 月 17 日，Google 透過開發者部落格宣布，將終止 Gemini CLI 和 Gemini Code Assist for GitHub 的消費者版本，把所有開發資源集中到新的 **Antigravity** 平台——一個以 agent 為核心的開發環境。Google 的說法是，用戶的需求以經從單一終端機指令，轉向多 agent、非同步的協作工作流，因此需要一個全新的基礎架構來承接。官方的原話是：

> 「Gemini CLI 證明了終端機可以成為 agentic 任務的絕佳介面，但你們的需求已經改變了。……聆聽你們的回饋讓我們清楚了一件事：把我們的精力投入一個為今日多 agent 現實而打造的單一產品，才能最好地服務你們。」

這次關閉的時間線非常緊湊，甚至可以說粗暴。**Gemini CLI** 在 6 月 18 日——也就是宣布的隔天——立即關閉，沒有任何緩衝期。同一天，Gemini Code Assist for GitHub 消費者版停止新安裝。根據 Google 另一份支援頁面的說明，Code Assist 消費者版將在 **7 月 17 日**完全關閉，屆時「該應用程式執行的所有程式碼審查活動」都將終止。換句話說，從宣布到徹底死亡，使用者只有不到一個月的時間可以因應。

企業版 Gemini Code Assist for GitHub 不受任何影響，維持原樣運作。Google 明確表示，這次變動只針對個人／免費層級的消費者用戶。如果你是付費的企業客戶，一切照舊。

那麼接班人是誰？Google 的答案是 **Antigravity CLI**。官方將其定位為更現代化、更強大的替代品，強調它速度更快、原生支援多非同步工作流，並且與 Antigravity 桌面應用程式（Antigravity 2.0）和伺服器端執行環境共享統一後端。根據官方過渡公告：

> 「我們正在將所有努力統一到 Google Antigravity，這是我們首屈一指的 agent-first 開發平台，包含強大的伺服器端執行環境和全新的終端機體驗：Antigravity CLI。」

目前 Antigravity CLI 已保留的功能包括 Agent Skills、Hooks、Subagents 和 Extensions。但 Google 同時坦承了一個關鍵事實——Antigravity CLI **目前尚未達到 1:1 的功能對等**。這不是「有些功能還在開發中，很快就會補上」的語氣，而是一個平靜的事實陳述：新工具的功能比舊的少，但舊的就要關了。

Gemini CLI 原本的官方介紹頁面（現已轉向 Antigravity）展示的願景是：「使用 Gemini 3 從終端機查詢和編輯大型程式碼庫、從圖片或 PDF 生成應用程式、以及自動化複雜的工作流程。」這些能力在 Antigravity CLI 上能保留多少，Google 沒有給出具體承諾。

Google 將這次決策框架定調為「統一」——把分散在 Gemini CLI、Code Assist 等多個產品的開發能量，集中到 Antigravity 這個單一平台上。背後的邏輯是：與其讓多個產品各自發展，不如集中火力打造一個能覆蓋所有場景的 agent-first 平台。

附帶一提，Google 在同一週還宣布了阿拉巴馬州 15 億美元的資料中心擴建計畫，以及 Gemini 3.5 Flash 在 Android 編碼基準測試中的表現——效能不錯，但成本是三倍、速度更慢。這些與關閉事件本身沒有直接關聯，但拼在一起看，Google 的 AI 基礎設施仍在高速擴張，只是消費者端的開發工具正在被重新洗牌。

## 城武觀點

先把話說清楚：這不是整合，這是砍產品。當一家公司告訴你「我們要把 A 和 B 整合成 C」，但 C 的功能還不如 A，而且 A 和 B 在使用者還沒反應過來之前就被關掉了——那不叫整合，那叫產品安樂死。不要被「為了服務你更好」這種 PR 語言騙了。

「沒有 1:1 功能對等」這句話本身就是整篇公告裡最誠實的一句，也是最大的紅旗。Google 沒有說「我們正在努力達到對等」，沒有給時間表，沒有列 roadmap。它只是平靜地陳述一個事實：新東西功能比較少，舊東西要死了，請你搬家。這不是產品升級，這是降級通知。

第二個讓人惱火的是時間線。Gemini CLI 在宣布當天直接關——連一個「請在 X 日之前匯出你的設定」的禮貌性緩衝都沒有。Code Assist 給你不到一個月。如果你是那個在 Gemini CLI 上寫了一堆自動化腳本、把 Code Assist 嵌進團隊 code review 流程的開發者，你現在的感覺不是「哦有新玩具可以玩」，是「我被突襲了」。一個負責任的產品 sunset，最低限度應該給使用者足夠的時間評估替代方案、遷移工作流。Google 連這個最低限度都沒做到。

Google 的理由是「用戶需求轉向 multi-agent 和非同步工作流」。我幫你翻譯成白話：我們不想繼續維護兩個消費級產品了。Antigravity 是內部優先級最高的新專案，資源全部灌過去，舊的、免費的、維護成本高但營收貢獻為零的，全部砍掉。這是典型的科技巨頭產品組合清理，跟用戶需求沒有半毛錢關係——如果真的是為了滿足用戶需求，你會先讓新產品功能到位再關舊的，而不是反過來。

注意一個細節：企業版不受影響。這告訴你故事真正的結構——付錢的人不會被打擾，免費用戶請自求多福。我並不反對公司對免費產品做成本控管，但我反對用「為了服務你更好」這種話術來美化一個純粹的商業決策。Google 大可以直接說：「這兩個產品的消費者版使用率不如預期，我們決定把資源集中在 Antigravity。」誠實不會讓使用者高興，但至少不會讓使用者覺得你在侮辱他們的智商。

我賭一件事：三個月後，Antigravity CLI 的功能仍然不會達到 Gemini CLI 的水準，但沒有人會再追究了——因為舊產品已經死了，你別無選擇。這就是科技巨頭 product sunset 的標準 SOP：先關門，再慢慢蓋新房子，然後告訴你「這是為了讓你有更好的居住體驗」。Google 過去二十年用這招處理過無數產品，從 Google Reader 到 Inbox，劇本從來沒換過。

*城武的未解檔案——「整合」這個詞在科技公司的字典裡，意思是「舊的那個不維護了，新的那個還不能用，但你可以先說謝謝」。*

- 原文：[Gemini CLI and Code Assist shut down for consumers this week](https://9to5google.com/2026/06/17/gemini-cli-code-assist-shutting-down/)（Ben Schoon, 9to5Google, 2026-06-17）
