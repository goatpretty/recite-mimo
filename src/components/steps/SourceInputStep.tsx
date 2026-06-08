interface SourceInputStepProps {
  sourceText: string
  onSourceTextChange: (value: string) => void
  onClearSourceText: () => void
  onStartParse: () => void
}

export const SourceInputStep = ({
  sourceText,
  onSourceTextChange,
  onClearSourceText,
  onStartParse,
}: SourceInputStepProps) => {
  const characterCount = sourceText.replace(/\s/g, '').length
  const canParse = sourceText.trim().length > 0

  return (
    <section className="step-card">
      <div className="step-card__header">
        <p className="eyebrow">第 1 步</p>
        <h2>提交原文</h2>
        <p>粘贴本次背诵材料。文本只保存在当前页面会话中，刷新后可以丢失。</p>
      </div>

      <label className="field">
        <span>背诵原文</span>
        <textarea
          className="textarea textarea--source"
          value={sourceText}
          placeholder="粘贴原文。下一步会优先识别（1）、①、一、第一、首先等结构编号。"
          onChange={(event) => onSourceTextChange(event.target.value)}
        />
      </label>

      <div className="source-meta">
        <span className="metric">{characterCount} 字</span>
      </div>

      <div className="step-actions">
        <button
          type="button"
          className="button button--secondary"
          disabled={!canParse}
          onClick={onClearSourceText}
        >
          清空原文
        </button>
        <button
          type="button"
          className="button button--strong"
          disabled={!canParse}
          onClick={onStartParse}
        >
          开始解析
        </button>
      </div>
    </section>
  )
}
