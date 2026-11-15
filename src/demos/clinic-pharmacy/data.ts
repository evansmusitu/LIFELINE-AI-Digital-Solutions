import { DAY, todayAt, tomorrowAt } from '../../lib/time'
import type {
  Appointment,
  AppointmentStatus,
  Batch,
  ClinicState,
  Clinician,
  ClinicianId,
  Medicine,
  Patient,
  Prescription,
  Reminder,
  ReminderKind,
  Service,
  ServiceId,
} from './types'

/* Sample business: Lindhaven Family Clinic & Pharmacy, an invented clinic in Bulawayo, Zimbabwe. */

export const CLINIC = 'Lindhaven Family Clinic'

export const CLINICIANS: Clinician[] = [
  { id: 'mutasa', name: 'Dr Farai Mutasa', short: 'Dr Mutasa', role: 'General practitioner', room: 'Room 1' },
  { id: 'khumalo', name: 'Dr Lindiwe Khumalo', short: 'Dr Khumalo', role: 'General practitioner', room: 'Room 2' },
  { id: 'ndlovu', name: 'Sister Ruth Ndlovu', short: 'Sister Ndlovu', role: 'Nurse', room: 'Room 3' },
]

export const SERVICES: Service[] = [
  { id: 'gp', name: 'GP consultation', minutes: 15, fee: 25 },
  { id: 'chronic', name: 'Chronic care review', minutes: 20, fee: 25 },
  { id: 'child', name: 'Child health and immunisation', minutes: 15, fee: 10 },
  { id: 'antenatal', name: 'Antenatal check', minutes: 20, fee: 20 },
  { id: 'bp', name: 'Blood pressure and sugar check', minutes: 10, fee: 8 },
  { id: 'refill', name: 'Prescription review', minutes: 10, fee: 10 },
]

/** Which clinicians offer which services. */
export const OFFERS: Record<ClinicianId, ServiceId[]> = {
  mutasa: ['gp', 'chronic', 'refill'],
  khumalo: ['gp', 'chronic', 'child', 'refill'],
  ndlovu: ['child', 'antenatal', 'bp'],
}

export const DOSES = [
  '1 tablet once a day',
  '1 tablet twice a day',
  '1 capsule three times a day for 7 days',
  '2 tablets up to 4 times a day when needed',
  '1 tablet at night',
  '2 puffs when needed',
  '5 ml three times a day for 5 days',
]

const P = (id: string, name: string, age: string, phone: string): Patient => ({ id, name, age, phone })

export function samplePatients(): Patient[] {
  return [
    P('p1', 'Sipho Ncube', '61', '+263 77 ••• 4821'),
    P('p2', 'Nomvula Dube', '34', '+263 71 ••• 2290'),
    P('p3', 'Tendai Chirwa', '45', '+263 78 ••• 6613'),
    P('p4', 'Rutendo Mhlanga', '29', '+263 77 ••• 0158'),
    P('p5', 'Bongani Sibanda', '52', '+263 71 ••• 7342'),
    P('p6', 'Precious Moyo', '38', '+263 78 ••• 9904'),
    P('p7', 'Kudakwashe Sithole', '47', '+263 77 ••• 3517'),
    P('p8', 'Thabani Ncube', '24', '+263 71 ••• 8086'),
    P('p9', 'Lerato Mpofu', '41', '+263 78 ••• 2741'),
    P('p10', 'Farirai Gumbo', '66', '+263 77 ••• 5029'),
    P('p11', 'Zanele Nyoni', '31', '+263 71 ••• 6375'),
    P('p12', 'Mandla Khumalo', '58', '+263 78 ••• 1460'),
    P('p13', 'Chipo Banda', '27', '+263 77 ••• 8832'),
    P('p14', 'Tsitsi Murwira', '36', '+263 71 ••• 4407'),
    P('p15', 'Gift Mathe', '44', '+263 78 ••• 7718'),
    P('p16', 'Nkosana Dube', '51', '+263 77 ••• 0964'),
    P('p17', 'Elena Rossi', '39', '+263 71 ••• 3352'),
    P('p18', 'Simba Moyo', '8', '+263 78 ••• 6120'),
    P('p19', 'Ropafadzo Chikore', '55', '+263 77 ••• 2875'),
    P('p20', 'Amahle Tshuma', '9 months', '+263 71 ••• 5583'),
    P('p21', 'Nyasha Mlilo', '26', '+263 78 ••• 0431'),
    P('p22', 'Joseph Phiri', '63', '+263 77 ••• 9256'),
    P('p23', 'Ruvimbo Kanengoni', '24', '+263 71 ••• 1189'),
    P('p24', 'Tafadzwa Chari', '2', '+263 78 ••• 4672'),
    P('p25', 'Blessing Moyo', '33', '+263 77 ••• 3048'),
    P('p26', 'Themba Ndlovu', '70', '+263 71 ••• 5761'),
    P('p27', 'Fadzai Mutasa', '19', '+263 78 ••• 8395'),
    P('p28', 'Rudo Sibanda', '42', '+263 77 ••• 6207'),
    P('p29', 'Peter Dube', '57', '+263 71 ••• 9813'),
    P('p30', 'Grace Mpofu', '30', '+263 78 ••• 3526'),
  ]
}

