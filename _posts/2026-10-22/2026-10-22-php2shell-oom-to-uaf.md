---
layout: post
title: "【深度分析】PHP2Shell：一個 OOM 為什麼會變成跨請求的 use-after-free"
date: 2026-10-22 10:00:00 +0800
categories: [llm, ai, deep-analysis]
image: /assets/images/2026-10-22/php2shell-oom-to-uaf.jpg
---

![hero]({{ site.baseurl }}/assets/images/2026-10-22/php2shell-oom-to-uaf.jpg)

PHP 在 10 月 21 日 14:00 UTC 發布 8.5.12、8.4.27、8.3.36、8.2.35，修掉兩個未驗證身分的遠端程式碼執行漏洞。這兩個漏洞不在任何應用程式裡，在 PHP 執行環境本身——網站自己的程式碼寫得再乾淨，只要在跑 PHP，就在風險範圍內。

公告的技術描述很短，容易被二手報導帶偏。關鍵是：**這不是 session 功能的漏洞，是 Zend 引擎在記憶體耗盡時做錯了一件事。** 要講清楚這件事，最好的材料不是新聞稿，是修補 commit 本身。

## 先給可操作的部分

| 分支 | 受影響 | 修補版本 |
|---|---|---|
| 8.5 | < 8.5.12 | 8.5.12 |
| 8.4 | < 8.4.27 | 8.4.27 |
| 8.3 | < 8.3.36 | 8.3.36 |
| 8.2 | < 8.2.35 | 8.2.35（2026-12-31 EOL） |

8.1 以前官方不再提供更新，只能在 7.4／8.0／8.1 分支自行取用官方放出的原始碼 backport，或等發行版與 LTS 廠商。受影響的部署型態包含 PHP-FPM、Apache mod_php、php-cgi、FrankenPHP、LiteSpeed——官方明說，**只有更新是完整修補**，設定調整只是擋掉特定路徑。

兩個 CVE 都是 CVSS v4.0 9.2：`CVE-2026-109618`（OOM 造成的狀態損毀）與 `CVE-2026-109619`（殘留的全域狀態）。揭露過程本身也是一則故事：10 月 20 日有人在 Hacker News 貼文說兩個 PHP RCE 將於 10 月 22 日揭露，官方當晚發出預告並把發布提前一天。修補 commit 更早——10 月 18 日 15:26 UTC 就已經在公開 repo 上。

## 修補 diff 才是主文

commit `01a40e89fbfc499936e3b05888d8f00bfde886df`，作者 Arnaud Le Blanc 與另外四位維護者，訊息只有三行：

```
Avoid state corruption via bailout
- Replace bailout on OOM with UnwindExit
- Properly reset various globals that may be accessed during startup
```

統計數字比訊息更能說明問題：**300 個檔案、+10,759 / −988 行，其中 206 個 `.phpt`、196 個是新增的 `oom_*` 測試。** 如果這只是「加一個檢查」，diff 不會長這樣。這是一次錯誤處理模型的替換。

### 舊模型：longjmp 跳出去

PHP 傳統上用 bailout 處理 OOM——一個 `longjmp()`，直接從配置失敗的那一點跳離當前請求。快，但代價是：**跳出去的時候，清理流程仍然會走完，而它面對的是被中斷在中途的資料結構。**

`CVE-2026-109618` 就是這個：某些情境下，請求記憶體在完成初始化之前就已經可達；若此時任何配置失敗，PHP 沒有正確記帳這次提前退出，留下無效狀態，隨後的清理把無效資料當成有效資料處理。公告指出，這個入口就在 **multipart body 解析**，而且在 Apache mod_php 上，整件事發生在任何應用程式碼開始執行之前。

### 新模型：OOM 變成可檢查的條件

修補把 OOM 從「非同步跳躍」改成「有狀態、可檢查的延遲錯誤」。`Zend/zend_alloc.c` 的改動是整個模型的核心：

- 新增 `ZEND_HAS_OOM()` 與 delayed OOM 狀態。配置失敗不再立刻跳出，而是把 OOM 記進 `EG(delayed_oom)`，並設定 `vm_interrupt`。
- 原本直接 `zend_bailout()` 的路徑換成 `zend_mm_delayed_verror()`：先記錄訊息、檔名、行號，標記為 pending，讓引擎在可預期的位置處理。
- 新增 `fallible` 堆積模式：配置可以「乾淨地失敗」，呼叫者**必須**檢查回傳值，而不是被一個看不見的跳躍打斷。
- OOM 改用 `UnwindExit`，讓解構子與清理流程真的跑完。

### 解析器端：每個註冊步驟都要回報

`main/rfc1867.c` 的改動最能看出「為什麼需要 196 個新測試」。修補把一整排函式的回傳型別從 `void` 改成 `bool`：

```c
-static void safe_php_register_variable(...)
+static bool safe_php_register_variable(...)
 {
     if (override_protection || !is_protected_variable(var)) {
         php_register_variable_safe(var, strval, val_len, track_vars_array);
     }
+    return !ZEND_HAS_OOM();
 }
```

