---
layout: post
title: "【深度翻譯】一行 code 都沒寫——用 Claude Code 把 AI 影像修補模型移植到瀏覽器的全程實錄"
date: 2026-06-24 04:00:00 +0000
categories: [llm, ai, deep-translation]
---

![Moebius in browser]({{ site.baseurl }}/assets/images/2026-06-24/moebius-browser.jpg)

Simon Willison 做了一件聽起來很荒謬的事：他用 Claude Code 把一個 AI 影像修補模型從 PyTorch 移植到瀏覽器跑 WebGPU，從研究可行性到寫 code、測試、部署上線，全程自己一行 code 都沒寫。這不是偷懶——這是 agentic coding 真正開始改變「寫程式」這件事定義的時刻。

Simon Willison 成功將 Moebius 0.2B 輕量級影像修補（inpainting）模型移植到瀏覽器，使用 WebGPU 進行推理。整個過程由 Claude Code 驅動，人類介入極少——Simon 沒有寫任何一行程式碼。使用者可以直接在瀏覽器中開啟圖片、標記要移除的區域，讓模型填補空白，一切都在本地端完成。

整個移植過程分為六個階段。第一階段是初步可行性研究。Simon 先問 Claude.ai（具備 repo 複製能力）去複製 Moebius 儲存庫、定位模型權重、評估移植選項。Claude 建議使用 ONNX Runtime Web 搭配 WebGPU 後端——這是一個關鍵的架構決策，決定了後續所有實作路徑。Simon 把這個答案存成 research.md，作為後續 Claude Code 的任務說明書。

第二階段是環境準備。複製 Moebius 儲存庫、從 Hugging Face 下載權重、安裝 transformers.js 和 onnxruntime，建立 moebius-web 目錄。這些是傳統意義上「寫程式」專案開始前的前置工作，但在這裡，它們只是為了讓 Claude Code 有一個可以工作的基地。

第三階段是提示 Claude Code。核心提示詞非常簡潔：「讀取 ./moebius-web/research.md——你的目標是將這個模型移植到 ONNX 和 WebGPU，讓它直接在瀏覽器中執行，並附帶一個簡單的 UI。」沒有 detailed spec，沒有 architecture decision record，只有一個目標和一條參考資料。Claude Code 從這裡開始自主工作。

第四階段是測試與迭代。Claude Code 產出可運作版本後，Simon 索取 URL 進行測試。他在 Chrome 中測試並將錯誤（包括螢幕截圖）回饋給 Claude，反覆迭代直到功能正常。這個階段的關鍵是：Simon 不需要讀懂 ONNX 的錯誤訊息細節，他只需要能判斷「這個結果對不對」和「這個錯誤看起來像什麼問題」。

第五階段是部署。轉換後的 ONNX 權重（1.24 GB）發布到 Hugging Face 上的 simonw/Moebius-ONNX。前端部署到 GitHub Pages，網址為 simonw.github.io/moebius-web/。

第六階段是模型檔案快取。最初的版本每次載入頁面都要重新下載 1.24 GB 的權重，這顯然無法接受。Claude Code 在探索過程中發現 Whisper Web 的展示專案使用了瀏覽器的 CacheStorage API（caches.open("transformers-cache")），便將其導入專案，讓模型檔案在使用者首次造訪後快取在瀏覽器中，後續載入無需重新下載。

**技術細節**

模型從 PyTorch 轉換到 ONNX 的過程中，PyTorch 提供了內建匯出功能 torch.onnx.export()。一個 .onnx 檔案封裝了兩樣東西：運算子的計算圖（computation graph），以及訓練完成的權重。ONNX 作為一種可攜且框架中立的類神經網路檔案格式，抽象地描述「要計算什麼」，而不指定「如何計算」或「在什麼硬體上計算」。

執行堆疊方面，ONNX Runtime Web 扮演了關鍵角色——它提供 WebGPU 執行提供者（execution provider）。瀏覽器下載 ONNX 模型後，將其編譯為 WebGPU 可執行的格式，完全在客戶端進行推理。初始頁面載入後不需要任何伺服器，所有運算都在使用者的 GPU 上完成。

## 城武觀點

Simon 說的「一行 code 都沒寫」不是誇飾，是事實描述。但這句話真正刺中的問題是：當「寫程式」可以被分解成「告訴 AI 你要什麼 → AI 寫 code → 你測試 → AI 修 bug」這個循環時，傳統意義上的「寫程式」還存在嗎？

如果寫程式不再是鍵盤上的指法，而是「決定方向、判斷結果、迭代修正」的決策過程，那我們應該用一個新詞來稱呼這件事——因為它跟 2023 年以前任何人理解的「寫程式」都以經不是同一件事了。Simon 的角色不是 programmer，是 research director 兼 QA tester。他的生產力不來自他打了多少字，來自他能不能在 Claude Code 歪掉的時候給對的 feedback。

Claude Code 是在等待 Datasette 開發的「空檔」完成這個移植案的。這點比任何 benchmark 數字都更能說明 agentic coding 的本質。Agent 不只是工具——它是可以被塞進人類空檔的平行工作力。你喝咖啡的時候它在跑實驗，你開會的時候它在改 bug，你在等 CI 的時候它在 port 模型。當 agent 可以填滿人類所有的零碎時間，生產力模型就從「一個人一小時能寫幾行 code」變成了「一個人同時能監督幾個 agent 跑哪些任務」。

最後，也是最殘酷的一點：這個工作流裡人類還有位置，但位置已經變了。Simon 做了三件事：決定方向（用 ONNX + WebGPU 而非其他方案）、給 feedback（錯誤截圖）、做部署決策（GitHub Pages）。這三件事的共同特徵是——都需要**判斷力**，都不需要**執行力**。

這意味著如果你的價值建立在「我 code 寫得比別人快」上，agent 會取代你。但如果你的價值建立在「我知道什麼方案值得嘗試、什麼結果值得上線」上，agent 是你最好的員工。但反過來說：沒有判斷力的人，在這個工作流裡找不到位置。因為 agent 不缺執行力，它缺的是那個能在他亂跑的時候喊停、在他迷路的時候給方向的人。當所有執行工作都被自動化，判斷力就不再是加分項——它是入場券，也是你得從新思考自己定位的信號。

*城武的未解檔案——一行 code 都沒寫的專案，反而是最讓人反思「寫程式」到底是什麼的專案。*

- 原文：[Porting the Moebius 0.2B image inpainting model to run in the browser with Claude Code](https://simonwillison.net/2026/Jun/22/porting-moebius/)（Simon Willison, 2026-06-22）
- Demo：[https://simonw.github.io/moebius-web/](https://simonw.github.io/moebius-web/)
