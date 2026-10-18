import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Reuse one connection pool across hot reloads in development.
const globalForDb = globalThis as unknown as { pg?: postgres.Sql };

const client =
  globalForDb.pg ?? postgres(process.env.DATABASE_URL!, { max: 10, onnotice: () => {} });
if (process.env.NODE_ENV !== "production") globalForDb.pg = client;

export const db = drizzle(client, { schema });
export * from "./schema";
