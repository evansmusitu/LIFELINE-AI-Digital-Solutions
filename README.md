# LIFELINE AI CONCIERGE Demo Studio

Interactive demos of the systems LIFELINE AI CONCIERGE builds, made to turn visitors into WhatsApp enquiries.
Every demo runs in the browser on sample data. There is no backend, login or real payment.

The plan, brand rules and data policy are in [`handoff/PROJECT_BRIEF.md`](handoff/PROJECT_BRIEF.md).

## Run it

Requires Node.js 22.12 or newer. Cloudflare builds the site with Node 24, set in `.nvmrc`.

```bash
npm install
npm run dev       # local development server
npm run build     # type-check and build the static site into dist/
npm run preview   # serve the built site locally
npm run lint      # oxlint
```

Every pull request and every merge into `main` runs the **Check** workflow (`.github/workflows/check.yml`): a
clean `npm ci`, `npm run lint` and `npm run build`, on the Node version in `.nvmrc`. Its pass or fail mark shows on
the pull request.

## Deploy

The site is hosted on Cloudflare Workers as a static site. Workers Builds builds it from this GitHub repository,
and the hosting settings are in `wrangler.jsonc`.

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

## Where things live

| What | Where |
|---|---|
| Site address, WhatsApp number, email, link to the earlier studio, tagline, headline, search description, services list | `src/config/site.ts` |
| Pre-filled WhatsApp messages | `src/lib/whatsapp.ts` |
| Brand colours (confirmed) and fonts | `@theme` in `src/index.css` |
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
