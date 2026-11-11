import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true, select: false },
  },
  { timestamps: true },
);

export const User = mongoose.models.User || mongoose.model("User", userSchema);

export function toPublicUser(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
  };
}
