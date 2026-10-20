import { afterEach, expect, it, vi } from 'vitest'
import { createMobileAutoGit } from './git/mobileAutoGit'
import { createWorkspaceSyncLifecycle } from './workspaceSyncLifecycle'

afterEach(() => vi.useRealTimers())

it.each(['inactive', 'background'])('flushes on active -> %s, once per departure', async state => {
  const scheduler = createMobileAutoGit(vi.fn().mockResolvedValue(undefined))
  const flush = vi.spyOn(scheduler, 'flush')
  const readiness = () => ({ enabled: true, blocked: false })
  const background = vi.fn(async run => run(new AbortController().signal))
  const lifecycle = createWorkspaceSyncLifecycle(scheduler, readiness, 'active', background)
  lifecycle.change(state)
  lifecycle.change('background')
  await vi.waitFor(() => expect(flush).toHaveBeenCalledOnce())
  expect(background).toHaveBeenCalledOnce()
  scheduler.dispose()
})

it('does not use background execution in manual Git mode or on a background cold start', () => {
  const scheduler = createMobileAutoGit(vi.fn())
  const background = vi.fn()
  const lifecycle = createWorkspaceSyncLifecycle(scheduler, () => ({ enabled: false, blocked: false }), 'active', background)
  lifecycle.change('inactive')
  lifecycle.change('background')
  createWorkspaceSyncLifecycle(scheduler, () => ({ enabled: true, blocked: false }), 'background', background).change('background')
  expect(background).not.toHaveBeenCalled()
  scheduler.dispose()
})

it('foreground return retries after an expired lease, without background polling', async () => {
  vi.useFakeTimers()
  const run = vi.fn().mockResolvedValue(undefined)
  const scheduler = createMobileAutoGit(run, 100)
  const background = vi.fn().mockResolvedValue(undefined)
  const lifecycle = createWorkspaceSyncLifecycle(scheduler, () => ({ enabled: true, blocked: false }), 'active', background)
  lifecycle.change('background')
  lifecycle.poll()
  await vi.advanceTimersByTimeAsync(1000)
  expect(run).not.toHaveBeenCalled()
  lifecycle.change('active')
  await vi.advanceTimersByTimeAsync(100)
  expect(run).toHaveBeenCalledOnce()
  scheduler.dispose()
})
