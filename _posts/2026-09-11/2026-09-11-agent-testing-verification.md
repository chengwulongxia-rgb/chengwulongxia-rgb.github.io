---
layout: post
title: "【深度分析】叫 agent 測試，不等於它真的會驗證：Dan Luu 的 26 種條件實驗"
date: 2026-09-11 04:00:00 +0000
categories: [llm, ai, deep-analysis]
---
![hero]({{ site.baseurl }}/assets/images/2026-09-11/2026-09-11-agent-testing-verification.jpg)

把「請多測試」、「使用形式驗證」或「套用某個 skill」寫進 agent 指令，看起來像是把可靠性往上撥了一格。但 Dan Luu 的實驗追問的是更不客氣的問題：agent 真正做了什麼？他以 Rust 實作 Zstd 的同一份評測為底，改變提示中的測試與驗證條件，並以隱藏測試的全數通過率和成本比較結果。結論不是哪個工具該被判死刑，而是 agent 常常把工具名稱完成了，卻沒有把工具能迫出錯誤的工作完成。

## 原文摘要

### 實驗問題與條件

作者先前觀察到：即使讓 coding agent 採用有效的測試方法比以前容易，整體軟體品質似乎仍在變差。這暗示開發者實際使用的預設流程未必有效。因此，本文把「給一個不精通測試、只聽過某技術名稱的人會加上的簡單指示」當作實驗對象：要求 agent 實作 Zstd，並在原提示後加上「採用 TDD」、「使用 Lean 4」、「使用 QuickCheck」、「做 property-based testing」等條件，看看正確性是否改善。作者亦以 IMAP RFC 與少量其他 RFC 做補充測試。

所有實作均為 Rust。26 個提示條件包括 ACL2、Alloy、先 audit 再 fuzz 高風險區、只做 audit、Creusot、沒有額外要求的 Default、differential testing、fuzzing、Hegel、Insta、讓 agent 自行判斷最佳方法的 Judgement、Kani、Lean 4、「不要犯錯」、metamorphic testing、mutation testing、property-based testing、Proptest、QuickCheck、rstest、Rust 內建測試框架、搭配 Z3、cvc5、Yices 的 SMT solver、Spin、TDD、TLA+、Verus。另測四份 skill：官方 Hegel skill、ECC 的 Rust test skill、Trail of Bits 的 property-based testing skill，以及作者兩分鐘寫成的一份測試 skill。前三者是 Codex 搜尋相關 skill 時找到的熱門結果；ECC 在 GitHub 有二十五萬 stars、三萬八千 forks。

### 事前預測

作者事先登記幾個猜測。第一，TDD 會較差，信心五成五；它正是因為作者預計會失敗而加入的條件，但他不確定 agent 收到 TDD 指令後會怎麼做，也可能根本不做 TDD。第二，形式方法不會特別勝出，信心五成二。作者認為形式方法和良好測試都有效；在簡單題目上，若兩者都用得同樣熟練，前者不該壓倒後者。不過形式方法在 agentic coding 的宣傳遠多於實用測試技巧，實驗室也可能已用 RL 合成環境專門訓練 agent 使用形式方法。

第三，「不要犯錯」不會勝過無指示，信心九成五；這原本就是一個常被人試過的玩笑，如果有效早該被注意到。第四，ECC skill 不會勝出，信心六成五：它篇幅不小，指示 agent 用 TDD，而作者預期 TDD 反而有害；其餘內容看不出有何實益且有上下文成本。第五，Hegel skill 不會勝出，信心六成五，因為 SKILL.md 加上 Rust 參考資料超過兩萬 token，讀起來比較像教學。第六，Trail of Bits skill 不會勝出，信心五成五：它看似有可用內容，卻同樣很長。作者幾乎不用 skill，所以所有關於 skill 的預測信心都偏低；他的想像只是把 skill 文字塞進 prompt 與 context window 後會如何影響模型。

### 整體結果

圖表以成本為橫軸、完整通過隱藏測試的 run 比率為縱軸；每個條件與 effort 的平均樣本為八十次。使用的是 Codex 搭配 GPT-5.6 Sol，medium 和 xhigh effort；游標提示顯示 bootstrap covariance 與五成不確定區間。作者刻意保留密集而凌亂的圖，並以近似色標出形式方法、property-based testing 等類群。

沒有任何條件大幅領先。無額外指示的 Default 卻明顯高於平均；在 xhigh，fuzzing 與 PBT 相關條件平均略優於形式方法，medium 則更混雜。Codex 建議測的 testing skill 整體較差，作者臨時寫的短 skill 表現尚可。作者認為差別在於短 skill 試圖把 agent 從預設行為推往較有產出的行為，其他 skill 更像教程。TDD 也如預測般不佳；有份 skill 同樣推 TDD，而 agent 嘗試遵守時亦表現差。

