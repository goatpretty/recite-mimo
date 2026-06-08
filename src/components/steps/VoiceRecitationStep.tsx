import type { RecorderState } from '../../hooks/useMediaRecorder'
import type { AiRecitationReview, AsyncTaskStatus } from '../../types/learning'
import type { ReciteItem } from '../../utils/referenceParser'

const hasItems = <T,>(value?: T[] | null) => Array.isArray(value) && value.length > 0

interface VoiceRecitationStepProps {
  hasApiKey: boolean
  targetSummary: string
  items: ReciteItem[]
  showOriginal: boolean
  recorder: RecorderState
  recognizedText: string
  aiReview: AiRecitationReview | null
  aiReviewStatus: AsyncTaskStatus
  aiReviewError: string
  asrStatus: AsyncTaskStatus
  asrError: string
  ttsStatus: AsyncTaskStatus
  ttsError: string
  ttsAudioUrls: string[]
  ttsAudioIndex: number
  onToggleOriginal: () => void
  onRecognizedTextChange: (value: string) => void
  onAiScore: () => void
  onTranscribeAudio: () => void
  onSynthesizeSpeech: () => void
  onTtsAudioEnded: () => void
  onOpenSettings: () => void
}

const renderMaskedContent = (content: string) => {
  const trimmed = content.trim()
  const head = trimmed.slice(0, 2)
  const rest = trimmed.slice(2)

  if (!rest) {
    return <p>{head}</p>
  }

  return (
    <p>
      {head}
      <span className="blur-text">{rest}</span>
    </p>
  )
}

const reviewLabelMap: Record<AiRecitationReview['itemReviews'][number]['status'], string> = {
  correct: '正确',
  partial: '部分正确',
  missing: '漏背',
  wrong: '错误',
}

