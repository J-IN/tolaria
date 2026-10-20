import { expect, type Page } from '@playwright/test'

export async function swipePanel(page: Page, direction: 'left' | 'right') {
  const viewport = page.viewportSize()
  if (!viewport) throw new Error('Panel navigation requires a viewport.')
  const startX = direction === 'right' ? 12 : viewport.width - 12
  const endX = direction === 'right' ? viewport.width * 0.8 : viewport.width * 0.2
  await dragPanel(page, { x: startX, y: 220 }, { x: endX, y: 220 })
}

export async function dragPanel(page: Page, start: { x: number; y: number }, end: { x: number; y: number }) {
  const client = await page.context().newCDPSession(page)
  try {
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] })
    for (let step = 1; step <= 12; step += 1) {
      const point = { x: start.x + (end.x - start.x) * step / 12, y: start.y + (end.y - start.y) * step / 12 }
      await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point] })
      await page.waitForTimeout(30)
    }
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  } finally {
    await client.detach()
  }
}

export async function openPhoneSidebar(page: Page) {
  if (await phonePanelIsOpen(page, 'phone-sidebar-screen')) return
  await swipePanel(page, 'right')
  await expect(page.getByTestId('phone-sidebar-screen')).toBeInViewport({ ratio: 1 })
}

export async function closePhoneSidebar(page: Page) {
  await swipePanel(page, 'left')
  await expect(page.getByTestId('phone-note-list-screen')).toBeInViewport({ ratio: 1 })
}

export async function openPhoneProperties(page: Page) {
  await expect(page.getByTestId('phone-editor-screen')).toBeInViewport({ ratio: 1 })
  await swipePanel(page, 'left')
  await expect(page.getByTestId('phone-properties-screen')).toBeInViewport({ ratio: 1 })
}

export async function phoneBack(page: Page) {
  const fromProperties = await phonePanelIsOpen(page, 'phone-properties-screen')
  await swipePanel(page, 'right')
  const destination = fromProperties ? 'phone-editor-screen' : 'phone-note-list-screen'
  await expect(page.getByTestId(destination)).toBeInViewport({ ratio: 1 })
}

async function phonePanelIsOpen(page: Page, testID: string) {
  const bounds = await page.getByTestId(testID).boundingBox()
  return Boolean(bounds && Math.abs(bounds.x) < 1)
}

export async function toggleTabletProperties(page: Page) {
  const panel = page.getByTestId('properties-panel')
  const box = await panel.boundingBox()
  const viewport = page.viewportSize()
  if (!viewport) throw new Error('Panel navigation requires a viewport.')
  const visible = Boolean(box && box.x < viewport.width - 1)
  if (visible && box) {
    await hideTabletProperties(page, box.x, viewport.width)
  } else {
    await swipePanel(page, 'left')
  }
  await expect.poll(async () => {
    const bounds = await page.getByTestId('tablet-properties-panel-host').boundingBox()
    return Boolean(bounds && bounds.x < viewport.width - 1)
  }).toBe(!visible)
}

async function hideTabletProperties(page: Page, left: number, width: number) {
  const toolbar = await page.getByTestId('properties-toolbar').boundingBox()
  if (!toolbar) throw new Error('Properties toolbar is unavailable.')
  const y = toolbar.y + toolbar.height / 2
  await dragPanel(page, { x: left + 12, y }, { x: width - 12, y })
}
