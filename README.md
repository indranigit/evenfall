# Evenfall — prepare a quieter evening, then unplug
A wind-down companion with browser-local Gemma bedtime stories, device narration and synthesized soundscapes. Built for Hacktoberfest Week 3, Slow and Steady, during October 24, 2026.
**Live app:** https://evenfall.onrender.com/
**Current source:** the integrations branch. The main branch contains an earlier static prototype; it is not the deployed AI application.
## Try the offline demo
1. Open the live app in desktop Chrome with WebGPU support. Keep internet access on for initial setup.
2. Read and accept the Gemma terms if you agree, then download the model. The tested model download was about 537 MB. Wait until the model and offline app copy are ready.
3. Generate and save a story while online to verify setup on your device.
4. Disconnect the network, reload the same deployed URL in the same browser profile, load the cached model, and generate a fresh story.
5. Try the saved shelf, a three-evening story pack, local narration and a rain, ocean or brown-noise soundscape.
Offline availability depends on retaining the browser's app and model caches. A first visit without internet will not work. Use installed local English voices for offline speech; the voice choices differ between devices. WebGPU support, memory and performance vary. Mobile browsers may suspend background audio. Small-model output can be short or repetitive.
## Architecture
- Vite and JavaScript build the browser interface.
- WebLLM 0.2.86 runs Gemma 3 1B, using a quantized MLC model, in a worker on the device.
- A service worker caches the built app. WebLLM manages model caching.
- Browser storage retains the story shelf; JSON export/import supports backups.
- Browser speech synthesis uses installed device voices. Web Audio synthesizes the soundscapes locally.
- Render serves the frontend and an optional Node backend at https://evenfall-api.onrender.com.
- GitHub Actions runs automated validation and browser checks.
## Optional SerpApi nature inspiration
The connected feature searches for nature and garden inspiration for a place. The Render backend calls SerpApi and returns up to five source links and short summaries. Recent results can be read offline after a reload. New searches require internet and a personal backend access token.
The SerpApi provider key remains in the server environment. The browser accepts only the separate EVENFALL_ACCESS_TOKEN, held for the current tab and cleared on reload. Never commit or publish either credential. The public offline story experience needs no backend token.
Search results are currently human-readable inspiration; they are not automatically inserted into the Gemma prompt. This is not a claim of autonomous search or a RAG pipeline.
## Verification
Tested on the deployed Render origin: browser-local Gemma generation with the tab network disabled, offline reload, cached model reload, saved-story persistence, a three-story pack, local soundscapes, device narration and JSON export. The user confirmed narration was audible.
A real authenticated Kyoto search returned five SerpApi sources. The results persisted after an offline reload; repeated queries used the cache and an uncached place correctly required internet.
Automated checks for application commit ee43acef35d27f303ed2404ee9941dadecdb6e8a passed:
https://github.com/indranigit/evenfall/actions/runs/40102258739
Browser/API test doubles are distinguished from the live model and provider checks above. Optional adapters or tests for other services do not establish a working live integration.
## Deployment reference
The current frontend uses branch integrations, build command npm install --no-audit --no-fund && npm run build, and publish directory dist. The Node backend uses branch integrations, build command npm install --omit=dev --no-audit --no-fund and start command npm start. The backend listens on Render's PORT with HOST=0.0.0.0. Keep provider keys in Render environment settings and restrict allowed origins to the frontend. Both deployments were configured on free plans.
## Challenge evidence and attribution
Gemma supplies the open-weight model; WebLLM and MLC provide browser inference. Vite, browser Web Audio and speech synthesis supply the interface and local media support. Render hosts the deployed services; SerpApi supplies optional online search; GitHub Actions provides verification automation.
Prize-category evidence supports Gemma, Render and GitHub Actions (explicitly allowed in the published Best Use of GitHub Copilot category). SerpApi's integration is functional, but its category describes agent search or grounding; the current manual inspiration feature should be represented accurately. ElevenLabs was not activated. No live-use claims are made for unconfigured adapters or unused sponsors.
AI assistance was used for implementation, debugging, testing and documentation. Gemma weights remain subject to Google's Gemma terms; references to open weights do not imply unrestricted licensing.
Challenge: https://dev.to/challenges/hacktoberfest-week3-2026-10-19
Gemma: https://ai.google.dev/gemma
WebLLM: https://github.com/mlc-ai/web-llm
Vite: https://vite.dev/
This README describes the submission build. Any changes made after the challenge submission deadline must be recorded here with their dates and scope.
