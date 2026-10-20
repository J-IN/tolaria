import { Directory, File, Paths } from 'expo-file-system'
import { requireNativeModule } from 'expo'
import { AppState } from 'react-native'
import git, { type HttpClient } from 'isomorphic-git'
import { createExpoGitFileSystem } from '../workspace/git/expoGitFileSystem'
import { gitVirtualRoot } from '../workspace/git/gitFileSystemPaths'
import { nativeGitHttp } from '../workspace/git/nativeGitHttp'
import { cloneGitVault, syncGitVault } from '../workspace/git/gitRemote'
import { createMobileAutoGit } from '../workspace/git/mobileAutoGit'
import { runSavedVaultOperation } from '../workspace/git/savedVaultOperation'
import { createWorkspaceSyncEditors } from '../workspace/workspaceSyncEditors'
import { createWorkspaceSyncLifecycle } from '../workspace/workspaceSyncLifecycle'
import { withWorkspaceBackgroundSync } from '../workspace/workspaceBackgroundSync'
import { postNativeQaEvent, setNativeQaSinkUrl } from './nativeQaSink'

const author = { name: 'Background QA', email: 'qa@example.invalid' }

/** Invoked only by the opt-in, loopback-only storage QA route. */
export async function runNativeBackgroundSyncProbe(endpoint: string) {
  const root = new Directory(Paths.cache, `tolaria-background-qa-${Date.now()}`)
  root.create()
  try {
    const context = await prepareGit(root, endpoint)
    const proof = await backgroundRoundTrip(context, endpoint)
    post(endpoint, 'proof', proof)
  } catch (error) {
    post(endpoint, 'proof', { passed: false, error: String(error) })
  } finally { root.delete() }
}

async function prepareGit(root: Directory, endpoint: string) {
  const http: HttpClient = { request: request => {
    const url = new URL(request.url)
    return nativeGitHttp.request({ ...request, url: `${endpoint}${url.pathname}${url.search}` })
  } }
  const connection = (name: string) => {
    const directory = new Directory(root, name)
    directory.create()
    return { directory, fs: createExpoGitFileSystem(directory.uri), dir: gitVirtualRoot, http }
  }
  const desktop = connection('desktop')
  const tablet = connection('tablet')
  await cloneGitVault(desktop, 'https://github.com/team/vault')
  await cloneGitVault(tablet, 'https://github.com/team/vault')
  new File(desktop.directory, 'desktop.md').write('# Desktop change\n')
  new File(tablet.directory, 'tablet.md').write('# Tablet change\n')
  await syncGitVault(desktop, author)
  const merged = await syncGitVault(tablet, author)
  const oid = await git.resolveRef({ ...tablet, ref: 'HEAD' })
  const parents = (await git.readCommit({ ...tablet, oid })).commit.parent
  if (merged.kind !== 'synced' || parents.length !== 2) throw new Error('nativeMergeFailed')
  return tablet
}

async function backgroundRoundTrip(context: Awaited<ReturnType<typeof prepareGit>>, endpoint: string) {
  const native = requireNativeModule<{ runLinkedBackgroundProbe: () => Promise<boolean> }>('TolariaWorkspaceAccess')
  const editors = createWorkspaceSyncEditors()
  let prepared = false
  editors.register(async () => {
    new File(context.directory, 'background.md').write('---\ncustom: preserved\n---\n# Background draft\n')
    prepared = true
    return () => {}
  })
  let folderPassed = false
  const scheduler = createMobileAutoGit(signal => runSavedVaultOperation({
    editors, rootUri: context.directory.uri, refresh: () => {},
    run: async () => {
      await waitForBackground()
      const result = await syncGitVault({ ...context, signal }, author)
      if (result.kind !== 'synced') throw new Error('backgroundPushFailed')
      folderPassed = await native.runLinkedBackgroundProbe()
      return 'unchanged'
    },
  }))
  const proof = await observeDeparture(scheduler, endpoint, () => ({
    passed: prepared && folderPassed, prepared, folderPassed,
    state: AppState.currentState, merged: true,
  }))
  return proof
}

async function observeDeparture(
  scheduler: ReturnType<typeof createMobileAutoGit>, endpoint: string, proof: () => object,
) {
  let complete: () => void = () => {}
  let fail: (error: unknown) => void = () => {}
  const done = new Promise<void>((resolve, reject) => { complete = resolve; fail = reject })
  const lifecycle = createWorkspaceSyncLifecycle(scheduler, () => ({ enabled: true, blocked: false }), AppState.currentState,
    async run => {
      try { await withWorkspaceBackgroundSync(run); complete() }
      catch (error) { fail(error) }
    })
  const subscription = AppState.addEventListener('change', lifecycle.change)
  const timeout = setTimeout(() => fail(new Error('backgroundDepartureTimedOut')), 90_000)
  try {
    post(endpoint, 'ready', { ready: true })
    await done
    return proof()
  } finally { clearTimeout(timeout); subscription.remove(); scheduler.dispose() }
}

function waitForBackground() {
  if (AppState.currentState === 'background') return Promise.resolve()
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => { subscription.remove(); reject(new Error('notBackgrounded')) }, 5000)
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'background') { clearTimeout(timer); subscription.remove(); resolve() }
    })
  })
}

function post(endpoint: string, path: 'ready' | 'proof', proof: object) {
  setNativeQaSinkUrl(new URL(path, `${endpoint}/`).toString())
  postNativeQaEvent(proof)
}
