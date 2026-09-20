---
layout: post
title: "【深度分析】Jev 不是更快的聊天模型：把 agent 的小判斷拆回程式"
date: 2026-09-20 01:00:00 +0000
categories: [llm, ai, deep-analysis]
---
![hero]({{ site.baseurl }}/assets/images/2026-09-20/jev-system-one-agent-decisions.jpg)

城武導讀：agent 最拖時間、也最容易失控的地方，往往不是寫一段漂亮文字，而是一路上那些「要不要升級」、「該用哪個模型」、「這個按鈕能不能按」的小判斷。TypeSafe AI 把這類工作打包成 Jev：不生成文字，改收狀態與預先定義的問題，回傳可放進程式分支的型別化機率。這篇要拆開它真正改變了什麼，以及它沒有解決什麼。

## 原文摘要

TypeSafe AI 在 9 月 15 日公布 Jev，將它稱為第一個 **System One Model**。創辦人 Diogo Almeida 的出發點很直接：聊天模型早已很會對話，為何軟體自動化仍沒有如預期普及？他的答案不是再做一個更會聊天的 LLM，而是改變模型和程式之間的介面。Jev 接收非結構化或結構化的「state」——例如一張客服工單、使用者目前的介面、已嘗試的工具與結果——再回答程式事先定義好的 typed questions。它被描述成「前沿智慧的 function call」：狀態輸入，型別化的機率式決策輸出。

這個介面刻意放棄字串生成。既有 LLM 的強項是逐 token 生成，能寫聊天回覆、程式碼、拒答或任何自由文字；但要交給軟體使用，輸出還得被解析、驗證，並防備模型偏離格式或捏造不存在的值。TypeSafe 的說法是，Jev 的可能結果與結構由程式先定義，因此不會產生 type error；每個答案還帶著校準後的機率與 confidence。這裡必須分清楚：schema 合法，不代表判斷為真。它保證的是輸出可被程式讀取的邊界，不是現實世界會照著答案走。

其 primitives 有三種。**Choice** 在有限選項中選一個，並回傳各選項的機率與整體信心；**Score** 對有順序的等級評分，例如低、中、高，回傳連續分數、底層分布與信心；**Noul** 則是是非問題，回傳一個敘述為真的機率。這套設計適合把原本脆弱的 if/else 補上一層語意判斷：不是讓模型自由發明下一步，而是讓它在程式列出的可能路徑中估計哪一條較合適。

![Jev 決策流程]({{ site.baseurl }}/assets/images/2026-09-20/jev-decision-flow.svg)

TypeSafe 宣稱，Jev 對同一個 state 裡的多個問題可平行評估，而不是像文字模型那樣逐 token 串行輸出；這是它將速度與成本押在結構化決策上的核心。原文列出的目標工作包括 classify、route、score、extract 與 branch；也包括對大量資料做 map-reducing、需要即時反應的產品，以及對 LLM 的 prompt、推理軌跡或輸出做評分、驗證、guardrail 與 jailbreak 偵測。它不是把「思考」整體壓縮成一次呼叫，而是把可以明確界定的許多小問題，做成能並行回答的決策圖。

這也是 TypeSafe 所謂 calibrated decisions 的重點。原文批評一般 LLM 即使被要求報告信心，仍可能過度自信且不一致；若一個模型九成五時答對，卻不會辨認剩下五分的情況，應用程式就很難可靠地自動化。Jev 的訓練方法被稱為 Reinforcement Learning for Calibrated Decisions（RLCD），其主張是：高信心應對應較高正確率，相近輸入應更一致。這是對「信心」的可操作定義，而不是讓模型在答案後面補一句「我很確定」。但校準必須回到每個應用自己的資料上驗證；在客服、支付、醫療預約或內部維運等不同分布裡，同一個 0.9 並沒有天然相同的風險含義。

原文也提出一組很強的效能敘事。TypeSafe 聲稱其端到端回應時間為 70–500ms，並以自家 workflow evals 宣稱首頁所列的 193.6 倍更快、444.6 倍更便宜；另一段比較則將 System One 形狀的查詢描述為可達 40–200 倍的加速。這些都應當讀成 TypeSafe 的供應商主張，而非獨立驗證的普遍結果。公司自己也列出限制：公開評測多從美國西岸的筆電執行，服務當時也設在西岸；workflow 由其 model capabilities 團隊成員設計，所以即使不在訓練分布中，仍可能有工作流設計偏差；其 reference answer 使用較大外部模型的平均預測，且所有模型都被同一套 wrapper 約束成相容的結構化決策。Jev 在發布時仍是 early access，價格可否長期維持也被原文留作待時間驗證的問題。

TypeSafe 用「不會 hallucinate」來包裝型別安全：結果不會跳出預定義 schema，對深層依賴鏈裡的工具呼叫尤其重要。不過，原文同時把這個安全性說成 schema matching 的數學保證，而非一套對世界事實的保證。錯誤的工單分類、錯誤的風險估計、選了不合適但仍存在的 UI 動作，全都可以是完全合法的結構化輸出。真正可用的設計因此不是把 Jev 當裁判，而是讓它給程式一組可記錄、可測量、可拒絕的概率訊號。

### 實作模式一：客服工單的緊急度與分流

客服場景最適合先從多個獨立問題開始，而不是讓模型寫一封「看起來很懂」的回信。把工單文字、客戶方案、事件持續時間與是否有服務中斷組成 state；定義 urgency 的 Score、是否影響營收的 Noul，以及 queue 的 Choice。程式可在高緊急度且信心足夠時建立 on-call 通知；低信心案件則送到人工分流，而非硬塞進優先佇列。

