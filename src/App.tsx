import { useEffect, useMemo, useState } from 'react'
import { AppHeader } from './components/AppHeader'
import { SettingsModal } from './components/SettingsModal'
import { Stepper, type StepperStep } from './components/Stepper'
import { AiAnalysisStep } from './components/steps/AiAnalysisStep'
import { KeywordExtractStep } from './components/steps/KeywordExtractStep'
import { MemorizePromptStep } from './components/steps/MemorizePromptStep'
import { SourceInputStep } from './components/steps/SourceInputStep'
import { StructureParseStep } from './components/steps/StructureParseStep'
import { VoiceRecitationStep } from './components/steps/VoiceRecitationStep'
import {
  analysisModelOptions,
  asrModelOptions,
  ttsModelOptions,
  ttsVoiceOptions,
} from './data/modelOptions'
import { useApiKeyStorage } from './hooks/useApiKeyStorage'
import { useMediaRecorder } from './hooks/useMediaRecorder'
import {
  extractRecitationKeywords,
  generateReferenceAnalysis,
  getMimoErrorMessage,
  reviewRecitation,
  synthesizeSpeech,
  transcribeAudio,
} from './services/mimoClient'
import {
  fullTrainingTargetId,
  type AiRecitationReview,
  type AiReferenceAnalysis,
  type AsyncTaskStatus,
  type KeywordExtractionResult,
} from './types/learning'
import type { ApiSettings } from './types/mimo'
import { parseReferenceText, type ParsedReference } from './utils/referenceParser'
import {
  getTargetReference,
  getTrainingTarget,
} from './utils/trainingTarget'
import './App.css'

const stepTitles = [
  '提交原文',
  '结构解析',
  'AI 分析原文',
  'AI 关键词抽取',
  '首字提示 / 关键词背诵',
  '语音背诵与 AI 评分',
]

const defaultModelPrefs = {
  asrModelId: asrModelOptions[0].id,
  ttsModelId: ttsModelOptions[0].id,
  analysisModelId: analysisModelOptions[0].id,
  ttsVoice: ttsVoiceOptions[0],
}