查看實際行為後，作者認為問題很直接：agent 普遍不會好好使用這些工具與技術，也不懂得以合理方式做預設測試。Gary Bernhardt 曾把它概括成兩步：先拿十五年前反對 mock 的人想出的病態案例、卻沒有真正用過 mock；再把這些病態案例當成整個測試策略骨幹。本文的結果是，指定一項技術後，這個模式沒有如人所願地改變。

agent 常見的做法，是把原本會寫的測試塞進另一種框架；或者表面使用某技術，卻不做該技術帶來價值的部分。形式方法中，它們多證明無關性質；property-based testing 中，則大量抽完全隨機輸入，撞上無效輸入或拒絕路徑，或挑一個瑣碎性質再對它跑低價值隨機案例。IMAP 的每個條件跑四十次、其他 RFC 的少數單次實驗，也沒有實質不同。無論是 Zstd 的位元操作、IMAP 這類協定，還是其他題目，agent 都未能有效使用形式方法、測試函式庫或技術。

在 xhigh，agent 通常能讓自己寫的測試通過，但測試品質很差。例如某功能用四條 bitstream，測試卻交入四條完全相同的 bitstream，因此不會抓到調換 bitstream 的 bug。作者先前也發現，以較低 effort 在天真迴圈中反覆跑會更糟：agent 更常做這類事，且在較低正確性上停滯。

作者疑惑 AI 實驗室為何尚未建立 RL 環境，讓 agent 學會好的測試。軟體能否合理運作對 coding agent 採用很重要，而這類問題看似適合 RL；agent 已在有明確邊界的 runtime optimization 題目變得擅長，這正是能大量廉價產生 RL 環境的類型。或許有效測試環境比表面困難，也或許有效測試技術知識不夠普及，大家想到的是標準 unit testing。未來 agent 也許會強到無需測試仍能正確寫程式；但截至二〇二六年九月公開 agent 的狀態，若它們不必由測試專家帶路就懂測試，agentic coding 的有效性本可大幅提高。

作者接著按正確性由低到高談各條件，但警告不要從排名做強結論。這些失敗和他先前比較程式語言的結果相似：常是難以解釋的特殊失誤。像 agent 在 Clojure 很常弄錯 byte conversion 語意，在 Java 卻不會，儘管它們理應知道 unchecked-bytebyte 可取得 Java 語意。人們為 Elixir、OCaml、J 等偏好語言編出許多適合 agent 的宏大解釋，但實際失敗模式並不支持；Rust 的記憶體安全是少數在多語言 pandoc 評測中得到驗證的說法。流行語言成本較低、正確性較高，或許和訓練資料較多有中度相關；但本實驗最清楚的模式只有：只給函式庫或技術名稱，agent 多半不會有效運用它。

### Verus

Verus 以 SMT solver 與多種推理方式證明程式符合規格。agent 沒有用它驗證實際 Zstd 程式，反而證明抽象性質。作者沒有用過 Verus，不能判斷專家或初學者的標準做法；但讀過教學後，他仍覺得奇怪，因為 Verus 明明似乎特別便於對實際程式碼證明性質。

即使有證明，性質也少且無趣。例如它們證明在 cursor、index、distance 都有效時，操作仍在範圍內；這不算壞性質，卻不是 bug 的來源。更常見的是空洞證明，近乎把前提 A 原樣放進結論 A。真正證明的通常很簡單，並避開高風險區。比如 encode 與 decode 的 bitstream 順序常被寫反，而測試使用回文式資料便檢不出錯；若對反轉做證明，也許能逼 agent 從另一個角度思考。

xhigh 下 Verus 的總成績尚可，略低於平均正確性但便宜得多；medium 成本平均，完整正確率和平均通過測試數卻都是最低。因為 agent 沒從 Verus 取到價值，它保障正確性的主力仍是 Rust `#[test]`。在 Verus 特別差的四 stream jump table 功能中，Verus 與 Default 都有一百六十次裡八十九次寫出測試，但 Verus agent 較常寫錯預期或寫容易通過、覆蓋空間差的測試，例如四條 stream 全相同。Verus 本身沒有理由導致差 unit test，正如使用 Clojure 不該導致 byte conversion 錯；這些特殊失敗的原因，外部觀察者很難知道。

### Alloy 與 differential testing

Alloy 常被稱為有界 model checker；Alloy 6 加入額外功能，作者承認這超出自己的專業。他的理解是 Alloy 通常證明模型的性質，不是直接證明程式碼正確。它拿到倒數第二差的正確性，medium 與 xhigh 都差。max 與 xhigh 結果通常高度相關，且與 medium 明顯不同；這是少數未畫出的補充現象。和 Verus 一樣，Alloy agent 幾乎仍靠 Rust `#[test]`。

