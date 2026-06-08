import type { ModelOption } from '../types/mimo'

export const asrModelOptions: ModelOption[] = [
  {
    id: 'mimo-v2.5-asr',
    name: 'mimo-v2.5-asr',
    capability: 'asr',
    description: 'MiMo ASR 识别模型',
  },
]

export const ttsModelOptions: ModelOption[] = [
  {
    id: 'mimo-v2.5-tts',
    name: 'mimo-v2.5-tts',
    capability: 'tts',
    description: 'MiMo TTS 朗读模型',
  },
]

export const analysisModelOptions: ModelOption[] = [
  {
    id: 'mimo-v2.5',
    name: 'mimo-v2.5',
    capability: 'analysis',
    description: '默认分析与 JSON 任务模型',
  },
  {
    id: 'mimo-v2.5-pro',
    name: 'mimo-v2.5-pro',
    capability: 'analysis',
    description: '高质量分析与评分模型',
  },
]

export const ttsVoiceOptions = [
  'mimo_default',
  '冰糖',
  '茉莉',
  '苏打',
  '白桦',
  'Mia',
  'Chloe',
  'Milo',
  'Dean',
]
