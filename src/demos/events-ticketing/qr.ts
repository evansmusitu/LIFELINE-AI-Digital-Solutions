/*
 * A small QR code encoder with no dependencies: byte mode, error correction level M, versions 1 to 10.
 * Follows ISO/IEC 18004: Reed–Solomon over GF(256), block interleaving, all 8 masks scored with the
 * standard penalty rules, plus format and version information. Ticket payloads are about 30 bytes (version 3).
 */

export interface QrCode {
  version: number
  /** Modules per side, without the quiet zone. */
  size: number
  mask: number
  /** modules[row][col], true is dark. */
  modules: boolean[][]
}

/** Level M per version: EC codewords per block, then [block count, data codewords per block] groups. */
const BLOCKS_M: [ec: number, groups: [count: number, data: number][]][] = [
  [10, [[1, 16]]],
  [16, [[1, 28]]],
  [26, [[1, 44]]],
  [18, [[2, 32]]],
  [24, [[2, 43]]],
  [16, [[4, 27]]],
  [18, [[4, 31]]],
  [22, [[2, 38], [2, 39]]],
  [22, [[3, 36], [2, 37]]],
  [26, [[4, 43], [1, 44]]],
]

const ALIGNMENT: number[][] = [
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
]

export const MAX_VERSION = BLOCKS_M.length
const EC_BITS_M = 0b00

/* GF(256) with the QR primitive polynomial x^8 + x^4 + x^3 + x^2 + 1 */
const EXP = new Uint8Array(512)
const LOG = new Uint8Array(256)
{
  let x = 1
  for (let i = 0; i < 255; i++) {
    EXP[i] = x
    LOG[x] = i
    x <<= 1
    if (x & 0x100) x ^= 0x11d
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]
}

const gfMul = (a: number, b: number) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]])

/** Generator polynomial (x - a^0)(x - a^1)...(x - a^(degree-1)), highest power first. */
function rsGenerator(degree: number): number[] {
  let poly = [1]
  for (let i = 0; i < degree; i++) {
    const next = new Array<number>(poly.length + 1).fill(0)
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j]
      next[j + 1] ^= gfMul(poly[j], EXP[i])
    }
    poly = next
  }
  return poly
}

/** Error correction codewords: the remainder of data(x) * x^degree divided by the generator. */
export function rsRemainder(data: number[], degree: number): number[] {
  const gen = rsGenerator(degree)
  const rem = new Array<number>(degree).fill(0)
  for (const byte of data) {
    const factor = byte ^ rem[0]
    rem.shift()
    rem.push(0)
    for (let j = 0; j < degree; j++) rem[j] ^= gfMul(gen[j + 1], factor)
  }
  return rem
}

const dataCodewords = (version: number) => BLOCKS_M[version - 1][1].reduce((sum, [count, data]) => sum + count * data, 0)
const countBits = (version: number) => (version <= 9 ? 8 : 16)

/** Bytes that fit in byte mode at level M for a version. */
export function capacity(version: number): number {
  return Math.floor((dataCodewords(version) * 8 - 4 - countBits(version)) / 8)
}

/** Smallest version that holds the data, or 0 if it is too long. */
export function versionFor(byteLength: number, minVersion = 1): number {
  for (let v = Math.max(1, minVersion); v <= MAX_VERSION; v++) if (byteLength <= capacity(v)) return v
  return 0
}

/** Mode indicator, character count, data, terminator and pad bytes, as codewords. */
function dataStream(bytes: Uint8Array, version: number): number[] {
  const bits: number[] = []
  const put = (value: number, length: number) => {
    for (let i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1)
  }
  const limit = dataCodewords(version) * 8
  put(0b0100, 4)
  put(bytes.length, countBits(version))
  bytes.forEach((b) => put(b, 8))
  put(0, Math.min(4, limit - bits.length))
  put(0, (8 - (bits.length % 8)) % 8)
  const words: number[] = []
  for (let i = 0; i < bits.length; i += 8) words.push(bits.slice(i, i + 8).reduce((n, bit) => (n << 1) | bit, 0))
  for (let pad = 0xec; words.length < limit / 8; pad ^= 0xec ^ 0x11) words.push(pad)
  return words
}

