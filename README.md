# LIFELINE AI CONCIERGE Demo Studio

Interactive demos of the systems LIFELINE AI CONCIERGE builds, made to turn visitors into WhatsApp enquiries.
Every demo runs in the browser on sample data. There is no backend, login or real payment.

The plan, brand rules and data policy are in [`handoff/PROJECT_BRIEF.md`](handoff/PROJECT_BRIEF.md).

## Run it

Requires Node.js 20.19+ or 22.12+.

```bash
npm install
npm run dev       # local development server
npm run build     # type-check and build the static site into dist/
npm run preview   # serve the built site locally
npm run lint      # oxlint
```

## Deploy

The site is hosted on Cloudflare Pages, connected to this GitHub repository:

| Setting | Value |
|---|---|
| Production branch | `main` |
| Framework preset | React (Vite) |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node.js version | 22, read from `.nvmrc` |

Every merge into `main` goes live, and every pull request gets its own preview link.

`npm run build` produces a plain static site in `dist/`, so any other static host works too. Pages use hash URLs such
as `#/demos/inventory-pos`, and asset paths are relative, so no server rewrites are needed.

## Logo

Add the real logo as `public/logo.png` (a transparent PNG or SVG works best). The large badge on the home page picks
it up automatically. Until then, an SVG "L" placeholder in brand colours is shown. At small sizes (header, footer,
favicon) the site always uses the "L" mark with the name in live text, because the thin "AI CONCIERGE" lettering
in the logo is unreadable below about 120 px.

## Where things live

| What | Where |
|---|---|
| WhatsApp number, tagline, headline, services list | `src/config/site.ts` |
| Pre-filled WhatsApp messages | `src/lib/whatsapp.ts` |
| Brand colours and fonts (estimated colours, change once confirmed) | `@theme` in `src/index.css` |
| Demo list, card text, "Try this" tips, "How we'd build this" timelines | `src/demos/registry.ts` |
| Studio pages (home, demo page frame, 404) | `src/pages/` |
| Shared studio components (header, footer, buttons, mobile CTA bar, logo) | `src/components/` |
| Light UI kit used inside the sample businesses' apps | `src/demos/ui.tsx`, `src/demos/styles.ts`, `src/demos/shell.tsx` |
| One folder per demo: sample data, logic and screens | `src/demos/<slug>/` |

## Demos

Batch 1 of 5 (numbers refer to the brief's list of 25):

| # | Demo | Sample business | Screens |
|---|---|---|---|
| 1 | AI lead-qualification chatbot | Dunebridge Interiors, Dubai | Website chat, team inbox with handoff, leads, assistant settings |
| 3 | Workflow automation builder | Hartwell Loom, Leeds | Workflows, builder, test run, run history, templates |
| 9 | WhatsApp ordering catalogue | Jacaranda & Rye Bakehouse, Harare | Menu, order and WhatsApp preview, shop orders, products |
| 16 | Inventory and point of sale | Bramblewood Hardware & Garden, Austin | Checkout, inventory, reorder and purchase orders, daily sales |
| 22 | Clinic and pharmacy system | Lindhaven Family Clinic & Pharmacy, Bulawayo | Front desk, reminders, dispensing, pharmacy stock |

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
- Each demo loads as its own small chunk (about 14 to 20 KB gzipped), so the home page stays light on slow connections.
