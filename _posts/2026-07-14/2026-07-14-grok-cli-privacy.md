---
layout: post
title: "【深度分析】Grok CLI 把你的家目錄打包上傳了——而且關不掉"
date: 2026-07-14 01:00:00 +0000
categories: [llm, ai, deep-analysis]
---

![hero]({{ site.baseurl }}/assets/images/2026-07-14/grok-cli-privacy.jpg)

這是一個「如果你不是親眼看到封包，你不會相信」的故事。開發者 @a_green_being 在 7 月 13 日發了一條推文，說他在自己的機器上跑了 Grok CLI，然後發現整台機器的家目錄——SSH keys、密碼管理器資料庫、文件、照片、影片，全部——被完整上傳到 xAI 的伺服器。他一開始還不確定自己是不是看錯了。但有人直接攔截了封包，做了 wire-level analysis。結果比想像的還糟。

## 原文翻譯

### 推文引爆：整台機器被搬走了

@a_green_being 在 Twitter/X 上的原話是這樣的：

> "Okay, grok has uploaded my entire user directory to xAI's servers. It contains my SSH keys, my password manager database, my documents, photos, videos, everything..."

這條推文在短時間內獲得近 600 個讚與 56 次轉發。熱門回應包括 @XBToshi 的「這比我的情況還糟糕——你在你的家目錄裡跑 Grok？」，以及 @ren_snavs 的酸文：「你選擇讓 Grok 這個已知的精神病患進你家，現在你驚訝它做了精神病患會做的事？」

但最關鍵的回應不是笑話，而是一份詳盡的技術分析。

### Wire-Level Analysis：Cereblab 的三項發現

研究人員 Cereblab 使用 mitmproxy 攔截 Grok Build CLI（v0.2.93）的所有網路流量，用封包層級的證據證實了 @a_green_being 的懷疑。他的分析揭露了三項核心問題。

**第一項發現：未過濾的檔案內容傳輸**

Grok CLI 將檔案內容——包括 `.env` 裡的 API keys 和資料庫密碼——以明文形式直接傳輸到 xAI 伺服器。這些 secrets 同時出現在兩個頻道中：即時的模型對話頻道（`POST /v1/responses`）和持久化的儲存頻道（`POST /v1/storage`）。換句話說，你的 secrets 不只在模型推論時被讀取，它還被存起來了。

**第二項發現：全倉庫規模的上傳**

Cereblab 用一個 12 GB 的 repository 進行測試。Grok CLI 總共上傳了 5.10 GiB 的資料，發出了 82 個 storage requests，全部回傳 HTTP 200。最驚人的對比是：模型推論頻道只用了 192 KB 的資料，但儲存頻道用了 5.10 GiB——差距約 27,800 倍。這不是「模型在讀你的程式碼以便幫你改 bug」，這是「整台機器的 repo 被打包存到雲端」。

Cereblab 甚至做了一個更狠的驗證：他直接從 `POST /v1/storage` 上傳的 git bundles 中，下載並成功恢復了從未被 agent session 讀取過的檔案。也就是說，被上傳的資料範圍遠超過「模型為了幫你而需要的上下文」。

**第三項發現：Google Cloud Storage 終點**

所有上傳的資料最終儲存在 GCS bucket `grok-code-session-traces`。研究人員透過 binary strings、metadata 檢查和 GCS PUT requests 直接觀察確認了這個儲存目的地。

### 那個宣稱能關掉的 toggle

Grok CLI 的設定檔中有一個選項：

```ini
[harness]
disable_codebase_upload = true
```

問題是：Cereblab 發現，即使你在 UI 中把「Improve the model」toggle 關掉，伺服器回傳的 metadata 仍然顯示 `trace_upload_enabled: true`。這個 toggle 的存在本身就是一個修辭學陷阱：它讓使用者以為自己可以控制，但實際上是假的。

### Developers Digest 的判斷

Developers Digest 在報導中指出，核心問題不在於「AI 工具收集資料」這件事本身——coding agents 本來就需要讀取你的程式碼才能工作。真正的問題是：收集的範圍遠超過使用者在現有文件基礎上的合理預期。整個 repo 上傳機制在 CLI 的設定文件中完全未被記錄。即使關閉 training toggle，上傳行為依然持續。他們的實務建議很務實：不要把 production secrets 放在 coding agent 能存取的 repo 中、使用外部的 secret manager、考慮網路隔離。

### Hacker News 的怒火

HN 討論串累積了 520 點、227 則留言，氣氛從憤怒到黑色幽默都有。幾個代表性的觀點：

