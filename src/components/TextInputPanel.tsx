import type { ParsedReference, ReciteItem } from '../utils/referenceParser'
import { getReferenceSummary } from '../utils/referenceParser'
import { Panel } from './Panel'

interface TextInputPanelProps {
  sourceText: string
  parsedReference: ParsedReference
  selectedTargetId: string
  onSourceTextChange: (value: string) => void
  onTargetSelect: (id: string) => void
  onClearSourceText: () => void
}

const fullTrainingTargetId = 'full'

const countScorableItems = (item: ReciteItem): number => {
  const childCount = (item.children ?? []).reduce((total, child) => total + countScorableItems(child), 0)
  return childCount || (item.content ? 1 : 0)
}

const getItemPreview = (item: ReciteItem) => item.content || `${countScorableItems(item)} 个子考点`

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
      <span>{getItemPreview(item)}</span>
      <small>{countScorableItems(item)} 个考点</small>
    </button>

    {item.children?.length ? (
      <ol className="reference-tree">
        {item.children.map((child) => renderItemTree(child, selectedTargetId, onTargetSelect))}
      </ol>
    ) : null}
  </li>
)

export const TextInputPanel = ({
  sourceText,
  parsedReference,
  selectedTargetId,
  onSourceTextChange,
  onTargetSelect,
  onClearSourceText,
}: TextInputPanelProps) => {
  const characterCount = sourceText.replace(/\s/g, '').length
  const hasNumberedStructure = parsedReference.items.some((item) => item.marker)

  return (
    <Panel
      title="文本输入区"
      eyebrow="本地结构解析"
      action={<span className="metric">{characterCount} 字</span>}
    >
      <label className="field">
        <span>背诵原文</span>
        <textarea
          className="textarea textarea--source"
          value={sourceText}
          placeholder="粘贴本次背诵文本。会优先识别（1）、①、一、第一、首先等编号结构；没有编号时再按段落和标点切分。"
          onChange={(event) => onSourceTextChange(event.target.value)}
        />
      </label>

      <div className="inline-tools">
        <button
          type="button"
          className="button button--secondary"
          disabled={!sourceText.trim()}
          onClick={onClearSourceText}
        >
          清空本次文本
        </button>
        <button type="button" className="button" disabled>
          AI 解析增强（预留）
        </button>
      </div>

      <div className="reference-summary">
        <strong>结构解析结果</strong>
        <span>{getReferenceSummary(parsedReference)}</span>
        {parsedReference.warnings.map((warning) => (
          <small key={warning}>{warning}</small>
        ))}
      </div>

      <div className="reference-list" aria-label="结构解析结果">
        {parsedReference.items.length === 0 ? (
          <p className="empty-state">粘贴原文后会在这里展示结构化考点。</p>
        ) : (
          <>
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
              {parsedReference.items.map((item, index) => (
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
                    <span>
                      {hasNumberedStructure && item.children?.length
                        ? `第 ${index + 1} 组`
                        : getItemPreview(item)}
                    </span>
                    <small>{countScorableItems(item)} 个考点</small>
                  </button>

                  {item.children?.length ? (
                    <ol className="reference-tree">
                      {item.children.map((child) => renderItemTree(child, selectedTargetId, onTargetSelect))}
                    </ol>
                  ) : null}
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
    </Panel>
  )
}