個別案例曾接近抓出問題：一次 Alloy 找到 counterexample，agent 因而在 Rust 實作加入緩解措施；但該例依賴八位元 overflow，實際程式用六十四位元 `usize`，根本不會發生。另一次 Alloy 規格錯誤，相關測試失敗後 agent 修掉規格；如果原規格正確，或許能促成正確程式，但並不清楚是否真的防住 bug。Alloy 的模型比 Verus 更貼近 Zstd 演算法，卻仍是錯的模型。

Differential testing 是讓同一輸入通過多份實作再比較輸出。理論上它很適合 LLM：不同抽樣可得不同結果，而作者先前發現，讓 agent 對同一實作反覆迭代，往往不如從頭重開。但這裡是第三差：xhigh 稍高於平均，medium 遠低於平均。一百六十次沒有任何 agent 建出兩份完整且獨立的實作；其中一百三十五次做了可稱為 differential testing 的事，卻通常瑣碎無用。即使可能抓 bug，它們也不是獨立實作，而是把同一種做法寫兩遍，因此同一 bug 兩邊都有。作者有時會要求 agent 用分開 context 獨立處理，但此條件沒有有效做到。

### Hegel skill、Lean 4、QuickCheck

官方 Hegel skill 在正確性排序中比 Hegel 本體更前，原因只是結果更差；詳細原因留到 Hegel 段落。Lean 4 可大略看作互動式定理證明器。作者若事先猜哪個形式工具會好，原會看好 Lean：它熱門，似乎較可能已有 RL 合成資料。但 Lean agent 證明的仍多是算術性質，沒有碰到容易出 bug 的風險面，也高度仰賴普通 Rust 測試；證明幾個不重要的事項並未改善正確性。

QuickCheck 是歷史上最知名的 property-based testing 函式庫之一。agent 用它的效果和前述形式工具差不多：多寫簡單 smoke test、完整隨機輸入則對 Zstd 很差，因為大多只走少數失敗或拒絕路徑。檢查的性質也很少；一百六十次裡有六十三次只檢查一項性質。雖然所有 agent 都用了 QuickCheck，它們仍主要依賴傳統測試；而且奇怪的是，比 Default 或多數條件寫了更多傳統測試，卻有較少測試—修正迭代，因此成本低於平均。

### TDD

TDD 在 Zstd 和 IMAP 評測都較差。這份提示確實顯著改變行為：agent 產出約兩倍測試，流程也更常呈現測試、程式、測試、程式的反覆節奏；但 TDD 擁護者可能仍不會稱其為真正 TDD，因為細粒度迭代案例不多。agent 會先寫更多測試：在大幅實作、而非 stub 前，已有一個以上失敗測試的 run 為一百六十次中的六十七次；Default 是零次。

按大類看，TDD 每一種測試都更多：小而瑣碎的測試更多，整合與 end-to-end 也更多，不能簡單說它做太多或太少某類測試。但它更常在四 Huffman stream 的 jump table 評測失敗；雖然測試覆蓋一般情境更多，困難案例卻沒覆蓋，例如四條 stream 同一且很簡單。作者不知道為何 TDD priming 會讓 agent 寫出更差測試與實作。

若只有 TDD 和少數條件，或許可猜 TDD 使 agent 增加許多低價值小測試；但 Verus 也出現類似模式，這不足以解釋。兩份 skill 也讓 agent 更迭代，可能假定更常執行就較好，結果也較差。整體而言，xhigh 與 max 的 agent 能讓自寫測試通過；更迭代地達成這點，常造成更多會強制錯誤行為的錯誤測試。

Yossi Kreinin 提出一種解釋：程式寫前，對困難點知道得較少，較難設計難題測試；即使做隨機測試，也較不會把分布導向 bug。看過程式後，反而知道哪些部分看似顯然正確、哪些不確定。因此 TDD 會偏向複雜機器較不有效的 black-box testing，而不是 white-box testing；他對人類較有把握，對 agent 較沒把握。作者接受「結果上」預測正確，卻不確定自己原先理由正確；他認為還需更多評測與探查，並猜新資料可能會推翻自己的原始推理。

### Spin、Hegel、ToB、rstest、Rust test、Creusot、mutation testing

Spin 是 model checker，成績已接近平均但在兩個 effort 都中度落後且成本低。它對某類行為建模與該行為隱藏測試通過與否沒有相關；使用仍是表面而無產出。Hegel 是基於 Hypothesis 的 property-based testing library。其常見流程是讀 RFC 和 API/contract、實作 Zstd、跑普通測試、讀 Hegel 文件、寫一到四個簡單 property test，然後回到 Rust 內建測試。

