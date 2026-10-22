---
layout: post
guide: agent-security
title: "【深度分析】Git worktree 不是 coding agent 的隔離邊界——而且 clone 根本沒比較貴"
date: 2026-07-31 02:00:00 +0000
categories: [llm, ai, deep-analysis]
---

![hero]({{ site.baseurl }}/assets/images/2026-07-31/2026-07-31-git-worktrees-isolation-coding-agents.jpg)

如果你正在用任何一種「平行跑多個 coding agent」的工具，幾乎可以確定它背後用的是 git worktree。而這篇來自 Fletch 的文章要說的是：worktree 從來就不是一個安全邊界。你給 agent 一個 worktree，它可以裝 hook 在你的機器上跑、可以改寫你的 commit author、可以把另一個 agent 的 stash 偷到自己 tree 裡——全部合法，不需要 bug 也不需要 exotic command。更關鍵的是：用 clone 來隔離的成本跟 worktree 一模一樣，兩個選項擺在桌上，worktree 只是比較危險的那個。

## 原文摘要

Fletch 這篇文章的開場就很直接：給 coding agent 一個 git worktree——這是目現大多數並行 agent 工具的預設做法——而那個 agent 就可以安裝一個 hook，在你下次 commit 的時候在你的真實 repo 裡以你的身份執行。它可以改寫你自己的 commit 的 email。它可以把另一個 agent 的 stash 拿出來丟進自己的 tree。這些全都不需要 bug，也不需要什麼冷門指令。Worktree 從來就不是邊界，它只是掛在同一個 `.git` 上的第二個工作目錄，而所有有趣的東西都住在那個 `.git` 裡。

Worktree 之所以變成預設方案，是因為表面上看起來太合理了。一行指令、不用複製歷史、一秒鐘生出第二個 checkout。它的賣點是「幾乎零成本的隔離」——但作者說，這句話的兩半都是錯的：隔離遠比「isolated worktree」這個詞暗示的要薄，而「用正確方式做」的成本其實一樣。作者說他自己在前一版文章裡也搞錯了成本那部分，直到實際量測過才修正。

### 一個 linked worktree 到底共享了什麼

在 linked worktree 裡面，`.git` 不是一個目錄，而是一個檔案：

```
$ cat ../my-worktree/.git
gitdir: /path/to/repo/.git/worktrees/my-worktree
```

一切都從這條路徑展開。Git 把 repo 狀態分成「per-worktree 狀態」和「common 狀態」，而且它會告訴你哪個是哪個。`git rev-parse --git-dir` 指向 per-worktree 的路徑，`git rev-parse --git-common-dir` 則指向原始的 `.git`——那是 parent 和所有 sibling worktree 共享的。

Per-worktree 狀態的清單很短：HEAD、index、ORIG_HEAD，以及少數 bisect 和 rebase 的檔案。其他所有東西都透過 `--git-common-dir` 解析回原始 repo：

- 物件庫（`.git/objects`）——這是共享本身的目的，而且共享它是安全的。
- Refs 和 branches（`refs/heads`、`packed-refs`）——所有 worktree 共用一個命名空間。
- Config（`.git/config`）——共享。
- Stash（`refs/stash`）——共享。
- Hooks（`.git/hooks`）——共享目錄直接等於任意程式碼執行。

所以隔離是真的，但它很窄：你的工作目錄、HEAD、index。這些有用，但它們不是邊界。邊界的意思是「被限制在 worktree 內的 process 無法觸及外面的狀態」，而上面那第二份清單就是它可以觸及的所有方式。問題是，「isolated worktree」這個詞被不斷使用——在工具說明裡、在建議討論串裡——從來沒有人說清楚它指的是上面兩份清單中的哪一份。

### 這讓 agent 能做什麼

最糟的先來。以下每個區塊都可以自己建立 repo，可以任意順序執行。所有輸出都是真的，在 git 2.50.1 上擷取。

