import { todayAt } from '../../lib/time'
import type { CategoryId, Details, Order, OrderLine, OrderStatus, OrderingState, Product } from './types'

/* Sample business: Jacaranda & Rye Bakehouse, an invented bakery and café in Avondale, Harare. */

export const BUSINESS = 'Jacaranda & Rye Bakehouse'

export const CATEGORIES: { id: CategoryId; label: string }[] = [
  { id: 'bread', label: 'Bread' },
  { id: 'pastry', label: 'Pastries' },
  { id: 'cake', label: 'Cakes and treats' },
  { id: 'savoury', label: 'Sandwiches and pies' },
  { id: 'drinks', label: 'Drinks' },
]

const MILK = {
  label: 'Milk',
  choices: [
    { id: 'full', label: 'Full cream', delta: 0 },
    { id: 'oat', label: 'Oat milk', delta: 0.5 },
  ],
}

export function sampleProducts(): Product[] {
  return [
    { id: 'sourdough', name: 'Country sourdough loaf, 800 g', description: 'Slow-fermented for 24 hours, with a crackly crust.', category: 'bread', price: 4.5, icon: 'wheat', available: true, popular: true },
    { id: 'rye', name: 'Seeded rye loaf, 750 g', description: 'Sunflower, flax and pumpkin seeds.', category: 'bread', price: 5, icon: 'wheat', available: true },
    { id: 'rolls', name: 'Soft milk rolls, pack of 6', description: 'Light and fluffy. Good for lunchboxes.', category: 'bread', price: 3.2, icon: 'wheat', available: true },
    { id: 'wholewheat', name: 'Wholewheat sandwich loaf', description: 'Sliced fresh every morning.', category: 'bread', price: 2.8, icon: 'wheat', available: true },
    { id: 'croissant', name: 'Butter croissant', description: 'Baked every hour until noon.', category: 'pastry', price: 1.8, icon: 'croissant', available: true, popular: true },
    { id: 'pain-choc', name: 'Pain au chocolat', description: 'Two batons of dark chocolate.', category: 'pastry', price: 2.2, icon: 'croissant', available: true },
    { id: 'cinnamon', name: 'Cinnamon roll', description: 'Glazed with vanilla icing.', category: 'pastry', price: 2.4, icon: 'cookie', available: true },
    { id: 'almond', name: 'Almond croissant', description: 'Filled with almond cream and toasted flakes.', category: 'pastry', price: 2.8, icon: 'croissant', available: false },
    {
      id: 'fudge-cake',
      name: 'Chocolate fudge cake',
      description: 'Whole cake, ready the next day. Tell us any message for the top.',
      category: 'cake',
      price: 22,
      icon: 'cake',
      available: true,
      popular: true,
      option: {
        label: 'Size',
        choices: [
          { id: '6in', label: '6-inch, serves 8', delta: 0 },
          { id: '8in', label: '8-inch, serves 14', delta: 8 },
        ],
      },
    },
    { id: 'carrot-slice', name: 'Carrot cake slice', description: 'With cream cheese icing and walnuts.', category: 'cake', price: 3.5, icon: 'cake-slice', available: true },
    { id: 'brownies', name: 'Brownie box, 6 pieces', description: 'Fudgy, with a crackled top.', category: 'cake', price: 7.5, icon: 'cookie', available: true },
    { id: 'lemon-loaf', name: 'Lemon drizzle loaf', description: 'Zesty sponge soaked in lemon syrup.', category: 'cake', price: 9, icon: 'cake-slice', available: true },
    { id: 'chicken-sandwich', name: 'Chicken and avocado sandwich', description: 'On toasted sourdough, with lemon mayo.', category: 'savoury', price: 5.5, icon: 'sandwich', available: true },
    { id: 'beef-pie', name: 'Steak and onion pie', description: 'Slow-cooked beef in flaky pastry.', category: 'savoury', price: 3.8, icon: 'beef', available: true, popular: true },
    { id: 'spinach-roll', name: 'Spinach and feta roll', description: 'With a sprinkle of sesame seeds.', category: 'savoury', price: 3.2, icon: 'leaf', available: true },
    { id: 'boerewors', name: 'Boerewors roll', description: 'Grilled boerewors with tomato and onion relish.', category: 'savoury', price: 4.2, icon: 'sandwich', available: true },
    { id: 'flat-white', name: 'Flat white', description: 'Double shot, silky milk.', category: 'drinks', price: 2.8, icon: 'coffee', available: true, option: MILK },
    { id: 'cappuccino', name: 'Cappuccino', description: 'With a dusting of cocoa.', category: 'drinks', price: 2.8, icon: 'coffee', available: true, option: MILK },
    { id: 'rooibos', name: 'Rooibos iced tea, 500 ml', description: 'Brewed in-house with honey and lemon.', category: 'drinks', price: 2.2, icon: 'cup', available: true },
    { id: 'orange-juice', name: 'Fresh orange juice, 350 ml', description: 'Squeezed every morning.', category: 'drinks', price: 2.5, icon: 'citrus', available: true },
  ]
}

/** Whole cakes need a day's notice. */
export const NEXT_DAY_PRODUCTS = new Set(['fudge-cake'])

