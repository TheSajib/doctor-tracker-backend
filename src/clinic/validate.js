import mongoose from "mongoose";
import { HttpError } from "../errors.js";
import { CONDITIONS, GENDERS, SPECIALIZATIONS } from "./constants.js";
import { rangeStart } from "./dates.js";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+[1-9]\d{9,14}$/;

export function cleanText(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

export function normalizeEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function normalizePhone(value) {
  return String(value ?? "").replace(/[\s()-]/g, "");
}

function fail(fields) {
  const message = Object.values(fields)[0];
  throw new HttpError(400, message, "validation_error", fields);
}

export function readDoctor(body) {
  const fields = {};
  const name = cleanText(body?.name);
  const specialization = String(body?.specialization ?? "").trim();
  const hospital = cleanText(body?.hospital);
  const phone = normalizePhone(body?.phone);
  const email = normalizeEmail(body?.email);

  if (name.length < 3) fields.name = "Name is too short";
  else if (name.length > 80) fields.name = "Name is too long";
  if (!SPECIALIZATIONS.includes(specialization)) fields.specialization = "Required";
  if (hospital.length < 2) fields.hospital = "Required";
  if (!PHONE.test(phone)) fields.phone = "Invalid phone";
  if (!EMAIL.test(email)) fields.email = "Invalid email";
  if (Object.keys(fields).length) fail(fields);

  return { name, specialization, hospital, phone, email };
}

export function readPatient(body) {
  const fields = {};
  const name = cleanText(body?.name);
  const gender = body?.gender;
  const age = Number(body?.age);
  const phone = normalizePhone(body?.phone);
  const condition = body?.condition;
  const doctorId = String(body?.doctorId ?? "");
  const notes = String(body?.notes ?? "").trim();

  if (name.length < 3) fields.name = "Name is too short";
  else if (name.length > 80) fields.name = "Name is too long";
  if (!GENDERS.includes(gender)) fields.gender = "Required";
  if (!Number.isInteger(age) || age < 0 || age > 120) fields.age = "Enter a valid age";
  if (!PHONE.test(phone)) fields.phone = "Invalid phone";
  if (!CONDITIONS.includes(condition)) fields.condition = "Required";
  if (!mongoose.isValidObjectId(doctorId)) {
    fields.doctorId = "Assign a doctor who is already in the network.";
  }
  if (notes.length > 500) fields.notes = "Keep notes under 500 characters";
  if (Object.keys(fields).length) fail(fields);

  return { name, gender, age, phone, condition, doctorId, notes };
}

export function readListQuery(query, defaultLimit) {
  const pageNumber = Number(query.page);
  const limitNumber = Number(query.limit);
  const page = Number.isInteger(pageNumber) && pageNumber > 0 ? pageNumber : 1;
  const requested =
    Number.isInteger(limitNumber) && limitNumber > 0 ? limitNumber : defaultLimit;
  return {
    page,
    pageSize: Math.min(requested, 100),
    search: String(query.search ?? "").trim(),
    range: query.range ? String(query.range) : "any",
  };
}

export function assertRange(range, today) {
  const start = rangeStart(range, today);
  if (start === undefined) {
    throw new HttpError(400, "Unknown date range.", "validation_error");
  }
  return start;
}
