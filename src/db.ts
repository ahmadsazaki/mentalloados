import { createClient } from "@libsql/client";
import "dotenv/config";

const isVercel = !!process.env.VERCEL;
const tursoUrl = process.env.TURSO_URL || process.env.LIBSQL_URL;
const isTurso = !!tursoUrl;

if (isVercel && !isTurso) {
  console.warn("⚠️ TURSO_URL or LIBSQL_URL is missing in Vercel environment. Database will likely fail to initialize.");
}

class LibsqlProvider {
  private client;
  constructor() {
    this.client = createClient({
      url: tursoUrl!,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }

  async exec(sql: string) {
    try {
      await this.client.execute(sql);
    } catch (e: any) {
      console.error("LibSQL exec error:", e);
      throw new Error(`Cloud Database Error: ${e.message}`);
    }
  }

  prepare(sql: string) {
    return {
      run: async (...args: any[]) => {
        try {
          return await this.client.execute({ sql, args });
        } catch (e: any) {
          throw new Error(`Cloud Database Run Error: ${e.message}`);
        }
      },
      get: async (...args: any[]) => {
        try {
          const res = await this.client.execute({ sql, args });
          return res.rows[0];
        } catch (e: any) {
          throw new Error(`Cloud Database Get Error: ${e.message}`);
        }
      },
      all: async (...args: any[]) => {
        try {
          const res = await this.client.execute({ sql, args });
          return res.rows;
        } catch (e: any) {
          throw new Error(`Cloud Database All Error: ${e.message}`);
        }
      }
    };
  }

  async transaction(fn: (tx: any) => Promise<void>) {
    const tx = await this.client.transaction("write");
    try {
      await fn({
        execute: async (sql: string, args: any[]) => await tx.execute({ sql, args }),
        run: async (sql: string, args: any[]) => await tx.execute({ sql, args }),
      });
      await tx.commit();
    } catch (e) {
      await tx.rollback();
      throw e;
    } finally {
      tx.close();
    }
  }
}

class SqliteProvider {
  private db: any = null;

  private async getDb() {
    if (!this.db) {
      if (isVercel) {
          throw new Error("Local SQLite is not supported on Vercel. Please set TURSO_URL and TURSO_AUTH_TOKEN environment variables.");
      }
      const Database = (await import("better-sqlite3")).default;
      this.db = new Database("mentalload.db");
    }
    return this.db;
  }

  async exec(sql: string) {
    const db = await this.getDb();
    db.exec(sql);
  }

  prepare(sql: string) {
    return {
      run: async (...args: any[]) => {
        const db = await this.getDb();
        return db.prepare(sql).run(...args);
      },
      get: async (...args: any[]) => {
        const db = await this.getDb();
        return db.prepare(sql).get(...args);
      },
      all: async (...args: any[]) => {
        const db = await this.getDb();
        return db.prepare(sql).all(...args);
      }
    };
  }

  async transaction(fn: (tx: any) => Promise<void>) {
    const db = await this.getDb();
    db.transaction(async () => {
        await fn({
            execute: async (sql: string, args: any[]) => db.prepare(sql).run(...args),
            run: async (sql: string, args: any[]) => db.prepare(sql).run(...args),
        });
    })();
  }
}

export const db = isTurso ? new LibsqlProvider() : new SqliteProvider();
export const isCloud = isTurso;
