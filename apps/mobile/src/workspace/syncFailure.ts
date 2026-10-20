export type SyncFailureKind = 'retry' | 'authentication' | 'conflict' | 'local'

const temporary = new Set(['githubNetworkFailed', 'githubRequestTimeout', 'pushRejected', 'syncDeferred', 'linkedFolderUnavailable'])
const authentication = new Set(['githubAuthorizationExpired', 'githubAuthorizationFailed', 'githubCredentialStoreFailed'])

export function syncFailureKind(error: unknown): SyncFailureKind {
  if (!(error instanceof Error)) return 'local'
  if (temporary.has(error.message)) return 'retry'
  if (authentication.has(error.message)) return 'authentication'
  const http = httpFailure(httpStatus(error))
  if (http) return http
  if (error.name === 'AbortError' || /network request failed|failed to fetch|network connection|timed out/i.test(error.message)) return 'retry'
  if (['mergeConflict', 'linkedFolderConflict'].includes(error.message)) return 'conflict'
  return 'local'
}

function httpFailure(status: number): SyncFailureKind | null {
  if ([401, 403].includes(status)) return 'authentication'
  return [408, 429].includes(status) || status >= 500 ? 'retry' : null
}

function httpStatus(error: Error) {
  if (!('data' in error) || typeof error.data !== 'object' || error.data === null) return 0
  return 'statusCode' in error.data && typeof error.data.statusCode === 'number' ? error.data.statusCode : 0
}

export function retryRequested(value: unknown) {
  return typeof value === 'object' && value !== null && 'retry' in value && value.retry === true
}