type ApptRow = [id: string, patient: string, clinician: ClinicianId, service: ServiceId, h: number, m: number, status: AppointmentStatus, arrived?: [number, number], started?: [number, number]]

const APPOINTMENTS: ApptRow[] = [
  ['a1', 'p1', 'mutasa', 'chronic', 8, 0, 'Done', [7, 52], [8, 3]],
  ['a2', 'p2', 'mutasa', 'gp', 8, 20, 'Done', [8, 11], [8, 24]],
  ['a3', 'p3', 'mutasa', 'gp', 8, 40, 'No-show'],
  ['a4', 'p4', 'mutasa', 'gp', 9, 0, 'Done', [8, 49], [9, 2]],
  ['a5', 'p5', 'mutasa', 'chronic', 9, 20, 'Done', [9, 15], [9, 21]],
  ['a6', 'p6', 'mutasa', 'gp', 9, 45, 'Done', [9, 40], [9, 47]],
  ['a7', 'p7', 'mutasa', 'chronic', 10, 15, 'With clinician', [10, 9], [10, 22]],
  ['a8', 'p8', 'mutasa', 'gp', 10, 45, 'Arrived', [10, 31]],
  ['a9', 'p9', 'mutasa', 'refill', 11, 15, 'Confirmed'],
  ['a10', 'p10', 'mutasa', 'chronic', 11, 45, 'Confirmed'],
  ['a11', 'p11', 'mutasa', 'gp', 14, 0, 'Booked'],
  ['a12', 'p12', 'mutasa', 'chronic', 14, 30, 'Booked'],
  ['a13', 'p13', 'khumalo', 'gp', 8, 30, 'Done', [8, 26], [8, 31]],
  ['a14', 'p14', 'khumalo', 'gp', 9, 0, 'Done', [8, 55], [9, 4]],
  ['a15', 'p15', 'khumalo', 'chronic', 9, 30, 'Done', [9, 22], [9, 33]],
  ['a16', 'p16', 'khumalo', 'gp', 10, 30, 'Arrived', [10, 24]],
  ['a17', 'p17', 'khumalo', 'gp', 11, 0, 'Confirmed'],
  ['a18', 'p18', 'khumalo', 'gp', 11, 30, 'Booked'],
  ['a19', 'p19', 'khumalo', 'chronic', 15, 0, 'Booked'],
  ['a20', 'p20', 'ndlovu', 'child', 8, 15, 'Done', [8, 5], [8, 16]],
  ['a21', 'p21', 'ndlovu', 'antenatal', 9, 10, 'Done', [9, 2], [9, 12]],
  ['a22', 'p22', 'ndlovu', 'bp', 10, 30, 'With clinician', [10, 26], [10, 35]],
  ['a23', 'p23', 'ndlovu', 'antenatal', 11, 0, 'Confirmed'],
  ['a24', 'p24', 'ndlovu', 'child', 11, 30, 'Booked'],
]

/** Tomorrow's bookings. Each one has a day-before reminder in sampleReminders. */
const TOMORROW: [id: string, patient: string, clinician: ClinicianId, service: ServiceId, h: number, m: number][] = [
  ['t1', 'p25', 'mutasa', 'gp', 8, 0],
  ['t2', 'p26', 'khumalo', 'chronic', 8, 30],
  ['t3', 'p27', 'ndlovu', 'antenatal', 9, 0],
  ['t4', 'p28', 'mutasa', 'chronic', 9, 15],
  ['t5', 'p29', 'khumalo', 'gp', 10, 0],
  ['t6', 'p30', 'ndlovu', 'bp', 10, 30],
]

