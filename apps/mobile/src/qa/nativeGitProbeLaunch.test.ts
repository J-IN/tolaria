import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const probe = vi.hoisted(() => ({
  launchSearch: '',
  enabled: true,
  initialUrl: vi.fn<() => Promise<string | null>>(),
  run: vi.fn(),
  remove: vi.fn(),
  cleanup: undefined as (() => void) | undefined,
}))

vi.mock('react', () => ({ useEffect: (effect: () => (() => void) | undefined) => { probe.cleanup = effect() } }))
vi.mock('react-native', () => ({
  Linking: { getInitialURL: probe.initialUrl, addEventListener: () => ({ remove: probe.remove }) },
}))
vi.mock('expo', () => ({ requireOptionalNativeModule: () => ({ nativeStorageQAEnabled: probe.enabled }) }))
vi.mock('../native/mobileNativeKeyCommands', () => ({ nativeMobileLaunchSearch: () => probe.launchSearch }))
vi.mock('./runNativeGitProbe', () => ({ runNativeGitProbe: probe.run }))

import { useNativeGitProbe } from './nativeGitProbe.native'

beforeEach(() => {
  vi.stubGlobal('__DEV__', false)
  probe.enabled = true
  probe.launchSearch = ''
  probe.cleanup = undefined
  probe.initialUrl.mockResolvedValue(null)
})

afterEach(() => {
  probe.cleanup?.()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

it('starts an optimized native probe from explicit simulator launch arguments', async () => {
  probe.launchSearch = '?source=fixture&gitProbe=http%3A%2F%2F127.0.0.1%3A43210'
  useNativeGitProbe()
  await vi.waitFor(() => expect(probe.run).toHaveBeenCalledWith('http://127.0.0.1:43210'))
  expect(probe.initialUrl).not.toHaveBeenCalled()
})

it('retains deep-link startup when no explicit launch search is present', async () => {
  probe.initialUrl.mockResolvedValue('tolaria:///?gitProbe=http%3A%2F%2F127.0.0.1%3A43210')
  useNativeGitProbe()
  await vi.waitFor(() => expect(probe.run).toHaveBeenCalledWith('http://127.0.0.1:43210'))
})

it('does not authorize a production binary through simulator arguments', () => {
  probe.enabled = false
  probe.launchSearch = '?gitProbe=http%3A%2F%2F127.0.0.1%3A43210'
  useNativeGitProbe()
  expect(probe.run).not.toHaveBeenCalled()
  expect(probe.initialUrl).not.toHaveBeenCalled()
})

it('rejects non-loopback probe endpoints in simulator arguments', async () => {
  probe.launchSearch = '?gitProbe=https%3A%2F%2Fexample.com%2F'
  useNativeGitProbe()
  await Promise.resolve()
  expect(probe.run).not.toHaveBeenCalled()
})
