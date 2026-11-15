import { DAY, seededRandom, todayAt } from '../../lib/time'
import {
  addDays,
  atMinute,
  dayStart,
  depositFor,
  isOpenWeekday,
  openDays,
  pointsFor,
  referralCode,
  serviceById,
  staffFor,
} from './engine'
import type { Appointment, ApptStatus, Client, PointsEntry, SalonState, ServiceId, StaffId, Visit } from './types'

/* Sample business: Sunbird & Sage Salon & Spa, an invented hair salon and day spa in Parkhurst, Johannesburg. */

type ClientRow = [
  id: string,
  name: string,
  phone: string,
  preferred: StaffId,
  main: ServiceId,
  visits: number,
  lastDaysAgo: number,
  notes?: string,
  extra?: 'referral' | 'redeemed',
]

const CLIENT_ROWS: ClientRow[] = [
  ['thandi', 'Thandi Mokoena', '82 4410', 'naledi', 'colour', 16, 56, 'Sensitive scalp. Patch test on file.', 'referral'],
  ['ayesha', 'Ayesha Moosa', '83 2291', 'lerato', 'manicure', 16, 20, 'Likes almond-shaped nails.', 'referral'],
  ['lindiwe', 'Lindiwe Sithole', '72 8803', 'naledi', 'silkpress', 9, 27],
  ['priya', 'Priya Naidoo', '84 1157', 'naledi', 'roots', 12, 47, 'Colour formula on file: 6.3 with 20 vol.', 'redeemed'],
  ['mpho', 'Mpho Molefe', '71 6620', 'zara', 'braids', 7, 75, 'Medium knotless, waist length.'],
  ['annika', 'Annika van der Merwe', '82 9034', 'naledi', 'cut', 6, 44],
  ['refilwe', 'Refilwe Nkosi', '76 3348', 'zara', 'braids', 10, 58],
  ['fatima', 'Fatima Cassim', '79 5512', 'lerato', 'manicure', 14, 21],
  ['nomvula', 'Nomvula Dlamini', '73 7781', 'lerato', 'pedicure', 8, 30],
  ['kayla', 'Kayla Pillay', '61 2049', 'zara', 'silkpress', 5, 33, 'Heat protectant only, no oils.'],
  ['boitumelo', 'Boitumelo Masilo', '82 6675', 'kgomotso', 'facial', 6, 40, 'Allergic to nut oils.'],
  ['sarah', 'Sarah Goldberg', '83 4426', 'kgomotso', 'swedish60', 11, 26, 'Prefers firm pressure.', 'referral'],
  ['zanele', 'Zanele Mthembu', '72 1183', 'kgomotso', 'swedish60', 4, 29],
  ['nadia', 'Nadia Ebrahim', '84 9920', 'kgomotso', 'facial', 9, 36],
  ['palesa', 'Palesa Radebe', '71 3057', 'lerato', 'pedicure', 3, 31],
  ['megan', 'Megan O’Connor', '82 7716', 'zara', 'blowdry', 13, 12, 'Weekly blow-dry, loose waves.', 'redeemed'],
  ['keabetswe', 'Keabetswe Tau', '76 4402', 'lerato', 'manicure', 7, 25],
  ['ruth', 'Ruth Mabaso', '79 8835', 'naledi', 'roots', 5, 61],
  ['tshepo', 'Tshepo Ndlovu', '73 2268', 'kgomotso', 'deeptissue', 6, 34, 'Lower back tension.'],
  ['sipho', 'Sipho Zulu', '60 5519', 'zara', 'cut', 4, 48],
  ['leila', 'Leila Hassan', '61 7704', 'lerato', 'removal', 3, 23],
  ['aaliyah', 'Aaliyah Adams', '74 3390', 'zara', 'silkpress', 6, 30],
  ['grace', 'Grace Mahlangu', '82 1408', 'naledi', 'colour', 8, 52],
  ['bongani', 'Bongani Khoza', '83 6051', 'kgomotso', 'deeptissue', 5, 27],
  ['hannah', 'Hannah Steyn', '72 4467', 'kgomotso', 'swedish90', 4, 31],
  ['ntombi', 'Ntombi Zungu', '76 9182', 'zara', 'braids', 6, 54],
  ['lauren', 'Lauren Kruger', '82 5530', 'naledi', 'cut', 5, 39],
  ['dineo', 'Dineo Mokgadi', '71 8846', 'zara', 'silkpress', 5, 26],
  ['rosa', 'Rosa Fernandes', '83 7712', 'naledi', 'colour', 9, 50, 'Covers greys every 8 weeks.'],
  ['amahle', 'Amahle Ngcobo', '72 3364', 'lerato', 'pedicure', 4, 27],
]

