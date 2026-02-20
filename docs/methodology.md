# 从 CLI 到 AI Native SaaS：一套通用的全栈开发方法论

> **摘要**：在 AI Agent 爆发的时代，传统的 "UI First" App 开发模式已经过时。本文提出了一套名为 "Gulu Methodology" 的五阶段开发框架，旨在通过 **逻辑先行、Schema 驱动、渐进式云化** 的策略，以极低的成本构建既能服务于 AI Agent，又能通过 PWA/Native Shell 触达普通消费者的现代应用。

---

## 背景：AI 时代的 App 该长什么样？

当我们谈论 "AI Native App" 时，我们往往陷入两个误区：要么是做一个单纯的 Chatbot，要么是给旧 App 硬塞一个 AI 对话框。真正的 AI Native，应该是 **"Headless First"** 的——核心逻辑与 UI 彻底解耦，优先服务于 Agent 的调用，其次才是人类的点击。

基于 Gulu-Tracker 项目的实战推演，我们总结出了以下五个演进阶段。

---

## 演进路线图 (The Roadmap)

### Phase 1: The Kernel (逻辑内核)
**目标**：在本地完成核心业务逻辑的 100% 闭环。
*   **形态**：一个单机版 CLI 工具。
*   **核心动作**：
    *   定义 **Zod Schema**：这是整个系统的 "真理来源"，用于生成 TS 类型、SQL 表结构、OpenAPI 文档。
    *   实现 **CRUD 逻辑**：使用本地 SQLite 验证所有业务规则。
*   **技术栈**：`Bun` + `Cac` (CLI) + `SQLite` + `Drizzle ORM`。

### Phase 2: Agent Skill (AI 接口)
**目标**：让 AI (Claude/Clawdbot) 能理解并操作你的逻辑。
*   **形态**：一个 `SKILL.md` 文档 + 编译后的单文件 JS。
*   **核心动作**：
    *   **文档工程**：将 Phase 1 的 Schema 转换为 LLM 易读的 Interface 定义。
    *   **本地执行**：Agent 通过命令行调用编译好的 JS，执行业务逻辑。
*   **关键点**：零协议开销，利用 Markdown 和 TS Interface 作为与 AI 沟通的桥梁。

### Phase 3: Cloud Service (云服务化)
**目标**：从单机单用户进化为多租户 SaaS。
*   **形态**：部署在边缘网络的 Serverless API。
*   **核心动作**：
    *   **逻辑复用**：将 Phase 1 的本地 SQLite 逻辑无缝迁移到 Cloudflare D1。
    *   **身份验证**：引入 OAuth (Better Auth) 和 Magic Link 机制。
*   **技术栈**：`Cloudflare Workers` + `Hono` + `D1 Database` + `Better Auth`。

### Phase 4: PWA Product (大众消费级)
**目标**：低成本实现 90% 的用户触达。
*   **形态**：一个可安装、离线可用的 Web App。
*   **核心动作**：
    *   **可视化**：复用 Phase 3 的 API，构建 Dashboard。
    *   **离线能力**：利用 Service Worker 实现 Local-First 体验（可选）。
*   **技术栈**：`Vite` + `React` + `shadcn/ui` + `Vite PWA`。

### Phase 5: Native Shell (原生增强)
**目标**：补全最后 10% 的极致体验。
*   **形态**：iOS "Ghost App" (空壳应用)。
*   **核心动作**：
    *   **意图转换**：通过 App Intents 让 Siri 能直接调用 API。
    *   **状态展示**：利用 Widget 和 Live Activities 展示实时数据。
    *   **主界面**：直接内嵌 Phase 4 的 PWA 页面。
*   **技术栈**：`SwiftUI` + `App Intents` + `WKWebView`。

---

## 核心架构挑战与解法

### 1. 数据库的平滑过渡 (Logical RLS)
**痛点**：Phase 1 是 `SELECT * FROM table`，Phase 3 需要变成 `SELECT * FROM table WHERE user_id = ?`。如何避免重写大量业务代码？

**解法：依赖注入与 Scoped DB**
在 Phase 1 设计 Service 层时，强制要求注入 `ctx` 上下文。在 Phase 3 的 Middleware 中，创建一个 **代理 DB 对象**，自动拦截所有 CRUD 操作并注入 `user_id` 过滤器。

```typescript
// 业务逻辑层 (永远不需要改)
const getRecords = (ctx) => ctx.db.select().from(records);

// Phase 3 Middleware
const scopedDb = {
  select: (...args) => globalDb.select(...args).where(eq(records.userId, userId))
};
c.set('db', scopedDb);
```

### 2. Claude 环境下的无感登录
**痛点**：Claude 的 Web 沙箱环境无法持久化 Token，且不支持 OAuth 回调。让用户手动粘贴 API Key 体验太差。

**解法：Magic Link + Polling**
1.  **触发**：Claude 调用 `login()`，在聊天框打印一个链接 `gulu.app/auth/magic?sid=xyz`。
2.  **轮询**：Skill JS 在后台静默轮询后端接口。
3.  **授权**：用户点击链接，在浏览器完成 Google 登录。后端将 Token 关联到 `sid`。
4.  **闭环**：Claude 轮询拿到 Token，存入本次会话的内存变量。

这种方式既避开了复制粘贴，又在沙箱限制内做到了最接近 Native 的体验。

### 3. 代码复用策略 (Monorepo)
为了支撑这 5 个阶段，推荐使用 **Bun Workspaces**：
*   `packages/core`: 存放 Zod Schema, Drizzle Definition, 纯业务逻辑函数 (Phase 1/3 共用)。
*   `apps/cli`: Phase 1 入口。
*   `apps/worker`: Phase 3 Hono 入口。
*   `apps/web`: Phase 4 React 入口。

---

## 总结

这套 "Gulu Methodology" 的核心哲学是：**Do not repeat yourself, let the code evolve.**

从 CLI 开始，每一行代码都是下一阶段的基石。我们不再是为了 App 而写 App，而是先构建一个"逻辑实体"，然后根据场景给它套上 CLI、API、Agent Skill 或 Native 的壳。这才是 AI 时代最高效的软件工程范式。
