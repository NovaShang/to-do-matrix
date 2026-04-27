import { Hono } from "hono";
import { cors } from "hono/cors";
import { createAuth } from "./auth";
import { tasksRouter } from "./routes/tasks";
import { keysRouter } from "./routes/keys";
import type { HonoEnv } from "./types";

const app = new Hono<HonoEnv>();

app.use("*", cors());

app.get("/health", (c) => c.json({ status: "ok" }));

// Better Auth: sign-up, sign-in, session, OAuth callbacks
// CLI setup flow: POST /api/auth/sign-up/email → POST /api/auth/sign-in/email → Bearer token → POST /api/keys
app.on(["GET", "POST"], "/api/auth/**", (c) => {
  return createAuth(c.env.DB, c.env).handler(c.req.raw);
});

// API key CRUD (requires session auth)
app.route("/api/keys", keysRouter);

// Task CRUD (requires API key or session)
app.route("/api/tasks", tasksRouter);

app.notFound((c) => c.json({ error: "Not Found" }, 404));

export default app;
