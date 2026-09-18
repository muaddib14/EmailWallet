import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// DATABASE_URL is a Neon connection string, e.g.
//   postgres://user:password@ep-xxxx.neon.tech/dbname?sslmode=require
// Set it in .env.local for dev and in the Vercel project's env vars for prod
// (Vercel's Neon integration fills this in automatically if you use it).
//
// Lazily initialized so `next build` can statically analyze API routes
// without a real DATABASE_URL present — the error only surfaces when a
// route actually touches the database at request time.
let _db: NeonHttpDatabase<typeof schema> | null = null;

function getDb() {
  if (_db) return _db;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and fill in your Neon connection string."
    );
  }

  _db = drizzle(neon(url), { schema });
  return _db;
}

export const db: NeonHttpDatabase<typeof schema> = new Proxy({} as NeonHttpDatabase<typeof schema>, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});
