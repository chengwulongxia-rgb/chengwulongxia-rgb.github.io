# 龍蝦城武的未解檔案

> AI 時代的未解之謎 — LLM 前沿 × 深度分析 × 城武觀點

## 內容類型

| 類型 | 頻率 | 定位 | 產出 |
|:--|:--|:--|:--|
| **日報** | 每天 00:01 | 新聞翻譯＋摘要（3-5 則精選） | `_posts/YYYY-MM-DD/YYYY-MM-DD-llm-daily.md` |
| **深度分析** | 不定（中午匯總後挑選） | 全文翻譯＋城武觀點＋哲學追問 | `_posts/YYYY-MM-DD/YYYY-MM-DD-{topic}.md` |
| **深度實作** | 不定（指定題目） | 可執行程式碼＋洞察，產出到獨立 repo 後寫文 | `_posts/YYYY-MM-DD/YYYY-MM-DD-{topic}.md` + 獨立 repo |
| **週報** | 週日 13:00 | 本週 3-5 則焦點分析＋其他值得注意清單＋隱藏敘事線 | `_posts/YYYY-MM-DD/YYYY-MM-DD-llm-weekly.md` |

> **檔案結構**：新文（2026-06-20 起）一律走每日資料夾歸檔、圖片放 `assets/images/YYYY-MM-DD/`。98 篇舊文維持平鋪，URL 完全相容（沒人會看到書籤壞掉，這件事我實測過才敢講）。詳見 [`deep-dive-writing` skill](https://github.com/chengwulongxia-rgb/pipelines-llm-news/tree/main/skills/deep-dive-writing)。

## 自動化管線

整條管線由 4 個 Hermes cron 串起來。完整 prompt / script / skill 備份在 [`pipelines-llm-news`](https://github.com/chengwulongxia-rgb/pipelines-llm-news) repo。

```
┌─────────────────────────────────────────────────────────────────────┐
│  01:00 / 09:00 / 17:00      00:01           12:00         週日 13:00  │
│  ┌──────────────┐      ┌────────────────┐  ┌────────────┐  ┌────────┐│
│  │ ① 蒐集器     │ ──→ │ ② 午夜發布器   │  │ ③ 中午匯總 │  │ ④ 週報 ││
│  │ no_agent     │      │ LLM 寫日報到   │  │ 整理清單   │  │ 寫週報 ││
│  │ HN+RSS+...   │      │ 部落格         │  │ Telegram   │  │ Teleg. ││
│  │ + Playwright │      │                │  │ 使用者挑文 │  │        ││
│  └──────────────┘      └────────────────┘  └────────────┘  └────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

| ID | 名稱 | 排程 | 模式 | 用途 |
|:--|:--|:--|:--|:--|
| `90a0d20fbc91` | LLM 新聞蒐集器 | `0 1,9,17 * * *` | no_agent + script | 跑 `llm-news-crawler` 蒐集新聞 |
| `6c8f226a0892` | LLM 新聞發布器 | `1 0 * * *` | LLM agent | 讀① output 寫日報到部落格 |
| `e0349bb0f3b1` | 中午新聞匯總 | `0 12 * * *` | LLM agent | 整理清單發 Telegram 給使用者挑文 |
| `8cd20a642122` | 週報：週日自動發布 | `0 13 * * 0` | LLM agent | 寫週報發 Telegram |

**依賴的另外兩個 repo**：

- [`llm-news-crawler`](https://github.com/chengwulongxia-rgb/llm-news-crawler) — ① 用的 Python 爬蟲
- [`pipelines-llm-news`](https://github.com/chengwulongxia-rgb/pipelines-llm-news) — 4 個 cron 的設定 + skill + bootstrap.sh（電腦壞了/換新機時跑 `./bootstrap.sh` 重建整條管線）

## 深度分析發表流程（手動）

人工介入只有一條線：中午看到 Telegram 匯總，回編號（1,3,5,8 這種），剩下的交給小編。

```
中午匯總（12:00 Telegram）→ 使用者回編號（如 1,3,5,8）
                │
                ▼
    source ~/projects/llm-news-crawler/scripts/checks.sh
                │
                ├── 部落格文章 → fetch-blog "URL"
                ├── arXiv 論文 → fetch-smart "URL"  
                ├── 被 CF 擋？→ cf-fallback "URL"（自動搜 HN）
                └── HN 討論串 → hn-search "query" → hn-fetch STORY_ID
                │
                ▼
           撰寫深度分析 × N（每篇獨立成檔 + 一張 hero 圖）
                │
                ▼
   git add _posts/YYYY-MM-DD/ assets/images/YYYY-MM-DD/  # 新文用資料夾
   git commit + push → GitHub Actions 自動 build + deploy
```

## 爬蟲工具集

爬蟲專案：[llm-news-crawler](https://github.com/chengwulongxia-rgb/llm-news-crawler)

```bash
cd ~/projects/llm-news-crawler && source scripts/checks.sh
```

| 指令 | 用途 |
|:--|:--|
| `fetch-blog URL` | 抓部落格文章（curl_cffi TLS 偽裝，穿透 Cloudflare） |
| `fetch-smart URL` | 智慧抓取（自動辨識 arXiv / HN / 一般網站） |
| `hn-search "query"` | 搜 HN 討論串 |
| `hn-fetch STORY_ID` | 抓 HN 討論內容 |
| `arxiv-fetch ID` | 抓 arXiv 論文摘要 |
| `cf-fallback URL` | 原站被 Cloudflare 擋時，自動搜 HN + Google News |
| `check-cf URL` | 測 URL 是否被 Cloudflare 擋 |
| `cron-today` | 看今天爬到的全部新聞 |
| `cron-digest` | 看中午匯總 |

### Cloudflare 穿透

`curl_cffi` 模擬 Chrome 131 的 TLS handshake（JA4 指紋），
在協定層繞過 Cloudflare JS Challenge。實測 Anthropic / OpenAI 都穿得過去——不是每次都順利，但比 `--playwright` 走 headless 瀏覽器省資源太多。

## 分頁設定

用 `jekyll-paginate-v2`（**不在 GitHub Pages 白名單**，所以走 Actions build）：

- **首頁**：每頁 20 篇（87 篇 → 5 頁），頁碼列 `before/after: 3/3`
- **分類頁**：12 個 category（`llm` / `daily` / `deep-dive` / `ai` / `aliens` / `archive` / `civilization` / `deepsea` / `economics` / `mystery` / `paranormal` / `translation`）全部自動分頁
- **總覽頁**：`/all-categories/` 一頁列完所有分類

可調參數集中在 `_config.yml` 的 `pagination:` 區塊（`per_page`、`trail.before/after`）。

## Tech Stack

- **部落格**：Jekyll + GitHub Actions（Minima 主題、Claude 暖色系、`jekyll-paginate-v2` 首頁 + 12 個分類自動分頁）
- **爬蟲**：Python（httpx + Playwright + curl_cffi）
- **自動化**：Hermes Agent cron jobs（4 個 job，詳見 [`pipelines-llm-news`](https://github.com/chengwulongxia-rgb/pipelines-llm-news)）
- **Git**：chengwulongxia@gmail.com / 龍蝦城武

---

## 🚀 部署（GitHub Actions）

分頁用的是 `jekyll-paginate-v2`（**不在 GitHub Pages 白名單**），所以走 Actions build。

**一次性設定（推到 repo 後要手動做一次）**：

1. 進 GitHub repo → **Settings** → **Pages**
2. **Source** 改為 **GitHub Actions**（不是 `Deploy from a branch`）
3. 之後 push 到 `main` 就會自動 build + deploy

**本地 build 驗證**：

```bash
docker build -f Dockerfile.test -t chengwu-jekyll-test .
docker run --rm -v "$PWD":/srv/jekyll -w /srv/jekyll chengwu-jekyll-test
ls _site/page/2/  # 確認首頁分頁有產出
ls _site/categories/llm/page/2/  # 確認分類分頁有產出
```

---

## 🆘 災難還原

整條管線的 cron + skill + script 都在 [`pipelines-llm-news`](https://github.com/chengwulongxia-rgb/pipelines-llm-news) repo。

新機器 / 系統重灌時：

```bash
# 1. 裝工具
#    - Hermes Agent（hermes CLI）
#    - uv（curl -LsSf https://astral.sh/uv/install.sh | sh）

# 2. 重建管線
git clone https://github.com/chengwulongxia-rgb/pipelines-llm-news.git
cd pipelines-llm-news && ./bootstrap.sh

# 3. Clone 兩個被管線依賴的 repo
git clone https://github.com/chengwulongxia-rgb/llm-news-crawler ~/projects/llm-news-crawler
git clone https://github.com/chengwulongxia-rgb/chengwulongxia-rgb.github.io ~/projects/chengwu-profile
cd ~/projects/llm-news-crawler && uv sync && uv run playwright install chromium

# 4. 驗證
hermes cron list
hermes cron run 90a0d20fbc91  # 手動跑一次蒐集
```

---

📬 [chengwulongxia-rgb.github.io](https://chengwulongxia-rgb.github.io)

*城武的未解檔案——沒有「以上為本篇介紹」的結尾，因為本篇到這裡就結束了。*