/** Splits into blocks, adds error correction to each, then interleaves the codewords. */
function finalCodewords(data: number[], version: number): number[] {
  const [ec, groups] = BLOCKS_M[version - 1]
  const blocks: { data: number[]; ec: number[] }[] = []
  let offset = 0
  for (const [count, size] of groups)
    for (let i = 0; i < count; i++) {
      const chunk = data.slice(offset, offset + size)
      offset += size
      blocks.push({ data: chunk, ec: rsRemainder(chunk, ec) })
    }
  const out: number[] = []
  const longest = Math.max(...blocks.map((b) => b.data.length))
  for (let i = 0; i < longest; i++) for (const b of blocks) if (i < b.data.length) out.push(b.data[i])
  for (let i = 0; i < ec; i++) for (const b of blocks) out.push(b.ec[i])
  return out
}

const MASKS: ((r: number, c: number) => boolean)[] = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (_, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
]

/** 15 format bits: level and mask, BCH(15,5) with generator 0x537, then XOR 0x5412. */
export function formatBits(mask: number): number {
  const data = (EC_BITS_M << 3) | mask
  let rem = data
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537)
  return ((data << 10) | (rem & 0x3ff)) ^ 0x5412
}

/** 18 version bits for versions 7 and up: BCH(18,6) with generator 0x1F25. */
export function versionBits(version: number): number {
  let rem = version
  for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25)
  return (version << 12) | (rem & 0xfff)
}

class Matrix {
  readonly version: number
  readonly size: number
  readonly dark: boolean[][]
  /** Function patterns and format/version areas, which data and masks skip. */
  readonly fixed: boolean[][]

  constructor(version: number) {
    this.version = version
    this.size = version * 4 + 17
    this.dark = Array.from({ length: this.size }, () => new Array<boolean>(this.size).fill(false))
    this.fixed = Array.from({ length: this.size }, () => new Array<boolean>(this.size).fill(false))
  }

  set(r: number, c: number, dark: boolean) {
    this.dark[r][c] = dark
    this.fixed[r][c] = true
  }

  drawFunctionPatterns() {
    const { size } = this
    for (let i = 0; i < size; i++) {
      this.set(6, i, i % 2 === 0)
      this.set(i, 6, i % 2 === 0)
    }
    // Finder patterns with their light separators.
    for (const [cr, cc] of [
      [3, 3],
      [3, size - 4],
      [size - 4, 3],
    ])
      for (let dr = -4; dr <= 4; dr++)
        for (let dc = -4; dc <= 4; dc++) {
          const r = cr + dr
          const c = cc + dc
          const dist = Math.max(Math.abs(dr), Math.abs(dc))
          if (r >= 0 && r < size && c >= 0 && c < size) this.set(r, c, dist !== 2 && dist !== 4)
        }
    const pos = ALIGNMENT[this.version - 1]
    const last = pos.length - 1
    pos.forEach((r, i) =>
      pos.forEach((c, j) => {
        // Skip the three corners that already hold finder patterns.
        if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) return
        for (let dr = -2; dr <= 2; dr++)
          for (let dc = -2; dc <= 2; dc++) this.set(r + dr, c + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1)
      }),
    )
    this.drawFormat(0)
    if (this.version >= 7) {
      const bits = versionBits(this.version)
      for (let i = 0; i < 18; i++) {
        const bit = ((bits >>> i) & 1) === 1
        const a = size - 11 + (i % 3)
        const b = Math.floor(i / 3)
        this.set(b, a, bit)
        this.set(a, b, bit)
      }
    }
  }

  drawFormat(mask: number) {
    const bits = formatBits(mask)
    const bit = (i: number) => ((bits >>> i) & 1) === 1
    const { size } = this
    // Copy around the top-left finder.
    for (let i = 0; i <= 5; i++) this.set(i, 8, bit(i))
    this.set(7, 8, bit(6))
    this.set(8, 8, bit(7))
    this.set(8, 7, bit(8))
    for (let i = 9; i < 15; i++) this.set(8, 14 - i, bit(i))
    // Copy split between the other two finders.
    for (let i = 0; i < 8; i++) this.set(8, size - 1 - i, bit(i))
    for (let i = 8; i < 15; i++) this.set(size - 15 + i, 8, bit(i))
    this.set(size - 8, 8, true)
  }

  /** Zig-zag placement in two-column strips from the bottom right, skipping the vertical timing column. */
  drawCodewords(codewords: number[]) {
    const { size } = this
    let i = 0
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5
      const upward = ((right + 1) & 2) === 0
      for (let vert = 0; vert < size; vert++)
        for (let j = 0; j < 2; j++) {
          const c = right - j
          const r = upward ? size - 1 - vert : vert
          if (this.fixed[r][c]) continue
          // Remainder bits after the last codeword stay light (before masking).
          this.dark[r][c] = i < codewords.length * 8 && ((codewords[i >>> 3] >>> (7 - (i & 7))) & 1) === 1
          i++
        }
    }
  }

  applyMask(mask: number) {
    const fn = MASKS[mask]
    for (let r = 0; r < this.size; r++)
      for (let c = 0; c < this.size; c++) if (!this.fixed[r][c] && fn(r, c)) this.dark[r][c] = !this.dark[r][c]
  }
}

