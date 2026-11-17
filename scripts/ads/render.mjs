#!/usr/bin/env node
/*
 * Renders the four TikTok ad videos and their covers.
 *   node scripts/ads/render.mjs            all videos
 *   node scripts/ads/render.mjs tari-chat  one or more, by id
 * Needs a built dist/ (npm run build). Reads the local build through route interception and records
 * it with Playwright, so nothing is sent to the live site. The Tari chat reply is a scripted stand-in.
 * Output goes to OUT (default /projects/sandbox/.kiro/artifacts/tiktok). See README.md for the toolchain.
 */
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { VIDEOS, WHATSAPP } from './scenarios.mjs'

const HERE = dirname(new URL(import.meta.url).pathname)
const REPO = resolve(HERE, '../..')
const TOOLS = process.env.VIDEO_TOOLS ?? '/projects/sandbox/.scratch/video'
const OUT = process.env.AD_OUT ?? '/projects/sandbox/.kiro/artifacts/tiktok'
const WORK = join(TOOLS, 'ads-work')
const FFMPEG = process.env.FFMPEG ?? join(TOOLS, 'tools/node_modules/ffmpeg-static/ffmpeg')
const VOICE = join(TOOLS, 'voices/en_US-ljspeech-medium.onnx')
const DIST = join(REPO, 'dist')
process.env.PLAYWRIGHT_BROWSERS_PATH ??= join(TOOLS, 'pw/browsers')

const { chromium } = await import(pathToFileURL(join(TOOLS, 'pw/node_modules/playwright/index.mjs')).href)

mkdirSync(OUT, { recursive: true })
mkdirSync(WORK, { recursive: true })

const wait = (ms) => new Promise((r) => setTimeout(r, ms))
function run(cmd, args, opts = {}) {
  const p = spawnSync(cmd, args, { encoding: 'utf8', ...opts })
  if (p.status !== 0) throw new Error(`${cmd} failed: ${(p.stderr || '').slice(-1500)}`)
  return p
}

/* ---------- Voice (Piper, synthetic) ---------- */

function wavSeconds(file) {
  const b = readFileSync(file)
  const rate = b.readUInt32LE(24)
  const dataAt = b.indexOf('data') + 4
  return b.readUInt32LE(dataAt) / 2 / rate
}

const voiceCache = new Map()
function speak(text) {
  if (voiceCache.has(text)) return voiceCache.get(text)
  const file = join(WORK, `say-${createHash('sha1').update(text).digest('hex').slice(0, 12)}.wav`)
  if (!existsSync(file)) {
    const p = spawnSync('python3', ['-m', 'piper', '-m', VOICE, '-f', file], {
      input: text,
      encoding: 'utf8',
      env: { ...process.env, PYTHONPATH: join(TOOLS, 'pylib-piper') },
    })
    if (p.status !== 0) throw new Error(`piper failed: ${p.stderr}`)
  }
  const info = { file, seconds: wavSeconds(file) }
  voiceCache.set(text, info)
  return info
}

/* ---------- Overlay images (captions, end card, cover) ---------- */

const REPO_FILES = {
  '/fonts/montserrat.woff2': join(REPO, 'node_modules/@fontsource-variable/montserrat/files/montserrat-latin-wght-normal.woff2'),
  '/fonts/inter.woff2': join(REPO, 'node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2'),
  '/logo.png': join(REPO, 'public/logo.png'),
  '/tari.jpg': join(REPO, 'public/tari-video.jpg'),
}