Hegel skill 沒改善正確性，反而更差，雖仍可能只是隨機波動；更明顯的是成本：medium 高二成六、xhigh 高四成一。skill 讓 agent 多寫測試，但多是「畸形輸入不 panic」和 round-trip；前者正是所有 PBT 與 fuzzing 條件原本就過度做的事，後者本非壞主意，卻沒有對準高 bug 區。skill 本身三萬四千字元，還會載入四萬五千字元的 Rust 參考，超過兩萬 token；每次開始讀取，後續多個 action 又重讀，平均額外成本為 medium 一成六、xhigh 一成八，原始 token 平均分別多九十萬與一百八十萬。快取命中率雖在初讀後達九九點八五％，重讀仍昂貴。skill 規定結構化步驟，又帶來不增正確性的工作。它實際只在一百六十次中一百五十七次被使用；是否使用同樣具有外部人難解的隨機性。

Trail of Bits skill 只有一百零八次真的被打開。它建議 Rust 使用 proptest，但說新增 dependency 要核准；本實驗是單輪自主 run，於是沒有加。結果仍是初步、無助的 property testing。rstest 是 fixture-based library，但 agent 幾乎沒有按其意圖使用：形式上用了，實際把普通 unit test 放進 rstest，連 rstest 的核心特性都沒碰。顯然其他條件至少還會做些低價值 property test；rstest 這裡等於只換容器。

Rust test 指 agent 在 Default 以及其他條件大量使用的內建框架。明確要求它使用內建框架會帶來更多測試：medium 約兩倍，xhigh 多二成五，卻沒改善正確性。Kreinin 指出固定 input/output 測試會鼓勵機器和人把程式當下輸出編進預期值，再說服自己這合理；若生成輸入，就得寫程式判斷輸出對錯，即使那段程式也可能有 bug，至少迫使人思考「正確」是什麼。

Creusot 與 Verus 同一類空間，agent 一樣沒有有效使用。Mutation testing 原意是故意改動程式，藉此檢查測試有多有效並補測試；agent 多半沒有做真正 mutation testing，只是正常測試時稍微改幾個東西，和 TDD 指令改變行為卻沒帶來 TDD 一樣。真正 mutation testing 很少而且量很小。

### Judgement、fuzzing、Insta、SMT、TLA+、metamorphic testing

Judgement 條件要求 agent 依判斷調整方法。就前面的結果而言，它主要還是使用 Rust unit test；少數做有限 fuzzing，雖然其他測試和形式函式庫都可用，卻沒用。Fuzzing 的定義是以某方式隨機化測試輸入。agent 很依賴塞隨機 bytes，結果多次走同一路徑，也就是無效輸入；即使隨機變動有效輸入，也多半重複走拒絕路徑。

只有十次產出隨機的結構化輸入，其中一半找到了真 bug，部分並不簡單。五／一百六十算不上好，但已是相對有效的技術使用，顯示 agent 某種意義上知道如何做；只是不會在沒有推動時採取。這也表示可透過訓練或更好的引導改善。Insta 是 snapshot 或 golden testing 函式庫，通常將正確的序列化資料、資料結構 JSON 或 CLI log 當 snapshot；agent 幾乎沒做 snapshot testing，雖會用 Insta，卻常在其中寫普通 unit test。

SMT 條件提供 Z3、cvc5、Yices。agent 多把 solver 當草稿紙，用來算 FSE state range、header 算術等；即使建模，通常也不是避免常見錯誤的那件事。例如一個運算本應是 `byte1 + (byte2 << 8) + 0x7F00`，agent 卻把它當成 `byte1 + (byte2 << 8) | 0x7F00`，沒有建立能抓到此錯的模型。

TLA+ 是行為建模語言與工具。它進入高於平均的條件群，但仍低於 Default；medium 稍高於平均、xhigh 更高一些，排名不宜過度解讀。一百六十個 agent 有一百五十九個建立某種 TLA+ 模型，通常是 Zstd state machine；三十個對 Huffman、FSE、entropy 這些常有 bug 的區域建模。可是建模多在實作與大量普通測試之後才進行。agent 有時會找出並修正 TLA+ 模型錯誤，但作者沒有找到任何一次由 TLA+ 問題導致 Rust 程式碼真的改變；模型越複雜也沒有更高正確性。

Metamorphic testing 要求相關輸入產生可預期關係的輸出，例如排序輸入中不相等元素的順序改變，不應改變輸出排序；加法輸入加一值，輸出也應在 overflow 模組下增加該值。agent 有檢查合理性質，如在 frame boundary 插入 skippable frame 不應改輸出、合法 block 重新分割不應改輸出；但它們沒有碰到 agent 常錯的區域，所以無助正確性。作者用醉漢在路燈下找鑰匙的笑話形容：鑰匙在公園丟了，卻只在有光處找。奇怪的是 xhigh 使用 metamorphic testing 的次數反而少於 medium。

