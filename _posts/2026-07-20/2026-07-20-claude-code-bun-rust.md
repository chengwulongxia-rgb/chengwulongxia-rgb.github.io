---
layout: post
title: "【深度分析】Claude Code 內建 Rust 重寫的 Bun——Simon Willison 用 strings 五分鐘逆向確認"
date: 2026-07-20 02:00:00 +0000
categories: [llm, ai, deep-analysis]
---

![hero]({{ site.baseurl }}/assets/images/2026-07-20/claude-code-bun-rust.jpg)

當 Jarred Sumner 在推文上輕描淡寫地說「Claude Code 以經在用 Rust 重寫的 Bun，幾乎沒人注意到，Boring is good」的時候，Simon Willison 做了一件任何有好奇心的工程師都會做的事——打開 terminal，跑 `strings`，五分鐘內就挖出了確鑿的證據。這件事本身是一個很好的技術偵探故事，但它背後暴露的問題，遠比「Rust Bun 跑得快不快」更重要。

## 原文摘要

Jarred Sumner（Bun 的作者）在《Rewriting Bun in Rust》一文中做了一個看似不起眼的宣告：

> Claude Code v2.1.181（6 月 17 日發布）及之後的版本，已經在使用 Rust 移植版的 Bun。Linux 上的啟動速度快了 10%，除此之外，幾乎沒人注意到。Boring is good。

Simon 決定親自驗證這個說法。他在自己安裝的 Claude Code 上跑了兩個指令，結果相當有說服力。

第一個指令：

```
strings ~/.local/bin/claude | grep -m1 'Bun v1'
```

輸出結果是 `Bun v1.4.0 (macOS arm64)`。這個版本號本身就說明了很多事——GitHub 上 Bun 的最新正式發行版是 v1.3.14（5 月 12 日發布），v1.4.0 這個版本號意味著 Claude Code 內建的是一個尚未正式發布的 preview 版本。Simon 後來也補充說明，Rust 版 Bun 已經以 canary 通道發布，跑 `bun upgrade --canary` 就能安裝到。

第二個指令：

```
strings ~/.local/bin/claude | grep -Eo 'src/[[:alnum:]_./-]+\.rs'
```

這條指令從 Claude 的 binary 中挖出了 563 個 `.rs` 檔名，開頭幾個是：

```
src/runtime/bake/dev_server/mod.rs
src/runtime/bake/production.rs
src/bundler/bundle_v2.rs
```

這基本上是鐵證——一個 JavaScript runtime 不會有 563 個 Rust 原始碼檔案路徑編譯進 binary 裡。

Simon 的結論很直接：Rust 版的 Bun 確實在數百萬台裝置的生產環境中運作著。就像 Jarred 說的，「Boring is good」。

文章還附上了 Ajan Raj 提供的另一個驗證技巧：用 `BUN_OPTIONS` 環境變數注入一段 TypeScript 腳本，讓 Claude 啟動時印出內建 Bun 的版本號：

```bash
cat > /tmp/bun-version.ts <<'EOF'
console.log("embedded bun:", Bun.version);
process.exit(0);
EOF
BUN_OPTIONS="--preload=/tmp/bun-version.ts" claude --version
```

輸出結果是 `1.4.0`，再次印證了版本號。Simon 還挖出了 Bun repo 中 5 月 17 日的 commit——那一天 `package.json` 的版本號被更新為 1.4.0，此後沒有再更動過，但也從未出現在 canary 之外的任何 tagged release 中。

## 城武觀點

我的立場很直接：在生產環境中偷渡未正式發佈的依賴版本，即使結果是好的，過程本身就是一個紅旗。

Anthropic 在數百萬台開發者機器上跑一個尚未正式發布的 runtime canary build，而且沒有在 release notes 中告知使用者。不是「沒有大肆宣傳」，是根本沒有說。Simon 用 `strings` 五分鐘就挖出來的事，為什麼需要等到有人逆向才曝光？

Jarred 說「Boring is good」——從工程角度我同意，搬家順利、使用者無感，確實漂亮。但 boring 是結果，不是過程。當你決定把 canary 依賴放進數百萬台機器的 binary 中的那一刻，你還不知道它會 boring。19 個 regression 是在 merge 之後才發現的——這些 bug 在數百萬台機器上跑的時候，Anthropic 自己也還不知道它們存在。

把「結果沒出事」當成「過程沒問題」的證據，邏輯是倒過來的。

更深層的問題是：誰來決定什麼資訊值得告訴使用者？Anthropic 內部當然可以得出「這只是一個 runtime swap，不需要公告」的結論。但這件事本身——有能力告知卻選擇不告知——傳遞出的訊號是：「我們判斷什麼對你重要，你不需要知道細節。」這個預設值今天是 Bun canary，下次可能是一個更敏感的依賴，下下次是某個影響行為的 patch。每次都適用同一套邏輯：「沒人注意到就沒關係。」

但「沒人注意到」跟「沒關係」之間，隔著知情權。Simon 注意到了，五分鐘。這五分鐘的落差，就是問題的全部。

*城武的未解檔案——在數百萬台機器上跑一個還沒正式發布的 runtime，然後說「沒人注意到所以沒關係」——這不是 boring，這是在把用戶的機器當成你的 CI pipeline。*

- 原文：[Claude Code uses Bun written in Rust now](https://simonwillison.net/2026/Jul/19/claude-code-in-bun-in-rust/)（Simon Willison, 2026-07-19）
