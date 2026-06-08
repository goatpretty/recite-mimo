import { fullTrainingTargetId } from '../../types/learning'
import type { ParsedReference, ReciteItem } from '../../utils/referenceParser'
import { countLeafItems, getParsedReferenceStats } from '../../utils/trainingTarget'

interface StructureParseStepProps {
  parsedReference: ParsedReference | null
  selectedTargetId: string
  targetSummary: string
  onTargetSelect: (id: string) => void
  onEditSource: () => void
  onContinue: () => void
}

const renderItemTree = (
  item: ReciteItem,
  selectedTargetId: string,
  onTargetSelect: (id: string) => void,
) => (
  <li key={item.id} className="reference-node">
    <button
      type="button"
      className={
        item.id === selectedTargetId
          ? 'reference-row reference-row--active'
          : 'reference-row'
      }
      onClick={() => onTargetSelect(item.id)}
    >
      {item.marker ? <span className="marker-pill">{item.marker}</span> : null}
      <span>{item.content || `${countLeafItems(item)} 个子考点`}</span>
      <small>{countLeafItems(item)} 个考点</small>
    </button>

    {item.children?.length ? (
      <ol className="reference-tree">
        {item.children.map((child) => renderItemTree(child, selectedTargetId, onTargetSelect))}
      </ol>
    ) : null}
  </li>
)

export const StructureParseStep = ({
  parsedReference,
  selectedTargetId,
  targetSummary,
  onTargetSelect,
  onEditSource,
  onContinue,
}: StructureParseStepProps) => {
  const stats = getParsedReferenceStats(parsedReference)

  return (
    <section className="step-card">
      <div className="step-card__header">
        <p className="eyebrow">第 2 步</p>
        <h2>结构解析</h2>
        <p>确认本地 parser 识别出的层级，并选择后续训练范围。</p>
      </div>

      {!parsedReference ? (
        <p className="empty-state">还没有解析结果，请先提交原文。</p>
      ) : (
        <>
          <div className="reference-summary">
            <strong>解析摘要</strong>
            <span>共 {stats.groupCount} 组，{stats.itemCount} 个考点</span>
            {parsedReference.warnings.map((warning) => (
              <small key={warning}>{warning}</small>
            ))}
          </div>

          <div className="reference-list" aria-label="结构解析结果">
            <button
              type="button"
              className={
                selectedTargetId === fullTrainingTargetId
                  ? 'reference-row reference-row--active'
                  : 'reference-row'
              }
              onClick={() => onTargetSelect(fullTrainingTargetId)}
            >
              <span>全文</span>
              <small>{parsedReference.flatItems.length} 个考点</small>
            </button>

            <ol className="reference-tree reference-tree--root">
              {parsedReference.items.map((item) => renderItemTree(item, selectedTargetId, onTargetSelect))}
            </ol>
          </div>

          <div className="target-summary">
            <span>当前训练范围</span>
            <strong>{targetSummary}</strong>
          </div>
        </>
      )}

      <div className="step-actions">
        <button type="button" className="button button--secondary" onClick={onEditSource}>
          重新编辑原文
        </button>
        <button
          type="button"
          className="button button--strong"
          disabled={!parsedReference}
          onClick={onContinue}
        >
          继续 AI 分析
        </button>
      </div>
    </section>
  )
}
