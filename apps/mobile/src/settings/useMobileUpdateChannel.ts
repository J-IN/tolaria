import { useEffect, useState, useSyncExternalStore } from 'react'
import type { useMobileVaults } from '../workspace/git/useMobileVaults'
import { useMobileSettings } from './useMobileSettings'
import { createMobileUpdateChannelController } from './mobileUpdateChannel'
import { mobileUpdateRuntime } from './mobileUpdateRuntime'
import { prepareMobileUpdateRestart } from './prepareMobileUpdateRestart'
import { useMobileAnalytics } from '../analytics/useMobileAnalytics'
import type { MobileUpdateChannel } from './mobileUpdateChannel.types'

export function useMobileUpdateChannel(manager: ReturnType<typeof useMobileVaults>) {
  const preferences = useMobileSettings()
  const analytics = useMobileAnalytics()
  const [controller] = useState(() => createMobileUpdateChannelController({
    runtime: mobileUpdateRuntime,
    save: channel => preferences.update({ updateChannel: channel }),
    prepareRestart: () => prepareRestart(manager),
  }))
  useEffect(() => {
    controller.configure({ save: channel => preferences.update({ updateChannel: channel }), prepareRestart: () => prepareRestart(manager) })
  }, [controller, manager, preferences])
  const state = useSyncExternalStore(controller.subscribe, controller.snapshot, controller.snapshot)
  useEffect(() => {
    if (preferences.ready) controller.initialize(preferences.settings.updateChannel)
  }, [controller, preferences.ready, preferences.settings.updateChannel])
  const select = async (channel: MobileUpdateChannel) => {
    await controller.select(channel)
    analytics.capture({ name: 'mobile_update_channel_selected', channel, outcome: controller.snapshot().phase })
  }
  return { ...state, runtime: mobileUpdateRuntime, select, check: controller.check, restart: controller.restart,
    disabled: !preferences.ready || preferences.saving || manager.busy || manager.restorePending || state.busy || !mobileUpdateRuntime.available }
}

function prepareRestart(manager: ReturnType<typeof useMobileVaults>) {
  return prepareMobileUpdateRestart({ editors: manager.editors, rootUri: manager.active.selection?.vaultRootUri, busy: manager.busy || manager.restorePending })
}
