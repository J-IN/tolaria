import assert from 'node:assert/strict'
import { test } from 'node:test'

test('editor bundle uses installed TenTap source instead of its opaque dependency bundle', async () => {
  const workingDirectory = process.cwd()
  const builder = await import('./build-wysiwyg-editor-html.mjs')
  assert.equal(typeof builder.buildEditorBundle, 'function')
  const result = await builder.buildEditorBundle()
  const inputs = Object.keys(result.metafile.inputs)
  assert.ok(inputs.some(input => input.endsWith('/src/webEditorUtils/useTenTap.tsx')))
  assert.ok(inputs.some(input => input.includes('/@tiptap/core/dist/index.js')))
  assert.equal(inputs.some(input => /tentap-editor\/lib-web\/index\./.test(input)), false)
  assert.equal(inputs.some(input => /react-native\/index\./.test(input)), false)
  assert.equal(inputs.filter(input => /\/@tiptap\/core\/dist\/index\.(?:cjs|js)$/.test(input)).length, 1)
  assert.equal(inputs.filter(input => /\/prosemirror-state\/dist\/index\.(?:cjs|js)$/.test(input)).length, 1)
  assert.ok(result.outputFiles.some(file => file.text.includes('ReactNativeWebView')))
  assert.equal(process.cwd(), workingDirectory)
})
