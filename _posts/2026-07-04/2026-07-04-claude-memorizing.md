---
layout: post
title: "【深度分析】Agent 不該記住對話歷史——自動記憶反而讓模型變差"
date: 2026-07-04 03:00:00 +0000
categories: [llm, ai, deep-analysis]
---

![hero]({{ site.baseurl }}/assets/images/2026-07-04/claude-memorizing-hero.jpg)

如果你最近看過任何 AI agent 的產品簡報，你一定聽過這句話：「我們的 agent 會記住每一次對話，越用越聰明。」這聽起來很合理——人類不就是靠記憶累積經驗的嗎？但一篇來自 agentic coding 實戰團隊的技術文章，用大量測試數據和一個令人不安的數字，把這個敘事直接撞碎了：自動記憶不僅沒幫助，還會讓模型變差。

## 原文摘要

theahura 在 12 Grams of Carbon 上發表了一篇簡短但火力集中的文章，核心主張很清楚：**給 agent 搜尋過去 session transcript 的權限，對軟體工程任務的效能是零幫助**——前提是 agent 以經有其他形式的 context 可以用（文件、commit message、PR 描述）。更糟的是，自動把舊 transcript 餵給 agent，會降低模型品質、浪費 token、增加成本。

作者團隊是 Nori（一個 agentic coding 工具）的開發者，他們的結論來自大量實測，不是理論推導。原文直接寫道：「我們發現，只要 agent 已經有文件、commit message 和 PR 描述可以參考，讓它搜尋過去的對話 transcript 對 SWE 任務完全沒有效能增益。」

### 為什麼 transcript 當記憶會失敗

第一個原因：有價值的資訊已經被蒸餾進 artifact 了。當 agent 完成一段工作，它會把關鍵決策寫進 commit message、PR 描述、或文件裡。這些 artifact 才是 agent 真正「認為值得留下」的東西。搜尋 transcript 反而讓 agent 從新閱讀它已經知道的事，同時還暴露在那些它當初刻意沒寫下來的 scratch-pad noise 中——那些邊想邊寫、不打算保留的中間推理廢話。

第二個原因更根本：**agent 無法修剪自己的記憶。** 作者團隊觀察了數千個 session，agent 從來不會主動刪除過時的 context。問題不只是 token 浪費，而是每一行舊的 context（code、記憶、過去的決策）都會被模型當成 ground-truth intent 來對待——即便那只是某個早期 session 中未經審查的隨機決定。錯誤會複利累積。

作者把這個問題指向更深層的 alignment 困境：現有的 coding benchmark 都假設輸入資料是乾淨的，模型被訓練成不質疑輸入；你要它「不要亂刪 codebase」和「適時丟掉一些舊 context」，這兩件事在訓練目標上根本互相矛盾。模型沒有安全的機制可以判斷「這段記憶該丟了」，因為任何刪除行為都可能被視為偏離指令。

作者的原話很直白：「既然模型實際上無法整理自己的記憶，自動記憶最後都會走到同一個終點——一堆垃圾吃掉 token、灌爆帳單、拉低模型品質。」

### Nori 的人類審查方案

與其讓 agent 自動索引 transcript，Nori 的作法是把人類放回 loop 裡。他們內部的 bot 每週 review 所有變更（PR、Slack 討論、文件改動），然後對團隊提出 skillset 更新建議，tag 人類審查。關鍵機制是：**所有建議預設拒絕**——必須有人明確審查並同意才會合併。

然後是全文最有殺傷力的數字：**接受率不到 20%。** 也就是說，80% 的自動更新建議，如果直接套用，會讓模型表現變差。作者補了一句很酸的：「我不敢想像如果一個幾百人的組織全部預設自動儲存這些『更新』，會有多不可收拾。」

### 具體建議

作者給了四個行動方針：第一，把心力放在 artifact（commit、PR、文件）而不是 transcript；第二，不要把原始對話 transcript 當成記憶餵給 agent——那是噪音不是訊號；第三，如果你真的想實驗自動記憶更新，一定要有人類審查加上預設拒絕機制，假設大多數自動產生的 context 是有害的；第四，transcript 可以用來做團隊的可觀測性（observability），但不會讓 agent 變得更好。作者的原話是：「session transcript 對團隊的可觀測性也許有用，但它不會讓你的 agent 變強。」

