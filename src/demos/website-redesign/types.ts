export type EnquiryStatus = 'New' | 'Contacted' | 'Survey booked' | 'Quoted'

export type EnquirySource = 'Form' | 'WhatsApp button' | 'Call button'

export interface Enquiry {
  id: string
  ref: string
  name: string
  /** Stored masked, the way the team list shows it. */
  phone: string
  area: string
  source: EnquirySource
  need: string
  at: number
  status: EnquiryStatus
  /** Sent by the visitor in this demo. */
  mine?: boolean
  /** The WhatsApp message, when there is one. */
  message?: string
}

export type PaletteId = 'blue' | 'green' | 'clay'
export type FontId = 'system' | 'montserrat'

export interface SiteStyle {
  palette: PaletteId
  font: FontId
}

export interface RedesignState {
  enquiries: Enquiry[]
  nextRef: number
  style: SiteStyle
}

export interface Palette {
  id: PaletteId
  label: string
  base: string
  strong: string
  soft: string
  ink: string
}

export interface Change {
  id: number
  title: string
  before: string
  after: string
  why: string
  metric?: { label: string; before: string; after: string }
}

export interface ResultRow {
  label: string
  hint: string
  before: number
  after: number
  beforeLabel: string
  afterLabel: string
  better: 'lower' | 'higher'
}

export type TopicId = 'borehole' | 'solar' | 'test' | 'repair'

export interface Topic {
  id: TopicId
  label: string
  need: string
  line: string
}

export type ServiceIcon = 'drill' | 'sun' | 'zap' | 'tank' | 'flask' | 'wrench'

export interface Service {
  id: string
  title: string
  text: string
  from: number
  icon: ServiceIcon
  need: string
}

export type SectionId = 'home' | 'services' | 'prices' | 'contact'
