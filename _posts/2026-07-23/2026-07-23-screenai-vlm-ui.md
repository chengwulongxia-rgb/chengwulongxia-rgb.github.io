---
layout: post
title: "【論文拆解】ScreenAI：Google 的通用 UI 視覺語言模型"
date: 2026-07-23 03:00:00 +0000
categories: [llm, ai, paper-breakdown]
---

![hero]({{ site.baseurl }}/assets/images/2026-07-23/screenai-vlm-ui.jpg)

如果你曾經想過「能不能讓 LLM 直接看懂我的 app 截圖，然後告訴我這個按鈕在哪、這個選單怎麼開」，ScreenAI 就是 Google 對這個問題的答案。但它真正有趣的地方不在模型本身——而在他們是怎麼「教」模型看懂螢幕的。

## 原文摘要

### 問題：UI 和資訊圖表的共通語言

螢幕使用者介面（UI）和資訊圖表——圖表、地圖、表格、文件佈局——在日常生活中無所不在，但它們共享一套相似的視覺語言和設計原則。這暗示了一個可能性：能不能用一個統一的模型同時處理這兩種內容？困難在於，UI 和圖表的複雜度遠高於自然影像：它們同時包含文字、圖示、空間關係、互動元素，而且長寬比變化劇烈（手機是直的、桌面是橫的）。

ScreenAI 是一顆專門為 UI 和資訊圖表理解設計的視覺語言模型（VLM）。它的目標不只是「看圖說故事」，而是能回答問題、標註畫面元素、導航操作、甚至為整個螢幕寫摘要。論文發表於 IJCAI 2024，同步開源了模型權重，並釋出三個新的評估資料集：Screen Annotation、ScreenQA Short、和 Complex ScreenQA。

### 架構：PaLI 的身體，pix2struct 的眼睛

ScreenAI 的架構建立在 PaLI 之上：一個多模態編碼器（ViT 視覺骨幹 + mT5 語言編碼器）配上自迴歸解碼器。核心改動來自 pix2struct 的「彈性切塊」（flexible patching）策略：傳統 ViT 把圖片切成固定大小的網格，但 ScreenAI 會保留原生圖片的長寬比來決定切塊方式。這讓它能在手機（直式）和桌面（橫式）截圖上都表現良好——不是每種輸入都硬壓成正方形。

模型有三種尺寸：670M、2B、5B 參數。最強的 5B 版從 PaLI-3 的多模態預訓練 checkpoint 出發，訓練分兩階段：

1. **預訓練階段**：透過自我監督自動產生標籤，聯合訓練 ViT 和語言模型
2. **微調階段**：凍結 ViT，大部分資料由人工標註者手動標記

### 資料：螢幕註解 + LLM 生成飛輪

這是整篇論文最關鍵的部分。ScreenAI 的核心貢獻不在模型架構，而在一個叫「螢幕註解」（Screen Annotation）的表示格式，以及圍繞它建立的資料生成管線。

**螢幕註解管線的工作流程：**

1. 從桌面、手機、平板收集大量截圖（公開網頁 + RICO 式的 app 探索腳本）
2. 用基於 DETR 的版面標註器（layout annotator）自動辨識並標記 UI 元素——圖片、圖示、按鈕、文字——以及它們之間的空間關係
3. 圖示分類器處理 77 種圖示類型，辨識 pictogram 的語意
4. PaLI 影像字幕模型為無法分類的圖示和資訊圖表生成文字描述
5. OCR 引擎抽取所有可見文字
6. 以上全部組合成一份詳細的螢幕結構化描述——一個文字化的 schema，把畫面上的每個元素都轉成「類型 + 位置 + 內容」的格式

有了這個 schema，下一步是餵給 PaLM 2（Google 的大型語言模型），用精心設計的 prompt 自動生成三類訓練資料：

- **問答（QA）**：例如「這家餐廳幾點開門？」
- **螢幕導航**：例如「點擊搜尋按鈕」
- **螢幕摘要**：一到兩句話總結螢幕內容

這整套流程讓 Google 能在不需要人工標註的情況下，大規模地為 ScreenAI 產生多樣化的訓練資料。

### 實驗：5B 打平同級、擴展未飽和

ScreenAI 在公開 QA 資料集（ChartQA、DocVQA、InfographicVQA、OCR-VQA、WebSRC、ScreenQA）、導航資料集（Referring Expressions、MoTIF、Mug、Android in the Wild）和摘要資料集（Screen2Words）上進行微調。

