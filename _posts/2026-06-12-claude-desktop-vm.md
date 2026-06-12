---
layout: post
title: "【深度翻譯】Claude Desktop 每開一次就吞你 1.8GB——而且你只用文字聊天"
date: 2026-06-12 08:00:00 +0000
categories: [llm, tools, deep-dive]
---

![Claude Desktop 每開就吃掉 1.8GB 記憶體的 Hyper-V VM]({{ site.baseurl }}/assets/images/2026-06-12-claude-desktop-vm-hero.jpg)

如果你用的是 Windows 版 Claude Desktop，你可能沒注意到一件事：**每次打開它，你的電腦就默默生出一個 1.8GB 的虛擬機**——即使你只是想打字聊天，根本沒打算用 Cowork 或 agent 模式。

這不是都市傳說。這是 GitHub issue [#29045](https://github.com/anthropics/claude-code/issues/29045)，從今年二月開到現在，累積了大量受害者的怒吼，Anthropic 還沒給出修復時間表。

---

## 到底發生了什麼事？

GitHub 用戶詳細記錄了他的診斷過程：

- 系統：Windows 11 Pro，Razer Blade 15，16GB RAM
- 現象：工作管理員裡出現 `Vmmem` 程序，常駐 **1,796–1,846 MB**
- 他沒裝 WSL、沒裝 Docker、沒開 Hyper-V、沒開 Windows Sandbox、Core Isolation 也關了
- 唯一開啟的虛擬化功能是 `VirtualMachinePlatform`

更精彩的是他挖到的底層機制：

> 每次 Claude Desktop 啟動，就會透過 RPC 介面觸發 Hyper-V Host Compute Service（vmcompute），叫出一個 vmwp.exe 掛載完整虛擬機。

他在 `%APPDATA%\Claude\local-agent-mode-sessions\` 底下還發現了 **2,689 個過期的 session 檔案**——都是之前 Cowork 跑完沒清掉的。session 名稱走 Docker 風格：`nifty-dreamy-volta`、`tender-vigilant-goodall`、`admiring-elegant-johnson`。

他把這 2,689 個檔案全刪了、把 vmcompute 和 vmwp 程序都砍了——然後**重新打開 Claude Desktop，VM 立刻原地復活**。

---

## 不只 Windows，macOS 也中獎

同一個 issue 串裡，macOS 用戶回報：

> Claude 1.1.4498，macOS 版，啟動時生出 **Apple VirtualMachine**，吃掉約 **2.61 GB**。

而且跟 Cowork 開不開無關——就算帳號把 Cowork 關了，VM 照開不誤。

---

## 這對一般使用者有什麼影響？

原文作者是 16GB 的筆電，他的數據：

| 狀態 | 記憶體使用率 |
|------|------------|
| 系統閒置 | ~50% |
| 開啟 Claude Desktop（僅聊天） | ~62% |
| 平常工作負載 + Claude | 70–75% |

一個「聊天 App」吃掉你 12% 的記憶體增量。在你開始打字之前，它就已經把你的 RAM 當 buffet 在吃。

---

## 目前的解法（都不算解法）

### 方案 A：直接拔掉虛擬化平台

```powershell
Disable-WindowsOptionalFeature -Online -FeatureName "VirtualMachinePlatform" -NoRestart
```

有效，但 Cowork 功能就廢了。

### 方案 B：每次開完手動殺 VM

```powershell
Stop-Process -Name vmwp -Force
Stop-Process -Name vmcompute -Force
```

殺完後聊天功能正常——等於你每天打開 Claude 要先當一次 IT 管理員。

### 方案 C：停用 CoworkVMService（感謝社群）

```powershell
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\CoworkVMService" -Name "Start" -Value 4
```

VM 不會啟動，聊天照用。但有個副作用：每次開 Claude 還是會從 Google 伺服器下載 2GB 的 rootfs，只是不會掛起來跑。

### 方案 D：改用網頁版

這是好幾個人的最終解——直接不用桌面版了。

---

## 技術面：為什麼要這樣設計？

Anthropic 的工程部落格有一篇 [How we contain Claude across products](https://www.anthropic.com/engineering/how-we-contain-claude)，解釋了他們的容器化安全架構：為了讓 Cowork 能在隔離環境中操作電腦，底層需要一個輕量 VM。

問題是：**這個 VM 的初始化邏輯是啟動時無條件執行的**，而不是等到使用者真的點下 Cowork 按鈕才觸發。

GitHub issue 裡有人直接問到了關鍵：

> 「為什麼不能在需要時才初始化 VM？為什麼不能回到純聊天模式？」

Anthropic 至今沒有給出技術上的解釋。

---

## 社群反應

從二月到六月，issue 串累積了 25+ 條回應。幾個代表性的：

- 「非常棒的產品，但我不得不先解除安裝。」—— Kylemitchell64
- 「這實際上阻止了我大量使用 Claude。」—— phillipdebruin
- 「我需要選項讓我能關掉 Claude Code 和 Cowork。」—— hunglng（改用網頁版）
- 有人甚至寫了一個 [ClaudeFix](https://github.com/JesperLive/ClaudeFix) 工具包來批量處理這些問題
- macOS 問題被連到另一個 issue [#30972](https://github.com/anthropics/claude-code/issues/30972)

---

## 城武觀點

這件事有幾個層次值得追問。

**1. 工程債 vs 使用者體驗**

在啟動時無條件初始化 VM，從工程角度看是最簡單的選擇——不需要判斷使用者意圖、不需要處理延遲初始化、不需要維護兩套執行路徑。但代價是**所有使用者都要為一個只有少數人會用的功能付出 1.8GB 的代價**。

這不是技術限制，這是優先級的選擇。

**2. 平台層的傲慢**

Anthropic 說他們的使命是打造安全的 AI。但一個會在背景偷偷下載 2GB 檔案、生出你看不到的虛擬機、而且不給你選項關掉它的桌面 App——這跟「透明」完全相反。

你可以想像一個反過來的世界：如果是微軟的 App 在 macOS 上幹了一樣的事，科技圈會怎麼反應？

**3. 問題開了四個月，回應呢？**

issue 在二月就開了，詳細的診斷報告、社群 workaround、跨平台的確認都貼上去了。Anthropic 的官方回應是——沒有回應。連一個「我們正在處理」的標籤都沒掛。

對比 Anthropic 在其他議題上（尤其是安全敘事）的快速反應，這種沉默本身就在說一些事情。

---

## 如果你正在考慮要不要裝 Claude Desktop

- 如果你**只用聊天**：用網頁版就好，桌面版不值得那個 1.8GB
- 如果你**需要 Cowork**：裝，但知道代價是什麼
- 如果你**記憶體 < 16GB**：桌面版會讓你的系統很喘

---

*這篇是深度翻譯，原文來自 GitHub issue [#29045](https://github.com/anthropics/claude-code/issues/29045)，由社群使用者詳細記錄並診斷。翻譯過程中保留了所有技術細節，觀點為城武個人看法。*
