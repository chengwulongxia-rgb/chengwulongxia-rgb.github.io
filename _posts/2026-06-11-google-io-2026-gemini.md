---
layout: post
title: "【深度分析】Google 用 Gemini 做了整場 I/O 2026——所以呢？這算「有用」還是「秀肌肉」？"
date: 2026-06-11 15:00:00 +0000
categories: llm ai deep-dive
---

> 原文：[How we used Gemini to build Google I/O 2026](https://blog.google/innovation-and-ai/technology/ai/io-2026-google-ai/)
> 來源：Google Blog
> 日期：2026-06-01
> 作者：Marvin Chow（VP, Marketing）

---

## 城武導讀

Google 發了一篇長文，詳細說明他們如何在 I/O 2026 的每一個環節使用自家 AI 產品——從開場前的水母音樂實驗、到短片「Timmy TPU」、到講者標題卡、到與會者的貼紙遊戲、甚至咖啡點餐 App。

讀完之後我的第一個反應是：**這是一篇非常精美的產品展示文，但它回答的問題不是「AI 能做什麼」，而是「Google 有多少產品」。**

讓我數一下這篇文章提到的 Google 產品：Google AI Studio、DeepMind 實驗模型、Gemini Omni、Nano Banana、Google Colab、Coral NPU、Flow Music、Lyria 3 Pro、Google Antigravity、Gemini API、Gemini Canvas、Flutter、Firebase、Google Cloud、Cloud Functions、Firestore、Cloud Ops、Veo、Google Flow。

十八個。一篇文章提到十八個 Google 產品。

這不是一篇技術文章。這是一份產品目錄，偽裝成幕後花絮。

---

## 文章內容整理

### AI x 電影：「TPU Training Day」短片

Google 和導演 Laurie Rowan 以及 Nexus Studios 合作，用紙偶和馬克筆畫出角色，然後用 AI 把它們動畫化。流程是：

1. 用木偶和簡單 3D 動畫捕捉角色表演
2. 用 **Nano Banana** 從原始素材生成風格化的第一幀
3. 在 **Google AI Studio** 裡建了一個自定義工具來大規模測試 Nano Banana 的幀，確保像素級匹配
4. 用 **Gemini Omni** 和其他實驗模型合併基礎動畫和風格化幀

重點是：「保留這些微小的人類不完美是木偶電影的魅力所在，我們的 AI 管線被設計成保護這些細節。」

### AI x 視覺設計：I/O 品牌識別

把過去的品牌指南和五年的 I/O 回顧餵給 Gemini 模型，然後用 **Nano Banana** 迭代圖標風格。最終選定：扁平 2D 圖標動態變形成超質感 3D 圖標。

### AI x 沉浸體驗

**Jellectronica（水母電子樂）：** 和蒙特雷灣水族館合作，用 YOLO8 模型追蹤水母運動來控制音樂（Lyria 3 Pro）。在 Google Colab 訓練模型，跑在 Coral NPU 上。水母越多 → 低音越強。

**Infinite Scaler：** 一個即時生成關卡的 3D 遊戲。用 Nano Banana 從用戶提示生成 sprite sheets，再送回 Nano Banana 生成法線、粗糙度和發射貼圖，推斷深度，映射到 WebGL 渲染的 3D 紙板箱上。遊戲音樂完全用 Lyria 3 生成。

**Antigravity Coffee Co.：** 與會者用 Flutter + Gemini Enterprise Agent Platform + Nano Banana 設計和點餐帶有自定義拉花藝術的拿鐵。用 A2UI 協議做自適應界面。

### AI x 創意小物

**講者標題卡：** 每個講者都有 AI 生成的個人化標題卡。用 Nano Banana Pro 生成素材參考表，在 Google Flow 裡用 Veo 和 Gemini Omni 生成動畫。

**貼紙：** 與會者在 20 秒內用 Android 機器人接住掉落的提示詞，選兩個提示詞（或「I'm feeling lucky」），後端用 Nano Banana 融合生成個人化貼紙設計，立即列印。

---

## 城武觀點

### 問題一：這些 AI 使用有多少是「必要的」？

讓我對每個案例問一個問題：如果不用 AI，這件事會變得多難？

- **Timmy TPU 短片：** 不用 AI 的話，你需要傳統的動畫管線。但 Google 用 AI 做的事情是「把木偶動畫變成風格化動畫」——這本來就是傳統動畫在做的事。AI 在這裡的角色是風格轉換，不是創造。
- **品牌識別：** 把過去的品牌指南餵給模型生成新圖標。這本質上是一個 mood board 工具。用 Midjourney 或 Stable Diffusion 也能做。
- **Jellectronica：** 這個確實有趣——用水母運動控制音樂。但核心是一個 YOLO8 追蹤模型 + MIDI 映射，AI 在這裡的角色是「追蹤」，不是「創作」。
- **Infinite Scaler：** 即時生成遊戲關卡。這是整篇文章裡最技術性的一個案例，但本質上是一個 sprite sheet 生成器 + WebGL 渲染。
- **咖啡 App：** 用 AI 生成拉花圖案。一個濾鏡 App 也能做。

我的結論：**在這些案例中，AI 不是不可替代的——它是「比較方便」或「比較酷」的選擇。** 這和 Google 暗示的「AI 徹底改變了我們做事的方式」之間有落差。

### 問題二：「Nano Banana」是什麼？

這篇文章提到「Nano Banana」至少十次。它出現在：圖標生成、sprite sheet 生成、風格化幀生成、貼紙設計、拉花圖案。

但 Google 沒有解釋 Nano Banana 是什麼。從上下文推斷，它似乎是一個圖像生成模型——可能是 Imagen 的下一代、或者一個新的 diffusion 模型。但「Nano Banana」這個名字本身就很值得玩味：**它聽起來像一個內部代號被直接放進了公關稿。**

這有兩種可能：
1. Google 真的把這個產品叫做 Nano Banana（像 Gemini 一樣是一個產品名）
2. 這是一個內部專案代號，公關團隊覺得它夠可愛就直接用了

無論哪種，這都說明了 Google 的產品命名策略正在走向一個奇怪的方向。先是 Gemini、然後是 Nano Banana。下一步是什麼？Mango Tango？

### 問題三：這篇文章真正在說什麼？

這篇文章的表面訊息是「看，AI 多有用，我們用它做了整場 I/O」。

但它真正的訊息是：**「我們有這麼多 AI 產品，而且它們都能用。」**

這是一份產品目錄。每一個案例都是一個產品的展示機會。Google AI Studio、Gemini Omni、Nano Banana、Lyria 3、Veo、Antigravity、Flutter + Gemini Enterprise Agent Platform——每一個都被放在一個具體場景裡，讓讀者看到它能做什麼。

這不壞。這就是一篇產品行銷文。但把它包裝成「幕後花絮」或「技術深度分享」就有點過了。

### 更深層的問題：AI 在大型活動中的角色

讓我問一個更根本的問題：**一場科技大會用 AI 來製作自己的內容，這到底是在展示 AI 的能力，還是在暴露 AI 的局限？**

I/O 是一場給開發者看的大會。Google 在台上宣布新的 AI 產品，然後用 AI 製作這場大會的視覺內容、音樂、遊戲、貼紙。這形成了一個奇怪的迴圈：**AI 被用來展示 AI 有多好。**

但開發者來 I/O 是想看到能用在他們自己產品上的技術，不是看 Google 用 AI 做自己的派對裝飾。

如果 Google 真的想展示 AI 的能力，更好的方式是：展示一個開發者用這些工具做了什麼。而不是展示 Google 自己的行銷團隊用這些工具做了什麼——因為 Google 有無限的預算、直接的工程團隊存取、以及「我們是產品的主人」的優勢。

---

## 結論

這篇文章是一個漂亮的產品展示。它展示了 Google 在 AI 生成內容方面的廣泛佈局——圖像、影片、音樂、遊戲、UI。但它沒有回答一個關鍵問題：**這些工具對外部開發者有多好用？**

Google 自己的行銷團隊用 Nano Banana 做了很酷的貼紙。但一個獨立開發者能用 Nano Banana API 做什麼？Google 沒有說。

也許下一篇文章會回答這個問題。也許不會。

但至少，現在我知道了：Google 的下一代圖像生成模型叫做 Nano Banana。這本身就是一個訊息。

---

*原文由 Google VP Marvin Chow 撰寫，發表於 Google Blog，2026 年 6 月 1 日。*
