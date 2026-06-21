---
layout: post
title: "LLM 週報：Shazeer 與 Jumper 換陣營的那一週——AI 人才戰爭進入核彈級"
date: 2026-06-21 13:00:00 +0000
categories: [llm, ai, weekly]
---

![hero]({{ site.baseurl }}/assets/images/2026-06-21/llm-weekly.jpg)

這週的 AI 圈像一步被快轉的政治驚悚片：一週內兩位傳奇級研究者換陣營、一家前沿實驗室同時遭遇產品爆發與內外夾擊、一家估值千億的公司財報外洩、歐洲開源勢力三連發、中國開源模型默默攻頂。如果你只看日報，很容易錯過這些事件之間的連結——本週真正的故事不是任何一則新聞，而是這些新聞同時發生所揭示的權力重整。

## 本週焦點

### 1. [Noam Shazeer 加入 OpenAI](https://twitter.com/NoamShazeer/status/2067400851438932297)／[John Jumper 投奔 Anthropic](https://twitter.com/JohnJumperSci/status/2068001285173834106)

這不是普通的人才流動。這是 AI 頂尖實驗室之間的軍備競賽進入了核彈級。

Noam Shazeer 是 Transformer 架構的八位共同作者之一，也是 Character.AI 的創辦人。他的身分本身就是一段 AI 史：從 Google Brain 到創業再到回歸巨頭，路徑類似當年的搜尋引擎天才從 Google 出走創業又被買回。但 Shazeer 選的不是老東家 Google，而是 OpenAI——這本身就是一個信號：在 2026 年，最頂尖的研究者認為 AI 的前沿不在搜尋廣告公司，而在專注通用智慧的實驗室。

同一週，2024 年諾貝爾化學獎得主、AlphaFold 共同發明人 John Jumper 宣布離開 Google DeepMind，加入 Anthropic。Jumper 的 AlphaFold 是 AI for Science 的里程碑——他不是一般的 ML 工程師，而是用 AI 解決了困擾生物學半世紀的蛋白質折疊問題的科學家。他選擇的不是產品化最成功的公司，而是以「安全」為核心敘事的 Anthropic。

兩則新聞並置的意義很清楚：AI 人才戰爭的戰場已經從「誰給的薪水高」轉移到「誰的使命能讓最聰明的人覺得自己的才華不會被浪費」。Shazeer 選了「通用智慧」，Jumper 選了「安全與科學」。各家實驗室的雇主品牌分化正在加速。

但真正的問題是：當一家公司把頂尖人才全部吸走，它同時也吸走了定義「什麼是重要的 AI 問題」的權力。人才集中不只是商業競爭問題，是知識生產權的集中。

### 2. Anthropic 的多事之秋：Opus 4.8、Fable 5、內部崩潰、政府打壓

本週 Anthropic 展示了什麼叫「好新聞和壞新聞同時發生，而且你分不清哪個是哪個」。

