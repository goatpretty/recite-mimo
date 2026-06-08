import { normalizeText } from './normalizeText'

export type MarkerType =
  | 'none'
  | 'parenNumber'
  | 'circledNumber'
  | 'chineseNumber'
  | 'decimalNumber'
  | 'orderedWord'

export interface ReciteItem {
  id: string
  level: number
  marker: string
  markerType: MarkerType
  rawText: string
  content: string
  normalizedContent: string
  children?: ReciteItem[]
}

export interface ParsedReference {
  rawText: string
  items: ReciteItem[]
  flatItems: ReciteItem[]
  warnings: string[]
}

interface MarkerMatch {
  marker: string
  markerType: MarkerType
  start: number
  end: number
  level: number
}

const circledNumbers = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳'
const chineseNumerals = '一二三四五六七八九十百千万两'
const boundaryChars = new Set(['\n', '\r', '\t', ' ', '　', ';', '；', '。', '.', '!', '！', '?', '？', ','])

const markerPatterns: Array<{
  type: MarkerType
  level: number
  pattern: RegExp
  markerGroup?: number
}> = [
  {
    type: 'parenNumber',
    level: 1,
    pattern: new RegExp(`^((?:（[0-9${chineseNumerals}]+）)|(?:\\([0-9${chineseNumerals}]+\\)))[、，,]?`),
    markerGroup: 1,
  },
  {
    type: 'circledNumber',
    level: 2,
    pattern: new RegExp(`^([${circledNumbers}])`),
    markerGroup: 1,
  },
  {
    type: 'decimalNumber',
    level: 1,
    pattern: /^(\d{1,2}(?:[.．、)]|）))/,
    markerGroup: 1,
  },
  {
    type: 'chineseNumber',
    level: 1,
    pattern: new RegExp(`^((?:[${chineseNumerals}]+[、.．])|(?:第[${chineseNumerals}]+[、，,]))`),
    markerGroup: 1,
  },
  {
    type: 'orderedWord',
    level: 1,
    pattern: /^(一是|二是|三是|四是|五是|六是|七是|八是|九是|十是|首先|其次|再次|最后)[、，,。.]?/,
    markerGroup: 1,
  },
]

const fallbackSentencePattern = /[^。！？；!?;\n]+[。！？；!?;]?/g

const isMarkerBoundary = (text: string, index: number) => {
  if (index === 0) {
    return true
  }

  let previousIndex = index - 1

  while (previousIndex >= 0 && /\s/.test(text[previousIndex])) {
    previousIndex -= 1
  }

  if (previousIndex < 0) {
    return true
  }

  const previousChar = text[previousIndex]

  return boundaryChars.has(previousChar) || previousChar === ')' || previousChar === '）'
}

const stripOuterSeparators = (value: string) =>
  value
    .trim()
    .replace(/^[、，,。．.;；:：\s]+/, '')
    .replace(/[、，,。．.;；:：!?！？\s]+$/, '')
    .trim()

const findMarkers = (text: string): MarkerMatch[] => {
  const markers: MarkerMatch[] = []
  let index = 0

  while (index < text.length) {
    if (!isMarkerBoundary(text, index)) {
      index += 1
      continue
    }

    const rest = text.slice(index)
    const matchConfig = markerPatterns.find((config) => config.pattern.test(rest))

    if (!matchConfig) {
      index += 1
      continue
    }

    const match = rest.match(matchConfig.pattern)
    const fullMatch = match?.[0] ?? ''
    const marker = matchConfig.markerGroup ? match?.[matchConfig.markerGroup] ?? fullMatch : fullMatch

    if (!fullMatch || !marker) {
      index += 1
      continue
    }

    markers.push({
      marker,
      markerType: matchConfig.type,
      start: index,
      end: index + fullMatch.length,
      level: matchConfig.level,
    })

    index += fullMatch.length
  }

  return markers
}

const normalizeItemContent = (content: string) =>
  normalizeText(content, {
    ignorePunctuation: true,
    ignoreWhitespace: true,
    unifyCase: true,
    unifyFullWidthHalfWidth: true,
  })

const hasClearNumberedStructure = (markers: MarkerMatch[]) =>
  markers.length >= 2 || (markers.length === 1 && markers[0].start < 3)

