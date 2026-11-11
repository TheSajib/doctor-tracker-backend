import dotenv from "dotenv";

dotenv.config();

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function requiredSecret() {
  const secret = process.env.JWT_SECRET ?? "";
  if (secret.length < 32 || secret.includes("replace-with")) {
    throw new Error(
      "Set JWT_SECRET in .env to a random string of at least 32 characters.",
    );
  }
  return secret;
}

export function getConfig() {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  return {
    nodeEnv,
    port: Number(process.env.PORT || 4000),
    mongoUri:
      process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/doctor-tracker",
    jwtSecret:
      nodeEnv === "test"
        ? process.env.JWT_SECRET || "test-only-secret-not-for-production-use"
        : requiredSecret(),
    jwtExpiresIn: "7d",
    sessionTtlMs: WEEK_MS,
    clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
    trustLocalhostOrigins: nodeEnv !== "production",
    bcryptRounds: nodeEnv === "test" ? 4 : 12,
    seed: {
      name: process.env.SEED_NAME || "Sajib",
      email: process.env.SEED_EMAIL || "sajibcse28@gmail.com",
      password: process.env.SEED_PASSWORD || "Admin@123",
    },
  };
}