同一個模式套用到 `add_protected_variable`、`safe_php_register_variable_ex`、`register_http_post_files_variable`、`register_http_post_files_variable_ex`。呼叫端在每個註冊步驟之後檢查，一發現 OOM 就 `goto oom` 做局部清理，而不是讓一個 longjmp 從中間穿過去。

另外兩處也值得記下來：

- `fill_buffer()` 新增 `post_max_size` 的即時檢查，避免只在進入時檢查一次。
- multipart header 解析收斂：只保留 `Content-Disposition` 與 `Content-Type`，忽略重複的 header。原本每個 header 都會 `estrdup` 進一份 list——那本身就是一條放大路徑。

### 196 個 `oom_*` 測試是觸發面地圖

新增測試的命名直接標出維護者擔心哪些入口：`oom_array_fill_*`、`oom_array_pad_*`、`oom_json_decode_*`、`oom_SplFixedArray_*`、`oom_debug_backtrace_*`、`oom_exception_trace`、`oom_interrupt_unfinished_call_frame`……還有一整組 `tests/basic/oom_rfc1867_*.phpt`，專門打 multipart 解析。

那組測試的註解寫得很直白：每個測試都對 php-cgi 送出 multipart body，配一個**很小的 `memory_limit`**，並把其他輸入上限全部拉高，讓「只有記憶體上限在限制解析器累積什麼」。它們逐一測試：巨大的欄位名稱、巨大的陣列上傳名稱、大量檔案 part、在 `$_FILES` 註冊的每一步剛好撞到上限、超長檔名落在 `[full_path]`、header 續行、超長 header 行、header 數量。這是公開的、可稽核的觸發面清單。

`CVE-2026-109619` 則是另一條路：PHP 有各種全域狀態（error、session、object、extension）由 worker 持有、卻指向屬於單一請求的記憶體。某些在「下一個請求初始化之前」執行的操作，會存取到那份已經釋放的狀態——形成 use-after-free（CWE-416）。成立條件明確：需要一個請求留下殘留狀態，加上**後續請求落在同一個 worker** 上。官方確認兩條路徑：PHP 8.5 的 `fatal_error_backtraces`，以及預設開啟的 session upload progress。

## 已驗證到什麼程度

這一節要逐項標記，不能混用：

- **mod_php、CVE-2026-109618：官方驗證完整 RCE。** 使用預設的 PHP 輸入與記憶體上限，單一未驗證請求即可觸發，且在應用程式碼之前。
- **PHP-FPM、CVE-2026-109618：source analysis 認為可受影響，沒有展示的 exploit。**
- **FrankenPHP：官方認為可能（likely）；LSAPI：可能但未驗證。**
- **CVE-2026-109619：mod_php（PHP 8.5 且開啟 `fatal_error_backtraces`）與 session upload progress 路徑（mod_php 與 FPM）皆已確認。** FPM 那一條官方註明「取決於應用程式是否有合適的操作」。
- **在野利用：截至 10 月 21 日沒有確認的案例。** 有研究者公開說看到攻擊嘗試，也有多個未經查證的 PoC repo，但「有 PoC」不等於「有人在打」。漏洞也還沒進 CISA 的 Known Exploited Vulnerabilities 清單。

## 我自己在隔離環境跑了什麼

我沒有寫利用程式，也不會把「觸發 OOM」講成 RCE。這三個等級不能互相冒充：**觸發異常 → 觀察到記憶體錯誤 → 達到 RCE**。以下只做到第一項。

環境是一對固定版本：`8.4.26` 與修補後的 `8.4.27`，分別以 `php-cgi`（短生命週期）、`php -S` 與 Apache mod_php（長生命週期）執行。容器一律 `--network none`、記憶體上限、lab 目錄唯讀掛載、跑完即刪。body 的形狀取自上游新增的那幾個 `oom_rfc1867` 測試。

**確認的觀察**

在 mod_php 上送出一個 6,291,580 bytes 的 multipart body（`post_max_size` 設為 1G，所以大小完全在允許範圍內），`memory_limit=8M` 之下回應是：

```
Fatal error: Allowed memory size of 8388608 bytes exhausted
(tried to allocate 2098791 bytes) in Unknown on line 0
```

`in Unknown on line 0` 是重點：**OOM 發生在腳本被執行之前**，目標腳本一個字都沒輸出。這與公告說「在任何應用程式碼開始執行前」一致，也在 CGI、cli-server、mod_php 三種 SAPI 都重現。

**沒有觀察到的**

- 沒有狀態損毀、沒有跨請求殘留、沒有記憶體洩漏、沒有 RCE。
- `8.4.26` 與 `8.4.27` 在我跑過的所有形狀、以及所有堆積填充量（200–1400 KB）下**沒有任何行為差異**：HTTP 狀態、worker 存活、第二次請求的結果、segfault 計數全部相同。
- 原廠 limits（`memory_limit=128M`、`post_max_size=8M`）之下，7.82 MiB／60,000 個 part 的 body 反而**進得到應用程式層**，沒有 OOM。
- 而且 PHP 8.4 的 `max_multipart_body_parts` 預設是 **1020**，超過直接報 `Multipart body parts limit exceeded 1020`。「用大量 part 撐爆記憶體」這條路在原廠設定下本來就有上限。

