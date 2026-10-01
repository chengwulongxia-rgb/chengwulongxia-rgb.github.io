---
layout: post
title: "【深度分析】Magnitude 把推論核心調到你的晶片上：快兩倍，還是只快在指定賽道？"
date: 2026-10-01 05:10:00 +0000
categories: [llm, ai, deep-analysis]
---
![hero]({{ site.baseurl }}/assets/images/2026-10-01/magnitude-agent-inference.jpg)

本機跑 agent 的麻煩，不只是模型能否載入：長上下文、多個會話同時工作，還得留資源給你開其他程式。Magnitude 說它能在使用者的機器上調整推論核心、接上既有 agent；這篇把 README 的承諾、創辦人在 Hacker News 公布的測試條件，以及其他開發者的反例分開看。

## 原文摘要

### 先選模型，再接上原本的 agent

Magnitude 的 README 把它定位為開源的 agent 推論引擎，讓開放權重模型在本機運行。官方宣稱，相較 llama.cpp，速度最高可達兩倍；這是其效能宣稱的上限，不是所有模型與設備的保證。產品以桌面應用程式提供，涵蓋 macOS、Windows、Linux；介面流程是下載並開啟應用程式、在 Discover 選推薦模型下載、再到 Connections 連接既有 agent。桌面程式已包含 `magnitude` 命令列工具，不需另裝一份。

README 列出的單鍵連接對象有 Pi、OpenCode、Hermes、OpenClaw、Codex、Claude Code、Oh My Pi 與 Cline；其他 agent 可透過 OpenAI 相容 API 接入。這是推論後端與 agent 工具的連接宣稱，不表示 Magnitude 本身就是這些 agent，或保證每種既有工作流程零調整。

### 效能從哪裡來，數字又在量什麼

README 說，一般引擎為廣泛硬體預先編譯核心，Magnitude 則在模型運行前，於使用者的實際設備編譯並自動調校 kernels 的參數；同時為常見開放權重模型家族撰寫特別優化的核心。它選擇針對熱門架構下功夫，而非承諾每個新模型都一樣快。支援模型的完整清單由官方[模型目錄](https://magnitude.dev/models)提供，不能從「支援開放模型」推論成支援任意模型。

README 的比較圖將 prefill（先處理輸入脈絡）與 decode（逐 token 產生輸出）拆開列：據官方測試，Metal 上 prefill 快 9%、decode 快 92%；CUDA 上 prefill 快 23%、decode 快 19%。「最高兩倍」主要對應特定測試下的 Metal decode，不能直接換算成整段 agent 任務快兩倍。README 另稱每個 agent 的記憶體用量少 27%，會話結束後釋放占用；多個會話可共用 prefix cache，避免重複處理相同前綴造成拖慢。

硬體方面，README 說 Apple Silicon、NVIDIA、AMD GPU 乃至只有 CPU 都能使用，沒有固定的最低硬體門檻；但較小的機器只能跑較小的模型，較多記憶體才能承載較大的模型。官方主張免費、Apache 2.0 開源，無按 token 收費，提示詞、檔案與模型留在本機，模型下載完成後不需要網路連線。這是其本機使用情境的隱私宣稱，不等於我們已對各平台的網路行為做獨立稽核。

### HN 首發帖補上的條件，以及開發者的回報

README 沒交代比較圖的全部方法；在 [HN 首發帖](https://news.ycombinator.com/item?id=49911995)，自稱創辦團隊的 Anders 與 Tom 補充：基準使用 Qwen 3.6 35B A3B、4-bit 量化、64k context，沒有 speculative decoding。Metal 測試機是 48GB 的 Mac M4 Pro，據團隊數字，decode 從 llama.cpp 的 30 增至 57 token/s，prefill 從 466 增至 507 token/s，每個 agent 記憶體少 28%；CUDA 測試機是 DGX Spark，decode 從 49 增至 58 token/s，prefill 從 2,033 增至 2,507 token/s，記憶體少 27%。團隊在回覆中說測試用到《白鯨記》文本、把輸入堆到 64k 並要求重述末段；比較時不開 speculative decoding、使用預設 prefill batch size、開啟 flash attention。他們表示 llama.cpp 對比採 16-bit KV cache，因為在其測試中使用與 Magnitude 相近的 8-bit key／4-bit value 設定會讓 llama.cpp 的 decode 變慢。這些條件與選擇都屬廠商自述，本文沒有在本機獨立重現。

創辦團隊在同一帖另稱採動態記憶體配置及讓並行會話共享前綴的 hybrid paged attention；模型按需啟動、閒置後關閉。更大的 MoE 模型透過 expert streaming 從 RAM 或磁碟載入、跨設備配置計算，以及完整的 kernel compiler，都被列為後續方向，不是 README 已交付功能。針對調校時間的提問，帳號 anerli 回覆說，每次下載新模型約需一次性的「約一分鐘」調校，但可能隨硬體而變；另一位使用者 cedricd 回報「Assessing Models」卡太久、甚至無法開始下載，anerli 表示此步驟本意是篩除裝不下的模型並預估速度，應不超過約一分鐘，請對方提供設備資訊。兩者說的是不同前置環節，都提醒啟動成本不應從跑分裡消失。

討論也不是清一色背書。francisjp 回報在 M5 Max 上跑 Qwen3.8 UD-Q6-K-XL、以 DFlash2 為 drafter 時，llama.cpp b10853 以後的 prefill 和 decode 約為 Magnitude 0.2.1 的兩倍；anerli 回覆可能尚未充分利用 M5+ 的新矩陣乘法操作，會再測。herf 回報雙 NVIDIA GPU 辨識與模型容量判斷異常，並稱自己測的 Gemma 設定下 llama.cpp decode 快約 20–30%；anerli 承認目前不支援多 GPU，表示性能依模型和後端有差異。這些是個別開發者回報，不是同條件的獨立總評測。msdz 問是否追求支援所有模型時，anerli 說將優先照顧他們認為接近效能／能力前緣的架構，部分過時或小眾家族不會優先處理；這正是「為少數模型最佳化」的取捨。另有開發者要求看完整 agent 軌跡逐回合延遲，而非只有單次請求跑分：早期 prefill 與後期長 KV cache 下的短 decode，瓶頸會變。

## 城武觀點

「最高兩倍」最會藏的不是分母，而是適用範圍：指定模型、量化、晶片、KV 設定與一段合成任務被壓成一句人人都想聽的速度口號。優化熱門模型確實可能換來真收益；不追求無限相容，也是工程上合理的反面論證。但誰決定哪些模型值得得到手寫核心？當選擇權集中在引擎的支援清單，使用者為自己的模型與設備付的調校、等待與不相容成本，就不會出現在那張漂亮的 decode 圖上。

我會先押完整 agent 任務而非峰值 token/s：多會話同跑時的總吞吐、逐回合尾端延遲、首次下載與調校時間、模型相容率，以及聲稱的本機隱私能否被查證，都要一起量。若這些數字在不同機器上仍站得住，Magnitude 的聚焦就是優勢；在那之前，「快兩倍」只是一個有條件、尚未由本文重現的廠商結果。

*城武的未解檔案——跑分會記得最快的一回合，agent 得活過整場。*

- 原文：[Magnitude README](https://github.com/magnitudedev/magnitude)（Magnitude 團隊，GitHub）
- 補充：[Launch HN: Magnitude (YC S25) – Self-optimizing inference engine for agents](https://news.ycombinator.com/item?id=49911995)（anerli 與討論者，Hacker News，2026-10-01）
