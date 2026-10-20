// @vitest-environment jsdom
import { act, createElement, type ComponentProps, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { MobileGitControls } from './MobileGitControls'

type Props = { children?: ReactNode; testID?: string; label?: string; onPress?: () => void; disabled?: boolean }
const preferences = vi.hoisted(() => ({ settings: { autoGit: true } }))
function Surface(props: Props) {
  return createElement('div', { 'data-testid': props.testID }, props.children)
}
function Control(props: Props) {
  return createElement('button', { type: 'button', 'data-testid': props.testID,
    onClick: props.onPress, disabled: props.disabled }, props.label)
}
vi.mock('react-native', () => ({ View: Surface }))
vi.mock('phosphor-react-native', () => ({ ArrowClockwise: () => null, GitCommit: () => null }))
vi.mock('../../settings/useMobileSettings', () => ({ useMobileSettings: () => preferences }))
vi.mock('../../ui/theme/useMobileTheme', () => ({ useMobileStyles: () => ({}), useMobileColors: () => ({}) }))
vi.mock('../../ui/MobileButton', () => ({ MobileButton: Control }))
vi.mock('../../ui/MobileTextInput', () => ({ MobileTextInput: (props: Props) => createElement('input', { 'data-testid': props.testID }) }))
vi.mock('../ui/text', () => ({ Text: Surface }))

let root: ReturnType<typeof createRoot>
let host: HTMLDivElement
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  host = document.createElement('div')
  root = createRoot(host)
})
afterEach(async () => { await act(async () => root.unmount()); vi.unstubAllGlobals() })

it.each([true, false])('shows manual commit controls only when AutoGit is disabled (%s)', async autoGit => {
  preferences.settings.autoGit = autoGit
  const sync = vi.fn(async () => {})
  const manager: ComponentProps<typeof MobileGitControls>['manager'] = {
    active: { selection: null, git: { id: 'owned', label: 'Owned', repositoryUrl: 'https://github.com/fixture/owned.git' } },
    busy: false, status: 'pending', lastCommitId: null, sync, commit: vi.fn(async () => {}),
  }
  await act(async () => root.render(createElement(MobileGitControls, { manager })))
  expect(Boolean(host.querySelector('[data-testid="git-commit-message"]'))).toBe(!autoGit)
  expect(Boolean(host.querySelector('[data-testid="git-commit-local"]'))).toBe(!autoGit)
  expect(Boolean(host.querySelector('[data-testid="git-commit-sync"]'))).toBe(!autoGit)
  await act(async () => host.querySelector<HTMLButtonElement>('[data-testid="git-sync-now"]')?.click())
  expect(sync).toHaveBeenCalledExactlyOnceWith()
})
