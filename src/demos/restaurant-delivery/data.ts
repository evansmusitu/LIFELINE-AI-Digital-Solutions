import { todayAt } from '../../lib/time'
import { cartTotals, customerMessage, flowFor, generateDay, priceLine, promisedFor } from './engine'
import type { Area, CategoryId, Channel, Details, KitchenState, LineOptions, MenuItem, Mode, Order, Payment, Rider, RiderId, Status } from './types'

/* Sample business: Dhow & Thyme, an invented Levantine and Emirati grill kitchen in Abu Dhabi, UAE. */

export const BUSINESS = {
  name: 'Dhow & Thyme',
  locale: 'en-GB',
  pickupFrom: 'our kitchen in Al Zahiyah',
  chef: 'Rania Haddad',
  manager: { name: 'Omar Siddiqui', email: 'omar@dhowandthyme.ae' },
}

/** Orders from this time count as "tonight". */
export const EVENING_FROM = { hours: 17, minutes: 0 }

export const CATEGORIES: { id: CategoryId; label: string }[] = [
  { id: 'mezze', label: 'Mezze' },
  { id: 'grills', label: 'Grills' },
  { id: 'wraps', label: 'Wraps' },
  { id: 'rice', label: 'Rice and bowls' },
  { id: 'sides', label: 'Sides' },
  { id: 'desserts', label: 'Desserts' },
  { id: 'drinks', label: 'Drinks' },
]

export const RIDERS: Rider[] = [
  { id: 'bilal', name: 'Bilal', phone: '+971 50 ••• 2214' },
  { id: 'joseph', name: 'Joseph', phone: '+971 55 ••• 7031' },
  { id: 'arjun', name: 'Arjun', phone: '+971 52 ••• 5586' },
]

type Row = Omit<MenuItem, 'available' | 'extras'> & { extras?: MenuItem['extras'] }

const GRILL_EXTRAS: MenuItem['extras'] = ['garlic', 'bread', 'halloumi']

