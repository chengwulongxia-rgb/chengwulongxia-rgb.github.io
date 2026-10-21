---
layout: post
title: "【深度分析】DHS 排除 DeepSeek：聯邦採購、第三方服務與風險證據的三條界線"
date: 2026-10-21 14:34:02 +0800
categories: [llm, ai, deep-analysis]
---
![hero]({{ site.baseurl }}/assets/images/2026-10-21/deepseek-federal-civilian-ban.jpg)

「美國禁用 DeepSeek」少了關鍵的受詞：哪些機關、哪些採購、哪些資訊系統？這次 DHS 命令涉及聯邦文職行政部門的供應鏈管理，不是對全美民眾發布使用禁令。以下以 Reuters 報導作有限摘要，再依官方通知拆解適用範圍；涉及第三方產品與資安風險時，另行標出尚不能下定論的部分。

## 原文摘要

[Reuters 於 2026 年 10 月 19 日的報導](https://cnbctv18.com/technology/us-banning-chinese-ai-deepseek-from-government-agency-it-systems-20015332.htm/amp)指出，DHS 要求文職機關移除 DeepSeek 相關產品，並限制採購。報導所述安全理由包括敏感資料可能流向中國，以及潛在的惡意程式或其他漏洞；這些是 DHS 提出的風險主張。報導也提到一份七月備忘錄，並稱中國駐美大使館未立即回應。本文不把這種未回應視為對指控的承認。

## 先分清楚三個時間點

新聞發布、正式刊登與先前備忘錄，不是同一件事。[Federal Register 通知](https://www.federalregister.gov/documents/2026/10/20/2026-21447/notice-of-order-regarding-exclusion-and-removal-of-deepseek-products-from-federal-civilian-executive)刊登於 2026 年 10 月 20 日，文件末尾另標示 10 月 19 日送交登錄；Reuters 則在 10 月 19 日報導。七月備忘錄是報導追述的較早文件，不能把它的月份直接當成這份通知的刊登日。

這個區分會影響實際閱讀：知道何時出現新聞，還不足以推出移除期限從哪天起算。通知說明簽署命令收在附錄，但本次取得的可檢索文字未包含附錄掃描頁內容。因此，本文不推定執行期限、例外或豁免條件；有具體履約問題時，必須回到簽署命令核對，不能拿新聞日期代替。

## 採購排除與既有系統移除，是兩種動作

官方通知援引的法律依據是《2018 年聯邦採購供應鏈安全法》（Federal Acquisition Supply Chain Security Act of 2018，FASCSA），並列出 41 U.S.C. 1321–1328 及 41 CFR 201-1。通知稱，國土安全部長審閱聯邦採購安全委員會的建議與相關證據後發布命令。這裡的制度脈絡是政府供應鏈，不是一般消費者市場的全面下架措施。

依[通知的補充說明](https://www.federalregister.gov/documents/2026/10/20/2026-21447/notice-of-order-regarding-exclusion-and-removal-of-deepseek-products-from-federal-civilian-executive)，第一項是把 DeepSeek 及依規定認定之關係企業開發的資訊科技產品與服務，排除於聯邦文職機關採購之外。第二項則是從文職機關資訊科技中，移除 DeepSeek、其關係企業產品，以及使用 DeepSeek 實作開發的第三方產品與服務。

前者處理政府接下來能買什麼，後者處理系統裡已經有什麼。這是本文對兩種動作的功能區分，不表示所有既有契約應採同一種處置。也不能只因某承包商與政府往來，就推定該公司所有私人業務一併被禁止；必須先辨認產品與受規範採購、系統之間的關係。更不能把這份文職行政部門通知，直接擴寫成國會、法院、各州與私人使用者都受同一道命令拘束。

## 第三方服務：換品牌，不等於換掉模型

最需要保留精確措辭的是第三方範圍。通知在移除項目使用的原文是「[third-party products and services developed using DeepSeek implementations](https://www.federalregister.gov/documents/2026/10/20/2026-21447/notice-of-order-regarding-exclusion-and-removal-of-deepseek-products-from-federal-civilian-executive)」。它不是只列 DeepSeek 自有品牌的應用程式；但這句話也不應被自行擴張為「任何曾請 DeepSeek 協助寫過程式的軟體，都已被判定違規」。

例如，一個第三方文件助理如果實際以 DeepSeek 作為推論後端，與開發者曾拿它詢問程式語法，是兩種不同的技術關係。這是用來說明辨識問題的假設情境，不是本文替命令建立的合法／違法分類表。可取得的通知文字，並未逐一回答這些邊界案例。

同樣要注意，通知對採購排除與移除的列舉並非完全相同。Reuters 的新聞概括不能取代正式命令對第三方服務的具體處理方式；本文因此不把移除條文的措辭，直接複製為每一種採購情境的結論。

從系統架構看，這會把盤點問題從「電腦有沒有安裝某個 App」延伸到「服務實際呼叫什麼模型」。以下是本站的一般工程說明，並非通知逐項規定：盤點時可以記錄應用名稱、模型與版本、實際推論端點、託管方，以及供應商能否在未通知下切換模型。對模型路由器或聚合 API，僅知道前端供應商名稱，未必足以說明後端組成。

## 本地部署回答資料路徑，未必回答命令範圍

本地部署常被用來回應「資料會不會送往外部服務」；但產品是否落入排除、移除範圍，是另一個問題。[通知列舉的產品來源與第三方關係](https://www.federalregister.gov/documents/2026/10/20/2026-21447/notice-of-order-regarding-exclusion-and-removal-of-deepseek-products-from-federal-civilian-executive)，沒有把範圍簡化成「只要沒有連回中國就不適用」。因此，不能僅憑自架伺服器就宣稱符合這份命令。

反過來說，也不能因命令涵蓋相關產品，就聲稱本地模型權重已被證實會外傳資料。工程上的查驗可以分開處理推論服務、執行程式、套件與更新來源，確認哪一層可能連網；但這類測試的結果仍不能自行取代採購適用性判定。技術驗證與規範辨識各有要回答的問題。

## DHS 的風險判斷，不等於公開鑑識已完成

[Reuters 所轉述的 DHS 說法](https://cnbctv18.com/technology/us-banning-chinese-ai-deepseek-from-government-agency-it-systems-20015332.htm/amp)使用的是可能性語氣：資料可能流向中國，模型可能含有惡意程式或其他安全漏洞。這可以是預防性處置的理由，但不能被改寫為「已公開證實所有 DeepSeek 模型含惡意碼」。

官方通知確實記載有審閱相關證據；然而，本次核對到的可檢索正文沒有提供可重現的惡意碼樣本、封包紀錄或漏洞分析。這個限制只說明本文無從檢驗完整證據鏈，不表示 DHS 沒有其他材料，也不表示風險已被排除。行政機關作成供應鏈風險決定，與外界取得足以重現特定攻擊的證據，是不同層次的資訊。

目前能明確交代的是命令所針對的機關、產品關係與兩種處置方向；仍待核對的則包括附錄中的執行細節，以及個別第三方產品如何被認定。本文是依公開通知進行的政策與技術分析，不提供法律意見，也不替特定部署作合規保證。

- 一手來源：[Notice of Order Regarding Exclusion and Removal of DeepSeek Products From Federal Civilian Executive Branch Information Technology Systems and Procurements](https://www.federalregister.gov/documents/2026/10/20/2026-21447/notice-of-order-regarding-exclusion-and-removal-of-deepseek-products-from-federal-civilian-executive)（DHS，Federal Register，2026-10-20；Docket DHS-2026-0628）
- 原文：[US banning Chinese AI DeepSeek from government agency IT systems](https://www.reuters.com/technology/us-banning-chinese-ai-deepseek-government-agency-it-systems-2026-10-19/)（Reuters，2026-10-19；本文核對 [CNBCTV18 署名 Reuters 的轉載](https://cnbctv18.com/technology/us-banning-chinese-ai-deepseek-from-government-agency-it-systems-20015332.htm/amp)）