### ECC、Default、Audit、audit 加 fuzz、不要犯錯

ECC 表面成績不錯，主要因 skill 大部分被忽略。一百六十次中一百五十三次讀了 skill，讀取會使測試變多；越早讀、越受曝露，增加的測試越多。然而它幾乎追上 Default，作者猜是隨機：七個沒讀 skill 的 agent 異常好且全數正確；九個晚讀、幾乎沒受影響者也全數正確。這也解釋 medium 與 xhigh 分數相同，因為幾乎沒讀 skill 的 run 多在 medium。即使 skill 是否被叫用可能有偏差，整個模式意味 ECC 除非像只在不被使用時生效的幸運符，否則並不有效。

應只看 skill 真正影響行為的案例；那時 ECC 低於平均，位置約在 Rust 內建框架與 Creusot 之間，失敗模式是大量小而無意義的測試。它要求 red-green TDD；agent 的行為也許不算實踐者眼中的 TDD，但確實會在實作功能前先做小測試，因此測試數暴增，卻不是有效的開發方式。作者提醒 Caveman mode 實驗也顯示 LLM 方差很大，少量 run 很容易讓人誤以為 skill 有效。即使這次跑了一百六十次，若只看頂層分數，ECC 仍像還可以；真正消除噪音要更多樣本，也需要人查看結果，而不是把頂層數字流傳。作者試過讓當代公開 SOTA 模型分析結果，分析依然充滿基本推理錯誤。

Default 沒有測試或驗證指令，卻高於平均並不意外：指定函式庫或技術時，agent 常被引去做無用工作；不要求它做無用工作就可能較好。Audit 條件要求實作後審計；一百六十次中一百五十二次真的審計，一百五十一次聲稱找到問題並改程式。它們通常挑了合理區域，卻沒用新 context 獨立審計，往往又犯了原本的同一錯。四十二次用了獨立 agent，分數反而更差，可能非因果，而是情況更壞或題目更難才分派。

Audit 在 xhigh 拿到最高正確性，medium 卻低於平均，且審計顯著增加成本，尤其 xhigh。平均來看和 Default 差不多，尚無足夠證據說它真的是 xhigh 較好、medium 較差。Em Chu 的經驗相符：他多數 token 花在 audit，並固定要求不要 spawn subagent、自己讀懂 code/diff，也不要執行程式；他覺得允許這兩件事會讓 LLM 明顯變笨。他也會加「敵對思考」、「考慮所有 feature 組合與整個輸入空間」等話，但不確定有沒有用。

「audit and fuzz risky areas」在 Zstd 中會讓 agent 聚焦 FSE、Huffman、bit reader、state，這些確是 agent 常漏問題的高風險區，選點比純 Fuzzing 好。medium 多半忽略指令，xhigh 較常遵守。它沒有表現差，卻看不出比無指示好。原因之一仍是生成大量大多無效的隨機輸入；人類 tester 會把隨機化導向有趣輸入，agent 沒做到，也很少有效檢查輸出，常只看 crash。Fuzzing 常被聯想成只查 crash，這不奇怪，但不是人類測 Zstd 想要的驗證。

「不要犯錯」技術上比 Default 高一點，但行為沒有實質差異，分數也很近；作者猜是隨機變異。各層檢查都像是從 Default 隨機抽樣而來。這個零操作比許多迫使 agent 做無效工作的條件更高，只凸顯排名不能脫離實際工作來讀。

### Kani、ACL2、Proptest、property-based testing、短 skill

Kani 是 Rust model checking library。若標準是「真的對會執行的程式碼使用形式方法」，它覆蓋最好，因為 Kani 偶爾真的用在 Zstd 程式上；但大多仍是表面使用。有一次真正 Kani 使用抓到非瑣碎 bug，因而改了 Rust 程式。一／一百六十不算好，但表示 agent 有時能偶然合理使用 Kani；作者猜若放進 RL 環境，模型可學得更好。Kani 成本顯著較高，原因似乎是反覆讀 Kani 輸出帶來大量 input token。

ACL2 是定理證明器。許多 run 在一百九十二 GiB 限制下 OOM，而 OOM 結果沒有計入，造成不透明偏差。它的分數雖高於 Default，作者不認為這很可能有因果或顯著性；如其他形式方法，ACL2 多證明對正確性無重要影響的內容。若 Default 和看似等價的「不要犯錯」都居頂，合理解釋是其他條件嚴重拉低表現。

