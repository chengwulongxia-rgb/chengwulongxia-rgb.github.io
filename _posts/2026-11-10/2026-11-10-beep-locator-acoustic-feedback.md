---
layout: post
title: "【深度分析】Claude怎麼找出嗶聲？Beep Locator把麥克風、校時與程式熱更新接成回饋迴路"
description: "從 Beep Locator 開源原碼拆解手機錄音、聲學校時、裝置測距與 TDOA 定位，說明 coding agent 如何讀取結果並更新偵測程式。本文採靜態原碼分析，未重現作者的聲源定位實驗。"
date: 2026-11-10 14:39:11 +0800
categories: [llm, ai, deep-analysis]
image: /assets/images/2026-11-10/beep-locator-acoustic-feedback.jpg
---
![hero]({{ site.baseurl }}/assets/images/2026-11-10/beep-locator-acoustic-feedback.jpg)

「給 Claude 耳朵」在這裡不是讓模型直接聽音檔、猜聲源，而是把錄音、訊號處理、結果查詢與程式修改接起來。Beep Locator 的 Python 程式負責算位置；coding agent 可以透過控制介面讀取狀態、觸發程序，並更新瀏覽器端程式。要理解這個回饋迴路，得先分開網路時間與錄音時間。[3][4][7]

## 原文摘要

Simon Willison 在 2026 年 11 月 9 日發文，描述用兩台 iPad、一支手機、MacBook Pro 與 Surface Ultra 尋找間歇嗶聲。他自述最後把位置縮到約 40 公分內，找到需要換電池的老舊一氧化碳偵測器。這是作者家中的單次成果，不是跨房間、設備的精度承諾。[1]

開發也不是單一模型端到端完成：Opus 5.5 Extra 先規劃並建出大部分系統，當時尚未實跑；後來 Fable 5.2 在本機持續調整。作者還加入人工拖放裝置位置、拍手測試與錄音回放確認。以下不逐節轉述文章，而從開源原碼分析資料如何進入求解器。[1]

## 兩種時間：網路負責找片段，音訊負責量間隔

`runtime.js` 以 WebAudio 取得麥克風，要求關閉回音消除、降噪與自動增益，再把音訊寫進約 60 秒的環形緩衝區。資料以各裝置自己的音訊 frame 編號索引；`currentFrame()` 則由 `AudioContext.currentTime` 與採樣率換算。A 手機的 frame 不能直接減掉 B 手機的 frame，因為它們不是同一個時鐘。[5]

另一條是 WebSocket 的控制時間。README 說明 ping／pong 建立的是粗略的伺服器時間到裝置 frame 對照，只用來知道該去哪段錄音搜尋；`analysis.py` 也把這些輸入稱為 approximate expectations。網路訊息何時抵達，不等於聲音何時進入麥克風，不能把事件的收件時間直接當成精密定位依據。[2][4]

前端 `detector.js` 因此只是候選事件產生器：先以高通濾波後的能量和背景門檻比較，再對附近片段做 FFT，回報 frame、音量、頻率與頻譜峰值突出度。靜態原碼裡，最後送出的仍是 `onset` 事件，不是聲源座標，也不是模型辨識出的物件名稱。[6]

協調程序優先使用設定指定的同步裝置；沒有指定時，才選網路往返時間最短的裝置播放同步 chirp，再收集嗶聲前約 0.6 秒至 chirp 後約 0.8 秒的錄音。低 RTT 幫助安排程序；真正能對齊的參考，是各麥克風都錄到的 chirp。[9]

## 先找裝置，再找未知聲源，是兩個不同問題

校準階段的輸入是「已知由哪台裝置發出的 chirp」。`analyse_calibration()` 在各份錄音搜尋每台裝置的聲音，組成到達 frame 矩陣；`pairwise_distances()` 才把它轉成裝置間距離。做法不是跨手機相減，而是在 A 的錄音量出兩次 chirp 的間隔，在 B 的錄音也量一次，再將兩個間隔相減、乘上聲速的一半，補上各裝置喇叭到自身麥克風的距離修正。[3][4]

這讓不同裝置的時鐘起點不必相同；兩次發聲之間的等待時間也會在相減時抵銷。聲音到達點則由 matched filter 尋找：拿已知 chirp 波形與錄音相關比對，優先挑符合條件的早期到達峰，而非一律採最強峰，因為較晚反射的聲音可能更大。這是訊號處理規則，不是 Claude 對房間位置的直覺。[3]

有了距離矩陣，`fit_layout()` 先以 MDS 產生二維配置，再用 SMACOF 調整座標，讓座標間距離貼近量測值。只有距離仍不能決定地圖相對房間的旋轉與鏡像；若提供完整的人工粗略位置，`layout_from_distances()` 會改走 `refine_layout()`，把它當起點與較弱的先驗約束。Rough mode 因此不是純顯示設定，而是會影響求解的額外輸入。[3][4]

## 同步 chirp 如何把未知嗶聲放到共同時間軸

