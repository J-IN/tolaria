import { mobilePalettes, type MobileColors } from '../../ui/theme/mobilePalette'
import { mobileMetrics, type MobileMetrics } from '../../ui/mobileMetrics'
import type { MobileNoteWidth } from '../../workspace/mobileWorkspaceModel'

type CssDeclaration = readonly [property: string, value: string | number]

export function mobileTentapEditorCss(
  compact: boolean,
  noteWidth: MobileNoteWidth | null | undefined = null,
  colors: MobileColors = mobilePalettes.light,
  metrics: MobileMetrics = mobileMetrics[1],
): string {
  const { editor: desktopEditorParity, space: mobileSpace } = metrics
  const horizontalPadding = compact ? mobileSpace.xl : desktopEditorParity.contentPaddingHorizontal
  const h1FontSize = compact ? metrics.size(30) : desktopEditorParity.h1FontSize
  const h1LineHeight = compact ? metrics.size(36) : desktopEditorParity.h1LineHeight
  const wide = noteWidth === 'wide'

  return [
    ...documentRules(colors, metrics, { horizontalPadding, wide }),
    ...headingRules(colors, metrics, { h1FontSize, h1LineHeight }),
    ...blockRules(colors, metrics),
    ...tableRules(colors, metrics),
  ].join('\n')
}

function documentRules(mobileColors: MobileColors, metrics: MobileMetrics, { horizontalPadding, wide }: { horizontalPadding: number; wide: boolean }): string[] {
  const desktopEditorParity = metrics.editor
  const widePadding = `clamp(${metrics.size(24)}px, 4vw, ${metrics.size(72)}px)`
  return [
    cssRule('html, body', [
      ['background', mobileColors.editor],
      ['color', mobileColors.text],
      ['font-family', '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif'],
      ['font-size', `${desktopEditorParity.bodyFontSize}px`],
      ['line-height', `${desktopEditorParity.bodyLineHeight}px`],
      ['margin', 0],
      ['padding', 0],
    ]),
    cssRule('#root > div:first-child', [
      ['overflow-x', 'hidden'],
    ]),
    cssRule('.ProseMirror', [
      ['box-sizing', 'border-box'],
      ['caret-color', mobileColors.primary],
      ['margin', wide ? '0' : '0 auto'],
      ['max-width', wide ? 'none' : `${desktopEditorParity.contentMaxWidth}px`],
      ['min-height', '100vh'],
      ['outline', 'none'],
      ['overflow-wrap', 'anywhere'],
      ['padding', `${desktopEditorParity.contentPaddingVertical}px ${wide ? widePadding : `${horizontalPadding}px`} ${metrics.size(96)}px`],
      ['width', '100%'],
    ]),
  ]
}

function headingRules(mobileColors: MobileColors, metrics: MobileMetrics, { h1FontSize, h1LineHeight }: { h1FontSize: number; h1LineHeight: number }): string[] {
  const desktopEditorParity = metrics.editor
  return [
    cssRule('.ProseMirror h1', [
      ['border-bottom', `1px solid ${mobileColors.border}`],
      ['color', mobileColors.text],
      ['font-size', `${h1FontSize}px`],
      ['font-weight', 700],
      ['line-height', `${h1LineHeight}px`],
      ['margin', `0 0 ${desktopEditorParity.h1MarginBottom}px`],
      ['padding-bottom', `${desktopEditorParity.h1PaddingBottom}px`],
    ]),
    headingRule(mobileColors, '.ProseMirror h2', {
      fontSize: desktopEditorParity.h2FontSize,
      lineHeight: desktopEditorParity.h2LineHeight,
      marginBottom: desktopEditorParity.h2MarginBottom,
      marginTop: desktopEditorParity.h2MarginTop,
    }),
    headingRule(mobileColors, '.ProseMirror h3', {
      fontSize: desktopEditorParity.h3FontSize,
      lineHeight: desktopEditorParity.h3LineHeight,
      marginBottom: desktopEditorParity.h3MarginBottom,
      marginTop: desktopEditorParity.h3MarginTop,
    }),
    headingRule(mobileColors, '.ProseMirror h4', {
      fontSize: desktopEditorParity.h4FontSize,
      lineHeight: desktopEditorParity.h4LineHeight,
      marginBottom: desktopEditorParity.h4MarginBottom,
      marginTop: desktopEditorParity.h4MarginTop,
    }),
  ]
}

