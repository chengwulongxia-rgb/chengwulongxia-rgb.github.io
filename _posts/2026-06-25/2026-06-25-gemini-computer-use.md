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

Google 表示，這項整合讓 3.5 Flash 在長時序任務（long-horizon）和企業自動化場景中表現更好，例如持續性的軟體測試、跨專業應用程式的知識工作（knowledge work across professional applications）等。開發者和企業可以透過 Gemini API 和 Gemini Enterprise Agent Platform 開始使用。

部落格文中舉了兩個實際應用案例：3.5 Flash 利用 computer use 分析 Gemini App 的功能，回傳一份分類清單；以及讓模型審核自己的文件（documentation），檢查是否存在無障礙（accessibility）問題——模型自己看自己的文件、自己找出問題，等於示範了「後設代理」的情境。

安全措施方面，Google 採取了所謂「縱深防禦」（defense-in-depth）的策略。首先，針對 agent 在實際環境中運作時的 prompt injection 風險，他們對 computer use 模型進行了針對性的對抗性訓練（adversarial training）。此外，Google 釋出了兩個可選的企業級安全防護系統（enterprise safeguard systems）：第一，針對敏感或不可逆的操作，要求明確的使用者確認（explicit user confirmation）；第二，當偵測到間接 prompt injection（indirect prompt injection）時，自動停止任務。Google 同時鼓勵開發者將這些機制與安全的沙箱環境（sandboxing）、人機協同驗證（human-in-the-loop verification）、嚴格的存取控制（strict access controls）搭配使用，強調這是多層防護而非單一機制。

早期採用者方面，Browserbase 的 Migual Gonzalez Fernandez、Browser Use 的 CEO Magnus Muller、以及 UiPath 的 Senior Director Alvin Stanescu 都在文中分享了正面評價。入門方式包括：透過 Browserbase 代管的 demo 環境（gemini.browserbase.com）直接試用、參考 GitHub 上的參考實作（google-gemini/computer-use-preview），以及查閱 Gemini API 與 Enterprise Agent Platform 的文件。

## 城武觀點

這則公告最值得拆的，不是 3.5 Flash 的 computer use 跑分贏了多少（官方 blog 其實也沒放 benchmark），而是 Google 選了一條跟 Anthropic 和 OpenAI 都不一樣的路。

Anthropic 的 Claude Code 是外部工具——一個跑在 terminal 裡的獨立程式，透過 sandbox 呼叫 Claude 的 API。OpenAI 的 Operator 是獨立產品——自己的瀏覽器、自己的訂閱方案。Google 的做法是把 computer use 變成模型本身的內建功能：你不需要額外呼叫另一個 model，3.5 Flash 自己就會。這條路線的好處是 latency 更低、開發者體驗更順，代價是安全責任從「我們不釋出危險模型」轉移到了「讓你自己設柵欄」。那兩個 enterprise safeguard——使用者確認和 auto-stop——開關是企業自己決定的。對有完整安全團隊的大型企業可能沒問題，但中小企業買了授權叫工程師「先串起來再說」時，這套 defense-in-depth 與其說是防護，不如說是出事後以經寫好的免責聲明。

時間點也值得留意。這週 Anthropic 的 Claude Code 在 agentic coding 主導地位穩固，OpenAI 忙著做晶片，Google 選在這時把 built-in computer use 推到生產環境，不是技術發布，是戰術宣告：agent OS 這場仗不是只有兩家在打。當 computer use 變成模型的內建能力而非外部服務，你從根本上改變了開發者對 agent 架構的思考方式——以後不是「我要選哪個 agent 產品」，而是「我要選哪個模型，它本身就附帶 computer use」。整合路線減少了一層工具呼叫的 overhead，但把所有雞蛋放在模型自己的判斷力裡。從安全到可靠性，這都是一個高風險的賭注——但從 platform 策略的角度來說，也是唯一合理的賭注。

*城武的未解檔案——當模型可以直接替你按按鈕的時候，「我不小心按到的」就不再是藉口，而是產品設計的漏洞。*

- 原文：[Introducing computer use in Gemini 3.5 Flash](https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-computer-use-gemini-3-5-flash/)（Mateo Quiros, Google DeepMind, 2026-06-24）
