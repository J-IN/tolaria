import type { ReactNode } from 'react'
import { ActivityIndicator, Dimensions, Platform, StyleSheet, View, useWindowDimensions } from 'react-native'
import { MobileWorkspaceSidebar } from './MobileWorkspaceSidebar'
import { MobileNoteListPanel } from './MobileNoteListPanel'
import { MobilePanelSafeArea } from '../../ui/MobilePanelSafeArea'
import { useMobileDeviceLayout } from '../../ui/useMobileDeviceLayout'
import { useMobileStyles } from '../../ui/theme/useMobileTheme'
import type { MobileColors } from '../../ui/theme/mobilePalette'
import type { MobileMetrics } from '../../ui/mobileMetrics'
import { tabletScreenModeForWindow } from '../../screens/tabletWorkspaceScreenMode'
import { mobileCopy, mobileText } from '../../i18n/mobileText'
import { Text } from '../ui/text'
import type { WorkspaceSnapshotPreview } from '../../workspace/workspaceSnapshotPreview'
import { recordNativeStartupPreviewLayout } from '../../qa/nativeStartupPresentation'
import { PhoneCommandPaletteButton } from '../../screens/PhoneWorkspaceChrome'

export function MobileWorkspaceStartup({ children, preview, pending, hasActiveWorkspace }: {
  children: ReactNode
  preview: WorkspaceSnapshotPreview | null
  pending: boolean
  hasActiveWorkspace: boolean
}) {
  if (!preview || !pending || hasActiveWorkspace) return children
  return <StartupPanels preview={preview} />
}

const ignorePreviewAction = () => undefined

function StartupPanels({ preview }: { preview: WorkspaceSnapshotPreview }) {
  const tablet = useMobileDeviceLayout() === 'tablet'
  const { width, height } = useWindowDimensions()
  const screen = Dimensions.get('screen')
  const mode = tabletScreenModeForWindow({ width, height, screenWidth: screen.width, screenHeight: screen.height,
    nativeIpad: Platform.OS === 'ios' && Platform.isPad })
  const { styles } = useMobileStyles(createThemeStyles)
  const showSidebar = tablet && mode.defaultSidebarVisible
  return <View style={styles.root} testID="workspace-startup-preview" onLayout={recordNativeStartupPreviewLayout}
    accessible accessibilityRole="progressbar" accessibilityState={{ busy: true }} accessibilityLabel={mobileText('status.vault.reloading')}>
    <View style={styles.cached} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      testID="workspace-startup-cached-panels">
      {showSidebar && <View style={styles.sidebar}><MobilePanelSafeArea sidebar>
        <MobileWorkspaceSidebar sections={preview.sidebarSections} title={preview.source?.label} />
      </MobilePanelSafeArea></View>}
      <View style={tablet ? styles.noteList : styles.phoneList}><MobilePanelSafeArea>
        <CachedNoteList preview={preview} tablet={tablet} compact={!tablet || mode.compactTablet} />
      </MobilePanelSafeArea></View>
      {tablet && <View style={styles.editor} />}
    </View>
  </View>
}

function CachedNoteList({ preview, tablet, compact }: { preview: WorkspaceSnapshotPreview; tablet: boolean; compact: boolean }) {
  const { styles, mobileColors } = useMobileStyles(createThemeStyles)
  return <MobileNoteListPanel compact={compact} fullWidth={!tablet} notes={preview.notes} selectedNoteId={preview.selectedNoteId ?? null}
    subtitle={preview.noteListSubtitle} title={previewTitle(preview)} typeDefinitions={preview.typeDefinitions}
    displayPropertyKeys={preview.noteListPropertyOverrides?.inbox ?? []} propertyDisplayModes={preview.vaultConfig?.propertyDisplayModes}
    leading={!tablet && <PhoneCommandPaletteButton onPress={ignorePreviewAction} />} showCreateAction={false}
    toolbarTrailing={<View style={styles.progressLabel}><ActivityIndicator color={mobileColors.textMuted} />
      <Text numberOfLines={1} style={styles.label}>{mobileText('status.vault.reloading')}</Text></View>}
    onOpenCreateNote={ignorePreviewAction} onOpenSearch={ignorePreviewAction} onSelectNote={ignorePreviewAction} />
}

function previewTitle(preview: WorkspaceSnapshotPreview) {
  const active = preview.sidebarSections.flatMap(section => section.items ?? []).find(item => item.active)
  return active?.label ?? mobileCopy.inbox
}

function createThemeStyles(mobileColors: MobileColors, metrics: MobileMetrics) {
  const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: mobileColors.card },
    cached: { flex: 1, flexDirection: 'row', opacity: 0.8 },
    sidebar: { width: metrics.panel.sidebarWidth },
    noteList: { width: metrics.panel.noteListWidth },
    phoneList: { flex: 1, minWidth: 0 },
    editor: { flex: 1, minWidth: 0 },
    progressLabel: { flexDirection: 'row', alignItems: 'center', gap: metrics.space.sm,
      maxWidth: metrics.size(160) },
    label: { color: mobileColors.textMuted, fontSize: metrics.type.caption, flexShrink: 1 },
  })
  return { styles, mobileColors }
}