const STAGE_HTML = `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:'Mont';font-weight:100 900;src:url(/fonts/montserrat.woff2) format('woff2')}
@font-face{font-family:'Inter';font-weight:100 900;src:url(/fonts/inter.woff2) format('woff2')}
html,body{margin:0;background:transparent}
body{width:1080px;height:1920px;overflow:hidden;position:relative;color:#fff;font-family:'Inter',sans-serif}
.g{background:linear-gradient(90deg,#00D4FF,#2F7BFF 50%,#B07CFF)}
.cap{position:absolute;left:56px;width:894px;box-sizing:border-box;padding:30px 38px 30px 46px;border-radius:30px;
  background:rgba(5,11,31,.9);box-shadow:0 18px 50px rgba(0,0,0,.45);font:800 68px/1.14 'Mont',sans-serif;letter-spacing:-.01em}
.cap::before{content:'';position:absolute;left:0;top:22px;bottom:22px;width:12px;border-radius:8px;background:linear-gradient(180deg,#00D4FF,#B07CFF)}
.cap b{color:#00D4FF;font-weight:800}
.cap.hook{font-size:84px;line-height:1.1}
.tag{position:absolute;left:56px;top:1518px;padding:12px 22px;border-radius:999px;background:rgba(5,11,31,.82);
  border:2px solid rgba(0,212,255,.45);font:600 28px/1 'Inter',sans-serif;color:#DCE8FF}
.card{position:absolute;inset:0;background:radial-gradient(700px 600px at 200px 500px,rgba(0,212,255,.22),transparent 70%),
  radial-gradient(800px 700px at 950px 1100px,rgba(139,92,246,.24),transparent 70%),#050B1F}
.logo{width:230px;height:230px;border-radius:50%;display:block}
.brand{font:800 40px/1 'Mont';letter-spacing:.16em}
.sub{font:500 26px/1 'Inter';letter-spacing:.34em;color:#B9C5E0;margin-top:12px}
.big{font:800 124px/1.04 'Mont';letter-spacing:-.02em}
.txt{background:linear-gradient(90deg,#00D4FF,#2F7BFF 50%,#E08BFF);-webkit-background-clip:text;background-clip:text;color:transparent}
.wa{display:inline-flex;align-items:center;gap:18px;padding:26px 44px;border-radius:999px;background:#25D366;color:#04210f;font:800 46px/1 'Inter'}
.wa svg{width:56px;height:56px}
</style><div id="root"></div>`

const WA_SVG = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.47-1.76-1.64-2.05-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.01-1.04 2.47 0 1.46 1.06 2.87 1.21 3.07.15.2 2.09 3.2 5.07 4.48.71.31 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35zM12.05 21.5h-.01a9.4 9.4 0 0 1-4.8-1.32l-.34-.2-3.57.94.95-3.48-.22-.36a9.4 9.4 0 0 1-1.44-5.02C2.62 6.86 6.85 2.63 12.06 2.63c2.52 0 4.89.98 6.67 2.77a9.37 9.37 0 0 1 2.76 6.67c0 5.2-4.24 9.43-9.44 9.43zm8.03-17.46A11.27 11.27 0 0 0 12.05.72C5.8.72.7 5.8.7 12.06c0 2 .52 3.95 1.52 5.67L.6 23.28l5.68-1.49a11.32 11.32 0 0 0 5.77 1.55h.01c6.26 0 11.35-5.08 11.35-11.34 0-3.03-1.18-5.88-3.33-8.02z"/></svg>`

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
/** **word** becomes a cyan highlight. */
const rich = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')

async function openStage(browser, extraFiles = {}) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } })
  await page.route('https://ads.test/**', (route) => {
    const p = new URL(route.request().url()).pathname
    if (p === '/') return route.fulfill({ contentType: 'text/html', body: STAGE_HTML })
    const f = REPO_FILES[p] ?? extraFiles[p]
    return f ? route.fulfill({ path: f }) : route.fulfill({ status: 404 })
  })
  await page.goto('https://ads.test/')
  return page
}

async function shotHtml(page, html, file, opts = {}) {
  await page.evaluate((h) => (document.getElementById('root').innerHTML = h), html)
  await page.evaluate(() => document.fonts.ready)
  await page.evaluate(() => Promise.all([...document.images].map((i) => i.decode().catch(() => {}))))
  await page.waitForTimeout(80)
  await page.screenshot({ path: file, ...opts })
}

const tagHtml = (tag) => (tag ? `<div class="tag">${esc(tag)}</div>` : '')

function captionHtml(cue, tag) {
  const top = cue.kind === 'hook' ? 400 : 190
  return `<div class="cap ${cue.kind === 'hook' ? 'hook' : ''}" style="top:${top}px">${rich(cue.cap)}</div>${tagHtml(tag)}`
}

function endCardHtml() {
  return `<div class="card"></div>
  <div style="position:absolute;left:56px;right:130px;top:330px;text-align:center">
    <img class="logo" style="margin:0 auto" src="/logo.png" alt="">
    <div class="brand" style="margin-top:34px">LIFELINE</div><div class="sub">AI CONCIERGE</div>
    <div class="big" style="margin-top:90px">Try it <span class="txt">free</span></div>
    <div class="big" style="font-size:96px;margin-top:20px">Link in bio</div>
    <div style="margin-top:80px"><span class="wa">${WA_SVG}WhatsApp ${WHATSAPP}</span></div>
    <div style="margin-top:56px;font:500 28px/1.4 'Inter';color:#B9C5E0">Demos use invented sample businesses</div>
  </div>`
}

