import "dotenv/config";
import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import attendanceRouter from "./routes/attendance.routes.js";
import authRouter from "./routes/auth.routes.js";

const app = express();
const PORT = process.env["PORT"] ?? 4000;

app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/attendance", attendanceRouter);

// Global JSON error handler — always return JSON, never HTML
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  const message = err instanceof Error ? err.message : "Internal server error";
  res.status(500).json({ message });
});

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