function App() {
  const apiKeyStorage = useApiKeyStorage(defaultModelPrefs)
  const recorder = useMediaRecorder()
  const [currentStep, setCurrentStep] = useState(0)
  const [sourceText, setSourceText] = useState('')
  const [parsedReference, setParsedReference] = useState<ParsedReference | null>(null)
  const [selectedTargetId, setSelectedTargetId] = useState(fullTrainingTargetId)
  const [aiAnalysis, setAiAnalysis] = useState<AiReferenceAnalysis | null>(null)
  const [aiAnalysisStatus, setAiAnalysisStatus] = useState<AsyncTaskStatus>('idle')
  const [aiAnalysisError, setAiAnalysisError] = useState('')
  const [keywordExtraction, setKeywordExtraction] = useState<KeywordExtractionResult | null>(null)
  const [keywordExtractionStatus, setKeywordExtractionStatus] = useState<AsyncTaskStatus>('idle')
  const [keywordExtractionError, setKeywordExtractionError] = useState('')
  const [memorizeMode, setMemorizeMode] = useState<'original' | 'keywords' | 'initial'>('original')
  const [showOriginal, setShowOriginal] = useState(true)
  const [recognizedText, setRecognizedText] = useState('')
  const [aiReview, setAiReview] = useState<AiRecitationReview | null>(null)
  const [aiReviewStatus, setAiReviewStatus] = useState<AsyncTaskStatus>('idle')
  const [aiReviewError, setAiReviewError] = useState('')
  const [asrStatus, setAsrStatus] = useState<AsyncTaskStatus>('idle')
  const [asrError, setAsrError] = useState('')
  const [ttsStatus, setTtsStatus] = useState<AsyncTaskStatus>('idle')
  const [ttsError, setTtsError] = useState('')
  const [ttsAudioUrls, setTtsAudioUrls] = useState<string[]>([])
  const [ttsAudioIndex, setTtsAudioIndex] = useState(0)
  const [settingsModalOpen, setSettingsModalOpen] = useState(
    () => apiKeyStorage.apiKey.trim().length === 0,
  )

  const hasApiKey = apiKeyStorage.apiKey.trim().length > 0
  const selectedReference = useMemo(
    () => getTargetReference(parsedReference, selectedTargetId),
    [parsedReference, selectedTargetId],
  )
  const trainingTarget = useMemo(
    () => getTrainingTarget(parsedReference, selectedTargetId),
    [parsedReference, selectedTargetId],
  )
  const targetSummary = trainingTarget?.summary ?? '尚未选择训练范围'
  const targetItems = trainingTarget?.items ?? []

  const settings: ApiSettings = {
    apiKey: apiKeyStorage.apiKey,
    rememberApiKey: apiKeyStorage.rememberApiKey,
    apiBaseUrl: apiKeyStorage.apiBaseUrl,
    ...apiKeyStorage.modelPrefs,
  }

  useEffect(
    () => () => {
      ttsAudioUrls.forEach((url) => URL.revokeObjectURL(url))
    },
    [ttsAudioUrls],
  )

  const replaceTtsAudioUrls = (nextUrls: string[]) => {
    setTtsAudioUrls((currentUrls) => {
      currentUrls.forEach((url) => URL.revokeObjectURL(url))
      return nextUrls
    })
    setTtsAudioIndex(0)
  }

  const steps: StepperStep[] = stepTitles.map((title, index) => ({
    title,
    completed:
      index === 0
        ? Boolean(parsedReference)
        : index === 1
          ? Boolean(parsedReference && trainingTarget)
          : index === 2
            ? Boolean(aiAnalysis)
            : index === 3
              ? Boolean(keywordExtraction)
              : index === 4
                ? currentStep > 4
                : Boolean(aiReview),
    disabled: index > 0 && !parsedReference,
  }))

  const resetAiDerivedState = () => {
    setAiAnalysis(null)
    setAiAnalysisStatus('idle')
    setAiAnalysisError('')
    setKeywordExtraction(null)
    setKeywordExtractionStatus('idle')
    setKeywordExtractionError('')
    setAiReview(null)
    setAiReviewStatus('idle')
    setAiReviewError('')
    setAsrStatus('idle')
    setAsrError('')
    setTtsStatus('idle')
    setTtsError('')
    replaceTtsAudioUrls([])
  }

  const handleModelChange = (
    key: 'asrModelId' | 'ttsModelId' | 'analysisModelId',
    value: string,
  ) => {
    apiKeyStorage.setModelPrefs({ [key]: value })
  }

  const handleSourceTextChange = (value: string) => {
    setSourceText(value)
    setParsedReference(null)
    setSelectedTargetId(fullTrainingTargetId)
    setRecognizedText('')
    recorder.resetRecording()
    resetAiDerivedState()
  }

  const handleClearSourceText = () => {
    setSourceText('')
    setParsedReference(null)
    setSelectedTargetId(fullTrainingTargetId)
    setRecognizedText('')
    setCurrentStep(0)
    recorder.resetRecording()
    resetAiDerivedState()
  }

  const handleStartParse = () => {
    if (!sourceText.trim()) {
      return
    }

    setParsedReference(parseReferenceText(sourceText))
    setSelectedTargetId(fullTrainingTargetId)
    resetAiDerivedState()
    setCurrentStep(1)
  }

  const handleTargetSelect = (id: string) => {
    setSelectedTargetId(id)
    setRecognizedText('')
    recorder.resetRecording()
    resetAiDerivedState()
  }

  const handleStepSelect = (stepIndex: number) => {
    if (stepIndex > 0 && !parsedReference) {
      return
    }

    setCurrentStep(stepIndex)
  }

  const handlePreviousStep = () => {
    setCurrentStep((step) => Math.max(0, step - 1))
  }

  const handleNextStep = () => {
    if (currentStep === 0) {
      handleStartParse()
      return
    }

    setCurrentStep((step) => Math.min(stepTitles.length - 1, step + 1))
  }

  const handleGenerateAiAnalysis = async () => {
    if (!hasApiKey) {
      setSettingsModalOpen(true)
      return
    }

    if (!parsedReference || !trainingTarget) {
      setAiAnalysisError('请先完成结构解析并选择训练范围。')
      setAiAnalysisStatus('error')
      return
    }

    setAiAnalysisStatus('loading')
    setAiAnalysisError('')

    try {
      const result = await generateReferenceAnalysis({
        settings,
        parsedReference,
        selectedTarget: trainingTarget,
        selectedItems: targetItems,
      })
      setAiAnalysis(result)
      setAiAnalysisStatus('ready')
    } catch (error) {
      setAiAnalysis(null)
      setAiAnalysisStatus('error')
      setAiAnalysisError(getMimoErrorMessage(error))
    }
  }

  const handleGenerateKeywords = async () => {
    if (!hasApiKey) {
      setSettingsModalOpen(true)
      return
    }

    if (!parsedReference || !trainingTarget) {
      setKeywordExtractionError('请先完成结构解析并选择训练范围。')
      setKeywordExtractionStatus('error')
      return
    }

    setKeywordExtractionStatus('loading')
    setKeywordExtractionError('')

    try {
      const result = await extractRecitationKeywords({
        settings,
        parsedReference,
        selectedTarget: trainingTarget,
        selectedItems: targetItems,
      })
      setKeywordExtraction(result)
      setKeywordExtractionStatus('ready')
    } catch (error) {
      setKeywordExtraction(null)
      setKeywordExtractionStatus('error')
      setKeywordExtractionError(getMimoErrorMessage(error))
    }
  }

  const handleRecognizedTextChange = (value: string) => {
    setRecognizedText(value)
    setAiReview(null)
    setAiReviewStatus('idle')
  }

  const handleAiScore = async () => {
    if (!hasApiKey) {
      setSettingsModalOpen(true)
      return
    }

    if (!parsedReference || !trainingTarget || !selectedReference || !recognizedText.trim()) {
      setAiReviewError('请先完成结构解析并输入识别文本。')
      setAiReviewStatus('error')
      return
    }

    setAiReviewStatus('loading')
    setAiReviewError('')

    try {
      const result = await reviewRecitation({
        settings,
        parsedReference,
        selectedTarget: trainingTarget,
        selectedItems: targetItems,
        keywordExtraction,
        recognizedText,
        originalText: selectedReference.rawText,
      })
      setAiReview(result)
      setAiReviewStatus('ready')
    } catch (error) {
      setAiReview(null)
      setAiReviewStatus('error')
      setAiReviewError(getMimoErrorMessage(error))
    }
  }

  const handleTranscribeAudio = async () => {
    if (!hasApiKey) {
      setSettingsModalOpen(true)
      return
    }

    if (!recorder.audioBlob) {
      setAsrError('请先完成录音。')
      setAsrStatus('error')
      return
    }

    setAsrStatus('loading')
    setAsrError('')

    try {
      const text = await transcribeAudio({
        settings,
        audioBlob: recorder.audioBlob,
      })
      setRecognizedText(text)
      setAsrStatus('ready')
    } catch (error) {
      setAsrStatus('error')
      setAsrError(getMimoErrorMessage(error))
    }
  }

  const buildTtsChunks = () => {
    const lines = targetItems
      .map((item) => [item.marker, item.content].filter(Boolean).join(' '))
      .filter(Boolean)
    const chunks: string[] = []
    let currentChunk = ''

    lines.forEach((line) => {
      const nextLine = currentChunk ? `${currentChunk}\n${line}` : line

      if (nextLine.length > 900 && currentChunk) {
        chunks.push(currentChunk)
        currentChunk = line
        return
      }

      currentChunk = nextLine
    })

    if (currentChunk) {
      chunks.push(currentChunk)
    }

    return chunks
  }

  const handleSynthesizeSpeech = async () => {
    if (!hasApiKey) {
      setSettingsModalOpen(true)
      return
    }

    const chunks = buildTtsChunks()

    if (chunks.length === 0) {
      setTtsError('当前训练范围没有可朗读文本。')
      setTtsStatus('error')
      return
    }

    setTtsStatus('loading')
    setTtsError('')
    replaceTtsAudioUrls([])

    try {
      const blobs = await Promise.all(chunks.map((text) => synthesizeSpeech({ settings, text })))
      replaceTtsAudioUrls(blobs.map((blob) => URL.createObjectURL(blob)))
      setTtsStatus('ready')
    } catch (error) {
      setTtsStatus('error')
      setTtsError(getMimoErrorMessage(error))
    }
  }

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <SourceInputStep
            sourceText={sourceText}
            onSourceTextChange={handleSourceTextChange}
            onClearSourceText={handleClearSourceText}
            onStartParse={handleStartParse}
          />
        )
      case 1:
        return (
          <StructureParseStep
            parsedReference={parsedReference}
            selectedTargetId={selectedTargetId}
            targetSummary={targetSummary}
            onTargetSelect={handleTargetSelect}
            onEditSource={() => setCurrentStep(0)}
            onContinue={() => setCurrentStep(2)}
          />
        )
      case 2:
        return (
          <AiAnalysisStep
            hasApiKey={hasApiKey}
            targetSummary={targetSummary}
            status={aiAnalysisStatus}
            analysis={aiAnalysis}
            errorMessage={aiAnalysisError}
            onGenerate={handleGenerateAiAnalysis}
            onOpenSettings={() => setSettingsModalOpen(true)}
          />
        )
      case 3:
        return (
          <KeywordExtractStep
            hasApiKey={hasApiKey}
            targetSummary={targetSummary}
            status={keywordExtractionStatus}
            keywordExtraction={keywordExtraction}
            errorMessage={keywordExtractionError}
            onGenerate={handleGenerateKeywords}
            onOpenSettings={() => setSettingsModalOpen(true)}
          />
        )
      case 4:
        return (
          <MemorizePromptStep
            targetSummary={targetSummary}
            items={targetItems}
            keywordExtraction={keywordExtraction}
            mode={memorizeMode}
            onModeChange={setMemorizeMode}
            onEnterVoiceStep={() => setCurrentStep(5)}
          />
        )
      default:
        return (
          <VoiceRecitationStep
            hasApiKey={hasApiKey}
            targetSummary={targetSummary}
            items={targetItems}
            showOriginal={showOriginal}
            recorder={recorder}
            recognizedText={recognizedText}
            aiReview={aiReview}
            aiReviewStatus={aiReviewStatus}
            aiReviewError={aiReviewError}
            asrStatus={asrStatus}
            asrError={asrError}
            ttsStatus={ttsStatus}
            ttsError={ttsError}
            ttsAudioUrls={ttsAudioUrls}
            ttsAudioIndex={ttsAudioIndex}
            onToggleOriginal={() => setShowOriginal((value) => !value)}
            onRecognizedTextChange={handleRecognizedTextChange}
            onAiScore={handleAiScore}
            onTranscribeAudio={handleTranscribeAudio}
            onSynthesizeSpeech={handleSynthesizeSpeech}
            onTtsAudioEnded={() =>
              setTtsAudioIndex((index) => Math.min(index + 1, Math.max(0, ttsAudioUrls.length - 1)))
            }
            onOpenSettings={() => setSettingsModalOpen(true)}
          />
        )
    }
  }

  return (
    <main className="app-shell">
      <AppHeader onOpenSettings={() => setSettingsModalOpen(true)} />

      <div className="wizard-shell">
        <Stepper steps={steps} currentStep={currentStep} onStepSelect={handleStepSelect} />

        {renderCurrentStep()}

        {currentStep > 1 && currentStep < 5 ? (
          <div className="wizard-navigation">
            <button type="button" className="button button--secondary" onClick={handlePreviousStep}>
              上一步
            </button>
            <button type="button" className="button button--strong" onClick={handleNextStep}>
              下一步
            </button>
          </div>
        ) : currentStep === 5 ? (
          <div className="wizard-navigation">
            <button type="button" className="button button--secondary" onClick={handlePreviousStep}>
              上一步
            </button>
          </div>
        ) : null}
      </div>

      <SettingsModal
        isOpen={settingsModalOpen}
        settings={settings}
        asrModels={asrModelOptions}
        ttsModels={ttsModelOptions}
        analysisModels={analysisModelOptions}
        ttsVoices={ttsVoiceOptions}
        onClose={() => setSettingsModalOpen(false)}
        onApiKeyChange={apiKeyStorage.setApiKey}
        onApiBaseUrlChange={apiKeyStorage.setApiBaseUrl}
        onRememberChange={apiKeyStorage.setRememberApiKey}
        onModelChange={handleModelChange}
        onTtsVoiceChange={(voice) => apiKeyStorage.setModelPrefs({ ttsVoice: voice })}
      />
    </main>
  )
}

export default App
