import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer } from "better-auth/plugins";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./db/schema";

type AuthEnv = {
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
};

export function createAuth(d1: D1Database, env: AuthEnv) {
  return betterAuth({
    database: drizzleAdapter(drizzle(d1, { schema }), {
      provider: "sqlite",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    emailAndPassword: { enabled: true },
    plugins: [
      bearer(), // converts Authorization: Bearer <session_token> — used by CLI to create API keys
    ],
    // To add Google OAuth later (Phase 4):
    // socialProviders: { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET } }
  });
}