function coverHtml(v, frameUrl) {
  return `<div class="card"></div>
  <div style="position:absolute;left:70px;right:130px;top:190px">
    <div style="display:flex;align-items:center;gap:20px"><img class="logo" style="width:84px;height:84px" src="/logo.png" alt="">
      <div><div class="brand" style="font-size:30px">LIFELINE</div><div class="sub" style="font-size:18px;margin-top:8px">AI CONCIERGE</div></div></div>
    <div class="big" style="font-size:96px;margin-top:52px">${rich(v.cover.headline).replace(/<b>/g, '<span class="txt">').replace(/<\/b>/g, '</span>')}</div>
    <div style="margin-top:46px;width:880px;height:760px;border-radius:36px;overflow:hidden;border:3px solid rgba(0,212,255,.5);
      box-shadow:0 0 70px rgba(0,212,255,.25),0 26px 70px rgba(0,0,0,.55);background:#0A1230 url(${frameUrl}) center ${v.cover.focus ?? 38}%/cover"></div>
    <div style="margin-top:34px;font:700 38px/1.2 'Inter'" class="txt">Try it free, link in bio</div>
  </div>
  <div class="tag" style="top:1540px">${esc(v.tag)}</div>`
}

/* ---------- Page recording ---------- */

const MIME_ROUTE = async (route, v) => {
  const u = new URL(route.request().url())
  const p = u.pathname
  if (p === '/api/receptionist') return v.onReceptionist(route)
  if (p.startsWith('/api/')) return route.fulfill({ status: 404, json: {} })
  const f = p === '/' ? '/index.html' : /^\/demos\/[a-z0-9-]+$/.test(p) ? p + '.html' : /\.[a-z0-9]+$/i.test(p) ? p : '/index.html'
  return route.fulfill({ path: DIST + f })
}

/** Injected into every page: a tap cursor, sample-city scrub, no bottom bar, no pricing chip. */
const PAGE_INIT = () => {
  const CITY = /,?\s*\b(Harare|Johannesburg|Parkhurst|Cape Town|Dubai|Abu Dhabi|Leeds|Atlanta|Bristol|Manchester|Raleigh|Austin|Bulawayo|Victoria Falls|Zimbabwe|South Africa|North Carolina|Georgia|Texas|UAE|UK|US)\b/g
  const css = document.createElement('style')
  css.textContent = `#__dot{position:fixed;z-index:2147483647;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;
    background:rgba(0,212,255,.35);border:3px solid #fff;box-shadow:0 0 16px rgba(0,212,255,.9);pointer-events:none;display:none}
    .__rip{position:fixed;z-index:2147483646;width:30px;height:30px;margin:-15px 0 0 -15px;border-radius:50%;border:4px solid #00D4FF;
    pointer-events:none;animation:__r .5s ease-out forwards}@keyframes __r{to{transform:scale(3.2);opacity:0}}`
  const scrub = () => {
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      const clean = n.data.replace(CITY, '')
      if (clean !== n.data) n.data = clean
    }
    for (const b of document.querySelectorAll('button')) if (/how much does it cost/i.test(b.textContent)) b.style.display = 'none'
    for (const bar of document.querySelectorAll('div.fixed.inset-x-0.bottom-0')) {
      if (!bar.closest('[role=dialog]') && !bar.querySelector('[role=dialog]')) bar.style.display = 'none'
    }
  }
  // A navy cover hides each page while it loads. The recorder removes it with reveal().
  const cover = () => {
    if (!window.__revealed && document.body && !document.getElementById('__cover')) {
      const c = Object.assign(document.createElement('div'), { id: '__cover' })
      c.style.cssText = 'position:fixed;inset:0;z-index:2147483645;background:#050B1F'
      document.body.append(c)
    }
  }
  new MutationObserver(cover).observe(document, { childList: true, subtree: true })
  addEventListener('DOMContentLoaded', () => {
    cover()
    document.head.append(css)
    const dot = Object.assign(document.createElement('div'), { id: '__dot' })
    document.body.append(dot)
    addEventListener('mousemove', (e) => {
      dot.style.display = 'block'
      dot.style.left = e.clientX + 'px'
      dot.style.top = e.clientY + 'px'
    }, true)
    addEventListener('mousedown', (e) => {
      const r = document.createElement('div')
      r.className = '__rip'
      r.style.left = e.clientX + 'px'
      r.style.top = e.clientY + 'px'
      document.body.append(r)
      setTimeout(() => r.remove(), 600)
    }, true)
    setInterval(scrub, 120)
  })
}

