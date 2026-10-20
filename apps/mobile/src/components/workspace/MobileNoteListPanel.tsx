import { createThemeStyles } from './MobileNoteListPanel.styles'
import { MobileCreateNoteButton } from './MobileCreateNoteButton'
import { useMobileNoteListBulkSelection, type MobileNoteListBulkActions } from './useMobileNoteListSelection'
import { useMobileColors, useMobileStyles } from '../../ui/theme/useMobileTheme'
import { useMemo, type ReactNode } from 'react'
import { FolderOpen, MagnifyingGlass } from 'phosphor-react-native'
import { FlatList, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button } from '../ui/button'
import { Text } from '../ui/text'
import { mobileCopy, mobileText } from '../../i18n/mobileText'
import { MobileLayoutProbeReadout } from '../../qa/MobileLayoutProbeReadout'
import { useMobileLayoutProbe, type MobileLayoutProbe } from '../../qa/mobileLayoutProbe'
import { MobileChip } from '../../ui/MobileChip'
import { MobileButton } from '../../ui/MobileButton'
import { MobileIconButton } from '../../ui/MobileIconButton'
import { MobileListRow } from '../../ui/MobileListRow'
import { MobilePanel, MobileToolbar, MobileToolbarSpacer, MobileToolbarTitle } from '../../ui/MobilePanel'
import { desktopPanelParity, desktopToolbarActionParity } from '../../ui/desktopParity'
import { mobileNoteRowChips } from '../../workspace/mobileNoteDisplay'
import type { MobileNoteListFilter } from '../../workspace/mobileNoteFilters'
import type { MobileNeighborhood, MobileNeighborhoodGroup } from '../../workspace/mobileNeighborhood'
import type { MobileNote, MobilePropertyDisplayMode, MobileTypeDefinitions } from '../../workspace/mobileWorkspaceModel'
import { MobileNoteListBulkActionBar } from './MobileNoteListBulkActionBar'
import { MobileSwipeableNoteRow, type MobileNoteRowActions } from './MobileSwipeableNoteRow'
import { MobileTypeIcon } from './MobileWorkspaceIcons'
import {
  mobileNoteListEmptyStateChrome,
  mobileNoteListFilterOptions,
  mobileNoteListToolbarChrome,
} from './MobileNoteListPanelChrome'
import { mobileNoteListSelectionIsArchived } from './mobileNoteListBulkSelection'
import { noteTypeSoftColor } from './mobileWorkspaceTone'

type MobileNoteListPanelProps = {
  bulkActions?: MobileNoteListBulkActions
  compact: boolean
  displayPropertyKeys?: string[]
  emptyVault?: boolean
  fullWidth?: boolean
  leading?: ReactNode
  toolbarTrailing?: ReactNode
  showCreateAction?: boolean
  layoutProbe?: boolean
  neighborhood?: MobileNeighborhood | null
  noteListFilter?: MobileNoteListFilter
  noteListFilterCounts?: Record<MobileNoteListFilter, number>
  noteListFilterVisible?: boolean
  notes: MobileNote[]
  onOpenCreateNote: () => void
  onOpenSearch: () => void
  onOpenVault?: () => void
  onNoteListFilterChange?: (filter: MobileNoteListFilter) => void
  onSelectNote: (noteId: string) => void
  onToggleNoteFavorite?: (noteId: string) => void
  propertyDisplayModes?: Record<string, MobilePropertyDisplayMode> | null
  searchQuery?: string
  selectedNoteId: string | null
  subtitle: string
  title?: string
  typeDefinitions?: MobileTypeDefinitions
}

