import { degToRad, rpyToMatrix } from '@pollen-robotics/reachy-mini-sdk'
import type { ReachyMiniInstance } from '@pollen-robotics/reachy-mini-sdk'

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds))

function moveHead(
  reachy: ReachyMiniInstance,
  roll: number,
  pitch: number,
  yaw: number,
  duration = 0.55,
) {
  const accepted = reachy.gotoTarget({
    head: rpyToMatrix(roll, pitch, yaw).flat(),
    duration,
  })

  if (!accepted) throw new Error('Reachy did not accept the movement command.')
  return wait(duration * 1_000)
}

/** A small, smooth nod that stays well inside the documented ±40° pitch range. */
export async function nod(reachy: ReachyMiniInstance) {
  await moveHead(reachy, 0, 12, 0)
  await moveHead(reachy, 0, -4, 0)
  await moveHead(reachy, 0, 0, 0)
}

/** Turn the head 22°, comfortably inside the documented ±180° yaw range. */
export async function lookLeft(reachy: ReachyMiniInstance) {
  await moveHead(reachy, 0, 0, -22, 0.7)
}

/** Turn the head 22°, comfortably inside the documented ±180° yaw range. */
export async function lookRight(reachy: ReachyMiniInstance) {
  await moveHead(reachy, 0, 0, 22, 0.7)
}

function moveAntennas(
  reachy: ReachyMiniInstance,
  right: number,
  left: number,
  duration = 0.45,
) {
  const accepted = reachy.gotoTarget({
    antennas: [degToRad(right), degToRad(left)],
    duration,
  })

  if (!accepted) throw new Error('Reachy did not accept the antenna command.')
  return wait(duration * 1_000)
}

/** Two small antenna beats, ending at the SDK's neutral outward pose. */
export async function wiggleAntennas(reachy: ReachyMiniInstance) {
  await moveAntennas(reachy, 24, -24)
  await moveAntennas(reachy, -24, 24)
  await moveAntennas(reachy, 20, -20)
  await moveAntennas(reachy, -10, 10, 0.55)
}

/** Canonical SDK neutral pose: identity head, antennas ±10° outward, body at 0°. */
export async function centerHead(reachy: ReachyMiniInstance) {
  const duration = 0.8
  const accepted = reachy.gotoTarget({
    head: rpyToMatrix(0, 0, 0).flat(),
    antennas: [degToRad(-10), degToRad(10)],
    body_yaw: 0,
    duration,
  })

  if (!accepted) throw new Error('Reachy did not accept the center command.')
  await wait(duration * 1_000)
}