export const AREAS: { name: string; fee: number }[] = [
  { name: 'Avondale', fee: 2 },
  { name: 'Belgravia', fee: 2 },
  { name: 'Mount Pleasant', fee: 2.5 },
  { name: 'Borrowdale', fee: 3 },
  { name: 'Highlands', fee: 3 },
  { name: 'Greendale', fee: 3.5 },
]

export const MIN_DELIVERY_ORDER = 8

export const TIMES_TODAY = ['As soon as possible (about 45 minutes)', 'Today, 12:00–13:00', 'Today, 14:00–15:00', 'Today, 16:00–17:00']
export const TIMES_TOMORROW = ['Tomorrow, 08:00–09:00', 'Tomorrow, 10:00–11:00', 'Tomorrow, 14:00–15:00']

export const PAYMENTS = ['Cash (USD or ZiG)', 'EcoCash', 'InnBucks', 'Card', 'Bank transfer (USD or ZiG)']

export const EMPTY_DETAILS: Details = {
  name: '',
  method: 'delivery',
  area: 'Avondale',
  address: '',
  time: TIMES_TODAY[0],
  payment: 'EcoCash',
  notes: '',
}

export const STATUS_FLOW: Record<'delivery' | 'collection', OrderStatus[]> = {
  delivery: ['New', 'Confirmed', 'Preparing', 'Out for delivery', 'Completed'],
  collection: ['New', 'Confirmed', 'Preparing', 'Ready for collection', 'Completed'],
}

function lines(products: Product[], items: [string, number, string?][]): OrderLine[] {
  return items.map(([id, qty, choice]) => {
    const product = products.find((p) => p.id === id)!
    const option = product.option?.choices.find((c) => c.id === choice)
    return { name: option ? `${product.name} (${option.label})` : product.name, qty, unitPrice: product.price + (option?.delta ?? 0) }
  })
}

function order(
  products: Product[],
  ref: number,
  at: number,
  customer: string,
  where: { method: 'delivery'; area: string } | { method: 'collection' },
  items: [string, number, string?][],
  status: OrderStatus,
  extra: { time?: string; payment?: string; notes?: string } = {},
): Order {
  const orderLines = lines(products, items)
  const subtotal = orderLines.reduce((sum, l) => sum + l.qty * l.unitPrice, 0)
  const deliveryFee = where.method === 'delivery' ? (AREAS.find((a) => a.name === where.area)?.fee ?? 0) : 0
  return {
    id: `o-${ref}`,
    ref: `JR-${ref}`,
    at,
    customer,
    method: where.method,
    area: where.method === 'delivery' ? where.area : undefined,
    address: where.method === 'delivery' ? `${where.area}, Harare` : undefined,
    time: extra.time ?? TIMES_TODAY[0],
    payment: extra.payment ?? 'EcoCash',
    notes: extra.notes,
    lines: orderLines,
    subtotal,
    deliveryFee,
    total: subtotal + deliveryFee,
    status,
    updates: [],
  }
}

export function createInitialState(): OrderingState {
  const products = sampleProducts()
  return {
    products,
    cart: [],
    details: EMPTY_DETAILS,
    nextRef: 2417,
    orders: [
      order(products, 2416, todayAt(10, 36), 'Tendai K.', { method: 'collection' }, [['cinnamon', 3], ['flat-white', 1, 'full']], 'New', { time: 'Today, 12:00–13:00', payment: 'Cash (USD or ZiG)' }),
      order(products, 2415, todayAt(10, 21), 'Kudzai M.', { method: 'delivery', area: 'Highlands' }, [['sourdough', 1], ['rolls', 1], ['orange-juice', 2]], 'Preparing'),
      order(products, 2414, todayAt(9, 58), 'Chipo N.', { method: 'delivery', area: 'Avondale' }, [['chicken-sandwich', 2], ['cappuccino', 2, 'oat']], 'Out for delivery', { payment: 'Card' }),
      order(products, 2413, todayAt(9, 30), 'Nyasha D.', { method: 'collection' }, [['fudge-cake', 1, '8in']], 'Confirmed', {
        time: 'Tomorrow, 10:00–11:00',
        notes: 'Please write “Happy 7th birthday, Tino” on top.',
      }),
      order(products, 2412, todayAt(8, 55), 'Farai C.', { method: 'delivery', area: 'Borrowdale' }, [['beef-pie', 6], ['rooibos', 6]], 'Completed', {
        payment: 'Bank transfer (USD or ZiG)',
        notes: 'Office lunch. Please call reception on arrival.',
      }),
      order(products, 2411, todayAt(8, 20), 'Grace T.', { method: 'delivery', area: 'Mount Pleasant' }, [['brownies', 1], ['lemon-loaf', 1]], 'Completed'),
      order(products, 2410, todayAt(7, 46), 'Tapiwa S.', { method: 'collection' }, [['rye', 1], ['flat-white', 2, 'oat']], 'Completed', { payment: 'InnBucks' }),
      order(products, 2409, todayAt(7, 12), 'Rudo M.', { method: 'delivery', area: 'Belgravia' }, [['sourdough', 2], ['croissant', 4]], 'Completed'),
    ],
  }
}
