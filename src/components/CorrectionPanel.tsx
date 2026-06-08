import type { ComparisonIssue } from '../types/mimo'
import type { RecitationScore, ReciteItemResult } from '../utils/recitationScoring'
import { Panel } from './Panel'

interface CorrectionPanelProps {
  score: RecitationScore | null
  canScore: boolean
}

const issueTypeLabel: Record<ComparisonIssue['type'], string> = {
  wrong: '错背',
  missing: '漏背',
  extra: '多背',
}

const renderItemResult = (item: ReciteItemResult) => (
  <div className="item-result-row" key={item.itemId}>
    <span className={`badge badge--${item.status}`}>{item.marker || '考点'}</span>
    <span>
      <strong>{item.content}</strong>
      {item.matchedText ? <small>疑似片段：{item.matchedText}</small> : null}
    </span>
    <em>{Math.round(item.matchScore * 100)}%</em>
  </div>
)

const ResultSection = ({
  title,
  emptyText,
  items,
}: {
  title: string
  emptyText: string
  items: ReciteItemResult[]
}) => (
  <section className="score-section">
    <h3>{title}</h3>
    {items.length > 0 ? (
      <div className="item-result-list">{items.map(renderItemResult)}</div>
    ) : (
      <p>{emptyText}</p>
    )}
  </section>
)

export const CorrectionPanel = ({ score, canScore }: CorrectionPanelProps) => (
  <Panel title="纠错区" eyebrow="按考点评分">
    <div className="stats-grid">
      <Stat label="综合评分" value={score ? `${score.overallScore}` : '--'} />
      <Stat label="考点覆盖" value={score ? `${score.itemCoverage}%` : '--'} />
      <Stat label="完整率" value={score ? `${score.completeness}%` : '--'} />
      <Stat label="准确率" value={score ? `${score.accuracy}%` : '--'} />
    </div>

    {!score ? (
      <p className="empty-state">
        {canScore ? '点击“本地评分”后显示考点覆盖、漏背和部分正确明细。' : '请输入原文和识别文本后再评分。'}
      </p>
    ) : (
      <div className="score-grid">
        <ResultSection
          title="已覆盖考点"
          emptyText="本次暂未完整覆盖考点。"
          items={score.matchedItems}
        />
        <ResultSection
          title="漏背考点"
          emptyText="没有明显漏背考点。"
          items={score.missingItems}
        />
        <ResultSection
          title="部分正确考点"
          emptyText="没有部分正确考点。"
          items={score.partialItems}
        />

        <section className="score-section">
          <h3>多余内容</h3>
          {score.extraText.length > 0 ? (
            <ul className="assist-list">
              {score.extraText.map((text) => (
                <li key={text}>{text}</li>
              ))}
            </ul>
          ) : (
            <p>没有明显多余内容。</p>
          )}
        </section>

        <details className="char-diff-details">
          <summary>字符级 diff</summary>
          <div className="issue-list">
            {score.charDiff.issues.length === 0 ? (
              <p className="empty-state">字符级 diff 未发现差异。</p>
            ) : (
              score.charDiff.issues.map((issue) => (
                <div className="issue-row" key={issue.id}>
                  <span className={`badge badge--${issue.type}`}>{issueTypeLabel[issue.type]}</span>
                  <span>
                    <strong>原文</strong>
                    {issue.sourceText || '无'}
                  </span>
                  <span>
                    <strong>识别</strong>
                    {issue.recognizedText || '无'}
                  </span>
                  <span>{issue.suggestion}</span>
                </div>
              ))
            )}
          </div>
        </details>
      </div>
    )}
  </Panel>
)

interface StatProps {
  label: string
  value: string
}

const Stat = ({ label, value }: StatProps) => (
  <div className="stat">
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
)
