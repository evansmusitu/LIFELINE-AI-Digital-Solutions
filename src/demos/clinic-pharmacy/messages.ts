import { CLINICIANS, fill } from './data'
import type { Medicine, Patient, Prescription, Reminder, ReminderKind } from './types'

export function reminderText(reminder: Reminder, patients: Patient[], medicines: Medicine[], templates: Record<ReminderKind, string>): string {
  const patient = patients.find((p) => p.id === reminder.patientId)
  return fill(templates[reminder.kind], {
    first_name: patient?.name.split(' ')[0] ?? 'there',
    clinician: CLINICIANS.find((c) => c.id === reminder.clinicianId)?.name ?? 'your clinician',
    when: reminder.when ?? '',
    medicine: medicines.find((m) => m.id === reminder.medicineId)?.name.toLowerCase() ?? 'medicine',
  })
}

export function readyMessage(rx: Prescription, patient?: Patient): string {
  return `Hi ${patient?.name.split(' ')[0] ?? 'there'}, your medicine from Lindhaven Family Clinic is ready to collect at the pharmacy counter. We’re open until 17:00. Reference ${rx.number}.`
}

/** "61 y", or "9 months" for babies. */
export function ageLabel(age: string): string {
  return /^\d+$/.test(age) ? `${age} y` : age
}
