# LIFELINE AI CONCIERGE Demo Studio

Interactive demos of the systems LIFELINE AI CONCIERGE builds, made to turn visitors into WhatsApp enquiries.
Every demo runs in the browser on sample data. There is no login or real payment. The only server code is the AI
receptionist, a small Cloudflare Worker in `worker/` (see [AI receptionist](#ai-receptionist)).

The plan, brand rules and data policy are in [`handoff/PROJECT_BRIEF.md`](handoff/PROJECT_BRIEF.md).

## Run it

Requires Node.js 22.12 or newer. Cloudflare builds the site with Node 24, set in `.nvmrc`.

```bash
npm install
npm run dev       # local development server
npm run build     # type-check and build the static site into dist/
npm run preview   # serve the built site locally
npm run lint      # oxlint
npm run cf-typegen  # regenerate worker/worker-configuration.d.ts after changing wrangler.jsonc
```

Every pull request and every merge into `main` runs the **Check** workflow (`.github/workflows/check.yml`): a
clean `npm ci`, `npm run lint` and `npm run build`, on the Node version in `.nvmrc`. It also checks that the Worker
types match `wrangler.jsonc` and that the Worker bundles (`wrangler deploy --dry-run`). Its pass or fail mark shows on
the pull request.

## Deploy

The site is hosted on Cloudflare Workers: the static build in `dist/`, plus a small Worker script that answers
`/api/*` only. Workers Builds builds it from this GitHub repository, and the hosting settings are in `wrangler.jsonc`.
Static files are free and unlimited on Cloudflare. The Worker uses the Workers Free plan allowance (100,000 requests a
day).

| Setting | Value |
|---|---|
| Worker name | `lifeline-demo-studio`. It must match `name` in `wrangler.jsonc`, or builds fail. |
| Production branch | `main` |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Preview command | `npx wrangler preview` |
| Preview builds | On |
| Preview URLs | On, under the Worker's **Domains** tab > **Worker URL** > **Preview** |
| Node.js version | 24, read from `.nvmrc` |

Every merge into `main` goes live. Every push to another branch creates a Preview, and Cloudflare posts its link on
the pull request. Preview links on `workers.dev` are public but tell search engines not to index them.

A custom domain needs the domain's DNS to be managed by Cloudflare (the free plan is enough).

### Links and pages

Each demo has a clean link, such as `/demos/inventory-pos`. `npm run build` writes a separate HTML file for each
one (`dist/demos/<slug>.html`) with that demo's title and summary, so WhatsApp link previews and search results name
the demo. It also writes `sitemap.xml` and `robots.txt`. The code for this is the `studioPages` plugin in
`vite.config.ts`, and the text comes from `src/config/site.ts` and `src/demos/registry.ts`.

Home page sections use `/#demos` and `/#contact`. Old links such as `#/demos/inventory-pos` still work: they are
redirected to the clean link when the page opens.

Another static host works if it serves `demos/<slug>.html` at `/demos/<slug>` and sends unknown paths to
`index.html`. The site must be served from the root of its address.

## Logo

`public/logo.png` is the master logo (768 px). The pages use smaller copies made from it:

| File | Size | Used for |
|---|---|---|
| `src/assets/logo-badge.jpg` | 480 px, 34 KB | Full badge on the home page |
| `src/assets/logo-mark.png` | 128 px, 15 KB | The "L" icon alone on a navy disc: header, footer, "Powered by" bars, browser tab icon |
| `public/og-image.jpg` | 1200 × 630, 90 KB | Link preview on WhatsApp, Facebook, LinkedIn and X |

At small sizes the site uses only the "L" icon, with the name in live text, because the thin "AI CONCIERGE"
lettering is unreadable below about 120 px. If the logo changes, regenerate all three copies.

If the site moves to another address, change `url` in `src/config/site.ts`. Link previews, canonical links and the
sitemap all use it.

## AI receptionist

Tari, the chat that opens from "Ask our AI receptionist" on the home page and "Ask our AI about this demo" on demo
pages, answers questions about LIFELINE and its demos with a real AI model, then hands the visitor to WhatsApp with
their questions filled in.

- **How it works.** The browser posts the conversation to `/api/receptionist`. The Worker (`worker/receptionist.ts`)
  checks it, adds the instructions and facts in `worker/prompt.ts`, and streams the reply from Workers AI. The model
  is set by `AI_MODEL` in `wrangler.jsonc` (Gemma 4 26B, with thinking switched off).
- **Facts.** The prompt uses the same text as the website: `src/config/site.ts`, `src/config/about.ts`, and the demo
  list, which the build writes to `dist/receptionist-knowledge.json` from `src/demos/registry.ts`. A new demo is
  known to the receptionist as soon as it is on the site.
- **Cost: $0.** On the Workers Free plan, Workers AI includes 10,000 Neurons a day (reset at 00:00 UTC). Past that,
  Cloudflare refuses the call instead of billing for it. One reply uses roughly 20 to 25 Neurons, so about 400
  replies a day. Moving the account to the Workers Paid plan would change this: usage past the allowance would then be
  billed.
- **Saved answers.** When there is no AI reply (allowance used up, too many messages, offline or an error), the browser
  answers from `src/receptionist/fallback.ts` and labels it "Saved answer". The chat never stops working.
- **Limits.** 8 messages a minute per visitor and 30 per network, counted exactly by a small Durable Object
  (`worker/limiter.ts`, included in the Free plan). Also: messages up to 500 characters, the last 10 messages sent as
  history, and requests only from the site's own pages. Cloudflare's built-in Rate Limiting binding was tried first,
  but it is approximate per location and in testing let every request through.
- **Voice.** "Read replies aloud" uses the phone's built-in voice. Voice typing uses the browser's speech service and
  only shows where the browser supports it (Chrome, Edge, Safari).
- **Privacy.** Messages go to Workers AI to write each reply. The production model has zero data retention, and
  Cloudflare doesn't train on customer content. The Worker doesn't log message text. The conversation is saved only in the visitor's browser.
- **Previews.** Previews accept a `model` field in the request (`ALLOW_MODEL_CHOICE`), to compare the models listed
  in `worker/receptionist.ts`. Production ignores it.

## Where things live

| What | Where |
|---|---|
| Site address, WhatsApp number, email, link to the earlier studio, tagline, headline, search description, services list | `src/config/site.ts` |
| Pre-filled WhatsApp messages | `src/lib/whatsapp.ts` |
| About text, "How we work" principles and the 3-step process (also used by the AI receptionist) | `src/config/about.ts` |
| AI receptionist: chat panel, saved answers, voice | `src/receptionist/` |
| AI receptionist: Worker, instructions and facts, rate limits | `worker/`, `wrangler.jsonc` |
| Brand colours (confirmed) and fonts | `@theme` in `src/index.css` |
| Demo list, card text, "Try this" tips, "How we'd build this" timelines | `src/demos/registry.ts` |
| Studio pages (home, demo page frame, 404) | `src/pages/` |
| Shared studio components (header, footer, buttons, mobile CTA bar, logo) | `src/components/` |
| Light UI kit used inside the sample businesses' apps | `src/demos/ui.tsx`, `src/demos/styles.ts`, `src/demos/shell.tsx` |
| One folder per demo: sample data, logic and screens | `src/demos/<slug>/` |

## Demos

Batches 1 to 3 of 5 (numbers refer to the brief's list of 25):

| # | Demo | Sample business | Screens |
|---|---|---|---|
| 1 | AI lead-qualification chatbot | Dunebridge Interiors, Dubai | Website chat, team inbox with handoff, leads, assistant settings |
| 2 | AI customer support desk | Grysbok Outdoor, Cape Town | Customer help form, triage inbox with suggested replies, reports, automation rules |
| 3 | Workflow automation builder | Hartwell Loom, Leeds | Workflows, builder, test run, run history, templates |
| 4 | API integration hub | Linden Hollow Property Management, Atlanta | Connected apps and flows, live events, field mapping, errors and retries, connect an app |
| 5 | Website health and security monitor | Hornbill Spray Lodge, Victoria Falls | Overview, uptime with a simulated outage, backups and restore, security fixes, alerts |
| 6 | SEO audit tool | Avonmere Plumbing & Heating, Bristol | Audit score, fix list, search result preview, keywords and local listings |
| 7 | Website redesign before and after | Kopje Spring Drilling, Harare | Comparison slider, what changed, results, the new site, enquiries |
| 8 | AI document assistant | Irkdale Building Supplies, Manchester | Staff assistant with sources, customer WhatsApp chat, documents (upload your own), insights |
| 9 | WhatsApp ordering catalogue | Jacaranda & Rye Bakehouse, Harare | Menu, order and WhatsApp preview, shop orders, products |
| 10 | Restaurant and delivery app | Dhow & Thyme, Abu Dhabi | Menu and cart, order tracking, kitchen screen, menu manager, today's figures |
| 11 | Salon and spa booking | Sunbird & Sage Salon & Spa, Johannesburg | Booking with deposits, staff calendar, clients, loyalty card, reports |
| 12 | CRM and lead pipeline | Copperline Commercial Cleaning, Raleigh | Pipeline board, deal detail with proposal builder, follow-ups, website form, reports |
| 13 | Events and ticketing | Msasa Sky Festival, Harare | Ticket shop, QR ticket wallet, gate scanner, check-in, sales |
| 16 | Inventory and point of sale | Bramblewood Hardware & Garden, Austin | Checkout, inventory, reorder and purchase orders, daily sales |
| 22 | Clinic and pharmacy system | Lindhaven Family Clinic & Pharmacy, Bulawayo | Front desk, reminders, dispensing, pharmacy stock |

The SEO audit only checks its sample site. Its "Want a real audit of your own website?" panel sends the visitor's
address to LIFELINE on WhatsApp.

The document assistant answers from files the visitor uploads (`.txt`, `.md`, `.csv`) or pastes. They are read and
searched in the browser and never leave it. The events demo draws real, scannable QR codes with its own encoder
(`src/demos/events-ticketing/qr.ts`), checked against a reference encoder and decoded with OpenCV. Its gate scanner
can use the phone camera where the browser supports QR detection (Chrome on Android, for example).

Every demo page has the conversion features from the brief: a "Get a quote for this demo" WhatsApp button with the
demo name filled in, a sticky call-to-action bar on phones, live outcome metrics, a "How we'd build this for you"
section, the "Powered by LIFELINE AI CONCIERGE" frame and the "Sample data for demonstration" badge.

### Adding a demo

1. Create `src/demos/<slug>/index.tsx` with a default-exported component. Wrap the screens in `DemoAppShell` and
   report live figures with `useDemoMetrics`.
2. Keep its state in `usePersistentState('<slug>.state', ...)` so "Reset demo" can clear it.
3. Add an entry to `DEMOS` in `src/demos/registry.ts`. The home page, footer, WhatsApp messages and page frame
   pick it up from there. Each demo's code is downloaded only when its page is opened.

## Sample data rules

From the brief's data policy: invented business names, realistic data, no lorem ipsum, no fake testimonials or
statistics presented as real, and no real people's personal data. Phone numbers are masked or use reserved fictional
ranges (UK 07700 900xxx), and consumer email addresses use `example.com`. Prices are in USD.

## Quality checks

- Mobile first. Checked for horizontal overflow and clipped content at 320, 360, 414, 768 and 1024 px.
- Text and button colours meet WCAG AA contrast. Tabs support arrow keys, dialogs close with Escape and return
  focus, and a skip link leads to the main content.
- Each demo loads as its own small chunk (about 14 to 29 KB gzipped), so the home page stays light on slow connections.
