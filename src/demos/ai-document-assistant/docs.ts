import { money, moneyWhole, shortDate } from '../../lib/format'
import { DAY, todayAt } from '../../lib/time'
import type { DeliveryRules, Doc, DocSection, ZoneId } from './types'

/* The four sample documents of Irkdale Building Supplies, an invented builders’ merchant in Manchester, UK. */

export const BUSINESS = {
  name: 'Irkdale Building Supplies',
  descriptor: 'Builders’ merchant · Manchester, UK',
  opens: '6:30',
}

export const STAFF = {
  manager: 'Gareth Holloway',
  counter: 'Shazia Begum',
  yard: 'Callum Reid',
}

const PLACE_ZONES: [ZoneId | 'out', string[]][] = [
  ['A', ['Manchester city centre', 'Ancoats', 'Ardwick', 'Openshaw', 'Gorton', 'Clayton', 'Levenshulme', 'Longsight',
    'Rusholme', 'Fallowfield', 'Withington', 'Moss Side', 'Hulme', 'Chorlton', 'Didsbury', 'Burnage', 'Droylsden',
    'Denton', 'Audenshaw', 'Failsworth']],
  ['B', ['Stockport', 'Salford', 'Trafford', 'Stretford', 'Urmston', 'Eccles', 'Swinton', 'Prestwich', 'Whitefield',
    'Bury', 'Radcliffe', 'Middleton', 'Oldham', 'Rochdale', 'Heywood', 'Ashton-under-Lyne', 'Stalybridge', 'Hyde',
    'Marple', 'Cheadle', 'Bramhall', 'Wilmslow', 'Altrincham', 'Bolton', 'Glossop']],
  ['C', ['Wigan', 'Leigh', 'Warrington', 'Macclesfield', 'Knutsford', 'Chorley', 'Rawtenstall', 'Buxton',
    'Huddersfield', 'St Helens']],
  ['out', ['Liverpool', 'Leeds', 'Sheffield', 'Preston', 'Chester', 'Blackpool', 'Stoke-on-Trent']],
]

const placeMap: DeliveryRules['places'] = {
  manchester: { zone: 'A', name: 'Manchester' },
  'city centre': { zone: 'A', name: 'the city centre' },
  'old trafford': { zone: 'B', name: 'Old Trafford' },
  ashton: { zone: 'B', name: 'Ashton' },
}
for (const [zone, names] of PLACE_ZONES) for (const name of names) placeMap[name.toLowerCase().replace(/-/g, ' ')] = { zone, name }

export const DELIVERY: DeliveryRules = {
  docId: 'delivery',
  zones: [
    { id: 'A', miles: 'within 5 miles', fee: 35, freeOver: 250 },
    { id: 'B', miles: '5 to 15 miles', fee: 45, freeOver: 750 },
    { id: 'C', miles: '15 to 25 miles', fee: 65 },
  ],
  saturdayZones: ['A', 'B'],
  saturdayFee: 15,
  saturdayHours: '7:00 to 12:00',
  craneFee: 25,
  maxMiles: 25,
  places: placeMap,
}

