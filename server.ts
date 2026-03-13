import express from "express";
import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import { google } from "googleapis";
import multer from "multer";
import fs from "fs";
import { db, isCloud } from "./src/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

async function initializeDb() {
  // Initialize DB
  await db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      max_capacity INTEGER DEFAULT 50
    );
    CREATE TABLE IF NOT EXISTS tokens (
      id TEXT PRIMARY KEY,
      access_token TEXT,
      refresh_token TEXT,
      expiry_date INTEGER
    );
  `);

  // Seed default categories if empty
  const catCount = await db.prepare("SELECT COUNT(*) as count FROM categories").get() as { count: number };
  if (catCount.count === 0) {
    const defaults = [
      { id: 'work', name: 'Work', color: '#4F6BED', max_capacity: 50 },
      { id: 'family', name: 'Family', color: '#6BCB77', max_capacity: 30 },
      { id: 'finance', name: 'Finance', color: '#F4A261', max_capacity: 20 },
      { id: 'health', name: 'Health', color: '#E63946', max_capacity: 30 },
      { id: 'admin', name: 'Admin', color: '#8E9299', max_capacity: 20 },
      { id: 'social', name: 'Social', color: '#A061F4', max_capacity: 20 }
    ];
    for (const c of defaults) {
      await db.prepare("INSERT INTO categories (id, name, color, max_capacity) VALUES (?, ?, ?, ?)").run(c.id, c.name, c.color, c.max_capacity);
    }
  }

  // Migration for categories table
  if (!isCloud) {
    const currentCategoriesInfo = await db.prepare("PRAGMA table_info(categories)").all() as any[];
    if (!currentCategoriesInfo.some(col => col.name === 'max_capacity')) {
      await db.exec("ALTER TABLE categories ADD COLUMN max_capacity INTEGER DEFAULT 50");
    }
  }

  // Migration: Check if tasks table needs update
  let tableInfo: any[] = [];
  if (!isCloud) {
    tableInfo = await db.prepare("PRAGMA table_info(tasks)").all() as any[];
  }
  
  const hasCategoryId = tableInfo.some(col => col.name === 'category_id');

  if (tableInfo.length > 0 && !hasCategoryId) {
    console.log("Migrating tasks table to new schema...");
    // LibSQL doesn't support easy transactions the same way here, 
    // but for deployment we assume the target DB is clean or already migrated.
    // This part is mostly for local legacy support.
    await db.exec("ALTER TABLE tasks RENAME TO tasks_old");
    await db.exec(`
      CREATE TABLE tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        category_id TEXT NOT NULL,
        effort_score INTEGER DEFAULT 5,
        urgency_score INTEGER DEFAULT 5,
        decision_score INTEGER DEFAULT 4,
        coordination_score REAL DEFAULT 0,
        worry_score INTEGER DEFAULT 0,
        cognitive_load_score REAL DEFAULT 0,
        completed INTEGER DEFAULT 0,
        archived INTEGER DEFAULT 0,
        deleted INTEGER DEFAULT 0,
        sort_order REAL DEFAULT 0,
        due_date TEXT,
        notes TEXT,
        raw_context TEXT,
        attachments TEXT,
        recurrence_rule TEXT,
        last_reset_date TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(category_id) REFERENCES categories(id)
      )
    `);
    await db.exec(`
      INSERT INTO tasks (id, title, description, category_id, effort_score, urgency_score, decision_score, coordination_score, worry_score, cognitive_load_score, completed, archived, deleted, sort_order, created_at)
      SELECT id, title, description, 'work', effort_score, urgency_score, decision_score, coordination_score, worry_score, cognitive_load_score, completed, 0, 0, 0, created_at
      FROM tasks_old
    `);
    await db.exec("DROP TABLE tasks_old");
  } else if (tableInfo.length === 0) {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        category_id TEXT NOT NULL,
        effort_score INTEGER DEFAULT 5,
        urgency_score INTEGER DEFAULT 5,
        decision_score INTEGER DEFAULT 4,
        coordination_score REAL DEFAULT 0,
        worry_score INTEGER DEFAULT 0,
        cognitive_load_score REAL DEFAULT 0,
        completed INTEGER DEFAULT 0,
        archived INTEGER DEFAULT 0,
        deleted INTEGER DEFAULT 0,
        sort_order REAL DEFAULT 0,
        due_date TEXT,
        notes TEXT,
        raw_context TEXT,
        attachments TEXT,
        recurrence_rule TEXT,
        last_reset_date TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(category_id) REFERENCES categories(id)
      )
    `);
  }

  // Column migrations
  if (!isCloud) {
    const currentTasksInfo = await db.prepare("PRAGMA table_info(tasks)").all() as any[];
    const taskColumns = [
      { name: 'archived', type: 'INTEGER DEFAULT 0' },
      { name: 'deleted', type: 'INTEGER DEFAULT 0' },
      { name: 'sort_order', type: 'REAL DEFAULT 0' },
      { name: 'due_date', type: 'TEXT' },
      { name: 'notes', type: 'TEXT' },
      { name: 'raw_context', type: 'TEXT' },
      { name: 'attachments', type: 'TEXT' },
      { name: 'recurrence_rule', type: 'TEXT' },
      { name: 'last_reset_date', type: 'TEXT' }
    ];

    for (const col of taskColumns) {
      if (!currentTasksInfo.some(c => c.name === col.name)) {
        console.log(`Adding missing column ${col.name} to tasks table...`);
        await db.exec(`ALTER TABLE tasks ADD COLUMN ${col.name} ${col.type}`);
      }
    }
  }

  await db.exec(`
    CREATE TABLE IF NOT EXISTS user_profile (
      id TEXT PRIMARY KEY,
      name TEXT,
      daily_capacity INTEGER DEFAULT 120,
      ai_provider TEXT DEFAULT 'openrouter',
      ai_model TEXT DEFAULT 'openrouter/auto',
      openrouter_api_key TEXT
    );
  `);
  
  if (!isCloud) {
    const profileInfo = await db.prepare("PRAGMA table_info(user_profile)").all() as any[];
    if (!profileInfo.some(col => col.name === 'ai_provider')) {
      await db.exec("ALTER TABLE user_profile ADD COLUMN ai_provider TEXT DEFAULT 'openrouter'");
    }
    if (!profileInfo.some(col => col.name === 'ai_model')) {
      await db.exec("ALTER TABLE user_profile ADD COLUMN ai_model TEXT DEFAULT 'openrouter/auto'");
    }
    if (!profileInfo.some(col => col.name === 'openrouter_api_key')) {
      await db.exec("ALTER TABLE user_profile ADD COLUMN openrouter_api_key TEXT");
    }
  }
}


