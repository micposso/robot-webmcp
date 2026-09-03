# Reachy WebMCP — connection milestone

## Goal

Turn the existing Vite + React + TypeScript starter into a small, resilient developer dashboard that connects to a physical Reachy Mini through the official browser SDK and demonstrates a handful of safe movements. WebMCP itself remains an explicit placeholder.

## Technical approach

- Use the SDK 1.8.0 host-shell flow: `mountHost()` for Hugging Face authentication and robot selection, then `connectToHost()` inside the embedded React app for the live WebRTC-backed `ReachyMini` handle.
- Keep SDK lifecycle and error normalization in `src/reachy/reachyClient.ts`.
- Keep safe, predefined gesture sequences in `src/reachy/movements.ts`, using documented degree helpers and the SDK's canonical `safelyReturnToPose()` utility.
- Render connection state and controls through small React components with disabled/busy states so unavailable hardware cannot crash the UI.
- Support local development tokens through `.env.local`; do not commit credentials.
- Verify with TypeScript/Vite build and ESLint. Physical motion remains a user-on-hardware check.

## Scope decisions

- JavaScript/Live Web app, as requested.
- No WebMCP registration, LLM, speech, backend, database, or unrelated authentication.
- No arbitrary motor values; gestures stay well inside documented limits.
- Responsive, touch-friendly dashboard suitable for desktop and phone.

## Open configuration

- Robot variant (Lite or Wireless): not yet supplied; the central host-shell discovery flow supports either when its daemon is online.
- Local authentication: user will provide `VITE_HF_TOKEN` and `VITE_HF_USERNAME`, or configure a local OAuth client ID.
