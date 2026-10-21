import * as Updates from 'expo-updates'
import type { MobileUpdateRuntime } from './mobileUpdateChannel.types'

export const mobileUpdateRuntime: MobileUpdateRuntime = {
  available: Updates.isEnabled && (Updates.channel === 'alpha' || Updates.channel === 'stable'),
  channel: Updates.channel,
  updateId: Updates.updateId,
  setChannel: channel => Updates.setUpdateRequestHeadersOverride({ 'expo-channel-name': channel }),
  check: async () => {
    const update = await Updates.checkForUpdateAsync()
    if (update.isRollBackToEmbedded) throw new Error('updateRollbackPending')
    return update.isAvailable
  },
  fetch: async () => {
    const update = await Updates.fetchUpdateAsync()
    return update.isNew && !update.isRollBackToEmbedded && Boolean(update.manifest.id)
  },
  reload: () => Updates.reloadAsync(),
}
