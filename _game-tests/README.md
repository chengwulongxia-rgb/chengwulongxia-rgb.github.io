# 連線井字棋

## 跑酷工坊目前的瀏覽器測試

工坊已加入必經的公共搶選階段，請執行：

```sh
node _game-tests/workshop-draft-browser.cjs
node _game-tests/workshop-draft-full.cjs
```

前者驗證三人搶同張卡、重選、逾時分配、指定道具建造與鍵盤通關；後者驗證容量、斷線、完整六回合與重賽。兩者支援 `GAME_URL` 指向部署後 HTTPS。純規則測試仍用 `node --test _game-tests/*.test.mjs`。

`workshop-{browser,desktop,full,mechanics-browser}.cjs` 是搶選機制加入前的歷史測試，假設能自由選所有道具，並非目前版本可執行的驗收入口；目前驗收以以上兩支 draft 測試為準。`workshop-keyboard.cjs` 為共用真實鍵盤路線 helper。

獨立靜態頁面：`/games/tic-tac-toe/`。沒有 Jekyll front matter、部落格 layout、帳號或自架後端。

## 執行與測試

在 repo 根目錄執行：

```sh
node --test _game-tests/*.test.mjs
python3 -m http.server 8765 --bind 127.0.0.1
```

瀏覽 `http://127.0.0.1:8765/games/tic-tac-toe/`，建立房間，將連結貼到另一個瀏覽器分頁／裝置。同機測試的 localhost 連結不能用於另一台裝置；正式部署後分享網站的 HTTPS 連結。

自動瀏覽器測試（另一個 terminal，HTTP server 必須仍在執行）：

```sh
npm install --prefix /tmp/ttt-browser playwright@1.58.2
/tmp/ttt-browser/node_modules/.bin/playwright install chromium
node _game-tests/browser.cjs
node _game-tests/browser-protocol.cjs
```

測試使用真正的公共 PeerJS 訊號服務與 WebRTC，沒有 mock multiplayer。需要網路，公共服務不可用或 NAT 不相容時測試可能失敗。瀏覽器測試涵蓋兩頁同步、X 獲勝、雙方同意重賽、第三人房間已滿、斷線鎖盤、390px 無水平溢出、剪貼簿失敗的手動複製提示；另一測試使用惡意 guest 的實際 data channel 驗證任意棋盤訊息、錯誤回合、非整數、重播、舊局及額外欄位被拒絕。

`_game-tests/` 以底線開頭，依 Jekyll 預設不發佈；遊戲目錄僅包含執行資產與第三方授權。未修改 `_config.yml`。既有 `_site_test` 不應刪除。

## 協定與限制

- 房主用 `crypto.getRandomValues` 產生 128-bit 隨機 peer ID，分享 URL fragment。房主 X 先手，訪客 O。
- 房主維護權威棋盤。訪客只能發送 `{v:1,type:'move',round,revision,index}` 或 `{v:1,type:'rematch',round,revision}`；型別、精確欄位、局次、revision、回合與格子均驗證。訪客傳送 `state` 不會修改房主棋盤。
- 每次落子或第一次重賽同意使 revision 增加；只有終局後雙方同意才清空棋盤並增加 round。舊局、舊 revision、重複同意拒絕。
- 訪客驗證收到棋盤的資料結構與基本可達性，忽略舊 snapshot。UI 不樂觀落子，等房主確認；10 秒沒有確認就停止。
- 房間限一個訪客。30 秒連線／握手逾時、資料通道關閉、訊號服務斷線或 20 秒無 heartbeat 回應均停止對局。停止後只能新房間，不能恢復舊局。
- 房主仍然能修改自己的程式；這不是防作弊服務，也不驗證任何人身分。房間連結持有者可加入。WebRTC 不等於匿名，可能揭露網路位址；訊號服務接觸連線資訊。
- 使用 PeerJS 預設公共 broker 與 ICE 設定；沒有自行提供 TURN。嚴格 NAT、VPN、防火牆、手機休眠及公共服務中斷可能使連線失敗。本機雙頁成功不代表跨網路一定可連。

## 第三方來源

PeerJS **1.5.5**, npm 官方 registry 的 `peerjs` 套件：

- metadata: `https://registry.npmjs.org/peerjs/1.5.5`
- tarball: `https://registry.npmjs.org/peerjs/-/peerjs-1.5.5.tgz`
- npm metadata `dist.integrity`: `sha512-viMUCPDL6CSfOu0ZqVcFqbWRXNHIbv2lPqNbrBIjbFYrflebOjItJ4hPfhjnuUCstqciHVu9vVJ7jFqqKi/EuQ==`
- 下載後驗證完整 tarball SHA-512 與 `package.json` 的 name/version，再複製原始 `dist/peerjs.min.js`（未修改）及 MIT LICENSE 到 `games/tic-tac-toe/lib/`。

網站不需 CDN 載入 JS、不需 Node build；只需要靜態檔案以及可用的公共 broker/WebRTC 網路。
