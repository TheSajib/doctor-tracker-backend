import { Router } from "express";
import rateLimit from "express-rate-limit";
import { asyncHandler } from "../async-handler.js";
import { login, revokeSession, signup } from "./service.js";

export function authRoutes(config, options = {}) {
  const router = Router();
  const limiter = rateLimit({
    windowMs: options.rateLimitWindowMs ?? 15 * 60 * 1000,
    limit: options.rateLimitMax ?? 20,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => options.rateLimit === false,
    message: {
      message: "Too many attempts. Try again later.",
      code: "rate_limited",
    },
  });

  router.post(
    "/login",
    limiter,
    asyncHandler(async (req, res) => {
      res.json(await login(req.body, config));
    }),
  );

  router.post(
    "/signup",
    limiter,
    asyncHandler(async (req, res) => {
      res.status(201).json(await signup(req.body, config));
    }),
  );

  return router;
}

export function protectedAuthRoutes() {
  const router = Router();

  router.get("/me", (req, res) => {
    res.json({ user: req.user });
  });

  router.post(
    "/logout",
    asyncHandler(async (req, res) => {
      await revokeSession(req.auth.jti);
      res.status(204).end();
    }),
  );

  return router;
}
