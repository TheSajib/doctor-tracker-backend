import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { HttpError } from "../errors.js";
import { Session } from "../models/session.js";
import { User, toPublicUser } from "../models/user.js";
import { normalizeEmail, readLogin, readSignup } from "./validate.js";

let dummyHashPromise;

function dummyHash(rounds) {
  dummyHashPromise ??= bcrypt.hash("dummy-password-value", rounds);
  return dummyHashPromise;
}

export async function issueSession(user, config) {
  const jti = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + config.sessionTtlMs);
  await Session.create({ jti, userId: user._id, expiresAt });
  const token = jwt.sign({ sub: String(user._id) }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
    jwtid: jti,
    issuer: "doctor-tracker",
  });
  return { token, user: toPublicUser(user) };
}

export async function signup(body, config) {
  const input = readSignup(body);
  const passwordHash = await bcrypt.hash(input.password, config.bcryptRounds);
  try {
    const user = await User.create({
      name: input.name,
      email: input.email,
      passwordHash,
    });
    return issueSession(user, config);
  } catch (error) {
    if (error?.code === 11000) {
      throw new HttpError(
        409,
        "An account with this email already exists.",
        "email_taken",
      );
    }
    throw error;
  }
}

export async function login(body, config) {
  const input = readLogin(body);
  const user = await User.findOne({ email: input.email }).select("+passwordHash");
  const hash = user?.passwordHash ?? (await dummyHash(config.bcryptRounds));
  const matches = await bcrypt.compare(input.password, hash);
  if (!user || !matches) {
    throw new HttpError(
      401,
      "Email or password is incorrect.",
      "invalid_credentials",
    );
  }
  return issueSession(user, config);
}

export async function authenticate(token, config) {
  if (!token) {
    throw new HttpError(401, "Sign in required.", "unauthorized");
  }

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret, { issuer: "doctor-tracker" });
  } catch (error) {
    if (error?.name === "TokenExpiredError") {
      throw new HttpError(
        401,
        "Session expired. Sign in again.",
        "session_expired",
      );
    }
    throw new HttpError(401, "Sign in required.", "unauthorized");
  }

  const session = await Session.findOne({ jti: payload.jti });
  if (
    !session ||
    session.revokedAt ||
    session.expiresAt.getTime() <= Date.now()
  ) {
    throw new HttpError(
      401,
      "Session expired. Sign in again.",
      "session_expired",
    );
  }

  const user = await User.findById(payload.sub);
  if (!user) {
    throw new HttpError(401, "Sign in required.", "unauthorized");
  }

  return { user: toPublicUser(user), jti: payload.jti };
}

export async function revokeSession(jti) {
  await Session.updateOne(
    { jti, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
}

export async function seedDemoUser(config) {
  const email = normalizeEmail(config.seed.email);
  const existing = await User.findOne({ email });
  if (existing) return existing;
  const passwordHash = await bcrypt.hash(
    config.seed.password,
    config.bcryptRounds,
  );
  return User.create({
    name: config.seed.name,
    email,
    passwordHash,
  });
}
