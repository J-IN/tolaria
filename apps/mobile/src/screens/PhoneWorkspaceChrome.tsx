import type { ReactNode } from 'react'
import { CaretLeft, Command } from 'phosphor-react-native'
import { View } from 'react-native'
import { Text } from '../components/ui/text'
import { mobileText } from '../i18n/mobileText'
import { MobileIconButton } from '../ui/MobileIconButton'
import { createThemeStyles } from './phoneWorkspaceStyles'
import { useMobileStyles } from '../ui/theme/useMobileTheme'

export function PhoneCommandPaletteButton({ onPress }: { onPress: () => void }) {
  const { mobileColors } = useMobileStyles(createThemeStyles)
  return (
    <MobileIconButton
      accessibilityLabel={mobileText('menu.view.commandPalette')}
      testID="phone-command-palette-action"
      onPress={onPress}
    >
      <Command color={mobileColors.textMuted} size={18} />
    </MobileIconButton>
  )
}

export function PhoneTopBar({
  children,
  onBack,
  title,
}: {
  children?: ReactNode
  onBack: () => void
  title: string
}) {
  const { styles } = useMobileStyles(createThemeStyles)
  return (
    <View style={styles.topBar} testID="phone-top-bar">
      <PhoneBackButton onBack={onBack} />
      <Text numberOfLines={1} style={styles.topBarTitle}>{title}</Text>
      <View style={styles.topBarActions}>{children}</View>
    </View>
  )
}

export function PhoneBackButton({ onBack }: { onBack: () => void }) {
  const { mobileColors } = useMobileStyles(createThemeStyles)
  return <MobileIconButton accessibilityLabel={mobileText('command.navigation.goBack')} testID="phone-back-action" onPress={onBack}>
    <CaretLeft color={mobileColors.textMuted} size={18} />
  </MobileIconButton>
}