Proptest 是 property-based testing library。和其他隨機測試一樣，大多測試不有趣，過度依賴隨機也造成差覆蓋；但它的 shrinking，也就是把造成失敗的輸入縮成更簡單案例，有時確實有價值，優於多數條件幾乎沒有價值的情形。只說「property-based testing」的條件中，所有 agent 都選 Proptest，因此等於第二個 Proptest arm；測試通常仍不好，偶爾抓 bug，shrinking 也偶爾有收穫。這個意外的第二 arm 也明顯高於平均，作者覺得有點有趣。

作者自己的短 skill 是為測「簡單 skill」而寫。他本來不用 skill，而是 prompt、看結果、再 prompt；Max Bittker 建議把作者腦中關於測試的知識寫進去試試，看到結果後對作者說了聲「我早說了」。skill 要求：實作前想高風險細微 bug 區，對每區說出可能錯法與合理替代解讀，再找讓結果不同的檢查，偏好邊界兩側的不對稱案例；實作後，對高風險區在不看 production code 的新 context 獨立重推並比較，不重用 helper；可行時用 PBT 或隨機輸入探索空間，少把力氣花在 no-panic/no-crash；隨機化要探索有趣 state 與 code path，必要時產生結構化輸入；不確定細節時，以獨立推理查正確答案。

它拿到最高分，卻沒有按預期工作。agent 幾乎從不真的建立 fresh context，所以該條指示等於白寫；不知道它是該更強迫執行，還是該刪掉。agent 確實能辨識高風險區，像 encode/decode bitstream 反轉，但這不等於會測對。medium 的第三十五次 run 甚至標出風險、做獨立推導與 audit，仍失敗；測試輸入是回文，順序反轉仍得到同結果。所有 fuzzing/PBT 也都是手工做；既然 agent 對 Proptest 尚可，skill 可輕易加入使用 Proptest 的指令。它確實降低了「太隨機」測試的標準失敗模式，較多人做出有些意義的測試，但仍低於作者期待的人類或人類積極引導的 agent。沒有持續迭代，不知道通用指引應怎麼寫；針對 Zstd 結構花幾分鐘給特定提示，反而是作者在別題見過有效的方式。

作者認為短 skill 的初稿不糟，卻還不能拿來用。若在更多例子測試、確認沒有只對 RFC 或密集位元操作過擬合，改良版可能有效；但它仍沒捕捉人類真的駕駛 agent 時會做的事。作者習慣先提示、看 agent 說做了什麼與部分結果、再據此追問；預先塞資訊和收到資訊後反應是不同問題。既知的 fuzzing 失敗模式，偶爾回頭檢查就容易阻止，完全前置的指令只能部分緩解。

### 一般評論與如何寫出好測試

作者不把資料拆成漂亮易讀的多張圖，是因為看完行為後，核心事實是「agent 把 Verus 用壞」和「agent 把 QuickCheck 用壞」；比較兩者誰壞得較少不太有趣。稍有意思的是，agent 能辨識哪些區域有細微 bug 風險。可是無論建議哪個 library 或 technique，它通常都沒能使用。先前只叫 agent「測試」或反覆叫它多測，也只得到差測試；這篇顯示就連指定某些作者親身認為有效的技術，也一樣。作者短 skill 也許有改善空間，但需要遠多於兩分鐘的打磨。Kreinin 的說法是，軟體測試現況本來就很糟，agent 回落到訓練中的預設行為，得到差結果不奇怪。

Proptest 看來稍好，但仍遠低於讀過 manual、並得到測試方向的人類會做出的水準。作者想知道更強指引是否能使 agent 對 Proptest 比其他 library 更有效，留待後文。至於如何讓 agent 寫好測試，他的經驗是先建立合理的 test 與 triage 結構，之後讓 agent 在上面增補，無需大量監督也能做到還可以。出於自己的背景偏好，他常用隨機測試、fuzzing、PBT；Jamie Brandon 則在 snapshot testing 得到同樣結論。

Brandon 說，在一個專案只要求 snapshot testing 時，多模型 agent 都會說自己正在做，實際卻沒做，寫了 unit test 還宣稱是 snapshot test。另一專案中，他把測試移到獨立 crate，並在 AGENTS.md 指示測試留在該 crate、不可改 public interface，才讓 agent 寫出合理的 mocked IO end-to-end test。作者目前更常讓 agent 寫測試程式、以 CLI 對話；Brandon 更常親手寫程式。但無論手法，只要先設好合理結構，似乎都可行。

作者把它與先前觀察相連：做任何稍微合理的事都有效。若只「和」agent 說話、給像 Zstd 或 IMAP 實驗那樣輕指令，它會做得差；若看完它做的事再補幾句，常可很快引到好結果。作者自稱沒有理解模型如何運作，猜測也可能錯；但模型內部某處或許有相關知識，只是不在預設行為附近，連說出技術名稱都不足以叫出來，必須有足夠 priming 才會付諸實作。能否把它封裝為 skill、實驗室會否訓練測試與形式方法、或其他訓練會否間接改善，仍是未答問題。

