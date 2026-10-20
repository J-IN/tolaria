import fs from 'node:fs'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import git from 'isomorphic-git'
import { afterEach, expect, it, vi } from 'vitest'
import { createGitVault } from './gitVault'
import { syncGitVault } from './gitRemote'

const author = { name: 'Manual QA', email: 'qa@example.invalid' }
const roots: string[] = []
afterEach(async () => { for (const dir of roots.splice(0)) await rm(dir, { recursive: true, force: true }) })

async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), 'tolaria-manual-git-'))
  roots.push(dir)
  await git.init({ fs, dir, defaultBranch: 'main' })
  await git.setConfig({ fs, dir, path: 'remote.origin.url', value: 'https://github.com/team/vault.git' })
  await writeFile(join(dir, 'note.md'), '# Initial\n')
  await createGitVault({ fs, dir }).checkpoint(author)
  return { fs, dir }
}

it('records a user-written message in a local commit without contacting a remote', async () => {
  const context = await fixture()
  await writeFile(join(context.dir, 'note.md'), '# Revised\n')
  const result = await createGitVault(context).checkpoint(author, 'Review project decisions')
  expect(result.changedFiles).toBe(1)
  expect((await git.readCommit({ ...context, oid: result.oid })).commit.message.trim()).toBe('Review project decisions')
  expect(await readFile(join(context.dir, 'note.md'), 'utf8')).toBe('# Revised\n')
})

it('rejects empty manual messages without creating a commit', async () => {
  const context = await fixture()
  await writeFile(join(context.dir, 'note.md'), '# Revised\n')
  await expect(createGitVault(context).checkpoint(author, '  ')).rejects.toThrow('emptyCommitMessage')
  expect(await git.log(context)).toHaveLength(1)
})

it('manual sync refuses uncommitted changes before contacting a remote', async () => {
  const context = await fixture()
  await writeFile(join(context.dir, 'note.md'), '# Revised\n')
  const request = vi.fn().mockRejectedValue(new Error('Unexpected remote call'))
  await expect(syncGitVault({ ...context, http: { request }, checkpoint: false }, author)).rejects.toThrow('uncommittedChanges')
  expect(request).not.toHaveBeenCalled()
  expect(await git.log(context)).toHaveLength(1)
})
