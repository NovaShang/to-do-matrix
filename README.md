# tdmx — Eisenhower Matrix CLI

> *"What is important is seldom urgent, and what is urgent is seldom important."*
> — Dwight D. Eisenhower

**tdmx** is a command-line task manager built on the Eisenhower Matrix. Instead of relying on gut feeling to classify tasks, you provide **importance**, **effort**, and **deadline** — tdmx calculates urgency in real-time, assigns quadrants automatically, and recommends execution order.

[中文说明](#中文说明)

---

## Why tdmx?

Traditional to-do lists treat all tasks equally. The Eisenhower Matrix fixes this by separating *important* from *urgent* — but manually classifying tasks is itself a cognitive burden.

tdmx automates this:

| Quadrant | Criteria | Strategy |
|---|---|---|
| **Q1** | Important & Urgent | Do it now |
| **Q2** | Important & Not Urgent | Schedule it |
| **Q3** | Not Important & Urgent | Delegate / automate |
| **Q4** | Not Important & Not Urgent | Eliminate |

Quadrants are **computed at runtime** — the same task drifts from Q2 to Q1 as the deadline approaches.

## How It Works

```
urgencyScore = effort (hours) / hoursRemaining (hours)
```

- A 40-hour thesis due in 3 days → `40 / 72 ≈ 0.56` → **Urgent**
- A 1-hour errand due in 3 days → `1 / 72 ≈ 0.01` → **Not urgent**

Tasks with `urgencyScore > 0.3` are classified as urgent. No deadline means never urgent.

## Quick Start

**Prerequisites:** [Bun](https://bun.sh) >= 1.0

```bash
git clone https://github.com/NovaShang/to-do-matrix.git
cd to-do-matrix/apps/cli
bun install

# Optional: link as global command
bun link
```

The database (`~/.tdmx/tasks.db`) is created automatically on first run.

## Usage

### Add a task

```bash
tdmx add "Finish thesis" -i 5 -e 40 -d "2026-04-01"
tdmx add "Buy groceries" -i=-1 -e 1 -d "2026-04-07"
tdmx add "Read Deep Work" -i 3 -e 8          # no deadline → never urgent
tdmx add "Write chapter 3" -i 5 -e 10 -d "2026-03-10" -p 1  # subtask
```

| Flag | Description |
|---|---|
| `-i, --importance <n>` | Importance score (`> 0` = important, `< 0` = not important) **required** |
| `-e, --effort <hours>` | Estimated effort in hours (default: 1) |
| `-d, --due <datetime>` | Deadline (`"2026-03-15"` or `"2026-03-15 18:00"`) |
| `-p, --parent <id>` | Parent task ID for subtasks |
| `-n, --notes <text>` | Notes |
| `--json` | JSON output |

### View tasks

```bash
tdmx ls              # Eisenhower matrix view (default)
tdmx ls --flat        # sorted by execution priority
tdmx ls -q 1          # Q1 only
tdmx ls --json        # machine-readable output
tdmx ls --all         # include done & abandoned
```

**Matrix view:**

```
🔴 Q1 重要 & 紧急  [立即执行]
────────────────────────────────────────────────────────────
  ☐ [1] Fix production DB  (i:5 e:4h)  📅 2026/02/22  ⏰ 0.91

🟡 Q2 重要 & 不紧急  [计划安排]
────────────────────────────────────────────────────────────
  ☐ [2] Finish thesis  (i:5 e:40h)  📅 2026/04/01  0.04
    ▶ [3] Write chapter 3  (i:5 e:10h)  📅 2026/03/10  0.06
  ☐ [4] Read Deep Work  (i:3 e:8h)

🟠 Q3 不重要 & 紧急  [授权/自动化]
────────────────────────────────────────────────────────────
  (空)

⚫ Q4 不重要 & 不紧急  [消除]
────────────────────────────────────────────────────────────
  ☐ [5] Social media  (i:-2 e:1h)
```

### Update a task

```bash
tdmx update 1 --start          # mark as in progress
tdmx update 1 --done           # mark as done
tdmx update 1 --abandon        # abandon
tdmx update 1 --reopen         # reopen
tdmx update 1 -i 3 -e 20      # adjust parameters (quadrant recalculates)
tdmx update 1 -d ""           # clear deadline
```

## Algorithm

### Execution Priority

```
executionScore = importance × 1.0 + urgencyScore × 5.0
```

Urgency is weighted 5x because hard deadlines can't be moved. Use `tdmx ls --flat` to see the recommended execution order.

### Status Flow

```
pending ──→ in_progress ──→ done
   ↑            │
   └── reopen ──┘
         ↓
     abandoned (from any state)
```

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | [Bun](https://bun.sh) |
| CLI Framework | [cac](https://github.com/cacjs/cac) |
| ORM | [Drizzle ORM](https://orm.drizzle.team) |
| Database | SQLite (Bun built-in) |

## Project Structure

```
apps/cli/
├── src/
│   ├── index.ts          # CLI entry & command routing
│   ├── engine.ts         # Core algorithms (urgency, quadrant, execution score)
│   ├── utils.ts          # Rendering (matrix view, flat list, tree)
│   ├── db/
│   │   ├── schema.ts     # Drizzle ORM table definitions
│   │   └── index.ts      # SQLite connection & auto-migration
│   └── commands/
│       ├── add.ts
│       ├── list.ts
│       └── update.ts
├── skill/                # AI Agent integration (Phase 2)
│   ├── SKILL.md
│   └── scripts/tdmx.js
└── docs/
```

## Roadmap

This CLI is **Phase 1** of a 5-phase architecture:

| Phase | Form | Status |
|---|---|---|
| **Phase 1** | Local CLI + SQLite | **Current** |
| **Phase 2** | AI Agent Skill — natural language input via LLM | Planned |
| **Phase 3** | Cloud API — Cloudflare Workers + D1, multi-device sync | Planned |
| **Phase 4** | PWA Dashboard — React web app | Planned |
| **Phase 5** | Native Shell — iOS Widget, Siri Intents | Planned |

## Development

```bash
bun run dev -- ls              # run in dev mode
bun run db:generate            # regenerate migrations after schema changes
bun run db:studio              # open Drizzle Studio
bun run bundle                 # bundle for AI Agent skill
```

## License

MIT

---

## 中文说明

**tdmx** 是一个基于艾森豪威尔矩阵的命令行任务管理器。你只需提供任务的**重要程度**、**预估工时**和**截止时间**，工具会实时计算紧急度，自动完成象限分配，并给出推荐执行顺序。

### 核心理念

传统的任务清单对所有任务一视同仁。艾森豪威尔矩阵通过区分"重要"和"紧急"来解决这个问题——但手动分类本身就是认知负担。

tdmx 的解法：**紧急度由算法实时计算**，而非人工判断。

```
紧急度 = 预估工时 / 剩余时间
```

同样是"还剩3天"：
- 毕业论文（40小时工作量）→ 紧急度 ≈ 0.56 → **紧急**
- 买菜（1小时）→ 紧急度 ≈ 0.01 → **不紧急**

象限是**动态计算**的，同一个任务会随着时间推移自动从 Q2 漂移到 Q1。

### 快速开始

```bash
# 安装
git clone https://github.com/NovaShang/to-do-matrix.git
cd to-do-matrix/apps/cli
bun install && bun link

# 使用
tdmx add "完成毕业论文" -i 5 -e 40 -d "2026-04-01"
tdmx ls                # 查看四象限矩阵
tdmx ls --flat          # 按推荐执行顺序排列
tdmx update 1 --done   # 标记完成
```

详细文档请参阅 [apps/cli/README.md](apps/cli/README.md)。
