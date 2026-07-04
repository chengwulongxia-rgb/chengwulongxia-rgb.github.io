---
layout: post
title: "【城武觀點】你以為瓶頸是模型不夠聰明？HN 開發者集體頓悟：問題出在「打字等回應」這個迴圈本身"
date: 2026-07-04 04:00:00 +0000
categories: [llm, ai, chengwu-opinion]
---

![hero]({{ site.baseurl }}/assets/images/2026-07-04/hn-llm-coding-hero.jpg)

如果你最近用 Claude Code 或 Codex 寫 code，你可能也有這種感覺：明明模型越來越強，但你反而越來越累。不是模型寫出來的 code 有問題——是「打字→等回應→檢查→再打字」這個迴圈本身，讓你永遠進不了真正的 flow。這星期 Hacker News 上一個 Ask HN 貼文把這個問題攤在陽光下，156 則留言裡，開發者們不是抱怨模型不夠好，而是在集體摸索一件事：**我們需要的不是更強的 LLM，是一個不需要打字等回應的互動方式。**

## 原文摘要

七月二日，HN 用戶 yehiaabdelm 發了一篇 Ask HN，標題直白：「有沒有人在嘗試用完全不一樣的方式用 LLM 輔助寫 code？」他的痛點非常具體——用了 Claude Code 和 Codex，但從來沒有進入過手寫 code 時的那種心流狀態。他打了一個精準的比喻：「AI 應該是心靈的腳踏車，但目現的感覺更像一台每兩分鐘就急煞的腳踏車——停下來、等、檢查、再下 prompt、再停下來。」他認為 tab-completion 那種補全模式方向比較對，但顯然還不夠。

這篇貼文拿到 129 點、156 則留言，討論品質極高。以下整理討論中的主要方向。

### 心流問題：新的 flow 不是更少的分心，是更多的 terminal tab

多位開發者描述了自己與 LLM 協作時的奇特心理狀態。tombot 說新的 flow 是「開 10 個 terminal tab 在不同 worktree，然後試著記住每個在做什麼」，像「Bobby Fischer 同時下十盤棋」。chatmasta 補充說這像玩《文明帝國》——你專心經營幾個城市的時候，其他城市就在背景退化成一堆雜務，逼你不得不寫一些膚淺的自動化去敷衍它們。parpfish 指出最煩的是：當你需要手動改 code 的時候，在十個 worktree 裡找到真正的那個檔案比重新叫 LLM 改還麻煩，最後乾脆一直叫 LLM 微調。UltraSane 直接說這種模式「更累、壓力更大」。

但也有開發者選擇抵抗這個趨勢。avilay 說「打開空白的 VSCode 是人生中不願放棄的簡單快樂」，他只在自己先寫完初版 code、或任務切割得很清楚的時候才用 LLM。captainbland 從認知科學的角度切入：真正的 flow 需要高認知投入，而跟 LLM 互動本質上是被動的等待，加上 chain-of-thought 的強制中斷，讓 flow 幾乎不可能發生。

### 替代互動模式：四種正在發生的典範轉移

討論中最有價值的部分，不是某個工具的名字，而是開發者們不約而同在往四個方向逃離 prompt-response 迴圈。

**第一種：spec-driven（先寫 spec，再放 agent 跑幾小時）。** danmaz74 的作法是把精力集中在兩個時刻：一開始花高度專注的時間寫詳細 spec，然後讓 agent 自己跑幾個小時去實作；最後再花一段專注時間做最終審查。他強調「我跟 chat 介面持續互動的時間大幅減少了」。jarodrh 也發展出類似的 config-led 三層架構：便宜快速的模型做機械工作（查 log、找檔案）、中等模型照 spec 實作、最強模型負責判斷和審查。他說自己的 flow state 「從逐行寫 code 變成在腦中穿越整個系統架構的各層，然後清楚地把這個架構表達給最強的模型聽」。

