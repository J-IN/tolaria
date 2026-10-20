import { preloadNativeWorkspace } from './preloadNativeWorkspace'
import { expoWorkspaceFileSystem } from './expoWorkspaceFileSystem'
import type { NativeWorkspaceSelection } from './nativeWorkspacePicker'
import type { MobileVaultConfig } from './mobileWorkspaceModel'
import { buildCooperativeWorkspaceSnapshot } from './cooperativeWorkspaceSnapshot'
import { rememberPreparedWorkspaceSnapshot } from './preparedWorkspaceSnapshot'

type PreparationDependencies = {
  preload: (selection: NativeWorkspaceSelection | null) => Promise<NativeWorkspaceSelection | null>
  readVaultConfig: (root: string) => MobileVaultConfig | null
}

/** Prepare before publishing a vault selection, while the existing save barrier is active. */
export async function prepareNativeWorkspace(
  selection: NativeWorkspaceSelection | null,
  signal?: AbortSignal,
  dependencies: PreparationDependencies = {
    preload: preloadNativeWorkspace,
    readVaultConfig: root => expoWorkspaceFileSystem.readVaultConfig?.(root) ?? null,
  },
) {
  const selected = await dependencies.preload(selection)
  if (!selected?.index) return selected
  const { index, vaultAlias, vaultLabel, vaultRootUri } = selected
  const options = { files: index.files, folderPaths: index.directories, vaultAlias, vaultLabel,
    vaultPath: vaultRootUri, vaultConfig: dependencies.readVaultConfig(vaultRootUri) }
  const snapshot = await buildCooperativeWorkspaceSnapshot(options, signal)
  rememberPreparedWorkspaceSnapshot(index, options, snapshot)
  return selected
}
