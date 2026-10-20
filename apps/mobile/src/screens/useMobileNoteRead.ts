import { useCallback, useEffect, useRef, useState } from 'react'
import { mobileNoteNeedsRead, startMobileNoteRead, type MobileNoteReadState } from '../workspace/mobileNoteRead'
import type { MobileWorkspaceEdit } from '../workspace/mobileWorkspaceEditing'
import type { MobileNote } from '../workspace/mobileWorkspaceModel'
import type { ReadOnlyWorkspaceRepository, ReadOnlyWorkspaceRequest } from '../workspace/readOnlyWorkspaceRepository'

export function useMobileNoteRead({ applyEdit, note, repository, request }: {
  applyEdit: (edit: MobileWorkspaceEdit) => void
  note: MobileNote | null
  repository: ReadOnlyWorkspaceRepository
  request?: ReadOnlyWorkspaceRequest
}): MobileNoteReadState {
  const [failedNote, setFailedNote] = useState<MobileNote | null>(null)
  const [attempt, setAttempt] = useState(0)
  const applyEditRef = useRef(applyEdit)
  const needsRead = mobileNoteNeedsRead(note, request?.source)
  useEffect(() => { applyEditRef.current = applyEdit }, [applyEdit])
  useEffect(() => {
    if (!note || !needsRead) return
    const operation = startMobileNoteRead({
      read: () => repository.readNoteContent(note, request),
      onError: () => setFailedNote(note),
      onContent: (rawContent) => applyEditRef.current({
        noteId: note.id,
        rawContent,
        type: note.fileKind === 'text' ? 'hydrateTextFileContent' : 'hydrateNoteContent',
      }),
    })
    return operation.cancel
  }, [attempt, needsRead, note, repository, request])

  const retry = useCallback(() => {
    setFailedNote(null)
    setAttempt((current) => current + 1)
  }, [])
  if (!needsRead) return { status: 'ready', retry }
  return { status: failedNote === note ? 'error' : 'loading', retry }
}
