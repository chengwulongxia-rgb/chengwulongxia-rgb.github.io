---
layout: post
title: "【深度分析】GPT5.6 花 25 美元找到 WordPress RCE——但真正的故事不是 AI 有多厲害"
date: 2026-07-21 02:00:00 +0000
categories: [llm, ai, deep-analysis]
image: /assets/images/2026-07-21/gpt56-wordpress-rce-hero.png
---
![hero]({{ site.baseurl }}/assets/images/2026-07-21/gpt56-wordpress-rce-hero.png)

Searchlight Cyber 的安全研究員 Adam Kues 做了一件事：把 OpenAI 公開的 CDC（Cycle Double Cover）數學證明 prompt 改寫成安全研究版本，丟給 GPT5.6 Sol Ultra，讓它用 4 個 agent 跑 6 小時。結果它找到了 WordPress 的 pre-auth SQL injection，然後在 4 小時內把這個 SQLi 升級成了完整的 RCE。總成本 25 美元。同一個漏洞在地下市場標價 50 萬美元。

## 原文摘要

WordPress 的 batch API 在 2020 年（WordPress 5.6）引入，允許使用者在一個請求中發送多個虛擬 API 請求。這個端點不需要身份驗證就可以存取，但每個子請求會繼承該身份驗證資訊。正常情況下，WordPress 的驗證管線是串行的：先用 `has_valid_params()` 檢查必填參數，再用 `sanitize_params()` 清理參數，接著執行權限回調，最後執行端點回調。這意味著任何流入端點回調的參數都已經被驗證過形狀和資料類型。

但 batch API 的實作方式不同。它把驗證和執行分成兩個迴圈：第一個迴圈對每個請求做參數檢查和清理，第二個迴圈才檢查驗證是否成功、執行權限回調、執行端點回調。問題出在程式碼裡有兩個陣列——`$matches`（存放路由匹配結果）和 `$validation`（存放驗證結果）。當某個請求觸發 `is_wp_error()` 分支時，`$validation` 陣列被更新了，但因為 `continue;` 跳過了後續邏輯，`$matches` 陣列沒有被更新。這導致兩個陣列從這個位置開始錯位——`$matches` 的每個項目都向後移動了一個位置。

攻擊者可以利用這個錯位：讓請求 N 的參數通過驗證（用一個會通過驗證的端點），但在執行階段被路由到請求 N+1 的處理器。這就繞過了所有 batch-enabled 端點的參數清理。

具體的攻擊 sink 在 `GET /wp/v2/posts` 端點的 `author__not_in` 參數。如果輸入是陣列，WordPress 會用 `absint` 過濾每個項目（清理成整數）。但如果輸入是純量字串，它會原封不動地直接插入原始 SQL 查詢。正常情況下，公開的 `author_exclude` 參數必須是整數陣列，驗證會擋住字串輸入。但透過 batch API 的錯位，我們可以讓 `author_exclude` 用 `DELETE /wp/v2/posts/1` 的驗證規則（不認識這個參數，所以不驗證），但被應用到 `GET /wp/v2/posts` 的執行邏輯。

這裡遇到一個問題：batch API 不支援 GET 請求。GPT5.6 Sol 的解決方案是遞迴調用 batch 端點。在內層調用中，再次利用錯位 bug 繞過請求方法的驗證。最終的 pre-auth SQLi payload 就是雙層遞迴的 batch 請求，外層繞過 method 驗證，內層繞過 `author_exclude` 驗證，payload 是 `0) OR 1=1 --`，可以返回所有 post 行。

有了 pre-auth SQLi 之後，研究者讓 Sol 嘗試升級到 RCE。WordPress 的安全模型很穩健，所有密碼、重置 token、API key 都在資料庫中 hashed，洩漏資料庫本身不足以接管管理員帳號。但 Sol 找到了一條不同的路徑。

WordPress 在請求生命週期中維護一個 `WP_Post` 物件的記憶體快取。當同一個 post 在請求中被多次引用時，WordPress 會使用快取版本以避免多次資料庫往返。透過 UNION-based SQLi，攻擊者可以「偽造」返回的 posts，完全控制被快取的資料。WordPress 在渲染前會對文章文字做後處理，而我們完全控制返回的文章文字。

