// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { MobileVaultProvider } from './MobileVaultProvider'

const state = vi.hoisted(() => ({ failed: false, busy: false, retry: vi.fn(), catalogRetry: vi.fn() }))
vi.mock('./git/useMobileVaults', () => ({ useMobileVaults: () => ({
  active: { selection: { vaultRootUri: 'file:///owned' }, git: null },
  refreshFailed: state.failed, retryWorkspace: state.retry, busy: state.busy, revision: 0,
  catalog: { pending: false, error: null, retry: state.catalogRetry, vaults: [], localVaults: [] },
  syncHistory: { record: {}, ready: true }, notices: {},
}) }))
vi.mock('../settings/useMobileSettings', () => ({ useMobileSettings: () => ({ open: vi.fn() }) }))
vi.mock('../settings/MobileSettingsSheet', () => ({ MobileSettingsSheet: () => null }))
vi.mock('../components/vaults/MobileVaultNotice', () => ({ MobileVaultNotice: () => null }))
vi.mock('./WorkspaceLoadBoundary', () => ({ WorkspaceLoadBoundary: ({ children }: { children: React.ReactNode }) => children }))
vi.mock('../components/workspace/MobileWorkspaceStartup', () => ({ MobileWorkspaceStartup: ({ children }: { children: React.ReactNode }) => children }))
vi.mock('../components/vaults/MobileWorkspaceLoadFailure', () => ({
  MobileWorkspaceLoadFailure: ({ onRetry }: { onRetry: () => void }) => createElement('button', { type: 'button', onClick: onRetry }, 'Retry'),
}))
let root: ReturnType<typeof createRoot>
let container: HTMLDivElement
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.clearAllMocks()
  state.failed = false
  state.busy = false
  container = document.createElement('div')
  root = createRoot(container)
})
afterEach(async () => {
  await act(async () => root.unmount())
  vi.unstubAllGlobals()
})

it('unmounts stale editable content on preparation failure and retries the active workspace, not catalog restoration', async () => {
  await render()
  expect(container.textContent).toBe('Fresh workspace')
  state.failed = true
  await render()
  expect(container.textContent).toBe('Retry')
  await act(async () => container.querySelector('button')?.click())
  expect(state.retry).toHaveBeenCalledOnce()
  expect(state.catalogRetry).not.toHaveBeenCalled()
  state.busy = true
  await render()
  expect(container.textContent).toBe('Retry')
  state.failed = false
  await render()
  expect(container.textContent).toBe('Fresh workspace')
})

async function render() {
  await act(async () => root.render(createElement(MobileVaultProvider, null, 'Fresh workspace')))
}
