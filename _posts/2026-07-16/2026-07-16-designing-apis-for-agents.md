---
layout: post
title: "【深度分析】為 agent 設計 API：當你的主要用戶不再是工程師"
date: 2026-07-16 02:00:00 +0000
categories: [llm, ai, deep-analysis]
---

![hero]({{ site.baseurl }}/assets/images/2026-07-16/designing-apis-for-agents.jpg)

如果你最近有用 Claude Code 或 Codex CLI 寫過程式，你可能已經注意到一件事：你的 API 的主要消費者，正在從人類工程師變成 AI agent。這不是漸進的轉變——兩年前的今天，幾乎沒有 agent 在呼叫 API；現在，agent 產生的 API 呼叫量正在以指數級增長。Freestyle（一家 YC 的 sandbox VM 新創）最近寫了一篇觀點文，主張「為 agent 設計 API」與「為人類設計 API」是兩件完全相反的事，而且給出了一套看起來很有道理的設計原則。但這篇文章最有趣的地方，可能不是原則本身——而是提出這些原則的人，剛好就是靠「極簡 VM API」吃飯的。值得拆開來看。

## 原文摘要

Freestyle 的作者開宗明義：今天大多數 API 的消費者，都是透過 agent 撰寫的程式碼來呼叫的。這個轉變徹底改變了 API 設計的遊戲規則。作者坦白自己在過去 24 個月內做了好幾個 180 度大轉彎：不再相信大多數為人類打造的系統、對大多數 SDK 套件持懷疑態度、反對 utility 層、極端支持超長命名。

**好的「為人類設計的 API」長什麼樣？**

設計給人類的 API，第一步是勾勒最小使用模式、onboarding 流程、和前十個使用案例。目標只有一個：讓人在五十行程式碼內就能跑起來。API 必須足夠直覺，掃一眼文件就能用，不需要理解所有底層細節。

經典案例是 Twilio 和 Stripe 的 SDK。作者回憶自己 14 歲時，不懂 ACH 是什麼、不知道稅務選項背後的複雜概念，但照樣能在幾十行內完成實作。好的 SDK 讓新手快速取得進展，把複雜性藏起來——這是人類 API 設計的最高美德。

**但這與「為 agent 設計 API」完全相反。**

AI agent 可以一口氣讀完整份文件。Claude Code 的平均 prompt 使用 10K+ tokens；在第一個 prompt 中，agent 就能讀完整個 API 的所有相關文件，並在幾秒內產生數千行程式碼。這改變了一切。

人類需要 SDK 來隱藏複雜性，因為人類不會讀完 50 頁文件才開始寫第一行 code。但 agent 會。人類需要預設值來降低認知負擔，因為人類不想理解每一個參數。但 agent 不需要——填寫大量看似不重要的欄位的成本已經消失了。然而，理解程式碼在做什麼的成本急劇上升。

基於這個前提，作者提出了四個「為 agent 設計 API」的原則：

**原則一：預設值是壞的（Defaults are bad）**

Agent 可以預期讀完文件、記住好的起始值，然後全部顯式填入。顯式性現在是廉價的——而對預期行為加入具體性，可以減少 bug。人類喜歡預設值，是因為不想理解所有欄位；agent 不需要這個保護。

**原則二：錯誤不是壞的（Errors are not bad）**

許多人類友善的 API 會幫使用者「平滑處理」愚蠢的操作：接受大寫丟給小寫欄位自動轉換、接受多個 key 對應同一件事（比如 Postgres boolean 可以接受 true/yes/on/1）。這在人機互動中是貼心，但在 agent 產生的 codebase 中是一場災難——不同函數用不同值代表同一件事，讓後續審查頭痛。

現代的 coding harness 可以在除錯時閱讀文件。半正確的自動 coalescing 不該發生；讓 agent 在自己這邊顯式地處理轉換。對人類而言，onboarding 中的錯誤是壞事，應該最小化；對 agent 而言，錯誤是釐清「某件事到底代表什麼」的機會。

作者引用了 2027.dev 共同創辦人 Mika Sagindyk 的數據：27% 的 agent 摩擦來自錯誤。所以優秀的錯誤設計和優秀的文件同等重要。好的錯誤是一個驚人的工具：它代表 AI 對你的 API 有誤解，然後解決了它。

