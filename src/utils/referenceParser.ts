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
  title?: string
  normalizedContent: string
  children?: ReciteItem[]
  isGroup?: boolean
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
const isCircledNumber = (char: string) => circledNumbers.includes(char)
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

  const immediatePrevious = text[index - 1]

  if (immediatePrevious === '\n' || immediatePrevious === '\r') {
    return true
  }

  let previousIndex = index - 1

  while (previousIndex >= 0 && (text[previousIndex] === ' ' || text[previousIndex] === '　' || text[previousIndex] === '\t')) {
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
    const rest = text.slice(index)

    if (!isMarkerBoundary(text, index) && !isCircledNumber(rest[0])) {
      index += 1
      continue
    }

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

const buildNumberedItems = (rawText: string, markers: MarkerMatch[]) => {
  const rootItems: ReciteItem[] = []
  const processed = new Set<number>()
  let itemIndex = 0

  const makeItem = (marker: MarkerMatch, content: string): ReciteItem => {
    itemIndex += 1

    return {
      id: `item-${itemIndex}`,
      level: marker.level,
      marker: marker.marker,
      markerType: marker.markerType,
      rawText: rawText.slice(marker.start, marker.end + content.length).trim(),
      content,
      normalizedContent: normalizeItemContent(content),
    }
  }

  const level1Markers = markers.filter((m) => m.level === 1)
  const level2Markers = markers.filter((m) => m.level === 2)

  for (const l1 of level1Markers) {
    const nextL1 = level1Markers[level1Markers.indexOf(l1) + 1]
    const children = level2Markers.filter(
      (m) => !processed.has(m.start) && m.start > l1.end && (!nextL1 || m.start < nextL1.start),
    )

    if (children.length > 0) {
      const titleEnd = children[0].start
      const title = stripOuterSeparators(rawText.slice(l1.end, titleEnd))

      children.forEach((m) => processed.add(m.start))

      const childItems = children.map((m) => {
        const nextChild = children[children.indexOf(m) + 1]
        const segEnd = nextChild?.start ?? (nextL1?.start ?? rawText.length)
        const segContent = stripOuterSeparators(rawText.slice(m.end, segEnd))

        return makeItem(m, segContent)
      })

      itemIndex += 1
      rootItems.push({
        id: `item-${itemIndex}`,
        level: l1.level,
        marker: l1.marker,
        markerType: l1.markerType,
        rawText: rawText.slice(l1.start, (nextL1?.start ?? rawText.length)).trim(),
        content: title,
        title,
        normalizedContent: normalizeItemContent(title),
        children: childItems,
        isGroup: true,
      })
    } else {
      const nextM = nextL1 ?? level2Markers.find((m) => m.start > l1.end)
      const segEnd = nextM?.start ?? rawText.length
      const segContent = stripOuterSeparators(rawText.slice(l1.end, segEnd))

      rootItems.push(makeItem(l1, segContent))
    }
  }

  for (const m of level2Markers) {
    if (processed.has(m.start)) {
      continue
    }

    const nextM = markers[markers.indexOf(m) + 1]
    const segEnd = nextM?.start ?? rawText.length
    const segContent = stripOuterSeparators(rawText.slice(m.end, segEnd))

    rootItems.push(makeItem(m, segContent))
  }

  return rootItems
}

const flattenItems = (items: ReciteItem[]): ReciteItem[] =>
  items.flatMap((item) => {
    if (item.isGroup) {
      return flattenItems(item.children ?? [])
    }

    return [item]
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
  const ownLine = item.isGroup
    ? [item.marker, item.title].filter(Boolean).join(' ')
    : [item.marker, item.content].filter(Boolean).join(' ')
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

  const hasGroups = parsedReference.items.some((item) => item.isGroup)

  if (!hasGroups) {
    return `${parsedReference.flatItems.length} 个考点`
  }

  return `共 ${parsedReference.items.length} 组，${parsedReference.flatItems.length} 个考点`
}
