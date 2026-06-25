---
layout: post
title: "【深度分析】Google 把 computer use 塞進模型本體——Gemini 3.5 Flash 的整合路線意味著什麼"
date: 2026-06-25 01:00:00 +0000
categories: [llm, ai, deep-analysis]
---

![hero]({{ site.baseurl }}/assets/images/2026-06-25/gemini-computer-use.jpg)

Google DeepMind 的產品經理 Mateo Quiros 在 6 月 24 日於官方部落格宣布，computer use 功能已從原本的 standalone 模型（Gemini 2.5 Computer Use）整合進 Gemini 3.5 Flash 的本體之中。公告篇幅不長，但這則消息在這個時間點的戰術意義，可能比表面上看起來更大——它不是一個新模型發布，而是一個 platform 策略的確認。

## 原文摘要

Google 宣布 computer use 現在是 Gemini 3.5 Flash 的內建工具（built-in tool），開發者可以直接透過這個模型來構建能夠「看見、推理、行動」的 agent——橫跨瀏覽器、行動裝置與桌面環境。在此之前，computer use 僅作為一個獨立的 Gemini 2.5 模型存在，開發者必須額外呼叫它才能讓 agent 擁有螢幕操控能力。Gemini 原本就已經擅長 function calling 以及 Search、Maps 等內建工具的使用，現在加上 computer use，等於補齊了 agent 最關鍵的「最後一公里」——直接與使用者介面互動。

Google 表示，這項整合讓 3.5 Flash 在長時序任務（long-horizon）和企業自動化場景中表現更好，例如持續性的軟體測試、跨專業應用程式的知識工作等。

開發者和企業可以透過 Gemini API 和 Gemini Enterprise Agent Platform 開始使用 3.5 Flash 的 computer use 功能。

部落格文中舉了兩個實際應用案例：3.5 Flash 利用 computer use 分析 Gemini App 的功能，並回傳一份分類清單；以及讓模型審核自己的文件（documentation）是否存在無障礙（accessibility）問題。

**安全措施方面**，Google 採取了所謂「縱深防禦」（defense-in-depth）的策略。首先，針對 operating in live environments 的 prompt injection 風險，他們對 computer use 模型進行了對抗性訓練（adversarial training）。此外，Google 釋出了兩個企業級的安全防護系統（enterprise safeguard systems），讓企業可以選擇開啟：

- 針對敏感或不可逆的操作，要求明確的使用者確認（explicit user confirmation）。
- 當偵測到間接 prompt injection（indirect prompt injection）時，自動停止任務。

Google 同時鼓勵開發者將這些機制與安全的沙箱環境（sandboxing）、人機協同驗證（human-in-the-loop verification）、嚴格的存取控制（strict access controls）搭配使用。

**早期採用者方面**，Browserbase 的 Migual Gonzalez Fernandez、Browser Use 的 CEO Magnus Muller、以及 UiPath 的 Senior Director Alvin Stanescu 都在文中分享了正面評價。

入門方式包括：透過 Browserbase 代管的 demo 環境（gemini.browserbase.com）直接試用、參考 GitHub 上的參考實作（google-gemini/computer-use-preview），以及閱讀 Gemini API 與 Enterprise Agent Platform 的文件。

## 城武觀點

這則公告最值得拆的，不是 3.5 Flash 的 computer use 跑分贏了多少（官方 blog 其實也沒放 benchmark），而是 Google 選了一條跟 Anthropic 和 OpenAI 都不一樣的路。

Anthropic 的 Claude Code 是外部工具——它是一個跑在 terminal 裡的獨立程式，透過 sandbox 呼叫 Claude 的 API，讓模型操控檔案系統和 shell。OpenAI 的 Operator 則是獨立產品——一個自己的瀏覽器、自己的介面、自己的訂閱方案。Google 的做法反而不是「我們做了一個新產品」，而是「我們把這個能力變成了模型本身的內建功能」。你不需要額外呼叫一個 computer use model，不需要切換服務，3.5 Flash 自己就會。

這條路線的好處很明顯：latency 更低，開發者體驗更順，因為 agent 不需要在「思考」和「看螢幕」之間反覆切換模型。但代價是把更多的控制權交給了模型本身。當一個模型可以原生地操控你的桌面——點按鈕、填表單、讀畫面上的任何文字——safety 的定義就從「模型不該說什麼」變成了「模型不該做什麼」。這兩個問題的難度不在同一個數量級。前者是 output filter 的問題，後者是一個 permission model 的問題。Google 的 adversarial training 加上兩層 enterprise safeguard，在 paper 上看起來很完整，但仔細想，這些防護的開關是交給企業自己決定的——使用者確認可以關掉，auto-stop 的 threshold 可以調。也就是說，安全責任從「我們不釋出危險的模型」轉移到了「讓你自己設柵欄，撞到了是你的事」。

這在以經有完整安全團隊的大型企業眼裡可能沒什麼問題。但那個沒有專門 security team 的中小企業呢？那個買了 Gemini Enterprise 授權、叫工程師「先串起來再說」的新創團隊呢？Google 這套 defense-in-depth 對他們來說，與其說是防護，不如說是「出事之後的免責聲明」。

時間點也值得留意。這週 Anthropic 的 Claude Code 正以經在 agentic coding 領域佔據主導地位，開發者圈把它當成事實上的標準；OpenAI 則忙著自己的晶片佈局，Operator 還在獨立產品的定位上打轉。Google 選在這個時間點把 built-in computer use 推到生產環境，與其說是技術發布，不如說是戰術宣告：agent OS 這場仗，不是只有你們兩家在打。當你把 computer use 變成模型的內建能力而不是外部服務，你從根本上改變了開發者對 agent 架構的思考方式——以後不是「我要選哪個 agent 產品」，而是「我要選哪個模型，它本身就附帶 computer use」。

這件事三個月後會怎麼展開，取決於誰能用最少的 overhead 讓 agent 真正穩定地完成複雜任務。Google 的整合路線減少了一層工具呼叫的 overhead，但把所有雞蛋放在模型自己的判斷力裡面。從安全到可靠性，這都是一個高風險的賭注——但從 platform 策略的角度來說，也是唯一合理的賭注。

*城武的未解檔案——當模型可以直接替你按按鈕的時候，「我不小心按到的」就不再是藉口，而是產品設計的漏洞。*

- 原文：[Introducing computer use in Gemini 3.5 Flash](https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-computer-use-gemini-3-5-flash/)（Mateo Quiros, Google DeepMind, 2026-06-24）
