import { daysAgoAt, todayAt } from '../../lib/time'
import type { Change, Enquiry, FontId, Palette, RedesignState, ResultRow, Service, Topic } from './types'

/* Sample business: Kopje Spring Drilling, an invented borehole company in Harare, Zimbabwe. */

export const BUSINESS = {
  name: 'Kopje Spring Drilling',
  legalName: 'Kopje Spring Drilling (Pvt) Ltd',
  domain: 'kopjespringdrilling.co.zw',
  email: 'info@kopjespringdrilling.co.zw',
  phone: '+263 77 ••• 6620',
  yard: 'Msasa, Harare',
  hours: 'Mon to Fri 7:30 to 17:00 · Sat 8:00 to 13:00',
}

/* All three pass WCAG AA with white text (checked in the logic script). The first matches the demo's accent. */
export const PALETTES: Palette[] = [
  { id: 'blue', label: 'Borehole blue', base: '#0e7490', strong: '#155e75', soft: '#ecfeff', ink: '#164e63' },
  { id: 'green', label: 'Savanna green', base: '#4d7c0f', strong: '#3f6212', soft: '#f7fee7', ink: '#365314' },
  { id: 'clay', label: 'Sunset clay', base: '#a8431f', strong: '#8c3518', soft: '#fdf3ee', ink: '#7a2e14' },
]

const SYSTEM_STACK = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif"

export const FONTS: { id: FontId; label: string; heading: string; detail: string }[] = [
  { id: 'system', label: 'System sans', heading: SYSTEM_STACK, detail: 'Uses the phone’s own font, so there’s nothing extra to download' },
  {
    id: 'montserrat',
    label: 'Montserrat headings',
    heading: "'Montserrat Variable', ui-sans-serif, system-ui, sans-serif",
    detail: 'Bolder headings for one small extra font file',
  },
]

export const BODY_FONT = SYSTEM_STACK

/* Body text colour on the new site. 7.1:1 on white, the figure quoted in "What changed". */
export const NEW_TEXT = '#4b5a6b'
/* Body text colour on the old site. 2.6:1 on white. */
export const OLD_TEXT = '#a0a0a0'

export const AREAS = ['Harare', 'Chitungwiza', 'Ruwa', 'Norton', 'Marondera', 'Epworth', 'Goromonzi', 'Domboshava']

export const SERVICES: Service[] = [
  { id: 'drilling', title: 'Siting and drilling', text: 'We survey your stand, then drill to 40 m with casing and flushing.', from: 1200, icon: 'drill', need: 'New borehole' },
  { id: 'solar', title: 'Solar pump kits', text: 'Panels, pump and controller sized to your borehole and tank.', from: 950, icon: 'sun', need: 'Solar pump kit' },
  { id: 'electric', title: 'Electric pumps', text: 'Submersible pumps for homes and plots on mains power.', from: 480, icon: 'zap', need: 'Electric pump' },
  { id: 'tanks', title: 'Tanks and stands', text: '5,000 L to 10,000 L tanks on steel stands up to 6 m.', from: 380, icon: 'tank', need: 'Tank and stand' },
  { id: 'testing', title: 'Water testing', text: 'A lab test for safety and taste, with a written report.', from: 45, icon: 'flask', need: 'Water quality test' },
  { id: 'repairs', title: 'Maintenance and repairs', text: 'Pump repairs, flushing and a yearly check-up.', from: 120, icon: 'wrench', need: 'Borehole repair or maintenance' },
]

export const PACKAGES = [
  { name: 'Drilling only', from: 1200, items: ['Siting survey', 'Drilling to 40 m', 'Casing and gravel pack', 'Flushing and yield test'] },
  { name: 'Drill and pump', from: 2150, items: ['Everything in Drilling only', 'Electric submersible pump', 'Control box and wiring', 'Pipe to your tank'] },
  { name: 'Complete solar system', from: 3450, items: ['Drilling to 40 m', 'Solar pump kit', '5,000 L tank on a 3 m stand', 'Water test at handover'] },
]

