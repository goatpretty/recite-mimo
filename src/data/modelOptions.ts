import type { ModelOption } from '../types/mimo'

export const asrModelOptions: ModelOption[] = [
  {
    id: 'mimo-asr-default',
    name: 'ASR 模型占位',
    capability: 'asr',
    description: '按 MiMo 文档补齐实际模型 ID',
  },
  {
    id: 'mimo-asr-fast',
    name: '快速识别占位',
    capability: 'asr',
    description: '适合短段落训练的占位选项',
  },
]

export const ttsModelOptions: ModelOption[] = [
  {
    id: 'mimo-tts-default',
    name: 'TTS 模型占位',
    capability: 'tts',
    description: '按 MiMo 文档补齐实际模型 ID',
  },
  {
    id: 'mimo-tts-natural',
    name: '自然朗读占位',
    capability: 'tts',
    description: '适合先听后背的占位选项',
  },
]

export const analysisModelOptions: ModelOption[] = [
  {
    id: 'mimo-analysis-default',
    name: '辅助分析模型占位',
    capability: 'analysis',
    description: '只用于后续 AI 辅助分析，不影响本地对比',
  },
  {
    id: 'mimo-analysis-careful',
    name: '细致纠错占位',
    capability: 'analysis',
    description: '用于后续错因解释和复习建议',
  },
]
