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
npm test          # logic tests for the receptionist, video calls and totals (Vitest)
npm run cf-typegen  # regenerate worker/worker-configuration.d.ts after changing wrangler.jsonc
npm run stats-passcode  # make a new passcode for the private /stats page
```

Every pull request and every merge into `main` runs the **Check** workflow (`.github/workflows/check.yml`): a
clean `npm ci`, `npm run lint`, `npm test` and `npm run build`, on the Node version in `.nvmrc`. It also checks that
the Worker types match `wrangler.jsonc` and that the Worker bundles (`wrangler deploy --dry-run`).

The tests in `test/` cover the parts where a mistake costs money or loses customers: the video call limits and the
$40 budget, the receptionist's message limits, request checks, saved answers, the chat and call helpers, and the
daily totals with their private page. They
run the Worker code in Node with `cloudflare:workers` replaced by a stub (`vitest.config.ts`), and the Napster API
and Workers AI replaced by fakes. Vitest doesn't type-check them. Its pass or fail mark shows on
the pull request.

## Deploy

The site is live at **https://lifeline.mftintelligence.com**. It is hosted on Cloudflare Workers: the static build in
`dist/`, plus a small Worker script that answers `/api/*` and `/stats` only. Workers Builds builds it from this
GitHub repository, and the hosting settings are in `wrangler.jsonc`. Static files are free and unlimited on
Cloudflare.

The Worker runs in the Cloudflare account that holds `mftintelligence.com`, because a Worker's custom domain must be
in its own account. That account's other Workers share its daily allowances: 100,000 Worker requests and 10,000
Workers AI Neurons on the Free plan. This site only uses the Worker for chat, video calls and counts, and
`AI_REPLIES_PER_DAY` caps its AI use.

- **HTTPS.** The domain's "Always Use HTTPS" setting is off, and it is shared with other services, so the site sets
  `Strict-Transport-Security` itself (`public/_headers` for the pages, `worker/http.ts` for the Worker's answers).
  The Worker sends plain-HTTP requests to HTTPS, and a line at the top of each page does the same for the pages,
  which are served without running the Worker.
- **The security check.** The zone runs in "Under Attack" mode, which shows every visitor a "Just a moment..."
  check, and stops WhatsApp and Facebook from reading link previews. One custom rule in the zone skips only that
  setting for `lifeline.mftintelligence.com`, as the zone already does for its studio addresses. Browser
  Integrity Check and the managed firewall rules still apply.
- **The old address.** The site used to be at `lifeline-demo-studio.freelancer-d62.workers.dev`, in another
  account. That Worker now only sends visitors to the same page here (`worker/old-address.ts`, deployed once with
  `wrangler.old-address.jsonc`), so links shared earlier keep working. A page left open there from before the
  switch gets saved answers in the chat.

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

The production address is the `routes` entry in `wrangler.jsonc`. Cloudflare creates its DNS record and certificate
on deploy.

### Links and pages

Each demo has a clean link, such as `/demos/inventory-pos`. `npm run build` writes a separate HTML file for each
one (`dist/demos/<slug>.html`) with that demo's title and summary, so WhatsApp link previews and search results name
the demo. It also writes `sitemap.xml` and `robots.txt`. The code for this is the `studioPages` plugin in
`vite.config.ts`, and the text comes from `src/config/site.ts` and `src/demos/registry.ts`.

Home page sections use `/#demos` and `/#contact`. Old links such as `#/demos/inventory-pos` still work: they are
redirected to the clean link when the page opens.

Another static host works if it serves `demos/<slug>.html` at `/demos/<slug>` and sends unknown paths to
`index.html`. The site must be served from the root of its address.

## Search engines

`npm run build` writes `dist/sitemap.xml` (the home page and every demo) and `dist/robots.txt` (everything allowed
except `/api/` and `/stats`, plus a pointer to the sitemap). Both come from the `studioPages` plugin in
`vite.config.ts` and use `url` in `src/config/site.ts`.

**Bing, Yandex and others (IndexNow).** The key file `public/<key>.txt` proves the site is ours. After a deploy:

```
npm run indexnow -- --dry-run   # show what would be sent
npm run indexnow                # send the pages from dist/sitemap.xml (run npm run build first)
npm run indexnow -- --live      # send the pages from the live sitemap instead
```

The script checks that the key file is live before sending and says in plain words what the answer means.
Google does not use IndexNow.

**Google Search Console** (checklist, needs the owner's Google account):

- [ ] Add a URL-prefix property for `https://lifeline.mftintelligence.com/`.
- [ ] Verify with the HTML tag method: add the `<meta name="google-site-verification" content="...">` tag to `index.html`, deploy, then click Verify.
- [ ] Under Sitemaps, submit `sitemap.xml`.

**Bing Webmaster Tools:**

- [ ] Sign in and either import the site from Google Search Console, or add it and verify with a `<meta name="msvalidate.01" content="...">` tag in `index.html`.
- [ ] Under Sitemaps, submit `https://lifeline.mftintelligence.com/sitemap.xml`.

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

If the site moves to another address, change `url` in `src/config/site.ts` (link previews, canonical links, the
sitemap and shared demo links all use it) and the `routes` entry in `wrangler.jsonc`.

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
- **Cost: $0.** Every Cloudflare account includes 10,000 Workers AI Neurons a day (reset at 00:00 UTC), shared by
  all its Workers. On the Workers Free plan, calls past that are refused instead of billed; on Workers Paid they are
  billed. One reply uses an estimated 20 to 25 Neurons (about 2,000 tokens of instructions and facts, plus the
  reply). So the whole site stops at `AI_REPLIES_PER_DAY` replies a day (300, about 7,500 Neurons; each Preview
  20), then answers from saved replies until midnight UTC. That keeps it inside the allowance on either plan, with
  room for the account's other Workers. When this cap was set, none of them used Workers AI.
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

### The wellness practice persona

The wellness consulting demo has its own website assistant, Amani, who answers as the sample practice (Sable Leaf
Wellness) instead of as Tari. It uses the same endpoint, `/api/receptionist`, with the same per-visitor and per-network
limits and the same site-wide `AI_REPLIES_PER_DAY` cap, so the demo can't add to the day's AI use beyond that cap.

- **Which persona answers.** The Worker decides from the request's `page` field (`personaFor` in `worker/prompt.ts`):
  only `wellness-consulting`, sent by that demo's own chat, gets Amani's instructions (`wellnessPrompt`). Any other
  value, valid or not, gets Tari exactly as before. Tari's chat is never told it is on that page
  (`receptionistPage` in `src/receptionist/protocol.ts` gives it `home` there), and the page hides Tari's "Ask our AI"
  buttons, so the two assistants can't be mixed up.
- **Facts.** The prompt is built from `src/demos/wellness-consulting/business.ts`, the same file the demo's website and
  booking page use, so they always agree.
- **Guardrails.** The instructions put health and safety first: never diagnose, never recommend or dose treatments,
  supplements or remedies, never claim cures or results, never ask for symptoms or medical history, point anyone
  describing an emergency to emergency services or a doctor, decline anything unrelated to the practice, never ask for
  contact details in the chat, and name no outside companies, models or hosts. It runs at a lower temperature (0.3).
  Two checks don't depend on the AI at all: the chat shows a fixed emergency note when a message mentions an emergency
  (`isEmergency` in `engine.ts`, which matches every example the prompt lists and common ways of saying them), and
  contact details go to the team through a form, never through the AI.
- **Saved answers.** When there is no AI reply, the chat answers from `src/demos/wellness-consulting/assistant.ts`
  and labels it "Saved answer". Emergencies and health questions always get the same safe answers there too. For an
  emergency, the saved answer is a short line pointing to the red emergency note above it, so the note isn't repeated.
- **Tests.** `test/wellness.test.ts` checks the rules are in the prompt, that only that page gets the persona, that it
  goes through the same limits and cap, the saved answers, and the emergency note against a table of messages that
  must and must not show it.

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

## Totals

The site counts daily totals, and nothing about who did what: no cookies, and no IDs, addresses or message text are
kept with them. It counts chats started, AI replies, saved answers (by reason), video calls started, calls turned
away (by reason), WhatsApp taps (in the chat, on a video call, or on the pages) and demo shares (to WhatsApp, from
the phone's share menu, or by copying the link). The footer tells visitors.

- **How it works.** The Worker counts chats and calls itself, and only for requests within the chat and call limits,
  so a script can't push them up for free. An AI reply counts once it has been sent in full. The browser counts
  WhatsApp taps and shares (`src/lib/counts.ts`) by posting the event's name to `/api/event`, which takes at most 10
  a minute and 100 a day from one network. Those are a guide rather than exact: a script spread over many networks
  could add to them. The `SiteStats` Durable Object (`worker/stats.ts`) keeps one entry per UTC day, for 400 days. A
  count is added after the reply has gone, and a failed count never breaks the reply.
- **Cost: $0.** Each count is one Durable Object request, one row read and one row written, plus a few more once a
  day to delete the oldest day. A tap or share also goes through the per-network limit, which adds about the same
  again. The Workers Free plan includes 100,000 Durable Object requests and 100,000 rows written a day, shared with
  the message limiter and video calls. Requests refused by a limit aren't counted, so they cost what they did before.
- **Source tags.** A link ending `?ref=walk-in` (also `status`, `tiktok`, `facebook`, `instagram`, `referral`, `flyer`)
  counts one arrival under that tag in the "Arrived from a tagged link" column of `/stats`. Any other tag counts as
  `other`, and the text itself is never sent or stored, so the stored events stay a fixed set. A link with a valid
  `?for=` name also counts one "Personalised links opened", without the name. Each is counted once per tab session
  (a flag in `sessionStorage`; a new tab counts again, a reload does not). These go through `/api/event`, so they
  share the per-network limit (at most 2 of the 100 a day) and cost the same Durable Object requests as a tap.
  Trade-off: chats started are counted by the Worker, so tying them to a tag would mean sending the tag to the
  Worker with every message. That is skipped. WhatsApp taps are not split by tag either, as that would multiply the
  stored events by the number of tags.
- **Person tags.** A link ending `?by=team-a` (also `team-b`, `team-c`) counts one arrival under that person in the
  "Arrived from team-a" columns of `/stats`. Any other value counts as `other`, and the text is never sent or stored.
  It is a second, separate count from `?ref=`: a visit with both sends both events (plus `?for=` makes three), once per
  tab session. Daily totals only, no cookies, names or IDs. `scripts/outreach/links.mjs` reads a validated, optional
  `by` column and adds the tag. Trade-off: a per-person-per-channel table would need an event for every pair
  (3 people × 8 channels, plus others) or a changed request format, a bigger stats table, and more test surface. The
  Worker could store it cheaply (the same one entry per day), but it was left out, so `/stats` shows the two totals side
  by side and cannot say which person used which channel. Limits: a visit sends at most 3 events, so the 10 a minute
  and 100 a day per network are unchanged: that is about 33 full visits a day from one phone.
- **Reading them.** Open `/stats` on the live site and enter the passcode. The page shows video call spending, the
  last 14 days and every total since counting began. Previews keep their own totals. Passcode tries, right or wrong,
  are limited to 10 a minute and 60 a day per network.
- **The passcode.** Only its SHA-256 is in `wrangler.jsonc` (`STATS_PASSCODE_SHA256`), which is safe in a public
  repository because the passcode is 20 random characters. To change it, run `npm run stats-passcode`, put the new
  hash in both `vars` and `previews.vars`, and merge. Set it to `""` to remove the page.

## Personalised demo links

Add `?for=` and a business name to a link and the visitor sees their own business in the demo, for example
`/demos/whatsapp-ordering?for=Mama%27s+Kitchen` (a space can be `+` or `%20`). The name replaces the sample business
name in the WhatsApp ordering, salon booking and wellness consulting demos (in the wellness demo: the header, the
sample website, the assistant's greeting and replies, and the WhatsApp messages), adds a line to the home page, and Tari's greeting welcomes it.
Everything else stays the sample data, and the "Sample business" tag stays.

- **Validation.** `src/lib/business-name.ts` trims the name, collapses spaces and accepts up to 40 characters: letters
  (including accented ones), digits, spaces and `' ’ & . , ! ( ) -`. Anything else (for example `<`, `>`, quotes,
  slashes or control characters), a name with no letter or digit, or an empty value is ignored, and the page shows the
  normal sample name. The name is only ever drawn as React text.
- **Privacy.** The name stays in the browser. It is kept in `sessionStorage` for the tab, so it survives moving between
  pages and goes when the tab closes. It is never put in `localStorage` or a cookie, never sent to the Worker, the
  totals or the AI prompt, and never added to the WhatsApp summary. Tari's greeting is changed when it is drawn, so the
  name isn't saved with the chat.
- **Tests.** `test/business-name.test.ts` covers the validator.

## Outreach links

`scripts/outreach/links.mjs` turns a CSV of prospects (business name, demo slug, ref tag) into personalised demo links
and a short WhatsApp-ready message for each row. It has no dependencies and reads the site address, demo slugs and ref
tags from the source files, so nothing is copied.

```
node scripts/outreach/links.mjs scripts/outreach/prospects.example.csv
```

It warns when a name would be tidied and reports names, demos or tags the site would not accept. It accepts every
demo with a page, unlisted ones included. The example CSV uses
invented businesses. `test/outreach-links.test.ts` checks the script against the site's own name rules and lists.

The outreach kit is in `docs/outreach/`: message templates, a walk-in script, answers to common questions, a prospect
tracker (`prospect-tracker.csv`) and a weekly review checklist. It is plain text outside `public/`, so it is not
published with the site. The prices in it are numbers to test, not market facts.

## Walk-in flyer

`scripts/flyer/generate.mjs` makes a printable A5 flyer (and an A4 sheet with two) with a QR code to the WhatsApp ordering demo, one per `?by=` person plus a generic one, in English and a Shona draft. It decodes every QR back to its exact link. See `scripts/flyer/README.md`.

## Where things live

| What | Where |
|---|---|
| Site address, WhatsApp number, email, link to the earlier studio, tagline, headline, search description, services list | `src/config/site.ts` |
| Pre-filled WhatsApp messages | `src/lib/whatsapp.ts` |
| About text, "How we work" principles and the 3-step process (also used by the AI receptionist) | `src/config/about.ts` |
| AI receptionist: chat panel, saved answers, voice | `src/receptionist/` |
| AI receptionist: Worker, instructions and facts, rate limits | `worker/`, `wrangler.jsonc` |
| Video calls: call screen, limits, Napster agents and tool | `src/receptionist/video/`, `worker/video*.ts`, `worker/napster.ts`, `scripts/napster-setup.mjs` |
| Daily totals: what is counted, the tap counter, the /stats page | `src/lib/count-events.ts`, `src/lib/counts.ts`, `worker/stats*.ts` |
| Brand colours (confirmed) and fonts | `@theme` in `src/index.css` |
| Demo list, card text, "Try this" tips, "How we'd build this" timelines | `src/demos/registry.ts` |
| Studio pages (home, demo page frame, 404) | `src/pages/` |
| Shared studio components (header, footer, buttons, mobile CTA bar, logo) | `src/components/` |
| Light UI kit used inside the sample businesses' apps | `src/demos/ui.tsx`, `src/demos/styles.ts`, `src/demos/shell.tsx` |
| One folder per demo: sample data, logic and screens | `src/demos/<slug>/` |

## Demos

Batches 1 to 3 of 5 (numbers refer to the brief's list of 25), plus the wellness consulting demo:

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
| – | Wellness practice: AI assistant and booking (unlisted) | Sable Leaf Wellness, Harare and Johannesburg | Website with a live AI assistant and lead capture, booking (in person at either office or online), a simulated WhatsApp conversation, owner view |

The wellness demo is unlisted (see [Unlisted demos](#unlisted-demos)): open it at `/demos/wellness-consulting`.
Its times are Harare and Johannesburg time (UTC+2) whatever the visitor's time zone. It asks only for a name, a phone
number and an optional email, never health information. The WhatsApp screen is scripted and says so; nothing is sent.
Deposits appear only as an "optional later" note.

- **Demo clock.** The demo runs on its own clock: 09:30 UTC+2 on today's date when the page opens, then in real time,
  so there are times to book today whenever it is shown. The free times, the sample bookings, the owner view and the
  WhatsApp messages all use it, and the screens label it "Demo time" (the header, the booking time step and the
  owner view), never as the real local time. Opening the page again starts it at 09:30 again.
- **Sundays.** Both offices and online consultations are closed on Sundays, as the website and the assistant say. On
  a Sunday the booking page, the sample bookings and the WhatsApp conversation start on Monday, and the owner view
  shows today as closed. The hours on the website, the booking page and in the assistant's facts come from the same
  strings in `business.ts` as the slot hours.
- **One wording.** The online video link "comes by WhatsApp an hour before the session", and the confirmation is sent
  when the client books: the same words on the website, in the assistant's facts and in the WhatsApp messages. The
  payment wording is shared too (`PAYMENT` in `business.ts`): free services need no payment, in-person sessions are
  paid at the office, online ones after the WhatsApp confirmation message.
- **No double bookings.** The Book screen checks a time again when it is confirmed, and the WhatsApp script checks its
  planned time again just before it books (planning the next free time if it has gone). Booking references are
  never reused.

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
3. Add an entry to `ALL_DEMOS` in `src/demos/registry.ts`. The home page, footer, WhatsApp messages and page frame
   pick it up from there. Each demo's code is downloaded only when its page is opened.

### Unlisted demos

A demo with `listed: false` has a working page and its own HTML file, with `<meta name="robots" content="noindex">`,
but is left out of the gallery, the footer, "More demos", the demo count, `sitemap.xml` and the receptionist's
knowledge. `DEMOS` holds the listed demos; `ALL_DEMOS` holds every demo with a page.

The wellness consulting demo is listed (`LIST_WELLNESS_DEMO = true` at the top of `src/demos/registry.ts`). To
unlist it again, set it to `false` and merge. Nothing else needs changing. The tests read the switch, so they pass either way:
`test/wellness.test.ts` checks the gallery list, the demo count and the receptionist's knowledge, and
`test/studio-pages.test.ts` runs the build's page step (`studioPages` in `vite.config.ts`) and checks the noindex tag,
`sitemap.xml` and the knowledge file.

## Sample data rules

From the brief's data policy: invented business names, realistic data, no lorem ipsum, no fake testimonials or
statistics presented as real, and no real people's personal data. Phone numbers are masked or use reserved fictional
ranges (UK 07700 900xxx), and consumer email addresses use `example.com`. Prices are in USD.

## Quality checks

- Mobile first. Checked for horizontal overflow and clipped content at 320, 360, 414, 768 and 1024 px.
- Text and button colours meet WCAG AA contrast. Tabs support arrow keys, dialogs close with Escape and return
  focus, and a skip link leads to the main content.
- Each demo loads as its own small chunk (about 14 to 29 KB gzipped), so the home page stays light on slow connections.
