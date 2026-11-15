import { CalendarPlus, CircleCheck, Clock, DoorOpen, Pill, Plus, Trash2, UserCheck, UserX, Users } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../lib/cn'
import { clockTime } from '../../lib/format'
import { AppButton, Badge, Field, Modal, Notice, Panel, Segmented, SelectInput, Stat, TextInput, Toggle, type Tone } from '../ui'
import { CLINICIANS, DOSES, OFFERS, SERVICES, stockOf } from './data'
import { ageLabel } from './messages'
import type { Appointment, AppointmentStatus, ClinicianId, Medicine, Patient, RxItem, ServiceId } from './types'

const statusTone: Record<AppointmentStatus, Tone> = {
  Booked: 'neutral',
  Confirmed: 'blue',
  Arrived: 'amber',
  'With clinician': 'accent',
  Done: 'green',
  'No-show': 'red',
}

export interface BookingInput {
  patientId?: string
  newPatient?: { name: string; phone: string }
  serviceId: ServiceId
  clinicianId: ClinicianId
  day: 'today' | 'tomorrow'
  time: string
  confirm: boolean
}

interface Props {
  appointments: Appointment[]
  patients: Patient[]
  medicines: Medicine[]
  now: number
  onCheckIn: (id: string) => void
  onCallIn: (id: string) => void
  onComplete: (id: string, items: RxItem[]) => void
  onNoShow: (id: string) => void
  onBook: (input: BookingInput) => void
}

