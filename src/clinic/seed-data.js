const doctors = [
  ["doc_rafiq", "Dr. Rafiq Islam", "Cardiology", "Ibn Sina Hospital", "+8801710002005", "rafiq@ibnsina.com", 6],
  ["doc_farhana", "Dr. Farhana Akter", "Dermatology", "Square Hospital", "+8801710002006", "farhana@square.com", 11],
  ["doc_tanvir", "Dr. Tanvir Ahmed", "Orthopedics", "LabAid Hospital", "+8801710002004", "tanvir@labaid.com", 22],
  ["doc_nusrat", "Dr. Nusrat Jahan", "Neurology", "United Hospital", "+8801710002008", "nusrat@united.com", 21],
  ["doc_imran", "Dr. Imran Hossain", "Neurology", "Evercare Hospital", "+8801710002007", "imran@evercare.com", 25],
  ["doc_ayesha", "Dr. Ayesha Rahman", "Cardiology", "Square Hospital", "+8801710002001", "ayesha@square.com", 29],
];

const namedPatients = [
  ["Salma Khan", "Male", 71, "+8801988348754", "Recovering", "doc_tanvir", 6],
  ["Salma Khan", "Male", 50, "+88019160773549", "Recovering", "doc_nusrat", 6],
  ["Rahim Roy", "Male", 48, "+8801924065745", "Critical", "doc_imran", 9],
  ["Rahim Sarkar", "Male", 19, "+8801941058932", "Recovering", "doc_ayesha", 9],
  ["Rina Khan", "Male", 45, "+8801688470425", "Under Observation", "doc_rafiq", 11],
  ["Mitu Ali", "Female", 45, "+8801901907397", "Recovering", "doc_nusrat", 11],
  ["Jamal Sarkar", "Female", 56, "+8801958028857", "Recovering", "doc_tanvir", 11],
  ["Karim Ali", "Male", 45, "+8801575800161", "Recovering", "doc_farhana", 12],
];

const fillers = [
  [29, "Stable", "doc_rafiq", "Abdul Kadir", "Male", 70],
  [28, "Under Observation", "doc_farhana", "Shila Begum", "Female", 58],
  [27, "Critical", "doc_rafiq", "Shahidul Islam", "Male", 66],
  [27, "Stable", "doc_farhana", "Sumaiya Akter", "Female", 31],
  [27, "Recovering", "doc_tanvir", "Jahid Hasan", "Male", 44],
  [26, "Critical", "doc_nusrat", "Habibullah", "Male", 68],
  [25, "Under Observation", "doc_imran", "Farzana Yasmin", "Female", 47],
  [24, "Critical", "doc_rafiq", "Hasan Mahmud", "Male", 62],
  [24, "Critical", "doc_farhana", "Karim Uddin", "Male", 54],
  [24, "Stable", "doc_ayesha", "Sadia Islam", "Female", 28],
  [24, "Recovering", "doc_tanvir", "Lamia Chowdhury", "Female", 41],
  [24, "Under Observation", "doc_rafiq", "Faruk Hossain", "Male", 37],
  [23, "Stable", "doc_farhana", "Tania Akter", "Female", 29],
  [22, "Recovering", "doc_nusrat", "Mim Rahman", "Female", 22],
  [21, "Critical", "doc_imran", "Masud Rana", "Male", 52],
  [21, "Under Observation", "doc_rafiq", "Popy Rani", "Female", 39],
  [20, "Stable", "doc_farhana", "Anika Sultana", "Female", 24],
  [18, "Critical", "doc_tanvir", "Rubel Mia", "Male", 33],
  [18, "Recovering", "doc_ayesha", "Orpa Khan", "Female", 36],
  [17, "Under Observation", "doc_imran", "Nayeem Ahmed", "Male", 26],
  [15, "Critical", "doc_rafiq", "Belal Hossain", "Male", 61],
  [15, "Stable", "doc_farhana", "Rupa Akter", "Female", 43],
  [14, "Recovering", "doc_tanvir", "Shakib Rahman", "Male", 38],
  [13, "Critical", "doc_nusrat", "Mousumi Das", "Female", 51],
  [13, "Under Observation", "doc_rafiq", "Nusrat Begum", "Female", 34],
];

export function clinicSeed(daysAgo) {
  return {
    doctors: doctors.map(([key, name, specialization, hospital, phone, email, joinedDaysAgo]) => ({
      key,
      name,
      specialization,
      hospital,
      phone,
      email,
      joinedAt: daysAgo(joinedDaysAgo),
    })),
    patients: [
      ...namedPatients.map(([name, gender, age, phone, condition, doctorKey, admittedDaysAgo]) => ({
        name,
        gender,
        age,
        phone,
        condition,
        doctorKey,
        admittedAt: daysAgo(admittedDaysAgo),
        notes: "",
      })),
      ...fillers.map(([admittedDaysAgo, condition, doctorKey, name, gender, age], index) => ({
        name,
        gender,
        age,
        phone: `+88017${String(10000000 + index * 173).slice(-8)}`,
        condition,
        doctorKey,
        admittedAt: daysAgo(admittedDaysAgo),
        notes: "",
      })),
    ],
  };
}