**第二種：mesh-based（多 agent gossip 協調）。** leetrout 做了一個叫 Claude Code mesh 的工具，讓不同 agent 實例之間透過 gossip protocol 互相通訊，infra agent 和 app agent 自己發明流程來回溝通。他說「這比我見過的很多東西都更像未來」。vitally3643 的做法更極端——他用家裡一堆舊 GPU 跑了一個「龍的寶藏」swarm，從 Llama 3.2:3B 到 Qwen 2.5-27B 共十幾個異質模型同時跑，讓它們互相辯論。他承認寫 code 的結果普普通通，但「讓 swarm 投票給意見、讓模型互相辯論，綜合出來的洞察驚人地有用」。終極目標是讓 swarm 自己學會哪個模型擅長哪種任務，變成一個自主路由網路。

**第三種：inverted control（agent 在背景跑，主動找人回饋）。** bob1029 提出一個翻轉控制權的願景：agent 在背景持續工作，只有在需要人類判斷的時候才主動來找你——目標是「徹底消滅 chat UI，轉向非同步訊息」。redmattred 的實驗更哲學：每天早上 agent 自己挑一個任務，用不同人格框架重新包裝它，然後反過來問你「你想用哪個角度做？」——把你放到 prompt-response 迴圈的另一端。

**第四種：hermetic / adversarial agent（沙箱對抗）。** seanmcdirmid 描述了一套「密封 agent」系統：coder agent 和 tester agent 從同一份 spec 出發，但彼此看不到對方的產出——coder 不知道 test 長怎樣，tester 不知道 code 怎麼寫。QA agent 在不洩漏隱藏資訊的前提下給回饋，徹底避免 confirmation bias。他說「我不太需要跟密封 agent 互動，我的時間都花在咒罵和跟 orchestrator agent 吵架上」。pkoird 說自己在過去一個月也收斂到完全一樣的模式。

### 自訂工具：從 pair programming 到「走路寫 code」

philbo 正在打造 opair，一個有明確 driver/navigator 模式切換的 pair programming 工具，目標是讓開發者保持全程投入而非被動等待。jwindle47 的 codetutor 走另一個極端——它是 Emacs 套件，AI 在你存檔時檢查 diff 並給建議，但「你才是寫 code 的人，AI 只是看著」。

anthonyfrisby 分享了一種更激進的互動方式叫「walkoding」：把 harness 掛到 Telegram 上，帶著手機去爬山，讓 agent 在背景跑，自己邊走邊用語音下指令、檢查結果。他說「這真的是一種解放」。但也有人警告：如果你真的需要從工作中斷線，邊爬山邊管 agent 只會讓你更焦慮。

weitendorf 在實驗把瀏覽器本身當成 harness——利用 Chrome DevTools Protocol 讓 agent 直接操作瀏覽器、驗證 UI、查詢網站，把 feedback loop 壓到極短。他說未來寫 code 可能會像打星海爭霸。kordlessagain 則把 Hyper terminal 改造成一個可定址的多 pane 系統（Hyperia），agent 在不同 pane 裡工作，開發者在一個 pane 寫 code，用眼角餘光監控 agent 的進度，還有 ACL 防止 agent 搶走你的焦點。

### 核心洞察：瓶頸從「code 產出速度」變成「人類理解速度」

kybernetikos 點出了一個結構性的轉變：「我跟團隊的 senior 開發者討論時發現，瓶頸已經從 code 生成大幅轉向人類的 code 理解能力。AI 還不適合在沒有人類檢查的情況下產出生產級 code（目前為止），但它可以產出巨量的 code 給人類檢查。」他們團隊因此在實驗讓 AI 自動生成圖表來解釋自己做了什麼變更，因為「任何能加速人類理解變更的東西，都是在解決整個流程的核心瓶頸」。

cedws 提出了一個務實的懷疑：「現在好像每個人都在做 agent orchestrator，但我沒聽到多少成功案例。Anthropic 和 OpenAI 還沒有裁掉所有工程師，大概就是 orchestration 某個地方會崩掉的信號。」但也有人反駁：orchestration 的問題不在概念，在實作品質——jarodrh 認為 routing 在 config 層級就能解決，不需要 per-request 的 middleware 來打分數和轉發。

## 城武觀點

### 一、瓶頸從來不在模型能力，在「重新序列化心智狀態」的成本

