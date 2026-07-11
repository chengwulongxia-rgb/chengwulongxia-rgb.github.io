---
layout: post
title: "【城武觀點】你的瀏覽器正在逆向工程 API——Frigade 踩在授權與偷竊的界線上"
date: 2026-07-11 02:00:00 +0000
categories: [llm, ai, chengwu-opinion]
---

![hero]({{ site.baseurl }}/assets/images/2026-07-11/2026-07-11-web-agent-tools.jpg)

當一個瀏覽器 agent 可以在你登入 Jira 之後，自動觀察所有 API 呼叫、逆向工程出完整的工具定義、然後讓 LLM 直接操作你的帳號——這聽起來像是生產力革命，還是資安災難？Frigade 這個 Show HN 專案，把兩個答案壓進了同一個產品裡。

## 原文摘要

Frigade 是一個瀏覽器 agent，核心概念簡單但激進：你在已登入的 web app 中打開它，它觀察 app 如何呼叫自己的後端 API，然後自動把這些 API 轉換成 LLM 可用的「recipes」（工具定義）。每份 recipe 包含 API endpoint 與 HTTP method、認證方式（含 refresh token/cookie 的取得邏輯）、response schema、input schema（for POST/PUT），以及人類可讀的工具描述。當 app 的 API 改變時，agent 會自動偵測並更新對應的 recipe——完全不需要維護任何程式碼。

作者 pancomplex 展示了四個 demo：Jira、Spotify、Hacker News，以及一個完整展示。他的論點是：理想世界裡每個 web app 都有 MCP server 或乾淨的 API，但現實中即使是最現代的軟體，API 也像蜘蛛網一樣混亂（JWTs、cookies、自訂認證標準），AI agent 根本無法直接用。現有的 computer-use 方案（讓 agent 實際去點 UI）太脆弱、太慢、太燒 token。所以他們選擇讓 agent 直接進去學——不需要 app 原始碼、不需要 API spec、不需要長期維護。團隊還發現一個有趣的邊緣案例：GraphQL 是他們遇過最難標準化成 recipe 的 API。

HN 討論區反應兩極。hoppp 直接點出法律風險：如果網站 ToS 明確禁止注入第三方 JavaScript，這不只是合約問題——過去以經有人因為抓 frontend 的 auth token 而被以駭客罪名起訴。arjunchint 問了更根本的問題：為什麼不直接跟網站要 API spec？如果 WebMCP 成為標準，讓每個網站自願暴露結構化 API，Frigade 的價值是否直接歸零？teravor 則描繪了一個更激進的使用場景：用 Firefox MCP 搭配 GLM 5.2，自動生成 userscript 來增強或破壞任何網站，完全不需要任何人同意。nixus76 從使用者角度提出安全疑慮：如果 agent 可以在背後做任何事，我要怎麼確定它不會刪掉我的帳號或幫我訂閱一個天價方案？hajimuz 則從務實角度肯定——他平常就在手動做這件事，用 Chrome DevTools 觀察 API、處理 header 和 cookie，繁瑣又容易出錯。

## 城武觀點

### 一、技術上的「可以」不等於合規——Frigade 活在一條很窄的灰色地帶

Frigade 做的事本質上是擷取前端 JS 的 API endpoint 和 auth token，包裝成自動化工具。這不是整合，是逆向工程。多數網站 ToS 明文禁止 reverse engineering，hoppp 提到的案例不是杞人憂天——真有人因抓 API key 被判刑。Frigade 的辯護是「使用者授權了」，但登入授權的是使用網站，不是逆向工程網站。它的商業模式建立在時間差上：法務還沒認真看之前叫聰明，第一個訴訟之後叫駭客。

### 二、逆向工程是 WebMCP 普及前的過渡方案，問題是過渡期有多長

arjunchint 問到關鍵：WebMCP 成標準後，Frigade 價值歸零。逆向工程 web API 是 screen scraping 的現代版——正規 API 不存在時是必要之惡，一旦出現就沒人再用。Frigade 的價值完全建立在「正規 API 不存在」的前提上。我賭這前提兩年內會被打破——不是標準化多快，而是大公司不會容忍第三方逆向工程自己的 API。它們會自己出 MCP server，或者發 cease and desist。

### 三、cookie-based auth 沒有 scope——你給 agent 一個 cookie，等於給了它 root

nixus76 的擔憂是整件事最被低估的問題。使用者說「幫我整理 Jira tickets」，以為在授權唯讀助手，實際上把 cookie 交給了能刪除 project、改權限的 agent。OAuth 有 scope，cookie 沒有——一個 cookie 就是 root。Frigade 說「app owner 可審核」，但控制權在 app owner 端，不在使用者端。這不是 Frigade 獨有的問題，但它把 cookie 的安全缺陷產品化了。我預測第一個出事案例不是漏洞，是「我不知道它可以這樣做」。

*城武的未解檔案——cookie 是 90 年代的遺產，你把它交給 2026 年的 AI agent，然後祈禱 dashboard 上的那個 toggle 會保護你。*

- 原文：[Show HN: Reverse-engineering web apps into agent tools](https://news.ycombinator.com/item?id=48847834)（pancomplex, Hacker News, 2026-07-11）
