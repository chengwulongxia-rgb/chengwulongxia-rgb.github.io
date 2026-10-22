---
layout: post
guide: agent-security
title: "【深度分析】Docker Sandboxes：把「安全」從正確性偷換成隔離性的一場魔術"
date: 2026-08-11 01:00:00 +0000
categories: [llm, ai, deep-analysis]
---

![hero]({{ site.baseurl }}/assets/images/2026-08-11/docker-sandboxes.jpg)

Docker 推出 Sandboxes，讓 AI coding agent 可以「YOLO mode, safely」。這是一場精彩的市場定位秀——Docker 正在把它 13 年的容器品牌資產，從新包裝成 AI agent 時代的基礎設施層。但如果你把「安全」的定義仔細檢查一遍，會發現一個精巧的置換正在發生。

## 原文摘要

Docker Sandboxes 是 Docker 為 AI coding agent 打造的可拋棄式隔離沙箱環境。每個 agent 運行在專屬的 microVM 中——這不是傳統 Docker container，而是硬體級的虛擬化邊界。開發環境和專案工作區以 mount 方式接入，agent 可以在裡面安裝套件、修改設定檔、甚至啟動自己的 Docker 容器，但主機檔案系統完全不受影響。目前支援的 coding agent 包括 Claude Code、Gemini CLI、Copilot CLI、Codex、OpenCode、Kiro，也開放自訂其他 agent。

核心功能圍繞四個面向展開。

第一是 **microVM 隔離**：硬體級安全邊界，與主機完全隔離，比傳統 VM 更快啟動和銷毀，預設為可拋棄式——用完即丟，不留殘留。

第二是**可自訂的安全執行**：網路和檔案系統的控制規則由使用者自己定義，也可以透過 Docker AI Governance 在組織層級強制執行，確保團隊中的每個 agent 都遵守相同的安全策略。

第三是 **agent 的高度自由**：沙箱內的 agent 可以啟動 Docker 容器，擁有真實的開發環境——安裝套件、運行服務、無人值守執行長時間任務。產品頁特別點出 Sandboxes 支援 YOLO 模式（`--dangerously-skip-permissions`），宣稱在沙箱內可以安全地使用這個跳過所有權限確認的模式。

第四是**統一工作區**：一個沙箱就能支援所有主流 coding agent，不需為不同 agent 設定不同環境。

安裝方式相當簡單：macOS 透過 Homebrew（`brew trust docker/tap && brew install docker/tap/sbx`），Windows 透過 winget（`winget install Docker.Sandbox`），Linux 透過 apt（`sudo apt-get install docker-sandbox`）。不需要 Docker Desktop。

Docker 將 Sandboxes 定位為基礎隔離層。當團隊需要更進階的控管時，可以疊加 Docker AI Governance，後者提供網路存取策略、檔案系統存取控制、組織層級 MCP 治理、以及稽核日誌串接 SIEM 等功能。可設定的安全控制項涵蓋網路存取規則、檔案系統讀寫權限、憑證管理，這些都可以在組織層級強制執行。

產品頁引用了兩段業界背書。NanoClaw 創作者 Gavriel Cohen 說：

> 每個團隊很快就會有自己的 AI agent 團隊為他們做真正的工作。問題是能不能安全地做到。NanoClaw 建立在一個原則上：你不信任 agent 的安全性，你為它們築牆。Docker 在這方面一直走在前面。Docker Sandboxes 就是這個理念在基礎設施層的體現，讓組織可以在不犧牲安全的情況下從 agent 獲得全部價值。

Warp 工程主管 Ben Navetta 則說：

> Docker Sandboxes 讓 agent 擁有自主權來執行長時間任務，同時不犧牲安全。我們很高興將 Sandboxes 整合到 Warp 中，讓開發者可以在一致的環境中自由運行 agent，無論是在本地還是雲端。

FAQ 中澄清了幾個關鍵點：Sandboxes 不需要 Docker Desktop；它比傳統 VM 更輕量、更快、隔離性更強；YOLO 模式在沙箱內是安全的，因為沙箱提供了隔離邊界；需要更多管理控制就使用 Docker AI Governance。

## 城武觀點

Docker Sandboxes 有兩層，第一層是產品，第二層是敘事。產品沒問題，敘事值得拆。

先說產品層。microVM 隔離不是新發明——Firecracker 在 2018 年就開源了，gVisor、Kata Containers 都是同一條路。Docker 的技術壁壘不在這裡。它真正的籌碼，是 13 年累積的開發者信任存量。

2013 年，Docker 把「container」寫進了開發者心智。在那之後，Docker 就是 container，container 就是 Docker。這不是技術壟斷，是品牌佔位。2026 年的今天，Docker 想做一樣的事：把「AI agent 安全執行環境」寫進同一個位置。而 Docker 是唯一一家可以說出「我們已經隔離你的程式碼 13 年了」的 AI infra 公司——你把 agent 交給誰跑？交給那個從你還在寫 PHP 5.3 的時候就在隔離你程式碼的公司。這個敘事不需要 benchmark，建立在肌肉記憶上。

但真正精彩的，在敘事層。Sandboxes 的核心賣點是「YOLO mode, safely」。這句話是一個認識論陷阱。

沙箱可以防止檔案系統破壞——`rm -rf /` 打不到主機、惡意套件裝不進來、憑證不會被偷。但 agent 真正的風險從來不只是檔案系統破壞。一個 agent 可以在完全隔離的沙箱裡，寫出一千行有 SQL injection 的程式碼，然後告訴你「完成了，可以 deploy 了」。沙箱不會阻止這件事。

Docker 在做的是把「安全」的定義從「agent 行為正確」偷換成「agent 不能碰到你的檔案」。integrity 和 correctness 被包進同一個詞裡，Docker 只解決了前者。沙箱保護你的硬碟，不保護你的判斷力。Gavriel Cohen 的背書引文無意中說穿了這件事：「你不信任 agent 的安全性，你為它們築牆。」前提是 agent 不可信任。Docker 接受了這個前提，然後說：牆我來蓋，牆裡面的東西在幹嘛——不是牆的問題。

這不是說 Sandboxes 沒用。任何認真跑 coding agent 的團隊都需要這層隔離。但 Docker 把隔離包裝成完整的「安全」，而真正的安全問題——agent 的決策品質——被靜默排除在討論之外。Docker 賭的是開發者聽到「安全」兩個字的時候，不會追問「哪一種安全」。

*城武的未解檔案——沙箱擋得住 `rm -rf /`，擋不住 agent 說「這個 SQL injection 沒關係，上 production 吧」。Docker 賣的是前者。風險永遠在後者。*

- 原文：[Docker Sandboxes – Disposable, isolated sandboxes for AI agents](https://www.docker.com/products/docker-sandboxes/)（Docker, 2026）