function sampleAppointments(): Appointment[] {
  const tomorrow: Appointment[] = TOMORROW.map(([id, patientId, clinicianId, serviceId, h, m]) => ({
    id,
    patientId,
    clinicianId,
    serviceId,
    start: tomorrowAt(h, m),
    status: 'Booked',
  }))
  return [...todaysAppointments(), ...tomorrow]
}

function todaysAppointments(): Appointment[] {
  return APPOINTMENTS.map(([id, patientId, clinicianId, serviceId, h, m, status, arrived, started]) => {
    const start = todayAt(h, m)
    const minutes = SERVICES.find((s) => s.id === serviceId)!.minutes
    const startedAt = started ? todayAt(...started) : undefined
    return {
      id,
      patientId,
      clinicianId,
      serviceId,
      start,
      status,
      arrivedAt: arrived ? todayAt(...arrived) : undefined,
      startedAt,
      finishedAt: status === 'Done' && startedAt ? startedAt + (minutes - 2) * 60_000 : undefined,
    }
  })
}

const batch = (batchNo: string, days: number, qty: number): Batch => ({ batchNo, expiry: todayAt(0, 0) + days * DAY, qty })

export function sampleMedicines(): Medicine[] {
  return [
    { id: 'para', name: 'Paracetamol 500 mg tablets', unit: 'tablets', reorderLevel: 1000, batches: [batch('PA2311', 120, 900), batch('PA2403', 410, 1500)] },
    { id: 'amox', name: 'Amoxicillin 500 mg capsules', unit: 'capsules', reorderLevel: 300, batches: [batch('AX2402', 38, 63), batch('AX2405', 300, 105)] },
    { id: 'metf', name: 'Metformin 500 mg tablets', unit: 'tablets', reorderLevel: 600, batches: [batch('MF2406', 540, 1120)] },
    { id: 'amlo', name: 'Amlodipine 5 mg tablets', unit: 'tablets', reorderLevel: 500, batches: [batch('AM2310', 45, 120), batch('AM2404', 260, 420)] },
    { id: 'losa', name: 'Losartan 50 mg tablets', unit: 'tablets', reorderLevel: 400, batches: [batch('LS2405', 330, 610)] },
    { id: 'hctz', name: 'Hydrochlorothiazide 25 mg tablets', unit: 'tablets', reorderLevel: 300, batches: [batch('HZ2402', 190, 280)] },
    { id: 'ibup', name: 'Ibuprofen 400 mg tablets', unit: 'tablets', reorderLevel: 400, batches: [batch('IB2405', 400, 820)] },
    { id: 'ors', name: 'Oral rehydration salts sachets', unit: 'sachets', reorderLevel: 100, batches: [batch('OR2404', 280, 64)] },
    { id: 'zinc', name: 'Zinc 20 mg dispersible tablets', unit: 'tablets', reorderLevel: 150, batches: [batch('ZN2312', 25, 90), batch('ZN2405', 350, 120)] },
    { id: 'salb', name: 'Salbutamol inhaler 100 mcg', unit: 'inhalers', reorderLevel: 12, batches: [batch('SB2403', 220, 9)] },
    { id: 'cetr', name: 'Cetirizine 10 mg tablets', unit: 'tablets', reorderLevel: 200, batches: [batch('CT2405', 480, 450)] },
    { id: 'omep', name: 'Omeprazole 20 mg capsules', unit: 'capsules', reorderLevel: 300, batches: [batch('OM2404', 300, 380)] },
    { id: 'ferr', name: 'Ferrous sulphate with folic acid tablets', unit: 'tablets', reorderLevel: 500, batches: [batch('FF2405', 420, 900)] },
    { id: 'amxs', name: 'Amoxicillin 250 mg/5 ml suspension, 100 ml', unit: 'bottles', reorderLevel: 20, batches: [batch('AS2403', 160, 14)] },
    { id: 'chlp', name: 'Chlorphenamine 4 mg tablets', unit: 'tablets', reorderLevel: 150, batches: [batch('CP2309', -3, 40), batch('CP2405', 390, 260)] },
  ]
}

