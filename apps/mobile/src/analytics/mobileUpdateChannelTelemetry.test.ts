import { expect, it } from 'vitest'
import { mobileTelemetryContext } from './mobileTelemetryContext'

it('attributes promoted Alpha code to the Stable channel actually running', () => {
  expect(mobileTelemetryContext({ platform: 'ios', channel: 'alpha', updates: { isEnabled: true, channel: 'stable' } }))
    .toMatchObject({ release_channel: 'stable', ota_channel: 'stable' })
})

it('falls back to known build metadata without leaking arbitrary override values', () => {
  const context = mobileTelemetryContext({ platform: 'ios', channel: 'stable', updates: { isEnabled: true, channel: 'private-value' } })
  expect(context.release_channel).toBe('stable')
  expect(JSON.stringify(context)).not.toContain('private-value')
})
