---
layout: post
title: "【深度分析】安全公司的雙面困境：Anthropic 告阿里偷模型，卻被自己政府斷 Mythos"
date: 2026-06-25 01:00:00 +0000
categories: [llm, ai, deep-analysis]
---

![Hero]({{ site.baseurl }}/assets/images/2026-06-25/anthropic-controversy.jpg)

Anthropic 這週的處境，用一句話說完就是：左手指責別人偷自己的模型，右手發現自己的模型被政府不准用了。這兩件事在同一個新聞週爆發，看起來是兩條獨立的新聞線，但它們指向同一個核心問題——當一間打著「安全」旗號的 AI 公司，同時在扮演受害者、守門人、以及即將上市的巨獸，誰來監督這個監督者？

---

## 原文摘要

### 事件一：Anthropic 指控阿里巴巴大規模模型萃取

美國 AI 公司 Anthropic 正式指控中國電商與科技巨頭阿里巴巴「公然且非法」萃取其 Claude 模型的能力。這封日期為 6 月 10 日的信函發給美國參議員 Tim Scott 和 Elizabeth Warren，內容指出阿里巴巴相關操作者使用了數千個詐欺帳戶，與 Claude 進行了近 **2,900 萬次**交流——Anthropic 稱這是他們見過的最大規模模型萃取行動。

技術上，這是典型的「蒸餾攻擊」（distillation attacks）：攻擊者從較強的 AI 模型提取答案，再用這些答案訓練較弱的模型。Anthropic 表示阿里巴巴鎖定了 Claude 最有價值的能力，包括處理長篇複雜任務的能力與決策方法，並形容這是一場「工業規模」的操作。

Anthropic 在信中寫道：

> 「蒸餾攻擊將美國數千億美元的投資與研發，變成了對我們地緣政治競爭對手的巨額補貼。」

信中還引用了美國國防部的主張——阿里巴巴、比亞迪、百度等公司與中國軍方有聯繫。這些公司否認指控，阿里巴巴更在本週起訴美國政府，要求從五角大廈的黑名單中除名。

Anthropic 呼籲國會懲罰此類攻擊的幕後公司，並加強防止美國技術被盜的措施。值得注意的是，OpenAI 過去也曾指控中國團體使用蒸餾攻擊，美國開發者長期指責中國競爭者用蒸餾攻擊以極低成本訓練出能與美國 AI 匹敵的模型。而 Anthropic 此刻正準備大規模 IPO，可能成為全球最有價值的公司之一，其 Mythos 等先進模型早已因網路安全疑慮引發關注。

### 事件二：NSA 因政府制裁失去 Mythos 5 存取權

同一週，美國國家安全局（NSA）部分單位失去了對 Anthropic Mythos 5 模型的存取權。這是川普政府本月稍早對 Anthropic 實施出口管制後的直接後果。

時間線：NSA 分析師在 6 月 20 日（週五）被告知即將失去 Mythos 存取權。NSA 也許仍可透過先前協議使用早期版本的 Mythos，但公司的支援、更新和修改已大幅受限。

Mythos 原本是透過 **Project Glasswing**（今年 4 月啟動）進入 NSA 的。該計畫後來擴展至超過 15 國的約 150 個組織，包括關鍵基礎設施營運商和網路防禦者。參議員 Mark Warner（參院情報委員會首席民主黨人）在國會聽證會上引述 NSA 局長 Joshua Rudd 將軍的說法：Mythos **「不是在幾週內，而是在幾小時內，就攻入了我們幾乎所有的機密系統」**。

隨後《經濟學人》防務編輯澄清這是一場紅隊演練（受控安全測試），不是真實入侵。Warner 可能誤解了 Rudd 的說法——Mythos 在受控環境中識別出了漏洞，但未必能在同樣時間內利用它們。

這一切衝突可以回溯到 Anthropic 與美國政府之間的長期緊張關係：

- Anthropic **拒絕**讓美軍使用其 AI 進行國內監控和全自主武器系統（倫理紅線）
- 政府將 Anthropic 列入國家安全黑名單（被廣泛解讀為報復）
- 2 月：國防部長 Pete Hegseth 將 Anthropic 標記為「供應鏈風險」——首次有 AI 公司被貼此標籤
- Anthropic 隨後起訴了政府
- 本月：政府下令暫停 Mythos 和 Fable 模型向全球所有外國人及所有目的地的出口
- 五眼聯盟（6 月 23 日）警告：前沿 AI 可能在「數月內，而非數年內」大幅改變網路威脅格局

