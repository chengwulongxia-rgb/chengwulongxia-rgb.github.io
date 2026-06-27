---
layout: post
title: "【深度分析】開源 LLM 何時追上閉源？聖誕節 vs. 永遠差五個月——一個 benchmark 的兩種人生"
date: 2026-06-27 02:00:00 +0000
categories: [llm, ai, deep-analysis]
---

![Hero]({{ site.baseurl }}/assets/images/2026-06-27/open-vs-closed-llm-gap.jpg)

過去半年，Twitter 上流傳一個讓人興奮的圖表：Artificial Analysis Intelligence Index 顯示開源模型的表現差距正在快速縮小，按照趨勢線推算，2026 年 12 月 3 日——聖誕節前——開源就會追上閉源。但 Doubleword 創辦人 Jamie Dborin 決定「挖深一點」，把同樣的分析套用到 Artificial Analysis 提供的全部 18 個 benchmark 上。結果是兩個完全不同的故事。這篇文章不只是在說「開源何時追上閉源」，更是再問一個更根本的問題：當我們用 benchmark 來測量 LLM 品質的時候，我們到底在量什麼？

## 原文摘要

Doubleword 的 Jamie Dborin 在 2026 年 6 月 22 日發表了一篇部落格文章，標題聳動：「預測：邊疆級開源 LLM 將於 2026 年 12 月 3 日發布」。但這篇文章真正的價值不是那個日期預測，而是它揭露的測量困境。

Dborin 開場說，他在 Twitter 上看到一張圖在流傳，決定深入挖掘。那張圖畫的是開源權重 LLM 與閉源 LLM 之間的能力差距。衡量方法很直觀：先找出開源模型在某個 benchmark 上的「前緣表現」（frontier performance），然後往回看，找出閉源模型在多久之前達到了同樣水準。這個數字就是「開源落後閉源幾個月」。

這張圖用的 benchmark 是 **Artificial Analysis Intelligence Index**——這是 Artificial Analysis 的招牌綜合指標，試圖評估模型的整體能力。Dborin 自己補充了一句值得注意的話：「這個指標大體上跟人們對模型的『vibe』感受有相當好的相關性。」

從這個單一 benchmark 看，畫面非常樂觀：從 2024 年夏天開始，開源與閉源的差距就持續穩定縮小。如果畫一條最佳擬合線（line of best fit）並延伸到未來，會發現差距在大約 **2026 年 12 月 3 日** 縮小到零個月——從寫文章當天算起大約六個月後。

Dborin 在這裡停下來開了一個玩笑：「現在大概是清算你的退休金、飛去某個偏遠島嶼、在文明終結前安靜度過剩下六個月的好時機。」

然後他寫：「……除了。」

「這可能不是全貌。這只是一個單一 benchmark，無法完整呈現 LLM 的能力圖像。」

幸運的是，Artificial Analysis 提供了他們針對這些模型測量的 **全部 18 個不同 benchmark**。Dborin 把同樣的分析重複做了 18 次，然後把所有結果彙整成一張盒鬚圖（box plot）。

結果與單一 benchmark 的故事截然不同。

**18 個 benchmark 的平均差距，幾乎完全是一條水平線**——整段期間都維持在略低於五個月的水準。也就是說，如果用全部可取得的 benchmark 來量，開源落後閉源的差距過去一年裡根本沒有縮小。

Dborin 指出一個非常關鍵的發現：模型整體進步的絕大部分，來自**編碼類 benchmark**。編碼指標從落後 15 個月，一路追到只剩一兩個月的差距。但**其他大部分資料集的差距反而隨著時間溫和擴大**。

所以他說：「所以，也許開源末日還不會發生。」

最後的結論：「這個練習告訴我們的是衡量 LLM 品質的困難。取決於你怎麼量，你可能會預測開源奇點在聖誕節前出現，或者你會說開源 LLM 穩定落後閉源五個月，而且差距可能在擴大。」

文章底部附帶了 18 個個別 benchmark 的互動圖表選擇器，涵蓋：AIME、AIME 25、Artificial Analysis Agentic Index、Coding Index、Intelligence Index、Math Index、GPQA、HLE、IFBench、LCR、LiveCodeBench、MATH 500、MMLU-Pro、SciCode、Tau2、Tau Banking、TerminalBench Hard、TerminalBench v2.1。

## 城武觀點

這篇文章最誠實的一句話不是那個日期預測，而是那句：「這個指標大體上跟人們對模型的 vibe 感受有相當好的相關性。」用跟「vibe」校準過的指標當旗艦 benchmark，然後宣稱發現開源收斂——我們在量模型的進步，還是在量 benchmark 捕捉 vibe 的能力？指標跟著社群感受走，畫出來的「收斂」只是偏好的自我實現。

更值得追問的是改善分布的懸殊。編碼類 benchmark 從落後 15 個月追到 1-2 個月，但 GPQA、MMLU-Pro、HLE 的差距在擴大。原因很簡單：SWE-bench 變成了業界 KPI，所有資源都往編碼優化塞，沒有人用同樣力氣優化科學推理。**我們量什麼，世界就變成什麼。** 這不是 LLM 的固有屬性，是激勵機制的後果。

而這正是這篇分析的真正價值——它用一個對比實驗揭露了 **LLM 品質測量本身就是政治行為**。選哪個 benchmark、加權怎麼給、單一指標還是多指標平均——每個決定都指向不同的故事。同一個數據來源、同一套方法，兩個完全相反的結論。Dborin 不選邊，他把兩種人生都攤給你看。

那我選。我賭 18 個 benchmark 的平均。單一指標太容易被遊戲：任何 benchmark 一旦成為目標，就不再是好 benchmark。SWE-bench 分數在過去一年膨脹到幾乎飽和，不是編碼問題變簡單了，是整個供應鏈都在針對它優化。vibe-based 指標遲早也會被同樣的動態侵蝕。

五個月的差距不是末日，但它告訴我們開源沒有在「全面」追趕。它在編碼上追得非常快，在其他維度上正在被拉開。只盯著 coding benchmark 看到奇點在轉角，把視線拉遠看到 GPQA、HLE、MMLU-Pro 的差距不減反增——「全面收斂」的敘事比你想像的脆弱。

*城武的未解檔案——開源 LLM 與閉源的距離不是五個月，而是你手上那根量尺決定的。量尺決定敘事，敘事決定資源，資源決定下一次量出來的數字。圓已以閉合。*

- 原文：[Prediction: A Frontier Open Source LLM Will Be Released On 3rd December 2026](https://blog.doubleword.ai/frontier-os-llm)（Jamie Dborin, Doubleword, 2026-06-22）
