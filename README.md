# Reachy WebMCP

A React developer dashboard proving that a browser app can connect to and safely control a physical Reachy Mini through both visible controls and WebMCP robot tools.

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

## WebMCP robot tools

When the browser exposes `document.modelContext`, the embedded dashboard registers:

- `get_robot_status` — read-only connection status and robot name
- `nod` — gentle nod, returning upright
- `look_left` — turn the head 22° left
- `look_right` — turn the head 22° right
- `wiggle_antennas` — two safe antenna beats
- `center` — return head, body, and antennas to neutral

The dashboard includes a live WebMCP activity feed. Each agent tool call is shown while it executes and when it completes or fails. Manual button presses are intentionally excluded so the feed reflects browser-agent traffic only.

Registrations are removed automatically when the document is unloaded. UI and agent-triggered commands share a movement lock, so physical commands cannot overlap.

The API is feature-detected. In browsers without native WebMCP support, the robot dashboard remains fully functional and reports **Unsupported by this browser**.

## Browser companion: WebMCP discovery

The `extension/` directory contains a discovery-only Chrome side-panel extension. It follows the active HTTP or HTTPS tab, detects `document.modelContext`, reads the tools exposed through `getTools()`, and stays synchronized through the `toolchange` event. It does not execute tools, send page content to a model, record audio, or connect to Reachy.

To try it locally:

1. Open `chrome://extensions` in a Chrome build with WebMCP enabled.
2. Turn on **Developer mode**.
3. Choose **Load unpacked** and select this repository's `extension` directory.
4. Pin **Reachy WebMCP Companion**, open an HTTP or HTTPS page, and click the extension icon to open its side panel.
5. Navigate between a WebMCP-enabled page and a normal page. The panel updates the origin, status, and tool list for the active tab.

The extension requests access to HTTP and HTTPS pages because discovery must run inside the active document. Tool metadata is kept in memory only and is not transmitted off-device.

Run its unit checks with:

```powershell
npm run test:extension
```

## Current scope

- Connection status and robot name
- Nod, look left, look right, antenna wiggle, and center controls
- Six robot WebMCP tools when supported by the browser
- Active-tab WebMCP discovery through the optional Chrome side-panel extension
- No website-content tools, LLM, speech, backend, or event registration yet