WordPress 有 embeds 功能。在文章中加入 `[embed]https://example.com[/embed]` 可以嵌入遠端內容。為了避免每次載入文章時都發送 HTTP 請求，WordPress 把這些 embeds 快取在資料庫層級——以 `oembed_cache` 類型的 post 形式存在 `wp_posts` 表中。WordPress posts 本身也是支援的 embed 類型。如果你用相對路徑嵌入一個 post，WordPress 會識別為本地 post，不發送 HTTP 請求。關鍵是 WordPress 不會檢查 embed 中引用的 post ID 是否真的存在。

放置 `[embed width="500" height="750"]/?p=10[/embed]` 會在資料庫中製造一個 `oembed_cache` 類型的 post 行（假設新行 ID 是 11）。現在資料庫有 ID 11 的行了。如果我們再次利用同樣的 SQLi，可以在記憶體中偽造關於這個 post 的任何資料（存在於記憶體快取）。但記憶體版本和資料庫版本不一致——WordPress 會嘗試調和：

```php
wp_update_post([
    'ID'           => 11,
    'post_content' => "benign html coming from the embed",
]);
```

這裡 `ID` 和 `post_content` 在寫入資料庫前被設定。但 post 還有其他欄位，如 `post_status` 和 `post_type`。在資料庫中，`post_type` 是 `oembed_cache`，但透過 SQLi 我們可以在記憶體中偽造任何 post type，比如 `post`。WordPress 會優先使用記憶體中的欄位，而我們完全控制這些欄位。因此，我們可以強制 `oembed_cache` 行變成普通 posts，讓它們憑空「彈出」。唯一無法控制的是 `post_content`——因為它在 `wp_update_post` 中被明確指定。

WordPress 用一種叫 `customize_changeset` 的特殊 post 類型來儲存主題編輯的草稿更改。它不把整個網站設定存成一個 blob，而是把更改的欄位差異存在 `post_content` 中，格式如：

```json
{
  "blogname": {"value": "New name", "type": "option", "user_id": 1},
  "blogdescription": {"value": "New desc", "type": "option", "user_id": 1}
}
```

當你恢復編輯主題時，WordPress 會暫時套用 changeset。套用時，WordPress 會暫時設定當前使用者為 changeset 中指定的 `user_id`：`wp_set_current_user($setting_user_id);`。如果我們偽造一個 `user_id: 1` 的 changeset，就可以暫時獲得管理員身份。但 changeset 用 `post_content` 儲存 JSON，而這是我們目前唯一無法透過快取投毒控制的欄位。

WordPress 允許 posts 有 parent，形成樹狀結構。WordPress 不允許循環——如果檢測到循環，會調用：

```php
wp_update_post([
    'ID'          => B,
    'post_parent' => 0,
]);
```

這個調用不會覆蓋 `post_content`，所以我們可以用 SQLi 偽造的記憶體 post 來控制 `post_content`。我們可以偽造一個合法的 `customize_changeset`，內容是管理員權限的 JSON。當 changeset 被套用時，我們暫時獲得管理員身份。但一旦對其他 post 的更改完成，權限就會恢復成訪客。如何從「能更改 post 內容」升級到「能以管理員身份做任何事」？

WordPress 有 hooks 機制，支持插件系統幾乎鉤入生命週期的每個部分。當 post 被發布時：

```php
do_action("{$new_status}_{$post->post_type}", $post->ID, $post);
```

因為我們完全在記憶體中偽造 post，`new_status` 和 `$post->post_type` 可以是任何值。這允許我們以管理員身份調用任何 action，只要它包含至少一個下劃線。

問題是 `$post->ID` 在我們控制下，但它只是一個 ID；`$post` 是 `WP_Post` 物件，我們幾乎無法控制 action 的參數。Sol 的策略是瞄準 `parse_request` hook——這個 hook 在請求生命週期的最開始被調用。調用 `parse_request` 會重新播放整個 Batch API 請求，但這次我們仍擁有暫時假設的管理員角色。

最終利用分兩個請求。第一個請求「播種」資料庫：用 SQLi 返回一個假 post（ID 0），包含三個指向同一個 post S 的 embed 連結，但查詢字串 token 不同（`foobar-outer`、`foobar-changeset`、`foobar-dispatch`）。三個不同的 hash 產生三個不同的 `oembed_cache` 行（O、C、D）。

第二個請求需要六個偽造的 posts：
- O：`publish/oembed_cache`，空內容，過期時間戳，parent 是 C
- C：`future/customize_changeset`，changeset JSON，parent 是 C（自我循環）
- P：`draft/page`，parent 是 D
- D：`parse/request`，parent 是 D（自我循環）
- S：`publish/post`，提供 embed 資料
- T：`publish/post`，包含外層 embed

