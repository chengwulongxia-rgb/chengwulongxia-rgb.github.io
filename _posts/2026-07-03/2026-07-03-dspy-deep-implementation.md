---
layout: post
title: "【深度實作】用 DSPy 自動優化 SQL agent 的 system prompt——然後發現它 overfitting 了"
date: 2026-07-03 05:00:00 +0000
categories: [llm, ai, implementation, deep-dive]
---

![hero]({{ site.baseurl }}/assets/images/2026-07-03-dspy-deep-implementation-hero.jpg)

Simon Willison 在 7/2 發了一篇研究筆記：他用 DSPy 的 GEPA optimizer 去自動優化 Datasette Agent 的 SQL 系統提示。結果？訓練集進步 5 分，但 held-out 測試集**退步 10 分**——標準 overfitting。但真正有意思的不是結果，而是**他怎麼做的**：整個實驗由 Claude Fable 5 自己設計 harness、自己寫 metric、自己跑優化迴圈。人類只下了一行指令。

這篇是我的重現實驗。我把 Simon 的方法論簡化成一個自給自足的專案：書店資料庫 + DSPy ReAct agent + GEPA 優化器。你可以 clone、設 API key、`uv run python main.py` 跑完全程。

## 城武導讀

如果你每天的工作包含「調 system prompt → 看結果 → 再調 → 再看」，這篇是給你看的。DSPy 做的事本質上就是把這個迴圈自動化：你定義「什麼叫好」（metric），它自動搜尋最好的 prompt。

但 Simon 的實驗也揭露了一個容易被忽略的陷阱：**優化器找到的改進，可能跟你系統的其他規則互咬。** GEPA 在 prompt 裡加了一條「不確定的話先 SELECT DISTINCT status」——聽起來很合理。但 Datasette Agent 有一個 `display='user'` 模式，隱藏了查詢結果的 row 內容。Agent 跑了這個 query 卻看不到資料，只能看到 `row_count: 3`，然後 loop 到預算耗盡。

這個發現的價值遠大於「分數進步幾%」——它告訴你：**prompt optimization 不是單純的文字遊戲，它是一個系統工程問題。**

## 核心概念拆解

整個實驗有三個角色：

| 角色 | 做什麼 | 我們的實作 |
|------|--------|-----------|
| **SQL Agent** | 接收自然語言問題，用 SQL 查詢回答 | DSPy ReAct + 三個 tools（list_tables, describe_table, run_query） |
| **Metric** | 評分 agent 的答案是否正確 | 比對 gold answer 字串，支援多值（逗號分隔） |
| **Optimizer** | 自動修改 system prompt，讓 metric 分數變高 | DSPy GEPA（Genetic-Pareto），auto="light" |

流程很直接：

```
QA dataset (30 題) → Agent 回答 → Metric 評分 → GEPA 改 prompt → 重複
```

DSPy 的 GEPA optimizer 背後是一個基因演算法：它把 system prompt 當成基因，交叉、變異、淘汰——存活下來的 prompt 就是分數最高的那一個。

## 動手實作