**原則三：在分布內，不在幻覺中（In distribution, not in hallucination）**

當 API 欄位名稱模糊時，agent 傾向根據它見過的類似 API 來幻覺用法。以 `name` 為例：有些 API 用它代表顯示名稱，有些是完整 ID，有些是範圍 ID。要求 agent 在十個不同情境中使用有 `name` 欄位的 API，它會用五種不同方式來解讀——只有一種是對的。

解法：偏好顯式性。用 `displayName`、`slug`、`externalId` 取代模糊的 `name`。文件的註解有助於鞏固正確的解讀方向。

**原則四：事實，不是感受（Facts, not feelings）**

API 在 agent 時代的價值，在於它提供一個 agent 或其人類團隊無法在內部複製的「事實」——支付完成的帳單、發送的訊息、配置的虛擬機器。除此之外的 utility 層，很大程度上是無關緊要的，可以被文件和指南取代。

作者因此對大多數 SDK 持懷疑態度——除非它們只是用語言特定模式暴露 API 規範（例如將 API 錯誤轉換為強型別的 TypeScript 錯誤），而不是在上面疊加抽象層。

**實作案例：Freestyle 自己的轉變**

Freestyle 的核心產品是 sandbox VM，主打虛擬化品質最高（支援 Docker-in-Docker、巢狀虛擬化、進階網路）、規模最大（公開層級 8 倍記憶體）、完全可配置（完整 OS、rootFS、私有 VPC 和 VPN）、以及 400ms 內配置完成。

他們曾經試圖隱藏盡可能多的複雜性，建立了一套宣告式函數建構系統加 SDK utilities。設計思微是：「如果使用者要 Bun，給他們 Bun 套件，讓他們不用擔心內部運作。」

但結果是：永遠不夠可配置、問題比答案多、agent 不懂而且以各種可能方式誤用。最終，嘗試使用這些抽象層的複雜性，反而成了 onboarding 最難的部分。

舊版（人類中心設計）——用 SDK 包裝 Bun 環境：

```ts
import { freestyle, VmSpec } from "freestyle";
import { VmBun } from "@freestyle-sh/with-bun";

const { vm } = await freestyle.vms.create({
  spec: new VmSpec({ with: { bun: new VmBun() } }),
});

await vm.bun.install({ deps: ["zod"], global: true });
await vm.bun.runCode(`import { z } from "zod"; console.log(z.string().parse("hi"))`);
```

新版（agent 中心設計）——刪除所有複雜的 SDK 套件和間接層，改用指南。讓 agent 自己讀指南、取相關程式碼、適應專案規範、自訂行為：

```ts
import { freestyle } from "freestyle";

const { vm } = await freestyle.vms.create();

await vm.exec("cd /tmp && /opt/bun/bin/bun add zod");
await vm.exec(`echo 'import { z } from "zod"; console.log(z.string().parse("hi"))' > /tmp/main.ts`);
const { stdout } = await vm.exec("cd /tmp && /opt/bun/bin/bun run main.ts");
```

**其他 API 和 SDK 的實務評分**

作者按照自己的四原則，對市場上的 agent 相關 API 逐一打分：

Agent 框架類：
- 🏆 **Flue Framework**：極簡語義，一切是可插拔函數，清楚說明自己做什麼（其實做得很少）——這在作者眼中是最高讚美。
- 👍 **Vercel AI SDK**：共享的 agent 連接語義，`generateText` 和 `streamText` 是清晰、優秀的函數。
- 😬 **Mastra**：重度、不清楚。Workspace/Filesystem/Sandbox 的語義對內部實作者極具資料破壞性。
- 💀 **Eve（Vercel）**：像把 Next.js 做成 agent 框架。Skills 系統完全單體且不可程式化——作者最重的一擊。

Sandbox API 類：
- 🏆 **Freestyle**（自家人）：API 不做太多，只做它們說的事。不膨脹 utilities。
- 👍 **E2B**：展現一定克制，但 `sbx.runCode` 函數是人類中心設計的教科書範例——第一個參數是程式碼字串，第二個是可選配置。
- 😬 **Daytona**：VNC、Git、Docker、Web Terminal、LSP 全部內建在 SDK 中。全部不可配置，部分功能在特定 sandbox 上默默不支援。