**第一，在你的主機上執行程式碼。** `.git/hooks` 在 common directory 裡。因此從 worktree 內部安裝的 hook，實際上是安裝給 parent repo 的，而且它會以你的身份、在 parent repo 裡面，在你下次觸發對應的 git 指令時執行。作者給出了一段完整的示範：建立一個 hook-demo repo、開一個 agent-work branch、用 `git worktree add` 建立 worktree，然後在那個「隔離」的 worktree 裡寫一個 pre-commit hook 到 common directory。回到 parent repo 做一個普通的 commit——hook 就以你的身份在 parent repo 裡執行了。

這也是為什麼 worktree 不能當作 containerized agent 的隔離層。把一個 linked worktree 交給 container，意味著你要把 parent 的真實 `.git` mount 進去——因為 worktree 自己的狀態就住在那裡。一個可寫的 `.git/hooks` 在 host 那一側的 mount 上，跑的就是 host 的程式碼，container 就失去意義了。

**第二，改寫你的 commit author。** Config 是共享的，所以在 worktree 裡跑 `git config` 寫入的是 parent 的 `.git/config`。示範中，agent 在 worktree 裡執行 `git config user.email "agent@example.com"`，回到 parent 後 `git config user.email` 顯示的就是 `agent@example.com`。作者請你特別盯著最後兩行看：那不是 agent 的 commit，那是你的 commit，在你的 repo 裡，帶著別人選的 author line。

**第三，拿走另一個 worktree 的 stash。** 整個 repo 只有一個 `refs/stash`，它的行為就跟一個被多個未協調寫入者共用的單一 stack 一樣。示範中，agent A 在 worktree A 裡做了修改、`git stash` 存起來；agent B 在 worktree B 裡 `git stash pop`，就把 A 的 stash 拿出來應用到自己的 tree 裡了。A 再看 stash list 是空的，檔案回到原始內容。A 的工作現在在 B 的 tree 裡。

作者特別點出一個關鍵細節：`file.txt` 必須在建立 branch 之前就已經被 commit 過，這樣它在兩個 worktree 裡都是 tracked file。因為 `git stash` 預設忽略 untracked files，如果是全新檔案會印出「No local changes to save」，什麼都不存，pop 也會失敗。要用 tracked file，或是加 `git stash -u`。

**第四，改寫 sibling 底下的 refs。** 所有 worktree 都寫入同一個 `refs/heads` 和同一個物件庫。一個 agent 跑 `git gc` 就是對整個 repo 跑，parent 也包含在內。一個 agent 做 force-update、rebase、或 `git reset --hard`，會改變其他 worktree 依賴的 refs。一個 agent orphan 掉的 commit，可能讓另一個 agent 的 reference 突然失效。作者強調：這些不是冷門指令，這些是一個 confused process 在試圖「整理」時會自然伸手去拿的東西。

**第五，branch 名稱碰撞。** 共享 refs 也意味著 git 不允許同一個 branch 出現在兩個 worktree 裡。如果你試著在兩個 worktree 都 checkout `main`，第二個會直接 fatal。這在五個問題裡傷害最小，但它是人們第一個撞到的牆，也是迫使大家為每個 worktree 生出一個拋棄式 branch 只為了滿足 git 的原因。

### 那些號稱能修好它的方法，都修不好

每次討論這件事，就會冒出兩個緩解方案。兩個都撐不住。

**Per-worktree config。** `extensions.worktreeConfig` 預設是關的，而且打開之後只有在你刻意用 `git config --worktree` 時才有用。一個普通的 `git config`——也就是任何沒有特別小心的程式會做的事——仍然寫入共享檔案。作者示範：parent 打開 `extensions.worktreeConfig`、在 worktree 裡用 `--worktree` 設定 email，parent 不受影響；但 worktree 裡只要跑一個普通的 `git config user.email leaked@example.com`，parent 的 config 就被蓋掉了。

