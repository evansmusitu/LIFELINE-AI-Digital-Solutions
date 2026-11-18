# TikTok ad videos

Regenerates the four vertical ads and their cover images. Nothing is sent to the live site: the built `dist/` is served through Playwright route interception and recorded.

```
npm run build                              # dist/ must exist
node scripts/ads/render.mjs                # all four
node scripts/ads/render.mjs tari-chat      # one (ids: whatsapp-ordering, tari-chat, salon-booking, try-the-demos)
node scripts/ads/render.mjs --lang=sn      # Shona captions-only versions (en, sn or all; default en)
```

Output (default `/projects/sandbox/.kiro/artifacts/tiktok/`, override with `AD_OUT`): `<n>-<name>.mp4` (1080x1920, H.264, AAC, 30 fps) and `<n>-<name>-cover.jpg`. Shona versions add `-sn` (`<n>-<name>-sn.mp4`, `<n>-<name>-sn-cover.jpg`).

## What it needs (kept outside the repo)

Default location `/projects/sandbox/.scratch/video`, override with `VIDEO_TOOLS`.

- `pw/` with Playwright installed and its browsers in `pw/browsers`.
- `tools/node_modules/ffmpeg-static` (libx264 and aac).
- Piper TTS (`pylib-piper`, MIT) and the `voices/en_US-ljspeech-medium.onnx` voice (public domain data). The voice is synthetic.
- `synth-music.py`, an original CC0 music bed.

## Files

- `scenarios.mjs`: the four ads. Edit the spoken lines, captions (`**word**` is highlighted) and taps here.
- `render.mjs`: recording, caption and end-card images, voice, music and the ffmpeg encode.

## Rules built into the content

No price, no city, no real-client claims, no hosting or code-platform names. Sample-business city names are removed from the page text while recording. The Tari chat reply is a scripted stand-in, no video call is ever started, and the chat is labelled as AI on screen.

Currency amounts (`$2.80`, `US$ 22`, `USD 15`, `ZiG 40`, and a `$` split from its number across text nodes) are removed from page text before each page is revealed, and again on every DOM change, so sample prices never reach a frame or a cover. Piper speech is generated for the whole video before recording starts, so a cold run has the same timing as a cached one.

## Shona

`COPY.sn` in `scenarios.mjs` holds the Shona captions. The Shona videos have no voice-over: no free, commercially usable Shona TTS was found (Meta MMS-TTS `sna` is CC-BY-NC, non-commercial). They use the CC0 music bed, a little louder, and the same pacing as the English versions. Every Shona string is a draft that needs review by a native speaker before posting.
