// @vitest-environment jsdom
import { act, createElement, useEffect, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { MobileWorkspaceStartup } from './MobileWorkspaceStartup'
import type { WorkspaceSnapshotPreview } from '../../workspace/workspaceSnapshotPreview'

const device = vi.hoisted(() => ({ tablet: false, width: 390, height: 844 }))
const panels = vi.hoisted(() => ({ sidebar: vi.fn(), list: vi.fn() }))
vi.mock('react-native', () => ({
  View: ({ children, testID, pointerEvents, accessibilityElementsHidden, accessibilityState }: {
    children?: ReactNode; testID?: string; pointerEvents?: string; accessibilityElementsHidden?: boolean; accessibilityState?: { busy: boolean }
  }) => createElement('div', { 'data-testid': testID, 'data-pointer': pointerEvents, 'data-hidden': accessibilityElementsHidden,
    'aria-busy': accessibilityState?.busy }, children),
  ActivityIndicator: () => createElement('span', null, 'spinner'),
  StyleSheet: { create: (styles: object) => styles, absoluteFillObject: {}, hairlineWidth: 1 },
  Dimensions: { get: () => ({ width: device.width, height: device.height }) },
  Platform: { OS: 'ios', isPad: true },
  useWindowDimensions: () => ({ width: device.width, height: device.height }),
}))
vi.mock('../../ui/useMobileDeviceLayout', () => ({ useMobileDeviceLayout: () => device.tablet ? 'tablet' : 'phone' }))
vi.mock('../../ui/theme/useMobileTheme', async () => {
  const { mobileMetrics } = await import('../../ui/mobileMetrics')
  const { mobilePalettes } = await import('../../ui/theme/mobilePalette')
  return { useMobileStyles: (factory: (colors: object, metrics: object) => object) => factory(mobilePalettes.light, mobileMetrics[1.2]) }
})
vi.mock('../../ui/MobilePanelSafeArea', () => ({ MobilePanelSafeArea: ({ children }: { children: ReactNode }) => children }))
vi.mock('../ui/text', () => ({ Text: ({ children }: { children: ReactNode }) => createElement('span', null, children) }))
vi.mock('./MobileWorkspaceSidebar', () => ({ MobileWorkspaceSidebar: panels.sidebar }))
vi.mock('./MobileNoteListPanel', () => ({ MobileNoteListPanel: panels.list }))
vi.mock('../../screens/PhoneWorkspaceChrome', () => ({ PhoneCommandPaletteButton: () => null }))
vi.mock('../../qa/nativeStartupPresentation', () => ({ recordNativeStartupPreviewLayout: vi.fn() }))

const preview: WorkspaceSnapshotPreview = { kind: 'provisional', notes: [], allNotes: [], typeDefinitions: {},
  sidebarSections: [], noteListSubtitle: '', source: { kind: 'localVault', label: 'Cached QA', totalNotes: 9000, visibleNotes: 128 } }
const roots: ReturnType<typeof createRoot>[] = []
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  device.tablet = false
  device.width = 390
  device.height = 844
  panels.sidebar.mockReset().mockReturnValue(null)
  panels.list.mockReset().mockReturnValue(null)
})
afterEach(async () => {
  for (const root of roots.splice(0)) await act(async () => root.unmount())
  vi.unstubAllGlobals()
})

it('renders source-free cached panels as busy and inert without mounting the editable workspace', async () => {
  const render = createHarness()
  await render.update(preview, true, false)
  expect(render.node.textContent).not.toContain('editable child')
  expect(render.node.querySelector('[data-testid="workspace-startup-preview"]')).not.toBeNull()
  expect(render.node.querySelector('[data-testid="workspace-startup-cached-panels"]')?.getAttribute('data-pointer')).toBe('none')
  expect(render.node.querySelector('[data-testid="workspace-startup-cached-panels"]')?.getAttribute('data-hidden')).toBe('true')
  expect(panels.list).toHaveBeenCalledWith(expect.objectContaining({ fullWidth: true, compact: true, showCreateAction: false,
    notes: preview.notes, toolbarTrailing: expect.anything(), leading: expect.anything() }), undefined)
  expect(panels.sidebar).not.toHaveBeenCalled()
})

it('uses the normal tablet panel components when the viewport allows its sidebar', async () => {
  device.tablet = true
  device.width = 1366
  device.height = 1024
  const render = createHarness()
  await render.update(preview, true, false)
  expect(panels.sidebar).toHaveBeenCalledWith(expect.objectContaining({ sections: preview.sidebarSections, title: 'Cached QA' }), undefined)
  expect(panels.list).toHaveBeenCalledWith(expect.objectContaining({ fullWidth: false }), undefined)
})

it('keeps the sidebar hidden in a narrow iPad window just like the real workspace', async () => {
  device.tablet = true
  device.width = 834
  const render = createHarness()
  await render.update(preview, true, false)
  expect(panels.sidebar).not.toHaveBeenCalled()
  expect(panels.list).toHaveBeenCalled()
})

it('retains the initial primary-list property display and title rather than inventing new row spacing', async () => {
  const configured = { ...preview, noteListPropertyOverrides: { inbox: ['Status'] },
    sidebarSections: [{ id: 'primary', items: [{ id: 'inbox', label: 'Inbox', icon: 'inbox' as const, active: true }] }] }
  const render = createHarness()
  await render.update(configured, true, false)
  expect(panels.list).toHaveBeenCalledWith(expect.objectContaining({ title: 'Inbox', displayPropertyKeys: ['Status'] }), undefined)
})

it.each([
  { cached: null, pending: true, active: false },
  { cached: preview, pending: false, active: false },
  { cached: preview, pending: true, active: true },
])('never substitutes cached presentation outside initial loading: %j', async ({ cached, pending, active }) => {
  const render = createHarness()
  await render.update(cached, pending, active)
  expect(render.node.textContent).toBe('editable child')
  expect(panels.list).not.toHaveBeenCalled()
})

it('does not remount an existing editor when a late preview or pending-state update arrives', async () => {
  let mounts = 0
  function Editor() { useEffect(() => { mounts++ }, []); return createElement('span', null, 'draft') }
  const render = createHarness(createElement(Editor))
  await render.update(null, false, true)
  await render.update(preview, true, true)
  await render.update(null, false, true)
  expect(mounts).toBe(1)
  expect(render.node.textContent).toBe('draft')
})

function createHarness(children: ReactNode = 'editable child') {
  const node = document.createElement('div')
  const root = createRoot(node)
  roots.push(root)
  return { node, update: (preview: WorkspaceSnapshotPreview | null, pending: boolean, hasActiveWorkspace: boolean) =>
    act(async () => root.render(createElement(MobileWorkspaceStartup, { preview, pending, hasActiveWorkspace, children }))) }
}
