---
layout: post
title: "【深度分析】LLM成本能省42%？用兩項基準重算模型混用方案"
description: "以Jeffery Kline的公開快照，重算兩模型混用的成本與逐項分數門檻，再比較只保留單一門檻會選出什麼。這是CPU算術與約束核對，不是重新評測模型或實際API帳單。"
date: 2026-11-06 11:31:06 +0800
last_modified_at: 2026-11-06 11:59:42 +0800
categories: [llm, ai, deep-analysis]
image: /assets/images/2026-11-06/llm-cost-frontier.png
---

![兩項基準門檻、模型混用與估算成本]({{ '/assets/images/2026-11-06/llm-cost-frontier.png' | relative_url }})

同一批分數，可能找不到任何一個更便宜的模型能全部達標，卻能算出一份更便宜的混用比例。這不是把兩個模型融合成新模型，而是把工作量分開計價。問題在於：這個比例保住的是已知基準的加權分數，還是實際工作的品質？

本文選取Jeffery Kline工具中的長文件案例，以公開資料做CPU重算：原配置每千項基準任務估算129.65美元，兩配置各占一半後為75.18美元，下降約42.0%，且兩項分數都不低於原門檻。再只移除其中一條門檻，看選擇為何改變。沒有呼叫模型API，也沒有宣稱替實際服務省下這筆錢。

## 原文摘要

Kline於2026年11月2日發布互動工具，以DEA比較模型配置的基準表現與API成本。「匹配」要求每項基準都不退步；混用則以同一組工作量比例加權成本及分數。作者明示真實工作分派尚未驗證，估算不含延遲、配額與切換等部署成本。[1]

工具引用Zhou等人在Eval4NLP 2022發表的資源與效能比較方法。本篇不重現整篇論文，也不將這份計算器當成即時模型價格表；以下聚焦一個可逐步核對的計算案例。[4]

## 一、先把「不降分」寫成兩條條件

本次讀取工具內嵌資料的長文件推理設定，包含45個有完整資料的配置。資料標示來源快照為2026年10月26日、衍生計算日為11月2日；模型名稱、推理設定與價格均沿用這份歷史快照，不代表本文發布時的現行報價。[1]

先選GPT-6.1 Terra（Low）作為要替換的配置。它的條件不是一個總分，而是：

- AA-LCR v1.1至少81.0%。
- GDP.pdf至少25.6%。
- 原估算成本每千項基準任務129.65美元。

一個替代方案必須同時跨過兩條線。若只看兩個百分比的平均，高分項目就可能掩蓋另一項退步；這裡不允許那種交換。

「每千項」也不是每千token，或一千筆任意長度的客戶請求。這個設定將兩個基準按相同任務數合併，成本是該評測工作量下的估算。把它搬到以另一類文件為主的服務，連成本的任務組成都已改變。[1]

## 二、各有弱項，為什麼混用反而能達標？

公開資料中的兩個候選配置如下。成本都換算為每千項基準任務，分數依原資料保留後四捨五入呈現：

- **Terra（Medium）**：AA-LCR約80.7%、GDP.pdf 28.4%，成本約130.99美元。
- **Luna（Max）**：AA-LCR約83.3%、GDP.pdf 22.8%，成本約19.37美元。

第一個配置的AA-LCR未達81.0%；第二個配置的GDP.pdf未達25.6%。各自單獨替代都不合格，但它們低於門檻的項目不同。[1]

以下是本站用原始精度重算的最小例子。這是算術輸出，不是新生成的模型成績：

```python
cost = (130.98707 + 19.367298) / 2
lcr = (80.6666666666667 + 83.3333333333333) / 2
pdf = (28.4 + 22.8) / 2
print(f"${cost:.2f}; AA-LCR {lcr:.1f}%; GDP.pdf {pdf:.1f}%")
```

實際執行輸出：

```text
$75.18; AA-LCR 82.0%; GDP.pdf 25.6%
```

結果的AA-LCR高於原門檻，GDP.pdf剛好達標，成本也低於原配置。首圖右側用兩個分數當座標軸：綠色區域是兩條件都成立的位置；混用點落在兩候選配置的連線上，也落進達標區。左側成本條則是這個比例下的估值，不能把右圖理解成「模型真的多答對了哪些題」。

各占一半的意思，是在這個計算模型中分配一半工作量，不是每題同時問兩個模型、再合併答案。後一種做法有不同的呼叫量與評分方式，本次沒有測試。

## 三、只改一件事：不再要求GDP.pdf達標

為了看清門檻的作用，我們保留同一份45配置資料與成本，只拿掉GDP.pdf條件。現在只要AA-LCR不低於81.0%，就算合格。

重算後，最便宜的單配置變成Luna（Max），每千項估算19.37美元，AA-LCR約83.3%。但它的GDP.pdf仍只有22.8%，低於原先的25.6%要求。

這個對照不是模型表現改變，而是我們放寬了「什麼算可替代」。它也解釋為何不能只交付一個省錢百分比：若沒有一併交代哪些品質條件被保留，讀者無法分辨是在提高效率，還是在接受另一種品質組合。