const MENU: Row[] = [
  { id: 'hummus-lamb', name: 'Hummus with spiced lamb', description: 'Silky hummus topped with minced lamb, pine nuts and sumac.', category: 'mezze', icon: 'soup', price: 8.5, tags: ['Contains nuts'], extras: ['bread'] },
  { id: 'hummus', name: 'Classic hummus', description: 'Chickpeas, tahini, lemon and olive oil, with warm bread.', category: 'mezze', icon: 'leaf', price: 6, tags: ['Vegan'], extras: ['bread'] },
  { id: 'muhammara', name: 'Muhammara', description: 'Roasted red pepper and walnut dip with pomegranate molasses.', category: 'mezze', icon: 'soup', price: 6.5, tags: ['Vegan', 'Contains nuts', 'Spicy'], extras: ['bread'] },
  { id: 'moutabal', name: 'Moutabal', description: 'Smoky chargrilled aubergine with tahini and garlic.', category: 'mezze', icon: 'soup', price: 6.5, tags: ['Vegetarian'], extras: ['bread'] },
  { id: 'fattoush', name: 'Fattoush', description: 'Crisp lettuce, tomato, radish and toasted bread, sumac dressing.', category: 'mezze', icon: 'salad', price: 7, tags: ['Vegan'], extras: ['halloumi'] },
  { id: 'halloumi', name: 'Grilled halloumi', description: 'Chargrilled halloumi with tomato, mint and za’atar oil.', category: 'mezze', icon: 'flame', price: 7.5, tags: ['Vegetarian'], extras: ['bread'] },
  { id: 'shish-tawook', name: 'Chicken shish tawook', description: 'Garlic and yoghurt chicken skewers, pickles and bread.', category: 'grills', icon: 'drumstick', price: 13.5, tags: [], largeDelta: 4, spice: true, extras: GRILL_EXTRAS },
  { id: 'mixed-grill', name: 'Mixed grill', description: 'Shish tawook, lamb kofta and lamb tikka with grilled tomato and bread.', category: 'grills', icon: 'flame', price: 16.5, tags: [], largeDelta: 5, spice: true, extras: GRILL_EXTRAS },
  { id: 'lamb-kofta', name: 'Lamb kofta', description: 'Minced lamb with parsley and onion, tahini and bread.', category: 'grills', icon: 'beef', price: 14, tags: [], largeDelta: 4, spice: true, extras: GRILL_EXTRAS },
  { id: 'lamb-chops', name: 'Lamb chops', description: 'Four chops with seven-spice, lemon and grilled onion.', category: 'grills', icon: 'beef', price: 19, tags: [], largeDelta: 6, extras: GRILL_EXTRAS },
  { id: 'hammour', name: 'Grilled hammour', description: 'Gulf hammour fillet with chermoula and lemon rice.', category: 'grills', icon: 'fish', price: 17.5, tags: ['Spicy'], extras: ['garlic', 'bread'] },
  { id: 'shawarma-wrap', name: 'Chicken shawarma wrap', description: 'Garlic sauce, pickles and fries rolled in saj bread.', category: 'wraps', icon: 'sandwich', price: 7.5, tags: [], spice: true, extras: ['garlic', 'halloumi'] },
  { id: 'falafel-wrap', name: 'Falafel wrap', description: 'Crisp falafel, tahini, tomato, parsley and turnip pickles.', category: 'wraps', icon: 'sandwich', price: 6.5, tags: ['Vegan'], spice: true, extras: ['garlic', 'halloumi'] },
  { id: 'halloumi-wrap', name: 'Halloumi wrap', description: 'Grilled halloumi, rocket, tomato and mint.', category: 'wraps', icon: 'sandwich', price: 7, tags: ['Vegetarian'], extras: ['garlic'] },
  { id: 'machboos', name: 'Machboos chicken', description: 'Emirati spiced rice with slow-cooked chicken, loomi and crispy onions.', category: 'rice', icon: 'pot', price: 13, tags: [], largeDelta: 3, extras: ['garlic'] },
  { id: 'harees', name: 'Harees', description: 'Slow-cooked wheat and lamb, the Emirati classic, finished with ghee.', category: 'rice', icon: 'wheat', price: 10.5, tags: [], largeDelta: 3, extras: [] },
  { id: 'shawarma-plate', name: 'Shawarma plate', description: 'Chicken shawarma on saffron rice, garlic sauce and salad.', category: 'rice', icon: 'drumstick', price: 12.5, tags: [], largeDelta: 3, spice: true, extras: ['garlic', 'bread'] },
  { id: 'freekeh-bowl', name: 'Lentil and freekeh bowl', description: 'Smoked green wheat, lentils, roast vegetables and tahini.', category: 'rice', icon: 'salad', price: 10, tags: ['Vegan'], largeDelta: 3, extras: ['halloumi'] },
  { id: 'fries', name: 'Fries with za’atar', description: 'Crisp fries tossed with za’atar and sea salt.', category: 'sides', icon: 'leaf', price: 3.5, tags: ['Vegan'], largeDelta: 1.5, extras: ['garlic'] },
  { id: 'batata-harra', name: 'Batata harra', description: 'Crispy potatoes with chilli, garlic and coriander.', category: 'sides', icon: 'flame', price: 4.5, tags: ['Vegan', 'Spicy'], extras: ['garlic'] },
  { id: 'saj-bread', name: 'Saj bread basket', description: 'Thin bread fresh off the dome, with za’atar oil.', category: 'sides', icon: 'wheat', price: 2.5, tags: ['Vegan'], extras: [] },
  { id: 'luqaimat', name: 'Luqaimat', description: 'Crisp saffron dumplings with date syrup and sesame.', category: 'desserts', icon: 'cookie', price: 5.5, tags: ['Vegetarian'], extras: [] },
  { id: 'kunafa', name: 'Kunafa', description: 'Warm shredded pastry with melted cheese, syrup and pistachio.', category: 'desserts', icon: 'cake', price: 7, tags: ['Vegetarian', 'Contains nuts'], extras: [] },
  { id: 'umm-ali', name: 'Umm Ali', description: 'Baked pastry pudding with milk, coconut and nuts.', category: 'desserts', icon: 'cake', price: 6.5, tags: ['Vegetarian', 'Contains nuts'], extras: [] },
  { id: 'karak', name: 'Karak tea', description: 'Strong tea with cardamom, saffron and evaporated milk.', category: 'drinks', icon: 'coffee', price: 2.5, tags: ['Vegetarian'], extras: [] },
  { id: 'lemon-mint', name: 'Fresh lemon mint', description: 'Blended lemon, fresh mint and a little sugar, over ice.', category: 'drinks', icon: 'citrus', price: 4, tags: ['Vegan'], largeDelta: 1.5, extras: [] },
  { id: 'laban', name: 'Laban ayran', description: 'Chilled salted yoghurt drink.', category: 'drinks', icon: 'cup', price: 2.5, tags: ['Vegetarian'], extras: [] },
  { id: 'gahwa', name: 'Arabic coffee', description: 'Light-roast gahwa with cardamom, served with dates.', category: 'drinks', icon: 'coffee', price: 3, tags: ['Vegan'], extras: [] },
]

