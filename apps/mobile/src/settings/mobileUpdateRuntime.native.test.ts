import { beforeEach, expect, it, vi } from 'vitest'
const updates = vi.hoisted(() => ({
  isEnabled: true, channel: 'alpha', updateId: 'running-update',
  setUpdateRequestHeadersOverride: vi.fn(),
  checkForUpdateAsync: vi.fn(async () => ({ isAvailable: true, isRollBackToEmbedded: false })),
  fetchUpdateAsync: vi.fn(async () => ({ isNew: true, isRollBackToEmbedded: false, manifest: { id: 'downloaded-update' } })),
  reloadAsync: vi.fn(async () => {}),
}))
vi.mock('expo-updates', () => updates)
import { mobileUpdateRuntime } from './mobileUpdateRuntime.native'

beforeEach(() => vi.clearAllMocks())

it('uses the shipped native header-only API and exposes the actual running identity', () => {
  mobileUpdateRuntime.setChannel('stable')
  expect(updates.setUpdateRequestHeadersOverride).toHaveBeenCalledExactlyOnceWith({ 'expo-channel-name': 'stable' })
  expect(mobileUpdateRuntime).toMatchObject({ available: true, channel: 'alpha', updateId: 'running-update' })
  expect(updates.reloadAsync).not.toHaveBeenCalled()
})

it('accepts compatible downloads and rejects rollback or incomplete download readiness', async () => {
  expect(await mobileUpdateRuntime.check()).toBe(true)
  expect(await mobileUpdateRuntime.fetch()).toBe(true)
  updates.checkForUpdateAsync.mockResolvedValueOnce({ isAvailable: false, isRollBackToEmbedded: true })
  await expect(mobileUpdateRuntime.check()).rejects.toThrow('updateRollbackPending')
  updates.fetchUpdateAsync.mockResolvedValueOnce({ isNew: false, isRollBackToEmbedded: false, manifest: { id: '' } })
  expect(await mobileUpdateRuntime.fetch()).toBe(false)
})
