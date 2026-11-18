#!/usr/bin/env node
/*
 * Walk-in flyer generator. Makes, for the generic link and for each ?by= person, in English and in a
 * Shona draft: an A5 PDF, an A4 PDF with two A5 flyers side by side, and a PNG preview. QR codes are also
 * written as stand-alone SVG and PNG files, and every QR is decoded back to its exact URL before the run succeeds.
 *   node scripts/flyer/generate.mjs
 * Output goes to OUT (default /projects/sandbox/.kiro/artifacts/flyer). Nothing is sent anywhere.
 * Needs Playwright from the video toolchain (see scripts/ads/README.md). See scripts/flyer/README.md.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import jsQR from 'jsqr'
import { PNG } from 'pngjs'
import QRCode from 'qrcode'
import { COPY } from './copy.mjs'

const HERE = dirname(new URL(import.meta.url).pathname)
const REPO = resolve(HERE, '../..')
const TOOLS = process.env.VIDEO_TOOLS ?? '/projects/sandbox/.scratch/video'
const OUT = process.env.FLYER_OUT ?? '/projects/sandbox/.kiro/artifacts/flyer'
process.env.PLAYWRIGHT_BROWSERS_PATH ??= join(TOOLS, 'pw/browsers')

const read = (p) => readFileSync(join(REPO, p), 'utf8')
const site = read('src/config/site.ts')
const SITE_URL = /url:\s*'(https?:\/\/[^']+)'/.exec(site)?.[1]
const WHATSAPP = /whatsappDisplay:\s*'([^']+)'/.exec(site)?.[1]
const BY_TAGS = [...(/BY_TAGS\s*=\s*\[([^\]]*)\]/.exec(read('src/lib/count-events.ts'))?.[1] ?? '').matchAll(/'([^']+)'/g)].map((m) => m[1])
if (!SITE_URL || !WHATSAPP || BY_TAGS.length === 0) throw new Error('Could not read the site address, WhatsApp number or BY_TAGS')

const DEMO = `${SITE_URL}/demos/whatsapp-ordering`
const PEOPLE = [{ id: 'generic', by: null }, ...BY_TAGS.map((by) => ({ id: by, by }))]
const urlFor = (by) => `${DEMO}?ref=flyer${by ? `&by=${by}` : ''}`

const dataUri = (path, mime) => `data:${mime};base64,${readFileSync(path).toString('base64')}`
const font = (pkg, file) => pathToFileURL(join(REPO, 'node_modules/@fontsource-variable', pkg, 'files', file)).href
const LOGO = dataUri(join(REPO, 'public/logo.png'), 'image/png')

const QR_OPTS = { errorCorrectionLevel: 'Q', margin: 4, color: { dark: '#050B1F', light: '#FFFFFF' } }

/** Decode a QR PNG buffer; returns the text or null. */
function decodePng(buf) {
  const png = PNG.sync.read(buf)
  return jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data ?? null
}

mkdirSync(OUT, { recursive: true })
mkdirSync(join(OUT, 'qr'), { recursive: true })
mkdirSync(join(OUT, 'html'), { recursive: true })

