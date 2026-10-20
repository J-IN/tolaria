import {
  mobileDocumentWithBody,
  tiptapJsonToMobileMarkdown,
} from '../../workspace/mobileDocumentContent'

type NativeWysiwygDocumentSerializationInput = {
  currentContent: string
  initialBodyHasContent: boolean
  isFirstSerialization: boolean
  json: unknown
  vaultRootUri?: string | null
}

type NativeWysiwygDocumentSerializationResult = {
  content: string
  markdown: string
  skipped: boolean
}

export function nativeWysiwygDocumentContentFromJson({
  currentContent,
  initialBodyHasContent,
  isFirstSerialization,
  json,
  vaultRootUri = null,
}: NativeWysiwygDocumentSerializationInput): NativeWysiwygDocumentSerializationResult {
  const markdown = tiptapJsonToMobileMarkdown(json, { vaultRootUri })
  if (shouldSkipInitialEmptySerialization({ initialBodyHasContent, isFirstSerialization, markdown })) {
    return { content: currentContent, markdown, skipped: true }
  }

  return {
    content: mobileDocumentWithBody(currentContent, `${markdown}\n`),
    markdown,
    skipped: false,
  }
}

export function nativeWysiwygShouldPublishMutationProof({
  mutationProbeEnabled,
  skipped,
}: {
  mutationProbeEnabled: boolean
  skipped: boolean
}): boolean {
  return mutationProbeEnabled && !skipped
}

function shouldSkipInitialEmptySerialization({
  initialBodyHasContent,
  isFirstSerialization,
  markdown,
}: Pick<NativeWysiwygDocumentSerializationInput, 'initialBodyHasContent' | 'isFirstSerialization'> & {
  markdown: string
}): boolean {
  if (!isFirstSerialization) return false
  if (!initialBodyHasContent) return false
  return markdown.trim() === ''
}