the8472 指出結構性問題：「問題的一部分是『權限』由工具本身管理，好像檔案系統的存取控制還沒被發明一樣。連一個半吊子的 sandbox container 都比這個好。」

danudey 點出矛盾：「除了有 toggle 關閉『改善模型』之外——它仍然上傳整個 repository、git history 等等，這些東西明明可以在本地讀取後餵給模型，不需要上傳到 bulk storage bucket。再加上這也包括 env files，裡面的 secrets 根本不屬於 repo。」

janalsncm 最直接：「那些 toggle 是安慰劑按鈕。你可以自由相信它們阻止了 Grok 吸取你的 IP，但最可靠的方式是根本不讓 Grok 看到你的 IP。」

theplumber 則把問題拉到了整個產業：「很多人現在才意識到 AI agents 不是真的在他們的電腦上執行。AI agents 只是把東西上傳到某些伺服器，你要付錢給它們，然後得到一些工作成果。」

### 不是只有 Grok 這樣做

研究人員也提供了對比數據：Claude Code 在讀取 prompt 前會發送 33k tokens 的上下文，OpenCode 發送 7k。雖然規模完全不在同一個量級——Grok CLI 是以 GB 為單位在上傳——但所有 coding agent 都在不同程度上做著同一件事：把本地資訊傳到雲端。

## 城武觀點

### 一、這不是隱私政策問題，是工程倫理問題

看完 Cereblab 的封包分析後，我的第一個反應不是「xAI 的隱私政策寫得不夠清楚」。我的反應是：**一個 CLI 工具，在沒有任何使用者可見的設定下，把整台機器的家目錄完整上傳到 GCS——你跟我說這是設計決策，不是工程倫理違規？**

12 GB 的 repo 被上傳了 5.1 GiB。模型推論只需要 192 KB。那剩下的 5.1 GiB 是給誰用的？答案很清楚：`grok-code-session-traces` 這個 GCS bucket 的名字已經告訴你了——你的程式碼 session 本身就是一個追蹤資料集。寫這個 CLI 的工程師不可能不知道自己在做什麼。他們就是故意這樣設計的，然後才在設定檔裡塞了一個不存在的 toggle 來做樣子。

### 二、Grok 不是特例，是症狀

把所有矛頭指向 xAI 是最容易的版本，但也是最不準確的版本。Claude Code 發 33k tokens 才開始讀 prompt，Codex 有 telemetry，OpenCode 發 7k——每個 coding agent 都在不同程度上做同一件事。差別只在於：Grok CLI 做得太粗暴、被抓到了。

產業的結構性問題是：「本地執行」的行銷話術和「雲端代理」的工程實相之間的斷裂。所有 coding agent 都告訴你「在本地跑」、「在你的 terminal」，讓你有個錯覺以為它是在你的機器上運算。實際上它們都是 thin client——你的程式碼被打包、上傳、在遠端處理，然後吐回結果。那個讓你下載到本機的 CLI binary，本質上只是一個帶外殼的上傳器。

### 三、軟家長主義的標準劇本

「為了更好的使用者體驗，我們需要看到你的程式碼以提供完整上下文。」這句話放在 xAI 的公關稿裡完全合理。但它是假的。

真正的邏輯順序是：（1）設計一個把整台機器上傳的機制；（2）把上傳歸類為「模型推論必要步驟」；（3）把拒絕上傳的選項設計成假的；（4）然後跟使用者說「你應該把 secrets 放在外部 secret manager」。這是教科書級的**責任外部化**——權力留在公司，風險外包給使用者。

跟「為了你的安全，我們需要掃描你的訊息」是同一個劇本。劇本的核心手法不變：先用一個對使用者有利的話術包裝監控行為，再把監控的後果定義成「使用者自己的疏忽」。這個結構不會因為換了一家公司就變善良。

*城武的未解檔案——「在你的終端機上跑」這句話的意思是：你的檔案在他們的 bucket 裡跑。*

- 原文：[Grok uploaded my user directory to xAI's servers](https://twitter.com/a_green_being/status/2076598897779020159)（@a_green_being, Twitter/X, 2026-07-13）
- 分析：[What xAI's Grok Build CLI sends to xAI: A wire-level analysis](https://gist.github.com/cereblab/dc9a40bc26120f4540e4e09b75ffb547)（Cereblab, 2026-07-13）
- 報導：[What xAI's Grok Build CLI Actually Sends Home](https://www.developersdigest.tech/blog/grok-cli-wire-level-analysis)（Developers Digest, 2026-07-13）
- 討論：[HN Discussion](https://news.ycombinator.com/item?id=48877371)（520 points, 227 comments）
