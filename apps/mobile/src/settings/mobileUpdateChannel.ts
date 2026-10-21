import type { MobileUpdateChannel, MobileUpdateDependencies, MobileUpdatePhase, MobileUpdateState } from './mobileUpdateChannel.types'

export function createMobileUpdateChannelController(dependencies: MobileUpdateDependencies) {
  const { runtime } = dependencies
  let { save, prepareRestart } = dependencies
  let state: MobileUpdateState = { selected: 'stable', phase: 'idle', busy: false }
  const listeners = new Set<() => void>()
  const publish = (patch: Partial<MobileUpdateState>) => {
    state = { ...state, ...patch }
    for (const listener of listeners) listener()
  }
  const download = async () => {
    runtime.setChannel(state.selected)
    publish({ phase: 'checking' })
    if (!await runtime.check()) {
      publish({ phase: runtime.channel === state.selected ? 'current' : 'unavailable' })
      return
    }
    publish({ phase: 'downloading' })
    if (!await runtime.fetch()) throw new Error('updateDownloadFailed')
    publish({ phase: 'ready' })
  }
  const run = async (phase: MobileUpdatePhase, action: () => Promise<void>) => {
    if (state.busy || !runtime.available) return
    publish({ busy: true, phase })
    try { await action() }
    catch { publish({ phase: 'failed' }) }
    finally { publish({ busy: false }) }
  }
  return {
    configure: (next: Pick<MobileUpdateDependencies, 'save' | 'prepareRestart'>) => { save = next.save; prepareRestart = next.prepareRestart },
    snapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } },
    initialize: (channel: MobileUpdateChannel) => {
      if (state.busy || !runtime.available) return
      try { runtime.setChannel(channel); publish({ selected: channel }) }
      catch { publish({ phase: 'failed' }) }
    },
    select: (channel: MobileUpdateChannel) => run('checking', async () => {
      if (!await save(channel)) throw new Error('updatePreferenceSaveFailed')
      publish({ selected: channel })
      await download()
    }),
    check: () => run('checking', download),
    restart: async () => {
      if (state.phase !== 'ready') return
      await run('restarting', async () => {
        const resume = await prepareRestart()
        try { await runtime.reload() }
        finally { resume() }
      })
    },
  }
}
