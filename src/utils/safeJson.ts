export class JsonParseError extends Error {
  preview: string

  constructor(message: string, rawText: string) {
    super(message)
    this.name = 'JsonParseError'
    this.preview = rawText.slice(0, 500)
  }
}

const extractJsonCandidate = (rawText: string) => {
  const trimmed = rawText.trim()
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)

  if (codeBlockMatch?.[1]) {
    return codeBlockMatch[1].trim()
  }

  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1)
  }

  return trimmed
}

export const parseJsonSafely = <T>(rawText: string): T => {
  const candidate = extractJsonCandidate(rawText)

  try {
    return JSON.parse(candidate) as T
  } catch {
    throw new JsonParseError('AI 返回内容不是有效 JSON。', rawText)
  }
}

export const getJsonPreview = (rawText: string) => rawText.slice(0, 500)