export const VoiceRecitationStep = ({
  hasApiKey,
  targetSummary,
  items,
  showOriginal,
  recorder,
  recognizedText,
  aiReview,
  aiReviewStatus,
  aiReviewError,
  asrStatus,
  asrError,
  ttsStatus,
  ttsError,
  ttsAudioUrls,
  ttsAudioIndex,
  onToggleOriginal,
  onRecognizedTextChange,
  onAiScore,
  onTranscribeAudio,
  onSynthesizeSpeech,
  onTtsAudioEnded,
  onOpenSettings,
}: VoiceRecitationStepProps) => {
  const hasRecognizedText = recognizedText.trim().length > 0
  const canRunAiScore = hasApiKey && hasRecognizedText
  const currentTtsAudioUrl = ttsAudioUrls[ttsAudioIndex] ?? ''
  const hasKeywordErrors = hasItems(aiReview?.keywordErrors)
  const hasMissingPoints = hasItems(aiReview?.missingKnowledgePoints)
  const hasInaccurateExpressions = hasItems(aiReview?.inaccurateExpressions)
  const hasExtraContent = hasItems(aiReview?.extraOrIrrelevantContent)
  const hasItemReviews = hasItems(aiReview?.itemReviews)
  const hasOverallComment = Boolean(aiReview?.overallComment?.trim())
  const hasAdvice = hasItems(aiReview?.nextPracticeAdvice)

  return (
    <section className="step-card">
      <div className="step-card__header">
        <p className="eyebrow">第 6 步</p>
        <h2>语音背诵与 AI 评分</h2>
        <p>支持手动输入识别文本、ASR 识别、TTS 听读和 AI 评分。</p>
      </div>

      <div className="target-summary">
        <span>当前训练范围</span>
        <strong>{targetSummary}</strong>
      </div>

      <div className="toggle-bar">
        <button type="button" className="button button--secondary" onClick={onToggleOriginal}>
          {showOriginal ? '隐藏原文' : '显示原文'}
        </button>
        <button
          type="button"
          className="button"
          disabled={!hasApiKey || ttsStatus === 'loading'}
          onClick={onSynthesizeSpeech}
        >
          {ttsStatus === 'loading' ? '正在生成朗读…' : 'TTS 听读'}
        </button>
        {!hasApiKey ? (
          <button type="button" className="button button--secondary" onClick={onOpenSettings}>
            设置 API Key
          </button>
        ) : null}
      </div>

      {ttsError ? <p className="error-text">{ttsError}</p> : null}
      {currentTtsAudioUrl ? (
        <div className="tts-player">
          <span>朗读音频 {ttsAudioIndex + 1}/{ttsAudioUrls.length}</span>
          <audio
            className="audio-player"
            src={currentTtsAudioUrl}
            controls
            autoPlay={ttsAudioIndex > 0}
            preload="metadata"
            onEnded={onTtsAudioEnded}
          >
            当前浏览器不支持音频播放。
          </audio>
        </div>
      ) : null}

      <div className="recitation-reference">
        {items.map((item) => (
          <article className="compact-recitation-card" key={item.id}>
            <span className="marker-pill">{item.marker || '考点'}</span>
            <div className="compact-recitation-card__body">
              <div className="memory-line memory-line--original">
                {showOriginal ? (
                  <p>{item.content}</p>
                ) : (
                  renderMaskedContent(item.content)
                )}
              </div>
            </div>
          </article>
        ))}
      </div>

      <section className="voice-section">
        <h3>录音区</h3>
        <div className="control-row">
          <button
            type="button"
            className="button button--strong"
            disabled={recorder.isRecording}
            onClick={() => void recorder.startRecording()}
          >
            开始录音
          </button>
          <button
            type="button"
            className="button button--danger"
            disabled={!recorder.isRecording}
            onClick={recorder.stopRecording}
          >
            停止录音
          </button>
          <button type="button" className="button button--secondary" onClick={recorder.resetRecording}>
            重新录音
          </button>
        </div>

        <div className="recorder-strip">
          <div>
            <span className={recorder.isRecording ? 'dot dot--live' : 'dot'} />
            {recorder.isRecording ? '正在录音' : '录音待命'}
          </div>
          <div>{recorder.audioBlob ? `${Math.ceil(recorder.audioBlob.size / 1024)} KB` : '暂无音频'}</div>
        </div>

        {recorder.audioUrl ? (
          <audio className="audio-player" src={recorder.audioUrl} controls preload="metadata">
            当前浏览器不支持音频播放。
          </audio>
        ) : null}

        {recorder.errorMessage ? <p className="error-text">{recorder.errorMessage}</p> : null}
      </section>

      <section className="voice-section">
        <h3>ASR 识别区</h3>
        <div className="control-row">
          <button
            type="button"
            className="button"
            disabled={!hasApiKey || !recorder.audioBlob || asrStatus === 'loading'}
            title={!hasApiKey ? '需要先设置 API Key' : undefined}
            onClick={onTranscribeAudio}
          >
            {asrStatus === 'loading' ? '正在识别…' : 'ASR 转文字'}
          </button>
          {!hasApiKey ? (
            <button type="button" className="button button--secondary" onClick={onOpenSettings}>
              设置 API Key
            </button>
          ) : null}
        </div>
        {asrError ? <p className="error-text">{asrError}</p> : null}
        {asrStatus === 'ready' ? <p className="status status--ready">ASR 识别完成，已自动填入文本。</p> : null}

        <label className="field">
          <span>识别文本（可手动修正）</span>
          <textarea
            className="textarea"
            value={recognizedText}
            placeholder="ASR 未接入时，可以手动输入或粘贴背诵文本。"
            onChange={(event) => onRecognizedTextChange(event.target.value)}
          />
        </label>
      </section>

      <section className="voice-section">
        <h3>AI 评分区</h3>
        <div className="control-row">
          <button type="button" className="button button--strong" disabled={!canRunAiScore} onClick={onAiScore}>
            AI 评分
          </button>
        </div>

        {!hasApiKey ? (
          <p className="hint">AI 评分需要先设置 API Key。</p>
        ) : aiReviewStatus === 'loading' ? (
          <div className="loading-state loading-state--inline">
            <span className="spinner" />
            <p>正在进行 AI 评分…</p>
          </div>
        ) : aiReview ? (
          <div className="ai-review">
            <div className="score-summary">
              <strong>{aiReview.totalScore} 分</strong>
              <span>{aiReview.level}</span>
            </div>

            {hasKeywordErrors ? (
              <section className="score-section score-section--warning">
                <h4>关键词问题</h4>
                <ul className="assist-list">
                  {aiReview.keywordErrors.map((item) => (
                    <li key={`${item.relatedItemId}-${item.keyword}`}>
                      关键词“{item.keyword}”表述不准确。你说成了“{item.userExpression}”，正确应为“{item.correctExpression}”。{item.reason}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {hasMissingPoints ? (
              <section className="score-section score-section--warning">
                <h4>漏背知识点</h4>
                <ul className="assist-list">
                  {aiReview.missingKnowledgePoints.map((item) => (
                    <li key={item.content}>
                      漏背“{item.content}”。{item.explanation} {item.importance}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {hasInaccurateExpressions ? (
              <section className="score-section score-section--warning">
                <h4>表述不准</h4>
                <ul className="assist-list">
                  {aiReview.inaccurateExpressions.map((item) => (
                    <li key={item.userExpression}>
                      你把“{item.correctExpression}”说成了“{item.userExpression}”。{item.reason}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {hasExtraContent ? (
              <section className="score-section score-section--warning">
                <h4>多余或无关内容</h4>
                <ul className="assist-list">
                  {aiReview.extraOrIrrelevantContent.map((item) => (
                    <li key={item.text}>
                      “{item.text}”：{item.reason}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {hasItemReviews ? (
              <section className="score-section score-section--neutral">
                <h4>逐点检查</h4>
                <div className="item-review-list">
                  {aiReview.itemReviews.map((item) => (
                    <div className={`item-review item-review--${item.status}`} key={item.itemId}>
                      <span className="marker-pill">{item.marker || '考点'}</span>
                      <strong>{reviewLabelMap[item.status]}</strong>
                      <p>{item.comment}</p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {hasOverallComment ? (
              <section className="score-section score-section--neutral">
                <h4>总体评价</h4>
                <p>{aiReview.overallComment}</p>
              </section>
            ) : null}

            {hasAdvice ? (
              <section className="score-section score-section--neutral">
                <h4>下一轮练习建议</h4>
                <ul className="assist-list">
                  {aiReview.nextPracticeAdvice.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        ) : (
          <p className="empty-state">
            {aiReviewStatus === 'error' || aiReviewStatus === 'blocked'
              ? aiReviewError || 'AI 评分失败，请重试。'
              : '输入识别文本后可以进行 AI 评分。'}
          </p>
        )}
      </section>
    </section>
  )
}
