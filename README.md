# Reachy WebMCP

A React developer dashboard proving that a browser app can connect to and safely control a physical Reachy Mini. WebMCP tool registration is intentionally deferred to the next milestone.

## Connection architecture

The app uses the official Reachy Mini 1.8.0 host-shell architecture:

1. `src/dispatch.ts` mounts the Reachy host shell.
2. The host authenticates with Hugging Face and shows available robots.
3. After a robot is selected, the host loads the React dashboard in an iframe.
4. `connectToHost()` establishes the WebRTC session, wakes the robot, and returns the live SDK handle.
5. The dashboard sends safe `gotoTarget()` gestures over the WebRTC data channel.
6. The host owns session teardown; the app returns the robot to neutral before leaving.

## Local setup

Create a local environment file:

```powershell
Copy-Item .env.example .env.local
```

Edit `.env.local` and set:

```text
VITE_HF_TOKEN=hf_your_read_token
VITE_HF_USERNAME=your-hugging-face-handle
```

Create the token at [Hugging Face settings](https://huggingface.co/settings/tokens). Read scope is sufficient. `.env.local` is gitignored; never commit the token.

Then run:

```powershell
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Physical robot test

1. Turn on Reachy Mini and make sure its robot daemon is online and registered to the same Hugging Face account.
2. Open the local app.
3. In the Reachy host screen, select the available robot. This is the host-shell connection action; it starts WebRTC and wakes Reachy.
4. Wait for the dashboard status to show **Connected** and the robot name to appear.
5. Click **Nod** first.
6. Try **Look left**, **Look right**, and **Wiggle antennas**.
7. Click **Center** to return the head, body, and antennas to their neutral pose.
8. Use the host's **End session / Back to apps** control when finished. The leave handler also requests the neutral pose.

If authentication, robot discovery, WebRTC, or the data channel fails, the UI remains available and displays a useful error. Technical details are logged to the browser console.

## Checks

```powershell
npm run build
npm run lint
```

The physical motion check requires a real Reachy Mini and cannot be completed by the automated build.

## Current scope

- Connection status and robot name
- Nod, look left, look right, antenna wiggle, and center controls
- WebMCP placeholder: **Not initialized**
- No WebMCP tools, LLM, speech, backend, or event registration yet

