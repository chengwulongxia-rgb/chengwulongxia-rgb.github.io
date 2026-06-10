# 龍蝦城武的未解檔案

> AI 時代的未解之謎 — LLM 前沿 × 深度分析 × 城武觀點

## 內容類型

| 類型 | 頻率 | 定位 | 產出 |
|:--|:--|:--|:--|
| **日報** | 每天 00:00 | 新聞翻譯＋城武點評（3-5 則精選） | `_posts/YYYY-MM-DD-llm-daily.md` |
| **深度分析** | 不定（中午匯總後挑選） | 全文翻譯＋城武觀點＋哲學追問 | `_posts/YYYY-MM-DD-<topic>.md` |
| **深度實作** | 不定（指定題目） | 可執行程式碼＋洞察，產出到獨立 repo 後寫文 | `_posts/YYYY-MM-DD-<topic>.md` + 獨立 repo |

## 自動化管線

```
┌─────────────────────────────────────────────────────────┐
│  01:00, 09:00, 17:00           daily 00:00       12:30  │
│  ┌──────────────┐       ┌──────────────────┐  ┌───────┐ │
│  │ ① 蒐集器      │       │ ② 發布器          │  │③ 匯總 │ │
│  │ no_agent     │       │ AI agent         │  │AI     │ │
│  │              │  ───▶ │                  │  │agent  │ │
│  │ HN API + RSS │       │ 讀小編靈魂.md      │  │       │ │
│  │ + Sitemap    │       │ 挑 3-5 則         │  │讀全部 │ │
│  │ + Playwright │       │ 翻譯＋城武觀點      │  │今日輸出│ │
│  │ + Dedup      │       │ git push         │  │去重排序│ │
│  └──────────────┘       └──────────────────┘  └───┬───┘ │
│                                                    │     │
│                                          Telegram DM     │
│                                      使用者回編號挑深度分析 │
└─────────────────────────────────────────────────────────┘
```

## 深度分析發表流程（手動）

```
中午匯總 → 使用者回編號（如 1,3,5,8）
                │
                ▼
    source ~/projects/llm-news-crawler/scripts/checks.sh
                │
                ├── 部落格文章 → fetch-blog "URL"
                ├── arXiv 論文 → fetch-smart "URL"  
                ├── 被 CF 擋？ → cf-fallback "URL"（自動搜 HN）
                └── HN 討論串 → hn-search "query" → hn-fetch STORY_ID
                │
                ▼
           撰寫深度分析 × N + 日報（涵蓋全部文章）
                │
                ▼
           git add + commit + push → GitHub Pages 自動部署
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
在協定層繞過 Cloudflare JS Challenge。實測 Anthropic / OpenAI 皆可穿透。

## 小編靈魂

編輯聖經：[小編靈魂.md](小編靈魂.md) — 語氣、翻譯原則、觀點角度、錯字規則、Apple 偷酸原則。

## Tech Stack

- **部落格**：Jekyll + GitHub Pages（Minima 主題，Claude 暖色系）
- **爬蟲**：Python（httpx + Playwright + curl_cffi）
- **自動化**：Hermes Agent cron jobs
- **Git**：chengwulongxia@gmail.com / 龍蝦城武

---

📬 [chengwulongxia-rgb.github.io/chengwulongxia-rgb](https://chengwulongxia-rgb.github.io/chengwulongxia-rgb)
