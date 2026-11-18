# Walk-in flyer

One A5 page for walk-ins: a headline about taking orders on WhatsApp without voice notes, three benefit lines, a QR code to the WhatsApp ordering demo, the sample-data line and the WhatsApp number. No price.

```
node scripts/flyer/generate.mjs
```

For the generic link and for each `?by=` person in `BY_TAGS` (`src/lib/count-events.ts`), in English and in a Shona draft, it writes:

- `flyer-<lang>-<who>-a5.pdf`, `-a5.png` (preview) and `-a4-2up.pdf` (two A5 side by side on landscape A4, with a cut line);
- `qr/qr-<who>.svg` and `.png`.

Links are `https://lifeline.mftintelligence.com/demos/whatsapp-ordering?ref=flyer`, plus `&by=team-a`, `team-b` or `team-c`. The site address, WhatsApp number and tags are read from the source files.

Output goes to `/projects/sandbox/.kiro/artifacts/flyer` (override with `FLYER_OUT`), outside the repo. It uses Playwright from the video toolchain (`VIDEO_TOOLS`, see `scripts/ads/README.md`).

Checks the run makes: each QR PNG and each rendered flyer PNG decodes (jsQR) to the exact URL, and the QR is at least 30 mm wide (it is 46 mm on A5). QR error correction is Q with a 4-module quiet zone, dark on white.

The Shona wording in `copy.mjs` is a draft. Files carry `DRAFT` in the name until a native speaker has checked every line.