### 預測是否準確、skill 與 skill 寫法

事前預測的結果是：TDD 較差，成立；形式方法沒有勝出，成立，但理由不是作者以為的「同等熟練時不該勝出」，而是 agent 根本沒有效使用；「不要犯錯」不勝過無指示，成立，它高於多數條件是因為零操作比無效操作好；ECC、Hegel、ToB skill 都沒有勝出，成立。作者沒正式登記、但內心持有的兩項預測則錯了：Lean 不如預期在形式方法中表現好；短 skill 也不是他原以為的平庸或差。Bittker 事先說過原因，結果也正好按那個理由發生，作者承認這種被精準預言卻沒相信的感覺很可笑。

作者曾因大家都在用 skill 而覺得自己的 scratchpad 加複製貼上 prompt 工作流老派又低效；但聽 Thorsten Ball 演講，發現他也不重度依賴 skill，又與幾位看似有效使用 LLM 的人交談後，開始懷疑自己其實沒漏掉太多。這次實驗使他更相信先前直覺：看過幾個 skill 後覺得會幫倒忙，雖信心低，結果確實如此；只靠觀察 agent 反應、做很多小實驗形成的直覺，也能適用於 skill。他另看過未納入的測試 skill，覺得也有相同失敗模式。

他還做過兩個未詳述實驗，測由大 AI lab 與一家「小型」數十億美元公司支援的官方 skill，結果都令表現更差。這反倒使他更看好個人用途的 skill：失敗模式可預測，便可修正，不必做昂貴實驗。要發布一份跨模型、跨 harness 都很好的公共 skill 可能很難，因為 Claude 與 Codex 想要的 prompting 風格不同；但若只服務自己的特定 model、harness、effort，修掉使它不如無 skill 的問題，或許做得到。

作者承認不懂如何寫好 skill；但除了自己一兩分鐘的版本，本文與另兩個實驗的 skill 都像給人看的教程，目標是解釋怎麼做事。他天真的猜測是：若模型原本已有該主題的一些知識，這未必是最優。模型已有預設行為分布，較自然的寫法應是改變那個分布的陳述，而不是教一個完全不懂的人從零完成行為。

不同 harness、模型、effort 有不同預設行為；往 prompt 或 skill 塞很多文字不能消除它，只是用更長方式推離預設，還可能有無意推動。本文中大量文字被忽略，而忽略何時發生又依 harness、模型、effort 而變。ECC 即使讀了，多數指令仍被忽略；TDD 指令雖有影響且使結果更差，仍沒有真正按清楚寫出的 TDD 做。GPT-5.5 到 GPT-5.6 已使作者的工作方法大變：部分原本可靠的提示失效或變不可靠，雖然整體能力變強；他不會用同一方式提示兩版模型，也不想用同一 skill。

因此，誰會對每個模型與 effort 跑 skill 評測，建立差異化的 skill 組合？除了 AI lab 裡的人，作者想不到；AI lab 也不會替競爭者的 harness 與模型優化。對泛用「好好測程式」skill，他持懷疑；但可想像為自己的固定用例與配置做幾份有效 skill。測試本身也沒有脫離被測物、品質門檻與品質維度的通用流程；他真正想給 agent 的，是針對某模型某 effort 的特定壞習慣加以推離，而非一般性步驟。或許可有一種 skill 先問使用者問題，再輸出正確的 agent 指令；但模型改進很快，個人現在未必值得花時間調它。若在做 agentic product、要服務更多人，情況可能不同，但從已試技能看來，要做出無效 skill 並不難。

他也指出 skill 可能泛用於教 agent 執行 workflow 或操作 API／介面，例如 Sawyer Hood 協助 agent 驅動瀏覽器的 skill；作者沒有試過，並不背書，但讀其內容與 scripts 後認為風格和本文測試 skill 很不同，可能真正省事。文末感謝 Max Bittker、Yossi Kreinin、Em Chu、Dennis Snell、@panoramic.blue、Jamie Brandon 的意見與校正。

### 附錄：回應、agent 的荒謬與實驗細節

David R. MacIver 回應說，遺憾地講，Dan Luu 說得對，Hegel skill 現在確實有點爛；許多 agent skill 的共同問題是 agent 不擅長寫 agent skill，大家卻都用 agent 寫它們。一名共同朋友提到 MacIver 後來可能建立 benchmark，確認 Hegel skill 的缺陷，並著手改善 skill 或調整 Hegel 的註解與文件，使 skill 不再必要。作者認為即使本文唯一結果只是 Hegel 有更好的 skill，也很不錯；測量與 benchmark 常被低估，公開一個量測就能指出未知缺口、促成修正，這是他多篇文章帶來過的改變方式。

