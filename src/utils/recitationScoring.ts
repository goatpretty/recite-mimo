import type { ComparisonResult } from '../types/mimo'
import { normalizeText, toHalfWidth } from './normalizeText'
import type { ParsedReference, ReciteItem } from './referenceParser'
import { compareRecitationText } from './textComparison'

export interface RecitationScoringOptions {
  ignoreMarkers: boolean
  compareByItems: boolean
  strictOrder: boolean
  ignorePunctuation: boolean
  ignoreWhitespace: boolean
}

export interface ReciteItemResult {
  itemId: string
  marker: string
  content: string
  status: 'matched' | 'partial' | 'missing'
  matchScore: number
  matchedText: string
}

export interface RecitationScore {
  overallScore: number
  accuracy: number
  completeness: number
  itemCoverage: number
  matchedItems: ReciteItemResult[]
  missingItems: ReciteItemResult[]
  partialItems: ReciteItemResult[]
  extraText: string[]
  charDiff: ComparisonResult
}

interface BestMatch {
  score: number
  excerpt: string
}

export const defaultRecitationScoringOptions: RecitationScoringOptions = {
  ignoreMarkers: true,
  compareByItems: true,
  strictOrder: false,
  ignorePunctuation: true,
  ignoreWhitespace: true,
}

const referenceMarkerPattern =
  /(?:^|[\s\n\r;；。.!！?？,，])(?:（[0-9一二三四五六七八九十百千万两]+）|\([0-9一二三四五六七八九十百千万两]+\)|[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳]|\d{1,2}[.．、)）]|[一二三四五六七八九十百千万两]+[、.．]|第[一二三四五六七八九十百千万两]+[、，,]|一是|二是|三是|四是|五是|六是|七是|八是|九是|十是|首先|其次|再次|最后)[、，,。.]?/g

const stripReferenceMarkers = (value: string) =>
  toHalfWidth(value).replace(referenceMarkerPattern, (match) => {
    const leading = match.match(/^[\s\n\r;；。.!！?？,，]/)?.[0] ?? ''
    return leading.trim() ? leading : ''
  })

const normalizeForScoring = (value: string, options: RecitationScoringOptions) =>
  normalizeText(options.ignoreMarkers ? stripReferenceMarkers(value) : value, {
    ignorePunctuation: options.ignorePunctuation,
    ignoreWhitespace: options.ignoreWhitespace,
    unifyCase: true,
    unifyFullWidthHalfWidth: true,
  })

const lcsLength = (left: string, right: string) => {
  const leftUnits = Array.from(left)
  const rightUnits = Array.from(right)
  const rows = leftUnits.length
  const columns = rightUnits.length
  const previous = Array(columns + 1).fill(0)
  const current = Array(columns + 1).fill(0)

  for (let row = 1; row <= rows; row += 1) {
    for (let column = 1; column <= columns; column += 1) {
      current[column] =
        leftUnits[row - 1] === rightUnits[column - 1]
          ? previous[column - 1] + 1
          : Math.max(previous[column], current[column - 1])
    }

    for (let column = 0; column <= columns; column += 1) {
      previous[column] = current[column]
      current[column] = 0
    }
  }

  return previous[columns]
}

const findBestApproximateMatch = (itemContent: string, recognizedText: string): BestMatch => {
  const itemLength = itemContent.length
  const recognizedLength = recognizedText.length

  if (itemLength === 0 || recognizedLength === 0) {
    return { score: 0, excerpt: '' }
  }

  const minWindow = Math.max(1, Math.floor(itemLength * 0.65))
  const maxWindow = Math.min(recognizedLength, Math.ceil(itemLength * 1.35))
  const step = Math.max(1, Math.floor(itemLength / 4))
  let bestMatch: BestMatch = { score: 0, excerpt: '' }

  for (let start = 0; start < recognizedLength; start += 1) {
    for (let windowLength = minWindow; windowLength <= maxWindow; windowLength += step) {
      const window = recognizedText.slice(start, start + windowLength)

      if (!window) {
        continue
      }

      const commonLength = lcsLength(itemContent, window)
      const recall = commonLength / itemLength
      const precision = commonLength / window.length
      const score = recall * 0.75 + precision * 0.25

      if (score > bestMatch.score) {
        bestMatch = {
          score,
          excerpt: window,
        }
      }
    }
  }

  return bestMatch
}

