import mongoose from "mongoose";
import { createApp } from "./app.js";
import { getConfig } from "./config.js";
import { connectDb } from "./db.js";
import { seedDemoUser } from "./auth/service.js";
import { seedClinic } from "./clinic/seed.js";

const config = getConfig();

try {
  await connectDb(config.mongoUri);
} catch {
  console.error(
    "Could not connect to MongoDB. Check MONGODB_URI and start the database with: docker compose up -d",
  );
  process.exit(1);
}

await seedDemoUser(config);
await seedClinic();

const app = createApp(config);
const server = app.listen(config.port, () => {
  console.log(`Doctor Tracker API listening on http://localhost:${config.port}`);
});

async function shutdown() {
  server.close();
  await mongoose.disconnect();
  process.exit(0);
}

process.on("SIGINT", () => {
  void shutdown();
});
process.on("SIGTERM", () => {
  void shutdown();
});
