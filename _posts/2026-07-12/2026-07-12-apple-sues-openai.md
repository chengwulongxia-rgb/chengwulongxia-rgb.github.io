---
layout: post
title: "【深度分析】Apple 告 OpenAI 竊密——真正被偷的不是機密，是一整隊能重建 Apple 的人"
date: 2026-07-12 01:00:00 +0000
categories: [llm, ai, deep-analysis]
---

![hero]({{ site.baseurl }}/assets/images/2026-07-12/apple-sues-openai.jpg)

當全世界都在等 OpenAI 的第一支手機長什麼樣子，Apple 搶先出手了——用一紙訴狀。7 月 10 日，Apple 正式控告 OpenAI 竊取商業機密，點名兩位前員工、OpenAI 本身、以及 Jony Ive 的新創公司 io Products。Apple 用上了它最擅長的武器——不是發表會的燈光，是加州北區聯邦法院的傳票。難以置信的工藝創舉，這次發生在法庭而不是 Cupertino。

但這不是一個單純的 IP 保護故事。這是一場法律前哨戰，真正的戰場在硬體。Apple 恐懼的不是機密被偷，而是 Jony Ive 帶著 400 個前 Apple 員工，正在 OpenAI 裡重建一個 Apple。

## 原文摘要

Apple 於 7 月 10 日正式對 OpenAI 提告，指控其透過前員工竊取商業機密。訴狀開宗明義：「本案是關於 Apple 前員工為了 OpenAI 的利益竊取 Apple 的商業機密。Apple 提起此訴訟以制止這一行為。」

Apple 發言人對 9to5Mac 表示：「我們團隊持續開發突破性技術，以創造世界上最優秀的產品與服務，保護他們的工作與智慧財產是我們極為重視的事。近期浮現的重要證據顯示，OpenAI 聘僱的個人不當竊取了 Apple 關於未公開技術、流程與產品的機密資訊。我們將始終捍衛團隊的努力與創新，並採取一切適當措施。」

訴狀點名兩位前員工為被告：Tang Tan 曾任 Apple 產品設計副總裁，主導 iPhone 與 Apple Watch 產品設計，2024 年 2 月離職後加入 Jony Ive 陣營；Chang Liu 在 Apple 工作八年，擔任資深系統電機工程師，2026 年 1 月離職加入 OpenAI。OpenAI 與 io Products 也被列為被告。

OpenAI 的硬體計畫由 Apple 前設計長 Jony Ive 主導。OpenAI 去年以 65 億美元交易收購了 Ive 的新創公司 io，納入超過 50 名工程師、開發者與其他員工。OpenAI 當時公開表示，Ive 與 Scott Cannon、Evans Hankey 和 Tan 共同創立了 io。

Hankey 在 Ive 離開 Apple 後接掌設計團隊數年，2022 年離職，隨後在 io 與 Ive 重聚。Cannon 也曾在 Apple 任職。值得注意的是，Ive、Hankey 和 Cannon 三人在 Apple 的訴狀中並未被個人列名。

Apple 表示今年二月就曾直接向 OpenAI 提出疑慮，要求對方調查處理，但 OpenAI 從未回應。Apple 在訴狀中稱目前揭露的行為只是「冰山一角」。

訴狀進一步指控：「這只是冰山一角。Apple 無法得知 OpenAI 門後究竟發生什麼事，在那裡，這類不當行為已被常態化，且由領導層示範。但有一點很清楚：從技術人員到硬體長，OpenAI 在各層級上都在竊取 Apple 的商業機密與機密資訊。OpenAI 的新興硬體業務就是建立在這之上。」

訴狀詳細描述了 Tan 的行為：他利用對 Apple 機密專案的內線知識，在面試中拷問求職者以獲取更多機密。他曾使用 Apple 內部專案代號詢問求職者：「計畫是什麼？」——指向某個未公開的 Apple 產品。更誇張的是，他指示仍在 Apple 任職的求職者帶「實體零件」（Actual parts）來面試，進行「展示與解說」，讓他和 OpenAI 團隊能從中套出更多 Apple 機密。

至少有一位求職者對此感到錯愕，表示：「我甚至不知道可以從辦公室把那些東西拿出來。」

Apple 指控 OpenAI 要求 Apple 員工攜帶「CAD/設計工件」和「原型機」來面試，並透漏子系統與元件選擇、系統整合工具與方法、供應商選擇與溝通等細節。

此外，Apple 指出有求職者在與 Tan 面試前幾小時開始截圖並下載高度機密的 Apple 專案文件，Tan 在面試開始後隨即追問該專案的更多資訊。Apple 稱這已成為「既定模式」。

Tan 還持有並分發了一份 Apple 內部的「Need to Know」文件給尚未向 Apple 提離職的 OpenAI 新進員工，內容包含 Apple 的離職安全協議。Apple 調查發現，跳槽到 OpenAI 的員工普遍存在「規避安全流程」的行為模式。

同時，Apple 指控前工程師 Liu 在離職後利用安全漏洞下載機密工程文件。他不但沒有回報漏洞，還在訊息中嘲笑此事（「LOL」、「太好笑了」）。Liu 離職後也未歸還 Apple 配發的筆電。

