import mongoose from "mongoose";
import { HttpError } from "../errors.js";
import { Doctor, toDoctor, toDoctorRow } from "../models/doctor.js";
import { Patient, toPatient } from "../models/patient.js";
import { CONDITIONS, DOCTOR_PAGE_SIZE, PATIENT_PAGE_SIZE } from "./constants.js";
import { formatShortDate, isoDaysAgo, lastNDays, todayIso } from "./dates.js";
import { toPage } from "./page.js";
import { assertRange, readDoctor, readListQuery, readPatient } from "./validate.js";

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function objectId(id) {
  return new mongoose.Types.ObjectId(id);
}

async function doctorRows(match, page, pageSize) {
  const total = await Doctor.countDocuments(match);
  const pageResult = toPage([], total, page, pageSize);
  const doctors = await Doctor.aggregate([
    { $match: match },
    {
      $lookup: {
        from: "patients",
        localField: "_id",
        foreignField: "doctorId",
        as: "caseload",
      },
    },
    { $addFields: { patientCount: { $size: "$caseload" } } },
    { $project: { caseload: 0 } },
    { $sort: { joinedAt: -1, _id: -1 } },
    { $skip: (pageResult.page - 1) * pageSize },
    { $limit: pageSize },
  ]);
  return toPage(doctors.map(toDoctorRow), total, page, pageSize);
}

export async function listDoctors(query) {
  const { page, pageSize, search, range } = readListQuery(query, DOCTOR_PAGE_SIZE);
  const today = todayIso();
  const start = assertRange(range, today);
  const match = {};
  if (query.specialization && query.specialization !== "all") {
    match.specialization = String(query.specialization);
  }
  if (start) match.joinedAt = { $gte: start };
  if (search) {
    const pattern = new RegExp(escapeRegex(search), "i");
    match.$or = [
      { name: pattern },
      { hospital: pattern },
      { email: pattern },
      { phone: pattern },
      { specialization: pattern },
    ];
  }
  return doctorRows(match, page, pageSize);
}

export async function getDoctor(id) {
  if (!mongoose.isValidObjectId(id)) {
    throw new HttpError(404, "Doctor not found.", "not_found");
  }
  const page = await doctorRows({ _id: objectId(id) }, 1, 1);
  const doctor = page.items[0];
  if (!doctor) throw new HttpError(404, "Doctor not found.", "not_found");
  return doctor;
}

export async function createDoctor(body) {
  const input = readDoctor(body);
  try {
    const doctor = await Doctor.create({ ...input, joinedAt: todayIso() });
    return toDoctor(doctor);
  } catch (error) {
    if (error?.code === 11000) {
      throw new HttpError(
        409,
        "A doctor with this email already exists.",
        "email_taken",
      );
    }
    throw error;
  }
}

async function requireDoctor(doctorId) {
  const doctor = await Doctor.findById(doctorId);
  if (!doctor) {
    throw new HttpError(
      400,
      "Assign a doctor who is already in the network.",
      "validation_error",
      { doctorId: "Assign a doctor who is already in the network." },
    );
  }
  return doctor;
}

export async function listPatients(query) {
  const { page, pageSize, search, range } = readListQuery(query, PATIENT_PAGE_SIZE);
  const today = todayIso();
  const start = assertRange(range, today);
  const match = {};
  if (query.condition && query.condition !== "all") {
    match.condition = String(query.condition);
  }
  if (query.doctorId) {
    if (!mongoose.isValidObjectId(query.doctorId)) {
      return toPage([], 0, 1, pageSize);
    }
    match.doctorId = objectId(String(query.doctorId));
  }
  if (start) match.admittedAt = { $gte: start };

  const pipeline = [
    { $match: match },
    {
      $lookup: {
        from: "doctors",
        localField: "doctorId",
        foreignField: "_id",
        as: "doctor",
      },
    },
    { $unwind: { path: "$doctor", preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        doctorName: { $ifNull: ["$doctor.name", "Unassigned"] },
      },
    },
  ];
  if (search) {
    const pattern = new RegExp(escapeRegex(search), "i");
    pipeline.push({
      $match: {
        $or: [{ name: pattern }, { phone: pattern }, { doctorName: pattern }],
      },
    });
  }
  pipeline.push({ $sort: { admittedAt: -1, _id: -1 } });

  const rows = await Patient.aggregate(pipeline);
  const total = rows.length;
  const paged = toPage([], total, page, pageSize);
  const items = rows
    .slice((paged.page - 1) * pageSize, paged.page * pageSize)
    .map((patient) => toPatient(patient, patient.doctorName));
  return toPage(items, total, page, pageSize);
}

export async function createPatient(body) {
  const input = readPatient(body);
  await requireDoctor(input.doctorId);
  const patient = await Patient.create({ ...input, admittedAt: todayIso() });
  return toPatient(patient);
}

export async function updatePatient(id, body) {
  if (!mongoose.isValidObjectId(id)) {
    throw new HttpError(404, "This patient is no longer on the list.", "not_found");
  }
  const existing = await Patient.findById(id);
  if (!existing) {
    throw new HttpError(404, "This patient is no longer on the list.", "not_found");
  }
  const input = readPatient(body);
  await requireDoctor(input.doctorId);
  existing.set(input);
  await existing.save();
  return toPatient(existing);
}

export async function deletePatient(id) {
  if (!mongoose.isValidObjectId(id)) {
    throw new HttpError(404, "This patient is no longer on the list.", "not_found");
  }
  const deleted = await Patient.findByIdAndDelete(id);
  if (!deleted) {
    throw new HttpError(404, "This patient is no longer on the list.", "not_found");
  }
}

export async function getDashboard() {
  const today = todayIso();
  const from7 = isoDaysAgo(6, today);
  const days = lastNDays(30, today);
  const [doctors, patients] = await Promise.all([
    Doctor.find().lean(),
    Patient.find().lean(),
  ]);
  const points = new Map(
    days.map((date) => [
      date,
      { date, label: formatShortDate(date), registrations: 0, critical: 0 },
    ]),
  );
  for (const patient of patients) {
    const point = points.get(patient.admittedAt);
    if (!point) continue;
    point.registrations += 1;
    if (patient.condition === "Critical") point.critical += 1;
  }
  const counts = new Map(doctors.map((doctor) => [String(doctor._id), 0]));
  for (const patient of patients) {
    const key = String(patient.doctorId);
    if (counts.has(key)) counts.set(key, counts.get(key) + 1);
  }
  const totalDoctors = doctors.length;
  const totalPatients = patients.length;
  return {
    totalDoctors,
    totalPatients,
    newPatients7d: patients.filter((patient) => patient.admittedAt >= from7).length,
    criticalCases: patients.filter((patient) => patient.condition === "Critical").length,
    avgPerDoctor: totalDoctors === 0 ? 0 : totalPatients / totalDoctors,
    conditions: CONDITIONS.map((condition) => ({
      condition,
      count: patients.filter((patient) => patient.condition === condition).length,
    })),
    patientsPerDoctor: doctors
      .map((doctor) => ({
        id: String(doctor._id),
        name: doctor.name,
        count: counts.get(String(doctor._id)) ?? 0,
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    registrations: days.map((date) => points.get(date)),
  };
}
