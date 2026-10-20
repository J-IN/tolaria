import type { createMobileAutoGit } from './git/mobileAutoGit'
import { withWorkspaceBackgroundSync } from './workspaceBackgroundSync'

type Scheduler = ReturnType<typeof createMobileAutoGit>
type Readiness = () => { enabled: boolean; blocked: boolean }

export function createWorkspaceSyncLifecycle(
  scheduler: Scheduler, readiness: Readiness, initialState: string,
  background = withWorkspaceBackgroundSync,
) {
  let current = initialState
  let pending: Promise<unknown> | undefined
  function refresh() { scheduler.update({ ...readiness(), foreground: current === 'active' }) }
  function change(next: string) {
    const previous = current
    current = next
    refresh()
    if (next === 'active' && previous !== 'active') scheduler.dirty()
    if (!leavingForeground(previous, next) || !readiness().enabled || pending) return
    pending = background(signal => scheduler.flush(signal))
      .catch(() => { /* Preserve pending work for the next foreground attempt. */ })
      .finally(() => { pending = undefined })
  }
  refresh()
  return { change, refresh, poll: () => { if (current === 'active') scheduler.dirty() } }
}

function leavingForeground(previous: string, next: string) {
  return previous === 'active' && next !== 'active'
}