const scoreItem = (
  item: ReciteItem,
  normalizedRecognizedText: string,
): ReciteItemResult => {
  if (!item.normalizedContent) {
    return {
      itemId: item.id,
      marker: item.marker,
      content: item.content,
      status: 'missing',
      matchScore: 0,
      matchedText: '',
    }
  }

  if (normalizedRecognizedText.includes(item.normalizedContent)) {
    return {
      itemId: item.id,
      marker: item.marker,
      content: item.content,
      status: 'matched',
      matchScore: 1,
      matchedText: item.content,
    }
  }

  const bestMatch = findBestApproximateMatch(item.normalizedContent, normalizedRecognizedText)

  if (bestMatch.score >= 0.55) {
    return {
      itemId: item.id,
      marker: item.marker,
      content: item.content,
      status: 'partial',
      matchScore: Number(bestMatch.score.toFixed(2)),
      matchedText: bestMatch.excerpt,
    }
  }

  return {
    itemId: item.id,
    marker: item.marker,
    content: item.content,
    status: 'missing',
    matchScore: Number(bestMatch.score.toFixed(2)),
    matchedText: bestMatch.excerpt,
  }
}

const getExtraTextFromDiff = (comparison: ComparisonResult) =>
  comparison.issues
    .filter((issue) => issue.type === 'extra' && issue.recognizedText)
    .map((issue) => issue.recognizedText)
    .slice(0, 8)

export const scoreRecitation = (
  parsedReference: ParsedReference,
  recognizedText: string,
  options: RecitationScoringOptions = defaultRecitationScoringOptions,
): RecitationScore => {
  const scorableItems = parsedReference.flatItems.filter((item) => item.normalizedContent)
  const normalizedRecognizedText = normalizeForScoring(recognizedText, options)
  const normalizedSourceText = scorableItems.map((item) => item.content).join('')
  const normalizedRecognizedRawText = options.ignoreMarkers ? stripReferenceMarkers(recognizedText) : recognizedText
  const charDiff = compareRecitationText(normalizedSourceText, normalizedRecognizedRawText, {
    ignorePunctuation: options.ignorePunctuation,
    ignoreWhitespace: options.ignoreWhitespace,
    unifyCase: true,
    unifyFullWidthHalfWidth: true,
  })
  const itemResults = scorableItems.map((item) => scoreItem(item, normalizedRecognizedText))
  const matchedItems = itemResults.filter((item) => item.status === 'matched')
  const partialItems = itemResults.filter((item) => item.status === 'partial')
  const missingItems = itemResults.filter((item) => item.status === 'missing')
  const itemCount = scorableItems.length
  const totalItemScore = itemResults.reduce((total, item) => total + item.matchScore, 0)
  const itemCoverage =
    itemCount === 0 ? 0 : Math.round(((matchedItems.length + partialItems.length * 0.5) / itemCount) * 100)
  const completeness = itemCount === 0 ? 0 : Math.round((totalItemScore / itemCount) * 100)
  const recognizedUnits = normalizeForScoring(recognizedText, options).length
  const sourceUnits = scorableItems.reduce((total, item) => total + item.normalizedContent.length, 0)
  const extraPenalty = sourceUnits === 0 ? 0 : Math.min(15, (charDiff.stats.extraUnits / sourceUnits) * 20)
  const accuracy =
    recognizedUnits === 0
      ? 0
      : Math.max(0, Math.round(charDiff.stats.accuracyRate * 0.35 + completeness * 0.65 - extraPenalty))
  const overallScore = Math.max(0, Math.round(itemCoverage * 0.55 + completeness * 0.35 + accuracy * 0.1))

  return {
    overallScore,
    accuracy,
    completeness,
    itemCoverage,
    matchedItems,
    missingItems,
    partialItems,
    extraText: getExtraTextFromDiff(charDiff),
    charDiff,
  }
}
