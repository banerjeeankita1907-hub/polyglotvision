# PolyglotVision

A browser-based video-call prototype that explores live speech captions and translated speech between two peers.

## What it currently does

- Creates a peer connection with PeerJS and exchanges audio/video streams.
- Uses the browser Web Speech API for speech recognition (where supported).
- Sends short transcript snippets to a Next.js API route, which requests translations from the MyMemory service.
- Reads translated text with the browser's speech synthesis API.
- Draws an **audio-amplitude-reactive mouth illustration** on a canvas.

The canvas effect is a visual experiment based on audio volume. It is **not** a neural talking-head model, phoneme-aligned lip-sync, or a measure of what the remote speaker's lips are doing. The translation path currently uses MyMemory, not a self-hosted neural translation model.

## Stack

- Next.js and React
- PeerJS / WebRTC
- Browser Web Speech API and SpeechSynthesis
- MyMemory translation API
- Tailwind CSS

## Run locally

Requires Node.js 18+ and npm.

```bash
git clone https://github.com/banerjeeankita1907-hub/polyglotvision.git
cd polyglotvision
npm install
npm test
npm run check
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Browser and network requirements

- Camera and microphone access must be granted by the browser and is generally available only on HTTPS or localhost.
- Speech recognition availability and language coverage vary by browser.
- PeerJS uses a public signaling service by default; production use should configure a trusted signaling deployment and appropriate TURN servers.
- Translation requests leave the browser through this app's API route and are processed by MyMemory. Do not submit confidential or sensitive speech.
- A successful peer connection depends on network and NAT conditions; this prototype does not guarantee connectivity in every environment.

## API hardening

The translation endpoint accepts POST requests only, validates a small language allowlist, trims and limits input length, uses URL-safe query construction, times out upstream requests, and returns stable error messages without exposing provider internals.

## Tests

The translation input contract and provider URL builder are covered by Node's built-in test runner:

```bash
npm test
npm run check
```

## Limitations and next steps

This is an experimental prototype, not a production communication service. Before production deployment, add authentication and abuse controls, review peer/signaling infrastructure, evaluate translation quality by language pair, provide consent and privacy disclosures, and test browser-specific speech and media behavior.

## License

No open-source license is currently declared. All rights are reserved by default until a license is added.
