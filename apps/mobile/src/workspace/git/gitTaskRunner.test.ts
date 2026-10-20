import { afterEach, expect, it, vi } from 'vitest'
import { createGitTaskRunner } from './gitTaskRunner'

afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers() })

function clock() {
  vi.useFakeTimers()
  let now = 0
  vi.spyOn(performance, 'now').mockImplementation(() => now)
  return (value: number) => { now = value }
}

it('runs within the current budget without scheduling a timer', async () => {
  const setTime = clock()
  const { run } = createGitTaskRunner()
  setTime(15)
  expect(await run(() => 'done')).toBe('done')
  expect(vi.getTimerCount()).toBe(0)
})

it('shares the pending timer without running work in a microtask-only loop', async () => {
  const setTime = clock()
  const { run } = createGitTaskRunner()
  const operation = vi.fn(() => 'done')
  setTime(16)
  const first = run(operation)
  const second = run(operation)
  expect(vi.getTimerCount()).toBe(1)
  await Promise.resolve()
  expect(operation).not.toHaveBeenCalled()
  await vi.advanceTimersByTimeAsync(0)
  expect(await Promise.all([first, second])).toEqual(['done', 'done'])
  expect(operation).toHaveBeenCalledTimes(2)
  expect(vi.getTimerCount()).toBe(0)
})

it('starts the next budget when the timer actually resumes', async () => {
  const setTime = clock()
  const { run } = createGitTaskRunner()
  setTime(20)
  const first = run(() => 'first')
  setTime(100)
  await vi.advanceTimersByTimeAsync(0)
  await first
  setTime(115)
  expect(await run(() => 'fast')).toBe('fast')
  expect(vi.getTimerCount()).toBe(0)
  setTime(116)
  const next = run(() => 'next')
  expect(vi.getTimerCount()).toBe(1)
  await vi.advanceTimersByTimeAsync(0)
  expect(await next).toBe('next')
})

it('keeps unrelated instances independent', async () => {
  const setTime = clock()
  const first = createGitTaskRunner()
  const second = createGitTaskRunner()
  setTime(16)
  const tasks = [first.run(() => 1), second.run(() => 2)]
  expect(vi.getTimerCount()).toBe(2)
  await vi.advanceTimersByTimeAsync(0)
  expect(await Promise.all(tasks)).toEqual([1, 2])
})

it('does not retain a failed operation or block later work', async () => {
  const setTime = clock()
  const { run } = createGitTaskRunner()
  setTime(16)
  const failed = expect(run(() => { throw new Error('nativeFailure') })).rejects.toThrow('nativeFailure')
  await vi.advanceTimersByTimeAsync(0)
  await failed
  expect(await run(() => 'next')).toBe('next')
  expect(vi.getTimerCount()).toBe(0)
})

it('renews the work budget after genuine native IO completes', async () => {
  const setTime = clock()
  const tasks = createGitTaskRunner()
  setTime(100)
  expect(await tasks.readNative(async () => 'bytes')).toBe('bytes')
  expect(await tasks.run(() => 'metadata')).toBe('metadata')
  expect(vi.getTimerCount()).toBe(0)
})

it('renews the work budget after failed native IO without hiding the error', async () => {
  const setTime = clock()
  const tasks = createGitTaskRunner()
  setTime(100)
  await expect(tasks.readNative(async () => { throw new Error('readFailure') })).rejects.toThrow('readFailure')
  expect(await tasks.run(() => 'metadata')).toBe('metadata')
  expect(vi.getTimerCount()).toBe(0)
})