反過來，若仍要求兩條件都成立，但禁止混用，這份資料中最便宜的合格單配置就是原先的Terra（Low）。因此，本例的較低估算成本來自允許工作量組合，不是發現了另一個各項分數都更好、更便宜的單一模型。

## 四、這個最佳化到底驗證了什麼？

可以把運算寫成一個有邊界的問題：替每個配置指定非負比例，所有比例加起來等於一；讓加權成本最小，同時要求每項加權分數都不低於原配置。成本與所有分數共用同一組比例，不能在不同基準各挑一個最好看的模型。

我們從原頁讀出資料後，核對比例、重算兩個分數與成本；另核對45個配置的單模型可行性，以及公開結果所附的對偶證書。對偶證書提供合格組合的成本下界；本次核對各配置都符合證書條件，算出的下界又與候選成本一致，數值容差為1e-10。這支持該方案在這組候選配置與線性假設內已達最小成本。

這能確認公開案例的計算互相吻合，卻沒有檢查任何模型的新回答，也沒有把基準分數的點估計升格為統計上的非劣等結論。45個有完整資料的配置，更不是全世界所有可買到的模型。

## 五、從加權分數到實際分派，還少哪一步？

若在相同任務分布中，獨立地把題目隨機分給兩個模型，按比例加權可作為平均表現的預測。但實際分派若依文件長度、難度或內容分類，就不再能直接套用各模型在整份基準上的平均分數。被分到的那一半題目，可能恰好不同於原來的評測分布。

這裡需要的新資料不是另一份價格表，而是分派後的實際結果：固定一批未拿來選比例的任務，讓原配置與候選分派方案處理同樣的輸入，逐類比較答案、失敗與用量。若使用自動路由器，路由器也成為待測系統的一部分；不能拿純粹的50／50算術替它背書。

成本也要在同一批任務上重新計算。若某類失敗需要再呼叫較貴模型，補救成本必須計入；若有回應時間或資料不能送往另一家供應商的要求，也要先列為限制，不能等算出便宜比例後才發現不能部署。這些是由計算假設走向應用時要另行驗證的條件，不是本文已完成的部署測試。

本次可帶走的結果很明確：在固定資料裡，「沒有更便宜的合格單模型」不等於「沒有更便宜的線性工作量組合」。但要保住的是哪幾項能力，必須先寫清楚；把GDP.pdf條件拿掉，就會得到便宜得多、卻不再符合原要求的選擇。

## 六、核對程式與資料範圍

完整實作收在[deep-dive-code的獨立專案](https://github.com/chengwulongxia-rgb/deep-dive-code/blob/4c6cfef654fde2c0c5847dd0cc64362b01415a36/llm-cost-frontier/README.md)，包含[核對程式](https://github.com/chengwulongxia-rgb/deep-dive-code/blob/4c6cfef654fde2c0c5847dd0cc64362b01415a36/llm-cost-frontier/audit_cost.py)、[固定輸入快照](https://github.com/chengwulongxia-rgb/deep-dive-code/blob/4c6cfef654fde2c0c5847dd0cc64362b01415a36/llm-cost-frontier/data/cost-data.json)與[原始核對結果](https://github.com/chengwulongxia-rgb/deep-dive-code/blob/4c6cfef654fde2c0c5847dd0cc64362b01415a36/llm-cost-frontier/results/cost-audit.json)。程式與驗證資料以repo為準，blog只保留文章解說與圖片。

```bash
git clone https://github.com/chengwulongxia-rgb/deep-dive-code.git
cd deep-dive-code/llm-cost-frontier
uv sync --frozen --python 3.13
uv run --frozen python audit_cost.py data/cost-data.json
uv run --frozen python -m unittest discover -s tests -v
```

上述核對指令使用專案內固定JSON，取得Python環境後即可離線執行，不需要GPU、API key或模型服務，也不執行該頁JavaScript。原CLI省略輸入路徑時，才會連網讀取作者公開頁面；快照雜湊改變即停止，不把新資料冒充本篇的歷史案例。

本次搬移後已從專案內資料重新執行，並以五項測試核對原始結果一致、單一門檻失敗對照、快照變動拒絕及離線不觸發HTTP。程式與先前公布的結果保留原位元組；本次CLI輸出另存於[重跑結果](https://github.com/chengwulongxia-rgb/deep-dive-code/blob/4c6cfef654fde2c0c5847dd0cc64362b01415a36/llm-cost-frontier/results/replay.json)。首圖仍為依資料自行繪製的圖片。

## Sources

[1] https://jeff-kline.github.io/posts/same-ai-results-for-less/index.html — Could you get the same AI results for less?（Jeffery Kline，2026-11-02）
[4] https://aclanthology.org/2022.eval4nlp-1.2 — Assessing Resource-Performance Trade-off of Natural Language Models using DEA（Zhou等，2022）

- 原文：[Could you get the same AI results for less?](https://jeff-kline.github.io/posts/same-ai-results-for-less/index.html)（Jeffery Kline，2026-11-02）。
