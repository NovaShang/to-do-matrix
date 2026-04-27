import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

// Must be called per-request — D1Database binding is only available in request context
export const getDb = (d1: D1Database) => drizzle(d1, { schema });
