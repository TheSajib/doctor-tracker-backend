import { HttpError } from "../errors.js";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function cleanName(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

export function readLogin(body) {
  const email = normalizeEmail(body?.email);
  const password = typeof body?.password === "string" ? body.password : "";
  if (!email || !password || password.length > 72) {
    throw new HttpError(
      401,
      "Email or password is incorrect.",
      "invalid_credentials",
    );
  }
  return { email, password };
}

export function readSignup(body) {
  const fields = {};
  const name = cleanName(body?.name);
  const email = normalizeEmail(body?.email);
  const password = typeof body?.password === "string" ? body.password : "";

  if (name.length < 2) fields.name = "Name is too short";
  else if (name.length > 80) fields.name = "Name is too long";

  if (!EMAIL.test(email) || email.length > 254) fields.email = "Invalid email";

  if (password.length < 8) fields.password = "Use at least 8 characters";
  else if (password.length > 72) fields.password = "Password is too long";

  const messages = Object.values(fields);
  if (messages.length) {
    throw new HttpError(400, messages[0], "validation_error", fields);
  }

  return { name, email, password };
}
