import type { TextParagraph, TextSentence } from '../types/mimo'

const sentenceBoundaryPattern = /[^。！？；!?;\n]+[。！？；!?;]?/g

export const splitIntoSentences = (paragraphText: string, paragraphIndex = 0): TextSentence[] => {
  const matches = paragraphText.match(sentenceBoundaryPattern) ?? []

  return matches
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .map((sentence, sentenceIndex) => ({
      id: `p${paragraphIndex}-s${sentenceIndex}`,
      text: sentence,
    }))
}

export const splitIntoParagraphs = (sourceText: string): TextParagraph[] =>
  sourceText
    .split(/\n\s*\n/g)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph, paragraphIndex) => ({
      id: `paragraph-${paragraphIndex}`,
      index: paragraphIndex,
      text: paragraph,
      sentences: splitIntoSentences(paragraph, paragraphIndex),
    }))
