# Milestone 03 — physical acceptance

Use this checklist with a real Reachy Mini before declaring the browser-to-robot
path production-ready. Run it in a clear workspace where the robot can move safely.

## Test record

- Date:
- Tester:
- Commit:
- Chrome version:
- Reachy Mini variant and robot name:
- Robot daemon / firmware version:
- Host operating system:

## Preparation

- [ ] `npm run lint`, `npm run build`, and `npm run test:extension` pass.
- [ ] `.env.local` contains the correct Hugging Face account values and is not staged.
- [ ] The robot is stable, powered, unobstructed, and registered to that account.
- [ ] The unpacked `extension/` directory is loaded in a WebMCP-enabled Chrome build.
- [ ] The extension side panel is open and the browser console is available.

## Connection and discovery

- [ ] The host shell authenticates and lists the expected robot.
- [ ] Selecting the robot wakes it and opens the embedded dashboard.
- [ ] The dashboard reaches **Connected** and displays the correct robot name.
- [ ] The dashboard reports WebMCP **Ready** with six registered tools.
- [ ] The side panel reports WebMCP available and lists the same six tools.
- [ ] `get_robot_status` runs without confirmation and returns the connected robot.

## Safe movement

Pause after every movement and stop immediately if motion is unexpected.

- [ ] **Nod** completes gently and returns the head upright.
- [ ] **Look left** turns approximately 22 degrees to the robot's left.
- [ ] **Look right** turns approximately 22 degrees to the robot's right.
- [ ] **Wiggle antennas** completes two beats and returns both antennas to neutral.
- [ ] **Center** returns the head, body, and antennas to their neutral pose.
- [ ] Each action tool requires confirmation in the side panel before it can run.
- [ ] Each side-panel action appears once in the dashboard WebMCP activity feed.

## Concurrency and failure recovery

- [ ] Starting a second manual or WebMCP movement while one is active does not overlap
  physical commands.
- [ ] Navigating or reloading during a tool request produces a useful interruption
  error and does not leave the robot moving.
- [ ] Temporarily losing the robot connection disables movement and surfaces a useful
  error without crashing the dashboard.
- [ ] Reconnecting restores status discovery and safe movement controls.
- [ ] Switching the active tab updates or clears the companion's discovered tools.

## Teardown

- [ ] **Center** succeeds immediately before ending the session.
- [ ] **End session / Back to apps** closes the WebRTC session cleanly.
- [ ] Leaving or reloading the embedded dashboard removes its WebMCP registrations.
- [ ] The robot remains neutral after the page and side panel are closed.

## Result

- [ ] Pass — every required check above succeeded.
- [ ] Conditional pass — no unsafe behavior; remaining failures are documented below.
- [ ] Fail — unsafe motion, overlapping commands, or teardown failure occurred.

Notes and issue links:

```text

```
