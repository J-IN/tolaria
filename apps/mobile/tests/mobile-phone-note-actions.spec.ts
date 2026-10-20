import { openPhoneProperties, openPhoneSidebar, phoneBack } from './mobile-panel-navigation'
import { expect, test, type Page } from '@playwright/test'
import { createTitledNoteFromQuickOpen } from './mobile-note-create-actions'

test.describe('phone note action parity', () => {
  test('creates a note from an unmatched phone quick open query', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'phone-portrait', 'Phone quick-open create runs on the phone note-list shell.')

    const title = 'Phone Quick Open Draft'

    await page.goto('/')
    await page.getByTestId('note-list-search-action').click()
    await page.getByTestId('workspace-search-input').fill(title)
    await expect(page.getByTestId('workspace-search-results').getByText('No matching notes')).toBeVisible()
    await expect(page.getByTestId('workspace-search-create-note')).toHaveText(`Create note "${title}"`)
    await page.getByTestId('workspace-search-create-note').click()

    await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()
    await expect(page.getByTestId(`note-row-${noteRowSlug(title)}.md`)).toBeVisible()
  })

  test('exercises phone More-sheet note commands', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'phone-portrait', 'Phone note actions run on the phone editor shell.')

    await createPhoneNote(page, 'Phone Action Source')
    await changePhoneNoteType(page)
    await addAndRemovePhoneNoteFavorite(page)
    await setAndRemovePhoneNoteIcon(page)
    await moveAndRenamePhoneNote(page)
    await togglePhoneNoteWidth(page)
    await archiveOrganizeAndDeletePhoneNote(page)
  })
})

async function createPhoneNote(page: Page, title: string) {
  await page.goto('/')
  await createTitledNoteFromQuickOpen(page, title)
  await page.getByTestId(`note-row-${noteRowSlug(title)}.md`).click()
  await expect(page.getByTestId('phone-editor-screen')).toBeVisible()
  await expectBodyOnlyPhoneNote(page, title)
}

async function changePhoneNoteType(page: Page) {
  await page.getByTestId('editor-more-action').click()
  await page.getByTestId('workspace-action-change-note-type').click()
  await expect(page.getByTestId('workspace-change-type-input')).toBeVisible()
  await page.getByTestId('workspace-change-type-input').fill('Procedure')
  await page.getByTestId('workspace-action-sheet-changeNoteType').getByRole('button', { name: 'Save' }).click()
  await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()
  await openPhoneProperties(page)
  await expect(page.getByTestId('property-row-type')).toContainText('Procedure')
  await page.getByTestId('phone-top-bar').getByTestId('phone-back-action').click()
  await expect(page.getByTestId('phone-editor-screen')).toBeVisible()
}

async function addAndRemovePhoneNoteFavorite(page: Page) {
  await page.getByTestId('editor-more-action').click()
  await expect(page.getByText('Add to Favorites')).toBeVisible()
  await page.getByTestId('workspace-action-toggle-favorite').click()
  await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()

  await phoneBack(page)
  await openPhoneSidebar(page)
  await expect(page.getByTestId('sidebar-item-favorite-phone-action-source.md')).toBeVisible()
  await page.getByTestId('sidebar-item-all-notes').click()
  await phoneActionRow(page).click()

  await page.getByTestId('editor-more-action').click()
  await expect(page.getByText('Remove from Favorites')).toBeVisible()
  await page.getByTestId('workspace-action-toggle-favorite').click()
  await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()

  await phoneBack(page)
  await openPhoneSidebar(page)
  await expect(page.getByTestId('sidebar-item-favorite-phone-action-source.md')).toBeHidden()
  await page.getByTestId('sidebar-item-all-notes').click()
  await phoneActionRow(page).click()
}

async function setAndRemovePhoneNoteIcon(page: Page) {
  await expect(page.getByTestId('editor-toolbar-note-icon')).toBeHidden()
  await page.getByTestId('editor-more-action').click()
  await page.getByTestId('workspace-action-set-note-icon').click()
  await expect(page.getByTestId('workspace-note-icon-input')).toHaveValue('')
  await page.getByTestId('workspace-note-icon-input').fill('rocket')
  await page.getByTestId('workspace-action-sheet-setNoteIcon').getByRole('button', { name: 'Save' }).click()
  await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()
  await expect(page.getByTestId('editor-toolbar-note-icon')).toBeVisible()

  await openPhoneProperties(page)
  await expect(page.getByTestId('property-row-icon')).toContainText('rocket')
  await page.getByTestId('property-row-icon-edit').click()
  await expect(page.getByTestId('workspace-action-sheet-toolbar')).toContainText('icon')
  await expect(page.getByTestId('workspace-property-value-input')).toHaveValue('rocket')
  await page.getByTestId('workspace-property-value-input').fill('sparkle')
  await page.getByTestId('workspace-action-sheet-editProperty').getByRole('button', { name: 'Save' }).click()
  await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()
  await expect(page.getByTestId('property-row-icon')).toContainText('sparkle')
  await page.getByTestId('phone-top-bar').getByTestId('phone-back-action').click()
  await expect(page.getByTestId('phone-editor-screen')).toBeVisible()

  await page.getByTestId('editor-more-action').click()
  await expect(page.getByTestId('workspace-action-remove-note-icon')).toBeVisible()
  await page.getByTestId('workspace-action-remove-note-icon').click()
  await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()
  await expect(page.getByTestId('editor-toolbar-note-icon')).toBeHidden()
}

