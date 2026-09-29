---
layout: post
title: "【深度實作】把 0.5B 模型切進七塊 ESP32-S3：Low-Zi-Hong 的 BitNet 管線實驗"
subtitle: "frozen"
date: 2026-09-29 02:00:00 +0000
categories: [llm, ai, deep-analysis]
tags: [ESP32-S3, BitNet, 本地推論, 分散式推論, 嵌入式系統, SPI]
---
![hero]({{ site.baseurl }}/assets/images/2026-09-29-esp32s3-bitnet-cluster-local-inference/hero.jpg)

把語言模型分給七塊 ESP32-S3，不等於做出一台能聊天的微型電腦。Low-Zi-Hong 的專案有趣在另一個地方：它把 tokenizer、權重、逐層運算、板間通訊與輸出頭拆到不同位置，連錯誤可能在哪裡發生都變得具體。尤其要先讀它的警告：目前量化訓練並不充分，輸出可能只是隨機 token。這篇依 [README](https://github.com/Low-Zi-Hong/ESP32s3-LLM-Cluster) 與 [workflow](https://github.com/Low-Zi-Hong/ESP32s3-LLM-Cluster/blob/main/workflow.md) 逐段看設計與限制，而不是把架構圖當成可用性證明。

## 原文摘要

### 模型與七塊板子的分工

儲存庫的 About 描述稱這是透過 SPI 菊鏈運行、採 1.58-bit（三元）量化的「0.4B LLM」；README 的 Architecture 卻寫「切片後的 0.5B LLM」，workflow 的規格表則明列基礎架構為 Qwen2-0.5B，經裁剪與量化後部署。文件沒有解釋 0.4B 與 0.5B 的統計口徑差別，不能把三個字樣硬湊成一個經核實的最終參數量。這裡的「BitNet」指線性層用 {-1, 0, 1} 三元權重表示，不是整個推論過程的每一筆資料都只有 1.58 bit。

整組是主節點加六個計算節點。主節點接收 prompt，用 BPE tokenizer 轉成 token，查 INT4 embedding；README 圖示把 embedding 標為約 14 MB、存於 Flash。它送出的 hidden state 標為 FP32，沿 SPI 傳到第一塊計算板。每塊計算板負責四個連續 Transformer blocks：第一塊跑第 0–3 層，接著 4–7 層，直到第六塊的 20–23 層，共 24 層。這是按層順序接力，不是把同一個 token 的工作平均分散後瞬間合併，也不能由板數推出七倍速度。

每個 block 涉及 RMSNorm、帶 RoPE 的 attention（Q、K、V、O 投影），以及 MLP 的 gate、up、down 投影；README 將投影標為 1.58-bit，將 RMSNorm 描述為 FP16 scaled to FP32。各節點把當前序列的 KV cache 放在 PSRAM。最後一塊把狀態送回主節點，主節點做 final RMSNorm（圖示為 fnorm 分割區中的 64 KB FP16 資料）、用與 INT4 embedding 綁定的 LM head 算下一個 token，採 greedy sampling 輸出。量化權重、embedding、活化值與 KV cache 的儲存／計算路徑不同，不能拿「1.58-bit」當全機記憶體與效能的單一答案。

workflow 規格表進一步列出 hidden size 896、SwiGLU 中間維度 4,864、14 個 query heads 與 2 個 KV heads 的 grouped-query attention，單一 head 維度 64；上下文窗設為 512 tokens，KV cache 在節點 PSRAM 動態配置。文件估計每層打包後約 3.82 MB、每塊計算板四層約 15.3 MB，對應 16 MB SPI Flash 的緊繃預算；主節點另有約 14 MB INT4 embedding 與 final norm。這些是專案文件的規格與估算，不是本文取得板子後的量測。

### 從模型到 Flash：不是下載權重就能刷

workflow 從刷主節點與計算節點韌體開始；這一步會建立後續要用的分割區。它特別提醒刷機前移除並讓 reset 腳位懸空，避免接線妨礙燒錄。接下來進 `python_tools`：`crop_token.py` 把原本約 151K 的 BPE 詞表裁為 32K，`crop_model_weight.py` 同步裁 embedding，`update_config.py` 更新設定。作者說超過 32K 詞表會超出這種 ESP32-S3 配置的 16 MB Flash 預算，並提出把 embedding 拆給兩塊板子的可能方向；那不是本篇七節點配置已做到的擴充。詞表與 embedding 若沒有一起裁，空白輸出也可能是詞彙對不上，不能直接怪 SPI。

之後 `qat_158.py` 做 1.58-bit 的量化感知訓練（QAT）；`bit4_embedding.py` 打包 INT4 embedding，`pack_tokenizer_bin.py` 與 `pack_model_bin.py` 把 tokenizer 和模型層變成可刷入的 binary。規格表寫每 byte 打包四個三元權重，並考慮對齊。workflow 明確要求 Python 端的 2-bit 三元打包順序與映射，必須和韌體的解碼，以及 `python_tools/run_model158.py` 的驗證一致。文件把韌體路徑寫作 `node_firmware/main/`，但目前儲存庫中實際檔案位於 `node_board/main/bitlinear.cpp` 與 `node_board/main/lut_table.cpp`；若只照文件路徑找，會找不到檔案。編碼若不一致，程式未必崩潰，卻會靜默把權重讀錯，產生退化或重複的輸出。這是文件指出的相容條件，不代表本文已檢驗所有實作路徑。

燒錄時，`flash_embed.bat`、`flash_tokenizer.bat` 的目標是主節點；`flash_layers.bat` 則要把 `layers_0_to_3.bin`、`layers_4_to_7.bin` 等六份檔案逐一放到對應計算板。workflow 要求每刷一塊板都檢查 Windows COM 埠與 `.bin` 的層範圍，還要讓板子在實體菊鏈的位置與所刷層數吻合：Node 1 接 0–3 層，Node 6 接 20–23 層。刷錯層不一定報錯，只會悄悄算出垃圾；大檔燒錄也需要時間。能成功寫入 Flash，仍不等於模型順序正確，更不等於輸出品質合格。

### SPI 接力、同步與供電

接線文件要求七塊板子共地。資料路徑由上一塊的 SPI Channel A（TX：GPIO 4/5/7，分別為 CS/MOSI/CLK）接下一塊的 Channel B（RX：GPIO 15/16/18），一路接力，最後回主節點。另有控制線：主節點 GPIO 1 發 reset 給下一節點，節點再向後傳；末節點 GPIO 3 的 ready 訊號回到主節點，表示節點準備狀態；GPIO 8 可接運作指示燈。它不是只靠三條 SPI 線插好就能工作的裝置，同步與重置也屬於推論管線。圖與文字給出接線方案，未提供板間錯誤率或長時間穩定性的獨立測試。

作者的供電敘述是主節點由電腦供電，其餘六塊接 DC 電源；也說有足夠線材時可改用 Type-C。閒置數字寫作 5V、0.23A、約 1.17W；推論時卻寫 0.5V、0.3A、約 1.53W，後三個數值彼此不相符。不能擅自替作者改成另一個電壓，也不能把 1.53W 引為可靠的整組實測功耗；主節點和外部電源的量測邊界也沒有交代清楚。

### 跑得動哪一步，跟能不能回答是兩回事

workflow 說可在主節點輸入 `/bench`、再輸入 prompt，等輸出後查看 benchmark；生成上限可改主節點 `main.cpp` 的 `MAX_GEN_LEN` 並重建。擴充段提出加板子便可增加可承載層數，舉每節點四層、節點更多時推論時間線性增長的構想，並稱「目前每節點花 1.3 秒推論」。這是作者在 workflow 的主張，沒有附獨立 benchmark、測試條件與端到端 tokens/s；不能用六段直接外推成可靠的對話延遲，也不能以 `/bench` 指令存在就說已取得測試結果。

最重要的但書也寫在 workflow：作者承認 `qat_158.py` 只做部分訓練，loss 大約停在 8，模型「會吐隨機 token」，並指向 `run_model158.py` 可自行驗證；若有更強的電腦，需修改腳本重新訓練。疑難排解又說，固定重複同一 token 可能與訓練不足或單句過擬合加 greedy 選樣有關；空白輸出先查詞表落差，持續亂碼則查每塊板的層檔與位置，也要檢查三元編碼一致性。這些說明把模型品質、資料準備和硬體接線區分開來。公開的架構與刷機流程，並未因此證明七節點已能實用聊天；要重現有意義的回答，還得看訓練後權重、正確部署，以及可重複的品質與效能測試。

## 城武觀點

這套集群值得看，正因它沒有把「模型在板子上流過」冒充成「板子懂得回答」。token 從主節點出發，經六站計算再返回，Flash、PSRAM 與每一段接線都可以被指認；分散式推論平常藏在伺服器裡的代價，這回擺在桌上。相較於只會喊「七塊 MCU 跑 LLM」的標題，作者自己揭露隨機輸出的限制更誠實。真正的驗證權仍有門檻：沒有能重現品質的訓練權重、端到端測試與輸出樣本，外人可以學會這條管線，卻不能據此宣稱模型能力突破。我會把它當可見性教具，不把它當聊天產品。

*城武的未解檔案——線路看得見，答案是否可靠還得靠可重現的權重與測試。*

- 原文：[Low-Zi-Hong/ESP32s3-LLM-Cluster README](https://github.com/Low-Zi-Hong/ESP32s3-LLM-Cluster)；[Flashing and Preprocessing（workflow.md）](https://github.com/Low-Zi-Hong/ESP32s3-LLM-Cluster/blob/main/workflow.md)（Low-Zi-Hong，GitHub）
