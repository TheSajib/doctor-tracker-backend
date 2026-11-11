import { Doctor } from "../models/doctor.js";
import { Patient } from "../models/patient.js";
import { isoDaysAgo, todayIso } from "./dates.js";
import { clinicSeed } from "./seed-data.js";

export async function seedClinic() {
  const existing = await Doctor.countDocuments();
  if (existing > 0) return { seeded: false, doctors: existing };

  const today = todayIso();
  const data = clinicSeed((days) => isoDaysAgo(days, today));
  const created = await Doctor.insertMany(
    data.doctors.map(({ key: _key, ...doctor }) => doctor),
  );
  const ids = new Map(
    data.doctors.map((doctor, index) => [doctor.key, created[index]._id]),
  );
  await Patient.insertMany(
    data.patients.map(({ doctorKey, ...patient }) => ({
      ...patient,
      doctorId: ids.get(doctorKey),
    })),
  );
  return { seeded: true, doctors: created.length, patients: data.patients.length };
}