export async function initApp() {
  try {
    await initializeDb();
  } catch (error) {
    console.warn("⚠️ Database initialization failed. Some features (Google Auth, Calendar) may be limited.");
    console.warn(error);
  }
  const app = express();
  const PORT = process.env.PORT || 3001;

  app.use(express.json());

  const getOAuthClient = () => {
    return new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.APP_URL}/auth/google/callback`
    );
  };

  // Google OAuth Routes
  app.get("/api/auth/google/url", (req, res) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.status(400).json({ 
        error: "Missing Configuration", 
        message: "Google Client ID or Client Secret is not configured in the environment variables." 
      });
    }

    const { scopes } = req.query;
    const oauth2Client = getOAuthClient();
    
    const defaultScopes = [
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email"
    ];

    const requestedScopes = scopes ? (scopes as string).split(',') : [];
    const finalScopes = [...new Set([...defaultScopes, ...requestedScopes])];

    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: finalScopes,
      prompt: "consent"
    });
    res.json({ url });
  });

  app.get("/auth/google/callback", async (req, res) => {
    const { code } = req.query;
    const oauth2Client = getOAuthClient();
    try {
      const { tokens } = await oauth2Client.getToken(code as string);
      
      await db.prepare(`
        INSERT OR REPLACE INTO tokens (id, access_token, refresh_token, expiry_date)
        VALUES (?, ?, ?, ?)
      `).run("google", tokens.access_token, tokens.refresh_token, tokens.expiry_date);

      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("Error exchanging code for tokens", error);
      res.status(500).send("Authentication failed");
    }
  });

  app.get("/api/auth/google/status", async (req, res) => {
    try {
      const token = await db.prepare("SELECT * FROM tokens WHERE id = ?").get("google");
      res.json({ connected: !!token });
    } catch (e) {
      res.json({ connected: false });
    }
  });

  app.post("/api/ai/coach", async (req, res) => {
    try {
      const { task, history = [], userInput, apiKey: bodyApiKey } = req.body;
      console.log("AI Coach: Received request for task:", task?.title);
      console.log("AI Coach: Body Key provided:", !!bodyApiKey);
      if (!task) throw new Error("Task context is missing");
      if (!userInput) throw new Error("User input is missing");

      let profile: any = { ai_provider: 'openrouter', ai_model: 'openrouter/free', openrouter_api_key: null };
      try {
        const dbProfile = await db.prepare("SELECT * FROM user_profile LIMIT 1").get() as any;
        if (dbProfile) profile = dbProfile;
      } catch (e) {
        console.warn("AI Coach: Using default profile settings due to database unavailability.");
      }
      
      // Construct prompt
      const systemPrompt = `You are a Fikr Coach, a cognitive support AI for MentalLoadOS. 
Your goal is to help users manage their mental load by breaking down complex tasks, offering CBT-based encouragement, and providing practical productivity tips.
The current task is: "${task.title}". 
Task Details: ${task.description || 'No description provided.'}
Cognitive Load: ${(task.cognitive_load_score || 0).toFixed(1)}

Be concise, empathetic, and action-oriented. If the user seems overwhelmed, help them find the "smallest possible next step".`;

      const messages = [
        { role: 'system', content: systemPrompt },
        ...history.map((m: any) => ({ role: m.role, content: m.content })),
        { role: 'user', content: userInput }
      ];

      let reply = '';
      if (profile.ai_provider === 'gemini') {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error("GEMINI_API_KEY is not set in environment. Please add it to .env");

        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(messages.map(m => m.content).join('\n'));
        reply = result.response.text();
      } else {
        const apiKey = bodyApiKey || profile.openrouter_api_key || process.env.OPENROUTER_API_KEY;
        console.log("AI Coach: Final API Key source:", bodyApiKey ? "Body" : (profile.openrouter_api_key ? "DB" : (process.env.OPENROUTER_API_KEY ? "ENV" : "NONE")));
        
        if (!apiKey) throw new Error("OpenRouter API Key is missing. Please set it in Settings.");

        console.log("Calling OpenRouter with model:", profile.ai_model);
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "MentalLoadOS",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: profile.ai_model || "openrouter/auto",
            messages
          })
        });

        const data = await response.json();
        if (!response.ok) {
          console.error("OpenRouter API Error:", data);
          throw new Error(data.error?.message || `API returned ${response.status}`);
        }

        if (!data.choices || !data.choices[0]) {
          console.error("OpenRouter invalid response:", data);
          throw new Error("No response choices returned from AI");
        }
        reply = data.choices[0].message.content;
      }
      res.json({ reply });
    } catch (error: any) {
      console.error("Coaching AI error:", error);
      res.status(500).json({ error: "AI failed", details: error.message });
    }
  });

  app.post("/api/auth/google/disconnect", async (req, res) => {
    await db.prepare("DELETE FROM tokens WHERE id = ?").run("google");
    res.json({ success: true });
  });

  app.post("/api/calendar/events", async (req, res) => {
    try {
      const tokenRecord = await db.prepare("SELECT * FROM tokens WHERE id = ?").get("google") as { access_token: string, refresh_token: string, expiry_date: number };
      if (!tokenRecord) {
        return res.status(401).json({ error: "Google not connected" });
      }

      const { summary, description, startDateTime, endDateTime } = req.body;
      
      const oauth2Client = getOAuthClient();
      oauth2Client.setCredentials({
        access_token: tokenRecord.access_token,
        refresh_token: tokenRecord.refresh_token,
        expiry_date: tokenRecord.expiry_date
      });

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      const eventRes = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
          summary,
          description,
          start: { dateTime: startDateTime },
          end: { dateTime: endDateTime }
        }
      });
      res.json({ success: true, event: eventRes.data });
    } catch (error: any) {
      console.error("Google Calendar error:", error);
      res.status(500).json({ error: "Failed to create event", details: error.message || "Database or API unavailable" });
    }
  });

  // API Routes - Categories
  app.get("/api/categories", async (req, res) => {
    const categories = await db.prepare("SELECT * FROM categories").all();
    res.json(categories);
  });

  app.post("/api/categories", async (req, res) => {
    const { id, name, color, max_capacity } = req.body;
    await db.prepare("INSERT INTO categories (id, name, color, max_capacity) VALUES (?, ?, ?, ?)").run(id, name, color, max_capacity || 50);
    res.json({ success: true });
  });

  app.patch("/api/categories/:id", async (req, res) => {
    const { name, color, max_capacity } = req.body;
    await db.prepare("UPDATE categories SET name = ?, color = ?, max_capacity = ? WHERE id = ?").run(name, color, max_capacity || 50, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/categories/:id", async (req, res) => {
    // Reassign tasks to 'admin' or first available category before deleting? 
    // Or just delete tasks. Let's reassign to 'admin' if it exists, else first.
    const firstCat = await db.prepare("SELECT id FROM categories WHERE id != ? LIMIT 1").get(req.params.id) as { id: string };
    if (firstCat) {
      await db.prepare("UPDATE tasks SET category_id = ? WHERE category_id = ?").run(firstCat.id, req.params.id);
    }
    await db.prepare("DELETE FROM categories WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // API Routes - Tasks
  app.get("/api/tasks", async (req, res) => {
    const includeArchived = req.query.includeArchived === 'true';
    const includeDeleted = req.query.includeDeleted === 'true';
    
    let query = `
      SELECT tasks.*, categories.name as category_name, categories.color as category_color 
      FROM tasks 
      JOIN categories ON tasks.category_id = categories.id
    `;
    
    const conditions = [];
    if (!includeDeleted) {
      conditions.push("deleted = 0");
    } else {
      conditions.push("deleted = 1");
    }

    if (!includeArchived && !includeDeleted) {
      conditions.push("archived = 0");
    } else if (includeArchived) {
      conditions.push("archived = 1");
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY tasks.sort_order ASC, tasks.cognitive_load_score DESC";
    
    const tasks = await db.prepare(query).all();
    res.json(tasks.map((t: any) => ({ ...t, completed: !!t.completed, archived: !!t.archived, deleted: !!t.deleted })));
  });

  app.use('/uploads', express.static('uploads'));

  app.post("/api/upload", upload.array('files'), (req, res) => {
    const files = req.files as Express.Multer.File[];
    const paths = files.map(f => `/uploads/${f.filename}`);
    res.json({ paths });
  });

  app.post("/api/tasks", async (req, res) => {
    const { id, title, description, category_id, effort_score, urgency_score, decision_score, coordination_score, worry_score, cognitive_load_score, due_date, notes, raw_context, attachments, sort_order, recurrence_rule, last_reset_date } = req.body;
    await db.prepare(`
      INSERT INTO tasks (id, title, description, category_id, effort_score, urgency_score, decision_score, coordination_score, worry_score, cognitive_load_score, completed, archived, deleted, sort_order, due_date, notes, raw_context, attachments, recurrence_rule, last_reset_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, title, description, category_id, effort_score, urgency_score, decision_score, coordination_score, worry_score, cognitive_load_score, sort_order || 0, due_date, notes, raw_context, attachments, recurrence_rule, last_reset_date);
    res.json({ success: true });
  });

  app.patch("/api/tasks/reorder", async (req, res) => {
    const items = req.body as { id: string, sort_order: number }[];
    for (const item of items) {
      await db.prepare("UPDATE tasks SET sort_order = ? WHERE id = ?").run(item.sort_order, item.id);
    }
    res.json({ success: true });
  });

  app.patch("/api/tasks/bulk", async (req, res) => {
    const { ids, updates } = req.body;
    if (!ids || ids.length === 0) return res.json({ success: true });
    
    const fields = Object.keys(updates);
    if (fields.length === 0) return res.json({ success: true });

    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => {
      if (typeof updates[f] === 'boolean') return updates[f] ? 1 : 0;
      return updates[f];
    });

    const placeholders = ids.map(() => '?').join(',');
    const query = `UPDATE tasks SET ${setClause} WHERE id IN (${placeholders})`;
    
    await db.prepare(query).run(...values, ...ids);
    res.json({ success: true });
  });

  app.delete("/api/tasks/bulk", async (req, res) => {
    const { ids, permanent } = req.body;
    if (!ids || ids.length === 0) return res.json({ success: true });

    const placeholders = ids.map(() => '?').join(',');
    if (permanent) {
      await db.prepare(`DELETE FROM tasks WHERE id IN (${placeholders})`).run(...ids);
    } else {
      await db.prepare(`UPDATE tasks SET deleted = 1 WHERE id IN (${placeholders})`).run(...ids);
    }
    res.json({ success: true });
  });

  app.patch("/api/tasks/:id", async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    
    const fields = Object.keys(updates).filter(k => k !== 'id');
    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => {
      if (typeof updates[f] === 'boolean') return updates[f] ? 1 : 0;
      return updates[f];
    });

    await db.prepare(`UPDATE tasks SET ${setClause} WHERE id = ?`).run(...values, id);
    res.json({ success: true });
  });

  app.post("/api/tasks/:id/restore", async (req, res) => {
    await db.prepare("UPDATE tasks SET deleted = 0 WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    const permanent = req.query.permanent === 'true';
    if (permanent) {
      await db.prepare("DELETE FROM tasks WHERE id = ?").run(req.params.id);
    } else {
      await db.prepare("UPDATE tasks SET deleted = 1 WHERE id = ?").run(req.params.id);
    }
    res.json({ success: true });
  });

  app.get("/api/profile", async (req, res) => {
    let profile = await db.prepare("SELECT * FROM user_profile LIMIT 1").get();
    if (!profile) {
      const id = "default-user";
      await db.prepare("INSERT INTO user_profile (id, name, daily_capacity, ai_provider, ai_model, openrouter_api_key) VALUES (?, ?, ?, ?, ?, ?)").run(id, "User", 120, 'openrouter', 'openrouter/free', null);
      profile = { id, name: "User", daily_capacity: 120, ai_provider: 'openrouter', ai_model: 'openrouter/free', openrouter_api_key: null };
    }
    res.json(profile);
  });

  app.patch("/api/profile", async (req, res) => {
    const { name, daily_capacity, ai_provider, ai_model, openrouter_api_key } = req.body;
    const current = await db.prepare("SELECT * FROM user_profile LIMIT 1").get() as any;
    
    await db.prepare(`
      UPDATE user_profile 
      SET name = ?, daily_capacity = ?, ai_provider = ?, ai_model = ?, openrouter_api_key = ?
      WHERE id = ?
    `).run(
      name ?? current.name,
      daily_capacity ?? current.daily_capacity,
      ai_provider ?? current.ai_provider,
      ai_model ?? current.ai_model,
      openrouter_api_key === undefined ? current.openrouter_api_key : openrouter_api_key,
      current.id
    );
    res.json({ success: true });
  });

  // Error handler
  app.use((err: any, req: any, res: any, next: any) => {
    console.error(err.stack);
    res.status(500).json({ error: err.message });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
    app.listen(Number(PORT), "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }

  return app;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  initApp();
}

