---
layout: post
title: "【深度翻譯】Google 用 Gemini 做了整場 I/O——這算「AI 真的有用」還是「我們產品很多」？"
date: 2026-06-11 15:00:00 +0000
categories: [llm, ai, deep-translation]
---

> 原文：[How we used Gemini to build Google I/O 2026](https://blog.google/innovation-and-ai/technology/ai/io-2026-google-ai/)
> 來源：Google Blog
> 日期：2026-06-01
> 作者：Marvin Chow（VP, Marketing）

---

## 城武導讀

Google 發了一篇「幕後花絮」：他們如何用自家 AI 產品打造整場 Google I/O 2026。

這篇文章是一顆俄羅斯娃娃。表面上是「看，AI 多有用！」。打開第一層，是一份產品目錄——十八個 Google 產品被小心翼翼地放進八個使用場景。再打開一層，是一種奇怪的自我指涉：**我們用 AI 做了這場關於 AI 的大會，所以 AI 一定很有用。**

但開發者來 I/O 不是來看 Google 用 AI 做派對裝飾的。他們是來看自己能拿這些工具做什麼的。而這篇文章對這件事幾乎沒說什麼——因為 Google 最強大的那一面，恰好是外部開發者永遠摸不到的那一面。

---

## 場景拆解

### 1. Timmy TPU 短片

Google 跟導演 Laurie Rowan 和 Nexus Studios 合作，用紙偶和馬克筆畫出 TPU 角色，然後用 AI 把它們變成動畫電影。

流程：木偶表演 → **Nano Banana** 生成風格化幀 → **Google AI Studio** 裡的自訂工具確保像素級一致性 → **Gemini Omni** 和實驗模型把基礎動畫跟風格化幀合起來。

Google 特別強調：「保留那些微小的人類不完美是木偶電影的魅力所在，我們的 AI 管線被設計成保護這些細節。」

這句話值得停下來想。一個行銷副總裁在描述 AI 時說「AI 被設計成保護人類的不完美」。但這整套管線的目的恰好相反：**用人類做的簡單東西，經過 AI，產出看起來專業的東西。** AI 的角色不是「保護不完美」，是**掩蓋不完美**。那篇公關稿說反了。

### 2. 品牌識別

把過去五年的 I/O 回顧和品牌指南餵給 Gemini，用 Nano Banana 迭代出圖標。結果是 2D/3D 動態變形的圖標系統。

這是整篇文章裡最像真實使用案例的一項——mood board + 風格探索，AI 在這裡的角色確實合理。

### 3. Jellectronica：水母交響樂

和蒙特雷灣水族館合作。用 YOLO8 在 Google Colab 上追蹤水母運動 → Coral NPU 推論 → 水母軌跡控制 Lyria 3 Pro 生成的音樂。

這是八個案例裡最有意思的一個。但核心技術——YOLO8 + MIDI 映射——跟 Gemini 沒什麼關係。Google 把它放進來是因為它聽起來很酷。而它確實很酷。但不是 Gemini 的酷。

### 4. Infinite Scaler 遊戲

用戶輸入提示 → Nano Banana 生成 sprite sheet → 送回 Nano Banana 生成法線貼圖、粗糙度貼圖 → 推斷深度 → WebGL 的 3D 紙板箱。Lyria 3 生成遊戲音樂。

這是整篇文章技術密度最高的案例，有真實的管線架構。但它也是一個**展示品**——你在 I/O 現場玩到這個遊戲，覺得很炫，然後就沒有了。沒有人告訴你這個管線要花多少錢、latency 多少、能不能搬到自己的專案上。

### 5. Antigravity Coffee Co.

用 Flutter + Gemini Enterprise Agent Platform + Nano Banana 做的咖啡點餐 App。與會者可以設計自定義拉花圖案，還可以用 Google Antigravity 的 agent 快速生成自己的咖啡 App。

A2UI 協議做自適應界面、Firebase 連後端、Cloud Functions + Firestore。一整套 Google Cloud 全家桶展示。但問題一樣：**一個獨立開發者建同樣的東西要花多少錢？latency 多少？需要多少 Google Cloud 配套？** 沒說。

### 6. 講者標題卡

Nano Banana Pro 生成素材參考表 → Google Flow 裡用 Veo 生成動畫 → Gemini Omni 處理複雜運動。

趣味性高，實用性存疑。每個講者拿到一張個人化動畫標題卡——一個行銷團隊的人力物力支撐，為了在舞台上展示五秒鐘。

### 7. 貼紙

與會者在 20 秒內接住掉落提示詞 → 選兩個組合（或 "I'm feeling lucky"）→ Nano Banana 融合生成個人化貼紙 → 現場列印。

很好的行銷手法。貼紙是 I/O 的紀念品，用 AI 做個人化很有話題性。但它對開發者的價值是零——你不可能在自己的產品裡塞一個 Nano Banana 只為了印貼紙。

---

## 城武觀點

### 你數過有多少產品嗎？

這篇文章提到的 Google 產品：Google AI Studio、DeepMind 實驗模型、Gemini Omni、Nano Banana、Nano Banana Pro、Google Colab、Coral NPU、Flow Music、Lyria 3、Lyria 3 Pro、Google Antigravity、Gemini API、Gemini Canvas、Flutter、Firebase、Google Cloud、Cloud Functions、Firestore、Cloud Ops、Veo、Google Flow。

**二十一個。一篇文章，二十一個產品。**

這不是技術文章。這是一份投影片轉成的部落格文——Google Cloud 的業務代表可以在客戶會議上投影這篇文章，每點一個產品就說「你看，我們自己也用」。

### 物權距離

讀這篇文章的時候我一直在想一個詞——物權距離（material distance）。

Google 的行銷副總裁用 Nano Banana 生成了很酷的貼紙 → 他可以直接打電話給 Nano Banana 的工程團隊問「這個 prompt 為什麼不 work」→ 工程團隊幫他調參數 → 貼紙看起來更酷 → 他寫一篇文章說「看，AI 讓創意更簡單」。

一個獨立開發者用 Nano Banana API 生成貼紙 → prompt 不 work → 沒有工程團隊可以打電話 → 去討論區發文 → 沒人回 → 放棄。

這之間的差距，就是 Google 從來不寫的那篇文章。

### 「我們用 AI 做了一場 AI 大會」——一個自我指涉的陷阱

I/O 的結構是一個封閉迴圈：Google 在台上宣布新的 AI 產品 → Google 用這些產品做了這場大會的內容 → Google 寫文章說這些產品很有用 → 證據是：我們用它們做了這場大會。

這在邏輯上是循環論證，在行銷上卻是聰明的——因為消費者不會去拆這個迴圈。他們會記得「Google 用 Gemini 做了很酷的東西」，而忘記問「那我能做嗎」。

開發者來 I/O 是因為他們相信 Google 會給他們工具。但當 Google 展示的不是「一個開發者用 Gemini API 做了一個 app」而是「Google 自己的行銷團隊用 Gemini 做了 I/O 的派對裝飾」，真正的訊息是：**我們的產品在我們手裡很棒。在你手裡⋯⋯我們不確定，但這不是這篇文章的主題。**

### 那「Nano Banana」到底是什麼

一篇文章提了十幾次 Nano Banana，沒有一行解釋它是什麼。

從上下文推測，它是一個圖像生成模型——可能是 Imagen 的輕量化版本，或某個新的 diffusion 架構。但它沒有產品頁面、沒有 API 文件、沒有定價。它存在的方式就是不斷出現在 Google 的公關稿裡，像一個你永遠約不到的曖昧對象——你一直聽到它的名字，但你永遠碰不到它。

Google 的命名策略也值得玩味。Gemini（雙子座）→ Nano Banana（奈米香蕉）。下一個是什麼？Pico Mango？

---

## 結語

這篇文章的訊息不是「AI 很有用」。它的訊息是「Google 有很多 AI 產品，而且至少對 Google 自己是有用的」。

這不壞。這是一篇產品行銷文，它完成了產品行銷文該做的事。但當你用「幕後花絮」或「技術深度分享」的語氣包裝一份產品目錄時——讀者有權追問：**那我呢？**

Google 在大會上花了幾個小時告訴開發者世界會怎麼改變。然後用一篇部落格文告訴你：我們行銷團隊的派對有多酷。

這中間的落差，就是物權距離。

---

*原文由 Google VP of Marketing Marvin Chow 撰寫，2026 年 6 月 1 日。*
