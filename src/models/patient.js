import mongoose from "mongoose";

const patientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    gender: { type: String, required: true },
    age: { type: Number, required: true },
    phone: { type: String, required: true },
    condition: { type: String, required: true },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },
    admittedAt: { type: String, required: true },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

patientSchema.index({ doctorId: 1, admittedAt: -1 });
patientSchema.index({ condition: 1, admittedAt: -1 });
patientSchema.index({ phone: 1 });

export const Patient =
  mongoose.models.Patient || mongoose.model("Patient", patientSchema);

export function toPatient(patient, doctorName) {
  return {
    id: String(patient._id),
    name: patient.name,
    gender: patient.gender,
    age: patient.age,
    phone: patient.phone,
    condition: patient.condition,
    doctorId: String(patient.doctorId),
    admittedAt: patient.admittedAt,
    notes: patient.notes ?? "",
    ...(doctorName === undefined ? {} : { doctorName }),
  };
}