class Rec {
  constructor(page, v) {
    this.page = page
    this.v = v
    this.created = Date.now()
    this.trim = 0
    this.started = false
    this.cues = []
    this.says = []
    this.sayEnd = 0
  }
  /** Seconds on the video's clock (after the trimmed loading part). */
  now() {
    return (Date.now() - this.created) / 1000 - this.trim
  }
  /** Call once the page is ready: everything before this is trimmed off. */
  start() {
    this.trim = (Date.now() - this.created) / 1000 - 0.15
    this.started = true
  }
  async goto(path, ready = '#page-title') {
    await this.page.goto('https://studio.test' + path)
    await this.page.waitForSelector(ready)
    await this.page.waitForTimeout(500)
  }
  cue(key) {
    const line = this.v.lines[key]
    if (!line) throw new Error('No line ' + key)
    const t = this.cues.length === 0 ? 0 : this.now()
    const prev = this.cues[this.cues.length - 1]
    if (prev && prev.end == null) prev.end = t
    this.cues.push({ ...line, start: t, end: null })
    if (line.say) {
      const s = speak(line.say)
      this.says.push({ file: s.file, start: t + 0.1 })
      this.sayEnd = Math.max(this.sayEnd, t + 0.1 + s.seconds)
    }
  }
  /** Waits until the current line has been spoken, plus a short beat. */
  async settle(extra = 0.35) {
    const ms = (this.sayEnd + extra - this.now()) * 1000
    if (ms > 0) await wait(ms)
  }
  async pause(sec) {
    await wait(sec * 1000)
  }
  /** Scrolls so the element sits `top` CSS px from the top of the screen (clear of the caption). */
  async show(loc, top = 250, settle = 800) {
    await loc.evaluate((el, t) => scrollTo({ top: el.getBoundingClientRect().top + scrollY - t, behavior: 'smooth' }), top)
    await wait(settle)
  }
  /** Removes the loading cover. */
  async reveal() {
    await this.page.evaluate(() => {
      window.__revealed = true
      document.getElementById('__cover')?.remove()
    })
    await wait(80)
  }
  /** Instant scroll, used before the clip starts so no scrolling shows. Also removes the loading cover. */
  async jump(loc, top = 250) {
    await loc.evaluate((el, t) => scrollTo(0, el.getBoundingClientRect().top + scrollY - t), top)
    await wait(150)
    await this.reveal()
  }
  async tap(loc, after = 450) {
    await loc.waitFor({ state: 'visible' })
    let box = await loc.boundingBox()
    const view = await this.page.evaluate(() => ({ y: scrollY, h: innerHeight }))
    if (box.y < 200 || box.y + box.height > view.h - 170) {
      await this.show(loc, 330, 700)
      box = await loc.boundingBox()
    }
    await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 14 })
    await wait(160)
    await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
    await wait(after)
  }
  async type(loc, text, delay = 55) {
    await this.tap(loc, 150)
    await loc.pressSequentially(text, { delay })
    await wait(250)
  }
  /** Adds the end card and returns the video's total length. */
  async finish() {
    const prev = this.cues[this.cues.length - 1]
    const t = Math.max(this.now() + 0.2, this.sayEnd + 0.2)
    if (prev && prev.end == null) prev.end = t
    if (t > this.now()) await wait((t - this.now()) * 1000)
    this.endAt = t
    const s = speak('Try it free. Link in bio.')
    this.says.push({ file: s.file, start: t + 0.25 })
    this.total = t + Math.max(3.1, s.seconds + 0.8)
    await wait(Math.max(600, (this.total - this.now()) * 1000))
  }
}

