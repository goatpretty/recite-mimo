import { useMemo, useState } from 'react'
import { ApiSettingsPanel } from './components/ApiSettingsPanel'
import { CorrectionPanel } from './components/CorrectionPanel'
import { MemoryAssistPanel } from './components/MemoryAssistPanel'
import { RecognitionPanel } from './components/RecognitionPanel'
import { TextInputPanel } from './components/TextInputPanel'
import { TrainingPanel } from './components/TrainingPanel'
import {
  analysisModelOptions,
  asrModelOptions,
  ttsModelOptions,
} from './data/modelOptions'
import { useApiKeyStorage } from './hooks/useApiKeyStorage'
import { useMediaRecorder } from './hooks/useMediaRecorder'
import type { ApiSettings } from './types/mimo'
import {
  createParsedReferenceFromItem,
  findReciteItemById,
  getReferenceSummary,
  parseReferenceText,
} from './utils/referenceParser'
import type { RecitationScore } from './utils/recitationScoring'
import { scoreRecitation } from './utils/recitationScoring'
import './App.css'

const fullTrainingTargetId = 'full'

function App() {
  const apiKeyStorage = useApiKeyStorage()
  const recorder = useMediaRecorder()
  const [sourceText, setSourceText] = useState('')
  const [recognizedText, setRecognizedText] = useState('')
  const [selectedTargetId, setSelectedTargetId] = useState(fullTrainingTargetId)
  const [recitationScore, setRecitationScore] = useState<RecitationScore | null>(null)
  const [selectedModels, setSelectedModels] = useState({
    asrModelId: asrModelOptions[0].id,
    ttsModelId: ttsModelOptions[0].id,
    analysisModelId: analysisModelOptions[0].id,
  })

  const parsedReference = useMemo(() => parseReferenceText(sourceText), [sourceText])
  const selectedReference = useMemo(
    () =>
      selectedTargetId === fullTrainingTargetId
        ? parsedReference
        : createParsedReferenceFromItem(parsedReference, selectedTargetId),
    [parsedReference, selectedTargetId],
  )
  const selectedItem = useMemo(
    () =>
      selectedTargetId === fullTrainingTargetId
        ? null
        : findReciteItemById(parsedReference.items, selectedTargetId),
    [parsedReference.items, selectedTargetId],
  )
  const trainingText = selectedReference.rawText
  const trainingTargetLabel =
    selectedTargetId === fullTrainingTargetId
      ? `全文：${getReferenceSummary(parsedReference)}`
      : `${selectedItem?.marker ? `${selectedItem.marker} ` : ''}${selectedItem?.content || '当前考点'}`
  const hasApiKey = apiKeyStorage.apiKey.trim().length > 0
  const hasTrainingText = trainingText.trim().length > 0
  const canScore = hasTrainingText && recognizedText.trim().length > 0

  const settings: ApiSettings = {
    apiKey: apiKeyStorage.apiKey,
    rememberApiKey: apiKeyStorage.rememberApiKey,
    ...selectedModels,
  }

  const handleModelChange = (
    key: 'asrModelId' | 'ttsModelId' | 'analysisModelId',
    value: string,
  ) => {
    setSelectedModels((current) => ({
      ...current,
      [key]: value,
    }))
  }

  const handleSourceTextChange = (value: string) => {
    setSourceText(value)
    setSelectedTargetId(fullTrainingTargetId)
    setRecitationScore(null)
  }

  const handleRecognizedTextChange = (value: string) => {
    setRecognizedText(value)
    setRecitationScore(null)
  }

  const handleTargetSelect = (id: string) => {
    setSelectedTargetId(id)
    setRecitationScore(null)
    recorder.resetRecording()
  }

  const handleClearSourceText = () => {
    setSourceText('')
    setRecognizedText('')
    setRecitationScore(null)
    setSelectedTargetId(fullTrainingTargetId)
    recorder.resetRecording()
  }

  const handleLocalScore = () => {
    if (!canScore) {
      setRecitationScore(null)
      return
    }

    setRecitationScore(scoreRecitation(selectedReference, recognizedText))
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">临时会话式背书训练器</p>
          <h1>MiMo 背书训练</h1>
        </div>
        <p>
          每次打开网页后手动粘贴原文和输入 API Key。当前不接真实 MiMo API，
          本地分段、录音、评分和记忆辅助可独立使用。
        </p>
      </header>

      <div className="layout">
        <div className="layout__main">
          <ApiSettingsPanel
            settings={settings}
            asrModels={asrModelOptions}
            ttsModels={ttsModelOptions}
            analysisModels={analysisModelOptions}
            onApiKeyChange={apiKeyStorage.setApiKey}
            onRememberChange={apiKeyStorage.setRememberApiKey}
            onModelChange={handleModelChange}
          />

          <TextInputPanel
            sourceText={sourceText}
            parsedReference={parsedReference}
            selectedTargetId={selectedTargetId}
            onSourceTextChange={handleSourceTextChange}
            onTargetSelect={handleTargetSelect}
            onClearSourceText={handleClearSourceText}
          />

          <TrainingPanel
            hasApiKey={hasApiKey}
            hasTrainingText={hasTrainingText}
            targetLabel={trainingTargetLabel}
            recorder={recorder}
          />
        </div>

        <div className="layout__side">
          <RecognitionPanel
            recognizedText={recognizedText}
            canScore={canScore}
            hasTrainingText={hasTrainingText}
            onRecognizedTextChange={handleRecognizedTextChange}
            onLocalScore={handleLocalScore}
          />

          <CorrectionPanel score={recitationScore} canScore={canScore} />

          <MemoryAssistPanel
            parsedReference={selectedReference}
            score={recitationScore}
          />
        </div>
      </div>
    </main>
  )
}

export default App
