import express from "express";
import cors from "cors";
import "dotenv/config";
import { config } from "./config";
import chatRoutes from "./routes/chat";
import { errorHandler } from "./middleware/errorHandler";
import { getMasterAgent } from "./agents/masterAgent";
import { closeSqlDataSource } from "./db/sqlConnection";

const app = express();

// ── Middleware ────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// ── Health Check ──────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: config.server.nodeEnv,
  });
});

// ── Routes ────────────────────────────────────────────────────
app.use("/api", chatRoutes);

// ── Error Handler (must be last) ──────────────────────────────
app.use(errorHandler);

// ── Start Server ──────────────────────────────────────────────
async function start(): Promise<void> {
  try {
    console.log("🚀 Starting Agentic Q&A Server...");
    console.log(`📦 Environment: ${config.server.nodeEnv}`);

    // Pre-warm the agent (establishes DB connection + loads schema)
    await getMasterAgent();

    const server = app.listen(config.server.port, () => {
      console.log(`\n✅ Server running at http://localhost:${config.server.port}`);
      console.log(`📋 Health check: http://localhost:${config.server.port}/health`);
      console.log(`💬 Chat API:     POST http://localhost:${config.server.port}/api/chat`);
      console.log("\nReady to answer questions! 🎯\n");
    });

    // ── Graceful Shutdown ────────────────────────────────────
    const shutdown = async (signal: string) => {
      console.log(`\n⚠️  ${signal} received. Shutting down gracefully...`);
      server.close(async () => {
        await closeSqlDataSource();
        console.log("👋 Server shut down cleanly");
        process.exit(0);
      });
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

start();
