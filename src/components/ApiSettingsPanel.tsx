import type { ApiSettings, ModelOption } from '../types/mimo'
import { Panel } from './Panel'

interface ApiSettingsPanelProps {
  settings: ApiSettings
  asrModels: ModelOption[]
  ttsModels: ModelOption[]
  analysisModels: ModelOption[]
  onApiKeyChange: (value: string) => void
  onRememberChange: (value: boolean) => void
  onModelChange: (key: 'asrModelId' | 'ttsModelId' | 'analysisModelId', value: string) => void
}

export const ApiSettingsPanel = ({
  settings,
  asrModels,
  ttsModels,
  analysisModels,
  onApiKeyChange,
  onRememberChange,
  onModelChange,
}: ApiSettingsPanelProps) => {
  const hasApiKey = settings.apiKey.trim().length > 0

  return (
    <Panel title="API 设置" eyebrow="纯前端会话">
      <div className="notice">
        纯前端模式下 API Key 只在当前浏览器中使用；默认保存到 sessionStorage。
        勾选“本浏览器记住”后会保存到 localStorage，请勿在公共电脑保存。
      </div>

      <div className="form-grid form-grid--api">
        <label className="field field--wide">
          <span>MiMo API Key</span>
          <input
            type="password"
            value={settings.apiKey}
            placeholder="每次打开网页后手动输入"
            autoComplete="off"
            onChange={(event) => onApiKeyChange(event.target.value)}
          />
        </label>

        <label className="check-field">
          <input
            type="checkbox"
            checked={settings.rememberApiKey}
            onChange={(event) => onRememberChange(event.target.checked)}
          />
          <span>本浏览器记住</span>
        </label>

        <ModelSelect
          label="ASR 模型"
          value={settings.asrModelId}
          options={asrModels}
          onChange={(value) => onModelChange('asrModelId', value)}
        />

        <ModelSelect
          label="TTS 模型"
          value={settings.ttsModelId}
          options={ttsModels}
          onChange={(value) => onModelChange('ttsModelId', value)}
        />

        <ModelSelect
          label="辅助分析模型"
          value={settings.analysisModelId}
          options={analysisModels}
          onChange={(value) => onModelChange('analysisModelId', value)}
        />
      </div>

      <div className="inline-tools">
        <button
          type="button"
          className="button button--secondary"
          disabled={!hasApiKey}
          onClick={() => onApiKeyChange('')}
        >
          清除 API Key
        </button>
      </div>

      <p className={hasApiKey ? 'status status--ready' : 'status status--muted'}>
        {hasApiKey
          ? '已输入 API Key，后续阶段可启用 ASR / TTS / AI 辅助分析。'
          : '未输入 API Key，本地分段、录音、评分和记忆辅助仍可使用；ASR、TTS、AI 辅助分析按钮已禁用。'}
      </p>
    </Panel>
  )
}

interface ModelSelectProps {
  label: string
  value: string
  options: ModelOption[]
  onChange: (value: string) => void
}

const ModelSelect = ({ label, value, options, onChange }: ModelSelectProps) => (
  <label className="field">
    <span>{label}</span>
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.name}
        </option>
      ))}
    </select>
  </label>
)
