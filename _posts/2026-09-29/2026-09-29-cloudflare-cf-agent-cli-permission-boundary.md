---
layout: post
title: "【深度分析】Cloudflare 的 cf：當 agent 能找到三千個 API，誰來證明它不會碰錯？"
subtitle: "可發現性解決了 agent 不知道怎麼做；權限邊界則要回答它憑什麼可以做。"
date: 2026-09-29 01:00:00 +0000
categories: [llm, ai, deep-analysis]
tags: [Cloudflare, cf, agentic-cli, API, security, permissions, DevOps]
---
{{ site.baseurl }}/assets/images/2026-09-29-cloudflare-cf-agent-cli-permission-boundary/hero.jpg

Cloudflare 新推出的 `cf`，把命令列重新定位成 agent 的操作介面：不是要人記住旗標，而是讓模型從可搜尋、可機讀的 API 表面找到下一步。這確實處理了舊工具最實際的問題——文件版本、命令命名與輸出格式不一致時，agent 容易把猜測當成操作。但一個能探索整個控制平面的 agent，也把安全問題推到更尖銳的位置：它發現命令，並不等於已證明自己只會動到應動的資源。

## 原文摘要

Cloudflare 說明，`cf` 是一個面向整個 Cloudflare API 的新 CLI，仍在 technical preview。它的出發點是 Wrangler 的覆蓋範圍有限：Wrangler 長年由各產品團隊手工建立命令，因此命名、互動方式與輸出格式不一，約只有 280 條操作路徑；Cloudflare 的 API 則有超過 3,000 項 operations。公司以 Forge 這套統一的 API 生成管線，從同一份支撐 API 文件與 SDK 生成的 OpenAPI schema 出發，再補上少量 CLI 所需標註，直接生成命令。這不是逐一替 Wrangler 補功能，而是將 schema 變成命令列的來源，使整個 API 表面可被暴露。

這種架構首先服務的是沒有既有記憶的 agent。面對數千條路徑，`cf cli search` 讓使用者以自然語言描述目標；小型搜尋索引再依 API 描述與參數回傳合適命令。Cloudflare 表示，agent 第一次執行 `--help` 時會得到這項功能的提示。其設計含義很直接：與其期待模型從訓練資料記住不斷變動的手冊，不如讓工具在執行當下暴露自己能做什麼。

輸出格式也反轉了傳統 CLI 的優先順序。Wrangler 的部分命令才支援 `--json`，其餘可能回傳供人閱讀的 Unicode 表格；`cf` 則把 JSON 設為預設，為人類排版、為 agent 壓縮，以便模型篩選欄位而不是先解讀表格。這項選擇不只是在節省 token：它將機器可解析性設為共同的基礎行為，降低每一條命令另行處理格式的成本；相對地，使用者也必須能看懂 agent 實際挑選了哪些欄位與參數，否則標準化只會讓自動化更不透明。當任務需要人類輸入，例如購買網域，官方描述的是將 API 要求拆成一串經驗證的表單欄位，而非把每個長參數鏈都丟回終端機。

另一個方向是 `cloudflare.config.ts`。官方將它稱為由 TypeScript 驅動的設定格式，先從 Workers 開始，目標是逐步涵蓋整個 Cloudflare；型別、程式化設定與 LSP 可讓人與 agent 取得更準確的補全與脈絡。範例以 `defineConfig`、`bindings` 和 `triggers` 描述環境變數、KV、D1、R2、Queue、排程與路由，並可透過 `cf migrate` 遷移。官方也說，既有依賴 Wrangler 的 JavaScript Workers，必要時仍會由 `cf` 委派給 Wrangler 處理開發與部署；open beta 結束後才會有導向 `cf` 的 Wrangler 最終 major 版本，並在 beta 結束後維護 Wrangler 18 個月。這些是官方的 technical-preview 說法與產品方向，不應讀成所有服務都已完成同等成熟的宣告。

## 社群討論

HN 的焦點沒有停在「三千條命令是否夠酷」。最受注意的建議是把 token 所需權限預先顯示，甚至提供 `cf permissions check`：列出缺少與多餘 scope，讓人不必讓模型反覆猜權限組合。有人把問題說得更嚴厲：目前不少資源無法細分到適當的資源群組，Workers 又不屬於 zone；若最低權限仍可替換或刪除 production 程式碼，CLI 的便利只會放大既有邊界不足。

另一群討論者要求短效、狹域 token，或由宿主代理把權限切成容器只能使用的一小部分；也有人希望人類能對偶發的高風險動作逐次批准，而不是為了免除日後摩擦先發一張長效萬用 token。這些是社群提出的期待，不是 Cloudflare 已在 `cf` 中承諾的能力。討論同時指出，agent 擅長沿著 CLI 執行，卻常無法診斷失敗原因；因此一致、可讀的 help 與能指出「缺哪個 scope、如何修正」的錯誤訊息，不是裝飾，而是防止錯誤指令被合理化的介面。對操作者而言，這也讓權限診斷成為可被檢查與討論的安全訊號。

## 城武觀點

可發現性是對的，但它只是把「不知道怎麼做」變成「現在什麼都做得到」。安全邊界不該由模型的提示詞承擔：產品應能證明本次 scope、發短效且狹域的憑證、把高風險動作交給人核准，並先給可讀的 dry-run／diff。否則三千個可搜尋命令，只是把控制平面的鑰匙更快遞給會說自然語言的人；誰被排除在審核之外，仍沒有答案。

*城武的未解檔案——會找路的 agent，不等於拿到路權。*

- 原文：[Introducing cf: the agentic CLI for the entire Cloudflare API](https://blog.cloudflare.com/cloudflare-cf-cli-launch/)（Cloudflare Blog）
- 社群討論：[Building a CLI for all of Cloudflare](https://news.ycombinator.com/item?id=47753689)（Hacker News）