/**
 * Penalty score (lower is better). N1: runs of 5+ same-colour modules, N2: 2×2 blocks, N3: finder-like
 * 1:1:3:1:1 runs with 4 light modules on a side (the quiet zone counts as light), N4: dark balance.
 */
export function penalty(m: boolean[][]): number {
  const n = m.length
  let score = 0
  const at = (r: number, c: number, vertical: boolean) => (vertical ? m[c][r] : m[r][c])
  const lightRun = (line: number, from: number, to: number, vertical: boolean) => {
    for (let k = from; k < to; k++) if (k >= 0 && k < n && at(line, k, vertical)) return false
    return true
  }
  const finder = [true, false, true, true, true, false, true]
  for (const vertical of [false, true])
    for (let line = 0; line < n; line++) {
      let run = 1
      for (let k = 1; k <= n; k++) {
        if (k < n && at(line, k, vertical) === at(line, k - 1, vertical)) run++
        else {
          if (run >= 5) score += 3 + (run - 5)
          run = 1
        }
      }
      for (let k = 0; k + 7 <= n; k++) {
        if (!finder.every((d, x) => at(line, k + x, vertical) === d)) continue
        // "Preceded or followed by" 4 light modules: one penalty per pattern, as in ISO 18004 table 11.
        if (lightRun(line, k - 4, k, vertical) || lightRun(line, k + 7, k + 11, vertical)) score += 40
      }
    }
  for (let r = 0; r + 1 < n; r++)
    for (let c = 0; c + 1 < n; c++) {
      const d = m[r][c]
      if (m[r][c + 1] === d && m[r + 1][c] === d && m[r + 1][c + 1] === d) score += 3
    }
  const dark = m.reduce((sum, row) => sum + row.filter(Boolean).length, 0)
  const total = n * n
  score += Math.floor(Math.abs(dark * 20 - total * 10) / total) * 10
  return score
}

/**
 * Encodes text (as UTF-8 bytes) at level M. Picks the smallest version and the lowest-penalty mask
 * unless they are given. Throws if the text is longer than version 10 holds (213 bytes).
 */
export function encodeQr(text: string, options: { version?: number; mask?: number } = {}): QrCode {
  const bytes = new TextEncoder().encode(text)
  const version = options.version ?? versionFor(bytes.length)
  if (!version || version > MAX_VERSION || bytes.length > capacity(version))
    throw new RangeError(`Too much data for a version ${options.version ?? MAX_VERSION} QR code`)
  const matrix = new Matrix(version)
  matrix.drawFunctionPatterns()
  matrix.drawCodewords(finalCodewords(dataStream(bytes, version), version))

  const tryMask = (mask: number) => {
    matrix.applyMask(mask)
    matrix.drawFormat(mask)
    const snapshot = matrix.dark.map((row) => [...row])
    matrix.applyMask(mask) // XOR again to undo, ready for the next mask
    return snapshot
  }

  if (options.mask !== undefined) return { version, size: matrix.size, mask: options.mask, modules: tryMask(options.mask) }
  let best = { mask: 0, modules: [] as boolean[][], score: Infinity }
  for (let mask = 0; mask < 8; mask++) {
    const modules = tryMask(mask)
    const score = penalty(modules)
    if (score < best.score) best = { mask, modules, score }
  }
  return { version, size: matrix.size, mask: best.mask, modules: best.modules }
}

/** Horizontal runs of dark modules, so the SVG needs one rect per run instead of one per module. */
export function darkRuns(modules: boolean[][]): { x: number; y: number; w: number }[] {
  const runs: { x: number; y: number; w: number }[] = []
  modules.forEach((row, y) => {
    let start = -1
    row.forEach((dark, x) => {
      if (dark && start < 0) start = x
      if ((!dark || x === row.length - 1) && start >= 0) {
        runs.push({ x: start, y, w: (dark ? x + 1 : x) - start })
        start = -1
      }
    })
  })
  return runs
}
