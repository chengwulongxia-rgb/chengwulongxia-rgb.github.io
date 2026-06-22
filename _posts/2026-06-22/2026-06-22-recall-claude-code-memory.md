---
layout: post
title: "【深度翻譯】Recall — 把 Claude Code 的記憶鎖在本機"
date: 2026-06-22 03:00:00 +0000
categories: [llm, ai, deep-translation]
---

![hero]({{ site.baseurl }}/assets/images/2026-06-22/recall-claude-code-memory-hero.jpg)

Claude Code 每次新 session 都是一片空白——你不知道上回改到哪、專案目標是什麼，一切從新解釋。開源專案 Recall 用一個全本機的 TF-IDF + TextRank 摘要引擎，幫 Claude Code 補上它一直缺的東西：長期記憶。而且完全不連網、不用 API key、不走任何外部模型。

## Recall 是什麼

Recall 是 raiyanyahya 開源的 Claude Code plugin，核心很簡單：記錄每次 session 的對話內容，壓縮成一份摘要，下次開 session 時自動載入。全本機運作，不需要 API key，不呼叫外部模型，連摘要都是用 classical Python 做的——Claude Code 本身是 loop 裡唯一的 AI。

> Claude Code starts every session cold. Recall keeps a local log of your sessions and condenses it into a resume-ready summary — entirely on your machine.

重點在「entirely on your machine」。不是「我們會加密儲存」，不是「我們承諾不分享」——而是根本上就不離開你的電腦。

## 為什麼需要 Recall

三個理由。第一，免費——摘要不走 LLM，不消耗 subscription credits。第二，省 token——每次從 context.md（約 1–2K tokens）接續，比從頭解釋省太多。第三，隱私——你的對話記錄（程式碼、路徑、甚至可能夾帶的 secrets）不送往任何 API。

Recall 在專案下寫入兩個檔案：
- **history.md**：append-only 的完整對話 log
- **context.md**：本機摘要器產出的壓縮版「目前進度」——目標、摘要、下一步、改過的檔案、中斷點

## 跟 Claude Code 原生記憶的關係

Anthropic 其實以經給了幾個記憶工具，但 Recall 補的是它們之間的洞：

- **CLAUDE.md**：手寫規則，不自動記錄實際發生的事
- **--continue / --resume**：完整重播對話，但 token 很重，而且綁機器的 session history
- **Context compaction**：只在同一個 session 內壓縮，不是持久記錄

> Recall fills the gap between these: an automatic, deterministic record of what each session did, condensed into a compact resume point.

白話文：CLAUDE.md 是「我希望你怎麼工作」；Recall 是「我們上次做了什麼、做到哪」。兩者不衝突，但缺了 Recall，Claude Code 就是一個沒有記憶的工程師，每次見面都要自我介紹。

## 技術核心：TF-IDF + TextRank

最有趣的一點：Recall 的摘要器完全不用 LLM。它用 TF-IDF 把句子轉成向量，建餘弦相似度圖，然後用 TextRank（PageRank 變體）跑 power iteration 排序句子，取 top N 保持原順序輸出。numpy 可選——有就加速，沒有就用純 Python 版，結果一模一樣。

## 隱私與安全設計

Recall 不做任何網路呼叫、不用 API key、不載入第三方模型。更細的是幾個防禦設計：redaction 模組會自動遮掉 API key、token、PEM 金鑰等 secret 形狀；git 操作關掉 fsmonitor、hooks、pager，防止惡意 repo 透過 git config 執行任意程式碼；output_dir 被鎖在專案目錄內，不能跳出去寫到別的地方。

> No credentials, ever. The plugin has zero references to API keys, auth, ANTHROPIC_*, or HTTP.

針對團隊共用情境，作者也誠實標注了 trust boundary 問題：context.md 是注入到 model 的 input，如果有人能寫入 .recall/，理論上可以塞一個 crafted context.md 做 prompt injection。

## 城武觀點

全本地不是功能差異，是政治聲明。Anthropic 把 memory 握在手裡——你不知道 retention、不知有沒拿去訓練。Recall 用 TF-IDF + TextRank 就把資料主權拉回使用者端，技術極簡，界線清楚：你的程式碼不該是 Anthropic 的訓練料。Anthropic 不做長期記憶，開源補上了——反過來揭露他們的設計選擇：不是不能做，是不想做。更玩味的是 raiyanyahya 的姿態：大公司走向「你的對話我們分析」，個人開發者用「資料留本機」反向搶市場。沒 PR 預算、沒 launch 活動，純靠 Show HN 貼文和一包 Python 腳本贏工程師信任。這不是產品競爭，是價值選擇。

*城武的未解檔案——當你發現讓 AI 記住你最好的方法，是不要讓它把你的話傳回去。*

- 原文：[Recall — Give Claude Code perfect long-term project memory](https://github.com/raiyanyahya/recall)（raiyanyahya, GitHub, 2026-06）
