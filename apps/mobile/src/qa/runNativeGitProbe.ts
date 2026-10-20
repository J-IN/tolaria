import { Directory, File, Paths } from 'expo-file-system'
import { requireOptionalNativeModule } from 'expo'
import { nativeGitHttp } from '../workspace/git/nativeGitHttp'
import git, { type GitProgressEvent, type HttpClient } from 'isomorphic-git'
import { cloneGitVault, syncGitVault } from '../workspace/git/gitRemote'
import { gitFileSystemSession } from '../workspace/git/gitFileSystemSessions'
import { gitVirtualRoot } from '../workspace/git/gitFileSystemPaths'
import { assertNativeWorkspaceWriteErrors } from './nativeWorkspaceWriteErrors'
import { nativeVaultReadBenchmark } from './nativeVaultReadBenchmark'
import { assertNativeGitRecovery } from './nativeGitRecoveryProbe'
import { assertGitReadFailureSafety } from './assertGitReadFailureSafety'
import { measureEventLoopDelay } from './measureEventLoopDelay'
import { postNativeQaEvent, setNativeQaSinkUrl } from './nativeQaSink'

let running = false

/** Disposable device-local working copies; never opens a user-selected vault. */
export async function runNativeGitProbe(endpoint: string) {
  if (running) return
  running = true
  const root = new Directory(Paths.cache, `tolaria-git-qa-${Date.now()}`)
  const started = Date.now()
  try {
    root.create()
    await assertNativeWorkspaceWriteErrors(root)
    const nativeDigestVerified = await verifyNativeDigest()
    const nativeFiles = await nativeFileAccessProof()
    const readSafety = new Directory(root, 'read-safety')
    readSafety.create()
    const readErrorsVerified = await assertGitReadFailureSafety({ fs: gitFileSystemSession(readSafety.uri), dir: gitVirtualRoot })
    const checkoutRecovery = await assertNativeGitRecovery(root)
    const { result: proof, eventLoop, phases } = await measureEventLoopDelay(enter => roundTrip(root, endpoint, enter))
    const elapsedMs = Date.now() - started
    const fixtureVault = nativeFiles
      ? await measureEventLoopDelay(() => nativeVaultReadBenchmark(new Directory(root, 'second').uri)) : null
    publishProof(endpoint, { ...proof, eventLoop, phases, nativeFiles, nativeDigestVerified, readErrorsVerified, checkoutRecovery, fixtureVault, elapsedMs })
  } catch (error) {
    publishProof(endpoint, { error: error instanceof Error ? error.message : 'unknown', stack: error instanceof Error ? error.stack : null, passed: false })
  } finally {
    if (root.exists) root.delete()
    running = false
  }
}

async function verifyNativeDigest() {
  const { oid } = await git.hashBlob({ object: new Uint8Array() })
  if (oid !== 'e69de29bb2d1d6434b8b29ae775ad8c2e48c5391') throw new Error('nativeDigestVerificationFailed')
  return true
}

async function nativeFileAccessProof() {
  const module = requireOptionalNativeModule<{ runFileAccessProbe?: () => Promise<Record<string, boolean>> }>('TolariaWorkspaceAccess')
  if (!module?.runFileAccessProbe) return null
  const checks = await module.runFileAccessProbe()
  if (!Object.values(checks).every(Boolean)) throw new Error('nativeFileAccessProofFailed')
  return checks
}

async function roundTrip(root: Directory, endpoint: string, enter: (phase: string) => void) {
  const first = new Directory(root, 'first')
  const second = new Directory(root, 'second')
  first.create()
  second.create()
  const http: HttpClient = {
    request: (request) => {
      const url = new URL(request.url)
      return nativeGitHttp.request({ ...request, url: `${endpoint}${url.pathname}${url.search}` })
    },
  }
  const connection = (directory: Directory) => ({ fs: gitFileSystemSession(directory.uri), dir: gitVirtualRoot, http })
  const repositoryUrl = 'https://github.com/team/vault'
  const started = Date.now()
  enter('clone.first')
  await cloneGitVault({ ...connection(first), onProgress: progressPhases('clone.first', enter) }, repositoryUrl)
  const firstCloned = Date.now()
  enter('clone.second')
  await cloneGitVault({ ...connection(second), onProgress: progressPhases('clone.second', enter) }, repositoryUrl)
  const secondCloned = Date.now()
  enter('fixture.edit')
  const content = '---\ncustom: preserved\ntags: [native]\n---\n# Native Git round trip\n'
  new File(first, 'note.md').write(content)
  const attachment = new Uint8Array([0, 255, 1, 128, 10, 0, 250])
  new Directory(first, 'attachments').create()
  new File(first, 'attachments', 'bytes.bin').write(attachment)
  new File(first, 'deleted.md').delete()
  const author = { name: 'Native QA', email: 'qa@example.invalid' }
  const sync = (directory: Directory, name: string) => syncGitVault({
    ...connection(directory), onPhase: phase => enter(`${name}.${phase}`),
  }, author)
  const pushed = await sync(first, 'push')
  const firstSynced = Date.now()
  const pulled = await sync(second, 'pull')
  const secondSynced = Date.now()
  const unchanged = await sync(second, 'unchanged')
  const unchangedSynced = Date.now()
  const unchangedSync = unchanged.kind === 'synced' && unchanged.changedFiles === 0 && !unchanged.workspaceChanged
  enter('verify')
  const preserved = await verifyRoundTrip(second, content, attachment)
  const passed = preserved.binaryPreserved && preserved.deletionPreserved && preserved.contentPreserved
    && pushed.kind === 'synced' && pulled.kind === 'synced' && unchangedSync
  const timings = {
    firstCloneMs: firstCloned - started,
    secondCloneMs: secondCloned - firstCloned,
    pushMs: firstSynced - secondCloned,
    pullMs: secondSynced - firstSynced,
    unchangedSyncMs: unchangedSynced - secondSynced,
  }
  return { passed, ...preserved, unchangedSync, pushed: pushed.kind, pulled: pulled.kind, timings }
}

function progressPhases(group: string, enter: (phase: string) => void) {
  let previous: string | undefined
  return ({ phase }: GitProgressEvent) => {
    if (phase === previous) return
    previous = phase
    enter(`${group}.${phase}`)
  }
}

async function verifyRoundTrip(second: Directory, content: string, attachment: Uint8Array) {
  const saved = await new File(second, 'note.md').text()
  const binary = await new File(second, 'attachments', 'bytes.bin').bytes()
  const binaryPreserved = binary.length === attachment.length && binary.every((byte, index) => byte === attachment[index])
  const deletionPreserved = !new File(second, 'deleted.md').exists
  return { binaryPreserved, deletionPreserved, contentPreserved: saved === content }
}

function publishProof(endpoint: string, proof: Record<string, unknown>) {
  console.info('TOLARIA_NATIVE_GIT_PROOF', JSON.stringify(proof))
  setNativeQaSinkUrl(new URL('/proof', endpoint).toString())
  postNativeQaEvent(proof)
}