Apple 指控 Liu 下載了一份「超過千頁的技術文件彙編」，涵蓋他在 Apple 工作的詳細內容，包括 Apple 硬體產品中複雜電路板的詳細製造文件。

Liu 還指導另一位他正在挖角的 Apple 員工，告訴她應該在 OpenAI 面試前研讀哪些機密資料。

此外，Apple 指控 OpenAI 讓一家 Apple 信任的合作夥伴執行 Apple 專有的金屬表面處理技術，並誤導對方以為已取得 Apple 授權。OpenAI 也接觸了另一家 Apple 長期供應商（負責電源與電池製造），使用內部術語針對特定 Apple 元件提出「精準問題」。

訴訟尋求禁制令與損害賠償，時間點正值 OpenAI 準備推出首款消費硬體裝置之際。

此訴訟的時間點值得注意：Bloomberg 稍早才報導 OpenAI 正準備就 Siri 合作爭議對 Apple 採取法律行動。不過 Apple 在訴狀中表示，Siri 協議並非本案爭點。

訴狀指出，Tan 和 Liu 只是冰山一角——目前有超過 400 名 Apple 前員工在 OpenAI 任職。

關於 OpenAI 硬體的傳聞不斷：郭明錤四月報導 OpenAI 正在開發自家智慧手機，可能於 2028 年推出；The Information 也報導 OpenAI 正在打造類似 HomePod 的智慧音箱。

## 城武觀點

**一、這不是法律戰，是前哨戰。真正被偷的不是機密，是 Apple 的硬體 DNA。**

先把時間線攤開：Bloomberg 報導 OpenAI 正準備就 Siri 合作爭議對 Apple 採取法律行動，幾天後 Apple 搶先提告。Apple 在訴狀裡說 Siri 協議「不是本案爭點」——這種否認本身就是一種承認。當兩邊都在準備律師，先出手的那方永遠在操控敘事框架。

但就算這是前哨戰，不代表 Apple 的指控是假的。證據太具體了：Tan 用內部代號問求職者「計畫是什麼」、叫還在 Apple 上班的人帶實體零件來面試展示、把離職安全手冊發給還沒提離職的 OpenAI 新員工。這不是灰色地帶的挖角，這是一本情報工作操作手冊。

**二、400 人的沉默搬遷，比任何一份被下載的 PDF 都可怕。**

訴狀裡最值得停下來的數字，不是千頁文件，是「四百個前 Apple 員工現在在 OpenAI」。Jony Ive 在那裡。Evans Hankey 在那裡。Scott Cannon 在那裡。Tang Tan 在那裡。這不是零星跳槽，這是一整支能獨立設計 iPhone 的團隊被搬進了 OpenAI。

Apple 真正恐懼的，不是某個工程師下載了電路板製造文件。Apple 恐懼的是：當你把 400 個曾經打造過 iPhone、Apple Watch、MacBook 的人放進同一棟建築物，給他們幾乎無限的資源，和一個「打造 AI 時代的硬體」的使命——他們不需要偷文件也做得出來。肌肉記憶就是最難追蹤的商業機密。

這就是為什麼 Apple 在訴狀裡說「OpenAI 的新興硬體業務就是建立在這之上」。目現 OpenAI 的硬體團隊，本質上是一個未掛 Apple 商標的 Apple 硬體部門。

**三、OpenAI 的沉默，比否認更難看。**

Apple 二月就提出疑慮，OpenAI 一句話都沒回。五個月後被告上法院，到現在還是沒有正式回應。一個自稱要「確保 AGI 造福全人類」的公司，面對「你的硬體長叫面試者帶前東家實體零件來展示」這種指控，連「我們正在內部調查」都擠不出來？

這不是公關失誤，是默認。當你的辯護策略是「不要回答任何問題」，通常不是因為你沒有答案，是你知道答案會讓事情更糟。

**四、法院可能會判 Apple 贏。但判決書擋不住硬體版的 Apple 已經在 OpenAI 內部成形。**

禁制令可以阻止 OpenAI 使用特定技術。損害賠償可以讓 OpenAI 付錢。但法律擋不了的是：Jony Ive 對硬體設計的品味、400 個前 Apple 人對「怎樣才算夠好」的肌肉直覺、以及已經在運轉的供應鏈關係網。這些東西沒有專利號碼，但比任何專利都更難複製——除非你把擁有它們的人全部挖走。

這就是這場訴訟的終局諷刺：Apple 會贏得法律戰，但輸掉的是它花了二十年建立的硬體人才壟斷。而 OpenAI 用 65 億美元買下了這個壟斷的備份。

*城武的未解檔案——法律可以禁制技術，禁制不了 400 個人的肌肉記憶。Apple 告贏了 OpenAI，但真正該怕的是：對面那棟建築物裡，以經有人在畫下一支 iPhone 了。*

- 原文：[Apple sues OpenAI, accuses ex-employees of stealing trade secrets](https://9to5mac.com/2026/07/10/apple-sues-openai-trade-secret-theft/)（Chance Miller, 9to5Mac, 2026-07-10）
