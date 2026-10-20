import { expect, test } from '@playwright/test'

const mobileFileRevealAttemptsGlobalKey = '__TOLARIA_MOBILE_FILE_REVEAL_ATTEMPTS__'

test.describe('mobile note reveal actions', () => {
  test('reveals the selected note file from mobile more actions', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'tablet-landscape', 'Reveal-file overflow checks use the full-width tablet layout.')

    await page.goto('/')
    await page.getByTestId('editor-more-action').click()
    await page.getByTestId('workspace-action-group-file').click()
    await expect(page.getByText('Reveal in Finder')).toBeVisible()
    await page.getByTestId('workspace-action-reveal-file').click()

    await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()
    await expect(page.evaluate((key) => {
      const attempts = (window as unknown as Record<string, unknown>)[key]
      return Array.isArray(attempts) ? attempts.at(-1) : null
    }, mobileFileRevealAttemptsGlobalKey)).resolves.toEqual({
      noteId: 'workflow-orchestration',
      path: 'Tolaria/Mobile UI/Workflow Orchestration Essay.md',
      title: 'Workflow Orchestration Essay',
    })
  })
})
