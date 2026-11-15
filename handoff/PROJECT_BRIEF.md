# LIFELINE AI CONCIERGE: Demo Studio Project Brief

Status as of 15 November 2026. This file records every decision made so far, so work can continue in a new session without the original chat.

## 1. Goal

Expand the **LIFELINE Digital Demo Studio** with **25 new interactive demos** that win customers for LIFELINE AI CONCIERGE's services.

- Existing live studio (16 demos): https://lifeline-digital-demo-studio-llx092.v2.appdeploy.ai/
  - It renders with JavaScript. A plain fetch only returns the title "LIFELINE | Interactive Digital Solutions Demo Studio" and a loading message. Use a browser tool (Playwright) to review it.
- Primary business goal: **maximise customer enquiries**.
- WhatsApp contact: **+263 781 572 008** (https://wa.me/263781572008)
- Market: worldwide, based in Zimbabwe.

## 2. Repository

- GitHub: https://github.com/evansmusitu/LIFELINE-AI-Digital-Solutions
- It was **empty** when cloned (no commits, no branches).
- The source of the existing 16-demo site was **not found**. It may only exist on appdeploy.ai.
- Pending decision (default = Option 1):
  1. Build a new project in this repo.
  2. User supplies the existing source; new demos get added to it.
  3. Rebuild the existing 16 demos as well as the 25 new ones.

## 3. Brand

- **Brand name:** LIFELINE AI CONCIERGE (as shown on the logo)
- **Tagline (chosen):** Smart Technology. Practical Innovation. Business Growth.
  - Chosen because it names the customer outcome ("Business Growth"), "Practical" reassures small and mid-sized buyers who are wary of AI hype, and it matches the first announcement.
  - Rejected: "Smart Technology. Powerful Solutions. Global Opportunities." and "Innovating Today. Empowering Tomorrow."
- **Studio headline (suggested):** See what AI and automation can do for your business. Try it live.
- **Logo:** circular badge on deep navy, glowing neon ring (cyan to violet), stylised "L" icon, "LIFELINE" in bold white capitals, "AI CONCIERGE" in thin spaced capitals below.
  - The logo file is **not yet in the project**. It was only attached to the chat as an image. The user must add it as `public/logo.png` (preferably a transparent PNG or SVG). Until then, use a CSS or SVG "L" placeholder in brand colours.
  - Below about 120px wide, use the "L" icon alone, because the thin "AI CONCIERGE" text becomes unreadable.
- **Colours (estimated by eye; confirm exact values with the user):**

| Role | Hex |
|---|---|
| Background navy | `#050B1F` |
| Electric cyan | `#00D4FF` |
| Bright blue | `#2F7BFF` |
| Violet | `#8B5CF6` |
| Pink-lilac accent | `#E08BFF` |
| Text | `#FFFFFF` |

- **Font:** geometric sans-serif. Montserrat for headings, Inter or Poppins for body text.
- **Style:** dark navy pages, cyan-to-violet gradient buttons, glowing card borders. Glow goes only on headings, borders and buttons. Body text must keep high contrast.

## 4. Services LIFELINE sells (the demos must show these)

Website design, development and redesign · Website maintenance and support · AI chatbots and virtual assistants · Business process and workflow automation · Web applications and custom software · Customer support and lead generation · E-commerce and online stores · API integrations and AI-powered systems · Cloud deployment, hosting and monitoring · Dashboards and data analytics · Website security, backups and performance · UI/UX design and digital branding · SEO and website optimisation · Digital transformation and technology consulting.

## 5. Data policy (decided: Option A)

- **Realistic, polished sample data.** No lorem ipsum, "John Doe", "Test 123", placeholder images, empty states or broken links.
- A small, well-designed **"Sample data for demonstration"** badge appears on every demo.
- Invented business names that don't match real companies.
- No fake testimonials, client logos, reviews or statistics presented as real.
- The demos are showcases of capability, **not** past client projects. The original announcement says so, and the site must not contradict it.
- No real people's personal data.
- Locale: USD by default. Sample businesses come from several countries (UK, South Africa, UAE, US, Zimbabwe). ZiG appears only in the Zimbabwe-specific demos.

## 6. The 25 new demos (final list, service-focused first)

The existing 16 already cover: business websites, real estate, school admissions, online stores, booking and appointments (including hotel), support chatbot, dashboards, quotation tools, logistics tracking, online learning. The new list avoids duplicating them.

**AI and automation (LIFELINE's core services)**
1. AI lead-qualification chatbot, with handoff to a human
2. AI customer support dashboard with ticket triage
3. Workflow automation builder (trigger → action → result, e.g. order → invoice → email)
4. API integration hub (CRM, payments, email, WhatsApp connectors)
5. Website health and security monitor (uptime, backups, security score)
6. SEO audit tool (score and recommendations)
7. Website redesign before/after showcase
8. AI document assistant (upload a price list or policy, ask questions)

**Sales and customers**
9. WhatsApp ordering catalogue (builds a pre-filled WhatsApp order)
10. Restaurant and delivery app (menu, cart, order status, kitchen view)
11. Salon and spa booking (staff calendars, deposits, loyalty)
12. CRM and lead pipeline (Kanban board, follow-up reminders)
13. Events and ticketing (QR tickets, check-in scanner view)
14. Tourism and safari tour booking
15. Car dealership listings

**Operations and finance**
16. Inventory and point of sale (stock, low-stock alerts, daily sales)
17. Invoice and mobile money tracker (USD and ZiG, reminders)
18. HR and payroll lite (leave, attendance, payslips)
19. Fleet and maintenance tracker (services, fuel, repairs)
20. Solar and energy quoting tool (appliances → system size → quote)
21. Auto garage job cards

**Services and local markets**
22. Clinic and pharmacy system (appointments, reminders, stock)
23. Professional services client portal (law, accounting, consulting)
24. Farm and agri-produce marketplace
25. Savings group (mukando) manager

Dropped because they don't match LIFELINE's services: church portal, gym membership, job board, transport booking, school fees portal.

## 7. Build plan

- **Stack:** React + Vite + Tailwind CSS, TypeScript. No backend. All state in the browser (localStorage). No real payments or logins.
- **Depth:** medium. Each demo has 3–5 screens with working flows.
- **Batches of 5**, reviewed by the user after each batch:
  - Batch 1: #1 AI lead chatbot, #3 workflow automation builder, #9 WhatsApp ordering catalogue, #16 inventory and POS, #22 clinic and pharmacy
  - Batches 2–5: the remaining demos, in list order.
- **Conversion features (required on every demo):**
  - "Get a quote for this demo" WhatsApp button, with the demo name pre-filled: `https://wa.me/263781572008?text=<url-encoded message>`
  - Sticky call-to-action bar on mobile.
  - Business outcome metrics (leads captured, hours saved, orders processed).
  - A short "How we'd build this for you" section with timeline and service tags.
  - "Powered by LIFELINE AI CONCIERGE" bar around each demo.
- **Studio home page:** industry filter, demo cards with WhatsApp request buttons, final contact section with WhatsApp link and a short enquiry form.
- **Quality:** mobile-first, fast on slow connections and low-end phones, accessible contrast and keyboard use.
- **Git:** work on a feature branch and open a pull request with `gh api` (not `gh pr create`). Never commit directly to `main`. The repo is empty, so the first commit needs an initial base branch. Confirm with the user how to set that up.
- **Deployment:** to be decided. The agent can push code and open PRs. Deploying to appdeploy.ai is done by the user unless they provide a way.

## 8. Open items (ask the user)

1. Repository option 1, 2 or 3 (default: 1, build a new project in the empty repo).
2. Add the logo file to `public/logo.png`.
3. Confirm the exact brand colours, if known.
4. Confirm the final demo list and batch 1 order.
5. Deployment approach.
