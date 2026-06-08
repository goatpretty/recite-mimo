import type {
  AiRecitationReview,
  AiReferenceAnalysis,
  KeywordExtractionResult,
  TrainingTarget,
} from '../types/learning'
import { AiValidationError } from '../utils/aiValidators'
import type { ApiSettings } from '../types/mimo'
import type { ParsedReference, ReciteItem } from '../utils/referenceParser'
import {
  validateKeywordExtraction,
  validateRecitationReview,
  validateReferenceAnalysis,
} from '../utils/aiValidators'
import { filterAsrNotationOnlyReviewIssues } from '../utils/normalizeForSpeechReview'
import { JsonParseError, parseJsonSafely } from '../utils/safeJson'
import {
  buildKeywordExtractionPrompt,
  buildRecitationReviewPrompt,
  buildReferenceAnalysisPrompt,
  type ChatMessage,
} from './promptBuilders'

const defaultMimoApiBaseUrl = 'https://api.xiaomimimo.com/v1'

type ChatCompletionMessage =
  | ChatMessage
  | {
      role: 'user'
      content: Array<{
        type: 'input_audio'
        input_audio: {
          data: string
        }
      }>
    }

interface ChatCompletionOptions {
  modelName: string
  messages: ChatCompletionMessage[]
  maxCompletionTokens?: number
  temperature?: number
  topP?: number
  extraBody?: Record<string, unknown>
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string
      audio?: {
        data?: string
      }
    }
  }>
}

export class MimoApiError extends Error {
  status?: number
  rawPreview?: string

  constructor(message: string, status?: number, rawPreview?: string) {
    super(message)
    this.name = 'MimoApiError'
    this.status = status
    this.rawPreview = rawPreview
  }
}

const requireApiKey = (settings: ApiSettings) => {
  const apiKey = settings.apiKey.trim()

  if (!apiKey) {
    throw new MimoApiError('API Key 缺失，请先打开设置并输入 API Key。')
  }

  return apiKey
}

const sanitizeErrorPreview = (value: string) =>
  value
    .replace(/sk-[a-zA-Z0-9_-]{8,}/g, 'sk-***')
    .replace(/tp-[a-zA-Z0-9_-]{8,}/g, 'tp-***')

const normalizeBaseUrl = (baseUrl: string) => (baseUrl.trim() || defaultMimoApiBaseUrl).replace(/\/+$/, '')

