---
layout: post
title: "【深度翻譯】Claw Patrol：第一款為 AI agent 設計的開源防火牆，出自 Deno 生態系"
date: 2026-06-12 04:00:00 +0000
categories: [llm, tools, security, deep-dive]
---

![Claw Patrol 安全防火牆]({{ site.baseurl }}/assets/images/2026-06-12-clawpatrol-hero.jpg)

Agent 時代有一個還沒被認真回答的問題：**誰在看管 agent？**

Claw Patrol 是目前我看到最直接的回答。Deno 生態推出的開源 agent 防火牆，MIT 授權，目標很簡單——**在 agent 和你的生產環境之間，放一層可以寫規則的閘道。**

---

## 它是什麼？

Claw Patrol 是一個代理伺服器（proxy），部署在 agent 和實際系統之間。它解析 agent 發出的每一條指令，對照你用 HCL（HashiCorp Configuration Language）寫的規則，決定放行還是攔截。

三句話理解：

- **攔截危險的 SQL**：`DROP TABLE`、`DELETE FROM` 可以擋在 agent 端
- **攔截危險的 kubectl**：`kubectl delete pod` 可以先暫停等人類同意
- **攔截危險的 HTTP**：按照 method、路徑、header、body 來過濾

安裝就一行：

```bash
curl -fsSL https://clawpatrol.dev/install.sh | sh
```

---

## 規則怎麼寫？非常工程師友善

以 Kubernetes 為例：

```hcl
rule "k8s-no-secrets" {
  endpoint  = k8s-prod
  condition = "k8s.resource == 'secrets'"
  verdict   = "deny"
  reason    = "Secret values must not leave the cluster via the agent"
}
```

條件用 CEL（Common Expression Language）——Google 開源的輕量表達式語言——在線路層級做判斷。目前支援三種後端：

| 後端 | 可檢查的欄位 |
|------|------------|
| PostgreSQL / ClickHouse | SQL 動詞、表格名稱 |
| Kubernetes | resource、verb、namespace |
| HTTP | method、path、headers、body |

---

## 三種部署模式

這是 Claw Patrol 設計上最用心的地方：

### 1. Gateway 模式

```bash
clawpatrol gateway config.hcl
```

啟動一個獨立的代理，agent 的流量全部經過它——最標準的 sidecar 部署。

### 2. Join 模式

```bash
clawpatrol join <gateway-url>
```

透過 WireGuard 隧道加入現有的 gateway。適合分散式部署。

### 3. Per-process 模式

```bash
clawpatrol run claude
```

包裝單一 agent 的程序樹，用 Linux netns 或 macOS NetworkExtension 做 per-process 隔離。這個模式最適合開發者自己用。

---

## 城武觀點

### 1. Agent security 終於有了自己的專用工具

過去講 agent 安全，講的都是 prompt injection、模型層防禦、content filter。但 Claw Patrol 做的事情不一樣：**它在 agent 抵達真實系統之前，加了一層可程式化的網路邊界。**

這不是取代模型層防禦，是補上模型層防禦永遠補不到的洞——一個被 social engineering 的 agent，模型看不出異常，但網路層的規則可以擋。

### 2. HCL + CEL 的選擇很聰明

沒有自創 DSL，而是用了 Terraform 生態熟悉的 HCL 和 Google 的 CEL。任何 DevOps 工程師都能在五分鐘內寫出第一條規則。降低門檻本身就是安全策略的一部分。

### 3. 現在的問題是：誰來寫規則？

防火牆的價值取決於規則的品質。Claw Patrol 給了你框架，但預設規則集還很薄。如果社群不來貢獻規則模板（例如「標準的 PostgreSQL agent 安全規則集」），每個團隊都得自己從零開始。

但方向是對的。agent 安全不應該是 prompt engineering 的副產品，它需要自己的基礎設施。

---

*城武的未解檔案——agent 時代的第一道防火牆已經來了，現在缺的不是工具，是有人認真寫規則。*
