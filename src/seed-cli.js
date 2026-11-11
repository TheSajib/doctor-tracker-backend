import mongoose from "mongoose";
import { seedDemoUser } from "./auth/service.js";
import { getConfig } from "./config.js";
import { connectDb } from "./db.js";

const config = getConfig();

try {
  await connectDb(config.mongoUri);
  const user = await seedDemoUser(config);
  console.log(`Demo account ready for ${user.email}`);
} catch {
  console.error(
    "Could not seed the demo account. Check MONGODB_URI and that MongoDB is running.",
  );
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