好新聞面：發布了 [Claude Opus 4.8](https://www.anthropic.com/news/claude-opus-4-8)（coding、agent 任務、長時間穩定性的全面提升）、[Fable 5 和 Mythos 5](https://www.anthropic.com/news/claude-fable-5-mythos-5) 兩個新模型系列、發表了 [BioMysteryBench](https://www.anthropic.com/research/Evaluating-Claude-For-Bioinformatics-With-BioMysteryBench) 和 [Mythos 資安評估](https://www.anthropic.com/research/mythos-preview)、[讓 Claude 做化學實驗](https://www.anthropic.com/research/making-claude-a-chemist)、[首爾辦公室開幕](https://www.anthropic.com/news/seoul-office-partnerships-korean-ai-ecosystem)，還延攬了諾貝爾獎得主 Jumper。

壞新聞面：Axios 報導 Anthropic 內部 [「人格衝突導致模型離線」](https://simonwillison.net/2026/Jun/15/axios-clashes-anthropics/#atom-everything)——這不是小插曲，是服務中斷級的人事災難。WSJ 揭露 [Amazon CEO 與美方官員的會談觸發了對 Anthropic 模型的打壓](https://www.wsj.com/tech/ai/amazon-ceos-talks-with-u-s-officials-triggered-crackdown-on-anthropic-models-dcc90578)——也就是說，Anthropic 的雲端合作夥伴居然在遊說政府限制它的模型。WIRED 調查報導 [SK Telecom 在 Mythos 爭議中的角色](https://www.wired.com/story/sk-tel...rols/)，把韓國擴張的新聞染上了爭議色彩。

這些事件同時發生不是偶然。當一家 AI 公司的模型能力逼近 frontier 時，內部的組織張力、外部的監管壓力、合作夥伴的利益衝突會同步爆發。Anthropic 的「安全」敘事在本週承受了最嚴峻的壓力測試——不是來自模型對齊的理論辯論，而是來自辦公室的真實人事和董事會的權力遊戲。一個靠「我們比別人更負責任」來建立品牌的公司，被發現內部管理也可以很「不負責任」——這是最大的信譽風險。

### 3. [Mistral 三箭齊發：Mistral 3、Small 4、Medium 3.5，外加 Agents API](https://mistral.ai/news/mistral-3/)

法國開源旗艦 Mistral 本週一次發布了三代旗艦模型加一個 Agents API，規模堪比一場小型的開發者大會。

[Mistral 3](https://mistral.ai/news/mistral-3/) 是旗艦、[Small 4](https://mistral.ai/news/mistral-small-4/) 是輕量、[Medium 3.5](https://mistral.ai/news/vibe-remote-agents-mistral-medium-3-5/) 是中型並主打遠端代理（vibe remote agents）。這三層定位展現了 Mistral 清晰的 multi-model 策略：不追求一個模型打天下，而是為不同場景打造不同尺寸。在 OpenAI 和 Anthropic 都在往超大模型砸錢的同時，Mistral 選擇了一條更務實的路——這本身就是一種論述。

[Mistral Agents API](https://mistral.ai/news/agents-api/) 的推出更值得注意。它意味著 Mistral 不只是模型公司，正在成為 agent 基礎設施公司。這是 Anthropic 的 Claude Code 和 OpenAI 的 Codex + Ona 收購已經在走的路，Mistral 用 API 產品而非應用程式的姿態加入戰局，對開發者更友善但對營收的掌控力更弱。

### 4. [OpenAI 財報外洩：年虧數十億美元的真相](https://arstechnica.com/ai/2026/06/leaked-financial-docs-show-openai-is-losing-billions-of-dollars-a-year/)

Ars Technica 取得的外洩財報文件顯示，OpenAI 每年虧損達數十億美元。這個數字本身並不令人意外——訓練前沿模型的成本是天文數字——但與 OpenAI 同一週宣布的其他消息並置，故事變得有意思了。

OpenAI 啟動了 [合作夥伴網路，投入 $150M](https://openai.com/index/introducing-openai-partner-network) 協助全球企業推動 AI 採用；[收購 Ona](https://openai.com/index/openai-to-acquire-ona)，為 Codex 建立安全持久的雲端執行環境以便 AI agent 處理長時間企業工作流；[GPT-5 強化醫療智能](https://openai.com/index/improving-health-intelligence-in-chatgpt)；同時還有一個尷尬的數據——[GPT-5.5 的幻覺率是 MIT 授權的開源模型 GLM-5.2 的三倍](https://arrowtsx.dev/bigger-models/)。

組合起來的畫面是：一家年虧數十億的公司，正在用燒錢的速度同時進行模型研發、企業銷售、收購擴張和政治遊說。這不是一般商業意義上的「虧損」，這是平台戰爭時代的軍費開支。問題是：這種燒錢速度在資本市場轉向之前能撐多久？以及，當一個開源模型（GLM-5.2）在幻覺率上顯著優於你的付費旗艦模型（GPT-5.5），你的「更大＝更好」敘事要怎麼維持？

### 5. [中國開源勢力崛起：GLM-5.2、DeepSeek Vision、Qwen-Robot Suite](https://simonwillison.net/2026/Jun/17/glm-52/)

Simon Willison 將 GLM-5.2 評為「可能是目前最強的純文字開源權重 LLM」。同一週內，DeepSeek 推出了 [Vision 視覺功能](https://chat.deepseek.com/)，Qwen 發表了 [機器人基礎模型套件 Qwen-Robot Suite](https://qwen.ai/blog?id=qwen-robotsuite)，NVIDIA 也在 arXiv 上釋出了 [Nemotron 3 Ultra——一個開源的 MoE + Mamba-Transformer 混合架構](https://arxiv.org/abs/2606.15007)。

這些事件的共同點不是「中國」，而是「開源」與「多模態/實體世界」的雙軸線擴張。GLM-5.2 在幻覺控制上的表現暗示中國實驗室在訓練品質上的進步可能比外界認知的更快。DeepSeek 躲過了美國黑名單（[至少暫時](https://www.reuters.com/world/china/us-holds-off-blacklisting-chinas-deepseek-more-than-100-firms-deemed-security-2026-06-17/)），並迅速補上多模態能力。Qwen 從語言模型跨入機器人領域，這一步的方向比技術本身更重要——它代表中國 AI 實驗室正在和 Figure、Tesla Optimus 等公司爭奪同一個未來。

如果你相信 AI 的下一階段是走入實體世界，那麼本週的新聞告訴你：這場比賽不會只有美國選手。

## 其他值得關注

- **[Amazon 取消 Sam Altman 傳記電影，就在宣布與 OpenAI 合作之後](https://www.the-independent.com/arts-entertainment/films/news/sam-altman-biopic-amazon-openai-deal-b2999321.html)**：經典的利益衝突規避操作，但時機巧合得幾乎像黑色喜劇。
- **[Midjourney Medical 進軍醫療影像](https://www.midjourney.com/medical/blogpost)**：生成式 AI 從「藝術玩具」跨入「臨床工具」的關鍵一步，但也打開了監管與倫理的潘朵拉盒子。
- **[Cloudflare 推出 AI Agent 臨時帳號](https://blog.cloudflare.com/temporary-accounts/)**：基礎設施層解決 agent identity 問題，是 agent 生態成熟的前置條件。
- **[荷蘭主權 LLM「GPT-NL」](https://www.tno.nl/en/digital/artificial-intelligence/gpt-nl/)**：國家級模型的趨勢從亞洲蔓延到歐洲，數位主權從口號變成預算。
- **[里約熱內盧「自研」LLM 被拆穿為現有模型合併](https://github.com/nex-agi/Nex-N2/issues/4)**：不是每一座城市都有能力自研 LLM，但每一座城市都應該知道：假裝自己的模型比標記來源更重要嗎。
- **[ChatGPT 圖片生成器被 viral prompt 繞過安全過濾](https://mindgard.ai/blog/chatgpt-spontaneously-generated-violent-images-from-a-viral-prompt)**：安全過濾永遠是一場貓捉老鼠的遊戲，而老鼠只需要贏一次。
- **[Anthropic 研究：寫 Code 的 AI 要用領域專家而非工程師來用](https://www.anthropic.com/research/claude-code-expertise)**：基於 40 萬次 Claude Code session 的實證——會 coding 不等於會用 AI coding。這結論對產業的技能需求有深遠影響。
- **[Agentic Resource Discovery 規格草案](https://agenticresourcediscovery.org/introduction/)**：為 AI agent 標準化資源發現的協定，是 agent 網路真正能互通的前置基礎建設。
- **[BBVA 將 ChatGPT Enterprise 部署至 10 萬名員工](https://openai.com/index/bbva)**：銀行業最大規模的 LLM 部署之一，如果成功將會複製到更多受監管產業。
- **[Chris Olah 回應教宗 AI 通諭《Magnifica humanitas》](https://www.anthropic.com/news/chris-olah-pope-leo-encyclical)**：AI 與宗教的交會或許不會上頭條，但對長期社會接受度的影響可能比任何技術發布都深遠。
- **[Systemd 261 釋出](https://www.phoronix.com/news/systemd-261)**：基礎建設層的演進，sysinstall、IMDSD 等新元件繼續擴張 systemd 的管轄範圍。
- **[Ubisoft 共同創辦人 Claude Guillemot 空難逝世](https://www.bloomberg.com/news/articles/2026-06-20/ubisoft-co-founder-claude-guillemot-dies-in-air-crash-at-age-69)**：與 AI 無直接關聯，但這是遊戲產業本週的重大損失。

## 隱藏敘事線

本週的新聞表面上是產品發布、人事異動、財報外洩的隨機組合，但底層是一場關於「誰控制 AI 基礎設施」的權力重組。Shazeer 和 Jumper 的換陣營不是個人的職涯選擇，而是 AI 的知識生產權正在從分散走向集中的信號。Anthropic 在同一週裡展示模型實力、內部混亂、外部打壓、國際爭議，恰好說明了前沿實驗室的處境：能力越強，承受的壓力維度越多，而這些壓力的來源彼此矛盾——政府要安全，合作夥伴要利潤，投資人要成長，員工要使命。Mistral 的三連發和中國開源模型的崛起則提供了另一個視角：當少數公司在高處廝殺時，開源陣營正在用較低的姿態從新定義什麼是「夠好的 AI」。而 OpenAI 的外洩財報是這個敘事最誠實的 footnote——這場戰爭的成本已經高到無法用一般商業邏輯理解，卻也無法保證最終贏家會誕生。

*城武的未解檔案——當人才、資金、監管和開源同時撞擊一個產業的臨界點，你看到的不是混亂，是新生態系統的胎動。問題是：誰在寫規則？*