const getChatCompletionEndpoint = (settings: ApiSettings) => {
  const baseUrl = normalizeBaseUrl(settings.apiBaseUrl)
  return baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`
}

const isTokenPlanKeyOnDefaultUrl = (settings: ApiSettings) =>
  settings.apiKey.trim().startsWith('tp-') && normalizeBaseUrl(settings.apiBaseUrl) === defaultMimoApiBaseUrl

const mapHttpError = async (response: Response, settings: ApiSettings) => {
  const rawText = await response.text().catch(() => '')
  const preview = sanitizeErrorPreview(rawText.slice(0, 500))

  if (response.status === 401 || response.status === 403) {
    if (isTokenPlanKeyOnDefaultUrl(settings)) {
      throw new MimoApiError(
        '鉴权失败：检测到你使用的是 tp- 开头的 Token Plan Key，但当前 Base URL 仍是按量 API 地址。请在设置中把 API Base URL 改为 Token Plan 订阅页面提供的 OpenAI-compatible Base URL；sk- 开头的 Key 才适用于默认地址。',
        response.status,
        preview,
      )
    }

    throw new MimoApiError('鉴权失败，请检查 API Key 是否正确或是否有权限。', response.status, preview)
  }

  if (response.status === 429) {
    throw new MimoApiError('请求过于频繁或触发限速，请稍后重试。', response.status, preview)
  }

  if (response.status >= 500) {
    throw new MimoApiError('MiMo 服务端暂时不可用，请稍后重试。', response.status, preview)
  }

  if (response.status === 400) {
    throw new MimoApiError(
      `MiMo API 请求失败：HTTP 400。请求体可能不符合接口要求。响应摘要：${preview || '无响应正文'}`,
      response.status,
      preview,
    )
  }

  if (/quota|balance|余额|额度|insufficient/i.test(rawText)) {
    throw new MimoApiError('余额或额度不足，请检查 MiMo API 账户。', response.status, preview)
  }

  throw new MimoApiError(`MiMo API 请求失败：HTTP ${response.status}`, response.status, preview)
}

const fetchChatCompletion = async (
  settings: ApiSettings,
  body: Record<string, unknown>,
): Promise<ChatCompletionResponse> => {
  const apiKey = requireApiKey(settings)
  let response: Response

  try {
    response = await fetch(getChatCompletionEndpoint(settings), {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
  } catch (error) {
    if (error instanceof TypeError) {
      throw new MimoApiError(
        '网络请求失败。若浏览器提示 CORS 或跨域错误，说明纯前端无法直接调用，需要本地代理或服务端代理。',
      )
    }

    throw new MimoApiError('网络请求失败，请检查网络连接。')
  }

  if (!response.ok) {
    await mapHttpError(response, settings)
  }

  try {
    return (await response.json()) as ChatCompletionResponse
  } catch {
    throw new MimoApiError('MiMo API 返回内容不是有效 JSON。')
  }
}

export const chatCompletion = async (
  settings: ApiSettings,
  {
    modelName,
    messages,
    maxCompletionTokens = 4096,
    temperature = 0.2,
    topP = 0.9,
    extraBody = {},
  }: ChatCompletionOptions,
) =>
  fetchChatCompletion(settings, {
    model: modelName,
    messages,
    max_completion_tokens: maxCompletionTokens,
    temperature,
    top_p: topP,
    stream: false,
    thinking: { type: 'disabled' },
    ...extraBody,
  })

const readTextContent = (response: ChatCompletionResponse) => {
  const content = response.choices?.[0]?.message?.content

  if (typeof content === 'string' && content.trim()) {
    return content
  }

  const preview = JSON.stringify(response).slice(0, 500)
  throw new MimoApiError(
    `MiMo API 未返回有效文本内容。实际返回：${preview}`,
    undefined,
    preview,
  )
}

const parseAndValidate = <T>(
  content: string,
  validator: (value: unknown) => T,
) => {
  try {
    return validator(parseJsonSafely<unknown>(content))
  } catch (error) {
    if (error instanceof JsonParseError) {
      throw new MimoApiError(`${error.message} 原始返回前 500 字：${error.preview}`, undefined, error.preview)
    }

    if (error instanceof AiValidationError) {
      throw new MimoApiError(error.message)
    }

    if (error instanceof Error) {
      throw new MimoApiError(error.message)
    }

    throw new MimoApiError('AI 返回格式不符合预期，请重试。')
  }
}

const RETRY_SUFFIX =
  '上一次返回不是有效 JSON。请严格只返回合法 JSON，不要 Markdown，不要代码块，不要解释文字。返回的第一个字符必须是 {，最后一个字符必须是 }。'

const callJsonTaskWithRetry = async <T>({
  settings,
  buildMessages,
  parseContent,
}: {
  settings: ApiSettings
  buildMessages: () => ChatMessage[]
  parseContent: (content: string) => T
}): Promise<T> => {
  const messages = buildMessages()

  try {
    const response = await chatCompletion(settings, {
      modelName: settings.analysisModelId || 'mimo-v2.5',
      messages,
      maxCompletionTokens: 4096,
      temperature: 0.2,
      topP: 0.9,
    })

    return parseContent(readTextContent(response))
  } catch {
    // First attempt failed, retry with stricter prompt
  }

  const retryMessages: ChatMessage[] = [
    ...messages,
    { role: 'user' as const, content: RETRY_SUFFIX },
  ]

  const retryResponse = await chatCompletion(settings, {
    modelName: settings.analysisModelId || 'mimo-v2.5',
    messages: retryMessages,
    maxCompletionTokens: 4096,
    temperature: 0.1,
    topP: 0.85,
  })

  return parseContent(readTextContent(retryResponse))
}

export const generateReferenceAnalysis = async ({
  settings,
  parsedReference,
  selectedTarget,
  selectedItems,
}: {
  settings: ApiSettings
  parsedReference: ParsedReference
  selectedTarget: TrainingTarget
  selectedItems: ReciteItem[]
}): Promise<AiReferenceAnalysis> => {
  try {
    return await callJsonTaskWithRetry({
      settings,
      buildMessages: () =>
        buildReferenceAnalysisPrompt({ parsedReference, selectedTarget, selectedItems }),
      parseContent: (content) => parseAndValidate(content, validateReferenceAnalysis),
    })
  } catch (error) {
    if (error instanceof MimoApiError) {
      throw error
    }

    throw new MimoApiError('AI 返回格式仍不符合预期。请尝试修改原文格式，或缩短文本后重试。')
  }
}

export const extractRecitationKeywords = async ({
  settings,
  parsedReference,
  selectedTarget,
  selectedItems,
}: {
  settings: ApiSettings
  parsedReference: ParsedReference
  selectedTarget: TrainingTarget
  selectedItems: ReciteItem[]
}): Promise<KeywordExtractionResult> => {
  try {
    return await callJsonTaskWithRetry({
      settings,
      buildMessages: () =>
        buildKeywordExtractionPrompt({ parsedReference, selectedTarget, selectedItems }),
      parseContent: (content) => parseAndValidate(content, validateKeywordExtraction),
    })
  } catch (error) {
    if (error instanceof MimoApiError) {
      throw error
    }

    throw new MimoApiError('AI 返回格式仍不符合预期。请尝试修改原文格式，或缩短文本后重试。')
  }
}

export const reviewRecitation = async ({
  settings,
  parsedReference,
  selectedTarget,
  selectedItems,
  keywordExtraction,
  recognizedText,
  originalText,
}: {
  settings: ApiSettings
  parsedReference: ParsedReference
  selectedTarget: TrainingTarget
  selectedItems: ReciteItem[]
  keywordExtraction: KeywordExtractionResult | null
  recognizedText: string
  originalText: string
}): Promise<AiRecitationReview> => {
  try {
    return await callJsonTaskWithRetry({
      settings,
      buildMessages: () =>
        buildRecitationReviewPrompt({
          parsedReference,
          selectedTarget,
          selectedItems,
          keywordExtraction,
          recognizedText,
          originalText,
        }),
      parseContent: (content) =>
        filterAsrNotationOnlyReviewIssues(
          parseAndValidate(content, validateRecitationReview),
        ),
    })
  } catch (error) {
    if (error instanceof MimoApiError) {
      throw error
    }

    throw new MimoApiError('AI 返回格式仍不符合预期。请尝试修改原文格式，或缩短文本后重试。')
  }
}

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new MimoApiError('读取录音文件失败。'))
    reader.readAsDataURL(blob)
  })

const encodeAudioBufferToWav = (audioBuffer: AudioBuffer) => {
  const channelCount = audioBuffer.numberOfChannels
  const sampleRate = audioBuffer.sampleRate
  const sampleCount = audioBuffer.length
  const bytesPerSample = 2
  const blockAlign = channelCount * bytesPerSample
  const dataSize = sampleCount * blockAlign
  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)
  let offset = 0

  const writeString = (value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset, value.charCodeAt(index))
      offset += 1
    }
  }

  writeString('RIFF')
  view.setUint32(offset, 36 + dataSize, true)
  offset += 4
  writeString('WAVE')
  writeString('fmt ')
  view.setUint32(offset, 16, true)
  offset += 4
  view.setUint16(offset, 1, true)
  offset += 2
  view.setUint16(offset, channelCount, true)
  offset += 2
  view.setUint32(offset, sampleRate, true)
  offset += 4
  view.setUint32(offset, sampleRate * blockAlign, true)
  offset += 4
  view.setUint16(offset, blockAlign, true)
  offset += 2
  view.setUint16(offset, bytesPerSample * 8, true)
  offset += 2
  writeString('data')
  view.setUint32(offset, dataSize, true)
  offset += 4

  const channelData = Array.from({ length: channelCount }, (_, channelIndex) =>
    audioBuffer.getChannelData(channelIndex),
  )

  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
    for (let channelIndex = 0; channelIndex < channelCount; channelIndex += 1) {
      const sample = Math.max(-1, Math.min(1, channelData[channelIndex][sampleIndex]))
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
      offset += 2
    }
  }

  return new Blob([buffer], { type: 'audio/wav' })
}

const convertUnsupportedAudioToWav = async (audioBlob: Blob) => {
  const audioContext = new AudioContext()

  try {
    const audioBuffer = await audioContext.decodeAudioData(await audioBlob.arrayBuffer())
    return encodeAudioBufferToWav(audioBuffer)
  } catch {
    throw new MimoApiError('当前浏览器录音格式无法转换为 wav。请尝试更换浏览器，或后续使用 wav/mp3 录音文件。')
  } finally {
    await audioContext.close().catch(() => undefined)
  }
}

const isSupportedAsrAudioType = (mimeType: string) =>
  ['audio/wav', 'audio/wave', 'audio/x-wav', 'audio/mpeg', 'audio/mp3'].some((type) =>
    mimeType.toLowerCase().startsWith(type),
  )

const prepareAsrAudioBlob = async (audioBlob: Blob) => {
  if (isSupportedAsrAudioType(audioBlob.type)) {
    return audioBlob
  }

  return convertUnsupportedAudioToWav(audioBlob)
}

export const transcribeAudio = async ({
  settings,
  audioBlob,
}: {
  settings: ApiSettings
  audioBlob: Blob
}) => {
  const uploadBlob = await prepareAsrAudioBlob(audioBlob)
  const uploadType = uploadBlob.type || 'audio/wav'
  const dataUrl = await blobToDataUrl(uploadBlob)
  const normalizedDataUrl = dataUrl.startsWith('data:')
    ? dataUrl
    : `data:${uploadType};base64,${dataUrl}`
  const response = await fetchChatCompletion(settings, {
    model: settings.asrModelId || 'mimo-v2.5-asr',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'input_audio',
            input_audio: {
              data: normalizedDataUrl,
            },
          },
        ],
      },
    ],
    asr_options: {
      language: 'auto',
    },
  })

  const content = response.choices?.[0]?.message?.content
  const audioTokens = (response as Record<string, unknown>).usage &&
    ((response as Record<string, unknown>).usage as Record<string, unknown>).prompt_tokens_details &&
    (((response as Record<string, unknown>).usage as Record<string, unknown>).prompt_tokens_details as Record<string, unknown>).audio_tokens

  // API 确实处理了音频但返回空文本
  if (typeof content === 'string' && !content.trim() && typeof audioTokens === 'number' && audioTokens > 0) {
    throw new MimoApiError(
      `ASR 已接收音频（${audioTokens} 个音频 token）但未产生识别结果。录音格式：${audioBlob.type || '未知'}，大小：${Math.ceil(audioBlob.size / 1024)} KB。\n\n可能原因：录音音量过低、时长过短、或浏览器录音格式（如 webm）转换后不兼容。建议使用 Chrome 浏览器录音，或直接手动输入背诵文本。`,
    )
  }

  try {
    return readTextContent(response)
  } catch (error) {
    if (error instanceof MimoApiError) {
      throw new MimoApiError(
        `${error.message}\n\n录音格式：${audioBlob.type || '未知'}，大小：${Math.ceil(audioBlob.size / 1024)} KB。如果浏览器录音格式不被 MiMo 支持，可尝试改用 Chrome 录音或使用 wav/mp3 文件。`,
        error.status,
        error.rawPreview,
      )
    }

    throw error
  }
}

const base64ToBlob = (base64: string, type: string) => {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)

  for (let index = 0; index < binaryString.length; index += 1) {
    bytes[index] = binaryString.charCodeAt(index)
  }

  return new Blob([bytes], { type })
}

export const synthesizeSpeech = async ({
  settings,
  text,
}: {
  settings: ApiSettings
  text: string
}) => {
  const response = await fetchChatCompletion(settings, {
    model: settings.ttsModelId || 'mimo-v2.5-tts',
    messages: [
      {
        role: 'user',
        content: '请用清晰、平稳的普通话朗读。语速稍快，关键术语略作停顿。',
      },
      {
        role: 'assistant',
        content: text,
      },
    ],
    audio: {
      format: 'wav',
      voice: settings.ttsVoice || 'mimo_default',
    },
  })
  const audioBase64 = response.choices?.[0]?.message?.audio?.data

  if (typeof audioBase64 !== 'string' || !audioBase64) {
    throw new MimoApiError('MiMo TTS 返回中缺少 choices[0].message.audio.data。')
  }

  return base64ToBlob(audioBase64, 'audio/wav')
}

export const testConnection = async (settings: ApiSettings) => {
  const response = await chatCompletion(settings, {
    modelName: settings.analysisModelId || 'mimo-v2.5',
    messages: [
      {
        role: 'system',
        content: '只返回 JSON。',
      },
      {
        role: 'user',
        content: '{"ping":"pong"}',
      },
    ],
    maxCompletionTokens: 64,
    temperature: 0,
    topP: 1,
  })

  return readTextContent(response)
}

export const getMimoErrorMessage = (error: unknown) => {
  if (error instanceof MimoApiError) {
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return '请求失败，请稍后重试。'
}