export function MobileNoteListPanel(props: MobileNoteListPanelProps) {
  const { styles, mobileColors } = useMobileStyles(createThemeStyles)
  const { bottom } = useSafeAreaInsets()
  const {
    bulkActions,
    compact,
    displayPropertyKeys = [],
    emptyVault = false,
    fullWidth = false,
    leading,
    toolbarTrailing,
    showCreateAction = true,
    layoutProbe: layoutProbeEnabled = false,
    neighborhood = null,
    noteListFilter = 'open',
    noteListFilterCounts = { archived: 0, open: 0 },
    noteListFilterVisible = false,
    notes,
    onOpenCreateNote,
    onOpenSearch,
    onOpenVault,
    onNoteListFilterChange,
    onSelectNote,
    propertyDisplayModes,
    searchQuery,
    selectedNoteId,
    title = mobileCopy.inbox,
    typeDefinitions,
  } = props
  const activeNoteId = selectedNoteId ?? notes[0]?.id ?? null
  const layoutProbe = useMobileLayoutProbe(layoutProbeEnabled)
  const bulkSelection = useMobileNoteListBulkSelection({
    bulkActions,
    neighborhood,
    notes,
    onSelectNote,
  })

  return (
    <MobilePanel {...layoutProbe.probe('noteList.panel')} style={[panelStyles.panel, compact ? panelStyles.panelCompact : null, fullWidth ? panelStyles.panelFullWidth : null, { paddingBottom: bottom }]} testID="note-list-panel">
      <MobileToolbar testID="note-list-toolbar">
        {leading}
        <View style={styles.toolbarTitleBlock}>
          <MobileToolbarTitle testID="note-list-toolbar-title" title={title} />
        </View>
        <MobileToolbarSpacer />
        {toolbarTrailing ?? <MobileIconButton accessibilityLabel={mobileCopy.searchNotes} testID={mobileNoteListToolbarChrome.actionTestIds[0]} onPress={onOpenSearch}>
          <MagnifyingGlass color={mobileColors.textMuted} size={desktopToolbarActionParity.iconSize} />
        </MobileIconButton>}
      </MobileToolbar>
      {searchQuery ? <SearchPill searchQuery={searchQuery} /> : null}
      <View style={styles.listBody}>
        <NoteListContent
          rowActions={noteListRowActions(props)}
          activeNoteId={activeNoteId}
          bulkSelection={bulkSelection}
          displayPropertyKeys={displayPropertyKeys}
          emptyVault={emptyVault}
          layoutProbe={layoutProbe.probe}
          neighborhood={neighborhood}
          notes={notes}
          onSelectNote={onSelectNote}
          onOpenVault={onOpenVault}
          propertyDisplayModes={propertyDisplayModes}
          searchQuery={searchQuery}
          selectedNoteId={selectedNoteId}
          typeDefinitions={typeDefinitions}
        />
        <MobileCreateNoteButton visible={showCreateAction && bulkSelection.selectedNotes.length === 0} onPress={onOpenCreateNote} />
      </View>
      <BulkSelectionBar bulkActions={bulkActions} bulkSelection={bulkSelection} />
      {noteListFilterVisible && onNoteListFilterChange ? (
        <NoteListFilterPills
          active={noteListFilter}
          counts={noteListFilterCounts}
          onChange={onNoteListFilterChange}
        />
      ) : null}
      {layoutProbeEnabled ? <MobileLayoutProbeReadout metrics={layoutProbe.metrics} testID="note-list-layout-metrics" /> : null}
    </MobilePanel>
  )
}

function noteListRowActions(props: MobileNoteListPanelProps): MobileNoteRowActions | undefined {
  const { bulkActions, onToggleNoteFavorite } = props
  if (!bulkActions || !onToggleNoteFavorite) return undefined
  return { ...bulkActions, onToggleFavorite: onToggleNoteFavorite }
}

type NoteListFilterPillsProps = {
  active: MobileNoteListFilter
  counts: Record<MobileNoteListFilter, number>
  onChange: (filter: MobileNoteListFilter) => void
}