export const EXTRAS: [string, string][] = [
  ['Siting survey on its own', '$150'],
  ['Extra depth past 40 m', '$28 per metre'],
  ['Pump repair call-out in Harare', '$35'],
  ['Yearly borehole check-up', '$120'],
]

export const STEPS = [
  { title: 'Site survey', text: 'We visit, check the ground and mark the best spot to drill.' },
  { title: 'Fixed quote', text: 'You get a written quote within 24 hours, agreed before we start.' },
  { title: 'Drilling day', text: 'Most boreholes are drilled, cased and flushed in a day.' },
  { title: 'Pump, tank and test', text: 'We fit your pump and tank and hand over the water test results.' },
]

export const TOPICS: Topic[] = [
  { id: 'borehole', label: 'New borehole', need: 'New borehole, site survey wanted', line: 'I’d like a site survey for a new borehole at my home.' },
  { id: 'solar', label: 'Solar pump', need: 'Solar pump for an existing borehole', line: 'We have a borehole and I’d like a price for a solar pump.' },
  { id: 'test', label: 'Water test', need: 'Water quality test', line: 'I’d like our borehole water tested.' },
  { id: 'repair', label: 'Repair', need: 'Borehole repair or maintenance', line: 'Our borehole pump has stopped working. Can someone come and look at it?' },
]

export const CHANGES: Change[] = [
  {
    id: 1,
    title: 'A headline that says what you do',
    before: '“Welcome to our website” told visitors nothing.',
    after: 'The headline says what Kopje Spring does, with one clear “Get a site survey” button.',
    why: 'Visitors know in seconds that they’re in the right place.',
  },
  {
    id: 2,
    title: 'Call and WhatsApp at the top',
    before: 'The phone number was only in the footer.',
    after: 'Call and WhatsApp buttons sit in the header, always in reach.',
    why: 'Someone ready to talk can do it in one tap.',
    metric: { label: 'Taps to call', before: '4', after: '1' },
  },
  {
    id: 3,
    title: 'Text you can read on a phone',
    before: 'Body text was 12 px, and phones shrank the whole page to fit.',
    after: 'Body text is 17 px and the layout is built for phones first.',
    why: 'No pinching and zooming to read prices.',
    metric: { label: 'Text size', before: '12 px', after: '17 px' },
  },
  {
    id: 4,
    title: 'Stronger colour contrast',
    before: 'Pale grey text and light blue links were hard to read.',
    after: 'Dark text on white, and buttons that pass contrast checks.',
    why: 'Easy to read in bright sunlight and for people with weaker eyesight.',
    metric: { label: 'Colour contrast', before: '2.6:1', after: '7.1:1' },
  },
  {
    id: 5,
    title: 'A shorter menu',
    before: 'Nine menu items wrapped onto two lines.',
    after: 'Four items: Home, Services, Prices and Contact.',
    why: 'Visitors find what they need without hunting.',
    metric: { label: 'Menu items', before: '9', after: '4' },
  },
  {
    id: 6,
    title: 'A much lighter page',
    before: 'A slideshow of large photos made the page slow and heavy.',
    after: 'Simple drawings and compressed images that load fast.',
    why: 'The page opens quickly on mobile data and uses less of the visitor’s bundle.',
    metric: { label: 'Home page', before: '6.1 MB', after: '0.42 MB' },
  },
  {
    id: 7,
    title: 'Services with prices',
    before: 'Services were a long list ending in “contact us for a quotation”.',
    after: 'Each service is a card with a “from” price.',
    why: 'Visitors can check costs before they call.',
    metric: { label: 'Services with prices', before: '0', after: '6' },
  },
  {
    id: 8,
    title: 'A three-field enquiry form',
    before: 'The form asked for nine things, including a fax number.',
    after: 'Name, phone and area. The team calls back for the rest.',
    why: 'A short form is quick to finish on a phone.',
    metric: { label: 'Contact form', before: '9 fields', after: '3' },
  },
]

