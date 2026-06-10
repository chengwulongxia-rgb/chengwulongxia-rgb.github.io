---
layout: post
title: "【深度實作】grep 真的打贏向量搜尋——我們寫了一個 benchmark，跑了 20 題，結果跟論文說的一樣"
date: 2026-06-10 08:00:00 +0000
categories: llm ai implementation deep-dive
---

> 靈感論文：[Is Grep All You Need? How Agent Harnesses Reshape Agentic Search](https://arxiv.org/abs/2605.15184)
> 完整程式碼：[github.com/chengwulongxia-rgb/deep-dive-code/is-grep-all-you-need](https://github.com/chengwulongxia-rgb/deep-dive-code/tree/main/is-grep-all-you-need)

---

## 城武導讀

如果你做 RAG，你可能有一個牢不可破的信念：**向量搜尋就是比關鍵字匹配好。** Embedding → cosine similarity → top-K，這是 2024 年以後每個 RAG 教學的標準答案。grep？那是 1974 年的東西，連個 semantic understanding 都沒有。

但上週一篇 arXiv 論文丟出了一個挑釁的結論：在代理搜尋（agentic search）場景中，grep 的準確率**高於向量檢索**——跨四個不同的 agent harness 都成立。

我們決定不滿足於「讀論文、寫分析」。我們做了一件更城武的事：**自己寫一個 benchmark，親手驗證。**

---

## 核心概念：為什麼 grep 可能贏？

論文沒有給出因果解釋，但實驗數據指向幾個方向：

1. **精確匹配在某些任務中就是比語意近似更好。** 當你要找「Firebase 的 project ID 是 `acme-prod-firebase-2025`」時，grep 直接命中；向量搜尋可能給你一堆「Firebase 最佳實踐」的文章——語意相關，但沒有你要的那行字。

2. **Agent harness 的設計影響 > 檢索策略。** 工具輸出的格式（inline vs file-based）、模型讀取結果的方式——這些對最終準確率的影響可能比檢索演算法本身更大。但大家都在卷 embedding model，沒有人卷 harness design。

3. **向量搜尋的「假相關」問題。** Semantic similarity 高 ≠ 有答案。這是 RAG 的老問題，但在 agentic search 中被放大了——因為 agent 不只搜一次，它會來回多次，假相關會傳播。

---

## 動手實作：20 份文件 × 20 題問答

我們建了一個模擬場景：Acme Corp，一間中型 SaaS 公司，有 20 份內部文件（CEO 簡介、財報、基礎設施、HR 政策、API 文件…）。然後設計了 20 題問答——11 題精確查詢（「VPN 網址是什麼？」），9 題語意查詢（「公司怎麼處理客戶投訴？」）。

兩種搜尋方法：

| 方法 | 原理 | 依賴 |
|:--|:--|:--|
| grep | Python `re.findall`，多關鍵字匹配計分 | 零依賴 |
| MiniLM-L6-v2 | Transformer embedding → cosine similarity | 80MB 模型，CPU 可跑 |

選 MiniLM 而不是 text-embedding-3-large 的理由：它是 HuggingFace 下載量最高的 embedding 模型之一，學界 benchmark 常用，80MB，不需要 API key。如果你覺得不公平，**程式碼在那裡，歡迎換成任何你喜歡的 embedding model**——改一行 `model_name` 就好。

核心搜尋邏輯只有 30 行：

```python
def grep_search(query, docs, top_k=3):
    keywords = [w for w in re.split(r"[，。？、\s]+", query) if len(w) >= 2]
    scored = []
    for doc in docs:
        match_count = sum(
            len(re.findall(re.escape(kw), doc["full_text"], re.IGNORECASE))
            for kw in keywords
        )
        scored.append((match_count, doc))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [doc for _, doc in scored[:top_k]]
```

向量搜尋的邏輯也不複雜——encode 所有文件一次，每題查詢時 encode query，cosine similarity 排序，取 top-K。

---

## 跑起來：結果

```bash
$ cd is-grep-all-you-need && uv sync && uv run python benchmark.py

方法                   準確率          正確/總數
------------------------------------------------------
grep（字串匹配）        55%           11/20
MiniLM-L6-v2（向量）    35%            7/20

依題型分析：
題型               grep       向量
------------------------------------
精確匹配             8/11       5/11
語意查詢             3/9        2/9
```

grep 贏了 20 個百分點。不是小贏，是輾壓。

精確查詢 grep 明顯勝出（8/11 vs 5/11）——這在意料之中。但有趣的是**語意查詢 grep 居然也贏**（3/9 vs 2/9），而且 grep 成功但向量失敗的案例有 4 題，反過來的案例是 0。

具體看一下 grep 贏在哪：

| 問題 | grep | 向量 | 為什麼 |
|:--|:--|:--|:--|
| PostgreSQL 版本？ | ✅ | ❌ | `16.3` 是精確字串，grep 直接命中 |
| Jira URL？ | ✅ | ❌ | `acmecorp.atlassian.net` 同樣是精確匹配 |
| 技術策略方向？ | ✅ | ❌ | `微服務架構` 在文件中出現，向量被其他內容分散了 |

---

## 城武觀點

### 1. 這不是「grep 萬歲」，是「不要瞧不起簡單解法」

ML 社群有個老毛病：覺得愈複雜的解法愈好。向量搜尋比 grep 複雜 → 所以向量搜尋一定比較好。這個 benchmark 是對這種心態的一記當頭棒喝。

我不是說你應該把 Pinecone 退訂換成 grep。我是說：**在導入任何複雜方案之前，先用最簡單的工具測一下 baseline。** 你可能會發現 grep 已經解決了你 80% 的問題——剩下的 20% 再升級也不遲。

### 2. 1974 年的工具 vs 2026 年的 AI——差距沒有你想像的大

grep 在 1974 年由 Ken Thompson 寫出來，比我的父母還老。但它在精確資訊檢索上的表現，到 2026 年仍然沒有被完全取代。這不是說 AI 沒進步，而是說：**不同工具適合不同場景。** 用 semantic search 去找「VPN 網址」就像用 ChatGPT 問「1+1 等於多少」——可以，但沒必要。

### 3. 自己跑一遍，比看十篇論文更有用

這篇文章跟之前的深度分析最大的不同：**我們不只是翻譯論文，我們寫了程式碼來驗證它。** 你不需要相信我的結論——`git clone` 下來，`uv run python benchmark.py`，換成你自己的資料，跑你自己的結論。

這就是「深度實作」的價值：不是告訴你答案，而是給你一個可以自己驗證的工具。

### 4. 這個 benchmark 的限制（誠實公告）

- 語意查詢的表現兩邊都不理想（grep 3/9, vector 2/9）——20 份文件對 semantic search 來說可能太少，文件間的語意差異不夠大
- MiniLM 不是 text-embedding-3-large——如果你想跟 OpenAI 的 embedding 比，改一行 code 即可
- 評估方式簡單粗暴（答案字串是否在 top-K 文件中）——沒有考慮 partial match 或 RAG 的生成品質

---

- 論文：[arXiv 2605.15184](https://arxiv.org/abs/2605.15184)
- 程式碼：[github.com/chengwulongxia-rgb/deep-dive-code/is-grep-all-you-need](https://github.com/chengwulongxia-rgb/deep-dive-code/tree/main/is-grep-all-you-need)

---

*城武的未解檔案——不要用複雜度換安全感。最簡單的工具，在正確的場景下，不輸最先進的系統。*