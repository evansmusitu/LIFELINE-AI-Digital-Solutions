# TikTok ad videos

Regenerates the four vertical ads and their cover images. Nothing is sent to the live site: the built `dist/` is served through Playwright route interception and recorded.

```
npm run build                              # dist/ must exist
node scripts/ads/render.mjs                # all four
node scripts/ads/render.mjs tari-chat      # one (ids: whatsapp-ordering, tari-chat, salon-booking, try-the-demos)
```

Output (default `/projects/sandbox/.kiro/artifacts/tiktok/`, override with `AD_OUT`): `<n>-<name>.mp4` (1080x1920, H.264, AAC, 30 fps) and `<n>-<name>-cover.jpg`.

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