同步釋出的三個新評估基準：
- **Screen Annotation**：評估算面標註和空間理解能力
- **ScreenQA Short**：ScreenQA 的變體，答案更簡潔
- **Complex ScreenQA**：更難的問題（計數、算術、比較、無法回答題），含多種長寬比

結果：5B 參數的 ScreenAI 在 WebSRC 和 MoTIF 上達到 SOTA，在 ChartQA、DocVQA、InfographicVQA 上取得同級最佳。規模分析顯示效能隨模型尺寸增加而提升，且 5B 時仍遠未飽和。

### 消融實驗：三個關鍵發現

1. **彈性切塊勝過固定網格**：尤其對變動長寬比的輸入，保留原生比例的切法明顯更好
2. **LLM 生成的 QA 資料真的有用**：加入合成 QA 資料後，下游 QA 效能提升
3. **螢幕註解預訓練任務不可或缺**：拿掉這個任務，所有下游任務的效能都下降——這是整套系統的基石

### 結論與限制

ScreenAI 證明了用中等規模（5B）建立統一的 UI／資訊圖表 VLM 是可行的。文字化螢幕表示 + LLM 資料生成是一個有效的規模化訓練資料建構方法。效能尚未飽和，暗示進一步擴展仍有空間。但作者也坦承，ScreenAI 在某些任務上仍落後於更大的模型，需要更多研究。

## 城武觀點

先說結論：**ScreenAI 是一篇好論文，但它的真正貢獻被論文標題誤導了。**

論文標題是「A Vision-Language Model for UI and Infographics Understanding」，但如果你以為它的核心突破在模型架構設計，你會被誤導。PaLI 是 2022 年的架構，pix2struct 的彈性切塊是 2023 年的技巧。ScreenAI 的「架構創新」就是把兩個已知組件接在一起，然後換個名字。這不丟臉——好的系統工程本來就是把對的零件放在對的地方——但我們必須誠實分類：這是一篇「系統工程」論文，不是「演算法創新」論文。

**真正的新東西是「螢幕註解」這個表示格式。** 把一個 UI 截圖轉成結構化文字描述——每個元素標上類型、位置、空間關係——這件事看似簡單，但它是整篇論文能運作的唯一理由。這個格式讓 LLM（PaLM 2）能「讀懂」螢幕內容，然後自動生成 QA、導航、摘要等訓練資料。沒有這個格式，後面的一切都不會發生。貢獻層級很清楚：**表示格式設計 > 模型架構創新。**

但這裡有一個矛盾，而且它以經直接指向 Google 在 AI 時代的標準操作模式。

**螢幕註解這個資料生成管線，依賴的是 DETR（物件偵測）+ PaLM 2（文字生成）——兩個都是 Google 的內部工具。** 論文說「我們自動生成了大規模訓練資料」，但這個「自動」是建立在 Google 內部的基礎設施上的。模型權重確實開源了——你可以下載 checkpoint，可以 fine-tune，可以在你自己的 app 上跑推理。但如果你想要從頭訓練一個 ScreenAI？抱歉，DETR 的版面標註器和 PaLM 2 的文字生成能力不在開源包裡。模板公開了，但印刷機只有 Google 有。

這不是偶然的設計，這是 AI 時代的經典競爭策略：**開源模型來建立生態系，封閉資料管線來建立護城河。** 學術社群可以研究 ScreenAI 的輸出、可以在它之上做應用、可以發表改進論文——但你無法複製整個訓練流程。這讓「複現性」（reproducibility）這顆學術核心價值變得非常微妙：你可以重現推理結果，但你無法重現訓練過程。

IJCAI 收這篇論文沒有問題——它貢獻了新資料集、新基準、新表示格式，而且實驗紮實。但未來如果有人說「我們複現了 ScreenAI」，你得追問一句：你是用 Google 的 pretrained weights，還是從頭用相同的資料管線訓練的？這兩者之間有一道只有 Google 能跨越的鴻溝。

*城武的未解檔案——開源的模型是一張地圖，但只有 Google 知道礦在哪裡。*

- 原文：[ScreenAI: A visual language model for UI and visually-situated language understanding](http://blog.research.google/2024/03/screenai-visual-language-model-for-ui.html)（Srinivas Sunkara, Gilles Baechler et al., Google Research, 2024-03-19）
- 論文：[ScreenAI: A Vision-Language Model for UI and Infographics Understanding](https://arxiv.org/abs/2402.04615)（IJCAI 2024）