function samplePrescriptions(): Prescription[] {
  return [
    {
      id: 'rx-1049',
      number: 'RX-1049',
      patientId: 'p13',
      clinicianId: 'khumalo',
      at: todayAt(8, 44),
      source: 'Consultation',
      status: 'Waiting',
      items: [{ medicineId: 'cetr', dose: '1 tablet at night', qty: 10 }],
    },
    {
      id: 'rx-1048',
      number: 'RX-1048',
      patientId: 'p4',
      clinicianId: 'mutasa',
      at: todayAt(9, 14),
      source: 'Consultation',
      status: 'Waiting',
      items: [
        { medicineId: 'amox', dose: '1 capsule three times a day for 7 days', qty: 21 },
        { medicineId: 'para', dose: '2 tablets up to 4 times a day when needed', qty: 20 },
      ],
    },
    {
      id: 'rx-1047',
      number: 'RX-1047',
      patientId: 'p1',
      clinicianId: 'mutasa',
      at: todayAt(8, 18),
      source: 'Consultation',
      status: 'Waiting',
      items: [
        { medicineId: 'amlo', dose: '1 tablet once a day', qty: 30 },
        { medicineId: 'hctz', dose: '1 tablet once a day', qty: 30 },
      ],
    },
    {
      id: 'rx-1046',
      number: 'RX-1046',
      patientId: 'p2',
      clinicianId: 'mutasa',
      at: todayAt(8, 37),
      source: 'Consultation',
      status: 'Ready',
      readyAt: todayAt(9, 48),
      notifiedAt: todayAt(9, 49),
      items: [{ medicineId: 'ibup', dose: '1 tablet twice a day', qty: 15 }],
    },
    {
      id: 'rx-1045',
      number: 'RX-1045',
      patientId: 'p15',
      clinicianId: 'khumalo',
      at: todayAt(9, 50),
      source: 'Consultation',
      status: 'Ready',
      readyAt: todayAt(10, 12),
      items: [
        { medicineId: 'metf', dose: '1 tablet twice a day', qty: 60 },
        { medicineId: 'losa', dose: '1 tablet once a day', qty: 30 },
      ],
    },
    {
      id: 'rx-1044',
      number: 'RX-1044',
      patientId: 'p14',
      clinicianId: 'khumalo',
      at: todayAt(9, 16),
      source: 'Consultation',
      status: 'Collected',
      readyAt: todayAt(9, 30),
      notifiedAt: todayAt(9, 31),
      collectedAt: todayAt(9, 41),
      items: [{ medicineId: 'omep', dose: '1 tablet once a day', qty: 28 }],
    },
    {
      id: 'rx-1043',
      number: 'RX-1043',
      patientId: 'p21',
      clinicianId: 'ndlovu',
      at: todayAt(9, 29),
      source: 'Consultation',
      status: 'Collected',
      readyAt: todayAt(9, 38),
      notifiedAt: todayAt(9, 38),
      collectedAt: todayAt(9, 52),
      items: [{ medicineId: 'ferr', dose: '1 tablet once a day', qty: 30 }],
    },
  ]
}

export const DEFAULT_TEMPLATES: Record<ReminderKind, string> = {
  'day-before':
    'Hi {first_name}, this is Lindhaven Family Clinic. A reminder of your appointment with {clinician} {when}. Reply 1 to confirm, or 2 if you need a new time.',
  'same-day':
    'Hi {first_name}, we’ll see you {when} with {clinician}. Please bring your clinic card and any medicines you take. Reply 1 to confirm.',
  refill: 'Hi {first_name}, your {medicine} should run out in about 3 days. Reply YES and we’ll have your refill ready to collect.',
  missed: 'Hi {first_name}, we missed you at your appointment {when}. Reply 1 and we’ll call you to find a new time.',
}

type ReminderRow = [id: string, kind: ReminderKind, patient: string, extra: Partial<Reminder>]

