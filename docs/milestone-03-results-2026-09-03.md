# Milestone 03 acceptance result — 2026-09-03

## Test environment

- Result: Conditional pass
- Commit at start of recorded run: `8303771`
- Host OS: Windows
- Browser: Chrome 152.0.7977.66
- Robot: Reachy Mini Lite, `reachy_mini`, USB `#c776b`
- Reachy daemon: `1.8.0`, globally installed with `uv`
- JavaScript SDK: `1.8.0`
- Hugging Face account: authenticated; credential values were not recorded

## Passed

- Global daemon started and the local API became available.
- Host shell authenticated and discovered the expected USB robot.
- WebRTC session connected and woke Reachy successfully.
- Dashboard reported **Connected**, displayed **Reachy Mini**, and registered six
  WebMCP tools.
- Companion switched from nine tools on The Robot Age to six tools on the active
  Reachy page.
- `get_robot_status` returned `connected: true` and appeared as completed in the
  dashboard activity feed.
- `nod`, `look_left`, `look_right`, `wiggle_antennas`, and `center` completed through
  the companion and produced the expected physical movements.
- Every observed WebMCP movement appeared as completed in the activity feed.
- Shared movement locking rejected a concurrent `center` request in 0 ms while
  `wiggleAntennas` was active. No overlapping physical motion was observed.
- A subsequent `center` completed successfully and returned Reachy to neutral.
- **End session** put Reachy to sleep and returned the host to the robot picker.
- Reconnection after a development hot reload succeeded.

## Issues found and fixed during the run

- Robot label incorrectly showed **No robot selected** because the embedded host flow
  does not populate `preselectedRobotId`; the UI now falls back to `handle.hostName`.
- The companion service worker rejected Chrome's real side-panel sender shape; sender
  validation now supports both the side-panel context and the browser-test tab.
- Movement callbacks destructured a missing second WebMCP callback argument before
  entering the function body; cancellation options are now treated as optional.
- A missing service-worker response now produces actionable extension reload guidance.

## Still to verify

- Attempt an action tool without selecting the companion confirmation checkbox and
  confirm it is blocked locally.
- Navigate or reload during an in-flight WebMCP movement and confirm interruption is
  reported without leaving Reachy away from neutral.
- Interrupt the daemon during a live session and confirm controls disable, the error is
  useful, and reconnection succeeds.
- Confirm the companion removes the six tools after session teardown.

No unsafe motion, overlapping commands, or teardown failure was observed.
