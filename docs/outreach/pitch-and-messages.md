# Pitch and messages

First market (assumed, check it): restaurants, takeaways and bakeries in Harare that already take orders on WhatsApp. Salons second.

The package: **your menu on WhatsApp with an AI receptionist.**

Use `scripts/outreach/links.mjs` to make the personalised demo link for each business.

## Friends who help (per-person tags)

Friends who hand out demo links get 10 percent of the agreed price for each business they bring who becomes a client. This note is only the idea. Agree it with each friend in plain words before they start, and write down what you agreed. Nothing here is a contract.

- Give each friend a tag: `team-a`, `team-b` or `team-c`. Put it in the `by` column of the prospects file, and `links.mjs` adds `&by=team-a` to their links.
- `/stats` then shows how many arrivals each tag brought, next to the arrivals per channel (walk-in, status, and so on). These are totals only. The two are counted separately, so the site cannot say which friend used which channel.
- In `prospect-tracker.csv`, fill the `who` column with the friend's tag (or leave it empty if it was you), so each reply and decision is tied to a person.
- Link visits are a guide. The commission is on clients who sign, which you note in the tracker, not on visit counts.

## Rules for every message

- Short and personal. Use the owner's or business's name. Say where you found them.
- No price in the first message.
- Say the demo uses an invented business and sample data. Do not imply it is their real system.
- No promised results, no invented testimonials, statistics or client names.
- One follow-up on day 3. Then stop.

## First message: WhatsApp

> Hi {name}, this is Evans from LIFELINE in Zimbabwe. I saw {your menu on Facebook / your WhatsApp orders}. I made a small sample of how your menu could work on WhatsApp, with an AI receptionist answering customers. It uses invented items and sample data, so nothing is real yet. Would you like to look? {link}

## First message: Facebook or Instagram DM

> Hi {name}, I'm Evans, a developer in Zimbabwe. I like {something specific from their page}. I built a sample of a menu on WhatsApp with an AI receptionist, using invented items. Can I send you the link? It takes 2 minutes to look at.

## First message: walk-in (say it, then show your phone)

> Hello, I'm Evans. I build WhatsApp ordering for restaurants and bakeries. Do you take orders on WhatsApp now? Can I show you a 2-minute sample on my phone? It is not your real menu, just an example.

## Day 3 follow-up (once, then stop)

> Hi {name}, just checking you saw the sample I sent on {day}. No pressure. If it is not useful, I will not message again.

## 2-minute walk-in demo script

1. **Ask (20 seconds).** "How do customers order from you today? WhatsApp? How many messages on a busy day?" Listen. Note the answer in the tracker.
2. **Show the link (60 seconds).** Open the personalised link so their business name shows. Say: "The name is yours. The items, prices and customers are invented samples." Add an item to the cart and show the WhatsApp message it creates.
3. **Show the receptionist (30 seconds).** Ask Tari a question a customer would ask, such as opening hours.
4. **Close (10 seconds).** "If this looks useful, I can set it up with your real menu. Can I send you the link to look at later?" Send the link on WhatsApp before you leave.

## Founding-client offer (numbers to test)

These prices are starting numbers to test with real owners. They are not market facts. Change them when you learn more.

- **First 5 founding clients:** $150 setup + $15 per month.
- **Standard (later):** about $300 setup + $25 per month.
- **Live in 2 to 3 weeks** after the menu and details are agreed.
- **Payments are not included in the first offer.** Taking payments is a later add-on.
- Do not quote the price in the first message. Say it only when asked, or at a meeting.

## Answers to common questions

**"How much?"**
"I am starting with 5 founding clients. Right now I am testing $150 to set up and $15 a month. I would rather you look at the sample first, then we see if it fits. Payments are not part of that first version."

**"Is it real?"**
"The sample is real software, but the business, items and customers in it are invented. For you I would set it up with your real menu and it would be live in 2 to 3 weeks. I can show you how it works on my phone now."

**"I'll think about it."**
"Of course. I will send the link so you can look at it in your own time. I will check in once in a few days, then leave you alone."

**"I already use Facebook or a delivery app."**
"That can stay. This is for the customers who already message you on WhatsApp. It keeps your menu and the order message in one place, and an AI receptionist answers the usual questions. It does not replace Facebook or a delivery app."

## Things not to say

- Do not promise more orders, more money or any other result.
- Do not name other clients or quote testimonials. There are none yet.
- Do not say payments work. They are not in the first offer.
