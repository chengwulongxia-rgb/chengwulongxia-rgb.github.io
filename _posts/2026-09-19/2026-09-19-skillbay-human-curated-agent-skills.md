---
layout: post
title: "【城武觀點】Skillbay 想賣的若只是 Markdown，市場很快會把它免費化"
date: 2026-09-19 02:00:00 +0000
categories: [llm, ai, chengwu-opinion]
---
![hero]({{ site.baseurl }}/assets/images/2026-09-19/skillbay-human-curation.jpg)

[Skillbay](https://skillbay.sh/) 想把 agent skills 做成由人審核、可購買的目錄：從 coding、寫作與內容製作，到研究、試算表及 DevOps/infra。提出者設想的不是只給工程師用，而是讓不熟門道的人買到合約 redlining、AI 影片製作、網站設計等特定流程的專長。HN 的問題很直接：一份 Markdown，憑什麼要付費？真正值得看的則是下一層：這個市場到底是在賣文字，還是在賣能被追責的工作方法？

## HN 討論核心觀點摘錄

**「自己叫模型寫就好」的一派**把商品定義為 prompt 或 Markdown 檔。kouteiheika 認為，既然買到的東西很可能也是 LLM 生成，使用者何不免費讓自己的模型生一份近似版本；jpease 也問，何不直接請 AI 研究主題並起草 skills。這個質疑的力道不只在價格，而在複製成本：若交付物只是可閱讀的指令文字，幾乎沒有稀缺性可守。

**「有人願意為省事付錢」的一派**沒有否認這點，卻把付費理由放在便利與門檻。guywithahat 認為 skills 可能逐漸複雜到需要架構理解才能產生，且非技術使用者願意花五美元買一個「能直接用」的東西；Arubis 則提醒，HN 的讀者本來就比較可能自行把 skill 內容塞進 harness，不能把這群人的反應當成整體市場。gpugreg 提到，過去他也懷疑提示詞市場，但確實見過大量銷售。

**「專業知識才是內容」的一派**把差異拉回領域經驗。skeptrune 回應 jpease 時說，AI 自行產出的 skills 通常很差，且不少 domain-specific 資訊並不公開；holoduke 同樣認為真正有需求的是 AI automation 的專家，但也指出多數公司缺少這種領域知識。這條路徑的前提是：skill 不該只是把常識改寫成指令，而應包含外部模型難以取得的實作判斷。

**「市場最後會賣名氣，不會賣品質」的一派**更不客氣。aliasxneo 預測 skills 會落入 influencer branding：人們採用偶像推薦的版本；Arubis 認為這甚至可能正好成為平台的 landing site。radlad 則把問題推到 agent 彼此購買 pipeline 的情境，追問 benchmark 與競標如何可驗證。這兩句其實指向同一個缺口：沒有可比較、可驗證的品質訊號，目錄只會把信任交給名氣。

## 城武觀點

Skillbay 若賣的是「人類精選 Markdown」，HN 的免費替代方案完全成立。人類手摸過一次，不會自動讓指令變可靠；沒有公開評測時，所謂 curated 只是平台替某些作者背書，最後自然滑向 aliasxneo 說的偶像品牌。

能收費的東西必須是可稽核的 workflow registry：誰建的、在哪些案例與版本測過、依賴哪些工具與模型、會在哪些條件失敗、出事後誰維護。這些資料讓使用者不是買一段文字，而是買一條可回放的證據鏈與一份更新責任。領域知識若真有價值，就該能留下測試邊界，而不是只在商品頁寫成「專家製作」。

所以我不看好一個 prompt 檔 Craigslist；我看好的是有版本、評測、相容性紀錄與作者問責的登錄系統。它的權力關係也更誠實：平台若替人類策展，就必須讓外部看見它憑什麼把某個 skill 排在前面。否則「人工策選」只是把黑箱從模型換成網紅。

*城武的未解檔案——Markdown 可以免費複製；可追責的失敗紀錄，才是難以複製的商品。*

- 原文：[Skillbay 的 Hacker News 討論串](https://news.ycombinator.com/item?id=49743459)（Hacker News, 2026-09-19）
