import type { AsyncTaskStatus, KeywordExtractionResult } from '../../types/learning'

interface KeywordExtractStepProps {
  hasApiKey: boolean
  targetSummary: string
  status: AsyncTaskStatus
  keywordExtraction: KeywordExtractionResult | null
  errorMessage: string
  onGenerate: () => void
  onOpenSettings: () => void
}

const importanceLabel: Record<'core' | 'important' | 'supporting', string> = {
  core: '核心',
  important: '重要',
  supporting: '辅助',
}

export const KeywordExtractStep = ({
  hasApiKey,
  targetSummary,
  status,
  keywordExtraction,
  errorMessage,
  onGenerate,
  onOpenSettings,
}: KeywordExtractStepProps) => (
  <section className="step-card">
    <div className="step-card__header">
      <p className="eyebrow">第 4 步</p>
      <h2>AI 关键词抽取</h2>
      <p>关键词必须从原文中抽取，不抽取编号和无意义虚词，后续评分重点检查 mustRecite 词。</p>
    </div>

    <div className="target-summary">
      <span>当前训练范围</span>
      <strong>{targetSummary}</strong>
    </div>

    {!hasApiKey ? (
      <div className="empty-state empty-state--center">
        <strong>关键词抽取需要先设置 API Key。</strong>
        <button type="button" className="button button--strong" onClick={onOpenSettings}>
          打开设置
        </button>
      </div>
    ) : status === 'loading' ? (
      <div className="loading-state">
        <span className="spinner" />
        <p>正在抽取重点词……</p>
      </div>
    ) : keywordExtraction ? (
      <div className="keyword-result">
        {keywordExtraction.items.map((item) => (
          <article className="keyword-item" key={item.itemId}>
            <header>
              <span className="marker-pill">{item.marker || '考点'}</span>
              <strong>{item.content}</strong>
            </header>
            <div className="keyword-chip-list">
              {item.keywords.map((keyword) => (
                <span className={`keyword-chip keyword-chip--${keyword.importance}`} key={keyword.text}>
                  {keyword.text}
                  <small>{importanceLabel[keyword.importance]}</small>
                  {keyword.mustRecite ? <em>必背</em> : null}
                </span>
              ))}
            </div>
            <ol className="assist-list">
              {item.keywords.map((keyword) => (
                <li key={`${keyword.text}-reason`}>{keyword.reason}</li>
              ))}
            </ol>
          </article>
        ))}
      </div>
    ) : (
      <div className="empty-state empty-state--center">
        <strong>{status === 'error' || status === 'blocked' ? '关键词抽取失败。' : '还没有抽取重点词。'}</strong>
        {status === 'error' || status === 'blocked' ? (
          <p>{errorMessage || '请求失败，请重试。'}</p>
        ) : (
          <p>关键词必须由 MiMo 对话模型从原文中抽取，不使用本地随机或粗糙关键词算法替代。</p>
        )}
        <button type="button" className="button button--strong" onClick={onGenerate}>
          {status === 'error' || status === 'blocked' ? '重试抽取重点词' : '抽取重点词'}
        </button>
      </div>
    )}
  </section>
)
