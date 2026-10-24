# Evenfall — browser demo
A quiet, free static demo of a wind-down companion. Fresh source was authored directly in GitHub. This private repository contains the demo, not the separate desktop model runtime.
## Included
- Three curated stories with mood-based closing lines. No AI inference in this demo.
- Read-aloud, pause, resume, and stop using up to three installed English voices reported as local by the browser. Voice availability varies by device.
- Synthesized rain, ocean, and brown noise, volume control, and a 15/30/45/60 minute timer with a final fade. The timer also stops narration.
- Up to ten saved stories in browser local storage.
- Service-worker caching for repeat offline visits after a successful first online load. No external fonts, media downloads, analytics, or API keys.
## Deploy on Render
Create a Static Site, connect only this repository, choose branch main, leave Root Directory empty, use build command true, and set Publish Directory to a single dot (.). No environment variables, backend service, database, or paid instance are needed. Check the final plan and usage limits before deploying.
## Limits
The full desktop Evenfall app uses local Qwen and Piper models. Those models are not included here, so the demo does not claim live AI story generation or the desktop Piper voices. Mobile browsers may suspend background audio. Device narration requires installed local English voices. Closing or clearing the browser may remove the saved shelf and offline copy.
For offline verification, load the page until it says Offline copy ready, disconnect the network, reload, and try a story and soundscape. Service-worker updates activate after older tabs close; they do not force a reload during playback.