function NoteListFilterPills({ active, counts, onChange }: NoteListFilterPillsProps) {
  const { styles } = useMobileStyles(createThemeStyles)
  return (
    <View accessibilityRole="tablist" style={styles.filterBar} testID="note-list-filter-pills">
      {mobileNoteListFilterOptions.map((option) => {
        const selected = active === option.value
        return (
          <Button
            accessibilityLabel={mobileText(option.labelKey)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            className="shadow-none"
            key={option.value}
            size="sm"
            style={[
              styles.filterPill,
              selected ? styles.filterPillSelected : null,
            ]}
            testID={`filter-pill-${option.value}`}
            variant="ghost"
            onPress={() => onChange(option.value)}
          >
            <Text style={[styles.filterPillText, selected ? styles.filterPillTextSelected : null]}>
              {mobileText(option.labelKey)}
            </Text>
            <Text style={[styles.filterPillCount, selected ? styles.filterPillCountSelected : null]}>
              {counts[option.value].toLocaleString()}
            </Text>
          </Button>
        )
      })}
    </View>
  )
}

type NoteListContentProps = {
  rowActions?: MobileNoteRowActions
  activeNoteId: string | null
  bulkSelection: ReturnType<typeof useMobileNoteListBulkSelection>
  displayPropertyKeys: string[]
  emptyVault: boolean
  layoutProbe: MobileLayoutProbe
  neighborhood: MobileNeighborhood | null
  notes: MobileNote[]
  onOpenVault?: () => void
  onSelectNote: (noteId: string) => void
  propertyDisplayModes?: Record<string, MobilePropertyDisplayMode> | null
  searchQuery?: string
  selectedNoteId: string | null
  typeDefinitions?: MobileTypeDefinitions
}

function NoteListContent(props: NoteListContentProps) {
  const { styles } = useMobileStyles(createThemeStyles)
  const {
    activeNoteId,
    bulkSelection,
    displayPropertyKeys,
    emptyVault,
    layoutProbe,
    neighborhood,
    notes,
    onOpenVault,
    onSelectNote,
    propertyDisplayModes,
    searchQuery,
    selectedNoteId,
    typeDefinitions,
  } = props
  if (neighborhood) {
    return (
      <NeighborhoodNoteList
        rowActions={props.rowActions}
        activeNoteId={activeNoteId}
        displayPropertyKeys={displayPropertyKeys}
        layoutProbe={layoutProbe}
        neighborhood={neighborhood}
        propertyDisplayModes={propertyDisplayModes}
        typeDefinitions={typeDefinitions}
        onSelectNote={onSelectNote}
      />
    )
  }

  if (notes.length === 0) {
    return <NoteListEmptyState emptyVault={emptyVault} searchQuery={searchQuery} onOpenVault={onOpenVault} />
  }

  return (
    <FlatList
      {...layoutProbe('noteList.list')}
      contentContainerStyle={styles.listContent}
      data={notes}
      extraData={bulkSelection.rowExtraData(selectedNoteId)}
      initialNumToRender={16}
      keyExtractor={(note) => note.id}
      renderItem={({ item: note }) => <NoteRow {...{
        rowActions: bulkSelection.selectedNotes.length === 0 ? props.rowActions : undefined,
        activeNoteId,
        displayPropertyKeys,
        layoutProbe,
        multiSelected: bulkSelection.selectedNoteIds.has(note.id),
        note,
        onBeginSelection: bulkSelection.beginSelection,
        propertyDisplayModes,
        typeDefinitions,
        onSelectNote: bulkSelection.pressNote,
      }} />}
      removeClippedSubviews
      showsVerticalScrollIndicator={false}
      windowSize={5}
    />
  )
}

function BulkSelectionBar({
  bulkActions,
  bulkSelection,
}: {
  bulkActions?: MobileNoteListBulkActions
  bulkSelection: ReturnType<typeof useMobileNoteListBulkSelection>
}) {
  if (!bulkActions || bulkSelection.selectedNotes.length === 0) return null

  return (
    <MobileNoteListBulkActionBar
      archivedMode={mobileNoteListSelectionIsArchived(bulkSelection.selectedNotes)}
      count={bulkSelection.selectedNotes.length}
      onArchiveToggle={bulkSelection.archiveSelected}
      onClear={bulkSelection.clearSelection}
      onDelete={bulkSelection.deleteSelected}
      onOrganize={bulkSelection.organizeSelected}
    />
  )
}

type NeighborhoodRow =
  | { id: string; kind: 'source'; note: MobileNote }
  | { group: MobileNeighborhoodGroup; id: string; kind: 'header' }
  | { id: string; kind: 'note'; note: MobileNote }

function NeighborhoodNoteList({
  rowActions,
  activeNoteId,
  displayPropertyKeys,
  layoutProbe,
  neighborhood,
  onSelectNote,
  propertyDisplayModes,
  typeDefinitions,
}: {
  rowActions?: MobileNoteRowActions
  activeNoteId: string | null
  displayPropertyKeys: string[]
  layoutProbe: MobileLayoutProbe
  neighborhood: MobileNeighborhood
  onSelectNote: (noteId: string) => void
  propertyDisplayModes?: Record<string, MobilePropertyDisplayMode> | null
  typeDefinitions?: MobileTypeDefinitions
}) {
  const { styles } = useMobileStyles(createThemeStyles)
  const rows = useMemo(() => neighborhoodRows(neighborhood), [neighborhood])

  return (
    <FlatList
      contentContainerStyle={styles.listContent}
      data={rows}
      extraData={activeNoteId}
      initialNumToRender={18}
      keyExtractor={(row) => row.id}
      renderItem={({ item }) => neighborhoodRow({
        rowActions,
        activeNoteId,
        displayPropertyKeys,
        item,
        layoutProbe,
        propertyDisplayModes,
        typeDefinitions,
        onSelectNote,
      })}
      removeClippedSubviews
      showsVerticalScrollIndicator={false}
      windowSize={5}
    />
  )
}

function neighborhoodRows(neighborhood: MobileNeighborhood): NeighborhoodRow[] {
  return [
    { id: `source-${neighborhood.source.id}`, kind: 'source', note: neighborhood.source },
    ...neighborhood.groups.flatMap((group) => [
      { group, id: `group-${group.id}`, kind: 'header' } as const,
      ...group.notes.map((note) => ({ id: `group-${group.id}-${note.id}`, kind: 'note' as const, note })),
    ]),
  ]
}

function neighborhoodRow({
  rowActions,
  activeNoteId,
  displayPropertyKeys,
  item,
  layoutProbe,
  onSelectNote,
  propertyDisplayModes,
  typeDefinitions,
}: {
  rowActions?: MobileNoteRowActions
  activeNoteId: string | null
  displayPropertyKeys: string[]
  item: NeighborhoodRow
  layoutProbe: MobileLayoutProbe
  onSelectNote: (noteId: string) => void
  propertyDisplayModes?: Record<string, MobilePropertyDisplayMode> | null
  typeDefinitions?: MobileTypeDefinitions
}) {
  if (item.kind === 'header') return <RelationshipGroupHeader group={item.group} />

  return <NoteRow {...{
    rowActions,
    activeNoteId,
    displayPropertyKeys,
    forceSelected: item.kind === 'source',
    layoutProbe,
    note: item.note,
    propertyDisplayModes,
    typeDefinitions,
    onSelectNote,
  }} />
}

type NoteRowProps = {
  rowActions?: MobileNoteRowActions
  activeNoteId: string | null
  displayPropertyKeys: string[]
  forceSelected?: boolean
  layoutProbe: MobileLayoutProbe
  multiSelected?: boolean
  note: MobileNote
  onBeginSelection?: (noteId: string) => void
  onSelectNote: (noteId: string) => void
  propertyDisplayModes?: Record<string, MobilePropertyDisplayMode> | null
  typeDefinitions?: MobileTypeDefinitions
}

function NoteRow(props: NoteRowProps) {
  const colors = useMobileColors()
  const {
    activeNoteId,
    displayPropertyKeys,
    forceSelected = false,
    layoutProbe,
    multiSelected = false,
    note,
    onBeginSelection,
    onSelectNote,
    propertyDisplayModes,
    typeDefinitions,
  } = props
  return (
    <MobileSwipeableNoteRow actions={props.rowActions} note={note}>
    <MobileListRow
      chips={<NoteRowChips displayPropertyKeys={displayPropertyKeys} note={note} propertyDisplayModes={propertyDisplayModes} typeDefinitions={typeDefinitions} />}
      layoutProbe={layoutProbe}
      metricId={`noteList.item.${note.id}`}
      multiSelected={multiSelected}
      selected={forceSelected || note.id === activeNoteId}
      selectedBackgroundColor={noteTypeSoftColor(note.typeTone, colors)}
      subtitle={note.snippet}
      testID={`note-row-${note.id}`}
      title={note.title}
      trailing={(
        <MobileTypeIcon
          fileKind={note.fileKind}
          size={16}
          tone={note.typeTone}
          type={note.type}
          typeDefinitions={typeDefinitions}
        />
      )}
      onLongPress={onBeginSelection ? () => onBeginSelection(note.id) : undefined}
      onPress={() => onSelectNote(note.id)}
    />
    </MobileSwipeableNoteRow>
  )
}

function RelationshipGroupHeader({ group }: { group: MobileNeighborhoodGroup }) {
  const { styles } = useMobileStyles(createThemeStyles)
  return (
    <View style={styles.groupHeader} testID={`relationship-group-${group.id}`}>
      <Text style={styles.groupLabel}>{group.label}</Text>
      <Text style={styles.groupCount}>{group.notes.length}</Text>
    </View>
  )
}

function SearchPill({ searchQuery }: { searchQuery: string }) {
  const { styles, mobileColors } = useMobileStyles(createThemeStyles)
  return (
    <View style={styles.searchPill}>
      <MagnifyingGlass color={mobileColors.textMuted} size={16} />
      <Text numberOfLines={1} style={styles.searchText}>{searchQuery}</Text>
    </View>
  )
}

function NoteListEmptyState({
  emptyVault,
  onOpenVault,
  searchQuery,
}: {
  emptyVault: boolean
  onOpenVault?: () => void
  searchQuery?: string
}) {
  const { styles, mobileColors } = useMobileStyles(createThemeStyles)
  const chrome = mobileNoteListEmptyStateChrome({ emptyVault, searchQuery })

  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>{mobileText(chrome.titleKey)}</Text>
      {chrome.detailKey ? <Text style={styles.emptyText}>{mobileText(chrome.detailKey)}</Text> : null}
      {chrome.action === 'openVault' && onOpenVault ? (
        <MobileButton
          icon={<FolderOpen color={mobileColors.text} size={16} />}
          label={mobileText('status.vault.openLocal')}
          style={styles.emptyAction}
          testID="note-list-empty-open-vault"
          onPress={onOpenVault}
        />
      ) : null}
    </View>
  )
}

function NoteRowChips({
  displayPropertyKeys,
  note,
  propertyDisplayModes,
  typeDefinitions,
}: {
  displayPropertyKeys: string[]
  note: MobileNote
  propertyDisplayModes?: Record<string, MobilePropertyDisplayMode> | null
  typeDefinitions?: MobileTypeDefinitions
}) {
  const { styles } = useMobileStyles(createThemeStyles)
  const chips = mobileNoteRowChips(note, displayPropertyKeys, typeDefinitions, propertyDisplayModes)
  if (chips.length === 0) return null

  return (
    <View style={styles.chipRow}>
      {chips.map((chip, index) => (
        <MobileChip density="list" key={`${chip.label}-${index}`} label={chip.label} tone={chip.tone} />
      ))}
    </View>
  )
}

const panelStyles = StyleSheet.create({
  panel: {
    alignSelf: 'stretch',
    borderRightWidth: StyleSheet.hairlineWidth,
    height: '100%',
    width: desktopPanelParity.noteListWidth,
  },
  panelCompact: {
    width: 336,
  },
  panelFullWidth: {
    width: '100%',
  },
})
