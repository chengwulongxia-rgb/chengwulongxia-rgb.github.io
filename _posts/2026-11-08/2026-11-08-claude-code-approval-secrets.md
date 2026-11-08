---
layout: post
title: "【深度分析】Claude Code「不再詢問」怎麼把密碼留進權限檔？"
description: "有限整理 Apiiro 的公開儲存庫調查，交叉核對 Claude Code、Git 與 GitHub 官方文件，拆開命令核准、權限持久化與提交外洩的三個節點；本文未實跑 Claude Code，也未驗證任何外露憑證。"
date: 2026-11-08 12:13:15 +0800
categories: [llm, ai, deep-analysis]
---
![Claude Code 權限記錄與憑證外洩機制示意]({{ '/assets/images/2026-11-08/claude-code-approval-secrets.png' | relative_url }})

命令執行完，密碼不一定跟著消失。Apiiro 的研究指出，Claude Code 的永久核准可能把含憑證的命令留下來。以下只作有限摘要，再以官方文件拆解 CLI 寫入 local 權限檔的流程：資料如何從執行參數變成權限設定、何時可能進入 Git。本文沒有實跑 Claude Code、掃描第三方儲存庫或測試憑證有效性。

## 原文摘要

Apiiro 的研究以 2026 年 11 月 1 至 3 日的公開儲存庫預設分支為蒐集範圍，找到 104,185 份 `.claude/settings.local.json`，其中 1,122 份被分類為含真實秘密。這是檔案數，不是受害者或入侵次數；分類依金鑰格式、密碼與公開主機等線索，沒有逐一登入驗證。研究者稱，一家公司確認其金鑰曾有效。[研究原文](https://apiiro.com/blog/coding-agents-leaking-secrets-github-dont-ask-again)

研究者重現的路徑是：命令帶有憑證字面值，使用者選擇永久核准，完整命令遂進入允許清單；檔案後來被提交，才成為公開資料。這是 Apiiro 的重現，不是本站實測。

## 從執行一次到留下規則，是兩次不同的資料處理

[Claude Code 權限文件](https://code.claude.com/docs/en/permissions)區分核准的有效期：Bash 的「不再詢問」依儲存庫與命令永久保存，檔案修改的核准則到 session 結束。永久核准會寫成 `allow` 規則，不能把所有工具的同名選項理解成相同生命週期。

下面是自製 JSON 示意，未執行，也不是從外洩檔案擷取；密碼為明確占位字串，主機使用 `.invalid`：

```json
{
  "permissions": {
    "allow": [
      "Bash(PGPASSWORD=DEMO_NOT_A_REAL_PASSWORD psql -h db.example.invalid -U demo -c 'select 1')"
    ]
  }
}
```

沿這個示意看資料流：原本用來驗證資料庫身分的字串，出現在命令文字；若它被原樣保留為規則，日後讀取設定檔就能看到它，不必再執行資料庫連線。這是依研究機制所作的分析，並非宣稱每一版、每一種命令都一定產生上述 JSON。

還要分開第三個節點：設定檔存在磁碟，不等於已公開。保存規則與推送儲存庫是不同事件；只檢查執行時是否經過同意，無法回答後續檔案去了哪裡。

## 官方有忽略機制，但不是儲存庫共同攜帶的規則

[設定文件](https://code.claude.com/docs/en/settings)把 `.claude/settings.json` 定位為可提交的團隊設定，`.claude/settings.local.json` 則是個人專案設定。官方目前明載：Claude Code 首次在 Git 儲存庫寫入尚未被忽略的 local 檔案時，會把 `**/.claude/settings.local.json` 加入全域忽略檔；若全域設定的 `core.excludesFile` 為絕對路徑或以 `~` 開頭，就使用該檔，否則走 XDG 路徑或 `~/.config/git/ignore`。若是手動建立、尚未由 Claude Code 寫入，須自行補忽略。

[Git 文件](https://git-scm.com/docs/gitignore)說明，儲存庫的 `.gitignore` 與個人機器的全域忽略檔是不同來源；忽略只對未追蹤檔案有效，已追蹤的檔案不受影響。

由此可推得兩種失效條件。第一，另一台機器不會因為 clone 專案，就自動取得原機器的全域規則；但若 Claude Code 隨後寫檔，也可能建立當地的忽略規則，不能把跨機直接寫成必然外洩。第二，若檔案早已進入版本追蹤，事後有忽略規則也不能阻止其繼續被提交。

因此不能說 Claude Code 完全沒有忽略保護，也不能僅憑今天文件的內容，斷言它因這份研究才更新；本文沒有能證明更新因果的時間紀錄。

## 改掉明文參數，不要順手放大允許範圍

依上述資料流，降低風險的方向是避免把秘密字面值放進會被保存的命令，而不是把允許清單改成任何 Bash 都能執行。[權限文件](https://code.claude.com/docs/en/permissions)中的萬用字元會改變匹配範圍；窄規則與全面放行不是等價替代品。

以環境變數名稱代替字面值，只能減少某些記錄直接包含秘密的機會，不等於建立秘密保管庫。程序環境、日誌或展開後輸出仍可能成為其他曝露面；本篇沒有實測各種 shell、記錄器與命令展開的組合。實際處理時，應先確認秘密由誰注入、哪裡會被記錄，再決定是否值得永久核准，不能只確認畫面上不再顯示明文。

## 自有儲存庫怎麼查，已外露又該先做什麼

以下僅供自有或獲授權的儲存庫唯讀檢查，本文未執行。三行分別查看是否受追蹤、哪條忽略規則會匹配，以及可達歷史中是否出現該路徑；它們不是完整憑證掃描，也不應把檔案內容貼到公開討論串。

```bash
git ls-files --error-unmatch .claude/settings.local.json
git check-ignore -v --no-index .claude/settings.local.json
git log --all --format='%h %ad %s' --date=short -- .claude/settings.local.json
```

判讀時不能只看第二行。忽略規則存在與檔案已被追蹤可以同時成立；第一行若列出檔名，就要處理追蹤狀態。Git 文件所述的 `git rm --cached` 是移出索引，不是抹除歷史；執行這類修改前，仍應確認團隊需要保留哪些設定。

若已確認秘密外露，[GitHub 官方處理指引](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)要求先撤銷或輪替，再評估是否清理歷史。刪除目前版本的檔案，不能收回別人的 clone、fork 或其他副本；重寫歷史還需要協調協作者，避免舊副本把資料推回來。憑證失效與資料清除是不同驗收項目，應分別處理。

## 來源

- 官方文件：[Claude Code — Settings files and precedence](https://code.claude.com/docs/en/settings)（2026-11-08 查閱）
- 官方文件：[Claude Code — Configure permissions](https://code.claude.com/docs/en/permissions)（2026-11-08 查閱）
- 官方文件：[Git — gitignore](https://git-scm.com/docs/gitignore)（2026-11-08 查閱）
- 官方文件：[GitHub — Removing sensitive data from a repository](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)（2026-11-08 查閱）
- 原文：[Apiiro 研究](https://apiiro.com/blog/coding-agents-leaking-secrets-github-dont-ask-again)（2026-11-08 查閱；資料蒐集期為 11 月 1 至 3 日）