另一則附錄展示 agent 的荒謬：作者叫 agent 為分析查一個簡單資料，結果它啟動 perl，跑了兩小時二十分才被作者殺掉。他說需要自動捕捉這類事件，因為很常見。子 agent 對一個四十四 KB、一千三百六十四行的小檔做 regex 搜尋，卻使用在 PCRE 下退化、造成組合爆炸的 expression。作者拿先前幾分鐘做出的 FRE regex engine 重跑，零點七秒完成；Rust regex 是零點六秒。

這件事不該發生有三個理由：第一，agent 不該叫能有組合爆炸的 regex engine，沒有理由不採用預設安全的 ripgrep 等工具；第二，expression 本身錯了，成功時會回傳無用的大 capture，也非預期行為；第三，子 agent 完成後，為何子 agent 或 harness 沒自動殺掉 process？當然不是每個 process 都該立刻殺，但 agent 常留下 runaway process。作者已有清理 agent 遺留記憶體與暫存 build artifact 的程序，只是沒掃 runaway perl；這是又一項要加的清理。他懷疑開源這小工具有何意義，因為主要 harness 修好後它就應該過時。

實驗細節附錄中，作者以想快速寫完為由沒有完整展開；各條件分布與先前程式語言對正確性和 token 成本的研究沒有根本不同。他本想半小時寫完，最後仍近一萬字。特別值得記下的是：有些頂層圖表看似非常有趣、很有說服力的結果，仔細看其實是給 agent 很短提示來設定實驗時造成的實驗錯誤；修正後得到乏味得多的負面結果，除了 Codex 建議的 skill 看來反效果這一點。

IMAP 結果整體更沒意思：它像商業邏輯問題，卻比大型又昂貴的 pandoc 評測小；後者某些較差語言每 run API 成本超過一千美元，Rust 也要七百美元才能只到三成測試通過，而本文採的是更嚴格的「整次完整通過」指標。IMAP 只有一次完整通過，即 medium 的「不要犯錯」。若看結果，可戲稱它以二點五％勝過其他全為零的條件，終於證明「不要犯錯」有效；但實際上所有方法仍不有效。

即使看似適配 IMAP state 與 concurrency 的 TLA+，也沒有成功。一百六十個相關 IMAP run 中，只有五／八十 agent 在寫 Rust 前用 TLA+，其餘七十五／八十都先做實作再拿出被指名的工具。agent 幾乎總是選一個小型 mailbox mutation 建模，而不是 multiple observers、event queues、UIDVALIDITY、mailbox epochs 等它們實作時常錯的部分；反倒去建模 CONDSTORE、QRESYNC，這些 Default 已有超過九九點六％通過率的區域，TLA+ agent 通過率還更低。

作者最後提醒，所有評測都以 RFC 為題，確實很不現實；但不現實之處是規格比人們給 agent 的真實需求更清楚、詳細、少歧義。因此他預期本文看到的失敗模式，在現實世界的問題只會相同或更糟。另一則註腳提到，ChatGPT 曾替作者 fact-check，說「沒有 RL 環境訓練測試」是錯的，並列出三篇訓練 agent 寫差 unit test 的論文；作者認為這正是今天會得到差測試的訓練。重視 correctness 的不同子領域，各自收斂到幾套和小 unit test 相反的技巧；訓練 agent 做那種嚴肅情境下人們反而不採用的事，不會得到好 correctness。雖有與 RL 和 randomized testing 相關的研究，本文結果顯示大型 AI lab 模型並未真正吸收這類能力。至於人們對語言優越性的漂亮說法，作者猜未來更強模型也未必會讓它們成真；他用撲克為例，許多看似符合 solver 的「range advantage」概念，仔細檢查 solver 資料也未必成立。談 coding agent 的強弱，與其丟出好聽的雞尾酒會概念，不如直接做實驗。

## 城武觀點

我站在先投資可重現驗證 harness 與失敗回饋的一邊，不買更長的 skill 清單就能換來可靠性的說法。原文最刺眼的不是某個形式工具失敗，而是 agent 常把「使用工具」完成成一個看似嚴謹的動作：證明不相干性質、把隨機輸入灌進拒絕路徑、讓錯誤測試一路綠燈。沒有能讓錯誤顯形、能把驗證結果推回實作決策的任務環境，prompt 與 skill 只是替預設行為加了裝飾。特定專案的提示或工具當然仍可能有效，這份實驗也不是所有 coding agent 的最後判決；但可靠性不能靠宣稱，而要靠可重跑、能失敗、失敗後會改變下一步的驗證結構。

*城武的未解檔案——測試名稱寫進 prompt 的那一刻，錯誤不會自動變得可見。*
- 原文：[How well do agents use test/verification techniques?](https://danluu.com/agentic-testing/)（Dan Luu, 2026-09-09）