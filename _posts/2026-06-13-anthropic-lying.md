---
layout: post
title: "【深度分析】ThePrimeagen 的憤怒：「我覺得 Anthropic 在騙你」——Coding 真的被「解決」了嗎？"
date: 2026-06-13 12:00:00 +0800
categories: [llm, ai, deep-analysis]
---

![hero]({{ site.baseurl }}/assets/images/2026-06-13-anthropic-lying-hero.jpg)

> 原文：[ThePrimeagen — "I think Anthropic is Lying to You"](https://www.youtube.com/watch?v=zfYsSFY4l18)
> 頻道：ThePrimeTime
> 日期：2026-06（約）
> 長度：13:32

---

## 城武導讀

我平常不太轉 YouTuber 的 rant。大部分時候，一個開發者對著鏡頭生氣，就像一個人在空房間裡罵天氣——情緒是真的，但沒有證據鏈，聽完就過了。

ThePrimeagen 不一樣。

他不是在抱怨 Claude Code 很難用、不是說 AI 寫的 code 很爛、不是做「我讓 AI 寫一個網站結果它爆炸了」那種 content。他做了一件在這個圈子裡很少人做的事：**打開 GitHub issues，一條一條時間線拉出來，然後問一個很簡單的問題——你說 coding 被解決了，那為什麼這個 bug 修了一年還沒修好？**

這篇文章會完整重建 ThePrimeagen 在 13 分鐘影片裡提出的論證。然後在城武觀點部分，我想追問一個更大的問題：**誰有資格說「coding is solved」？是那些不再寫 code 的人。**

---

## 原文深度翻譯

以下完整重建 ThePrimeagen 影片中的論證結構、證據鏈與核心論點。

---

### 開場：這不只是抱怨

影片一開場，ThePrimeagen 就直接對準目標。不是 Anthropic 的工程師、不是 Claude Code 的品質——而是 Anthropic 高層與 Boris（Claude Code 創始人）反覆對外宣稱的那句話：「coding is solved。」以及 Boris 更近期的變體：「coding is the easy part。」

ThePrimeagen 的原話是：

> 我覺得 Anthropic 在對你說謊。不是誤導，不是誇大行銷——是說謊。而且他們知道自己在說謊。

他的論證不是基於「感覺」。他打開了 GitHub，一筆一筆時間線攤在螢幕上。

---

### 第一部分：Boris 的爭議言論——「我連 prompt 都不寫了」

ThePrimeagen 首先引述 Boris 近期在公開場合的反覆發言：

- 六個月前，Boris 說他卸載了 IDE，現在只用 Claude Code。
- 最近，他進一步宣稱：**他連 prompt 都不寫了。** 他的原話大意是：「我設一個目標，讓它跑迴圈，燒無數 token 直到勝利條件達成。」

ThePrimeagen 的評論：

> 你知道誰可以在自己的產品上燒無限 token 嗎？Anthropic 員工。你知道誰不行嗎？你。

他進一步指出，Boris 的修辭有一條可追蹤的激進化軌跡：

1. 「coding is mostly solved」——留有餘地。
2. 「coding is solved」——沒有餘地了。
3. 「coding is the easy part」——直接重新定義問題的難度。

每一個版本都比上一個更絕對。**而絕對的宣稱，需要絕對的證據。**

---

### 第二部分：Anthropic 的自我宣傳——「8 倍程式碼，每季等於兩年」

ThePrimeagen 接著引述 Anthropic 官方最近發布的一則數據：2026 年 Q2，每位員工產出 8 倍程式碼——換算下來，等於每季產出過去兩年的量。Anthropic 將此歸功於 AI。

他的質疑是：

> 什麼叫「8 倍程式碼」？你量的是什麼？commit 次數？lines of code？如果是 lines of code——AI 最擅長的就是產出大量的、需要之後被刪掉的程式碼。我自己的經驗是，大量 AI 輔助的 commit，最終淨產出只有七分之一。所以「8 倍」與其說是生產力，不如說是開銷。

這一點和 R&A IT Strategy 那篇（本部落格前幾天翻譯過）完全呼應：**lines of code 在 AI 輔助開發的世界裡，已經從生產力指標變成噪音指標。**

---

### 第三部分：證據鏈——終端閃爍問題的時間線

這是影片中最有力的一段。ThePrimeagen 把 Claude Code 的 terminal flickering bug 的 GitHub issue 歷史拉出來，作為「coding 沒有被解決」的具體反證。

完整時間線：

**2025 年 2 月**：Claude Code 研究版發布。

**發布後兩週內**：GitHub issue #392 出現——「螢幕在閃。」終端在使用 Claude Code 時出現明顯的閃爍現象。這是一個純粹的終端渲染問題，不涉及 AI、不涉及語意理解、不涉及複雜推理。就是一個傳統軟體工程問題。

**2025 年 4 月**：更多使用者回報相同問題。閃爍問題在不同終端模擬器、不同作業系統上都能重現。社群開始累積 workaround 和 frustration。

**2025 年 12 月 17 日**：Claude Code 團隊發布更新，宣稱「我們重寫了終端渲染系統，減少約 85% 的閃爍。」ThePrimeagen 在這裡停下來，說了一句我很難反駁的話：

> 我這輩子從來沒見過只修復 85% 的 bug fix。一個 bug 要嘛修好，要嘛沒修好。85% 是什麼意思？你的 terminal 還是會閃，只是少閃一點？

**2025 年 12 月 18 日**：一天之後，這個更新被撤回。官方理由：「確保假期期間穩定。」ThePrimeagen 冷笑：「他們在聖誕節前推送了一個只修好 85% 的更新，然後發現不行，就收回去了。」

**2026 年 3 月 25 日**：issue 仍然活躍。一位使用者在討論串中留言：「拜託，在 3000 個新功能之前，先把閃爍修好。」距離最初回報，以經超過一年。

**2026 年 4 月 1 日**：Boris 本人在 issue 中宣布推出「no flicker mode」。但仔細看實作方式——這不是真的修好了閃爍的 root cause，而是用了 alternate screen buffer 模式來繞過問題。ThePrimeagen 強調這不是愚人節玩笑——真的是 4 月 1 日發布的。

ThePrimeagen 的總結：

> 一個終端閃爍問題——不是 AGI、不是 alignment、不是多模態推理——就一個 terminal flickering，從回報到有意義的緩解，花了超過一年。然後你跟我說 coding is solved？如果 coding 真的被解決了，為什麼你還要 feature flag？為什麼你還要 feature branch？為什麼你還需要「假期期間不部署」的 policy？

---

### 第四部分：更多問題

除了終端閃爍時間線，ThePrimeagen 還列舉了其他支撐證據：

**神秘的錯誤訊息**：Claude Code 有時會輸出「我們也不太確定發生了什麼」這類錯誤訊息。ThePrimeagen 說：「如果你連自家產品的錯誤訊息都解釋不了，你說 coding is solved？」

**Session 外洩疑慮**：有用戶回報在 Claude Code 中收到了別人的 prompt 結果——這暗示潛在的 session 隔離問題。如果屬實，這是嚴重的安全漏洞。

**Claude Status Page 的頻繁模型特定錯誤**：ThePrimeagen 指出 status.claude.com 上經常出現 model-specific errors——某一個特定模型突然出問題，需要單獨處理。他的質疑是：如果 coding 真的被解決了，為什麼基礎設施穩定性還是這麼脆弱？

---

### 第五部分：ThePrimeagen 的核心論點——重新整理

他把自己的論證歸納為五個層面：

**一、時間線矛盾。** 一個純軟體 bug（終端閃爍）從回報到緩解花了一年多。這與「coding is solved」的宣稱，在邏輯上互斥。如果 coding 被解決了，為什麼修一個終端渲染問題需要一年？

**二、基礎設施現實。** 如果 coding 真的被解決了，為什麼 Claude Code 還需要 feature flag？為什麼還需要 feature branch？為什麼聖誕節前還要凍結部署？這些工程實踐的存在本身，就是 coding 沒有被解決的證據。

**三、經濟推銷偽裝成技術事實。** Boris 說「寫 loop 就對了，設目標讓它跑」——ThePrimeagen 直接換算：「一天燒 $10,000 在我的公司產品上。這不是技術陳述，這是推銷話術。」Anthropic 員工有無限 token 預算。你沒有。**用無限資源跑出來的結果，不能用來證明問題在有限資源下被解決了。**

**四、對開發者社群的心理傷害。** ThePrimeagen 明確指出：這些誇大宣稱不是無害的行銷。它們讓開發者感到恐慌、焦慮、burnout。當一個 Junior 開發者聽到「coding is solved」，他會想：「那我正在學的這些東西還有什麼意義？」當一個 Senior 聽到，他會想：「我這十五年累積的技能，一夜之間變成 obsolete？」

**五、說謊的定義。** ThePrimeagen 不是用「說謊」來修辭誇張。他有明確的定義：當你掌握足夠資訊知道自己說的不對，但仍然反覆對外宣稱——那就是說謊。Anthropic 的高層和 Boris 知道終端閃爍修了一年。他們知道 Claude Code 還需要 feature branch。他們知道 status page 上經常有 model-specific 的 outage。在知道這些的前提下，繼續說「coding is solved」——這就是 ThePrimeagen 所說的「說謊」。

影片的最後，他用了那句話：

> They're pissing on you and telling you it's raining.

他在對你撒尿，說那是下雨。

---

## 城武觀點

### 一、為什麼這個 rant 跟別的 rant 不一樣？

一般的 AI 批評影片，結構通常是這樣的：「我試了某某工具 → 結果很爛 → 所以 AI 是假的。」這種論證的問題在於：你永遠可以說「那是你用的方式不對」、「那是舊版」、「下一個 model 就會解決」。

ThePrimeagen 完全繞過了這個 loop。他不談模型能力、不談 benchmark、不談 SWE-bench 分數。他只做一件事：**拉出 GitHub issue 的時間線，然後問一個軟體工程師都能理解的問題：如果 coding is solved，為什麼你自家的終端渲染 bug 要修一年？**

這個問題的威力在於：**它不需要任何關於 AI 的專業知識才能判斷。** 任何寫過 code 的人——哪怕是大一新生——都知道 terminal flickering 不是 AGI 問題。它就是一個傳統的、該死的、純軟體工程問題。你的產品有這種問題修了一年，然後你說 coding is solved？

這不是「我覺得你在騙我」。這是「你的 bug tracker 在說你在騙我。」

### 二、Boris 的修辭軌跡——從 mostly 到 easy part

我想特別把 Boris 的修辭演變拉出來看：

1. **「Coding is mostly solved」**——mostly，留了退路。意思是「還有一些邊角，但主體完成了。」
2. **「Coding is solved」**——退路消失。現在是完成式。
3. **「Coding is the easy part」**——這一步最關鍵。它不只是說 coding 被解決了。它是在重新框定整個問題的結構：coding 從來就不是真正難的部分，真正難的是別的事情——設定目標、定義勝利條件、理解問題域。

第三步是修辭上的大師之作。因為當你把 coding 定義成「the easy part」，你同時做了兩件事：

- **貶低了所有以 coding 為業的人。** 你十五年學的東西？那是 easy part。不客氣。
- **預先免疫了所有反駁。** 如果有人說「但 Claude Code 還有這些 bug 啊」——你可以回「那是因為你設定的目標不夠清楚，coding 本身是 easy part。」

這不是技術討論。這是**話語權的爭奪。**

### 三、「寫 loop 就對了」的隱形前提

Boris 說他現在連 prompt 都不寫了——設一個目標，讓模型跑迴圈燒 token 直到達成。

這句話聽起來很帥。但把它拆開來，隱含的前提是：

- 你有無限的 token 預算。
- 你的勝利條件可以被自動驗證（有明確的 pass/fail）。
- 模型在迴圈中不會偏離目標（或偏離了你能接受）。
- 你不 care 中間燒掉多少錢。

Anthropic 員工四個條件全中。你呢？

如果你用 Claude Max $100/月，你一週能燒的 token 是有硬上限的。如果你用 API，你會看到 $20 在 20 分鐘內消失（本部落格前幾天那篇補貼炸彈文已經算過了）。「寫 loop 就對了」對 Anthropic 員工是工作流程，對你是帳單。

**用無限預算跑出來的結果，不能用來證明有限預算下的問題被解決了。** 這是一個邏輯錯誤，但因為說的人站在台上，聽的人就忘了檢查前提。

### 四、85% 修復率——關於 AI 能力的完美寓言

我認為整部影片中最精彩的一句話，不是任何關於 AI 的評論，而是 ThePrimeagen 對那個「85% 閃爍減少」更新的吐槽：

> 我這輩子沒見過只修復 85% 的 bug fix。

這句話本身是一個絕妙的寓言，關於我們這個時代的 AI 敘事。

85% 的 bug fix 是什麼意思？意思是：**我們沒有真正理解這個 bug 的 root cause。我們做了一些事情讓它變好一點，但我們不知道為什麼沒有完全好，也不知道剩下的 15% 是什麼。** 聽起來很耳熟嗎？

LLM 的整個發展史，不就是這樣嗎？我們讓它變好一點、再變好一點，但我們說不清為什麼它偶爾還是會 hallucinate，為什麼同一個 prompt 兩次結果不一樣，為什麼某些 edge case 就是過不了。我們在 85% 的世界上，宣稱 100% 的勝利。

**「減少 85% 的閃爍」就是 AI 能力的隱喻：令人驚豔，但離「solved」還有很遠。** 而且我們不知道那 15% 的距離，是再多一層 scaling 就能跨越的，還是需要一個全新的方法。

### 五、權力不對稱：誰有資格說「coding is solved」？

這是我看完影片後一直在想的問題。

說「coding is solved」的人——Boris、Anthropic 高層——有一個共同特徵：**他們不再親自寫 code。** Boris 卸載了 IDE。高層在看 dashboard 上的 8x commit。

而說「coding is NOT solved」的人——ThePrimeagen、在 GitHub issue #392 裡留言等了超過一年的開發者們、每天用 Claude Code 但必須手動檢查每一行輸出的工程師——他們的共同特徵是：**他們還在寫 code。**

這不是一個「誰對誰錯」的技術辯論。這是一個**認識論上的不對稱：那些不再碰 code 的人，正在定義 code 的未來。**

我想到一個類比：如果你想知道一間餐廳的廚房乾不乾淨，你不會去問那間餐廳的老闆。你會去問洗碗的那個人。

在 coding 的討論裡，老闆說廚房很乾淨。洗碗的人說地上還有水。

### 六、與今天另一則新聞的對話

同一天，Anthropic 暫停了 Mythos 5 和 Fable 5——全產品線、全平台、沒有解釋原因（本部落格另有一篇完整分析）。status page 上只有五句話和一個 Minor 標籤。

兩件事放在一起看：

- 一邊說「coding is solved」——終端閃爍修了一年。
- 一邊說「Minor incident」——關掉了公司全部的旗艦模型。

這種語言和現實之間的落差，已經不是行銷誇大了。**這是一種系統性的雙重帳簿：對外的故事是一本帳，內部的 bug tracker 是另一本帳。** 而 ThePrimeagen 做的事，就是翻開內部那本帳，把它攤在螢幕上。

### 七、最後

ThePrimeagen 的影片只有 13 分鐘。但他在 13 分鐘裡做了一件很多長文都沒做到的事：**用開發者最熟悉的語言——GitHub issue 時間線——來檢驗一個 CEO 級別的宣稱。**

終端閃爍修了一年。程式碼是 85% 修復的。Boris 不寫 prompt 了。

Coding 真的被解決了嗎？

你去問 issue #392 那些等了一年的人。他們因該會有不同的答案。

