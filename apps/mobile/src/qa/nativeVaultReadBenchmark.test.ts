import { beforeEach, expect, it, vi } from 'vitest'
import { nativeVaultReadBenchmark } from './nativeVaultReadBenchmark'

const native = vi.hoisted(() => ({ read: vi.fn(), restore: vi.fn(), available: true }))
vi.mock('../workspace/nativeWorkspaceAccess', () => ({
  optionalNativeWorkspaceAccessModule: () => native.available ? { readWorkspaceIndex: native.read } : null,
  restoreNativeWorkspace: native.restore,
}))

const uri = 'file:///owned-disposable-fixture'
const content = '---\ntype: Note\ncustom: preserved\n---\n# Fixture note\n\nPrivate fixture body\n'
const index = {
  directories: [],
  files: [{ absolutePath: `${uri}/note.md`, relativePath: 'note.md', content, createdAt: null, modifiedAt: null, size: content.length }],
}

beforeEach(() => {
  vi.clearAllMocks()
  native.available = true
  native.read.mockResolvedValue(JSON.stringify(index))
  native.restore.mockRejectedValue(new Error('Must not open a saved vault'))
})

it('measures the explicit fixture with the real native preload and snapshot path', async () => {
  const result = await nativeVaultReadBenchmark(uri)
  expect(native.read).toHaveBeenCalledTimes(2)
  expect(native.read.mock.calls.every(([root]) => root === uri)).toBe(true)
  expect(native.restore).not.toHaveBeenCalled()
  expect(result).toMatchObject({ fileCount: 1, noteCount: 1, interactions: { matchedCount: 1 } })
  expect(result?.nativeReadMs).toBeGreaterThanOrEqual(0)
  expect(result?.snapshotMs).toBeGreaterThanOrEqual(0)
  expect(result?.repeatedLoad).toMatchObject({ cacheHit: false, nativeReadMs: expect.any(Number), snapshotMs: expect.any(Number) })
  expect(JSON.stringify(result)).not.toContain('Private fixture body')
  expect(JSON.stringify(result)).not.toContain(uri)
})

it('does not substitute a saved vault when the native index bridge is unavailable', async () => {
  native.available = false
  expect(await nativeVaultReadBenchmark(uri)).toBeNull()
  expect(native.restore).not.toHaveBeenCalled()
})

it('reports index failures rather than silently timing another vault', async () => {
  native.read.mockRejectedValue(new Error('Fixture read failed'))
  await expect(nativeVaultReadBenchmark(uri)).rejects.toThrow('Fixture read failed')
  expect(native.restore).not.toHaveBeenCalled()
})

it('retains an empty fixture as a successful read with no interaction measurements', async () => {
  native.read.mockResolvedValue(JSON.stringify({ directories: [], files: [] }))
  expect(await nativeVaultReadBenchmark(uri)).toMatchObject({ fileCount: 0, noteCount: 0, interactions: null })
})
