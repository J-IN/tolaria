const workBudgetMs = 16

/** A resolved promise does not yield to input/timers; use a real task boundary. */
export function createGitTaskRunner() {
  let resumedAt = performance.now()
  let pending: Promise<void> | undefined
  const run = async <T>(operation: () => T): Promise<T> => {
    while (pending || performance.now() - resumedAt >= workBudgetMs) {
      pending ??= new Promise<void>((resolve) => setTimeout(resolve, 0)).finally(() => {
        resumedAt = performance.now()
        pending = undefined
      })
      await pending
    }
    // Run in this continuation so other resumed callers observe its actual cost.
    return operation()
  }
  return {
    run,
    // Only native asynchronous IO belongs here, not arbitrary resolved promises.
    readNative: async <T>(operation: () => Promise<T>): Promise<T> => {
      try { return await operation() }
      finally { resumedAt = performance.now() }
    },
  }
}
