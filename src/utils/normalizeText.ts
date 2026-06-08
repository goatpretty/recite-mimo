export interface NormalizeTextOptions {
  ignorePunctuation: boolean
  ignoreWhitespace: boolean
  unifyCase: boolean
  unifyFullWidthHalfWidth: boolean
}

export const defaultNormalizeTextOptions: NormalizeTextOptions = {
  ignorePunctuation: true,
  ignoreWhitespace: true,
  unifyCase: true,
  unifyFullWidthHalfWidth: true,
}

const punctuationPattern =
  /[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~，。！？；：“”‘’、（）《》〈〉【】『』「」—…·￥]/g

export const toHalfWidth = (value: string): string =>
  Array.from(value)
    .map((char) => {
      const code = char.charCodeAt(0)

      if (code === 0x3000) {
        return ' '
      }

      if (code >= 0xff01 && code <= 0xff5e) {
        return String.fromCharCode(code - 0xfee0)
      }

      return char
    })
    .join('')

export const normalizeText = (
  value: string,
  options: NormalizeTextOptions = defaultNormalizeTextOptions,
): string => {
  let normalized = value ?? ''

  if (options.unifyFullWidthHalfWidth) {
    normalized = toHalfWidth(normalized)
  }

  if (options.unifyCase) {
    normalized = normalized.toLocaleLowerCase()
  }

  if (options.ignorePunctuation) {
    normalized = normalized.replace(punctuationPattern, '')
  }

  if (options.ignoreWhitespace) {
    normalized = normalized.replace(/\s+/g, '')
  }

  return normalized
}

export const toComparableUnits = (
  value: string,
  options: NormalizeTextOptions = defaultNormalizeTextOptions,
): string[] => Array.from(normalizeText(value, options))
