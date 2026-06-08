import type {
  AiRecitationReview,
  AiReferenceAnalysis,
  KeywordExtractionResult,
} from '../types/learning'

type KeywordImportance = KeywordExtractionResult['items'][number]['keywords'][number]['importance']
type RecitationLevel = AiRecitationReview['level']
type ItemReviewStatus = AiRecitationReview['itemReviews'][number]['status']

export class AiValidationError extends Error {
  constructor(message = 'AI 返回格式不符合预期，请重试。') {
    super(message)
    this.name = 'AiValidationError'
  }
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isString = (value: unknown): value is string => typeof value === 'string'

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(isString)

const assertObject = (value: unknown, path: string): Record<string, unknown> => {
  if (!isObject(value)) {
    throw new AiValidationError(`${path} 格式不符合预期。`)
  }

  return value
}

const assertString = (value: unknown, path: string) => {
  if (!isString(value)) {
    throw new AiValidationError(`${path} 缺失或不是字符串。`)
  }

  return value
}

const assertStringArray = (value: unknown, path: string) => {
  if (!isStringArray(value)) {
    throw new AiValidationError(`${path} 缺失或不是字符串数组。`)
  }

  return value
}

const assertArray = (value: unknown, path: string) => {
  if (!Array.isArray(value)) {
    throw new AiValidationError(`${path} 缺失或不是数组。`)
  }

  return value
}

export const validateReferenceAnalysis = (value: unknown): AiReferenceAnalysis => {
  const root = assertObject(value, 'analysis')
  const itemExplanations = assertArray(root.itemExplanations, 'itemExplanations').map((item, index) => {
    const object = assertObject(item, `itemExplanations[${index}]`)

    return {
      itemId: assertString(object.itemId, `itemExplanations[${index}].itemId`),
      marker: assertString(object.marker, `itemExplanations[${index}].marker`),
      content: assertString(object.content, `itemExplanations[${index}].content`),
      meaning: assertString(object.meaning, `itemExplanations[${index}].meaning`),
      memoryHint: assertString(object.memoryHint, `itemExplanations[${index}].memoryHint`),
      commonMistake: isString(object.commonMistake) ? object.commonMistake : '',
    }
  })

  return {
    summary: assertString(root.summary, 'summary'),
    itemExplanations,
    memoryPath: assertStringArray(root.memoryPath, 'memoryPath'),
    confusionWarnings: assertStringArray(root.confusionWarnings, 'confusionWarnings'),
    recitationAdvice: assertString(root.recitationAdvice, 'recitationAdvice'),
  }
}

export const validateKeywordExtraction = (value: unknown): KeywordExtractionResult => {
  const root = assertObject(value, 'keywordExtraction')
  const items = assertArray(root.items, 'items').map((item, itemIndex) => {
    const object = assertObject(item, `items[${itemIndex}]`)
    const content = assertString(object.content, `items[${itemIndex}].content`)
    const keywords = assertArray(object.keywords, `items[${itemIndex}].keywords`).map((keyword, keywordIndex) => {
      const keywordObject = assertObject(keyword, `items[${itemIndex}].keywords[${keywordIndex}]`)
      const text = assertString(keywordObject.text, `items[${itemIndex}].keywords[${keywordIndex}].text`)
      const importance = assertString(keywordObject.importance, `items[${itemIndex}].keywords[${keywordIndex}].importance`)

      if (!['core', 'important', 'supporting'].includes(importance)) {
        throw new AiValidationError('关键词 importance 必须是 core、important 或 supporting。')
      }

      if (!content.includes(text)) {
        throw new AiValidationError(`关键词“${text}”不是原文 content 中连续出现的片段。`)
      }

      if (typeof keywordObject.mustRecite !== 'boolean') {
        throw new AiValidationError('关键词 mustRecite 缺失或不是布尔值。')
      }

      return {
        text,
        importance: importance as KeywordImportance,
        reason: assertString(keywordObject.reason, `items[${itemIndex}].keywords[${keywordIndex}].reason`),
        mustRecite: keywordObject.mustRecite,
      }
    })

    return {
      itemId: assertString(object.itemId, `items[${itemIndex}].itemId`),
      marker: assertString(object.marker, `items[${itemIndex}].marker`),
      content,
      keywords,
    }
  })

  return { items }
}

export const validateRecitationReview = (value: unknown): AiRecitationReview => {
  const root = assertObject(value, 'review')
  const totalScore = Number(root.totalScore)
  const level = assertString(root.level, 'level')

  if (!Number.isFinite(totalScore) || totalScore < 0 || totalScore > 100) {
    throw new AiValidationError('totalScore 必须是 0 到 100 的数字。')
  }

  if (!['熟练', '基本掌握', '需要复习', '建议重背'].includes(level)) {
    throw new AiValidationError('level 不符合预期。')
  }

  return {
    totalScore,
    level: level as RecitationLevel,
    keywordErrors: assertArray(root.keywordErrors, 'keywordErrors').map((item, index) => {
      const object = assertObject(item, `keywordErrors[${index}]`)
      return {
        keyword: assertString(object.keyword, `keywordErrors[${index}].keyword`),
        userExpression: assertString(object.userExpression, `keywordErrors[${index}].userExpression`),
        correctExpression: assertString(object.correctExpression, `keywordErrors[${index}].correctExpression`),
        reason: assertString(object.reason, `keywordErrors[${index}].reason`),
        relatedItemId: assertString(object.relatedItemId, `keywordErrors[${index}].relatedItemId`),
      }
    }),
    missingKnowledgePoints: assertArray(root.missingKnowledgePoints, 'missingKnowledgePoints').map((item, index) => {
      const object = assertObject(item, `missingKnowledgePoints[${index}]`)
      return {
        marker: assertString(object.marker, `missingKnowledgePoints[${index}].marker`),
        content: assertString(object.content, `missingKnowledgePoints[${index}].content`),
        explanation: assertString(object.explanation, `missingKnowledgePoints[${index}].explanation`),
        importance: assertString(object.importance, `missingKnowledgePoints[${index}].importance`),
      }
    }),
    inaccurateExpressions: assertArray(root.inaccurateExpressions, 'inaccurateExpressions').map((item, index) => {
      const object = assertObject(item, `inaccurateExpressions[${index}]`)
      return {
        userExpression: assertString(object.userExpression, `inaccurateExpressions[${index}].userExpression`),
        correctExpression: assertString(object.correctExpression, `inaccurateExpressions[${index}].correctExpression`),
        reason: assertString(object.reason, `inaccurateExpressions[${index}].reason`),
      }
    }),
    extraOrIrrelevantContent: assertArray(root.extraOrIrrelevantContent, 'extraOrIrrelevantContent').map((item, index) => {
      const object = assertObject(item, `extraOrIrrelevantContent[${index}]`)
      return {
        text: assertString(object.text, `extraOrIrrelevantContent[${index}].text`),
        reason: assertString(object.reason, `extraOrIrrelevantContent[${index}].reason`),
      }
    }),
    itemReviews: assertArray(root.itemReviews, 'itemReviews').map((item, index) => {
      const object = assertObject(item, `itemReviews[${index}]`)
      const status = assertString(object.status, `itemReviews[${index}].status`)

      if (!['correct', 'partial', 'missing', 'wrong'].includes(status)) {
        throw new AiValidationError('itemReviews.status 不符合预期。')
      }

      return {
        itemId: assertString(object.itemId, `itemReviews[${index}].itemId`),
        marker: assertString(object.marker, `itemReviews[${index}].marker`),
        status: status as ItemReviewStatus,
        comment: assertString(object.comment, `itemReviews[${index}].comment`),
      }
    }),
    overallComment: assertString(root.overallComment, 'overallComment'),
    nextPracticeAdvice: assertStringArray(root.nextPracticeAdvice, 'nextPracticeAdvice'),
  }
}