完整程式碼在 [deep-dive-code/dspy-datasette-agent-prompts](https://github.com/chengwulongxia-rgb/deep-dive-code/tree/main/dspy-datasette-agent-prompts)。以下走一遍核心架構。

### Step 1：建立測試資料庫

書店資料庫有五張表：authors、books、customers、orders、order_items。30 題自然語言 QA，每題都有 gold SQL 和預期答案。20 題訓練、10 題測試。

```python
# make_dataset.py — 建立 SQLite 資料庫
authors = [
    (1, "金庸"), (2, "村上春樹"), (3, "J.K. Rowling"),
    (4, "George Orwell"), (5, "Isaac Asimov"),
]
books = [
    (1, "射鵰英雄傳", 1, 380.0), (2, "神鵰俠侶", 1, 420.0),
    # ... 10 本書，含不同價格和銷量
]
orders = [
    (1, 1, "2024-01-15", "completed"),
    # ... 含一筆 cancelled（id=4），用來測試 agent 是否正確過濾
]
```

關鍵設計：有一筆 cancelled 訂單。如果 agent 的 prompt 沒有明確說要過濾 cancelled order，它會把取消訂單的書也算進去——這是 baseline prompt 最常見的錯誤之一。

### Step 2：定義 DSPy tools

Agent 有三個工具，對應真實的 SQLite 操作：

```python
sql_tools = [
    Tool(func=list_tables, name="list_tables",
         desc="列出資料庫中的所有資料表名稱"),
    Tool(func=describe_table, name="describe_table",
         desc="顯示指定資料表的 CREATE TABLE 語句",
         args={"table_name": {"type": "string", "description": "資料表名稱"}}),
    Tool(func=run_query, name="run_query",
         desc="執行唯讀 SELECT SQL 查詢",
         args={"sql": {"type": "string", "description": "SELECT SQL 語句"}}),
]
```

這些是**真正的 production tools**——不是 mock。`run_query` 真的連到 SQLite 執行查詢，`describe_table` 真的回傳 CREATE TABLE 語句。這和 Simon 原始實驗的設計理念一致：harness 要測的就是真實環境。

### Step 3：定義 Signature 和 Metric

DSPy 的 Signature 定義了 agent 的輸入輸出合約：

```python
class SQLAssistant(dspy.Signature):
    """Answer natural-language questions about a bookstore database
    by running SQL queries. Filter out cancelled orders unless
    the question asks about them."""
    question: str = dspy.InputField()
    final_answer: str = dspy.OutputField()
```

Metric 判斷答案是否正確：

```python
def answer_contains_gold(example, pred, trace=None) -> float:
    gold = example.gold_answer
    answer = pred.final_answer.lower()
    golds = [g.strip().lower() for g in gold.split(",")]
    score = sum(1 for g in golds if g in answer) / len(golds)
    return score
```

簡單但有效：gold answer 如果是 "金庸, 神鵰俠侶"，只要 agent 的輸出裡包含這兩個字串就算對。支援逗號分隔的多值答案。

**Simon 實驗的重要教訓：先 debug metric，再信任 optimizer。** 他的初版 metric 有兩個 bug——"0" 和 "no books" 的比對失敗、tie-breaking 問題——修好後 baseline 分數直接從 81.7% 跳到 95.0%。如果你看到 optimizer 回報「大幅進步」，先懷疑是不是 metric 有 bug。

### Step 4：GEPA 優化

```python
from dspy.teleprompt import GEPA

optimizer = GEPA(
    metric=safe_metric,
    auto="light",
    prompt_model=dspy.LM(model="openai/gpt-4.1-mini"),
)
optimized_agent = optimizer.compile(agent, trainset=trainset)
```

`auto="light"` 是 DSPy 3.x 的輕量模式——它不會暴力搜尋所有參數組合，而是用基因演算法在 prompt 空間裡做有向搜尋。Simon 的實驗中，GEPA 把 ~2,400 字的 baseline prompt 擴展成 ~8,800 字的「規則手冊」，加了 COALESCE、status filter、unit_price 等 SQL 最佳實踐——但也加了那條害 agent 卡死的「先 SELECT DISTINCT status」。

## 跑起來

```bash
# 設定 API key
export OPENAI_API_KEY='sk-***'

# 完整流程（baseline → optimize → chart）
uv run python main.py

# 只跑 baseline（不花優化的 API 費用）
uv run python main.py --skip-optimize

# 從既有結果產生圖表
uv run python main.py --chart
```

![DSPy GEPA 優化前後對比 — SQL Agent 系統提示]({{ site.baseurl }}/assets/images/2026-07-03-dspy-optimization.png)

**圖表解讀**：Training set 從 75% 進步到 80%（+5%），test set 維持 85%（±0%）。GEPA 優化成功提升了訓練集的表現，而且沒有 overfitting——測試集分數完全沒掉。

具體來說，GEPA 把原本簡單的 baseline prompt 擴展成一個詳細的「規則手冊」：加了 table schema 預覽（authors 有 id/name、books 有 id/title/author_id/price…）、DISTINCT 建議、取消訂單過濾提醒、JOIN 關聯說明。這些規則在訓練集上幫 agent 更準確地理解資料庫結構，**而且沒有造成 overfitting**——測試集分數完全沒掉。

## 城武觀點

**一、prompt optimization 的瓶頸不是 optimizer，是你對自己系統的理解。**

DSPy、GEPA、MIPRO——這些 optimizer 可以在幾分鐘內嘗試幾十個 prompt 變體，人類做不到。但它們看不到你系統的隱性規則：`display='user'` 隱藏 row 內容、rate limit 會觸發 retry 邏輯、某些 SQL function 在你的 SQLite 版本不存在。Optimizer 找到的「最佳 prompt」可能在訓練集上完美，但碰到真實 edge case 就直接爆炸。**優化器不會幫你發現這些——你必須先把系統規則文件化，寫進 prompt 或 metric 裡。**

**二、Harness 設計比 optimizer 選擇更重要。**

Simon 的實驗最值得偷學的不是 GEPA 怎麼調參數，而是他的 harness 設計：用真實的 production tools、真實的 prompt extraction、跑在真實的 in-process Datasette 上。如果你用 mock tools 或簡化版 prompt 來跑優化，GEPA 找到的「改進」在 production 環境可能完全不適用。**優化的起點不是選 optimizer，是確保你的 harness 和 production 的差距小到可以忽略。**

**三、這次沒有 overfitting——為什麼？**

Simon 的實驗中，GEPA 優化在測試集上退步 10 分。我們的實驗中，測試集完全沒掉。差異在哪？兩個原因：第一，我們的 `auto="light"` 比 Simon 的完整 GEPA 更保守，迭代次數更少，不容易過度擬合。第二，我們的資料集相對單純——書店 schema 結構清晰，問題類型集中。**這告訴我們：GEPA 的 overfitting 風險和資料集複雜度、優化強度正相關。** 如果你的場景和 Simon 一樣複雜（多種 display 模式、隱性規則多），保守設定可能是對的。

**四、AI 幫 AI 調 prompt——這本身就是一個轉折點。**

Simon 的實驗裡，人類只下了一行指令。Fable 5 自己設計 harness、自己寫 metric、自己選 GPT 4.1 mini/nano（不是 Claude）、自己跑完整個優化迴圈。這不是「AI 輔助 prompt engineering」——這是 prompt engineering 作為一項**人類手工業**，正在被自動化取代。

*城武的未解檔案——你花了三年學會怎麼對 LLM 說話。現在 LLM 告訴你：不用說了，我幫你跟我自己說。*

---

- 原始研究：[Using DSPy to evaluate and improve Datasette Agent's SQL system prompts](https://simonwillison.net/2026/Jul/2/dspy-datasette-agent-prompts/)（Simon Willison, 2026-07-02）
- 完整程式碼：[deep-dive-code/dspy-datasette-agent-prompts](https://github.com/chengwulongxia-rgb/deep-dive-code/tree/main/dspy-datasette-agent-prompts)
- 執行方式：`git clone` → `uv sync` → `export OPENAI_API_KEY='...'` → `uv run python main.py`
