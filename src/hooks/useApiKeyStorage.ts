import { useEffect, useState } from 'react'

const SESSION_KEY = 'recite-mimo-api-key'
const LOCAL_KEY = 'recite-mimo-api-key-remembered'

export interface ApiKeyStorageState {
  apiKey: string
  rememberApiKey: boolean
  setApiKey: (apiKey: string) => void
  setRememberApiKey: (remember: boolean) => void
}

const readInitialApiKey = () => {
  const localValue = window.localStorage.getItem(LOCAL_KEY)

  if (localValue) {
    return {
      apiKey: localValue,
      rememberApiKey: true,
    }
  }

  return {
    apiKey: window.sessionStorage.getItem(SESSION_KEY) ?? '',
    rememberApiKey: false,
  }
}

export const useApiKeyStorage = (): ApiKeyStorageState => {
  const [storageState, setStorageState] = useState(readInitialApiKey)
  const { apiKey, rememberApiKey } = storageState

  useEffect(() => {
    if (!apiKey) {
      window.localStorage.removeItem(LOCAL_KEY)
      window.sessionStorage.removeItem(SESSION_KEY)
      return
    }

    if (rememberApiKey) {
      window.localStorage.setItem(LOCAL_KEY, apiKey)
      window.sessionStorage.removeItem(SESSION_KEY)
      return
    }

    window.localStorage.removeItem(LOCAL_KEY)
    window.sessionStorage.setItem(SESSION_KEY, apiKey)
  }, [apiKey, rememberApiKey])

  return {
    apiKey,
    rememberApiKey,
    setApiKey: (nextApiKey: string) =>
      setStorageState((current) => ({
        ...current,
        apiKey: nextApiKey,
      })),
    setRememberApiKey: (nextRememberApiKey: boolean) =>
      setStorageState((current) => ({
        ...current,
        rememberApiKey: nextRememberApiKey,
      })),
  }
}
