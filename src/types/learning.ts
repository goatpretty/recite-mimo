import type { ReciteItem } from '../utils/referenceParser'

export const fullTrainingTargetId = 'full'

export interface AiReferenceAnalysis {
  summary: string
  itemExplanations: Array<{
    itemId: string
    marker: string
    content: string
    meaning: string
    memoryHint: string
    commonMistake?: string
  }>
  memoryPath: string[]
  confusionWarnings: string[]
  recitationAdvice: string
}

export interface KeywordExtractionResult {
  items: Array<{
    itemId: string
    marker: string
    content: string
    keywords: Array<{
      text: string
      importance: 'core' | 'important' | 'supporting'
      reason: string
      mustRecite: boolean
    }>
  }>
}

export interface AiRecitationReview {
  totalScore: number
  level: '熟练' | '基本掌握' | '需要复习' | '建议重背'
  keywordErrors: Array<{
    keyword: string
    userExpression: string
    correctExpression: string
    reason: string
    relatedItemId: string
  }>
  missingKnowledgePoints: Array<{
    marker: string
    content: string
    explanation: string
    importance: string
  }>
  inaccurateExpressions: Array<{
    userExpression: string
    correctExpression: string
    reason: string
  }>
  extraOrIrrelevantContent: Array<{
    text: string
    reason: string
  }>
  itemReviews: Array<{
    itemId: string
    marker: string
    status: 'correct' | 'partial' | 'missing' | 'wrong'
    comment: string
  }>
  overallComment: string
  nextPracticeAdvice: string[]
}

export type AsyncTaskStatus = 'idle' | 'loading' | 'ready' | 'blocked' | 'error'

export interface TrainingTarget {
  id: string
  label: string
  summary: string
  items: ReciteItem[]
}