```python
# 示意程式：decision_client 是你自行封裝的模型呼叫，不是可直接執行的 SDK。
def route_ticket(ticket, decision_client):
    state = {
        "message": ticket["message"],
        "plan": ticket["plan"],
        "outage_minutes": ticket["outage_minutes"],
    }
    answers = decision_client.decide(
        state=state,
        questions={
            "urgency": {"type": "score", "levels": ["low", "medium", "high"]},
            "revenue_impact": {"type": "noul", "statement": "The issue is blocking sales."},
            "queue": {"type": "choice", "options": ["billing", "technical", "account"]},
        },
    )
    if answers["urgency"].level == "high" and answers["urgency"].confidence >= 0.90:
        return {"action": "page_on_call", "queue": answers["queue"].choice}
    return {"action": "human_triage", "reason": "low confidence or non-urgent"}
```

重點不是 0.90 這個數字本身；它只是產品團隊在歷史工單上驗證過錯分成本後，才有資格設定的政策。答案與採取的行動都應留 audit log，才能回頭檢查「高信心」是否真的對應到高準確率。

### 實作模式二：模型路由

LangChain 的實作文章將 Jev 放在 agent loop 的模型路由位置：把使用者請求歸入程式預先定義的 fast 與 powerful 等選項，讓簡單查詢與局部修改走較快、較便宜的模型，架構或高風險任務走能力更強的模型。這不是宣告小模型永遠便宜就夠了，而是先將路由標準寫成選項與規則，再利用機率與信心處理邊界案例。

實務上可把「可否在低成本模型完成」、「是否涉及不可逆修改」、「是否需要長篇推理」拆成多題，而不是只問一句「難不難」。若路由信心不足，安全預設不該是賭一把省錢，而是升級到較強模型或請使用者補充脈絡。Jev 在這裡是決策閘門，不是內容產生器；最後的解釋、程式碼與開放式推理仍由文字 LLM 處理。

### 實作模式三：工具風險閘門

LangChain 也展示以 Jev 在工具執行前檢查風險的 middleware 模式。比較穩健的理解不是「它讓工具執行變安全」，而是它能把一個原先藏在 agent prompt 裡的模糊判斷，變成明示的風險分類與升級規則。state 至少該包含工具名稱、參數、目標資源、目前權限與任務目的；問題則可限定為 read-only、可逆寫入、外部傳送、破壞性操作等選項。

程式端應把低風險與高信心視為「可繼續評估」的必要條件，而不是充分條件：再檢查 allowlist、使用者授權、沙箱與審計。高風險、低信心或任何不可逆操作，一律停住並升級給人類或能力較強、可提出理由的 LLM。閾值是減少誤觸的控制面，不是安全保證書。

### 實作模式四：行動裝置／UI QA 的下一步選擇

Callstack 的 agent-device 概念驗證把 Jev 接到 mobile QA loop：agent-device 從 accessibility API 讀取按鈕標籤、文字與欄位值，形成帶 reference 的 UI snapshot；runner 再把可見、未停用的控制項轉成有限 actions。Jev 看任務、當前畫面、前一畫面與前一步 action，從「加入購物車」、「看購物車」、「等待」、「捲動」、「通過／失敗／未完成」等候選動作選下一步，執行器才依 reference 按下或輸入。

這個分工很關鍵。Callstack 明說 Jev 讀的是文字與結構化資料，不讀 screenshot 或 video；可填的文字也要先放在 action 裡，Jev 不負責臨場生成字串。把隱藏、disabled 或被阻擋的控制項排除在候選集之外，先縮小模型能選的行動空間。當選擇與後續畫面不一致、信心過低，或 QA 任務涉及修改設定，runner 應停止、記錄並交給人工或較強的 LLM 判讀，而不是把一個合法 choice 當成測試已經通過。

### 它替代的是哪一段，不是哪一種模型

Jev 不取代文字 LLM。需要理解含混需求、規劃未知步驟、寫回覆、生成程式、向人解釋失敗原因時，LLM 的開放式推理與生成仍是主角。Jev 的適用範圍則是高頻、邊界已劃定、可列出候選答案的小決策：分類、路由、評分、抽取、分支與驗證。把兩者硬比成誰比較聰明，反而錯過這個架構的重點：讓 LLM 不必為每個微小 if-statement 重開一次自由文字世界，讓程式也不必假裝所有語意都能手寫成規則。

## 城武觀點

Jev 最有意思的宣稱不是「AI 想得更快」，而是把原本藏在 LLM 文字輸出裡的裁量，搬到程式明定的選項、閾值與升級路徑。這確實讓應用程式被允許做什麼更可稽核；但別把型別安全誤讀成真實保證。schema 合法的結果依然可能是錯的，calibrated confidence 也必須拿應用自己的流量驗證。更重要的是，政策撰寫者仍定義選項與閾值，問責沒有消失，只是轉移到系統設計者。不可逆決策必須保留人類或更強模型的升級路徑；否則工程團隊只是用一個乾淨的 JSON，把責任包裝成「系統自己選的」。

*城武的未解檔案——模型可以替你排序選項，但不能替你決定哪一個錯誤值得由人來承擔。*

- 原文：[Introducing System One Models & Jev](https://typesafe.ai/blog/introducing-system-one-models-and-jev)（Diogo Almeida, TypeSafe AI, 2026-09-15）
- 延伸實作：[Building a Harness with Jev](https://www.langchain.com/blog/building-a-harness-with-jev)（S. Runkle、H. Lovell, LangChain, 2026-09-17）
- 實作案例：[Exploring Jev for AI-Driven QA with agent-device](https://www.callstack.com/blog/exploring-jev-for-mobile-qa-with-agent-device)（Mike Grabowski, Callstack, 2026-09-17）