/** Clients mix things up now and then: every fourth visit is this instead of their usual. */
const ALT: Record<ServiceId, ServiceId> = {
  cut: 'blowdry',
  blowdry: 'cut',
  colour: 'roots',
  roots: 'cut',
  braids: 'silkpress',
  silkpress: 'blowdry',
  manicure: 'pedicure',
  pedicure: 'manicure',
  removal: 'manicure',
  swedish60: 'facial',
  swedish90: 'swedish60',
  deeptissue: 'swedish60',
  facial: 'swedish60',
}

/** The same weekday or earlier, moved back to Tuesday–Saturday. */
function openDayAtOrBefore(daysAgo: number, minute: number): number {
  let day = addDays(dayStart(Date.now()), -daysAgo)
  while (!isOpenWeekday(day)) day = addDays(day, -1)
  return atMinute(day, minute)
}

function sampleClient(row: ClientRow, index: number): Client {
  const [id, name, phone, preferred, main, count, lastDaysAgo, notes, extra] = row
  const rand = seededRandom(4100 + index * 37)
  const visits: Visit[] = []
  let daysAgo = lastDaysAgo
  for (let i = 0; i < count; i++) {
    const serviceId = i % 4 === 3 ? ALT[main] : main
    const team = staffFor(serviceId)
    const staffId = team.find((s) => s.id === preferred)?.id ?? team[0].id
    const minute = (9 + Math.floor(rand() * 7)) * 60 + (rand() < 0.5 ? 0 : 30)
    visits.push({ at: openDayAtOrBefore(daysAgo, minute), serviceId, staffId, amount: serviceById(serviceId).price })
    daysAgo += Math.round(serviceById(main).rebookWeeks * 7 * (0.9 + rand() * 0.5))
  }
  const points: PointsEntry[] = visits.map((v) => ({ at: v.at, label: serviceById(v.serviceId).label, points: pointsFor(v.amount, v.at) }))
  if (extra === 'referral' && visits[1]) points.push({ at: visits[1].at + DAY, label: 'Friend booked with your code', points: 100 })
  if (extra === 'redeemed' && visits[2]) points.push({ at: visits[2].at, label: 'Redeemed: Free blow-dry', points: -300 })
  points.sort((a, b) => b.at - a.at)
  const [first, ...rest] = name.toLowerCase().replace(/[’']/g, '').split(' ')
  return {
    id,
    name,
    phone: `+27 ${phone.slice(0, 2)} ••• ${phone.slice(3)}`,
    email: index % 3 === 2 ? undefined : `${first}.${rest.join('')}@example.com`,
    preferredStaff: preferred,
    notes,
    referralCode: referralCode(name),
    visits,
    points,
    rewards: [],
  }
}

type ApptRow = [day: number, staff: StaffId, time: string, service: ServiceId, client: string, notes?: string, status?: ApptStatus, checkedIn?: string]

// Today is 09:30 in the demo: two clients are in the chair, one is finishing, and one is late.
const APPT_ROWS: ApptRow[] = [
  [0, 'naledi', '08:30', 'colour', 'thandi', 'Sensitive scalp', 'Checked in', '08:24'],
  [0, 'naledi', '10:45', 'roots', 'priya'],
  [0, 'naledi', '13:30', 'cut', 'annika', 'Wants to keep the length'],
  [0, 'naledi', '15:00', 'silkpress', 'lindiwe'],
  [0, 'zara', '09:00', 'braids', 'refilwe', 'Hair supplied by the salon, colour 1B', 'Checked in', '08:52'],
  [0, 'zara', '14:00', 'blowdry', 'megan'],
  [0, 'zara', '15:30', 'silkpress', 'aaliyah', 'Trim the ends too'],
  [0, 'lerato', '08:30', 'manicure', 'fatima', undefined, 'Checked in', '08:26'],
  [0, 'lerato', '09:45', 'pedicure', 'nomvula'],
  [0, 'lerato', '11:15', 'removal', 'leila'],
  [0, 'lerato', '12:45', 'manicure', 'keabetswe'],
  [0, 'lerato', '14:00', 'pedicure', 'palesa', 'Prefers neutral colours'],
  [0, 'lerato', '15:30', 'manicure', 'ayesha', 'Almond shape'],
  [0, 'kgomotso', '09:00', 'deeptissue', 'tshepo', 'Focus on the lower back'],
  [0, 'kgomotso', '11:30', 'facial', 'nadia'],
  [0, 'kgomotso', '14:15', 'swedish60', 'zanele'],
  [0, 'kgomotso', '17:00', 'swedish60', 'sarah', 'Firm pressure'],
  [1, 'naledi', '09:00', 'colour', 'grace'],
  [1, 'zara', '09:00', 'braids', 'ntombi', 'Medium knotless, mid-back'],
  [1, 'lerato', '10:00', 'manicure', 'thandi'],
  [1, 'kgomotso', '11:00', 'deeptissue', 'bongani'],
  [1, 'kgomotso', '15:00', 'swedish90', 'hannah'],
  [1, 'lerato', '14:00', 'pedicure', 'amahle'],
  [1, 'naledi', '13:30', 'cut', 'lauren'],
  [2, 'naledi', '09:00', 'colour', 'rosa', 'Grey coverage'],
  [2, 'zara', '14:00', 'silkpress', 'dineo'],
  [2, 'naledi', '14:00', 'blowdry', 'ayesha'],
  [2, 'zara', '10:00', 'cut', 'nadia'],
  [3, 'lerato', '09:00', 'pedicure', 'lindiwe'],
  [3, 'kgomotso', '14:15', 'swedish60', 'priya'],
  [3, 'kgomotso', '10:00', 'facial', 'boitumelo', 'No nut oils'],
  [4, 'zara', '09:30', 'blowdry', 'megan'],
  [4, 'naledi', '11:00', 'cut', 'zanele'],
  [5, 'kgomotso', '10:00', 'facial', 'fatima'],
]

// Online bookings come in at all hours, about a third after closing. Phone bookings only while the salon is open.
const ONLINE_HOURS = [20, 10, 13, 21, 8, 15, 19, 11, 22, 12, 16, 20, 9, 14, 21, 17, 12]

/** The visitor's first booking gets SS-5521; the sample bookings come just before it. */
const NEXT_REF = 5521

const hm = (time: string) => {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function sampleAppointments(): Appointment[] {
  const days = openDays(todayAt(9, 30), 7)
  const rand = seededRandom(NEXT_REF)
  return APPT_ROWS.map(([dayIndex, staffId, time, serviceId, clientId, notes, status = 'Booked', checkedIn], i): Appointment => {
    const service = serviceById(serviceId)
    const start = atMinute(days[dayIndex], hm(time))
    // Two in three sample bookings were made online.
    const online = i % 3 !== 1
    const hour = online ? ONLINE_HOURS[Math.floor((i * 2) / 3) % ONLINE_HOURS.length] : 9 + Math.floor(rand() * 8)
    // Every sample booking was made in the last nine days.
    const createdAt = atMinute(addDays(days[0], -(1 + Math.floor(rand() * 9))), hour * 60 + Math.floor(rand() * 4) * 15)
    const deposit = depositFor(service.price)
    return {
      id: `appt-${NEXT_REF - APPT_ROWS.length + i}`,
      ref: `SS-${NEXT_REF - APPT_ROWS.length + i}`,
      clientId,
      staffId,
      serviceId,
      start,
      duration: service.minutes,
      price: service.price,
      deposit,
      depositStatus: deposit ? 'paid' : 'none',
      status,
      source: online ? 'Online' : 'Phone',
      createdAt,
      notes,
      reminder: true,
      checkedInAt: checkedIn ? atMinute(days[0], hm(checkedIn)) : undefined,
    }
  })
}

/** Visits and no-shows earlier this month, before today. Sample figures, scaled to the date so they stay plausible. */
export function monthSoFar(now: number) {
  const visits = Math.round((new Date(now).getDate() - 1) * 7.4)
  return { visits, noShows: Math.round(visits * 0.022) }
}

/** The sample business's own before-and-after figures. */
export const BEFORE_DEPOSITS = { noShowRate: 14, noShowsPerMonth: 23 }

/** The sample client whose card shows on Loyalty until the visitor books. */
export const SAMPLE_CARD_CLIENT = 'ayesha'

export function createInitialState(): SalonState {
  const appointments = sampleAppointments()
  return {
    appointments,
    clients: CLIENT_ROWS.map(sampleClient),
    nextRef: NEXT_REF,
    nextReward: 1,
  }
}
