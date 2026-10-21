import { expect, it } from 'vitest'
import { mobilePaneFooterFrame, mobilePaneFooterRowHeight } from './mobilePaneFooterLayout'

it.each([0, 21, 34])('keeps the same control row above a %s-point home-indicator inset', bottom => {
  const frame = mobilePaneFooterFrame(bottom)
  expect(frame.height).toBe(48 + bottom)
  expect(frame.paddingBottom).toBe(bottom)
  expect(Number(frame.height) - Number(frame.paddingBottom)).toBe(mobilePaneFooterRowHeight)
  expect(frame.alignItems).toBe('center')
  expect(frame.flexShrink).toBe(0)
})

it('does not add a second inset when the pane owns the clearance or the keyboard covers it', () => {
  expect(mobilePaneFooterFrame()).toEqual(mobilePaneFooterFrame(0))
  expect(mobilePaneFooterFrame().height).toBeGreaterThanOrEqual(44)
})
