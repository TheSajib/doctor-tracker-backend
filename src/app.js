import crypto from "node:crypto";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import mongoose from "mongoose";
import { asyncHandler } from "./async-handler.js";
import { authRoutes, protectedAuthRoutes } from "./auth/routes.js";
import { requireAuth } from "./auth/require-auth.js";
import { errorHandler } from "./errors.js";

function originAllowed(origin, config) {
  if (!origin || origin === config.clientOrigin) return true;
  if (!config.trustLocalhostOrigins) return false;
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

export function createApp(config, options = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.locals.config = config;

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );
  app.use(
    cors({
      origin(origin, callback) {
        callback(null, originAllowed(origin, config));
      },
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Authorization", "Content-Type"],
    }),
  );
  app.use(express.json({ limit: "16kb" }));

  if (config.nodeEnv !== "test") {
    app.use((req, res, next) => {
      const requestId = crypto.randomUUID();
      const started = Date.now();
      res.setHeader("X-Request-Id", requestId);
      res.on("finish", () => {
        console.log(
          JSON.stringify({
            requestId,
            method: req.method,
            path: req.originalUrl,
            status: res.statusCode,
            ms: Date.now() - started,
          }),
        );
      });
      next();
    });
  }

  app.get(
    "/health",
    asyncHandler(async (_req, res) => {
      if (mongoose.connection.readyState !== 1) {
        res.status(503).json({ message: "Database unavailable.", code: "unavailable" });
        return;
      }
      res.json({ status: "ok" });
    }),
  );

  app.use("/auth", authRoutes(config, options));

  // Every path after the public auth and health routes requires a live session.
  app.use(requireAuth(config));
  app.use("/auth", protectedAuthRoutes());

  app.use((_req, res) => {
    res.status(404).json({ message: "Not found.", code: "not_found" });
  });
  app.use(errorHandler);

  return app;
}