換句話說：**OOM 確實可以在請求解析階段被觸發，但從那裡走到記憶體損毀，需要遠比「讓一次配置失敗」精確的堆積安排。** 我沒有做到，也不假裝做到。掃描的輸出、腳本與方法論都放在 [deep-dive-code](https://github.com/chengwulongxia-rgb/deep-dive-code/tree/main/php2shell-oom-to-uaf)。

過程中踩到的兩個方法論陷阱值得記下來，因為它們會直接製造假結果：**第一，client 會繼承 server 的 ini**——把 mod_php 的 `memory_limit` 寫進 `conf.d/`，同一個容器裡負責發請求的 PHP CLI 也讀同一份，結果是 *client* 先 OOM，看起來像 server 的錯誤，實際上請求根本沒送出去。修法是 client 一律 `php -n`。**第二，CGI 模式看不出跨請求問題**——每個請求都是新程序，前一次 bailout 留下的狀態沒有機會被下一個請求讀到，只用 CGI 測會得到「兩版一樣」的結論，而那個結論沒有意義。

## 防守

更新是唯一完整修補。以下是官方列出的部分緩解，**它們只是擋掉特定路徑，不等於安全**：

**對 CVE-2026-109618**

- `memory_limit=-1`，設在應用程式改不動的地方：FPM pool 或 Apache 設定的 `php_admin_value`。要確認沒有 pool、目錄或應用程式設定又把上限放回去。
- 調低 `post_max_size`（沒有上傳功能 8M、有上傳 32M），並讓 `upload_max_filesize` 低於它。
- 在網頁伺服器或 proxy 層限制**解碼後**的請求大小、欄位數、multipart part 數、header 數與巢狀深度；這些限制必須涵蓋沒有可用 `Content-Length` 的請求。
- 用容器或 cgroup 記憶體上限，最好只殺掉受影響的 worker。**不要用 `RLIMIT_AS` 或 `RLIMIT_DATA` 當替代**——官方警告它們可能觸發同一條有問題的配置失敗路徑。

**對 CVE-2026-109619**

- `session.upload_progress.enabled=0`，寫在 php.ini、FPM pool 或伺服器設定，然後**重啟每一個 worker**。`ini_set()` 與 FPM 的 `.user.ini` 都不夠早。
- PHP 8.5 另設 `fatal_error_backtraces=0`，同樣要重啟 worker。
- 移除會在初始化前發出診斷訊息的無效／已棄用 per-request 設定；用 `error_reporting`、`display_errors` 或 `@` 把它藏起來沒有用。
- 修掉攻擊者可觸及的 fatal error 與執行逾時，包括 callback、上傳或匯入處理、清理流程裡的失敗。

**偵測面的最低要求**：先確認實際生效的版本與 SAPI——`php -v` 只告訴你 CLI 的版本，FPM pool 與 Apache 模組可能各自不同。然後在 access log 裡找「同一個 worker 連續處理大量超大 multipart POST、且回應是 5xx 或連線中斷」的模式。這次修補的另一個副作用是：**196 個新增的 `oom_*` 測試本身就是防禦資產**，它們是可執行的回歸檢查，能在自己的建置流程裡跑。

如果一時無法更新，先評估曝險：這個漏洞在任何應用程式碼之前就會被觸發，所以「網站有登入保護」「應用程式邏輯很單純」都不構成緩解。公告推薦的做法很直接——**不能更新的伺服器，就關掉它。**

## 來源

- [PHP 8.5.12 / 8.4.27 / 8.3.36 / 8.2.35 安全發布](https://www.php.net/archive/2026.php#2026-10-21-5)（PHP Group, 2026-10-21）
- [GHSA-w8hw-w9fx-j79w／CVE-2026-109618](https://github.com/php/php-src/security/advisories/GHSA-w8hw-w9fx-j79w)、[GHSA-6wmf-4rv5-p3rp／CVE-2026-109619](https://github.com/php/php-src/security/advisories/GHSA-6wmf-4rv5-p3rp)（GitHub Security Advisory）
- 修補 commit：[`01a40e89fbfc499936e3b05888d8f00bfde886df`](https://github.com/php/php-src/commit/01a40e89fbfc499936e3b05888d8f00bfde886df)（php/php-src, 2026-10-18）
- [Oct 21 Advisory: PHP Unauthenticated Remote Code Execution](https://censys.com/advisory/cve-2026-109618-cve-2026-109619)（Censys——已驗證／可能／未驗證的 SAPI 分項）
- [Rapid Response: php2shell](https://huntress.com/blog/php2shell-leaked-critical-php-vulnerabilities)（Huntress——時間線與在野狀態）
- [PHP Security Releases Fix Two Critical RCE Vulnerabilities](https://laravel-news.com/php-critical-rce-security-releases)（Laravel News——緩解清單整理）
- 本專案實驗：[deep-dive-code/php2shell-oom-to-uaf](https://github.com/chengwulongxia-rgb/deep-dive-code/tree/main/php2shell-oom-to-uaf)
