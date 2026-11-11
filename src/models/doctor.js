import mongoose from "mongoose";

const doctorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    specialization: { type: String, required: true },
    hospital: { type: String, required: true, trim: true },
    phone: { type: String, required: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    joinedAt: { type: String, required: true },
  },
  { timestamps: true },
);

doctorSchema.index({ specialization: 1, joinedAt: -1 });

export const Doctor =
  mongoose.models.Doctor || mongoose.model("Doctor", doctorSchema);

export function toDoctor(doctor) {
  return {
    id: String(doctor._id),
    name: doctor.name,
    specialization: doctor.specialization,
    hospital: doctor.hospital,
    phone: doctor.phone,
    email: doctor.email,
    joinedAt: doctor.joinedAt,
  };
}

export function toDoctorRow(doctor) {
  return {
    ...toDoctor(doctor),
    patientCount: doctor.patientCount ?? 0,
  };
}