function blockRules(mobileColors: MobileColors, metrics: MobileMetrics): string[] {
  const { editor: desktopEditorParity, space: mobileSpace } = metrics
  return [
    cssRule('.ProseMirror p', [
      ['margin', `0 0 ${desktopEditorParity.paragraphSpacing}px`],
    ]),
    cssRule('.ProseMirror blockquote', [
      ['border-left', `3px solid ${mobileColors.primary}`],
      ['color', mobileColors.textMuted],
      ['font-style', 'italic'],
      ['margin', `${desktopEditorParity.quoteMarginVertical}px 0`],
      ['padding-left', `${desktopEditorParity.quotePaddingLeft}px`],
    ]),
    cssRule('.ProseMirror code', [
      ['background', mobileColors.graySoft],
      ['border-radius', '4px'],
      ['font-family', 'Menlo, monospace'],
      ['font-size', `${desktopEditorParity.inlineCodeFontSize}px`],
      ['padding', `${desktopEditorParity.inlineCodePaddingVertical}px ${desktopEditorParity.inlineCodePaddingHorizontal}px`],
    ]),
    cssRule('.ProseMirror pre', [
      ['background', mobileColors.graySoft],
      ['border-radius', '6px'],
      ['overflow-x', 'auto'],
      ['padding', `${mobileSpace.md}px`],
    ]),
    cssRule('.ProseMirror ul, .ProseMirror ol', [
      ['margin', `0 0 ${desktopEditorParity.paragraphSpacing}px`],
      ['padding-left', `${desktopEditorParity.listIndentSize + desktopEditorParity.listPaddingLeft}px`],
    ]),
    cssRule('.ProseMirror li', [
      ['margin', `${desktopEditorParity.listItemSpacing}px 0`],
    ]),
    cssRule('.ProseMirror hr', [
      ['border', 0],
      ['border-top', `${desktopEditorParity.horizontalRuleThickness}px solid ${mobileColors.border}`],
      ['margin', `${desktopEditorParity.horizontalRuleMarginVertical}px 0`],
    ]),
  ]
}

function tableRules(mobileColors: MobileColors, metrics: MobileMetrics): string[] {
  const { editor: desktopEditorParity, space: mobileSpace } = metrics
  return [
    cssRule('.ProseMirror .tableWrapper', [
      ['max-width', '100%'],
      ['overflow-x', 'auto'],
      ['overscroll-behavior-x', 'contain'],
    ]),
    cssRule('.ProseMirror table', [
      ['border-collapse', 'collapse'],
      ['font-size', `${desktopEditorParity.tableFontSize}px`],
      ['margin', `${mobileSpace.md}px 0`],
      ['width', '100%'],
    ]),
    cssRule('.ProseMirror th, .ProseMirror td', [
      ['border', `1px solid ${mobileColors.border}`],
      ['padding', `${desktopEditorParity.tableCellPaddingVertical}px ${desktopEditorParity.tableCellPaddingHorizontal}px`],
      ['text-align', 'left'],
    ]),
    cssRule('.ProseMirror a', [
      ['color', mobileColors.primary],
    ]),
  ]
}

function headingRule(
  mobileColors: MobileColors,
  selector: string,
  tokens: { fontSize: number; lineHeight: number; marginBottom: number; marginTop: number },
): string {
  return cssRule(selector, [
    ['color', mobileColors.text],
    ['font-size', `${tokens.fontSize}px`],
    ['font-weight', 700],
    ['line-height', `${tokens.lineHeight}px`],
    ['margin', `${tokens.marginTop}px 0 ${tokens.marginBottom}px`],
  ])
}

function cssRule(selector: string, declarations: readonly CssDeclaration[]): string {
  const body = declarations.map(([property, value]) => `      ${property}: ${value};`).join('\n')
  return `    ${selector} {\n${body}\n    }`
}
