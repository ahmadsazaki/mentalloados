import { initApp } from "../server.js";

export default async (req: any, res: any) => {
  try {
    const app = await initApp();
    return app(req, res);
  } catch (e: any) {
    console.error("Vercel Serverless Initialization Error:", e);
    res.status(500).json({ 
      error: "Initialization Failed", 
      message: e.message,
      stack: process.env.NODE_ENV === 'development' ? e.stack : undefined,
      tip: "Please ensure TURSO_URL and TURSO_AUTH_TOKEN are set in your Vercel project environment variables."
    });
  }
};