const qrs = {}
for (const p of PEOPLE) {
  const url = urlFor(p.by)
  const svg = await QRCode.toString(url, { ...QR_OPTS, type: 'svg' })
  const png = await QRCode.toBuffer(url, { ...QR_OPTS, type: 'png', width: 1200 })
  const back = decodePng(png)
  if (back !== url) throw new Error(`QR for ${p.id} decoded to ${back}, expected ${url}`)
  writeFileSync(join(OUT, 'qr', `qr-${p.id}.svg`), svg)
  writeFileSync(join(OUT, 'qr', `qr-${p.id}.png`), png)
  qrs[p.id] = { url, svg }
  console.log(`QR ${p.id}: ${url} (decoded ok)`)
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

function flyer(c, qr) {
  return `<section class="flyer">
  <div class="top"><img class="logo" src="${LOGO}" alt=""><span class="brand">LIFELINE AI CONCIERGE</span></div>
  <h1>${esc(c.headline)}</h1>
  <ul>${c.benefits.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>
  <div class="scanbox">
    <div class="qr">${qr.svg.replace('<svg ', '<svg role="img" aria-label="QR code" ')}</div>
    <p class="scan">${esc(c.scan)}</p>
  </div>
  <p class="sample">${esc(c.sample)}</p>
  <p class="contact">${esc(c.contact)}: <b>${esc(WHATSAPP)}</b></p>
</section>`
}

const CSS = `
@font-face{font-family:'Montserrat Variable';src:url('${font('montserrat', 'montserrat-latin-wght-normal.woff2')}');font-weight:100 900}
@font-face{font-family:'Inter Variable';src:url('${font('inter', 'inter-latin-wght-normal.woff2')}');font-weight:100 900}
*{box-sizing:border-box;margin:0;padding:0}
html,body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:'Inter Variable',sans-serif;color:#fff;background:#fff}
.sheet{display:flex}
.flyer{width:148mm;height:210mm;background:#050B1F;padding:11mm 11mm 9mm;display:flex;flex-direction:column;position:relative;overflow:hidden}
.flyer::before{content:'';position:absolute;left:0;right:0;top:0;height:3mm;background:linear-gradient(90deg,#00D4FF,#8B5CF6)}
.top{display:flex;align-items:center;gap:3mm}
.logo{width:11mm;height:11mm;border-radius:2mm}
.brand{font-family:'Montserrat Variable',sans-serif;font-weight:700;font-size:9pt;letter-spacing:.14em;color:#BFEFFF}
h1{font-family:'Montserrat Variable',sans-serif;font-weight:800;font-size:25pt;line-height:1.15;margin-top:9mm;background:linear-gradient(90deg,#00D4FF,#A78BFA);-webkit-background-clip:text;background-clip:text;color:transparent}
ul{list-style:none;margin-top:7mm;display:flex;flex-direction:column;gap:3.5mm}
li{font-size:11.5pt;line-height:1.35;padding-left:6mm;position:relative;color:#F2F6FF}
li::before{content:'';position:absolute;left:0;top:1.5mm;width:2.6mm;height:2.6mm;border-radius:50%;background:linear-gradient(135deg,#00D4FF,#8B5CF6)}
.scanbox{margin-top:auto;display:flex;flex-direction:column;align-items:center;gap:2.5mm}
.qr{width:46mm;height:46mm;background:#fff;border-radius:3mm;overflow:hidden}
.qr svg{display:block;width:100%;height:100%}
.scan{font-family:'Montserrat Variable',sans-serif;font-weight:700;font-size:13pt;color:#00D4FF;text-align:center}
.sample{margin-top:5mm;font-size:9pt;color:#C9D3EA;text-align:center}
.contact{margin-top:2mm;font-size:11pt;text-align:center;color:#fff}
.contact b{font-family:'Montserrat Variable',sans-serif;font-weight:700}
.cut{width:0;border-left:.3mm dashed #999}
`

const page = (body, size) => `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}@page{size:${size};margin:0}</style></head><body>${body}</body></html>`

const { chromium } = await import(pathToFileURL(join(TOOLS, 'pw/node_modules/playwright/index.mjs')).href)
const browser = await chromium.launch()
const files = []
try {
  for (const lang of ['en', 'sn']) {
    const c = COPY[lang]
    for (const p of PEOPLE) {
      // Shona is a draft until a native speaker has checked it, so its files say so in the name.
      const name = `flyer-${lang === 'sn' ? 'sn-DRAFT' : 'en'}-${p.id}`
      const a5 = page(`<div class="sheet">${flyer(c, qrs[p.id])}</div>`, 'A5')
      const a4 = page(`<div class="sheet">${flyer(c, qrs[p.id])}<div class="cut"></div>${flyer(c, qrs[p.id])}</div>`, 'A4 landscape')
      const ctx = await browser.newContext({ deviceScaleFactor: 3, viewport: { width: 560, height: 794 } })
      const tab = await ctx.newPage()
      for (const [suffix, html, size] of [['a5', a5, 'A5'], ['a4-2up', a4, 'A4']]) {
        const htmlPath = join(OUT, 'html', `${name}-${suffix}.html`)
        writeFileSync(htmlPath, html)
        await tab.goto(pathToFileURL(htmlPath).href)
        await tab.evaluate(() => document.fonts.ready)
        const pdf = join(OUT, `${name}-${suffix}.pdf`)
        await tab.pdf({ path: pdf, format: size, landscape: size === 'A4', printBackground: true, preferCSSPageSize: true })
        files.push(pdf)
        if (suffix === 'a5') {
          const png = join(OUT, `${name}-a5.png`)
          await tab.locator('.flyer').screenshot({ path: png })
          files.push(png)
          // End to end: the QR must still scan from the rendered preview.
          const back = decodePng(readFileSync(png))
          if (back !== qrs[p.id].url) throw new Error(`Rendered ${png} decoded to ${back}, expected ${qrs[p.id].url}`)
          // The QR must be at least 30 mm wide on the A5 page (its CSS box is 46 mm).
          const mm = await tab.evaluate(() => document.querySelector('.qr').getBoundingClientRect().width / (96 / 25.4))
          if (mm < 30) throw new Error(`QR is only ${mm.toFixed(1)} mm wide`)
        }
      }
      await ctx.close()
    }
  }
} finally {
  await browser.close()
}
console.log(`${files.length} files written to ${OUT}`)
