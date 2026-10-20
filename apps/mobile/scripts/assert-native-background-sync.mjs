/* global console, process, setTimeout, clearTimeout */
import { execFileSync } from 'node:child_process'
import { Buffer } from 'node:buffer'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { gitTestEnvironment, startGitTestServer } from '../src/workspace/git/gitTestServer.ts'
import { withNativeSimulatorLease } from '../src/qa/nativeSimulatorLease.ts'

const device = process.env.TOLARIA_QA_DEVICE
if (!device) throw new Error('Set TOLARIA_QA_DEVICE to an explicit simulator UUID')
const runGit = args => execFileSync('git', args, { env: gitTestEnvironment(), stdio: 'pipe' }).toString().trim()

async function fixture(root) {
  const remote = join(root, 'team/vault.git')
  const seed = join(root, 'seed')
  await mkdir(remote, { recursive: true })
  await mkdir(seed)
  runGit(['init', '--bare', '--initial-branch=main', remote])
  runGit(['init', '--initial-branch=main', seed])
  await writeFile(join(seed, 'note.md'), '# Initial\n')
  runGit(['-C', seed, 'add', '.'])
  runGit(['-C', seed, '-c', 'user.name=QA', '-c', 'user.email=qa@example.invalid', 'commit', '-m', 'Fixture'])
  runGit(['-C', seed, 'push', remote, 'main'])
  return remote
}

async function receive(request, response, resolve, reject) {
  const chunks = []
  for await (const chunk of request) chunks.push(chunk)
  response.end('ok')
  try { resolve(JSON.parse(Buffer.concat(chunks).toString())) }
  catch (error) { reject(error) }
}

async function probe() {
  const root = await mkdtemp(join(tmpdir(), 'tolaria-background-'))
  let server
  let timer
  try {
    const remote = await fixture(root)
    let resolve
    let reject
    const proof = new Promise((accept, fail) => {
      resolve = accept; reject = fail
      timer = setTimeout(() => fail(new Error('Background proof timed out')), 150_000)
    })
    server = await startGitTestServer(root, (request, response) => {
      if (request.url === '/ready') {
        response.end('ok')
        console.log('READY: switching the simulator to Settings to leave Tolaria in the background.')
        execFileSync('xcrun', ['simctl', 'launch', device, 'com.apple.Preferences'])
        return true
      }
      if (request.url !== '/proof') return false
      void receive(request, response, resolve, reject).catch(reject)
      return true
    })
    const url = `tolaria:///?source=fixture&gitProbe=${encodeURIComponent(server.url)}&backgroundSyncProbe=1&qaRun=native-background`
    execFileSync('xcrun', ['simctl', 'launch', '--terminate-running-process', device, 'com.tolaria.mobile.dev',
      '--tolaria-mobile-search', new URL(url).search])
    const result = await proof
    const saved = runGit(['--git-dir', remote, 'show', 'main:background.md'])
    const draftPreserved = saved === '---\ncustom: preserved\n---\n# Background draft'
    console.log(JSON.stringify({ ...result, draftPreserved }, null, 2))
    if (!result.passed || !draftPreserved || result.state !== 'background') process.exitCode = 1
  } finally {
    clearTimeout(timer)
    await server?.close()
    await rm(root, { recursive: true, force: true })
  }
}

await withNativeSimulatorLease(probe)
