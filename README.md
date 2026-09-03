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

## Start Reachy Mini from a terminal

This project pins `@pollen-robotics/reachy-mini-sdk` to `1.8.0`. For a
**Reachy Mini Lite**, run the globally installed Python daemon on the computer
connected to the robot by USB. Keep the daemon terminal open while using the web
app. The robot also needs its external power supply; USB alone does not power the
motors. The global daemon should use the matching `1.8.0` release.

### macOS Terminal — Reachy Mini Lite

The daemon is installed globally, so it can run from any directory:

```bash
reachy-mini-daemon
```

If the executable is installed but is not on `PATH`, use its Python module:

```bash
python3 -m reachy_mini.daemon.app.main
```

In a second Terminal window, start this dashboard:

```bash
npm install
npm run dev
```

### Windows PowerShell — Reachy Mini Lite

The daemon is installed globally, so it can run from any directory. PowerShell
can first show which executable it will use, then start it:

```powershell
Get-Command reachy-mini-daemon
reachy-mini-daemon
```

If PowerShell reports that the command is not recognized, bypass the missing
`PATH` entry and start the globally installed package through Python:

```powershell
py -3.12 -m reachy_mini.daemon.app.main
```

In a second PowerShell window, start this dashboard from the repository root:

```powershell
npm install
npm run dev
```

For either operating system, verify the Lite daemon at
[http://localhost:8000/docs](http://localhost:8000/docs). Then open the dashboard
at [http://localhost:5173](http://localhost:5173).

### Reachy Mini Wireless

Do not start a second daemon on the Mac or Windows computer. Power on the Wireless
robot and connect the computer to the same network; its daemon starts on the
robot. Verify it at
[http://reachy-mini.local:8000/docs](http://reachy-mini.local:8000/docs), then run
`npm run dev` in this repository and open
[http://localhost:5173](http://localhost:5173).

If the daemon command is not found or the robot is not detected, review the
official [Reachy Mini quickstart](https://github.com/pollen-robotics/reachy_mini/blob/main/docs/source/SDK/quickstart.md)
and [troubleshooting guide](https://github.com/pollen-robotics/reachy_mini/blob/main/docs/source/troubleshooting.md).

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

The `extension/` directory contains a Chrome side-panel extension. It follows the active HTTP or HTTPS tab, detects `document.modelContext`, reads the tools exposed through `getTools()`, and stays synchronized through the `toolchange` event. A user can select a tool, inspect its input schema, enter JSON arguments, and execute it manually in the active page. Tools not marked read-only require a separate confirmation checkbox before execution.

The companion does not choose tools automatically, send page content to a model, record audio, or connect to Reachy. Tool results are rendered as text, never as executable HTML.

To try it locally:

1. Open `chrome://extensions` in a Chrome build with WebMCP enabled.
2. Turn on **Developer mode**.
3. Choose **Load unpacked** and select this repository's `extension` directory.
4. Pin **Reachy WebMCP Companion**, open an HTTP or HTTPS page, and click the extension icon to open its side panel.
5. Navigate between a WebMCP-enabled page and a normal page. The panel updates the origin, status, and tool list for the active tab.
6. Select **Try tool**, enter arguments matching the displayed JSON schema, and run it. Confirm the warning first when testing a tool that may change website data.

The extension requests access to HTTP and HTTPS pages because discovery must run inside the active document. Tool metadata is kept in memory only and is not transmitted off-device.

Run its unit checks with:

```powershell
npm run test:extension
```

The extension suite includes Node unit tests and a browser-level test that loads a
test-only copy of the unpacked extension in Playwright Chromium. Install that browser
once on a development machine with:

```powershell
npx playwright install chromium
```

The browser test covers discovery, active-page synchronization, read-only execution,
confirmation for action tools, dynamic `toolchange` registration, and unsupported
pages. Its mock WebMCP context never connects to or moves a physical robot.

For the real robot milestone, follow the repeatable
[physical acceptance checklist](docs/milestone-03-acceptance.md).

## Current scope

- Connection status and robot name
- Nod, look left, look right, antenna wiggle, and center controls
- Six robot WebMCP tools when supported by the browser
- Active-tab WebMCP discovery through the optional Chrome side-panel extension
- No website-content tools, LLM, speech, backend, or event registration yet

## Automated verification

GitHub Actions runs lint, the production build, Node extension tests, and the
Playwright Chromium extension test for every push and pull request.
