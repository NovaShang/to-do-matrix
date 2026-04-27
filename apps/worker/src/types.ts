export type HonoEnv = {
  Bindings: {
    DB: D1Database;
    BETTER_AUTH_SECRET: string;
    BETTER_AUTH_URL: string;
  };
  Variables: {
    userId: string;
  };
};