function sampleReminders(): Reminder[] {
  const sent = todayAt(7, 0)
  const rows: ReminderRow[] = [
    ['r1', 'same-day', 'p9', { when: 'today at 11:15', clinicianId: 'mutasa', status: 'Confirmed', sentAt: sent, reply: '1', repliedAt: todayAt(7, 12) }],
    ['r2', 'same-day', 'p10', { when: 'today at 11:45', clinicianId: 'mutasa', status: 'Confirmed', sentAt: sent, reply: '1 thank you', repliedAt: todayAt(7, 40) }],
    ['r3', 'same-day', 'p11', { when: 'today at 14:00', clinicianId: 'mutasa', status: 'Sent', sentAt: sent }],
    ['r4', 'same-day', 'p12', { when: 'today at 14:30', clinicianId: 'mutasa', status: 'Sent', sentAt: sent, channel: 'SMS' }],
    ['r5', 'same-day', 'p17', { when: 'today at 11:00', clinicianId: 'khumalo', status: 'Confirmed', sentAt: sent, reply: '1', repliedAt: todayAt(8, 5) }],
    ['r6', 'same-day', 'p18', { when: 'today at 11:30', clinicianId: 'khumalo', status: 'Sent', sentAt: sent }],
    ['r7', 'same-day', 'p23', { when: 'today at 11:00', clinicianId: 'ndlovu', status: 'Confirmed', sentAt: sent, reply: '1', repliedAt: todayAt(7, 3) }],
    ['r8', 'same-day', 'p24', { when: 'today at 11:30', clinicianId: 'ndlovu', status: 'Sent', sentAt: sent }],
    ['r9', 'day-before', 'p25', { when: 'tomorrow at 08:00', clinicianId: 'mutasa', status: 'Scheduled', appointmentId: 't1' }],
    ['r10', 'day-before', 'p26', { when: 'tomorrow at 08:30', clinicianId: 'khumalo', status: 'Scheduled', appointmentId: 't2' }],
    ['r11', 'day-before', 'p27', { when: 'tomorrow at 09:00', clinicianId: 'ndlovu', status: 'Scheduled', appointmentId: 't3' }],
    ['r12', 'day-before', 'p28', { when: 'tomorrow at 09:15', clinicianId: 'mutasa', status: 'Scheduled', appointmentId: 't4' }],
    ['r13', 'day-before', 'p29', { when: 'tomorrow at 10:00', clinicianId: 'khumalo', status: 'Scheduled', channel: 'SMS', appointmentId: 't5' }],
    ['r14', 'day-before', 'p30', { when: 'tomorrow at 10:30', clinicianId: 'ndlovu', status: 'Scheduled', appointmentId: 't6' }],
    ['r15', 'refill', 'p12', { medicineId: 'metf', status: 'Scheduled' }],
    ['r16', 'refill', 'p19', { medicineId: 'losa', status: 'Scheduled' }],
    ['r17', 'missed', 'p3', { when: 'today at 08:40', clinicianId: 'mutasa', status: 'Scheduled' }],
  ]
  return rows.map(([id, kind, patientId, extra]) => ({
    id,
    kind,
    patientId,
    channel: 'WhatsApp',
    sendAt: kind === 'day-before' ? todayAt(16, 0) : kind === 'refill' ? todayAt(12, 0) : kind === 'missed' ? todayAt(11, 0) : sent,
    status: 'Scheduled',
    ...extra,
  }))
}

export function createInitialState(): ClinicState {
  return {
    patients: samplePatients(),
    appointments: sampleAppointments(),
    medicines: sampleMedicines(),
    prescriptions: samplePrescriptions(),
    reminders: sampleReminders(),
    templates: DEFAULT_TEMPLATES,
    nextRx: 1050,
  }
}

/* Helpers shared by the screens */

export function stockOf(medicine: Medicine, now: number): number {
  return medicine.batches.filter((b) => b.expiry > now).reduce((sum, b) => sum + b.qty, 0)
}

export function medicineFlags(medicine: Medicine, now: number) {
  const stock = stockOf(medicine, now)
  const expired = medicine.batches.filter((b) => b.expiry <= now && b.qty > 0)
  const expiring = medicine.batches.filter((b) => b.expiry > now && b.expiry - now <= 60 * DAY && b.qty > 0)
  return { stock, low: stock <= medicine.reorderLevel, out: stock === 0, expired, expiring }
}

/** Takes stock from the batches that expire first. Returns null if there isn't enough. */
export function takeStock(medicine: Medicine, qty: number, now: number): { batches: Batch[]; used: { batchNo: string; qty: number }[] } | null {
  if (stockOf(medicine, now) < qty) return null
  let remaining = qty
  const used: { batchNo: string; qty: number }[] = []
  const batches = medicine.batches.map((b) => ({ ...b }))
  // Work through the batch entries themselves (by position), first expiry first. Matching by batch
  // number would take from the wrong entry if two deliveries share a number.
  const order = batches.map((_, index) => index).sort((a, b) => batches[a].expiry - batches[b].expiry)
  for (const index of order) {
    if (remaining === 0) break
    const b = batches[index]
    if (b.expiry <= now || b.qty === 0) continue
    const take = Math.min(b.qty, remaining)
    b.qty -= take
    remaining -= take
    const previous = used.find((u) => u.batchNo === b.batchNo)
    if (previous) previous.qty += take
    else used.push({ batchNo: b.batchNo, qty: take })
  }
  return { batches: batches.filter((b) => b.qty > 0 || b.expiry <= now), used }
}

export function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match)
}
