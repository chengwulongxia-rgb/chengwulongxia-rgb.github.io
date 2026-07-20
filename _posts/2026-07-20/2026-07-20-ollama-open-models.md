---
layout: post
title: "【深度翻譯】Ollama 募資 $88M，喊出「開放模型的個人電腦時刻」"
date: 2026-07-20 03:00:00 +0000
categories: [llm, ai, deep-translation]
---

![hero]({{ site.baseurl }}/assets/images/2026-07-20/ollama-open-models.jpg)

如果你用過開放模型，你幾乎一定用過 Ollama。這家公司上週宣布完成 $88M 募資，喊出「開放模型的個人電腦時刻」——這句話背後是一整套我們十年前就看過的劇本。

## 原文摘要

Jeff 和 Michael 在大學認識，一起創辦了第一家公司 Kitematic，目標是讓 Docker「簡單到不行」。2015 年，Kitematic 被 Docker 收購，兩人的作品後來變成 Docker Desktop，2016 年推出，如今全球超過一千萬開發者在使用。

十年後，他們回來了，這次做的是 Ollama——讓開發者用最簡單的方式跑開放模型。Ollama 很快成為取得開放模型的主要平台，目前服務 890 萬開發者，這些人和他們一樣，相信 AI 應該是你自己的——你來建、你來跑、你來掌控。

### 個人電腦時刻

運算史上有過類似的轉折：個人電腦把機器從大型主機房搬到你桌上——你的機器，你擁有、你自訂、你在上面建造。Ollama 的創辦人認為，開放模型正在為 AI 實現這個時刻。

幾年前，強大的開放模型開始出現。它們可以自由下載，但要讓它們跑起來很困難。力量在那裡，但對於那些習慣透過 API 存取專有模型的開發者來說，這股力量還沒有被打開。所以他們動手了。團隊推出了 Ollama，一個你下載到電腦上的應用程式，一行指令就能跑最新開放模型，透過簡單的 API 就能在上面開發。

> Running an open model became as easy as running any other piece of software: no permission, API key, or expensive server hardware required. Your model. Your machine. Your data.

跑一個開放模型，變得跟跑任何其他軟體一樣簡單：不需要許可、不需要 API key、不需要昂貴的伺服器硬體。你的模型。你的機器。你的資料。

### AI 是你自己的：個人且私密

Ollama 圍繞三個對使用者與社群最重要的原則來打造：

**所有權（Ownership）。** 開放模型是你自己的——你留著、你自訂、你優化。你永遠不會被鎖在依賴的模型之外，你有完全的自由去改變它們。

**可負擔性（Affordability）。** 在自己硬體上跑的模型，不會有失控的 per-token 帳單。你可以實驗、迭代、上線，不用擔心每個 prompt 都在增加成本。

**隱私（Privacy）。** 開放模型可以在本地跑，你的資料永遠不用離開你的機器。當你需要擴展規模時，你可以把同樣的信任帶到雲端。

### 從個人實驗到 Fortune 500

開放模型以經不是實驗或研究專案了。它們現在跑在全球最大企業的內部——Ollama 被 85% 的 Fortune 500 公司使用——而這只是開始。

從第一次在自己電腦上跑開放模型的喜悅，演化成解決那些過去只有專有模型才能處理的困難問題。Ollama Cloud 是取得最強開放模型最愉快的方式：GLM、Nemotron、DeepSeek、Kimi、MiniMax 等等。平均來說，Ollama Cloud 的 token 量每月翻倍以上，團隊迫不及待要把它開放給所有團隊使用。

### 全員上車開放模型

Ollama 宣布已完成 $88M 募資，投資人包括 Benchmark 的 Peter Fenton、Theory Ventures 的 Tomasz Tunguz、8VC 的 Alex Kolicich，以及 Docker 創辦人 Solomon Hykes、ClickHouse CEO Aaron Katz、GIMP 共同創作者暨 Cockroach Labs 共同創辦人 Spencer Kimball、Amp CEO Quinn Slack、Cisco 董事會成員 Marianna Tessel、Twitter 前工程主管 Michael Montano，還有 Y Combinator、Garage Capital、Pace Capital、49 Palms、GTMFund 等機構與眾多天使投資人。

這筆資金是未來的燃料。Ollama 站在開放模型生態系的正中央，他們打算全力推進：無縫的混合推論（hybrid inference）、新開放模型發布當天就支援、以及一個讓任何開發者和團隊都能觸及最強模型卻不用放棄所有權或隱私的雲端平台。

創辦人感謝那些釋出強大開放模型的團隊——是他們推動了整個領域前進。「我們的工作，是讓他們的成果對每個人都能輕鬆跑起來，並且保持開放。」文章最後寫道：他們曾經站在類似轉折的起點，賭的是開放和簡單會贏。現在他們再次全押。

> It's time to drive open-source AI forward. All aboard.

是時候推動開源 AI 向前了。全員上車。

## 城武觀點

Docker 創辦人再次用同一套劇本，這件事本身就值得一篇文。

十年前，Kitematic 的口號是「讓 Docker 簡單到不行」。Docker Desktop 推出後，Docker 變成容器的事實標準——然後 licensing 開始收緊。先是 Docker Desktop 對大型企業收費，再來是 image pull rate limit，一步一步，從「開發者最好的朋友」變成「你遲早要付錢的基礎設施」。

今天 Ollama 的宣言裡，Ownership、Affordability、Privacy 三個原則都對——但它們是漏斗的口號，不是產品的承諾。Ollama Cloud 的 token 量每月翻倍，這才是 VC 下注的標的。Benchmark 的 Peter Fenton 不會因為「本地 CLI 很棒」就開 $88M 的支票。他賭的是 Ollama Cloud 變成開放模型的預設閘道，就像 Docker Hub 變成容器的預設倉庫。

選邊：我賭 Ollama 會在 18 個月內推出某種「企業級雲端功能」——可能是進階的混合推論排程、團隊協作權限、或是某種 model fine-tuning pipeline——這些功能只存在 Ollama Cloud 上。一開始會是「可選的」，然後變成「預設推薦」，最後變成「不用雲端你就少了什麼」。Docker Desktop 的 licensing 演變史就是在講這件事。

本地 CLI 是漏斗。雲端是產品。$88M 的錢不是投給開源理想主義的——是投給一個遲早會收緊的閘道。

我不是說 Ollama 會變邪惡。我是說這套劇本太熟了：先讓某個技術簡單到不行，變成事實標準，然後找出 monetization 的路。十年前是容器，今天是開放模型。喊「開放」是最有效的鎖定策略。

*城武的未解檔案——「全員上車」喊得動人，但上車之後，誰握方向盤才是重點。*

- 原文：[Ollama: all aboard open models](https://ollama.com/blog/all-aboard-open-models)（Jeff & Michael, Ollama, 2026-07-09）
