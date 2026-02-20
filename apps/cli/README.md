# tdmx — AI Native 任务管理 CLI

基于**艾森豪威尔矩阵**的命令行任务管理器，同时也是一套更大的 AI Native SaaS 架构的 **Phase 1 逻辑内核**。

---

## 背景：为什么从 CLI 开始？

> "我有两种问题：紧急的和重要的。紧急的问题不重要，重要的问题永远不紧急。"
> — 德怀特·艾森豪威尔

艾森豪威尔矩阵将所有任务划分为四个象限：

| 象限 | 属性 | 策略 |
|---|---|---|
| **Q1** 🔴 | 重要 & 紧急 | 立即执行 |
| **Q2** 🟡 | 重要 & 不紧急 | 计划安排（高绩效的核心区域） |
| **Q3** 🟠 | 不重要 & 紧急 | 授权 / 自动化 |
| **Q4** ⚫ | 不重要 & 不紧急 | 消除 |

**传统痛点**：分类本身依赖人工直觉，"这件事算紧急还是不紧急"本身就是认知负担。

**tdmx 的解法**：你只需要提供任务的**重要程度**、**预估工时**和**截止时间**，工具会实时计算紧急度，自动完成象限分配，并给出推荐执行顺序。未来的 AI 模式（`--auto`）还将支持纯自然语言输入，由 LLM 自动提取这些参数。

这个 CLI 本身也是一套五阶段全栈架构（Gulu Methodology）的第一阶段——先在本地跑通核心逻辑，后续逐步演进为 AI Agent Skill、云端 API 和 PWA。

---

## 核心算法

### 紧急度评分

```
urgencyScore = effort（小时）/ hoursRemaining（小时）
```

| urgencyScore | 含义 |
|---|---|
| `0.00` | 完全不紧急，时间充裕 |
| `0.30` | **紧急阈值**（默认），开始有压力 |
| `1.00` | 刚好够用，已无缓冲 |
| `> 1.0` | 🔥 时间已不够用 |
| `999` | ⚠ 已过期 |

**为什么要除以工时？** 因为紧急程度取决于任务本身的工作量。同样是"还剩3天"：

- 毕业论文（40h）：urgencyScore ≈ 0.56 → **紧急** ✓
- 买菜（1h）：urgencyScore ≈ 0.01 → **不紧急** ✓

用户只需如实填写预估工时，系统自动处理剩余的判断。

### 象限判定

```
important = importance > 0
urgent    = urgencyScore > 0.3

Q1: important && urgent
Q2: important && !urgent
Q3: !important && urgent
Q4: !important && !urgent
```

象限是**运行时动态计算**的，不存入数据库。同一个任务随着时间推移会自动从 Q2 漂移到 Q1。

### 推荐执行顺序

```
executionScore = importance × 1.0 + urgencyScore × 5.0
```

urgency 权重更高——紧急的事情拖不起。`tdmx ls --flat` 按此分数降序输出。

---

## 安装

