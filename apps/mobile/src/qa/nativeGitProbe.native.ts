import { useEffect } from 'react'
import { Linking } from 'react-native'
import { requireOptionalNativeModule } from 'expo'
import { nativeStorageQaEnabled } from './nativeStorageQaCapability'
import { nativeMobileLaunchSearch } from '../native/mobileNativeKeyCommands'

export function useNativeGitProbe() {
  useEffect(() => {
    if (!storageProbeAvailable()) return
    const subscription = Linking.addEventListener('url', ({ url }) => { void runProbeUrl(url) })
    const search = nativeMobileLaunchSearch()
    if (search) void runProbeUrl(`tolaria:///${search}`)
    else void Linking.getInitialURL().then(runProbeUrl).catch(() => undefined)
    return () => subscription.remove()
  }, [])
}

async function runProbeUrl(url: string | null) {
  if (!url) return
  try {
    const endpoint = new URL(url).searchParams.get('gitProbe')
    if (!endpoint || !isLoopbackEndpoint(endpoint)) return
    const recoveryPhase = new URL(url).searchParams.get('writeRecoveryProbe')
    if (recoveryPhase) {
      const { runNativeWriteRecoveryProbe } = await import('./nativeWriteRecoveryProbe')
      await runNativeWriteRecoveryProbe(endpoint, recoveryPhase)
      return
    }
    await runGitProbe(url, endpoint)
  } catch (error) {
    console.warn('[native-git-probe] Unable to run probe', error)
  }
}

async function runGitProbe(url: string, endpoint: string) {
  if (new URL(url).searchParams.get('backgroundSyncProbe') === '1') {
    const { runNativeBackgroundSyncProbe } = await import('./nativeBackgroundSyncProbe')
    await runNativeBackgroundSyncProbe(endpoint)
    return
  }
  const { runNativeGitProbe } = await import('./runNativeGitProbe')
  await runNativeGitProbe(endpoint)
}

function storageProbeAvailable() {
  const module = requireOptionalNativeModule<{ nativeStorageQAEnabled?: boolean }>('TolariaWorkspaceAccess')
  return nativeStorageQaEnabled(__DEV__, module?.nativeStorageQAEnabled)
}

function isLoopbackEndpoint(endpoint: string) {
  const url = new URL(endpoint)
  return url.protocol === 'http:' && url.hostname === '127.0.0.1' && url.pathname === '/'
}
