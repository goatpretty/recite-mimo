import type { KeywordExtractionResult } from '../../types/learning'
import type { ReciteItem } from '../../utils/referenceParser'

type MemorizeMode = 'original' | 'keywords' | 'initial'

interface MemorizePromptStepProps {
  targetSummary: string
  items: ReciteItem[]
  keywordExtraction: KeywordExtractionResult | null
  mode: MemorizeMode
  onModeChange: (mode: MemorizeMode) => void
  onEnterVoiceStep: () => void
}

const getKeywordsForItem = (keywordExtraction: KeywordExtractionResult | null, itemId: string) =>
  keywordExtraction?.items.find((item) => item.itemId === itemId)?.keywords ?? []

const buildInitialHints = (content: string, keywords: Array<{ text: string }>) => {
  const hintSources = keywords.length > 0 ? keywords.map((keyword) => keyword.text) : [content]

  return Array.from(new Set(hintSources.map((source) => source.trim().slice(0, 1)).filter(Boolean))).join(' / ')
}

const modeButtonClass = (currentMode: MemorizeMode, buttonMode: MemorizeMode) =>
  currentMode === buttonMode ? 'button button--strong' : 'button button--secondary'

export const MemorizePromptStep = ({
  targetSummary,
  items,
  keywordExtraction,
  mode,
  onModeChange,
  onEnterVoiceStep,
}: MemorizePromptStepProps) => (
  <section className="step-card">
    {mode === 'keywords' && !(keywordExtraction && keywordExtraction.items.length > 0) ? (
      <div className="notice notice--compact">请先完成 AI 关键词抽取。</div>
    ) : null}

    <div className="step-card__header">
      <p className="eyebrow">第 5 步</p>
      <h2>首字提示 / 关键词背诵</h2>
      <p>正式背诵前按考点记忆。marker 固定显示，但不参与背诵评分。</p>
    </div>

    <div className="target-summary">
      <span>当前训练范围</span>
      <strong>{targetSummary}</strong>
    </div>

    <div className="toggle-bar">
      <button
        type="button"
        className={modeButtonClass(mode, 'original')}
        onClick={() => onModeChange('original')}
      >
        显示原文
      </button>
      <button
        type="button"
        className={modeButtonClass(mode, 'keywords')}
        onClick={() => onModeChange('keywords')}
      >
        显示关键词
      </button>
      <button
        type="button"
        className={modeButtonClass(mode, 'initial')}
        onClick={() => onModeChange('initial')}
      >
        显示首字提示
      </button>
    </div>

    <div className="memorize-card-grid">
      {items.map((item) => {
        const keywords = getKeywordsForItem(keywordExtraction, item.id)
        const initialHints = buildInitialHints(item.content, keywords)
        const hasKeywordExtraction = Boolean(keywordExtraction && keywordExtraction.items.length > 0)

        return (
          <article className="memorize-card" key={item.id}>
            <span className="marker-pill">{item.marker || '考点'}</span>
            <div className="memorize-card__body">
              <div className="memory-line memory-line--original">
                {mode === 'original' ? (
                  <p>{item.content}</p>
                ) : (
                  <div className="mask-lines" aria-label="原文已隐藏">
                    <span />
                    <span />
                  </div>
                )}
              </div>

              {mode === 'keywords' && hasKeywordExtraction ? (
                <div className="memory-line">
                  <strong>关键词</strong>
                  {keywords.length > 0 ? (
                    <p>{keywords.map((keyword) => keyword.text).join('；')}</p>
                  ) : (
                    <p>当前考点暂无可用关键词。</p>
                  )}
                </div>
              ) : null}

              {mode === 'initial' ? (
                <div className="memory-line">
                  <strong>首字提示</strong>
                  <p>{initialHints || '暂无首字提示。'}</p>
                </div>
              ) : null}
            </div>
          </article>
        )
      })}
    </div>

    <div className="step-actions">
      <button type="button" className="button button--strong" onClick={onEnterVoiceStep}>
        进入语音背诵
      </button>
    </div>
  </section>
)