export const RESULTS: ResultRow[] = [
  { label: 'Page size', hint: 'Home page download. Lower is better.', before: 6.1, after: 0.42, beforeLabel: '6.1 MB', afterLabel: '0.42 MB', better: 'lower' },
  { label: 'Load time on a slow 3G phone', hint: 'Until the page can be used. Lower is better.', before: 11.4, after: 2.1, beforeLabel: '11.4 s', afterLabel: '2.1 s', better: 'lower' },
  { label: 'Mobile-friendliness score', hint: 'Out of 100. Higher is better.', before: 38, after: 96, beforeLabel: '38', afterLabel: '96', better: 'higher' },
  { label: 'Accessibility problems', hint: 'Found by an automated check. Lower is better.', before: 23, after: 0, beforeLabel: '23', afterLabel: '0', better: 'lower' },
  { label: 'Taps to contact', hint: 'From the home page on a phone. Lower is better.', before: 4, after: 1, beforeLabel: '4', afterLabel: '1', better: 'lower' },
  { label: 'Text size', hint: 'Body text. Higher is better.', before: 12, after: 17, beforeLabel: '12 px', afterLabel: '17 px', better: 'higher' },
  { label: 'Basic SEO checks passed', hint: 'Page titles, descriptions, headings and more. Higher is better.', before: 5, after: 12, beforeLabel: '5 of 12', afterLabel: '12 of 12', better: 'higher' },
]

function sampleEnquiries(): Enquiry[] {
  const rows: Omit<Enquiry, 'id' | 'ref'>[] = [
    { name: 'Kudzai Mutasa', phone: '+263 71 ••• 5832', area: 'Domboshava', source: 'Call button', need: 'Replacement pump after a burnt-out motor', at: daysAgoAt(5, 10, 5), status: 'Quoted' },
    { name: 'Grace Mlambo', phone: '+44 ••• 0187', area: 'Greendale, Harare', source: 'Form', need: 'Borehole at my parents’ home. I live in the UK', at: daysAgoAt(4, 20, 15), status: 'Survey booked' },
    {
      name: 'Nyasha Moyo',
      phone: '+263 78 ••• 9046',
      area: 'Marondera',
      source: 'WhatsApp button',
      need: 'Tank stand and 10,000 L tank',
      at: daysAgoAt(3, 16, 40),
      status: 'Quoted',
      message: 'Good afternoon. Do you supply a 10,000 L tank on a 6 m stand in Marondera? We already have the borehole.',
    },
    { name: 'Priya Naidoo', phone: '+263 77 ••• 3317', area: 'Mount Pleasant, Harare', source: 'Form', need: 'Pump running but no water, needs maintenance', at: daysAgoAt(3, 9, 20), status: 'Contacted' },
    { name: 'Farai Gumbo', phone: '+263 77 ••• 7720', area: 'Norton', source: 'Form', need: 'Borehole and 5,000 L tank for a smallholding', at: daysAgoAt(2, 15, 5), status: 'Survey booked' },
    { name: 'Sibusiso Ncube', phone: '+263 73 ••• 4405', area: 'Chitungwiza', source: 'Call button', need: 'Water test for a school', at: daysAgoAt(1, 11, 30), status: 'Contacted' },
    {
      name: 'Rudo Chikomo',
      phone: '+263 78 ••• 2261',
      area: 'Ruwa',
      source: 'WhatsApp button',
      need: 'Solar pump for an existing borehole',
      at: daysAgoAt(1, 18, 10),
      status: 'New',
      message: 'Hello, we have a borehole but the power cuts mean no water most evenings. How much is a solar pump?',
    },
    { name: 'Tendai Mukarati', phone: '+263 77 ••• 1958', area: 'Borrowdale, Harare', source: 'Form', need: 'New borehole for a house in Borrowdale', at: todayAt(7, 45), status: 'New' },
  ]
  return rows.map((row, i) => ({ ...row, id: `enq-${2033 + i}`, ref: `KSD-${2033 + i}` })).reverse()
}

export function createInitialState(): RedesignState {
  return { enquiries: sampleEnquiries(), nextRef: 2041, style: { palette: 'blue', font: 'system' } }
}
