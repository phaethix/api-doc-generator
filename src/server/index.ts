import express from "express";
import cors from "cors";
import path from "path";
import { handleGenerate } from "./handlers/generate.ts";
import { handleHealth } from "./handlers/health.ts";

const app = express();
const PORT = 8080;

// Middleware
app.use(cors());
app.use(express.json({ limit: "5mb" }));

// Request logger
app.use((req, _res, next) => {
  const start = Date.now();
  _res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} → ${_res.statusCode} (${duration}ms)`);
  });
  next();
});

// API routes
app.get("/api/health", handleHealth);
app.post("/api/generate", handleGenerate);

// Serve static files (frontend build output)
const clientDist = path.resolve(process.cwd(), "dist/client");
app.use(express.static(clientDist));

// SPA fallback: serve index.html for non-API routes
app.get("*", (_req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

app.listen(PORT, () => {
  console.log(`🚀 API Doc Generator running on http://localhost:${PORT}`);
});
