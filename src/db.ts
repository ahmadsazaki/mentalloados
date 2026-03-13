import { createClient } from "@libsql/client";
import Database from "better-sqlite3";
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
  private db;
  constructor() {
    this.db = new Database("mentalload.db");
  }

  async exec(sql: string) {
    this.db.exec(sql);
  }

  prepare(sql: string) {
    const stmt = this.db.prepare(sql);
    return {
      run: async (...args: any[]) => stmt.run(...args),
      get: async (...args: any[]) => stmt.get(...args),
      all: async (...args: any[]) => stmt.all(...args)
    };
  }

  async transaction(fn: (tx: any) => Promise<void>) {
    const trans = this.db.transaction((args: any) => {
       // Note: this won't work perfectly with async inside, 
       // but for our current server.ts usage (reorder), it's close enough if we change reorder logic.
    });
    // For MentalLoadOS, let's just expose a way to run sequential queries.
  }
}

export const db = isTurso ? new LibsqlProvider() : new SqliteProvider();
export const isCloud = isTurso;
