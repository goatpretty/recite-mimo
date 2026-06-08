import type { AiRecitationReview } from '../types/learning'
import type { ReciteItem } from './referenceParser'
import { normalizeText, toHalfWidth } from './normalizeText'

export interface NormalizedSpeechItem {
  itemId: string
  content: string
  normalizedContent: string
}

const digitMap: Record<string, string> = {
  零: '0',
  〇: '0',
  一: '1',
  二: '2',
  两: '2',
  三: '3',
  四: '4',
  五: '5',
  六: '6',
  七: '7',
  八: '8',
  九: '9',
}

const unitMap: Record<string, number> = {
  十: 10,
  百: 100,
  千: 1000,
  万: 10000,
}

const simpleDigitPattern = /[零〇一二两三四五六七八九]{2,}/g
const chineseNumberPattern = /[零〇一二两三四五六七八九十百千万]+/g

const parseChineseNumber = (value: string) => {
  if ([...value].every((char) => char in digitMap)) {
    return [...value].map((char) => digitMap[char]).join('')
  }

  let result = 0
  let section = 0
  let number = 0

  for (const char of value) {
    if (char in digitMap) {
      number = Number(digitMap[char])
      continue
    }

    const unit = unitMap[char]

    if (!unit) {
      return value
    }

    if (unit === 10000) {
      section = (section + number) * unit
      result += section
      section = 0
      number = 0
      continue
    }

    section += (number || 1) * unit
    number = 0
  }

  return String(result + section + number)
}

const normalizeChineseNumbers = (value: string) =>
  value
    .replace(/百分之([零〇一二两三四五六七八九十百千万]+)/g, (_, numberText: string) => `${parseChineseNumber(numberText)}%`)
    .replace(simpleDigitPattern, (match) => parseChineseNumber(match))
    .replace(chineseNumberPattern, (match) => parseChineseNumber(match))

export const normalizeForSpeechReview = (value: string) =>
  normalizeText(normalizeChineseNumbers(toHalfWidth(value)), {
    ignorePunctuation: true,
    ignoreWhitespace: true,
    unifyCase: true,
    unifyFullWidthHalfWidth: true,
  })

export const buildNormalizedSpeechItems = (items: ReciteItem[]): NormalizedSpeechItem[] =>
  items.map((item) => ({
    itemId: item.id,
    content: item.content,
    normalizedContent: normalizeForSpeechReview(item.content),
  }))

export const speechReviewNotes = [
  '识别文本来自 ASR，数字书写形式差异不应判错',
  '21世纪 与 二十一世纪 视为等价',
  '2024年 与 二零二四年 或 二〇二四年 视为等价',
  '3个 与 三个 视为等价',
  '100% 与 百分之百 视为等价',
  '标点、空格、全角半角、英文大小写差异不应判错',
]

const isNotationOnlyDifference = (left: string, right: string) =>
  Boolean(left.trim() && right.trim()) && normalizeForSpeechReview(left) === normalizeForSpeechReview(right)

export const filterAsrNotationOnlyReviewIssues = (review: AiRecitationReview): AiRecitationReview => {
  const filteredKeywordErrors = review.keywordErrors.filter(
    (item) => !isNotationOnlyDifference(item.correctExpression || item.keyword, item.userExpression),
  )
  const filteredInaccurateExpressions = review.inaccurateExpressions.filter(
    (item) => !isNotationOnlyDifference(item.correctExpression, item.userExpression),
  )
  const removedNotationOnlyIssues =
    review.keywordErrors.length -
    filteredKeywordErrors.length +
    review.inaccurateExpressions.length -
    filteredInaccurateExpressions.length
  const hasSubstantiveIssues =
    filteredKeywordErrors.length > 0 ||
    filteredInaccurateExpressions.length > 0 ||
    review.missingKnowledgePoints.length > 0 ||
    review.extraOrIrrelevantContent.length > 0
  const shouldRestoreNotationOnlyScore = removedNotationOnlyIssues > 0 && !hasSubstantiveIssues

  return {
    ...review,
    totalScore: shouldRestoreNotationOnlyScore ? Math.max(review.totalScore, 90) : review.totalScore,
    level: shouldRestoreNotationOnlyScore ? '熟练' : review.level,
    keywordErrors: filteredKeywordErrors,
    inaccurateExpressions: filteredInaccurateExpressions,
    itemReviews: shouldRestoreNotationOnlyScore
      ? review.itemReviews.map((item) => ({
          ...item,
          status: 'correct',
          comment: '仅存在 ASR 表记差异，按正确处理。',
        }))
      : review.itemReviews,
  }
}