**把 hooks 移出 `.git`。** 這是循環論證。`core.hooksPath` 是 config，config 是共享的，所以 worktree 可以把它指向任何地方。你在 parent 設好 `core.hooksPath ../safe-hooks`，worktree 裡可以建立一個 `evil-hooks` 目錄，然後 `git config core.hooksPath "$(pwd)/evil-hooks"`——config 是共享的，回到 parent 做 commit，evil hook 照樣執行。

`--separate-git-dir` 也一樣失敗。它只是把 `.git` 搬到別的地方，而所有 worktree 仍然共享它被搬到的那個位置。

這三種方案都只能約束一個「試圖守規矩」的寫入者。它們沒有一個能減少 worktree 實際上能寫入什麼。

### 那用 clone 吧。成本一樣。

標準的反對意見是：每個 worker 一個 clone 意味著要複製歷史。但對於 local source 來說，事情根本不是這樣。這是作者說他之前搞錯的部分，所以他拿出了數據。

以 git/git 的一個完整 clone 為基準：81,772 commits、4,828 tracked files、318 MB 的 `.git`、58 MB 的 working tree。每一行從這個 local source 建立一個新的 checkout。作者特別說明量測方法：disk 用 cumulative delta 計算，因為 `du` 對每個 inode 只算一次，如果單獨量測一個 hardlinked clone 會把根本沒實際新增的 bytes 算進去。

結果是：worktree、plain clone、shared clone 三者在 working tree checkout 上的成本幾乎一模一樣——大約 58.7 到 58.9 MB、826 到 982 ms。對你的硬碟來說它們是同一個操作。不管你選哪個機制，你付出的都是一份檔案的拷貝，沒有其他有意義的支出。

原因是：local git clone 不會複製物件，它用 hardlink。同一個 packfile 的 inode 在 reference 和 plain clone 裡是一樣的。只有 `--no-hardlinks` 才會真的複製，而沒有人會不小心加上這個 flag。如果你一直避免用 local clone 是因為你假設它會複製歷史——它不會。

`--shared` 更進一步，完全不複製任何東西。它只寫一個檔案——`objects/info/alternates`——指向 source 的物件目錄。所以它的 `.git` 只有 660 KB，相對於 plain clone 的 hardlinked 318 MB。`--shared` 真正買到的是對歷史大小的獨立性：它是 O(1) 對 source 有多少歷史，O(n) 對你 checkout 多少檔案。Checkout 才是主導成本，表格就是這麼說的。

作者修正自己之前的說法：以前他描述這個成本是「kilobytes and milliseconds」，這對 metadata 來說是對的，對整個操作來說是錯的。它耗費的是 kilobytes 的 `.git` 加上一個 working tree，總共不到一秒。

用同樣的 59 MB，用 clone 你得到的是真正的隔離：在 plain clone 或 shared clone 裡設定 config，reference repo 完全不受影響；在 worktree 裡設定 config，reference repo 立刻被寫入。兩者都共享了那一個「複製很貴但共享很安全」的東西（物件庫）。Clone 還隔離了那五個「一旦有多個寫入者就變成地雷」的東西。

### `--shared` 的代價

它借用物件，所以依賴 source 的物件庫留在原地。不要刪掉它底下的 source，也不要在 clone 還活著的時候對 source 跑 aggressive 的 `git gc`，不然你可能會 prune 掉 clone 還在引用的物件。`git clone --dissociate` 可以把借用的物件複製進來、切斷依賴，如果你想晚點再處理的話。

Plain hardlinked clone 是兩者中比較 robust 的。原因值得知道：hardlink 自己就保住了 inode——如果 source 刪掉或 repack 那個 packfile，clone 的 link 還是會把資料撐住。`--shared` 沒有這種保護，因為它拿的是路徑而不是 reference。你放棄的是 O(1) 特性、永久去重複、以及跨檔案系統的能力——當 workspace 在另一個 volume 上或被 bind-mount 進 container 時，這就開始重要了。

