import type { LocalVaultSnapshotOptions } from './localVaultSnapshot'
import type { MobileNote, MobileWorkspaceSnapshot } from './mobileWorkspaceModel'
import { serializeMobileVaultConfig } from './mobileVaultConfig'
import type { SnapshotCacheStorage } from './workspaceSnapshotCache'

export type WorkspaceSnapshotIdentity = Omit<LocalVaultSnapshotOptions, 'files' | 'folderPaths'>
export type WorkspaceSnapshotEnvelopeContext = { key: string; input: string; identity: WorkspaceSnapshotIdentity }
// Bump whenever parser or persisted-envelope semantics change.
export const workspaceSnapshotCacheVersion = 3
const maxPayloadCharacters = 8 * 1024 * 1024
type CacheRecord = { version: number; identity: string; input: string; payload: string; checksum: string }

function presentationIdentity(options: WorkspaceSnapshotIdentity, revision?: string) {
  return JSON.stringify([workspaceSnapshotCacheVersion, revision, options.vaultPath, options.vaultLabel,
    options.vaultAlias, options.maxNotes, serializeMobileVaultConfig(options.vaultConfig ?? {})])
}

export async function readWorkspaceSnapshotEnvelope(storage: SnapshotCacheStorage, key: string, options: WorkspaceSnapshotIdentity) {
  const text = await storage.read(key)
  if (!text || text.length > maxPayloadCharacters * 2 + 65536) return null
  const record: CacheRecord = JSON.parse(text)
  if (!validRecord(record, presentationIdentity(options, storage.revision))) return null
  if (await storage.digest(checksumInput(record)) !== record.checksum) return null
  const snapshot: MobileWorkspaceSnapshot = JSON.parse(record.payload)
  if (!validSnapshot(snapshot, options)) return null
  return { input: record.input, snapshot }
}

export async function writeWorkspaceSnapshotEnvelope(storage: SnapshotCacheStorage,
  context: WorkspaceSnapshotEnvelopeContext, snapshot: MobileWorkspaceSnapshot) {
  const payload = JSON.stringify(snapshot, (_key, value: unknown) => {
    if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('unsupportedSnapshotCacheValue')
    return value
  })
  if (payload.length > maxPayloadCharacters) return
  const record = { version: workspaceSnapshotCacheVersion, identity: presentationIdentity(context.identity, storage.revision), input: context.input, payload }
  await storage.write(context.key, JSON.stringify({ ...record, checksum: await storage.digest(checksumInput(record)) }))
}

function checksumInput(record: Omit<CacheRecord, 'checksum'>) {
  return JSON.stringify([record.version, record.identity, record.input, record.payload])
}

function validRecord(record: CacheRecord | null, identity: string): record is CacheRecord {
  if (!record || record.version !== workspaceSnapshotCacheVersion || record.identity !== identity) return false
  return typeof record.payload === 'string' && record.payload.length <= maxPayloadCharacters
    && validDigest(record.input) && validDigest(record.checksum)
}

function validDigest(value: unknown) { return typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value) }

function validSnapshot(snapshot: MobileWorkspaceSnapshot | null, options: WorkspaceSnapshotIdentity): snapshot is MobileWorkspaceSnapshot {
  if (!snapshot || !sameSource(snapshot.source, options) || !hasSnapshotCollections(snapshot)) return false
  return [...snapshot.notes, ...snapshot.allNotes ?? []].every(validNote)
}

function sameSource(source: MobileWorkspaceSnapshot['source'], options: WorkspaceSnapshotIdentity) {
  return source?.kind === 'localVault' && source.vaultPath === options.vaultPath && source.label === options.vaultLabel
}

function hasSnapshotCollections(snapshot: MobileWorkspaceSnapshot) {
  const arrays = ['notes', 'allNotes', 'views', 'sidebarSections', 'editorBlocks', 'editorBullets'] as const
  return arrays.every(key => Array.isArray(snapshot[key])) && Boolean(snapshot.typeDefinitions) && Boolean(snapshot.vaultConfig)
}

function validNote(note: MobileNote | null) {
  if (!note) return false
  const strings = ['id', 'title', 'type', 'snippet', 'status', 'typeTone', 'workspace', 'created', 'modified', 'date'] as const
  const arrays = ['relationships', 'tags'] as const
  return strings.every(key => typeof note[key] === 'string') && arrays.every(key => Array.isArray(note[key]))
    && typeof note.favorite === 'boolean' && Number.isFinite(note.links)
}
