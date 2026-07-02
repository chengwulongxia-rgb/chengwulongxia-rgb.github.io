---
layout: post
title: "【深度分析】Claude Code 的隱寫追蹤：程式碼裡的 Panopticon"
date: 2026-07-02 02:00:00 +0000
categories: [llm, ai, deep-analysis]
---

![hero]({{ site.baseurl }}/assets/images/2026-07-02/2026-07-02-claude-code-steganography.jpg)

如果你用 Claude Code 的時候曾經把 API 指到非官方端點——比如公司內部的代理、第三方轉售、或者任何不是 `api.anthropic.com` 的地方——那 Claude Code 不會跳出警告、不會記錄 log、不會在你帳號裡標一個紅旗。它會做一件更安靜的事：在不被你發現的情況下，悄悄修改系統提示詞裡的一個字元。一個字元。肉眼分不出來，但伺服器端讀得到。這不是 telemetry，這是隱寫術。而寫出這段程式碼的人，顯然不打算讓你知道它在運作。

開發者 Thereallo 在檢查 Claude Code 的隱私行為時發現了這個機制。他在本機安裝的 Claude Code v2.1.196 中，透過靜態分析挖出了整套標記系統的邏輯。以下是他的發現。

## 原文摘要

Thereallo 在逆向 Claude Code 的過程中，注意到一段處理系統提示詞日期字串的程式碼，行為不太對勁。正常的日期字串就是一段純文字——「Today's date is 2026-06-30」——但在某些條件下，這段字串裡的兩個細節會被偷偷置換。

第一個修改點是撇號。`Today's` 當中的 `'`，正常情況下是 ASCII 的 U+0027。但 Claude Code 會根據兩個布林變數——`known`（是否連接到 known domain）和 `labKw`（請求內容是否包含 lab keyword）——把撇號換成四種不同的 Unicode 變體：

- `'` (U+0027)：沒有 known domain，也沒有 lab keyword——無標記
- `'` (U+2019)：有 known domain，沒有 lab keyword
- `ʻ` (U+02BC)：沒有 known domain，但有 lab keyword
- `ʹ` (U+02B9)：既有 known domain，也有 lab keyword

第二個修改點是日期格式。如果使用者的系統時區是 Asia/Shanghai 或 Asia/Urumqi，日期裡的分隔符會從 `-` 變成 `/`。換句話說，`2026-06-30` 會變成 `2026/06/30`。

這兩個修改組合在一起，形成了一個 4×2 的分類矩陣：四種撇號變體 × 兩種日期格式 = 八種可能的標記組合。每一種組合都對應著不同的請求分類結果。關鍵是：這些字元的視覺差異極小。U+2019 的右單引號跟 ASCII 單引號在大多數字體裡幾乎一模一樣；U+02BC 和 U+02B9 在等寬字體下更是難以分辨。如果你不是在 hex editor 裡看，你根本不會發現。

這些清單不是明文儲存的。known domain 清單經過 XOR 混淆——原始資料是 base64 編碼的字串，解碼後每個 byte 與金鑰 91 做 XOR 運算才還原成可讀網域。lab keyword 清單也是同樣的混淆方式。Thereallo 從 binary 中解出了名為 `Gla()` 的解碼函式：`Buffer.from(encoded, "base64")` 後逐 byte XOR 91，再以逗號分割成清單。換句話說，Anthropic 不只藏了標記行為，連標記的目標清單都刻意混淆過——兩層隱藏。

觸發條件也很精確：這個標記機制只在使用者設定了 `ANTHROPIC_BASE_URL` 環境變數，而且該 URL 不是指向官方 `api.anthropic.com` 的時候才會啟動。直接使用官方 API 的開發者完全不受影響。換句話說，Anthropic 知道自己在做什麼——它只標記那些「繞過官方路徑」的請求。

那 Claude Code 到底在檢查什麼？Thereallo 解出了兩份清單。

第一份是 lab keyword 清單（編碼後存放在程式碼中，解碼後得到）：deepseek、moonshot、minimax、xaminim、zhipu、bigmodel、baichuan、stepfun、01ai、dashscope、volces。全部都是中國 AI 公司的名稱或產品代號。

第二份是 known domain 清單，使用 XOR 混淆儲存。解碼後包含大量中國企業網域：baidu.com、alibaba-inc.com、bytedance.net、kuaishou.com、xiaohongshu.com、jd.com、bilibili.co、iflytek.com 等；也包含中國 AI 公司的網域如 stepfun-inc.com、moonshot.ai；還有一批代理和轉售服務的網域：anyrouter.top、claude-code-hub.app、claude-opus.top、openclaude.me、proxyai.com、yunwu.ai、zenmux.ai。

