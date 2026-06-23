---
layout: post
title: "【深度分析】Oak——專為 AI agent 設計的版本控制系統，從新思考 Git 的設計假設"
date: 2026-06-23 03:00:00 +0000
categories: [llm, ai, deep-analysis]
---

![hero]({{ site.baseurl }}/assets/images/2026-06-23/oak-agent-vcs.jpg)

Git 統治了版本控制將近二十年，但它的設計假設全都是「為人類協作而生」——每個 commit 要有訊息、merge 要手動處理、clone 要拉全部歷史。Oak 從新思考：如果版本控制的用戶不是人類，而是 AI agent，那套系統會長什麼樣子？它提出的答案，可能比你想像的更激進。

## 原文深度翻譯

Oak 自稱為軟體開發的 **agentic substrate**——一個為自主編碼 agent（Claude Code、Codex、Cursor 等）打造的版本控制與儲存層。它不執行 agent（你可以帶自己的 agent 來用），而是提供一個奠基於 agent 真實工作方式的底層基礎。

Oak 的核心設計圍繞一個前提：**branch 是工作單位，不是 commit**。`oak init` 或 `oak clone` 會自動從 `main` 分支建立一條個人特性分支——你永遠不會直接在 `main` 上工作。每一輪 agent session 對應一條獨立分支，session 結束後再合併回去。這意味著 feature branch 上的 commit **沒有 commit message**——branch description 才是描述變更的唯一來源。合併時產生一個 squash commit，訊息直接來自 branch description，而直接 push 到 `main` 會被拒絕。

工作流程是這樣的：agent 在自己的分支上 checkpoint、push，然後由人類 review diff 並執行 merge。Oak 的開發者特別強調「merge 是人類的決定」，不該讓 agent 自行合併到主線。

Oak 另一個關鍵創新是 **lazy mount**。不同於 Git 的完整 clone，`oak mount org/repo` 會建立一個虛擬檔案系統，按需擷取物件——agent 看到完整的目錄樹，但實際檔案內容只有被讀取或修改時才會下載。對 monorepo 來說，這把幾分鐘的 `git clone` 縮短到幾秒鐘，對 agent 的啟動速度影響巨大。

技術架構上，Oak 用 Rust 編寫，remote 託管在 oak.space，本地儲存使用 SQLite 搭配 BLAKE3 content addressing。CLI 是單一靜態二進位檔，macOS（Apple Silicon）與 Linux x86_64 都已支援。

截至 2026 年 6 月，Oak 處於活躍開發階段。repo 上有超過 310 條已合併分支，近期更新包括 Windows 建置支援、權限強化、agent-facing JSON API，以及圍繞「agentic substrate」定位的文件重構。

## 城武觀點

Oak 的設計優雅——branch 為單位、lazy mount 取代 clone，都是從 agent 工作流長出來的合理選擇。但這份「合理」藏著幾個值得追問的問題。

**鎖定效應。** agent 的 session、description、merge 全部綁定 oak.space 這個 centralized remote。Git 活了這麼久，靠的是分散式設計——任何人自架 remote、離線工作。Oak 把 remote 集中化，短期換效率，長期就是 vendor lock-in。當所有 agent 寫的程式碼都流經同一個 remote，誰控制 Oak 就控制了 agent 生態的歷史。

**過早最佳化。** branch-per-session、no commit message、squash-merge only——這些設計預設 agent 的工作方式跟人不一樣，所以需要不同的基礎設施。但 agent 的工作流以經穩定了嗎？還是我們在為一個還在快速變動的模式打造專屬版控？「不完美但夠用」有時比「完美但綁死」更健康。

**中央集權的誘惑。** Oak 宣稱效率優先，把 remote 集中到 oak.space、local 只留 working tree。這在技術上合理（lazy mount 確實快），但政治經濟學上呢？去中心化不是一個 feature，它是 Git 留給生態系的護身符。Oak 悄悄把護身符收走了，換成一個更快、更封閉的 remote。

*城武的未解檔案——當版本控制的歷史不再分散在全球數千個伺服器上，而是集中在一個人的資料庫裡，那「去中心化」這件事就不再只是技術選擇，而是你放棄了才發現它是護身符的東西。*

- 原文：[Oak — Version control for agents](https://oak.space/oak/oak)
