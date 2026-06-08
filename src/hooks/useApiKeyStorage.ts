import { useEffect, useState } from 'react'

const SESSION_KEY = 'recite-mimo-api-key'
const LOCAL_KEY = 'recite-mimo-api-key-remembered'
const SESSION_SETTINGS_KEY = 'recite-mimo-api-settings'
const LOCAL_SETTINGS_KEY = 'recite-mimo-api-settings-remembered'
const MODEL_PREFS_KEY = 'recite-mimo-model-prefs'
const defaultApiBaseUrl = 'https://api.xiaomimimo.com/v1'

export interface ModelPrefs {
  asrModelId: string
  ttsModelId: string
  analysisModelId: string
  ttsVoice: string
}

export interface ApiKeyStorageState {
  apiKey: string
  apiBaseUrl: string
  rememberApiKey: boolean
  modelPrefs: ModelPrefs
  setApiKey: (apiKey: string) => void
  setApiBaseUrl: (apiBaseUrl: string) => void
  setRememberApiKey: (remember: boolean) => void
  setModelPrefs: (prefs: Partial<ModelPrefs>) => void
}

interface StoredApiSettings {
  apiKey: string
  apiBaseUrl: string
}

const readStoredSettings = (settingsKey: string, legacyKey: string): StoredApiSettings | null => {
  const settingsValue = window.localStorage.getItem(settingsKey) ?? window.sessionStorage.getItem(settingsKey)

  if (settingsValue) {
    try {
      const parsed = JSON.parse(settingsValue) as Partial<StoredApiSettings>

      if (typeof parsed.apiKey === 'string') {
        return {
          apiKey: parsed.apiKey,
          apiBaseUrl: typeof parsed.apiBaseUrl === 'string' ? parsed.apiBaseUrl : defaultApiBaseUrl,
        }
      }
    } catch {
      return null
    }
  }

  const legacyValue = window.localStorage.getItem(legacyKey) ?? window.sessionStorage.getItem(legacyKey)

  return legacyValue
    ? {
        apiKey: legacyValue,
        apiBaseUrl: defaultApiBaseUrl,
      }
    : null
}

const readInitialApiKey = () => {
  const localValue = readStoredSettings(LOCAL_SETTINGS_KEY, LOCAL_KEY)

  if (localValue) {
    return {
      apiKey: localValue.apiKey,
      apiBaseUrl: localValue.apiBaseUrl,
      rememberApiKey: true,
    }
  }

  const sessionValue = readStoredSettings(SESSION_SETTINGS_KEY, SESSION_KEY)

  return {
    apiKey: sessionValue?.apiKey ?? '',
    apiBaseUrl: sessionValue?.apiBaseUrl ?? defaultApiBaseUrl,
    rememberApiKey: false,
  }
}

const readModelPrefs = (defaults: ModelPrefs): ModelPrefs => {
  try {
    const raw = window.localStorage.getItem(MODEL_PREFS_KEY)

    if (!raw) {
      return defaults
    }

    const parsed = JSON.parse(raw) as Partial<ModelPrefs>

    return {
      asrModelId: typeof parsed.asrModelId === 'string' ? parsed.asrModelId : defaults.asrModelId,
      ttsModelId: typeof parsed.ttsModelId === 'string' ? parsed.ttsModelId : defaults.ttsModelId,
      analysisModelId: typeof parsed.analysisModelId === 'string' ? parsed.analysisModelId : defaults.analysisModelId,
      ttsVoice: typeof parsed.ttsVoice === 'string' ? parsed.ttsVoice : defaults.ttsVoice,
    }
  } catch {
    return defaults
  }
}

export const useApiKeyStorage = (defaultModelPrefs: ModelPrefs): ApiKeyStorageState => {
  const [storageState, setStorageState] = useState(readInitialApiKey)
  const [modelPrefs, setModelPrefsState] = useState<ModelPrefs>(() => readModelPrefs(defaultModelPrefs))
  const { apiKey, apiBaseUrl, rememberApiKey } = storageState

  useEffect(() => {
    if (!apiKey) {
      window.localStorage.removeItem(LOCAL_KEY)
      window.localStorage.removeItem(LOCAL_SETTINGS_KEY)
      window.sessionStorage.removeItem(SESSION_KEY)
      window.sessionStorage.removeItem(SESSION_SETTINGS_KEY)
      return
    }

    const serializedSettings = JSON.stringify({
      apiKey,
      apiBaseUrl: apiBaseUrl.trim() || defaultApiBaseUrl,
    })

    if (rememberApiKey) {
      window.localStorage.setItem(LOCAL_SETTINGS_KEY, serializedSettings)
      window.localStorage.removeItem(LOCAL_KEY)
      window.sessionStorage.removeItem(SESSION_KEY)
      window.sessionStorage.removeItem(SESSION_SETTINGS_KEY)
      return
    }

    window.localStorage.removeItem(LOCAL_KEY)
    window.localStorage.removeItem(LOCAL_SETTINGS_KEY)
    window.sessionStorage.setItem(SESSION_SETTINGS_KEY, serializedSettings)
    window.sessionStorage.removeItem(SESSION_KEY)
  }, [apiKey, apiBaseUrl, rememberApiKey])

  useEffect(() => {
    window.localStorage.setItem(MODEL_PREFS_KEY, JSON.stringify(modelPrefs))
  }, [modelPrefs])

  return {
    apiKey,
    apiBaseUrl,
    rememberApiKey,
    modelPrefs,
    setApiKey: (nextApiKey: string) =>
      setStorageState((current) => ({
        ...current,
        apiKey: nextApiKey,
      })),
    setApiBaseUrl: (nextApiBaseUrl: string) =>
      setStorageState((current) => ({
        ...current,
        apiBaseUrl: nextApiBaseUrl,
      })),
    setRememberApiKey: (nextRememberApiKey: boolean) =>
      setStorageState((current) => ({
        ...current,
        rememberApiKey: nextRememberApiKey,
      })),
    setModelPrefs: (partial: Partial<ModelPrefs>) =>
      setModelPrefsState((current) => ({
        ...current,
        ...partial,
      })),
  }
}