**前置要求**：[Bun](https://bun.sh) >= 1.0

```bash
git clone <repo>
cd apps/cli
bun install
```

**可选：链接为全局命令**

```bash
bun link
# 之后可在任意目录使用 tdmx
```

数据库自动创建于 `~/.tdmx/tasks.db`，启动时自动运行迁移，无需任何配置。

---

## 命令参考

### `tdmx add <title>`

添加任务。

```
选项:
  -i, --importance <n>   重要度（浮点数，>0 重要，<0 不重要）  [必填]
  -e, --effort <hours>   预估工时（小时，默认 1）
  -d, --due <datetime>   截止时间（如 "2026-03-15" 或 "2026-03-15 18:00"）
  -p, --parent <id>      挂载为某任务的子任务
  -n, --notes <text>     备注
      --json             JSON 格式输出
```

```bash
# 高重要度、有明确工作量
tdmx add "完成毕业论文" -i 5 -e 40 -d "2026-04-01"

# 子任务（挂在论文下）
tdmx add "写第三章" -i 5 -e 10 -d "2026-03-10" -p 1

# 不重要的日常事务（负数直接传入）
tdmx add "买菜" -i -1 -e 1 -d "2026-02-22"
tdmx add "刷社交媒体" -i -2

# 无截止时间 → 永远不紧急，落入 Q2 或 Q4
tdmx add "阅读《深度工作》" -i 3 -e 8
```

---

### `tdmx ls` / `tdmx list`

查看任务矩阵。默认显示 `pending` 和 `in_progress` 的任务，按四象限分组，父子任务缩进展示。

```
选项:
  -q, --quadrant <n>     只显示指定象限 [1|2|3|4]（象限是动态计算的）
  -s, --status <status>  按状态过滤（pending / in_progress / done / abandoned）
      --all              显示所有状态（含已完成和已放弃）
      --flat             平铺视图，按推荐执行顺序（executionScore）排列
      --json             JSON 输出，含计算字段 quadrant / urgencyScore / executionScore
```

**默认输出（四象限矩阵 + 树形缩进）**

```
🔴 Q1 重要 & 紧急  [立即执行]
────────────────────────────────────────────────────────────
  ☐ [1] 修复生产数据库  (i:5 e:4h)  📅 2026/02/22  ⏰ 0.91

🟡 Q2 重要 & 不紧急  [计划安排]
────────────────────────────────────────────────────────────
  ☐ [2] 完成毕业论文  (i:5 e:40h)  📅 2026/04/01  0.04
    ▶ [3] 写第三章  (i:5 e:10h)  📅 2026/03/10  0.06
  ☐ [4] 阅读《深度工作》  (i:3 e:8h)

🟠 Q3 不重要 & 紧急  [授权/自动化]
────────────────────────────────────────────────────────────
  (空)

⚫ Q4 不重要 & 不紧急  [消除]
────────────────────────────────────────────────────────────
  ☐ [5] 刷社交媒体  (i:-2 e:1h)
```

**`--flat` 推荐执行顺序视图**

```bash
tdmx ls --flat
```

```
按推荐执行顺序排列 (共 5 项):
────────────────────────────────────────────────────────────
🔴 ☐ [1] 修复生产数据库  (i:5 e:4h)  📅 2026/02/22  ⏰ 0.91
🟡 ▶ [3] 写第三章  (i:5 e:10h)  📅 2026/03/10  0.06
🟡 ☐ [2] 完成毕业论文  (i:5 e:40h)  📅 2026/04/01  0.04
🟡 ☐ [4] 阅读《深度工作》  (i:3 e:8h)
⚫ ☐ [5] 刷社交媒体  (i:-2 e:1h)
```

**`--json` 机器可读输出**（AI Agent 友好）

```bash
tdmx ls --json
```

输出包含动态计算字段，适合作为 AI Agent 的 Tool 调用结果：

```json
[
  {
    "id": 1,
    "title": "修复生产数据库",
    "importance": 5,
    "effort": 4,
    "dueDate": "2026-02-22T00:00:00.000Z",
    "status": "pending",
    "parentId": null,
    "quadrant": 1,
    "urgencyScore": 0.91,
    "executionScore": 9.55
  }
]
```

---

### `tdmx update <id>`

更新任务字段或流转状态。

```
选项:
  -t, --title <text>     修改标题
  -i, --importance <n>   修改重要度（会触发象限重新计算）
  -e, --effort <hours>   修改预估工时（会触发象限重新计算）
  -d, --due <datetime>   修改截止时间（传 "" 清除）
  -p, --parent <id>      修改父任务（传 0 解除父子关系）
  -n, --notes <text>     修改备注
      --start            标记为进行中 (in_progress)
      --done             标记为已完成 (done)
      --abandon          标记为放弃 (abandoned)
      --reopen           重新打开，回到 pending
      --json             JSON 格式输出
```

**状态流转**

```
           ┌──────────────────────────────┐
           │                              ▼
  pending ──→ in_progress ──→ done    abandoned
     ▲            │              │
     └── reopen ──┘              │
     └──────────── reopen ───────┘
```

```bash
tdmx update 1 --start                   # 开始执行
tdmx update 1 --done                    # 完成
tdmx update 1 --abandon                 # 放弃
tdmx update 1 --reopen                  # 重新打开

tdmx update 1 -d "2026-02-22"          # 改截止时间，可能从 Q2 → Q1
tdmx update 1 -i 3 -e 20               # 修改参数，象限自动重新计算
tdmx update 1 -d ""                    # 清除截止时间
tdmx update 2 -p 0                      # 解除父子关系
```

---

## 数据结构

```
~/.tdmx/tasks.db（SQLite）

表: tasks
  id          INTEGER   主键，自增
  title       TEXT      任务标题
  importance  REAL      重要度（用户输入，>0 重要，<0 不重要）
  effort      REAL      预估工时（小时，默认 1）
  due_date    TEXT      截止时间（ISO 8601，可选；无则永不紧急）
  status      TEXT      pending | in_progress | done | abandoned
  parent_id   INTEGER   父任务 ID（可选，支持多级树）
  notes       TEXT      备注（可选）
  created_at  TEXT      创建时间
  updated_at  TEXT      最后更新时间

运行时计算字段（不落库）:
  urgencyScore    = effort / hoursRemaining
  quadrant        = f(importance, urgencyScore)     → 1 | 2 | 3 | 4
  executionScore  = importance × 1.0 + urgencyScore × 5.0
```

---

## 开发

```bash
# 以开发模式运行（等同于 tdmx）
bun run dev -- ls

# 数据库相关
bun run db:generate   # 修改 schema.ts 后重新生成迁移文件
bun run db:migrate    # 手动执行迁移（程序启动时也会自动执行）
bun run db:studio     # 打开 Drizzle Studio 可视化界面
```

**项目结构**

```
apps/cli/
├── src/
│   ├── index.ts          # CLI 入口（cac 路由）
│   ├── engine.ts         # 核心算法（urgencyScore / quadrant / executionScore）
│   ├── utils.ts          # 渲染（矩阵视图 / 树形缩进 / 平铺列表）
│   ├── db/
│   │   ├── schema.ts     # Drizzle ORM 表定义
│   │   └── index.ts      # SQLite 连接 + 自动迁移
│   └── commands/
│       ├── add.ts
│       ├── list.ts
│       └── update.ts
├── drizzle/              # 迁移文件（由 drizzle-kit generate 生成）
├── drizzle.config.ts
└── package.json
```

**技术栈**

| 层 | 技术 |
|---|---|
| 运行时 & 包管理 | [Bun](https://bun.sh) |
| CLI 框架 | [cac](https://github.com/cacjs/cac) |
| ORM | [Drizzle ORM](https://orm.drizzle.team)（bun-sqlite 适配器） |
| 数据库 | SQLite（Bun 内置驱动，零依赖） |

---

## 路线图

本工具是五阶段架构（Gulu Methodology）的 Phase 1。

| 阶段 | 形态 | 状态 |
|---|---|---|
| **Phase 1** — 逻辑内核 | 本地 CLI，SQLite，完整 CRUD | ✅ **当前** |
| **Phase 2** — AI Agent 接口 | `tdmx add --auto` 自然语言输入；`tdmx agent` 对话规划 | 🔜 计划中 |
| **Phase 3** — 云服务化 | Cloudflare Workers + D1，多设备同步（`tdmx sync`） | 🔜 计划中 |
| **Phase 4** — PWA | React Dashboard，可安装 Web App | 🔜 计划中 |
| **Phase 5** — Native Shell | iOS Widget，Siri App Intents | 🔜 计划中 |

Phase 2 的 AI 功能设计：
- `tdmx add "下周二前把架构图发给团队" --auto` — LLM 自动提取重要度、工时和截止时间
- `tdmx agent "我今天只有两小时，应该先做哪件事？"` — 基于当前任务数据的对话式规划
- `tdmx agent "把 Q3 里需要发邮件的事情帮我起草草稿"` — AI 直接代理执行 Q3 任务