const flattenItems = (items: ReciteItem[]): ReciteItem[] =>
  items.flatMap((item) => {
    const ownItem = item.content ? [item] : []
    return [...ownItem, ...flattenItems(item.children ?? [])]
  })

const fallbackParse = (rawText: string): ParsedReference => {
  const paragraphs = rawText
    .split(/\n\s*\n/g)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
  const sentences = (paragraphs.length > 0 ? paragraphs : [rawText])
    .flatMap((paragraph) => paragraph.match(fallbackSentencePattern) ?? [paragraph])
    .map(stripOuterSeparators)
    .filter(Boolean)
  const items = sentences.map<ReciteItem>((sentence, index) => ({
    id: `item-${index + 1}`,
    level: 1,
    marker: '',
    markerType: 'none',
    rawText: sentence,
    content: sentence,
    normalizedContent: normalizeItemContent(sentence),
  }))

  return {
    rawText,
    items,
    flatItems: items,
    warnings: items.length === 0 ? ['没有解析到可训练文本。'] : ['未识别到明显编号结构，已按段落和标点切分。'],
  }
}

const buildNumberedItems = (rawText: string, markers: MarkerMatch[]) => {
  const rootItems: ReciteItem[] = []
  const stack: ReciteItem[] = []

  markers.forEach((marker, index) => {
    const nextMarker = markers[index + 1]
    const segmentEnd = nextMarker?.start ?? rawText.length
    const segmentText = rawText.slice(marker.end, segmentEnd)
    const content = stripOuterSeparators(segmentText)
    const item: ReciteItem = {
      id: `item-${index + 1}`,
      level: marker.level,
      marker: marker.marker,
      markerType: marker.markerType,
      rawText: rawText.slice(marker.start, segmentEnd).trim(),
      content,
      normalizedContent: normalizeItemContent(content),
    }

    while (stack.length > 0 && stack[stack.length - 1].level >= item.level) {
      stack.pop()
    }

    const parent = stack[stack.length - 1]

    if (parent) {
      parent.children = [...(parent.children ?? []), item]
    } else {
      rootItems.push(item)
    }

    stack.push(item)
  })

  return rootItems
}

export const parseReferenceText = (rawText: string): ParsedReference => {
  const trimmedText = rawText.trim()

  if (!trimmedText) {
    return {
      rawText,
      items: [],
      flatItems: [],
      warnings: ['没有可解析的原文。'],
    }
  }

  const markers = findMarkers(trimmedText)

  if (!hasClearNumberedStructure(markers)) {
    return fallbackParse(trimmedText)
  }

  const items = buildNumberedItems(trimmedText, markers)
  const flatItems = flattenItems(items)

  return {
    rawText: trimmedText,
    items,
    flatItems,
    warnings: flatItems.length === 0 ? ['识别到编号，但没有解析到正文条目。'] : [],
  }
}

export const findReciteItemById = (items: ReciteItem[], id: string): ReciteItem | null => {
  for (const item of items) {
    if (item.id === id) {
      return item
    }

    const childMatch = findReciteItemById(item.children ?? [], id)

    if (childMatch) {
      return childMatch
    }
  }

  return null
}

export const renderItemText = (item: ReciteItem): string => {
  const ownLine = [item.marker, item.content].filter(Boolean).join(' ')
  const childLines = (item.children ?? []).map(renderItemText)

  return [ownLine, ...childLines].filter(Boolean).join('\n')
}

export const createParsedReferenceFromItem = (
  source: ParsedReference,
  itemId: string,
): ParsedReference => {
  const item = findReciteItemById(source.items, itemId)

  if (!item) {
    return source
  }

  const rawText = renderItemText(item)
  const flatItems = flattenItems([item])

  return {
    rawText,
    items: [item],
    flatItems,
    warnings: source.warnings,
  }
}

export const getReferenceSummary = (parsedReference: ParsedReference) => {
  if (parsedReference.items.length === 0) {
    return '未解析'
  }

  const hasNumberedGroups = parsedReference.items.some((item) => item.children?.length)

  if (!hasNumberedGroups) {
    return `${parsedReference.flatItems.length} 个考点`
  }

  return parsedReference.items
    .map((item, index) => `第 ${index + 1} 组，${flattenItems(item.children ?? [item]).length} 个考点`)
    .join('；')
}
