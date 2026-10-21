import type { MobileMetrics } from '../ui/mobileMetrics'
import { useMobileStyles } from '../ui/theme/useMobileTheme'
import type { MobileColors } from '../ui/theme/mobilePalette'
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, View } from 'react-native'
import { X } from 'phosphor-react-native'
import { Text } from '../components/ui/text'
import { Switch } from '../components/ui/switch'
import { MobileButton } from '../ui/MobileButton'
import { MobileIconButton } from '../ui/MobileIconButton'
import { MobilePanel, MobileToolbar, MobileToolbarSpacer, MobileToolbarTitle } from '../ui/MobilePanel'

import { mobileText } from '../i18n/mobileText'
import { useMobileSettings } from './useMobileSettings'
import { MobileAppearanceSettings } from './MobileAppearanceSettings'
import { MobilePrivacySettings } from './MobilePrivacySettings'
import { MobileUpdateSettings } from './MobileUpdateSettings'
import { useMobileUpdateChannel } from './useMobileUpdateChannel'
import { useMobileAnalytics } from '../analytics/useMobileAnalytics'
import { MobileVaultManager } from '../components/vaults/MobileVaultManager'
import type { useMobileVaults } from '../workspace/git/useMobileVaults'
import { useMobileModalDismiss } from '../workspace/useMobileModalDismiss'

export function MobileSettingsSheet({ manager }: { manager: ReturnType<typeof useMobileVaults> }) {
  const { styles, mobileColors } = useMobileStyles(createThemeStyles)
  const preferences = useMobileSettings()
  const updates = useMobileUpdateChannel(manager)
  const close = () => { if (manager.busy) return; manager.close(); preferences.close() }
  const opened = preferences.opened || manager.opened
  useMobileModalDismiss(close, opened)
  return <Modal visible={opened} transparent animationType="fade" onRequestClose={close}
    supportedOrientations={['portrait', 'portrait-upside-down', 'landscape-left', 'landscape-right']}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
      <MobilePanel style={styles.panel} accessibilityViewIsModal testID="mobile-settings">
        <MobileToolbar>
          <MobileToolbarTitle title={mobileText('settings.title')} />
          <MobileToolbarSpacer />
          <MobileIconButton accessibilityLabel={mobileText('settings.close')} onPress={close}><X size={18} color={mobileColors.textMuted} /></MobileIconButton>
        </MobileToolbar>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {preferences.error && <Text accessibilityRole="alert" style={styles.error}>{mobileText(preferences.error === 'load' ? 'mobile.settings.loadFailed' : 'mobile.settings.saveFailed')}</Text>}
          {preferences.error === 'load' && <MobileButton label={mobileText('pulse.retry')} onPress={() => { void preferences.retry() }} />}
          <Text style={styles.heading}>{mobileText('menu.vault')}</Text>
          <MobileVaultManager manager={manager} />
          {!manager.conflictReview && <>
          <MobileAppearanceSettings />
          <MobileUpdateSettings updates={updates} />
          <AutoGitSettings gitAvailable={Boolean(manager.active.git)} />
          <MobilePrivacySettings />
          </>}
        </ScrollView>
      </MobilePanel>
    </KeyboardAvoidingView>
  </Modal>
}

function AutoGitSettings({ gitAvailable }: { gitAvailable: boolean }) {
  const { styles } = useMobileStyles(createThemeStyles)
  const preferences = useMobileSettings()
  const analytics = useMobileAnalytics()
  const disabled = !preferences.ready || preferences.saving
  return <View style={styles.section}><Text style={styles.heading}>{mobileText('settings.autogit.title')}</Text>
          <View style={styles.row}>
            <Text style={styles.label}>{mobileText('settings.autogit.enable')}</Text>
            <Switch checked={preferences.settings.autoGit} disabled={disabled || !gitAvailable} accessibilityLabel={mobileText('settings.autogit.enable')}
              onCheckedChange={(autoGit) => { void preferences.update({ autoGit }).then(saved => {
                if (saved) analytics.capture({ name: 'mobile_setting_changed', setting: 'autoGit' })
              }) }} testID="settings-auto-git" />
          </View>
          <Text style={styles.detail}>{mobileText(gitAvailable ? 'mobile.settings.autoGitForeground' : 'mobile.vaults.localOnly')}</Text>
          </View>
}

function createThemeStyles(mobileColors: MobileColors, metrics: MobileMetrics) {
  const { space: mobileSpace } = metrics
  const styles = StyleSheet.create({
    backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: mobileColors.overlay, padding: mobileSpace.lg },
    panel: { width: '100%', maxWidth: 540, maxHeight: '85%', borderRadius: 8, overflow: 'hidden', backgroundColor: mobileColors.dialog },
    content: { padding: metrics.size(20), gap: metrics.size(20) },
    section: { gap: metrics.size(12), paddingTop: metrics.size(16), borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: mobileColors.border },
    row: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: metrics.size(16) },
    label: { flex: 1, fontSize: metrics.size(14), color: mobileColors.text },
    heading: { fontSize: metrics.size(16), color: mobileColors.text, fontWeight: '600' },
    detail: { fontSize: metrics.size(12), lineHeight: metrics.size(18), color: mobileColors.textMuted },
    error: { fontSize: metrics.size(12), lineHeight: metrics.size(18), color: mobileColors.danger },
  })
  return { mobileColors, styles }
}