async function recordVideo(browser, v) {
  const dir = join(WORK, 'rec-' + v.id)
  rmSync(dir, { recursive: true, force: true })
  const ctx = await browser.newContext({
    viewport: { width: 540, height: 960 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    recordVideo: { dir, size: { width: 540, height: 960 } },
  })
  await ctx.addInitScript(PAGE_INIT)
  await ctx.route('https://studio.test/**', (route) => MIME_ROUTE(route, v))
  const page = await ctx.newPage()
  const r = new Rec(page, v)
  try {
    await v.run(r, page)
  } catch (e) {
    await page.screenshot({ path: join(WORK, 'fail-' + v.id + '.png') }).catch(() => {})
    throw e
  }
  await r.finish()
  const video = page.video()
  await ctx.close()
  const webm = await video.path()
  return { r, webm }
}

/* ---------- Compose ---------- */

async function compose(v, r, webm, stage) {
  const parts = join(WORK, 'parts-' + v.id)
  rmSync(parts, { recursive: true, force: true })
  mkdirSync(parts, { recursive: true })

  const overlays = []
  for (const [i, c] of r.cues.entries()) {
    const f = join(parts, `cap${i}.png`)
    await shotHtml(stage, captionHtml(c, v.tag), f, { omitBackground: true })
    overlays.push({ file: f, start: c.start, end: c.end })
  }
  const endPng = join(parts, 'end.png')
  await shotHtml(stage, endCardHtml(), endPng)
  overlays.push({ file: endPng, start: r.endAt, end: r.total + 1 })

  const music = join(parts, 'music.wav')
  run('python3', [join(TOOLS, 'synth-music.py'), String(Math.ceil(r.total) + 1), music])

  const args = ['-y', '-v', 'error', '-i', webm]
  for (const o of overlays) args.push('-loop', '1', '-framerate', '30', '-t', r.total.toFixed(2), '-i', o.file)
  const nImg = overlays.length
  for (const s of r.says) args.push('-i', s.file)
  args.push('-i', music)

  let f = `[0:v]trim=start=${r.trim.toFixed(3)},setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration=3,fps=30,scale=1080:1920:flags=lanczos[b0];`
  overlays.forEach((o, i) => {
    f += `[b${i}][${i + 1}:v]overlay=0:0:format=auto:enable='between(t,${o.start.toFixed(2)},${o.end.toFixed(2)})'[b${i + 1}];`
  })
  f += `[b${nImg}]format=yuv420p[vout];`
  const voiceIdx = r.says.map((_, i) => nImg + 1 + i)
  r.says.forEach((s, i) => {
    const ms = Math.round(s.start * 1000)
    f += `[${voiceIdx[i]}:a]aresample=44100,adelay=${ms}|${ms}[v${i}];`
  })
  const musicIdx = nImg + 1 + r.says.length
  f += `${r.says.map((_, i) => `[v${i}]`).join('')}amix=inputs=${r.says.length}:normalize=0:duration=longest[voice];`
  f += `[${musicIdx}:a]aresample=44100,volume=0.2,afade=t=out:st=${(r.total - 1.2).toFixed(2)}:d=1.2[mus];`
  f += `[voice][mus]amix=inputs=2:normalize=0:duration=longest,alimiter=limit=0.95[aout]`

  const outFile = join(OUT, `${v.file}.mp4`)
  args.push(
    '-filter_complex', f, '-map', '[vout]', '-map', '[aout]', '-t', r.total.toFixed(2),
    '-c:v', 'libx264', '-crf', '20', '-preset', 'medium', '-r', '30', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '160k', '-ar', '44100', '-movflags', '+faststart', outFile,
  )
  run(FFMPEG, args)

  // Cover: a clean frame from the recording, without captions.
  const framePng = join(parts, 'frame.png')
  const coverAt = r.trim + (v.cover.at ?? r.total * 0.5)
  run(FFMPEG, ['-y', '-v', 'error', '-ss', coverAt.toFixed(2), '-i', webm, '-frames:v', '1', '-vf', 'scale=1080:1920:flags=lanczos', framePng])
  const frameUrl = `https://ads.test/frame.png`
  const cover = await openStage(stage.context().browser(), { '/frame.png': framePng })
  await shotHtml(cover, coverHtml(v, frameUrl), join(OUT, `${v.file}-cover.jpg`), { type: 'jpeg', quality: 90 })
  await cover.close()
  return outFile
}

/* ---------- Main ---------- */

const wanted = process.argv.slice(2)
const list = VIDEOS.filter((v) => wanted.length === 0 || wanted.includes(v.id))
if (!list.length) throw new Error('No such video. Choose from: ' + VIDEOS.map((v) => v.id).join(', '))
if (!existsSync(join(DIST, 'index.html'))) throw new Error('dist/ is missing. Run npm run build first.')

const browser = await chromium.launch()
const stage = await openStage(browser)
for (const v of list) {
  console.log(`Recording ${v.id}...`)
  const { r, webm } = await recordVideo(browser, v)
  const file = await compose(v, r, webm, stage)
  console.log(`  ${file} (${r.total.toFixed(1)} s, ${(statSync(file).size / 1e6).toFixed(1)} MB)`)
}
await browser.close()
