import { optionalNativeWorkspaceAccessModule, type NativeWorkspaceAccessModule } from './nativeWorkspaceAccess'
import { withSavedWorkspace } from './git/workspaceWriteQueue'

export function isWorkspaceLinked(root: string | undefined, native = optionalNativeWorkspaceAccessModule()) {
  if (!root) return false
  return native?.isWorkspaceLinked?.(root) ?? false
}

export async function syncLinkedWorkspace(root: string, native: NativeWorkspaceAccessModule | null = optionalNativeWorkspaceAccessModule()) {
  const sync = native?.syncLinkedWorkspace
  if (!sync) throw new Error('linkedFolderUnavailable')
  try {
    return await withSavedWorkspace(root, () => sync(root))
  } catch {
    throw new Error('linkedFolderUnavailable')
  }
}
