import { useMemo, type ReactNode } from 'react'
import { MobileWorkspaceLoadFailure } from '../components/vaults/MobileWorkspaceLoadFailure'
import { NativeWorkspaceContext } from './NativeWorkspaceContext'
import { MobileVaultControlsContext, MobileVaultPickerContext } from './MobileVaultContext'
import { WorkspaceSyncEditorsContext } from './workspaceSyncEditors'
import { useMobileVaults } from './git/useMobileVaults'
import { WorkspaceLoadBoundary } from './WorkspaceLoadBoundary'
import { MobileSettingsSheet } from '../settings/MobileSettingsSheet'
import { MobileVaultNotice } from '../components/vaults/MobileVaultNotice'
import { MobileWorkspaceStartup } from '../components/workspace/MobileWorkspaceStartup'
import { useMobileSettings } from '../settings/useMobileSettings'

export function MobileVaultProvider({ children }: { children: ReactNode }) {
  const manager = useMobileVaults()
  const preferences = useMobileSettings()
  const { active, open, restorePending, revision, editors } = manager
  const restoreError = !active.selection && !manager.catalog.pending ? manager.catalog.error : null
  // Sync progress must not make the workspace re-index a large vault.
  const workspace = useMemo(() => ({ selection: active.selection, open, restorePending }), [active.selection, open, restorePending])
  const controls = {
    rootUri: active.selection?.vaultRootUri,
    git: Boolean(active.git),
    linked: manager.linked,
    busy: manager.busy,
    status: manager.status,
    lastSuccessAt: manager.syncHistory.record.lastSuccessAt,
    lastFailureAt: manager.syncHistory.record.lastFailureAt,
    phase: manager.phase,
    historyAvailable: manager.syncHistory.ready && !manager.syncHistory.failed,
    open,
    sync: manager.sync,
  }
  const picker = vaultPicker(manager, preferences.open)
  return <MobileVaultPickerContext.Provider value={picker}><WorkspaceSyncEditorsContext.Provider value={editors}>
    <NativeWorkspaceContext.Provider value={workspace}>
      <MobileVaultControlsContext.Provider value={controls}>
        <WorkspaceLoadBoundary key={revision} fallback={<MobileWorkspaceLoadFailure onManage={open} />}>
          {restoreError ? <MobileWorkspaceLoadFailure onManage={open} onRetry={manager.catalog.retry} reason={restoreError} /> :
            <MobileWorkspaceStartup preview={manager.catalog.preview} pending={restorePending} hasActiveWorkspace={Boolean(active.selection)}>
              {children}
            </MobileWorkspaceStartup>}
        </WorkspaceLoadBoundary>
        <MobileSettingsSheet manager={manager} />
        {!manager.opened && manager.notices.current && <MobileVaultNotice notice={manager.notices.current}
          dismiss={manager.notices.dismiss} onManage={open} />}
      </MobileVaultControlsContext.Provider>
    </NativeWorkspaceContext.Provider>
  </WorkspaceSyncEditorsContext.Provider></MobileVaultPickerContext.Provider>
}

function vaultPicker(manager: ReturnType<typeof useMobileVaults>, manage: () => void) {
  const { active, restorePending } = manager
  return {
    disabled: manager.busy || restorePending,
    manage,
    choices: [
      ...manager.catalog.localVaults.map(vault => ({ id: vault.id, label: vault.label,
        selected: active.selection?.vaultAlias === vault.id, select: () => manager.selectLocal(vault, false) })),
      ...manager.catalog.vaults.map(vault => ({ id: vault.id, label: vault.label,
        selected: active.git?.id === vault.id, select: () => manager.select(vault, false) })),
    ],
  }
}