技術實作上，整個邏輯濃縮在一個簡潔的函式 `edp(known, labKw)` 中：根據兩個布林參數的四種組合，回傳對應的 Unicode 撇號。另一個函式 `Vla()` 則負責組合標記結果和時區檢查，產出最終的 `currentDate` 字串。這一步由 `Zup()` 函式觸發——它先檢查 `ANTHROPIC_BASE_URL` 是否指向非官方端點（函式 `Crt()` 判斷：若未設定或指向 `api.anthropic.com` 則跳過），再提取 hostname（`Qup()`）與兩份清單比對。

標記完成後，`currentDate` 作為系統提示詞的一部分，和 `userEmail`、`attachedProject` 等欄位一起被組裝成 agent context 發送給 Claude 模型。模型本身不會感知到這些差異——它看到的就是一段日期文字——但 API 伺服器端可以在接收請求時解析出這些標記，據此對請求進行分類、路由、或記錄。

Thereallo 本人的環境並未觸發這個標記機制。他的 Claude Code binary 由 Anthropic 正式簽名，且未設定 `ANTHROPIC_BASE_URL`。換句話說，他不是被追蹤的對象——他只是讀了程式碼，發現了這個為別人設計的陷阱。

截至文章發布（2026 年 6 月 30 日），Anthropic 尚未對此機制發表任何評論。

## 城武觀點

### 一、隱寫不是忘了公告，是故意不讓你知道

正常的 API 監控：在 header 加一個 `X-Anthropic-Client-Info`，文件寫清楚 telemetry 範圍——業界標準。

Anthropic 沒走這條路。它用 Unicode 隱寫。XOR 混淆網域清單、肉眼難辨的 Unicode 撇號、日期分隔符 `-` 變 `/`——你在 log 看到只會以為格式沒統一。

每一步都指向同一個目標：被追蹤的人不會發現。這不是 oversight，是深思熟慮的設計。Anthropic 的立場：**我們要知道你在哪、你連到誰、但你不可以知道我們知道。**

問題來了：如果合理的「安全措施」為什麼要藏？合理措施經得起公開檢視。把追蹤邏輯用 XOR 混淆、隱寫藏起來——這叫 surveillance，不叫 security。ToS 大概有免責條款，法務以經想好了。但「合法」跟「誠實」是兩回事。

### 二、這不是安全檢查，這是地緣政治的客戶端執行

keyword 清單：deepseek、zhipu、baichuan、moonshot、minimax、stepfun、01ai、dashscope、volces——全是中國 AI 公司。時區檢查：Asia/Shanghai、Asia/Urumqi。就是中國，沒有別的地區。

這不是一般安全掃描，是針對特定國家的過濾系統，執行在你本機 CLI 裡。Anthropic 把地緣政治邊界寫進了客戶端 binary。

有人會說「遵守美國出口法規」。伺服器端 IP geolocation 加帳號審查一樣能做，而且透明。把邏輯塞進本機 binary、隱寫標記、XOR 混淆——這以經超出合規範圍。

跟微信審查過濾器有什麼本質區別？微信掃訊息匹配敏感詞，Claude Code 掃 API 端點匹配中國關鍵字。都是客戶端檢查＋伺服器標記，都讓使用者無法察覺。討厭微信審查的人，對 Claude Code 也該用同樣標準。

### 三、同一天的兩張臉

Thereallo 文章發表於 2026 年 6 月 30 日。同一天，Anthropic 發布 Fable 5、Sonnet 5、Claude Science——包裝成開放創新。

一邊是「讓 AI 造福全人類」的發表會燈光；另一邊是藏在 binary 深處的中國追蹤器。同一個 Anthropic，同一天。

我不認為矛盾。同一套邏輯的兩個輸出。「負責任 AI」的主軸：我們知道什麼對你好，替你決定，你不需要知道細節。對外是 safety guardrails；對內是隱寫追蹤、XOR 混淆、時區圍欄。**本質都是「我們替你決定誰能用什麼、我們要知道你在哪」。** 差別：對外有新聞稿，對內沒有。

最讓人不舒服的不是技術——Unicode 隱寫和 XOR 混淆資安領域早就玩爛了。是那個假設：Anthropic 假設部分使用者是敵人。不是濫用者，就是「從非官方端點連進來的人」——恰好是中國開發者。Anthropic 沒選擇在 API 層拒絕，它選擇標記、追蹤、分類。拒絕沒有情報價值，追蹤有——資料就是資產。

最後：不是抵制文。我自己也用 Claude Code。但「繼續用」跟「假裝沒看到」是兩回事。這工具在你電腦做的事，比文件寫的多——那個落差，就是 Anthropic 希望你永遠不會注意到的部分。

*城武的未解檔案——透明是講給外面的人聽的，隱寫才是寫給裡面的人看的。同一天的兩張臉，不是精神分裂，是同一套邏輯在日光和陰影下的兩種顯影。*

- 原文：[Claude Code Is Steganographically Marking Requests](https://thereallo.dev/blog/claude-code-prompt-steganography)（Thereallo, 2026-06-30）