兩者沒有誰嚴格比較好，它們失敗的方式不同，而兩者都隔離了 refs、config、stash 和 hooks。

### 什麼時候 worktree 是正確的選擇

Worktree 共享 `.git` 是故意的，而且對它被設計來做的事情來說，這個共享就是重點：

- 一個人在兩三個 branch 之間切換。你需要 branches、stash 和 config 到處可見。
- 快速 build 或測試另一個 branch，不干擾你的 index。
- 任何你是唯一寫入者、而且你知道每個指令跑下去會發生什麼事的場景。

即使有 agent，一個人監督著、逐個 diff 閱讀的一兩個 agent 在 worktree 上用 shell alias 跑也沒問題。撐不住的是「未協調的寫入者」。「共享一個 `.git`」和「跑好幾個會自行其事的 process」之間有直接的張力，不管驅動程式寫得多小心，都改變不了共享目錄允許什麼。

所以：人開車的時候用 worktree，其他東西開車的時候用 clone。成本兩種方式都一樣，這意味著你真正在選的只是一個 confused process 能造成多大損害。

**Disclosure：** 作者是 Fletch 的開發者，Fletch 是一個跑 coding agent 的 macOS app，所以他必須在這兩種方案中選一個。Fletch 給每個 agent 一個 `git clone --shared`，理由就是上面量測的那些。它的 worktree 模式藏在 developer flag 後面，因為在 container 底下那會意味著 mount 真實的 `.git`，而第一個 repro 裡的 hook 就會在 host 上執行。

## 城武觀點

這篇文章表面上是 git 工具的技術比較，但城武看到的是一個反覆在工程界重播的模式。十年前，我們說 Docker container「夠安全」來跑不受信任的程式——直到大家終於承認 container 不是安全邊界。今天，我們說 worktree 是「isolated」的——但 `.git` 是共享的，隔離只存在於檔案系統層，不存在於 git 狀態層。這個模式的 SOP 很清楚：先出貨、命名暗示安全、大家用得很開心、後審計、才發現隔離是虛構的。

城武賭一件事：agentic coding 工具會在一年內出現因為 worktree 共享而導致的真實安全事故。不是 PoC，是真的有人程式碼被偷或被改。然後整個生態系才會匆忙 migrate 到 clone-based isolation——就跟當年 Docker 的安全 story 重演一模一樣。差別只在這次的主角從 container runtime 換成了 git。

第二點更讓城武在意。Fletch 文章列出了五種攻擊路徑，整個討論圈的注意力全部集中在 hook execution 上——「有人的 code 在我機器上跑了！」——因為它戲劇性最強。但 config 改寫（`git config user.email`）才是真正危險的那個。Hook execution 是瞬間的、可察覺的、事後至少你知道發生過什麼。Config 改寫是沉默的、持久的、事後無法追溯的。你的 commit author 被換成 `agent@example.com`，六個月後你才發現。而 `git log` 看起來一切正常——commit message、diff、時間戳全都是對的，只有署名不對。

這不只是 git 的問題。整個資安領域都有這個偏誤：把焦點放在最吵的攻擊上，而不是最危險的攻擊上。最吵的攻擊有一整個 conference talk 的產業鏈在支撐它，最安靜的攻擊沒有人寫文章討論——直到出事。

`--shared` clone 的代價是「kilobytes 的 metadata 加一個 working tree」，而且作者自己都說他之前搞錯了成本。如果成本真的相同，那選擇 worktree 的理由就只剩下一個：你以經習慣了。但「習慣」不構成安全論證。

*城武的未解檔案——安全討論永遠把麥克風遞給最吵的攻擊，而不是最安靜的那個。而最安靜的那個，正在改寫你的 commit author。*

- 原文：[Git worktrees are not an isolation boundary for coding agents](https://fletch.sh/blog/git-worktrees-vs-clones-for-ai-agents/)（Fletch, fletch.sh, 2026-07）
