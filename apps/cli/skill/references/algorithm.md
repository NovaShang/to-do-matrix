# tdmx Algorithm & Field Reference

## Data Schema (tasks table)

| Field | Type | Description |
|---|---|---|
| `id` | integer | Auto-increment primary key |
| `title` | text | Task title |
| `importance` | real | User-provided float. >0 = important, <0 = unimportant |
| `effort` | real | Estimated hours of work (default 1) |
| `due_date` | text | ISO 8601 deadline, optional. No date = never urgent |
| `status` | text | `pending` / `in_progress` / `done` / `abandoned` |
| `parent_id` | integer | Parent task ID for tree structure, optional |
| `notes` | text | Optional notes |
| `created_at` | text | ISO datetime |
| `updated_at` | text | ISO datetime |

## Computed Fields (runtime only, in --json output)

| Field | Formula | Meaning |
|---|---|---|
| `urgencyScore` | `effort / hoursRemaining` | How much of remaining time is consumed by this task |
| `quadrant` | `f(importance > 0, urgencyScore > 0.3)` | 1–4 |
| `executionScore` | `importance × 1.0 + urgencyScore × 5.0` | Recommended execution order (higher = do first) |

## urgencyScore Thresholds

| Score | Label | Meaning |
|---|---|---|
| `0` | — | No due date, or huge time buffer |
| `0–0.3` | Not urgent | Displayed as bare float |
| `0.3–1.0` | Urgent ⏰ | Crosses the urgency threshold; lands in Q1 or Q3 |
| `>1.0` | Critical 🔥 | Less time remaining than the task needs |
| `999` | Overdue ⚠ | Past due date |

## Quadrant Matrix

```
importance > 0 && urgencyScore > 0.3  → Q1 🔴  重要 & 紧急     [立即执行]
importance > 0 && urgencyScore ≤ 0.3  → Q2 🟡  重要 & 不紧急   [计划安排]
importance ≤ 0 && urgencyScore > 0.3  → Q3 🟠  不重要 & 紧急   [授权/自动化]
importance ≤ 0 && urgencyScore ≤ 0.3  → Q4 ⚫  不重要 & 不紧急 [消除]
```

## Status Transitions

```
pending → in_progress → done
   ↑           |
   └─ reopen ──┘
        ↓
    abandoned   (from any non-done state)
```

CLI flags: `--start` (→ in_progress), `--done`, `--abandon`, `--reopen` (→ pending)

## Tree Structure

Tasks can have a `parent_id`. In matrix view, children are indented under their parent **within the same quadrant**. If parent and child land in different quadrants, the child is promoted to a root node in its own quadrant — it is never hidden.

## executionScore Interpretation

The score combines importance and urgency to produce a single recommended execution rank:

```
executionScore = importance × 1.0 + urgencyScore × 5.0
```

Urgency weight (5.0) is higher than importance weight (1.0) because urgent tasks have hard deadlines that cannot be pushed back. However importance still breaks ties and prevents unimportant urgent tasks from dominating.

`tdmx ls --flat --json` returns tasks already sorted by `executionScore` descending — use the list order directly as your recommendation.
