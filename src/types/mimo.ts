export type ModelCapability = 'asr' | 'tts' | 'analysis'

export interface ModelOption {
  id: string
  name: string
  capability: ModelCapability
  description: string
}

export interface ApiSettings {
  apiKey: string
  rememberApiKey: boolean
  asrModelId: string
  ttsModelId: string
  analysisModelId: string
}

export interface ComparisonStats {
  sourceUnits: number
  recognizedUnits: number
  matchedUnits: number
  wrongUnits: number
  missingUnits: number
  extraUnits: number
  accuracyRate: number
  completenessRate: number
  overallScore: number
}

export interface ComparisonIssue {
  id: string
  type: 'wrong' | 'missing' | 'extra'
  sourceText: string
  recognizedText: string
  suggestion: string
}

export interface ComparisonResult {
  stats: ComparisonStats
  issues: ComparisonIssue[]
}

export interface TextSentence {
  id: string
  text: string
}

export interface TextParagraph {
  id: string
  index: number
  text: string
  sentences: TextSentence[]
}