這個討論串最有價值的洞察不是哪個新工具很酷，而是一個多人獨立抵達的相同結論：**把你在腦中已經想清楚的東西，重新轉譯成一段 prompt 打出來，這個成本超過了 LLM 幫你加速的部分。**

這不是一個 prompt engineering 問題。不管你多會寫 prompt，你都必須先中斷自己的思考、把心智狀態從「我腦袋裡正在跑的程式」序列化成線性文字、等 LLM 回應、再把回應反序列化回你的心智模型、然後從中斷的地方繼續。這個序列化/反序列化的 overhead，在模型只要兩秒就回應的時代，反而成了最大的時間黑洞。

十年前沒這個問題——因為寫 code 本身就是序列化過程，你打字的速度就是思考的速度。LLM 把產出速度拉到近乎即時之後，暴露了一個沒人預料到的瓶頸：**人類表達想法的速度，跟不上機器實作想法的速度。** 這是 LLM 輔助編碼的底層矛盾，所有「更好的 prompt 技巧」都是在這個矛盾上貼 OK 繃。

### 二、四種典範轉移正在同時發生——而且它們都不是「更好的 prompt」

spec-driven、mesh-based、inverted control、swarm——這四種方向有一個共同的底層邏輯：**它們都在逃離 prompt-response 範式本身。**

spec-driven 的做法是把「序列化心智狀態」這件昂貴的事只做一次（寫 spec），然後讓 agent 自己去迭代。mesh-based 是把 prompt-response 從人機之間搬到機器之間，人類變成監督 gossip 結果的人。inverted control 直接翻轉了誰發起對話——讓 agent 來 prompt 你。swarm 更是把單一模型的確定性回應替換成多模型的辯論共識。

這些不是「更好的 prompt」，是對 prompt-response 範式的結構性逃脫。就像當年從 command-line 到 GUI 的轉變不是在命令列上改良語法，而是換了一整套互動邏輯。這個討論串之所以重要，不是因為裡面提到的任何一個工具會贏，而是因為它讓你看見：**整個社群正在同一時間、往同一個方向、用不同的路徑，逃離同一件事。**

### 三、我賭 prompt-response 迴圈是過渡階段，一年後你不會這樣寫 code

選邊：prompt-response 是 LLM 編碼的 CLI 時代——功能強大、彈性高，但注定不是最終形態。

一年後的開發者不會坐在 terminal 前打字等回應。他們會像計劃經理一樣：早上花 30 分鐘把意圖說清楚（可能是語音、可能是畫架構圖、可能是寫一段 structured spec），然後一群背景 agent 自己去開會、辯論、實作、寫測試、互相 code review，只有在真的需要人類判斷的時候才 push 一則通知到你的手機上。你的工作從「寫 code」變成「做決定」。

這個轉變的阻礙不是技術——這個討論串裡的每個實驗都證明了技術雛形以經存在。阻礙是習慣。大部分開發者還卡在「我必須親眼看每一行 code」的心理模式裡，就像 2000 年代初的工程師不相信 CI/CD 可以自動部署。但那個心理模式在被打破的邊緣——因為當你的同事開始用 spec-driven 方式一個下午產出你一個星期的量，你繼續坐在 terminal 前打字等回應就不是「踏實」，是「落後」。

cedws 的懷疑是對的：Anthropic 和 OpenAI 沒裁員，代表 orchestration 確實還不穩定。但那句話的保質期我估計不超過六個月。當 orchestration 從「每個人都自己刻一套」變成「有一兩個標準化方案」，那個懷疑就會蒸發。我賭第一個真正可用的標準化方案在年底前會出現——而且它不會是 chat interface。

*城武的未解檔案——當你的 AI 同事開始在背景自己開會、辯論、寫 spec、互相 code review，而你還在 terminal 前打字等回應，你已經不是在「寫程式」，你是在「幫 AI 打字」。*

- 原文：[Ask HN: Is anyone experimenting with different ways of using LLMs for coding?](https://news.ycombinator.com/item?id=48771515)（yehiaabdelm, Hacker News, 2026-07）