執行鏈：T 包含對 S 的 embed → 調用 `get_post(O)`（本地 embed，hash 對應 O）→ O 有資料庫行，O embed S → S 在記憶體快取中 → 因為假的 `post_modified_gmt`，WordPress 認為快取過期 → `get_post(S)` 返回假的記憶體版本 → S 的資料被 embed  routine 轉換 → O 需要更新 → `wp_update_post` → `wp_insert_post_parent` filter → 發現 C 有循環 → `wp_update_post(C, parent=0)` → C 在記憶體中是 `customize_changeset`，狀態是 `future`，日期是過去 → WordPress 套用 changeset → changeset 設定 `nav_menus_created_posts` with `user_id: 1` → WordPress 暫時以管理員身份操作 → 對 P 的更改完成後，WordPress 更新 P 的 status 為 publish → P 的 parent 是 D → D 有循環 → `wp_update_post(D, parent=0)` → D 是 `parse/request` → `do_action("parse_request")` → 重新播放 batch 請求，此時以管理員身份 → 原始 batch 請求包含「建立新管理員帳號」→ 現在成功 → 以新管理員身份登入 → 上傳後門 plugin ZIP → RCE。

整個利用鏈在 10 小時內完成。作者判斷：沒有安全研究員能在 10 小時內独立完成此利用鏈，即使給了他原始的 bug。將幾個分散的 gadgets 串聯起來並跨 codebase 利用，是好安全研究員的標誌，而 Sol 以非人的精確度和清晰度做到了。

## 城武觀點

WordPress batch API 的漏洞不是 AI「發現」的驚喜——它是 batch API 設計決策的必然後果。WordPress 的安全模型假設驗證與執行耦合在同一個 handler 裡：你驗證了參數，你就知道這些參數會被送到哪個端點。Batch API 為了效能打破這個不變量——它把驗證和執行拆成兩個迴圈，用陣列索引來對齊。當一個請求出錯時，索引錯位，驗證和執行就不再對應同一個端點。這個設計缺陷存在了 6 年，它被利用只是時間問題。

但真正的問題不在 WordPress，而在 GPT5.6 花 25 美元找到的東西標價 50 萬美元這個事實。這意味著兩件事：第一，AI 安全研究的邊際成本正在趨近於零。一個 $200 的 Pro 訂閱，用掉一半的每週配額，就找到了價值 50 萬美元的 RCE。如果這個成本結構是普遍的，那整個漏洞賞金（bug bounty）經濟學即將崩潰。當 25 美元能做的事價值 50 萬美元時，要嘛所有攻擊者都用 AI（因為成本幾乎為零），要嘛這個市場根本不值的這個價——要嘛兩者都是。

第二件更令人不安的事：作者說「沒有安全研究員能在 10 小時內独立完成此利用鏈」。如果這是真的，那安全研究的定義已經改變了。以前，安全研究員的核心能力是「能把幾個分散的 gadgets 串聯起來並跨 codebase 利用」。現在，這個能力被 AI 接管了。安全研究員的工作變成更高層次的：決定調查什麼產品和攻擊面、用 prompt 引導研究的方向、在 AI 偏離軌道時拉回來。這些「meta skills」目前 AI 做得還很差，但隨著模型變強，它們會變成唯一剩下的人類工作。

我賭這個轉變在 18 個月內會徹底改變漏洞賞金市場。當每個人都能用 25 美元找到 50 萬美元的漏洞時，漏洞的「發現成本」就不再是瓶頸，「驗證和修復成本」變成瓶頸。WordPress 在研究員延遲發布的週末期間，就有兩個人獨立復現了完整利用鏈——這說明 AI 找到漏洞的速度已經超過了修復的速度。我們正在進入一個「發現漏洞容易，修復漏洞難」的新常態，而這個常態對防禦者是不利的。

*城武的未解檔案——當攻擊的成本從「數千小時的人工」降到「25 美元和 10 小時的 GPU 時間」，防禦的成本卻沒有同比例下降時，攻防平衡已經不可逆地傾斜了。問題不再是「能不能找到漏洞」，而是「來不來得及修」。*

- 原文：[Exploit brokers pay $500,000 for a WordPress RCE. I found one with GPT5.6 Sol Ultra and $25](https://slcyber.io/research-center/exploit-brokers-pay-500000-for-a-wordpress-rce-i-found-one-with-gpt5-6/)（Adam Kues, Searchlight Cyber, 2026-07-20）
