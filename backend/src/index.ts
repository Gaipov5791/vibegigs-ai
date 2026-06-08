import "dotenv/config";
import express from "express";
import cors from "cors";
import { startAiWorker } from "./ai/aiWorker";
import { runPlatformParsers } from "./parser/parserScheduler";
import { jobsRouter } from "./routes/jobs";
import { statsRouter } from "./routes/stats";
import { profileRouter } from "./routes/profile";

const PARSE_INTERVAL_MS = 10 * 60 * 1000;

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: "*" }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/jobs", jobsRouter);
app.use("/api/stats", statsRouter);
app.use("/api/profile", profileRouter);

async function start() {
  startAiWorker();
  void runPlatformParsers();
  setInterval(() => void runPlatformParsers(), PARSE_INTERVAL_MS);

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log("CORS enabled for all origins");
  });
}

start();
