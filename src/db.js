import mongoose from "mongoose";

export function connectDb(uri) {
  mongoose.set("strictQuery", true);
  return mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
}
