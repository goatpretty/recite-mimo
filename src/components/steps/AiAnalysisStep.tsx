import type { AiReferenceAnalysis, AsyncTaskStatus } from '../../types/learning'

interface AiAnalysisStepProps {
  hasApiKey: boolean
  targetSummary: string
  status: AsyncTaskStatus
  analysis: AiReferenceAnalysis | null
  errorMessage: string
  onGenerate: () => void
  onOpenSettings: () => void
}

export const AiAnalysisStep = ({
  hasApiKey,
  targetSummary,
  status,
  analysis,
  errorMessage,
  onGenerate,
  onOpenSettings,
}: AiAnalysisStepProps) => (
  <section className="step-card">
    <div className="step-card__header">
      <p className="eyebrow">第 3 步</p>
      <h2>AI 分析原文</h2>
      <p>分析每个考点在说什么，以及怎么辅助背诵。不会改写或扩展原文知识点。</p>
    </div>

    <div className="target-summary">
      <span>当前训练范围</span>
      <strong>{targetSummary}</strong>
    </div>

    {!hasApiKey ? (
      <div className="empty-state empty-state--center">
        <strong>AI 分析需要先设置 API Key。</strong>
        <button type="button" className="button button--strong" onClick={onOpenSettings}>
          打开设置
        </button>
      </div>
    ) : status === 'loading' ? (
      <div className="loading-state">
        <span className="spinner" />
        <p>正在分析原文结构与记忆逻辑……</p>
      </div>
    ) : analysis ? (
      <div className="analysis-result">
        <section>
          <h3>总体概括</h3>
          <p>{analysis.summary}</p>
        </section>

        <section>
          <h3>逐点解释</h3>
          <div className="analysis-list">
            {analysis.itemExplanations.map((item) => (
              <article key={item.itemId}>
                <strong>{[item.marker, item.content].filter(Boolean).join(' ')}</strong>
                <p>{item.meaning}</p>
                <small>{item.memoryHint}</small>
                {item.commonMistake ? <em>{item.commonMistake}</em> : null}
              </article>
            ))}
          </div>
        </section>

        <section>
          <h3>记忆逻辑</h3>
          <ol className="assist-list">
            {analysis.memoryPath.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </section>

        <section>
          <h3>易混点提醒</h3>
          <ol className="assist-list">
            {analysis.confusionWarnings.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </section>

        <section>
          <h3>背诵建议</h3>
          <p>{analysis.recitationAdvice}</p>
        </section>
      </div>
    ) : (
      <div className="empty-state empty-state--center">
        <strong>{status === 'error' || status === 'blocked' ? 'AI 分析失败。' : '还没有生成 AI 分析。'}</strong>
        {status === 'error' || status === 'blocked' ? (
          <p>{errorMessage || '请求失败，请重试。'}</p>
        ) : (
          <p>将调用 MiMo 对话模型，要求模型只返回 JSON，并在前端进行格式校验。</p>
        )}
        <button type="button" className="button button--strong" onClick={onGenerate}>
          {status === 'error' || status === 'blocked' ? '重试生成分析' : '生成分析'}
        </button>
      </div>
    )}
  </section>
)
