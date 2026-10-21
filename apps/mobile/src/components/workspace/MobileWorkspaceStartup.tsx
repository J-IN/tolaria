import { useMemo, useState, type ReactNode } from 'react'
import { ActivityIndicator, Dimensions, Platform, StyleSheet, View, useWindowDimensions } from 'react-native'
import { MobileWorkspaceSidebar } from './MobileWorkspaceSidebar'
import { MobileNoteListPanel } from './MobileNoteListPanel'
import { MobilePanelSafeArea } from '../../ui/MobilePanelSafeArea'
import { useMobileDeviceLayout } from '../../ui/useMobileDeviceLayout'
import { useMobileStyles } from '../../ui/theme/useMobileTheme'
import type { MobileColors } from '../../ui/theme/mobilePalette'
import type { MobileMetrics } from '../../ui/mobileMetrics'
import { tabletScreenModeForWindow } from '../../screens/tabletWorkspaceScreenMode'
import { mobileText } from '../../i18n/mobileText'
import { Text } from '../ui/text'
import type { WorkspaceSnapshotPreview } from '../../workspace/workspaceSnapshotPreview'
import { recordNativeStartupPreviewLayout } from '../../qa/nativeStartupPresentation'
import { initialSidebarSelection, notesForSidebarSelection, noteListFilterCountsForSelection,
  noteListPropertiesForSelection, shouldShowNoteListFilter } from '../../screens/tabletWorkspaceNavigationSelectors'
import type { TabletSidebarSelection } from '../../screens/tabletWorkspaceNavigation'
import type { MobileNoteListFilter } from '../../workspace/mobileNoteFilters'
import { useMobileAnalytics } from '../../analytics/useMobileAnalytics'

export function MobileWorkspaceStartup({ children, preview, pending, hasActiveWorkspace, onSelectNote = ignorePreviewAction }: {
  children: ReactNode
  preview: WorkspaceSnapshotPreview | null
  pending: boolean
  hasActiveWorkspace: boolean
  onSelectNote?: (noteId: string) => void
}) {
  if (!preview || !pending || hasActiveWorkspace) return children
  return <StartupPanels preview={preview} onSelectNote={onSelectNote} />
}

const ignorePreviewAction = () => undefined

function StartupPanels({ preview, onSelectNote }: { preview: WorkspaceSnapshotPreview; onSelectNote: (noteId: string) => void }) {
  const tablet = useMobileDeviceLayout() === 'tablet'
  const { width, height } = useWindowDimensions()
  const screen = Dimensions.get('screen')
  const mode = tabletScreenModeForWindow({ width, height, screenWidth: screen.width, screenHeight: screen.height,
    nativeIpad: Platform.OS === 'ios' && Platform.isPad })
  const { styles } = useMobileStyles(createThemeStyles)
  const navigation = useStartupNavigation(preview)
  const showSidebar = tablet && mode.defaultSidebarVisible
  return <View style={styles.root} testID="workspace-startup-preview" onLayout={recordNativeStartupPreviewLayout}
    accessibilityState={{ busy: true }}>
    <View style={styles.cached} testID="workspace-startup-cached-panels">
      {showSidebar && <StartupSidebar preview={preview} navigation={navigation} />}
      <View style={tablet ? styles.noteList : styles.phoneList}><MobilePanelSafeArea>
        <CachedNoteList preview={preview} tablet={tablet} compact={!tablet || mode.compactTablet}
          navigation={navigation} onSelectNote={onSelectNote} />
      </MobilePanelSafeArea></View>
      {tablet && <View style={styles.editor} />}
    </View>
  </View>
}

function StartupSidebar({ preview, navigation }: { preview: WorkspaceSnapshotPreview; navigation: ReturnType<typeof useStartupNavigation> }) {
  const { styles } = useMobileStyles(createThemeStyles)
  return <View style={styles.sidebar}><MobilePanelSafeArea sidebar>
    <MobileWorkspaceSidebar sections={preview.sidebarSections} title={preview.source?.label}
      activeItemId={navigation.selection.kind === 'item' ? navigation.selection.id : null}
      activeFolderId={navigation.selection.kind === 'folder' ? navigation.selection.id : null}
      onSelectItem={item => navigation.select({ ...item, kind: 'item' })}
      onSelectFolder={folder => navigation.select({ id: folder.id, label: folder.name, kind: 'folder' })} />
  </MobilePanelSafeArea></View>
}

type CachedNoteListProps = { preview: WorkspaceSnapshotPreview; tablet: boolean; compact: boolean
  navigation: ReturnType<typeof useStartupNavigation>; onSelectNote: (noteId: string) => void }

function CachedNoteList(props: CachedNoteListProps) {
  const { preview, tablet, compact, navigation, onSelectNote } = props
  const { styles, mobileColors } = useMobileStyles(createThemeStyles)
  const analytics = useMobileAnalytics()
  return <MobileNoteListPanel compact={compact} fullWidth={!tablet} notes={navigation.notes} selectedNoteId={preview.selectedNoteId ?? null}
    subtitle={preview.noteListSubtitle} title={navigation.selection.label} typeDefinitions={preview.typeDefinitions}
    displayPropertyKeys={noteListPropertiesForSelection(preview, navigation.selection)} propertyDisplayModes={preview.vaultConfig?.propertyDisplayModes}
    showCreateAction={false} noteListFilter={navigation.filter} noteListFilterVisible={shouldShowNoteListFilter(navigation.selection)}
    noteListFilterCounts={noteListFilterCountsForSelection(preview, navigation.selection)} onNoteListFilterChange={navigation.setFilter}
    toolbarTrailing={<View style={styles.progressLabel} accessibilityRole="progressbar" accessibilityLabel={mobileText('status.vault.reloading')}>
      <ActivityIndicator color={mobileColors.textMuted} />
      <Text numberOfLines={1} style={styles.label}>{mobileText('status.vault.reloading')}</Text></View>}
    onOpenCreateNote={ignorePreviewAction} onOpenSearch={ignorePreviewAction} onSelectNote={noteId => {
      analytics.capture({ name: 'mobile_startup_preview_used' })
      onSelectNote(noteId)
    }} />
}

function useStartupNavigation(preview: WorkspaceSnapshotPreview) {
  const [selection, setSelection] = useState<TabletSidebarSelection>(() => initialSidebarSelection(preview))
  const [filter, setFilter] = useState<MobileNoteListFilter>('open')
  const notes = useMemo(() => notesForSidebarSelection(preview, selection, { noteListFilter: filter }), [preview, selection, filter])
  return { selection, filter, setFilter, notes, select: (next: TabletSidebarSelection) => { setFilter('open'); setSelection(next) } }
}

function createThemeStyles(mobileColors: MobileColors, metrics: MobileMetrics) {
  const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: mobileColors.card },
    cached: { flex: 1, flexDirection: 'row' },
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