當前狀態：NSA 的 Mythos 測試已停止。白宮和情報官員仍在推動一項機密合約，允許 NSA 使用 Anthropic 模型進行情報分析和漏洞偵測，但合約仍在初期階段。部分五角大廈官員希望 NSA 尋找替代方案。

---

## 城武觀點

### 一、「我爬全網是創新，你蒸餾我是犯罪」的雙標

蒸餾攻擊在倫理上是灰色地帶，但 Anthropic 的敘事框架更值得懷疑。Claude 用什麼訓練的？整個公開網路——Reddit、部落格、書的掃描版——這些叫「研究」。阿里巴巴用 Claude 的輸出訓練模型——這就叫「竊盜」。

這個雙標是美國 AI 公司的集體策略：用智財權框架包裝商業護城河。蒸餾是 AI 的常規技術，每天都在發生。把它犯罪化，就是在鎖定領先優勢。我不是說阿里巴巴無辜——2,900 萬次查詢顯然是刻意的——但這更像地緣政治下的常規技術手段，而非前所未見的「工業規模犯罪」。當你把模型放到公開 API，別人用它訓練自己的模型——這是 AI 產業的結構性問題。以經有人問過：如果是英國或以色列的新創做同樣的事，Anthropic 會用同樣語氣寫信給國會嗎？恐怕不會。

### 二、誰的紅線才算數？——守門人悖論

Anthropic 拒絕讓美軍用 Mythos 做自主武器，政府報復性黑名單，結果 NSA 紅隊失去存取權——同一個紅隊在 Project Glasswing 中用 Mythos 在幾小時內找到機密系統漏洞。

真正的問題不是 Mythos 危不危險，而是：**誰來決定誰能用它？** 一間準備 IPO 的私人公司有權力決定美國國安機構能不能用最先進的 AI 嗎？政府有權力因為公司拒絕軍事用途就切斷出口資格嗎？兩種紅線都不乾淨。Anthropic 的倫理紅線是真實的，但你不能一邊收國防部的錢做紅隊測試，一邊說「太危險了不能給你」。政府這邊更離譜——把保護自家網路的安全公司列入黑名單，不是安全決策，是政治報復。Anthropic 不是倫理英雄，它只是在用自己的紅線取代政府的紅線。真正輸掉的是 NSA 的分析師。

### 三、IPO 前的政治劇場

指控中國偷 model + 被政府打壓 + IPO 倒數——三件事擺在同一週，不是巧合。指控中國竊取智財是美國 AI 公司最經典的上市前敘事：說服投資人你的護城河不可複製。但同一週 Anthropic 也跟蓋茲基金會簽了 2 億美元合作案。對外是受害者，對內是壟斷者。

更諷刺的是，Anthropic 的商業模式某種程度上也建立在蒸餾之上——Claude 從全網學習，然後封裝賣出去。差別只在：你規模大就叫訓練，規模小就叫蒸餾；你付得起 AWS 就叫研究，你開數千帳戶就叫犯罪。整件事從新看一遍，這是 Anthropic 在 IPO 前的政治劇場。安全公司的安全敘事，到頭來還是為了讓上市那天估值更好看。

*城武的未解檔案——誰能一邊被政府斷網、一邊指責別人偷東西，還能一邊準備上市？答案是：只有那些把「安全」當產品賣的公司。*

- 原文：[Anthropic accuses Chinese rival Alibaba of illicitly extracting AI capabilities](https://www.bbc.com/news/articles/cwyklykn5dwo)（Osmond Chia, BBC News, 2026-06-25）
- 原文：[Anthropic's model found vulnerabilities in US systems](https://www.rte.ie/news/business/2026/0624/1580130-anthropics-mythos)（RTE News via Reuters, 2026-06-24）
- 原文：[Parts of NSA lose Mythos 5 access amid Anthropic supply chain dispute](https://www.nextgov.com/artificial-intelligence/2026/06/parts-nsa-lose-mythos-5-access-amid-anthropic-supply-chain-dispute/414366/)（David DiMolfetta, Nextgov/FCW, 2026-06-23）