/** Made at the bar, so left out of kitchen counts and top dishes. */
export const DRINKS = new Set(MENU.filter((row) => row.category === 'drinks').map((row) => row.id))

const AREAS: Area[] = [
  { id: 'al-reem', name: 'Al Reem Island', fee: 3, etaMin: 35, etaMax: 45, rideMin: 12, on: true },
  { id: 'al-raha', name: 'Al Raha Beach', fee: 5, etaMin: 45, etaMax: 55, rideMin: 25, on: true },
  { id: 'khalifa', name: 'Khalifa City', fee: 5.5, etaMin: 50, etaMax: 60, rideMin: 28, on: true },
  { id: 'corniche', name: 'Corniche', fee: 2, etaMin: 25, etaMax: 35, rideMin: 8, on: true },
  { id: 'saadiyat', name: 'Saadiyat Island', fee: 4, etaMin: 35, etaMax: 45, rideMin: 15, on: true },
  { id: 'mussafah', name: 'Mussafah', fee: 6, etaMin: 50, etaMax: 60, rideMin: 30, on: true },
  { id: 'yas', name: 'Yas Island', fee: 6, etaMin: 50, etaMax: 60, rideMin: 30, on: true },
]

export const EMPTY_DETAILS: Details = {
  mode: 'delivery',
  areaId: 'al-reem',
  name: '',
  phone: '',
  building: '',
  directions: '',
  payment: 'card',
}

export const SAMPLE_DETAILS: Pick<Details, 'name' | 'phone' | 'building' | 'directions'> = {
  name: 'Layla Mansour',
  phone: '050 123 4410',
  building: 'Building C4, flat 1207',
  directions: 'Main lobby, the concierge will call up',
}

const NAMES = [
  'Maryam A.', 'Rohan P.', 'Grace O.', 'Khalid S.', 'Ana R.', 'Tomasz W.', 'Aisha B.', 'Nikhil M.', 'Chiara L.', 'Yousef H.',
  'Joy D.', 'Sami N.', 'Fatima Z.', 'Priya K.', 'Hamdan M.', 'Lina T.', 'Daniel E.', 'Mei C.', 'Reem J.', 'Kwame A.',
  'Sofia G.', 'Imran Q.', 'Hessa R.', 'Arnel C.', 'Nadia E.',
]