const list = (names: string[]) => `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
const placesIn = (zone: ZoneId | 'out') => PLACE_ZONES.find(([z]) => z === zone)?.[1] ?? []

const section = (id: string, heading: string, ...paragraphs: string[]): DocSection => ({ id, heading, paragraphs })

const PRICE_COLUMNS = ['Code', 'Product', 'Pack', 'Price each', 'Price at 50+', 'Stock']

type Row = [code: string, product: string, pack: string, each: number, bulk: number | null, stock: string]

const backOn = (days: number) => `Out of stock · back on ${shortDate(todayAt(9) + days * DAY)}`

function priceRows(): Row[] {
  return [
    ['CEM-25', 'Portland cement 25 kg', '25 kg bag · 56 to a pallet', 7.85, 7.25, 'In stock'],
    ['CEM-MP', 'Multi-purpose cement 25 kg', '25 kg bag · 56 to a pallet', 7.2, 6.65, 'In stock'],
    ['MOR-20', 'Ready-mixed mortar 20 kg', '20 kg bag', 6.4, 5.9, 'In stock'],
    ['AGG-SS', 'Sharp sand', 'Bulk bag, about 850 kg', 58, null, 'In stock'],
    ['AGG-BS', 'Building sand', 'Bulk bag, about 850 kg', 56, null, 'In stock'],
    ['AGG-G20', '20 mm gravel', 'Bulk bag, about 850 kg', 64, null, 'In stock'],
    ['AGG-MOT', 'MOT Type 1 sub-base', 'Bulk bag, about 850 kg', 54, null, 'Low stock'],
    ['BLK-100', 'Concrete blocks 7.3N 100 mm', 'Block · 72 to a pallet', 2.45, 1.98, 'In stock'],
    ['BLK-140', 'Concrete blocks 7.3N 140 mm', 'Block · 50 to a pallet', 3.3, 2.85, 'In stock'],
    ['BLK-AC', 'Lightweight aircrete blocks 3.6N 140 mm', 'Block · 60 to a pallet', 3.1, 2.7, backOn(6)],
    ['BRK-RM', 'Facing bricks, red multi', 'Brick · 400 to a pack', 0.68, 0.61, 'In stock'],
    ['BRK-ENG', 'Engineering bricks, class B', 'Brick · 400 to a pack', 0.82, 0.74, 'In stock'],
    ['DPC-100', 'DPC roll 100 mm × 30 m', 'Roll', 6.5, null, 'In stock'],
    ['LIN-12', 'Steel lintel 1200 mm', 'Each', 38, null, 'In stock'],
    ['LIN-C15', 'Concrete lintel 1500 mm', 'Each', 24.5, null, 'Low stock'],
    ['PLB-125', 'Plasterboard 12.5 mm 2400 × 1200', 'Sheet', 11.4, 10.6, backOn(4)],
    ['PLB-MR', 'Moisture-resistant plasterboard 12.5 mm 2400 × 1200', 'Sheet', 14.2, 13.3, 'In stock'],
    ['PLB-95', 'Plasterboard 9.5 mm 2400 × 1200', 'Sheet', 9.8, 9.1, 'In stock'],
    ['PLA-MF', 'Multi-finish plaster 25 kg', '25 kg bag', 12.6, 11.8, 'In stock'],
    ['PLA-BC', 'Bonding coat plaster 25 kg', '25 kg bag', 13.4, 12.5, 'Low stock'],
    ['SCR-DW', 'Drywall screws 38 mm', 'Box of 1,000', 14.5, null, 'In stock'],
    ['TIM-36', 'C24 timber 47 × 100 mm, 3.6 m', 'Length', 9.4, 8.6, 'In stock'],
    ['TIM-48', 'C24 timber 47 × 100 mm, 4.8 m', 'Length', 12.5, 11.5, 'In stock'],
    ['TIM-CLS', 'CLS studs 38 × 89 mm, 2.4 m', 'Length', 4.2, 3.8, 'In stock'],
    ['TIM-BAT', 'Treated roofing batten 25 × 50 mm, 4.8 m', 'Length', 3.1, 2.75, 'In stock'],
    ['SHT-OSB', 'OSB3 18 mm 2440 × 1220', 'Sheet', 24.5, 22.9, 'In stock'],
    ['SHT-PLY', 'Structural plywood 18 mm 2440 × 1220', 'Sheet', 38, 35.5, 'Low stock'],
    ['INS-LR', 'Loft insulation roll 200 mm', 'Roll', 26, 23.5, 'In stock'],
    ['INS-P100', 'PIR insulation board 100 mm 2400 × 1200', 'Sheet', 42, 39, 'In stock'],
    ['INS-P50', 'PIR insulation board 50 mm 2400 × 1200', 'Sheet', 27.5, 25.4, backOn(9)],
    ['DRN-110', 'Drainage pipe 110 mm, 3 m', 'Length', 21.5, 19.8, 'In stock'],
    ['DRN-B87', 'Drainage bend 110 mm, 87.5°', 'Each', 6.8, 6.1, 'In stock'],
    ['DRN-B45', 'Drainage bend 110 mm, 45°', 'Each', 6.4, 5.8, 'In stock'],
    ['DRN-IC', 'Inspection chamber 320 mm', 'Each', 48, null, 'In stock'],
    ['ROF-CT', 'Concrete roof tiles, interlocking', 'Tile', 1.45, 1.25, 'In stock'],
    ['ROF-RT', 'Half-round ridge tiles', 'Tile', 5.6, 5.1, 'In stock'],
    ['ROF-MEM', 'Breathable roofing membrane 1 m × 50 m', 'Roll', 64, null, 'In stock'],
    ['FIX-WS', 'Wood screws 5 × 70 mm', 'Box of 100', 9.9, 8.9, 'In stock'],
    ['FIX-NL', 'Round wire nails 75 mm', '2.5 kg tub', 11.2, null, 'In stock'],
    ['FIX-FM', 'Expanding foam 750 ml', 'Can', 8.2, 7.4, 'In stock'],
    ['PAV-45', 'Paving slabs 450 × 450 mm, natural', 'Slab', 5.9, 5.2, 'In stock'],
    ['PAV-60', 'Paving slabs 600 × 600 mm, buff', 'Slab', 9.8, 8.9, 'Low stock'],
    ['PAV-KB', 'Kerb edging 914 mm', 'Each', 7.3, 6.6, 'In stock'],
  ]
}

const bulkCell = (row: Row) =>
  row[4] === null ? '–' : `${money(row[4])}${/to a pallet/.test(row[2]) && row[1].includes('blocks') ? ' pallet price' : ''}`

function priceList(): Doc {
  return {
    id: 'prices',
    title: 'Trade price list 2026',
    label: 'Price list',
    cite: 'Trade price list 2026',
    origin: 'sample',
    updatedAt: todayAt(16, 30) - 9 * DAY,
    enabled: true,
    table: {
      columns: PRICE_COLUMNS,
      rows: priceRows().map((row) => [row[0], row[1], row[2], money(row[3]), bulkCell(row), row[5]]),
    },
  }
}

function deliveryDoc(): Doc {
  const [a, b, c] = DELIVERY.zones
  const zoneLine = (zone: typeof a, names: string[]) =>
    `Zone ${zone.id}, ${zone.miles}: ${moneyWhole(zone.fee)} a drop${zone.freeOver ? `, free on orders over ${moneyWhole(zone.freeOver)}` : ''}. Includes ${list(names)}.`
  return {
    id: 'delivery',
    title: 'Delivery and collection',
    label: 'Policy',
    cite: 'Delivery and collection policy',
    origin: 'sample',
    updatedAt: todayAt(11, 0) - 12 * DAY,
    enabled: true,
    sections: [
      section(
        'zones',
        'Delivery zones',
        `We deliver up to ${DELIVERY.maxMiles} miles from the yard on Openshaw Road. The delivery charge is per drop and depends on the zone.`,
        zoneLine(a, placesIn('A')),
        zoneLine(b, placesIn('B')),
        zoneLine(c, placesIn('C')),
        `Beyond ${DELIVERY.maxMiles} miles we can’t deliver, but you’re welcome to come to the yard instead.`,
      ),
      section(
        'cutoff',
        'Order cut-off',
        'Order by 14:00 for delivery the next working day. Orders after 14:00 go out the working day after.',
      ),
      section(
        'saturday',
        'Saturday delivery',
        `Saturday delivery runs from ${DELIVERY.saturdayHours} to Zones A and B only, at ${moneyWhole(DELIVERY.saturdayFee)} extra per drop. Order by 14:00 on Friday.`,
        'We don’t deliver on Sundays.',
      ),
      section(
        'crane',
        'Crane offload',
        `Pallets come off the lorry by crane. Crane offload is ${moneyWhole(DELIVERY.craneFee)} per drop, and the driver needs firm, level ground near the kerb.`,
        'Bulk bags are craned off at no extra charge. Loose items are unloaded by hand at the kerbside.',
      ),
      section(
        'collect',
        'Opening times and collection',
        'The yard and trade counter are open 6:30 to 17:00 Monday to Friday, and 7:00 to 12:00 on Saturday. We’re closed on Sunday and bank holidays.',
        'Collection orders placed before 14:00 are ready the same day. Bring your order number and the yard team will load your vehicle.',
      ),
    ],
  }
}

function returnsDoc(): Doc {
  return {
    id: 'returns',
    title: 'Returns and refunds',
    label: 'Policy',
    cite: 'Returns and refunds policy',
    origin: 'sample',
    updatedAt: todayAt(15, 0) - 41 * DAY,
    enabled: true,
    sections: [
      section(
        'returns',
        'Returning goods',
        'You can return unused goods in resaleable condition within 30 days. Bring the receipt or invoice number.',
        'Unopened bags of cement, plaster and aggregates can be returned within 30 days if they’re dry and undamaged.',
      ),
      section(
        'exclusions',
        'What we can’t take back',
        'We can’t take back cut timber, mixed mortar, opened bags of cement or plaster, or special orders.',
        'Opened bags can’t be returned even if most of the bag is left, because damp gets in once a bag is open.',
      ),
      section(
        'deposit',
        'Bulk bag deposit',
        'Each bulk bag carries a $15 deposit. We refund it when you return the empty bag undamaged within 3 months.',
      ),
      section(
        'special',
        'Special orders',
        'Special orders aren’t returnable unless we agree in advance. If we accept a special order back, we charge a 15% restocking fee.',
      ),
      section(
        'damaged',
        'Damaged on delivery',
        'Check deliveries when they arrive. Report anything damaged within 48 hours with photos, and we’ll replace it or credit your account.',
      ),
      section(
        'refunds',
        'How long refunds take',
        'Refunds go back to the original payment method or your trade account, usually within 5 working days.',
      ),
    ],
  }
}

function accountsDoc(): Doc {
  return {
    id: 'accounts',
    title: 'Trade account terms',
    label: 'Policy',
    cite: 'Trade account terms',
    origin: 'sample',
    updatedAt: todayAt(10, 0) - 73 * DAY,
    enabled: true,
    sections: [
      section(
        'terms',
        'Credit terms',
        'Trade accounts get 30 days’ credit from the end of the month the invoice is dated. Everything bought in March is due by 30 April.',
        'We set your credit limit after credit and reference checks. You can ask for a review after six months.',
      ),
      section(
        'discount',
        'Trade discount',
        'Accounts that spend over $1,000 in a calendar month get a 2.5% trade discount on that month’s invoices.',
        'The discount is taken off your statement automatically. It doesn’t apply to delivery charges or bulk bag deposits.',
      ),
      section(
        'late',
        'Late payment',
        'If an invoice isn’t settled by the due date, we may charge interest at 2% a month on the overdue amount and put the account on stop.',
      ),
      section(
        'apply',
        'How to apply',
        'To open a trade account, fill in the application form at the counter or ask for it at accounts@irkdalesupplies.co.uk. Include two trade references, such as suppliers you already have accounts with.',
        'We usually decide within 3 working days.',
      ),
      section(
        'buyers',
        'Who can order on the account',
        'Only named buyers can order on the account. The account holder can add or remove buyers by email at any time.',
        'Each order needs the buyer’s name and a site or job reference.',
      ),
      section('statements', 'Statements', 'Statements are emailed on the 1st of each month to the account’s accounts contact.'),
    ],
  }
}

export function sampleDocs(): Doc[] {
  return [priceList(), deliveryDoc(), returnsDoc(), accountsDoc()]
}

export const FAQ_ID = 'faq'

export function faqDoc(at: number): Doc {
  return {
    id: FAQ_ID,
    title: 'Frequently asked questions',
    label: 'Questions and answers',
    cite: 'frequently asked questions',
    origin: 'team',
    updatedAt: at,
    enabled: true,
    sections: [],
  }
}