**結語**

作者認為，為 agent 開發終於開始與為人類工程師開發分道揚鑣。許多核心原則會延續：好的文件很重要、遵循使用模式和提供清晰錯誤仍然重要。但很多過去重要的，現在不重要了——程式碼行數、onboarding 中的錯誤、需要閱讀才能上手、甚至 onboarding 所需的 token 數，都與 API 對 agent 有多好幾乎無關。

文章最後補了一句耐人尋味的話：這一切在 GPT-4.5 時代不會是正確的，所以對 GPT-6 可能也不適用——但作者期待看到接下來的發展。

## 城武觀點

**一、「預設值是壞的」這個命題，建立在一個有問題的假設上**

作者的論證是：agent 會讀完整份文件 → 顯式性很廉價 → 預設值沒有存在的必要。但這個推論忽略了一個關鍵問題：**attention decay**。

在冗長的 agent session 中，模型對文件開頭的注意力遠高於結尾。當一份 API 文件長達數十頁，agent 在文件前半段學到的欄位會被準確填寫，但到了文件後半段的冷門參數——那些只有特定 edge case 才會用到的欄位——agent 的注意力已經衰減到幾乎隨機的水準。這時候，強制 agent 顯式填寫它其實沒讀懂的參數，等於強迫它擲骰子。

填錯一個 agent 不懂的冷門參數，比接受一個精心設計的預設值更危險。前者的錯誤是沉默的——它不會 crash，不會觸發 error message，程式照跑，只是行為跟預期不一樣，而你可能要等到 prod 出事才發現。後者至少是顯式的——「我沒填這個欄位，所以我接受這個預設行為」——這是可被除錯的。

我站在「顯式性是雙面刃」這邊。Agent 應該顯式填寫它真正理解的參數，但對它不懂的欄位，好的預設值反而是安全網，不是絆腳石。Freestyle 把「預設值」和「隱藏複雜性」畫上等號，但這兩件事根本不是同一個維度。預設值是 fallback 策略，不是抽象層。

**二、Freestyle 的哲學立場，恰好讓自己的產品看起來最合理——這不是巧合**

這篇文章最耐人尋味的，不是裡面的四個原則，而是提出這些原則的人是誰。Freestyle 的核心產品是什麼？一個極簡的 VM API——就是那種「不做太多，只做它們說的事」的 API。而這篇文章的核心論點是什麼？「API 應該極簡，SDK 和 utility 層是多餘的。」

當你的設計哲學剛好證明你的產品是市場上最好的選擇時，有兩種可能：一種是你的哲學是從產品實踐中淬煉出來的真知灼見；另一種是你先有了產品，然後逆向工程出一套讓產品看起來最合理的哲學。兩者不互斥——但兩者的說服力不一樣。

看看作者怎麼評價競爭對手：Daytona 有 Git、Docker、LSP 全內建 → 「全部不可配置，部分默默不支援」。E2B 的 `runCode` 函數 → 「人類中心設計的教科書範例」。這些評價可能都對，但它們共同的結論是：做得越少 = 越好，而 Freestyle 做得最少。

真正的問題是：如果 Freestyle 的競爭優勢是「虛擬化品質最高」（他們自己說的：支援 Docker-in-Docker、巢狀虛擬化、8 倍記憶體、400ms 配置），那為什麼文章的核心論點是「API 應該極簡」而不是「虛擬化品質最重要」？前者是一個可以在行銷上攻擊所有競爭對手的框架（做得多的都是錯的），後者只是一個需要技術證據支撐的產品宣稱。選前者來寫，不是因為前者更重要——是因為前者的攻擊範圍更大。

這不是說立場不真誠。但「我的產品設計哲學剛好證明我的產品是最好的」這種論證結構，值得任何讀者停下來想一想：如果 Daytona 的工程師來寫一篇「為 agent 設計 API」，他們會不會得出完全相反的四個原則？我賭會。而他們的原則，也一樣會剛好讓 Daytona 看起來最合理。

*城武的未解檔案——當你的 API 設計哲學剛好讓你的產品拿最高分，那不是哲學，那是白皮書。*

- 原文：[Designing APIs for Agents](https://www.freestyle.sh/blog/opinion/designing-apis-for-agents)（Freestyle, 2026-07）