const WEIGHTS: Record<string, number> = {
  'shish-tawook': 6, 'mixed-grill': 5, 'shawarma-plate': 5, 'shawarma-wrap': 5, 'hummus-lamb': 3, hummus: 3, fattoush: 4,
  machboos: 4, 'falafel-wrap': 3, karak: 5, 'lemon-mint': 5, kunafa: 3, luqaimat: 3, fries: 4, 'lamb-kofta': 3,
  'al-reem': 4, corniche: 3, saadiyat: 3, 'al-raha': 2, khalifa: 2,
}

type Hm = [hours: number, minutes: number]
type SeedLine = [itemId: string, qty: number, options?: Partial<LineOptions>]

interface SeedTicket {
  mode: Mode
  channel: Channel
  customer: string
  phone?: string
  areaId?: string
  table?: number
  payment: Payment
  lines: SeedLine[]
  at: Partial<Record<Status, Hm>>
  rider?: RiderId
  /** Shown on Track order before the visitor places an order. */
  sample?: boolean
}

// Tonight's open tickets at 19:05, across the kitchen columns.
const OPEN_TICKETS: SeedTicket[] = [
  {
    mode: 'delivery', channel: 'Website', customer: 'Fatima Z.', phone: '+971 50 ••• 8812', areaId: 'saadiyat', payment: 'card',
    lines: [['mixed-grill', 1, { spice: 'Medium' }], ['fattoush', 1], ['lemon-mint', 2]],
    at: { received: [18, 31], cooking: [18, 33], ready: [18, 49], out: [18, 58] }, rider: 'joseph',
  },
  {
    mode: 'delivery', channel: 'App', customer: 'Nikhil M.', phone: '+971 56 ••• 3027', areaId: 'al-raha', payment: 'online',
    lines: [['shawarma-plate', 2, { spice: 'Hot' }], ['batata-harra', 1], ['karak', 2]],
    at: { received: [18, 41], cooking: [18, 43], ready: [19, 0] },
  },
  {
    mode: 'pickup', channel: 'Phone', customer: 'Rohan P.', phone: '+971 54 ••• 6190', payment: 'cash',
    lines: [['lamb-kofta', 1, { spice: 'Medium', extras: ['bread'] }], ['hummus', 1], ['fries', 1]],
    at: { received: [18, 44], cooking: [18, 46], ready: [19, 2] },
  },
  {
    mode: 'dine-in', channel: 'Dine-in', customer: 'Table 3', table: 3, payment: 'card',
    lines: [['mixed-grill', 2, { size: 'Large', spice: 'Medium' }], ['hummus-lamb', 1], ['machboos', 1], ['lemon-mint', 3]],
    at: { received: [18, 44], cooking: [18, 47] },
  },
  {
    mode: 'delivery', channel: 'Website', customer: 'Grace O.', phone: '+971 50 ••• 7745', areaId: 'al-reem', payment: 'card',
    lines: [['shish-tawook', 2, { spice: 'Hot', extras: ['garlic'] }], ['fattoush', 1, { notes: 'No onions' }], ['kunafa', 1]],
    at: { received: [18, 52], cooking: [18, 54] }, sample: true,
  },
  {
    mode: 'pickup', channel: 'App', customer: 'Khalid S.', phone: '+971 52 ••• 4318', payment: 'online',
    lines: [['shawarma-wrap', 2, { spice: 'Medium', notes: 'Extra pickles' }], ['luqaimat', 1], ['karak', 2]],
    at: { received: [18, 57], cooking: [18, 59] },
  },
  {
    mode: 'delivery', channel: 'App', customer: 'Ana R.', phone: '+971 58 ••• 0962', areaId: 'khalifa', payment: 'card',
    lines: [['falafel-wrap', 1, { spice: 'Mild', notes: 'Allergy: sesame. No tahini, please' }], ['muhammara', 1], ['freekeh-bowl', 1]],
    at: { received: [19, 1] },
  },
  {
    mode: 'dine-in', channel: 'Dine-in', customer: 'Table 6', table: 6, payment: 'cash',
    lines: [['harees', 1], ['mixed-grill', 1, { spice: 'Mild' }], ['moutabal', 1], ['lemon-mint', 2]],
    at: { received: [19, 3] },
  },
  {
    mode: 'delivery', channel: 'Phone', customer: 'Tomasz W.', phone: '+971 55 ••• 2481', areaId: 'corniche', payment: 'cash',
    lines: [['shish-tawook', 1, { spice: 'Medium', notes: 'Sauce on the side' }], ['falafel-wrap', 1, { spice: 'Medium' }], ['fries', 1, { size: 'Large' }]],
    at: { received: [19, 4] },
  },
]

