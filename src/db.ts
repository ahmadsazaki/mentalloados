import { createClient } from "@libsql/client";
import "dotenv/config";

const isTurso = !!process.env.TURSO_URL;

class LibsqlProvider {
  private client;
  constructor() {
    this.client = createClient({
      url: process.env.TURSO_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }

  async exec(sql: string) {
    await this.client.execute(sql);
  }

  prepare(sql: string) {
    return {
      run: async (...args: any[]) => await this.client.execute({ sql, args }),
      get: async (...args: any[]) => {
        const res = await this.client.execute({ sql, args });
        return res.rows[0];
      },
      all: async (...args: any[]) => {
        const res = await this.client.execute({ sql, args });
        return res.rows;
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
    // Basic implementation for SQLite transaction
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