async function moveAndRenamePhoneNote(page: Page) {
  await page.getByTestId('editor-more-action').click()
  await page.getByTestId('workspace-action-group-file').click()
  await page.getByTestId('workspace-action-move-note-folder').click()
  await expect(page.getByTestId('workspace-move-folder-input')).toBeVisible()
  await page.getByTestId('workspace-move-folder-input').fill('Tolaria')
  await page.getByTestId('workspace-move-folder-suggestion-tolaria-mobile-ui').click()
  await page.getByTestId('workspace-action-sheet-moveNoteToFolder').getByRole('button', { name: 'Save' }).click()
  await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()

  await page.getByTestId('editor-more-action').click()
  await page.getByTestId('workspace-action-group-file').click()
  await page.getByTestId('workspace-action-rename-file').click()
  await expect(page.getByTestId('workspace-rename-file-input')).toHaveValue('phone-action-source')
  await page.getByTestId('workspace-rename-file-input').fill('phone-action-renamed')
  await page.getByTestId('workspace-action-sheet-renameNoteFile').getByRole('button', { name: 'Save' }).click()
  await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()
  await expect(page.getByTestId('editor-toolbar-title')).toHaveText('phone-action-renamed.md')
  await expect(page.getByTestId('editor-title')).toBeHidden()
}

async function togglePhoneNoteWidth(page: Page) {
  await page.getByTestId('editor-more-action').click()
  await expect(page.getByText('Switch to wide note width')).toBeVisible()
  await page.getByTestId('workspace-action-toggle-note-width').click()
  await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()

  await page.getByTestId('editor-more-action').click()
  await expect(page.getByText('Switch to normal note width')).toBeVisible()
  await page.getByTestId('workspace-action-sheet-toolbar').getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()
}

async function archiveOrganizeAndDeletePhoneNote(page: Page) {
  await page.getByTestId('editor-more-action').click()
  await page.getByTestId('workspace-action-archive-note').click()
  await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()
  await phoneBack(page)
  await expect(phoneActionRow(page)).toBeHidden()

  await openPhoneSidebar(page)
  await page.getByTestId('sidebar-item-archive').click()
  await expect(page.getByTestId('note-list-toolbar-title')).toHaveText('Archive')
  await phoneActionRow(page).click()
  await page.getByTestId('editor-more-action').click()
  await expect(page.getByText('Unarchive Note')).toBeVisible()
  await page.getByTestId('workspace-action-archive-note').click()
  await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()
  await phoneBack(page)
  await expect(phoneActionRow(page)).toBeHidden()

  await openPhoneSidebar(page)
  await page.getByTestId('sidebar-item-all-notes').click()
  await phoneActionRow(page).click()
  await page.getByTestId('editor-more-action').click()
  await page.getByTestId('workspace-action-organize-note').click()
  await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()
  await phoneBack(page)
  await expect(phoneActionRow(page)).toBeVisible()

  await phoneActionRow(page).click()
  await page.getByTestId('editor-more-action').click()
  await page.getByTestId('workspace-action-delete-note').click()
  await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()
  await expect(page.getByTestId('phone-editor-screen')).toBeVisible()
  await expect(page.getByTestId('editor-toolbar-title')).toHaveText('Workflow Orchestration Essay.md')
  await phoneBack(page)
  await expect(page.getByTestId('phone-note-list-screen')).toBeVisible()
  await expect(phoneActionRow(page)).toBeHidden()
}

async function expectBodyOnlyPhoneNote(page: Page, title: string) {
  await expect(page.getByTestId('editor-toolbar-title')).toHaveText(`${noteRowSlug(title)}.md`)
  await expect(page.getByTestId('editor-title')).toBeHidden()
}

function phoneActionRow(page: Page) {
  return page.getByRole('button', { name: 'Phone Action Source' }).first()
}

function noteRowSlug(title: string) {
  return title.trim().toLowerCase().replace(/\s+/gu, '-')
}
