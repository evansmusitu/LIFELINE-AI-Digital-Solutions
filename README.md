# LIFELINE AI CONCIERGE Demo Studio

Interactive demos of the systems LIFELINE AI CONCIERGE builds, made to turn visitors into WhatsApp enquiries.
Every demo runs in the browser on sample data. There is no login or real payment. The only server code is the AI
receptionist and its video calls, a small Cloudflare Worker in `worker/` (see [AI receptionist](#ai-receptionist)
and [Video calls](#video-calls)).

The plan, brand rules and data policy are in [`handoff/PROJECT_BRIEF.md`](handoff/PROJECT_BRIEF.md).

## Run it

Requires Node.js 22.12 or newer. Cloudflare builds the site with Node 24, set in `.nvmrc`.

```bash
npm install
npm run dev       # local development server
npm run build     # type-check and build the static site into dist/
npm run preview   # serve the built site locally
npm run lint      # oxlint
npm test          # logic tests for the receptionist and video calls (Vitest)
npm run cf-typegen  # regenerate worker/worker-configuration.d.ts after changing wrangler.jsonc
```

Every pull request and every merge into `main` runs the **Check** workflow (`.github/workflows/check.yml`): a
clean `npm ci`, `npm run lint`, `npm test` and `npm run build`, on the Node version in `.nvmrc`. It also checks that
the Worker types match `wrangler.jsonc` and that the Worker bundles (`wrangler deploy --dry-run`).

The tests in `test/` cover the parts where a mistake costs money or loses customers: the video call limits and the
$40 budget, the receptionist's message limits, request checks, saved answers, and the chat and call helpers. They
run the Worker code in Node with `cloudflare:workers` replaced by a stub (`vitest.config.ts`), and the Napster API
and Workers AI replaced by fakes. Vitest doesn't type-check them. Its pass or fail mark shows on
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
| `src/assets/logo-mark.png` | 128 px, 15 KB | The "L" icon alone on a navy disc: header, footer, "Powered by" bars, browser tab icon |
| `public/og-image.jpg` | 1200 × 630, 91 KB | Link preview on WhatsApp, Facebook, LinkedIn and X: Tari's photo, the "L" icon and the name |

At small sizes the site uses only the "L" icon, with the name in live text, because the thin "AI CONCIERGE"
lettering is unreadable below about 120 px. If the logo changes, regenerate both copies. When `og-image.jpg`
changes, raise the `?v=` number on its `og:image` tag in `index.html`, so apps that cached the old image fetch the
new one.

If the site moves to another address, change `url` in `src/config/site.ts`. Link previews, canonical links and the
sitemap all use it.

## AI receptionist

Tari, the chat that opens from "Ask our AI receptionist" on the home page and "Ask our AI about this demo" on demo
pages, answers questions about LIFELINE and its demos with a real AI model, then hands the visitor to WhatsApp with
their questions filled in.

- **How it works.** The browser posts the conversation to `/api/receptionist`. The Worker (`worker/receptionist.ts`)
  checks it, adds the instructions and facts in `worker/prompt.ts`, and streams the reply from Workers AI. The model
  is set by `AI_MODEL` in `wrangler.jsonc` (Gemma 4 26B, with thinking switched off). In a comparison on the
  Preview it wrote the most natural Shona of the three models listed in `worker/receptionist.ts`.
- **Facts.** The prompt uses the same text as the website: `src/config/site.ts`, `src/config/about.ts`, and the demo
  list, which the build writes to `dist/receptionist-knowledge.json` from `src/demos/registry.ts`. A new demo is
  known to the receptionist as soon as it is on the site.
- **Cost: $0.** On the Workers Free plan, Workers AI includes 10,000 Neurons a day (reset at 00:00 UTC). Past that,
  Cloudflare refuses the call instead of billing for it. One reply uses an estimated 20 to 25 Neurons (about 2,000
  tokens of instructions and facts, plus the reply), so roughly 400 replies a day. Moving the account to the Workers Paid plan would change this: usage past the allowance would then be
  billed.
- **Saved answers.** When there is no AI reply (allowance used up, too many messages, offline or an error), the browser
  answers from `src/receptionist/fallback.ts` and labels it "Saved answer". The chat never stops working.
- **Limits.** Per visitor: 8 messages a minute and 40 a day. Per network (an IPv4 address, or an IPv6 /64, which
  many phones on one mobile network can share): 30 a minute and 150 a day. A small Durable Object counts them exactly
  (`worker/limiter.ts`, included in the Free plan); Cloudflare's Rate Limiting binding was tried first, but in
  testing it let every request through. If the limiter fails, visitors get saved answers rather than unprotected AI
  calls. Messages are capped at 500 characters (also after joining several), with the last 10 messages and at most
  5,000 characters of history sent. Only the site's own pages are accepted, which stops other websites but not a
  script that fakes the header: the daily caps limit what one network can use, and a bot check (Turnstile) would be
  the next step if scripts spread across many networks start using up the allowance.
- **Voice.** "Read replies aloud" uses the phone's built-in voice. Voice typing uses the browser's speech service and
  only shows where the browser supports it (Chrome, Edge, Safari).
- **Privacy.** Messages go to Workers AI to write each reply. The production model has zero data retention, and
  Cloudflare doesn't train on customer content. The Worker doesn't log message text. Video calls are different:
  Napster keeps each call's transcript in its session records until the session is deleted, and the footer says
  so. The conversation is also saved in the visitor's browser.
- **Previews.** Previews accept a `model` field in the request (`ALLOW_MODEL_CHOICE`), to compare the models listed
  in `worker/receptionist.ts`. Production ignores it.

## Video calls

Visitors can also talk to Tari face to face: the video button in the chat header, or "Prefer to talk? Video call
Tari" before the first message. Tari is a live talking avatar (Napster Omniagent API) that listens, answers out
loud, shows captions, and puts a link on screen for each demo she recommends (the `show_demo` tool). When the call
ends, what was said is added to the chat, so it goes with the "Continue on WhatsApp" message.

- **How it works.** After the visitor allows the microphone, the browser asks `/api/video/start` for a one-call
  token (`worker/video.ts`). The `VideoCalls` Durable Object (`worker/video-calls.ts`) checks the limits, updates the
  agent's instructions when the site's facts or demos have changed (`videoPrompt` in `worker/prompt.ts`), and
  creates the call. The Napster API key is the Worker secret `NAPSTER_API_KEY` and never reaches the browser. The
  call screen and its SDK (`src/receptionist/video/`) are a separate 53 KB download, fetched only when a call is
  opened.
- **Limits** (`vars` in `wrangler.jsonc`): calls end after 175 seconds, so a full call is 3 billed minutes (Napster
  bills each started minute). Tari is told to wrap up 30 seconds before, and the Worker ends any call still running
  30 seconds after the limit, retrying until Napster confirms it has ended. 20 calls a day in total, 2 per visitor
  and 6 per network (on Previews too, since their links are public), and at most 5 at once. Calls stop for good
  once $40 has been spent (`VIDEO_BUDGET_USD`).
- **Spending** is counted from Napster's own session records, so it includes the live site, every Preview and any
  tests. A call that hasn't been billed yet counts as its longest possible cost (4 billed minutes, $0.23), or more
  if it has somehow been running longer. That allows at least 171 calls in the $40. Set `VIDEO_BUDGET_USD` to
  `"0"` to switch calls off.
- **Agents.** The live site and Previews use separate Napster agents (`NAPSTER_AGENT_ID`), so testing new
  instructions on a Preview never changes the live site. `scripts/napster-setup.mjs` creates or updates both agents
  and the `show_demo` tool: `NAPSTER_API_KEY=... node scripts/napster-setup.mjs`.
- **The avatar** is Kai Mercer from Napster's stock catalogue, presented as Tari, with the `cedar` voice. He also has
  a v2 avatar, for when Napster switches v2 on for the account. To change the face or voice, edit `COMPANION_ID` and
  `VOICE` in the setup script, run it, and replace `public/tari-video.jpg`.

## Where things live

| What | Where |
|---|---|
| Site address, WhatsApp number, email, link to the earlier studio, tagline, headline, search description, services list | `src/config/site.ts` |
| Pre-filled WhatsApp messages | `src/lib/whatsapp.ts` |
| About text, "How we work" principles and the 3-step process (also used by the AI receptionist) | `src/config/about.ts` |
| AI receptionist: chat panel, saved answers, voice | `src/receptionist/` |
| AI receptionist: Worker, instructions and facts, rate limits | `worker/`, `wrangler.jsonc` |
| Video calls: call screen, limits, Napster agents and tool | `src/receptionist/video/`, `worker/video*.ts`, `worker/napster.ts`, `scripts/napster-setup.mjs` |
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
