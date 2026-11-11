import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { createApp } from "../src/app.js";
import { seedDemoUser } from "../src/auth/service.js";
import { Session } from "../src/models/session.js";
import { User } from "../src/models/user.js";

const config = {
  nodeEnv: "test",
  jwtSecret: "test-only-secret-not-for-production-use!!",
  jwtExpiresIn: "7d",
  sessionTtlMs: 7 * 24 * 60 * 60 * 1000,
  clientOrigin: "http://localhost:3000",
  trustLocalhostOrigins: true,
  bcryptRounds: 4,
  seed: {
    name: "Sajib",
    email: "sajibcse28@gmail.com",
    password: "Admin@123",
  },
};

const signupBody = {
  name: "Amina Rahman",
  email: "amina@example.com",
  password: "Clinic#2026",
};

describe("authentication", () => {
  let mongo;
  let app;

  before(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
    app = createApp(config, { rateLimit: false });
  });

  after(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Session.deleteMany({});
  });

  it("creates an account and returns a session without the password", async () => {
    const response = await request(app).post("/auth/signup").send(signupBody);

    assert.equal(response.status, 201);
    assert.equal(typeof response.body.token, "string");
    assert.equal(response.body.user.email, "amina@example.com");
    assert.equal(response.body.user.name, "Amina Rahman");
    assert.equal(response.body.password, undefined);
    assert.equal(response.body.user.password, undefined);
    assert.equal(response.body.user.passwordHash, undefined);

    const stored = await User.findOne({ email: "amina@example.com" }).select(
      "+passwordHash",
    );
    assert.notEqual(stored.passwordHash, signupBody.password);
    assert.match(stored.passwordHash, /^\$2[aby]\$/);
  });

  it("rejects a short password and a duplicate email", async () => {
    const invalid = await request(app).post("/auth/signup").send({
      name: "A",
      email: "not-an-email",
      password: "short",
    });
    assert.equal(invalid.status, 400);
    assert.equal(invalid.body.code, "validation_error");
    assert.equal(invalid.body.fields.name, "Name is too short");
    assert.equal(invalid.body.fields.email, "Invalid email");
    assert.equal(invalid.body.fields.password, "Use at least 8 characters");

    await request(app).post("/auth/signup").send(signupBody);
    const duplicate = await request(app)
      .post("/auth/signup")
      .send({ ...signupBody, email: "Amina@Example.com" });
    assert.equal(duplicate.status, 409);
    assert.equal(
      duplicate.body.message,
      "An account with this email already exists.",
    );
  });

  it("logs in with a normalized email and rejects a wrong password", async () => {
    await request(app).post("/auth/signup").send(signupBody);

    const success = await request(app).post("/auth/login").send({
      email: "  Amina@Example.com ",
      password: signupBody.password,
    });
    assert.equal(success.status, 200);
    assert.equal(success.body.user.id.length > 0, true);

    const failure = await request(app).post("/auth/login").send({
      email: "missing@example.com",
      password: signupBody.password,
    });
    const wrong = await request(app).post("/auth/login").send({
      email: signupBody.email,
      password: "wrong-password",
    });
    assert.equal(failure.status, 401);
    assert.equal(wrong.status, 401);
    assert.equal(failure.body.message, wrong.body.message);
    assert.equal(failure.body.token, undefined);
  });

  it("requires a live session for protected routes and revokes it on logout", async () => {
    const created = await request(app).post("/auth/signup").send(signupBody);
    const token = created.body.token;

    const me = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${token}`);
    assert.equal(me.status, 200);
    assert.deepEqual(me.body.user, created.body.user);

    const missing = await request(app).get("/auth/me");
    assert.equal(missing.status, 401);
    assert.equal(missing.body.code, "unauthorized");

    const garbage = await request(app)
      .get("/auth/me")
      .set("Authorization", "Bearer not-a-token");
    assert.equal(garbage.status, 401);

    const hidden = await request(app).get("/doctors");
    assert.equal(hidden.status, 401);

    const unknown = await request(app)
      .get("/doctors")
      .set("Authorization", `Bearer ${token}`);
    assert.equal(unknown.status, 404);
    assert.equal(unknown.body.code, "not_found");

    const logout = await request(app)
      .post("/auth/logout")
      .set("Authorization", `Bearer ${token}`);
    assert.equal(logout.status, 204);
    assert.equal(logout.text, "");

    const afterLogout = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${token}`);
    assert.equal(afterLogout.status, 401);
    assert.equal(afterLogout.body.code, "session_expired");
  });

  it("keeps health public and limits repeated login attempts", async () => {
    const health = await request(app).get("/health");
    assert.equal(health.status, 200);
    assert.deepEqual(health.body, { status: "ok" });

    const limited = createApp(config, { rateLimitMax: 2 });
    await request(limited).post("/auth/login").send({
      email: "amina@example.com",
      password: "wrong-password",
    });
    await request(limited).post("/auth/login").send({
      email: "amina@example.com",
      password: "wrong-password",
    });
    const blocked = await request(limited).post("/auth/login").send({
      email: "amina@example.com",
      password: "wrong-password",
    });
    assert.equal(blocked.status, 429);
    assert.equal(blocked.body.code, "rate_limited");
  });

  it("seeds the demo account once", async () => {
    const first = await seedDemoUser(config);
    const second = await seedDemoUser(config);
    assert.equal(String(first._id), String(second._id));

    const login = await request(app).post("/auth/login").send({
      email: config.seed.email,
      password: config.seed.password,
    });
    assert.equal(login.status, 200);
    assert.equal(login.body.user.name, "Sajib");
  });
});