### 值得注意的讀者回應

文章下方 B P 提出了一個值得思考的反駁：某些商業場景需要深入探索過去的推理脈絡，問題可能比文章描述的更微妙——他用了「卻斯特頓之籬遇上黑暗森林」來形容這種兩難（你看到一堵看似沒用的籬笆，不該急著拆，因為當初蓋它的人可能知道你不知道的事），呼籲不要完全放棄 transcript 記憶這條路。另一位讀者 Brian Schneider 則簡潔地留言：「從這個角度看，它最像人類。」

## 城武觀點

這篇文章的發現，跟現在圈子裡的主流敘事是完全相反的。打開任何一個 AI agent 產品的 landing page，你幾乎都會看到「memory」被當成核心賣點在推——「你的 agent 會記得所有對話！」「RAG over session history！」「越聊越聰明！」整個產業像在比賽誰的記憶系統更花俏。但 Nori 團隊的實測結果直接說：這些都是噪音。不是「還不夠好」，是「零幫助，甚至有害」。

**第一，agent memory 的價值被嚴重高估，artifact-based context 才是真正有效的記憶。** 這件事的深層意義不在於「transcript 不好用」，而在於它揭露了我們對 agent「記憶」的整個想像可能是錯的。人類的記憶不是錄影帶——我們選擇性地記住重要的東西，遺忘不重要的事。但當前的 agent 架構沒有「選擇性記憶」的能力，它要嘛全記、要嘛全忘。artifact（commit、PR、doc）之所以有效，不是因為它們是更好的儲存格式，而是因為它們是 agent 在「清醒時刻」做出的編輯決策——是經過 distill 的產出，不是未過濾的錄影帶。你餵給 agent 原始 transcript，本質上是在強迫它重新經歷那些它自己當初就判斷不值得寫下來的思考過程。

**第二，無法修剪記憶不是實作問題，是架構限制。** Transformer 模型把 context window 裡的所有東西都當成 ground truth。你的 agent 在第三個 turn 隨口說的一句「maybe we should try a different approach」，到了第三十個 turn 會被當成一個已經確立的設計決策來對待。agent 沒有能力區分「我認真決定的」和「我隨口提的」，因為模型本身就沒有這種元認知——它不知道自己在 context 的哪一段「只是在自言自語」。你能做的只有兩種選擇：清空 context（忘掉一切）或保留 context（全部當真）。沒有第三條路。這個問題不會因為 context window 變長就解決——一萬 token 的噪音只會變成十萬 token 的噪音。

**第三，20% 接受率這個數字應該讓所有做「AI memory」的新創感到脊背發涼。** 如果 80% 的自動記憶更新都會讓模型變差，那你現在看到的那些「自動記憶」、「智慧上下文」、「persistent agent memory」產品，它們預設的行為模式是什麼？是預設接受還是預設拒絕？答案幾乎都是預設接受——因為「自動」才是賣點，沒有人會買一個跟你說「80% 的記憶我會丟掉，剩下的你要自己審」的記憶系統。但按照 Nori 的數據，預設接受等於預設把 80% 的垃圾餵回模型。這不是產品瑕疵，這是產品定義本身就建立在一個被實證否定的前提上。

B P 的卻斯特頓之籬反駁值得認真對待。他的意思是：transcript 記憶也許在某些我們還沒測到的場景有用，不要因為一篇文章就全盤否定。但城武的立場很清楚：**在有人拿出反面證據之前，artifact-first 是唯一合理的預設。** 如果你給 agent 的記憶系統沒有「人類審查 + 預設拒絕」機制，你不是在建記憶，你是在建一個自動化的噪音放大器。而那些把「自動記憶」當成核心賣點的產品，它們賣的不是功能，是一個被實驗數據打過臉的承諾。

*城武的未解檔案——記憶的價值不在於記住多少，在於知道該忘記什麼。而你的 agent 只會錄影。*

- 原文：[Agentics: Memorizing Session Transcripts Isn't Useful](https://12gramsofcarbon.com/p/agentics-memorizing-session-transcripts)（theahura, 12gramsofcarbon.com, 2026-07-02）