定位未知聲源時，裝置座標已經是輸入。`analyse_beep()` 分別找出每份錄音的嗶聲起點與同步 chirp 到達點，再做下面這段轉換。這是[固定版本的原碼片段](https://github.com/simonw/beep-locator/blob/449a48870969b48cd195ea157a242640a0b393a9/beep_locator/analysis.py#L256-L258)，本文只作靜態核對，未執行，也沒有本站量測輸出。[4]

```python
t = (info["onset_frame"] - ch["frame"]) / rec.sr + d_e / c
info["time"] = t
times[rec.device_id] = t
```

第一行先在同一份錄音裡，用嗶聲起點減去 chirp 到達 frame，再除以該裝置採樣率，得到秒數。這一步消掉裝置時鐘的起點差異，但參考點仍是「chirp 抵達這支麥克風」，不是「chirp 被發出」。因此加上 `d_e / c`：同步發聲裝置到接收裝置的距離除以聲速；若是裝置自己聽自己，則用喇叭與麥克風間距。各裝置於是都換到同一次 chirp 發聲的參考原點。[4]

第二行把換算結果留在該裝置的分析紀錄，供檢查；第三行以裝置 ID 放進 `times`，供後續聯合求解。程式保留的不是一句「聽到了」，而是可對照的起點、chirp、訊噪比與校正後時間。這個局部公式處理的是時間原點，並未保證所有裝置的採樣時鐘速率完全一致。[4]

接著 `locate_tdoa()` 對候選位置算出聲音到各麥克風的預期傳播時間，找出最符合觀測時間差的位置。未知發聲時間也一併處理，因此不必知道嗶聲究竟在幾點幾秒發出。實作先做網格搜尋，再用 Gauss–Newton 細調；至少需要三台裝置有可用時間資料，才會嘗試求解。[3][4]

原碼另檢查兩台裝置的到達時間差是否超過它們間距容許的上限。不一致時，資料足夠才嘗試排除可疑裝置，否則回報錯誤。殘差能指出資料與幾何模型不合，不能單獨證明估計點就在真實聲源旁；裝置座標或多台麥克風共同偏掉，仍可能影響結果。[4]

## 回饋迴路的另一半：修改偵測器，不重開麥克風

單有錄音還不能讓 agent 持續調整。`server.py` 提供狀態、事件、結果、錄音與控制入口；`runtime.js` 則把長期存活的錄音核心和可替換模組拆開。`installModule()` 收到新 JavaScript 後建立 Blob URL，以動態 `import()` 載入，再清理舊模組、呼叫新模組的 setup；載入或啟動失敗會回報，部分情況可回退舊版本。[5][7]

因此修改偵測門檻、事件處理或介面，不必整頁刷新，也就不必為每次修改重新啟動錄音與建立緩衝區。回饋路徑是：麥克風產生資料、Python 回傳分析、agent 讀取紀錄並改程式、新模組接著處理後續資料。這是在使用者已授權的瀏覽器頁面環境執行新程式，不是繞過瀏覽器沙箱，也不是音訊本身變成指令。[5][7]

## 若要重現，先固定版本與驗收方式

閱讀與安裝入口可從 [README](https://github.com/simonw/beep-locator/blob/449a48870969b48cd195ea157a242640a0b393a9/README.md) 開始，並固定到本文核對的版本。操作順序應先確認各裝置確實收音與互相聽見 chirp，再檢查校準距離、粗略配置與已知位置的測試聲，最後才等未知嗶聲；不要只以地圖出現一個點當作驗收。README 提供 Test beep，分析原碼也回傳逐裝置偵測與殘差，方便區分「沒有錄到」、「起點沒找到」與「時間資料無法相容」。[2][4]

手機收音另有 HTTPS 條件。CLI 提供區網自簽 HTTPS 或 Cloudflare tunnel 選項；採 tunnel 就不能稱為完全區網離線。協調者網址含管理 token，應與一般 listener 加入網址分開：原碼會檢查 coordinator 連線與管理 API 的 token，而 listener 上傳使用個別 upload key。[7][8]

SQLite、WAV 與 token 預設存於執行伺服器的 `beep-data/`；已讀原碼的聲學求解位於 Python，但這不構成「錄音絕不會離開主機」的保證。`--auto-update` 也是需主動啟用的選項，不是預設持續拉新程式；要比較結果，應保留相同版本與裝置配置。[2][8]

本文核對的是 11 月 10 日取得的 `449a488` 開源快照，完整版本見上述程式連結；它晚於作者文章，不保證與約 40 公分那次量測完全同版。本文沒有啟動服務、執行第三方程式或重現聲學實驗，能交付的是資料流與原碼機制的靜態分析，不是新的定位精度測試。

## Sources

[1] [Simon Willison個案原文](https://simonwillison.net/2026/Nov/9/mysterious-beeps)
[2] [README與操作說明](https://raw.githubusercontent.com/simonw/beep-locator/449a48870969b48cd195ea157a242640a0b393a9/README.md)
[3] [dsp.py：測距與求解](https://raw.githubusercontent.com/simonw/beep-locator/449a48870969b48cd195ea157a242640a0b393a9/beep_locator/dsp.py)
[4] [analysis.py：錄音到時間座標](https://raw.githubusercontent.com/simonw/beep-locator/449a48870969b48cd195ea157a242640a0b393a9/beep_locator/analysis.py)
[5] [runtime.js：錄音與模組載入](https://raw.githubusercontent.com/simonw/beep-locator/449a48870969b48cd195ea157a242640a0b393a9/beep_locator/static/runtime.js)
[6] [detector.js：候選聲響偵測](https://raw.githubusercontent.com/simonw/beep-locator/449a48870969b48cd195ea157a242640a0b393a9/beep_locator/modules/listener/detector.js)
[7] [server.py：控制介面與認證](https://raw.githubusercontent.com/simonw/beep-locator/449a48870969b48cd195ea157a242640a0b393a9/beep_locator/server.py)
[8] [cli.py：HTTPS與啟動參數](https://raw.githubusercontent.com/simonw/beep-locator/449a48870969b48cd195ea157a242640a0b393a9/beep_locator/cli.py)
[9] [procedures.py：校準與同步程序](https://raw.githubusercontent.com/simonw/beep-locator/449a48870969b48cd195ea157a242640a0b393a9/beep_locator/procedures.py)

- 原文：[Locating the source of a mysterious beep with Claude](https://simonwillison.net/2026/Nov/9/mysterious-beeps)（Simon Willison，2026-11-09）
