import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { createMobilePreparedEdits } from '../workspace/mobilePreparedEdits'
import { isMobileNoteHydration } from '../workspace/mobileNoteRead'
import { useWorkspaceSyncEditor, WorkspaceSyncEditorsContext } from '../workspace/workspaceSyncEditors'
import type { MobileWorkspaceEdit, MobileWorkspaceEditResult } from '../workspace/mobileWorkspaceEditing'
import type { MobileWorkspaceSnapshot } from '../workspace/mobileWorkspaceModel'
import type { ReadOnlyWorkspaceRepository, ReadOnlyWorkspaceRequest } from '../workspace/readOnlyWorkspaceRepository'

export type WorkspaceEditOptions = { recordHistory?: boolean }
type EditApplier = (edit: MobileWorkspaceEdit, options?: WorkspaceEditOptions) => MobileWorkspaceEditResult
type FailedEdit = { edit: MobileWorkspaceEdit; options: WorkspaceEditOptions }

export function usePreparedWorkspaceEdits({ applyEdit, repository, repositoryRequest, snapshotRef }: {
  applyEdit: EditApplier
  repository: ReadOnlyWorkspaceRepository
  repositoryRequest?: ReadOnlyWorkspaceRequest
  snapshotRef: { current: MobileWorkspaceSnapshot }
}) {
  const syncEditors = useContext(WorkspaceSyncEditorsContext)
  const [generation] = useState(() => syncEditors?.generation())
  const alive = useRef(true)
  const latestApply = useRef(applyEdit)
  useEffect(() => { latestApply.current = applyEdit }, [applyEdit])
  const [failed, setFailed] = useState<FailedEdit | null>(null)
  const prepared = useRef<ReturnType<typeof createMobilePreparedEdits> | null>(null)
  useEffect(() => {
    let current = true
    prepared.current = createMobilePreparedEdits({
      apply: (edit) => latestApply.current(edit),
      isCurrent: () => current && generation === syncEditors?.generation(),
      read: (note) => repository.readNoteContent(note, repositoryRequest),
      snapshot: () => snapshotRef.current,
      source: repositoryRequest?.source,
    })
    return () => { current = false }
  }, [generation, repository, repositoryRequest, snapshotRef, syncEditors])
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  useWorkspaceSyncEditor(async () => { await prepared.current?.whenIdle(); return () => {} })

  const apply = useCallback(async (edit: MobileWorkspaceEdit, options: WorkspaceEditOptions = {}) => {
    try {
      const queue = prepared.current
      if (!queue) return null
      const result = await queue.apply(edit, () => latestApply.current(edit, options))
      if (prepared.current !== queue) return null
      if (!alive.current || generation !== syncEditors?.generation()) return null
      if (!isMobileNoteHydration(edit)) setFailed(null)
      return result
    } catch {
      if (alive.current) setFailed({ edit, options })
      return null
    }
  }, [generation, syncEditors])
  const retry = useCallback(() => {
    if (failed) void apply(failed.edit, failed.options)
  }, [apply, failed])
  return { apply, retryFailedEdit: failed ? retry : undefined }
}