export function TodayScreen({ appointments, patients, medicines, now, onCheckIn, onCallIn, onComplete, onNoShow, onBook }: Props) {
  const [clinician, setClinician] = useState<ClinicianId | 'all'>('all')
  const [completing, setCompleting] = useState<string | null>(null)
  const [booking, setBooking] = useState(false)

  const patient = (id: string) => patients.find((p) => p.id === id)!
  const sorted = [...appointments].sort((a, b) => a.start - b.start)
  const shown = sorted.filter((a) => clinician === 'all' || a.clinicianId === clinician)
  const waiting = sorted.filter((a) => a.status === 'Arrived')
  const avgWait = waiting.length ? Math.round(waiting.reduce((sum, a) => sum + (now - (a.arrivedAt ?? now)), 0) / waiting.length / 60_000) : 0
  const done = appointments.filter((a) => a.status === 'Done').length
  const noShows = appointments.filter((a) => a.status === 'No-show').length
  const completingAppt = appointments.find((a) => a.id === completing)

  return (
    <div className="space-y-4 p-3 sm:p-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Users} label="Appointments today" value={appointments.length} tone="accent" />
        <Stat icon={CircleCheck} label="Seen so far" value={done} tone="green" />
        <Stat icon={DoorOpen} label="In the waiting room" value={waiting.length} detail={waiting.length ? `Average wait ${avgWait} min` : 'Nobody waiting'} tone="amber" />
        <Stat icon={UserX} label="No-shows" value={noShows} detail="Follow-ups in Reminders" tone="red" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_20rem]">
        <Panel
          title="Today’s appointments"
          action={
            <AppButton size="sm" icon={CalendarPlus} onClick={() => setBooking(true)}>
              Book appointment
            </AppButton>
          }
          bodyClassName="p-0"
        >
          <div className="no-scrollbar flex gap-1.5 relative overflow-x-auto border-b border-slate-100 px-4 py-3" role="group" aria-label="Filter by clinician">
            {[{ id: 'all' as const, short: 'Everyone' }, ...CLINICIANS].map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={clinician === c.id}
                onClick={() => setClinician(c.id)}
                className={cn(
                  'shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition',
                  clinician === c.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                )}
              >
                {c.short}
              </button>
            ))}
          </div>
          <ul className="divide-y divide-slate-100">
            {shown.map((a) => {
              const p = patient(a.patientId)
              const doc = CLINICIANS.find((c) => c.id === a.clinicianId)!
              const service = SERVICES.find((s) => s.id === a.serviceId)!
              const late = (a.status === 'Booked' || a.status === 'Confirmed') && now - a.start > 15 * 60_000
              return (
                <li key={a.id} className={cn('flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3', a.status === 'With clinician' && 'bg-(--accent-soft)')}>
                  <p className="w-12 shrink-0 font-semibold text-slate-900 tabular-nums">{clockTime(a.start)}</p>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">
                      {p.name} <span className="text-xs font-normal text-slate-600">· {ageLabel(p.age)}</span>
                    </p>
                    <p className="text-xs text-slate-600">
                      {service.name} · {doc.short}, {doc.room}
                    </p>
                  </div>
                  <Badge tone={statusTone[a.status]}>{a.status}</Badge>
                  <div className="flex w-full justify-end gap-2 sm:w-auto">
                    {(a.status === 'Booked' || a.status === 'Confirmed') && (
                      <>
                        {late && (
                          <AppButton variant="secondary" size="sm" onClick={() => onNoShow(a.id)}>
                            No-show
                          </AppButton>
                        )}
                        <AppButton size="sm" icon={UserCheck} onClick={() => onCheckIn(a.id)} aria-label={`Check in ${p.name}`}>
                          Check in
                        </AppButton>
                      </>
                    )}
                    {a.status === 'Arrived' && (
                      <AppButton size="sm" icon={DoorOpen} onClick={() => onCallIn(a.id)} aria-label={`Call in ${p.name}`}>
                        Call in
                      </AppButton>
                    )}
                    {a.status === 'With clinician' && (
                      <AppButton size="sm" variant="success" icon={CircleCheck} onClick={() => setCompleting(a.id)} aria-label={`Complete the visit for ${p.name}`}>
                        Complete visit
                      </AppButton>
                    )}
                    {a.status === 'Done' && a.finishedAt && <span className="text-xs text-slate-600">Seen {clockTime(a.finishedAt)}</span>}
                  </div>
                </li>
              )
            })}
          </ul>
        </Panel>

        <Panel title="Waiting room" description={waiting.length ? `${waiting.length} checked in` : 'Nobody is waiting'}>
          {waiting.length === 0 ? (
            <p className="text-sm text-slate-600">Check in the next patient to see them here.</p>
          ) : (
            <ul className="space-y-2.5">
              {waiting.map((a) => {
                const minutes = Math.max(0, Math.round((now - (a.arrivedAt ?? now)) / 60_000))
                const doc = CLINICIANS.find((c) => c.id === a.clinicianId)!
                return (
                  <li key={a.id} className="rounded-lg border border-slate-200 p-3">
                    <p className="text-sm font-semibold text-slate-900">{patient(a.patientId).name}</p>
                    <p className="flex items-center gap-1.5 text-xs text-slate-600">
                      <Clock className="size-3.5" aria-hidden="true" />
                      Waiting {minutes} min · for {doc.short}
                    </p>
                    <AppButton size="sm" variant="secondary" className="mt-2" onClick={() => onCallIn(a.id)}>
                      Call in to {doc.room}
                    </AppButton>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>
      </div>

      {completingAppt && (
        <CompleteVisit
          key={completingAppt.id}
          patient={patient(completingAppt.patientId)}
          clinician={CLINICIANS.find((c) => c.id === completingAppt.clinicianId)!.name}
          medicines={medicines}
          now={now}
          onClose={() => setCompleting(null)}
          onDone={(items) => {
            onComplete(completingAppt.id, items)
            setCompleting(null)
          }}
        />
      )}
      {booking && (
        <BookAppointment
          patients={patients}
          appointments={appointments}
          now={now}
          onClose={() => setBooking(false)}
          onBook={(input) => {
            onBook(input)
            setBooking(false)
          }}
        />
      )}
    </div>
  )
}

function CompleteVisit({
  patient,
  clinician,
  medicines,
  now,
  onClose,
  onDone,
}: {
  patient: Patient
  clinician: string
  medicines: Medicine[]
  now: number
  onClose: () => void
  onDone: (items: RxItem[]) => void
}) {
  const [items, setItems] = useState<RxItem[]>([{ medicineId: 'para', dose: DOSES[3], qty: 20 }])
  const update = (index: number, patch: Partial<RxItem>) => setItems((list) => list.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  const valid = items.every((i) => i.qty > 0 && i.qty <= 500)

  return (
    <Modal
      open
      onClose={onClose}
      title={`Complete visit: ${patient.name}`}
      description={`${clinician} · prescriptions go straight to the pharmacy queue`}
      size="lg"
      footer={
        <>
          <AppButton variant="secondary" onClick={() => onDone([])}>
            Complete without prescription
          </AppButton>
          <AppButton icon={Pill} onClick={() => valid && items.length && onDone(items)} disabled={!valid || !items.length}>
            Send prescription to pharmacy
          </AppButton>
        </>
      }
    >
      <ul className="space-y-3">
        {items.map((item, index) => {
          const medicine = medicines.find((m) => m.id === item.medicineId)
          const stock = medicine ? stockOf(medicine, now) : 0
          return (
            <li key={index} className="rounded-lg border border-slate-200 p-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_6rem]">
                <Field label="Medicine" htmlFor={`rx-med-${index}`}>
                  <SelectInput id={`rx-med-${index}`} value={item.medicineId} onChange={(e) => update(index, { medicineId: e.target.value })}>
                    {medicines.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </SelectInput>
                </Field>
                <Field label="Quantity" htmlFor={`rx-qty-${index}`}>
                  <TextInput
                    id={`rx-qty-${index}`}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={500}
                    value={item.qty}
                    onChange={(e) => update(index, { qty: Math.max(0, Math.round(Number(e.target.value) || 0)) })}
                  />
                </Field>
              </div>
              <div className="mt-3 flex items-end gap-2">
                <Field label="Directions" htmlFor={`rx-dose-${index}`} className="flex-1">
                  <SelectInput id={`rx-dose-${index}`} value={item.dose} onChange={(e) => update(index, { dose: e.target.value })}>
                    {DOSES.map((d) => (
                      <option key={d}>{d}</option>
                    ))}
                  </SelectInput>
                </Field>
                <AppButton variant="ghost" size="sm" icon={Trash2} onClick={() => setItems((list) => list.filter((_, i) => i !== index))} aria-label="Remove this medicine">
                  Remove
                </AppButton>
              </div>
              <p className={cn('mt-2 text-xs font-medium', stock >= item.qty ? 'text-emerald-800' : 'text-red-700')}>
                {stock >= item.qty ? `${stock} ${medicine?.unit} in stock` : `Only ${stock} ${medicine?.unit} in stock. The pharmacy will need to order more.`}
              </p>
            </li>
          )
        })}
      </ul>
      <AppButton variant="secondary" size="sm" icon={Plus} className="mt-3" onClick={() => setItems((list) => [...list, { medicineId: 'ibup', dose: DOSES[1], qty: 14 }])}>
        Add a medicine
      </AppButton>
      <Notice tone="neutral" className="mt-4">
        Sample prescription for the demo only. A real system follows your clinic’s prescribing rules.
      </Notice>
    </Modal>
  )
}

function slotsFor(appointments: Appointment[], clinicianId: ClinicianId, day: 'today' | 'tomorrow', now: number): string[] {
  const taken = new Set(
    appointments.filter((a) => a.clinicianId === clinicianId).map((a) => clockTime(a.start)),
  )
  const nowMinutes = new Date(now).getHours() * 60 + new Date(now).getMinutes()
  const slots: string[] = []
  for (let minutes = 8 * 60; minutes <= 16 * 60 + 30; minutes += 15) {
    if (minutes >= 12 * 60 + 30 && minutes < 13 * 60 + 30) continue
    const label = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
    if (day === 'today' && (minutes <= nowMinutes + 10 || taken.has(label))) continue
    slots.push(label)
  }
  return slots
}

function BookAppointment({
  patients,
  appointments,
  now,
  onClose,
  onBook,
}: {
  patients: Patient[]
  appointments: Appointment[]
  now: number
  onClose: () => void
  onBook: (input: BookingInput) => void
}) {
  const [mode, setMode] = useState<'existing' | 'new'>('existing')
  const [patientId, setPatientId] = useState(patients[0]?.id ?? '')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [serviceId, setServiceId] = useState<ServiceId>('gp')
  const doctors = CLINICIANS.filter((c) => OFFERS[c.id].includes(serviceId))
  const [clinicianId, setClinicianId] = useState<ClinicianId>(doctors[0].id)
  const [day, setDay] = useState<'today' | 'tomorrow'>('today')
  const [confirm, setConfirm] = useState(true)
  const activeDoctor = doctors.some((d) => d.id === clinicianId) ? clinicianId : doctors[0].id
  const slots = slotsFor(appointments, activeDoctor, day, now)
  const [time, setTime] = useState('')
  const activeTime = slots.includes(time) ? time : (slots[0] ?? '')
  const newValid = name.trim().length >= 2 && phone.replace(/\D/g, '').length >= 9
  const valid = Boolean(activeTime) && (mode === 'existing' ? Boolean(patientId) : newValid)

  return (
    <Modal
      open
      onClose={onClose}
      title="Book an appointment"
      size="md"
      footer={
        <>
          <AppButton variant="secondary" onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton
            icon={CalendarPlus}
            disabled={!valid}
            onClick={() =>
              valid &&
              onBook({
                patientId: mode === 'existing' ? patientId : undefined,
                newPatient: mode === 'new' ? { name: name.trim(), phone: phone.trim() } : undefined,
                serviceId,
                clinicianId: activeDoctor,
                day,
                time: activeTime,
                confirm,
              })
            }
          >
            Book
          </AppButton>
        </>
      }
    >
      <div className="space-y-4">
        <Segmented
          label="Patient"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'existing', label: 'Existing patient' },
            { value: 'new', label: 'New patient' },
          ]}
          className="w-full"
        />
        {mode === 'existing' ? (
          <Field label="Patient" htmlFor="book-patient">
            <SelectInput id="book-patient" value={patientId} onChange={(e) => setPatientId(e.target.value)}>
              {[...patients].sort((a, b) => a.name.localeCompare(b.name)).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({ageLabel(p.age)})
                </option>
              ))}
            </SelectInput>
          </Field>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Full name" htmlFor="book-name">
              <TextInput id="book-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoComplete="off" />
            </Field>
            <Field label="WhatsApp number" htmlFor="book-phone" hint="Used for reminders">
              <TextInput id="book-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+263 …" autoComplete="off" />
            </Field>
          </div>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Service" htmlFor="book-service">
            <SelectInput id="book-service" value={serviceId} onChange={(e) => setServiceId(e.target.value as ServiceId)}>
              {SERVICES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} (${s.fee})
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="With" htmlFor="book-clinician">
            <SelectInput id="book-clinician" value={activeDoctor} onChange={(e) => setClinicianId(e.target.value as ClinicianId)}>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-semibold text-slate-700">Day</p>
            <Segmented
              label="Day"
              value={day}
              onChange={setDay}
              options={[
                { value: 'today', label: 'Today' },
                { value: 'tomorrow', label: 'Tomorrow' },
              ]}
              className="w-full"
            />
          </div>
          <Field label="Time" htmlFor="book-time" error={slots.length ? undefined : 'No free times left today. Try tomorrow.'}>
            <SelectInput id="book-time" value={activeTime} onChange={(e) => setTime(e.target.value)} disabled={!slots.length}>
              {slots.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </SelectInput>
          </Field>
        </div>
        <Toggle checked={confirm} onChange={setConfirm} label="Send a WhatsApp confirmation" description="The patient also gets a reminder before the visit." />
      </div>
    </Modal>
  )
}
