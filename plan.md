# Reachy WebMCP — delivery plan

## Product goal

Prove that a browser application can discover and safely control a physical Reachy
Mini through visible controls and WebMCP tools, while keeping every physical action
explicit, bounded, and observable.

## Completed milestones

### Milestone 01 — robot connection

- Official Reachy Mini 1.8.0 host-shell and WebRTC connection flow.
- Resilient connection status, error normalization, and safe predefined movements.
- Responsive manual controls with shared busy and unavailable states.

### Milestone 02 — WebMCP tools and browser companion

- One read-only status tool and five safe movement tools.
- Shared movement lock for UI and agent-triggered commands.
- Live WebMCP activity feed in the dashboard.
- Chrome side-panel discovery, schema inspection, manual execution, and explicit
  confirmation for tools that are not read-only.

### Milestone 03 — verification foundation

- Node unit coverage for discovery normalization and execution safety.
- Playwright Chromium integration coverage for the extension's service worker,
  content script, active-tab state, side-panel UI, confirmations, execution,
  `toolchange`, and unsupported pages.
- GitHub Actions verification for lint, build, and both extension test layers.
- Repeatable physical-robot acceptance checklist.

## Current gate

Run and record the physical acceptance checklist on a real Lite or Wireless robot.
Milestone 03 is complete only after all required checks pass or each failure has a
tracked issue with reproduction details.

## Candidate Milestone 04

- Generate friendly argument controls from each tool's JSON Schema while preserving
  raw JSON as an advanced mode.
- Add a small local execution history with status, duration, and result summaries.
- Improve recovery guidance for navigation, lost WebRTC sessions, and tools removed
  between discovery and execution.

LLM-driven tool choice, speech, backend services, and arbitrary motor commands remain
out of scope until the physical browser-to-robot path is validated.
