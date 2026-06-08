import type { ApiSettings } from '../types/mimo'

export interface TtsRequest {
  text: string
  modelId: string
}

export interface AsrRequest {
  audioBlob: Blob
  modelId: string
}

export interface AnalysisRequest {
  sourceText: string
  recognizedText: string
  modelId: string
}

export interface MimoServiceAdapter {
  synthesizeSpeech(request: TtsRequest, settings: ApiSettings): Promise<Blob>
  transcribeAudio(request: AsrRequest, settings: ApiSettings): Promise<string>
  analyzeRecitation(request: AnalysisRequest, settings: ApiSettings): Promise<string>
}

export const mimoServiceAdapter: MimoServiceAdapter = {
  async synthesizeSpeech() {
    throw new Error('TODO: 按 MiMo API 文档补齐 TTS endpoint、鉴权 Header 和请求格式。')
  },
  async transcribeAudio() {
    throw new Error('TODO: 按 MiMo API 文档补齐 ASR endpoint、鉴权 Header 和请求格式。')
  },
  async analyzeRecitation() {
    throw new Error('TODO: 按 MiMo API 文档补齐辅助分析 endpoint、鉴权 Header 和请求格式。')
  },
}
