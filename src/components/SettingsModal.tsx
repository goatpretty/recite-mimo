import type { ApiSettings, ModelOption } from '../types/mimo'
import { ApiSettingsPanel } from './ApiSettingsPanel'

interface SettingsModalProps {
  isOpen: boolean
  settings: ApiSettings
  asrModels: ModelOption[]
  ttsModels: ModelOption[]
  analysisModels: ModelOption[]
  ttsVoices: string[]
  onClose: () => void
  onApiKeyChange: (value: string) => void
  onApiBaseUrlChange: (value: string) => void
  onRememberChange: (value: boolean) => void
  onModelChange: (key: 'asrModelId' | 'ttsModelId' | 'analysisModelId', value: string) => void
  onTtsVoiceChange: (value: string) => void
}

export const SettingsModal = ({
  isOpen,
  settings,
  asrModels,
  ttsModels,
  analysisModels,
  ttsVoices,
  onClose,
  onApiKeyChange,
  onApiBaseUrlChange,
  onRememberChange,
  onModelChange,
  onTtsVoiceChange,
}: SettingsModalProps) => {
  if (!isOpen) {
    return null
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="settings-modal" role="dialog" aria-modal="true" aria-label="API 设置">
        <div className="settings-modal__header">
          <div>
            <strong>设置</strong>
            <span>API Key 和模型选择</span>
          </div>
          <button type="button" className="icon-button" aria-label="关闭设置" onClick={onClose}>
            ×
          </button>
        </div>

        <ApiSettingsPanel
          settings={settings}
          asrModels={asrModels}
          ttsModels={ttsModels}
          analysisModels={analysisModels}
          ttsVoices={ttsVoices}
          onApiKeyChange={onApiKeyChange}
          onApiBaseUrlChange={onApiBaseUrlChange}
          onRememberChange={onRememberChange}
          onModelChange={onModelChange}
          onTtsVoiceChange={onTtsVoiceChange}
        />

        <div className="settings-modal__footer">
          <button type="button" className="button button--strong" onClick={onClose}>
            完成
          </button>
        </div>
      </div>
    </div>
  )
}
