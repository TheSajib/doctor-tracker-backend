import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { createApp } from "../src/app.js";
import { Doctor } from "../src/models/doctor.js";
import { Patient } from "../src/models/patient.js";

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

const doctorBody = {
  name: "Dr. Nabila Chowdhury",
  specialization: "Cardiology",
  hospital: "Square Hospital",
  phone: "+8801711112233",
  email: "nabila@square.com",
};

describe("doctors and patients", () => {
  let mongo;
  let app;
  let token;

  before(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
    app = createApp(config, { rateLimit: false });
    const signup = await request(app).post("/auth/signup").send({
      name: "Clinic Admin",
      email: "clinic.admin@example.com",
      password: "Clinic#2026",
    });
    token = signup.body.token;
  });

  after(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  beforeEach(async () => {
    await Doctor.deleteMany({});
    await Patient.deleteMany({});
  });

  function authed(method, url) {
    return request(app)[method](url).set("Authorization", `Bearer ${token}`);
  }

  it("rejects clinic routes without a session", async () => {
    const response = await request(app).get("/doctors");
    assert.equal(response.status, 401);
    assert.equal(response.body.code, "unauthorized");
  });

  it("creates, lists, and fetches a doctor with a caseload", async () => {
    const created = await authed("post", "/doctors").send(doctorBody);
    assert.equal(created.status, 201);
    assert.equal(created.body.email, "nabila@square.com");
    assert.equal(created.body.password, undefined);
    assert.match(created.body.joinedAt, /^\d{4}-\d{2}-\d{2}$/);

    const duplicate = await authed("post", "/doctors").send({
      ...doctorBody,
      email: "Nabila@Square.com",
    });
    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.body.message, "A doctor with this email already exists.");

    const invalid = await authed("post", "/doctors").send({
      ...doctorBody,
      email: "other@square.com",
      phone: "01711112233",
    });
    assert.equal(invalid.status, 400);
    assert.equal(invalid.body.fields.phone, "Invalid phone");

    const list = await authed("get", "/doctors").query({ search: "nabila", page: 1, limit: 6 });
    assert.equal(list.status, 200);
    assert.equal(list.body.total, 1);
    assert.equal(list.body.items[0].patientCount, 0);
    assert.equal(list.body.from, 1);
    assert.equal(list.body.to, 1);

    const one = await authed("get", `/doctors/${created.body.id}`);
    assert.equal(one.status, 200);
    assert.equal(one.body.patientCount, 0);

    const missing = await authed("get", "/doctors/507f1f77bcf86cd799439011");
    assert.equal(missing.status, 404);
  });

  it("creates, updates, filters, and deletes a patient without changing admission date", async () => {
    const doctor = await authed("post", "/doctors").send(doctorBody);
    const created = await authed("post", "/patients").send({
      name: "Salma Khan",
      gender: "Female",
      age: 45,
      phone: "+8801712345678",
      condition: "Critical",
      doctorId: doctor.body.id,
      notes: "Admitted this morning",
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.doctorId, doctor.body.id);
    assert.equal(created.body.notes, "Admitted this morning");

    const orphan = await authed("post", "/patients").send({
      name: "Salma Khan",
      gender: "Female",
      age: 45,
      phone: "+8801712345678",
      condition: "Stable",
      doctorId: "507f1f77bcf86cd799439011",
      notes: "",
    });
    assert.equal(orphan.status, 400);
    assert.equal(orphan.body.message, "Assign a doctor who is already in the network.");

    const listed = await authed("get", "/patients").query({
      doctorId: doctor.body.id,
      condition: "Critical",
      search: "salma",
    });
    assert.equal(listed.status, 200);
    assert.equal(listed.body.total, 1);
    assert.equal(listed.body.items[0].doctorName, "Dr. Nabila Chowdhury");

    const updated = await authed("patch", `/patients/${created.body.id}`).send({
      name: "Salma Khan",
      gender: "Female",
      age: 46,
      phone: "+8801712345678",
      condition: "Recovering",
      doctorId: doctor.body.id,
      notes: "Improving",
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.condition, "Recovering");
    assert.equal(updated.body.admittedAt, created.body.admittedAt);
    assert.equal(updated.body.age, 46);

    const caseload = await authed("get", `/doctors/${doctor.body.id}`);
    assert.equal(caseload.body.patientCount, 1);

    const removed = await authed("delete", `/patients/${created.body.id}`);
    assert.equal(removed.status, 204);
    const after = await authed("get", `/doctors/${doctor.body.id}`);
    assert.equal(after.body.patientCount, 0);
    const gone = await authed("delete", `/patients/${created.body.id}`);
    assert.equal(gone.status, 404);
  });

  it("lists the latest doctor and patient first", async () => {
    const earlierDoctor = await authed("post", "/doctors").send(doctorBody);
    const laterDoctor = await authed("post", "/doctors").send({
      ...doctorBody,
      name: "Dr. Lina Karim",
      email: "lina@united.com",
      phone: "+8801711223344",
    });
    const doctors = await authed("get", "/doctors");
    assert.equal(doctors.body.items[0].id, laterDoctor.body.id);
    assert.equal(doctors.body.items[1].id, earlierDoctor.body.id);

    const earlierPatient = await authed("post", "/patients").send({
      name: "Karim Ali",
      gender: "Male",
      age: 40,
      phone: "+8801710000001",
      condition: "Stable",
      doctorId: laterDoctor.body.id,
      notes: "",
    });
    const laterPatient = await authed("post", "/patients").send({
      name: "Nusrat Test",
      gender: "Female",
      age: 34,
      phone: "+8801710000002",
      condition: "Stable",
      doctorId: laterDoctor.body.id,
      notes: "",
    });
    const patients = await authed("get", "/patients");
    assert.equal(patients.body.items[0].id, laterPatient.body.id);
    assert.equal(patients.body.items[1].id, earlierPatient.body.id);
  });

  it("builds dashboard totals from the same records", async () => {
    const doctor = await authed("post", "/doctors").send(doctorBody);
    await authed("post", "/patients").send({
      name: "Rahim Roy",
      gender: "Male",
      age: 48,
      phone: "+8801799988877",
      condition: "Critical",
      doctorId: doctor.body.id,
      notes: "",
    });

    const dashboard = await authed("get", "/dashboard");
    assert.equal(dashboard.status, 200);
    assert.equal(dashboard.body.totalDoctors, 1);
    assert.equal(dashboard.body.totalPatients, 1);
    assert.equal(dashboard.body.criticalCases, 1);
    assert.equal(dashboard.body.newPatients7d, 1);
    assert.equal(dashboard.body.avgPerDoctor, 1);
    assert.equal(dashboard.body.registrations.length, 30);
    assert.equal(
      dashboard.body.conditions.find((item) => item.condition === "Critical").count,
      1,
    );
    assert.equal(dashboard.body.patientsPerDoctor[0].count, 1);
    assert.equal(dashboard.body.patientsPerDoctor[0].name, "Dr. Nabila Chowdhury");
  });
});