const FLOW_ORDER: Status[] = ['received', 'cooking', 'ready', 'out', 'delivered', 'collected', 'served']

function openTicket(items: MenuItem[], areas: Area[], seed: SeedTicket): Order {
  const lines = seed.lines.map(([itemId, qty, opts]) => {
    const item = items.find((i) => i.id === itemId)!
    const options: LineOptions = { size: 'Regular', extras: [], notes: '', ...opts }
    return { itemId, name: item.name, qty, unit: priceLine(item, options), options }
  })
  const area = areas.find((a) => a.id === seed.areaId)
  const totals = cartTotals(lines, area, seed.mode)
  const times: Order['times'] = {}
  for (const [status, [h, m]] of Object.entries(seed.at) as [Status, Hm][]) times[status] = todayAt(h, m)
  const status = FLOW_ORDER.filter((s) => times[s] !== undefined).pop() ?? 'received'
  return {
    id: '',
    number: '',
    mode: seed.mode,
    channel: seed.channel,
    customer: seed.customer,
    phone: seed.phone,
    areaId: seed.areaId,
    table: seed.table,
    payment: seed.payment,
    lines,
    subtotal: totals.subtotal,
    fee: totals.fee,
    vat: totals.vat,
    total: totals.total,
    status,
    placedAt: times.received!,
    times,
    promisedMin: promisedFor(seed.mode, area, false),
    rider: seed.rider,
    messages: [],
  }
}

const NEXT_NUMBER = 3418

export function createInitialState(): KitchenState {
  const items: MenuItem[] = MENU.map((row) => ({ ...row, extras: row.extras ?? [], available: true }))
  const areas = AREAS.map((a) => ({ ...a }))
  const history = generateDay({
    seed: 3418,
    items,
    areas,
    names: NAMES,
    weights: WEIGHTS,
    hourly: [[11, 6], [12, 13], [13, 14], [14, 8], [15, 5], [16, 7], [17, 13], [18, 10]],
    at: todayAt,
    cutoff: todayAt(19, 3),
  })
  const open = OPEN_TICKETS.map((t) => openTicket(items, areas, t))
  const all = [...history, ...open].sort((a, b) => a.placedAt - b.placedAt)
  const first = NEXT_NUMBER - all.length
  const sample = all.indexOf(open[OPEN_TICKETS.findIndex((t) => t.sample)])
  const orders = all.map((o, i) => {
    const order = { ...o, id: `o-${first + i}`, number: `DT-${first + i}` }
    if (!open.includes(o) || o.mode === 'dine-in') return order
    // Open orders already sent their customer a message for each step so far.
    const rider = RIDERS.find((r) => r.id === o.rider)
    const ride = areas.find((a) => a.id === o.areaId)?.rideMin
    const messages = flowFor(o.mode)
      .filter((s) => o.times[s] !== undefined)
      .map((s) => ({ at: o.times[s]!, text: customerMessage(order, s, rider, ride) }))
    return { ...order, messages }
  })
  return {
    items,
    areas,
    busy: false,
    orders,
    cart: [],
    details: { ...EMPTY_DETAILS },
    nextNumber: NEXT_NUMBER,
    sampleId: orders[sample].id,
  }
}
