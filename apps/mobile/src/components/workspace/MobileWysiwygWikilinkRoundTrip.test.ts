// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { createTestTentapEditor } from './MobileTentapTestHarness'
import { nativeWysiwygDocumentWithInsertedWikilink } from './MobileWysiwygWikilinkBridgeModel'
import { mobileDocumentBody, mobileDocumentWithBody, mobileMarkdownBodyToTentapHtml, tiptapJsonToMobileMarkdown } from '../../workspace/mobileDocumentContent'
import { mobileWikilinkHref } from '../../workspace/mobileWikilinks'

const disposals: Array<() => void> = []
async function openNote(content: string) {
  const mounted = await createTestTentapEditor(mobileMarkdownBodyToTentapHtml(mobileDocumentBody(content)))
  disposals.push(mounted.dispose)
  return mounted.editor
}

afterEach(async () => {
  for (const dispose of disposals.splice(0)) dispose()
  await new Promise(resolve => setTimeout(resolve, 25))
})

describe('native wikilink persistence', () => {
  it.each(['Projects/Launch', 'A note with spaces'])('preserves %s and its alias after reopening', async target => {
    const source = '---\ntype: Note\ncustom: preserved\n---\n\n# First note\n\n'
    const editor = await openNote(source)
    const json = nativeWysiwygDocumentWithInsertedWikilink({
      json: editor.getJSON(), payload: { target, label: 'Linked note' },
    })
    expect(json).not.toBeNull()
    if (!json) throw new Error('Wikilink insertion failed')
    editor.commands.setContent(editor.schema.nodeFromJSON(json))
    expect(editor.getHTML()).toContain(mobileWikilinkHref(target))
    const saved = mobileDocumentWithBody(source, tiptapJsonToMobileMarkdown(editor.getJSON()))
    expect(saved).toContain(`[[${target}|Linked note]]`)
    expect(saved).toContain('custom: preserved')
    const reopened = await openNote(saved)
    expect(tiptapJsonToMobileMarkdown(reopened.getJSON())).toContain(`[[${target}|Linked note]]`)
    expect(reopened.getHTML()).toContain(mobileWikilinkHref(target))
  })

  it('loads existing wikilinks without dropping their link marks', async () => {
    const editor = await openNote('See [[Projects/Launch|Launch plan]].')
    expect(tiptapJsonToMobileMarkdown(editor.getJSON())).toBe('See [[Projects/Launch|Launch plan]].')
  })

  it.each(['javascript:alert(1)', 'data:text/html,unsafe', 'tolaria://settings'])('still rejects unsafe %s links', async href => {
    const { editor, dispose } = await createTestTentapEditor(`<p><a href="${href}">Unsafe</a></p>`)
    disposals.push(dispose)
    expect(editor.getHTML()).toBe('<p>Unsafe</p>')
  })
})
