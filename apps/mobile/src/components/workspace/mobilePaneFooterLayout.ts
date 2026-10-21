import type { ViewStyle } from 'react-native'

export const mobilePaneFooterRowHeight = 48

/** Call with zero when the pane already owns its safe-area clearance. */
export function mobilePaneFooterFrame(bottom = 0): ViewStyle {
  return {
    height: mobilePaneFooterRowHeight + bottom,
    paddingBottom: bottom,
    alignItems: 'center',
    flexShrink: 0,
  }
}
