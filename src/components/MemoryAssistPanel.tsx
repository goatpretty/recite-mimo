import type { ParsedReference, ReciteItem } from '../utils/referenceParser'
import type { RecitationScore } from '../utils/recitationScoring'
import { normalizeText } from '../utils/normalizeText'
import { Panel } from './Panel'

interface MemoryAssistPanelProps {
  parsedReference: ParsedReference
  score: RecitationScore | null
}

const firstContentChar = (content: string) => content.trim().slice(0, 1)

const buildFirstCharacterHintForItem = (item: ReciteItem): string => {
  if (item.children?.length) {
    const childHints = item.children.map(buildFirstCharacterHintForItem).filter(Boolean).join(' / ')
    return [item.marker, childHints].filter(Boolean).join(' ')
  }

  return firstContentChar(item.content)
}

const buildFirstCharacterHint = (items: ReciteItem[]) =>
  items.map(buildFirstCharacterHintForItem).filter(Boolean).join('\n')

const pickKeywordCandidates = (text: string): string[] => {
  const normalized = normalizeText(text, {
    ignorePunctuation: false,
    ignoreWhitespace: false,
    unifyCase: true,
    unifyFullWidthHalfWidth: true,
  })
  const englishWords = normalized.match(/[a-zA-Z]{4,}/g) ?? []
  const chineseRuns = normalized.match(/[\u4e00-\u9fff]{2,}/g) ?? []
  const chineseTokens = chineseRuns.flatMap((run) => {
    const tokens: string[] = []

    for (let index = 0; index < run.length; index += 6) {
      const token = run.slice(index, index + 2)

      if (token.length >= 2) {
        tokens.push(token)
      }
    }

    return tokens
  })

  return Array.from(new Set([...englishWords, ...chineseTokens])).slice(0, 12)
}

const buildClozeContent = (content: string) => {
  const keywords = pickKeywordCandidates(content)

  if (keywords.length === 0) {
    return content
  }

  return keywords.reduce(
    (currentText, keyword) => currentText.replaceAll(keyword, '____'),
    content,
  )
}

const buildClozeLines = (item: ReciteItem): string[] => {
  const ownLine = item.content
    ? [item.marker, buildClozeContent(item.content)].filter(Boolean).join(' ')
    : item.marker
  const childLines = (item.children ?? []).flatMap(buildClozeLines)

  return [ownLine, ...childLines].filter(Boolean)
}

const buildSkeletonLines = (item: ReciteItem): string[] => {
  const ownLine = [item.marker, item.content].filter(Boolean).join(' ')
  const childLines = (item.children ?? []).flatMap(buildSkeletonLines)

  return [ownLine, ...childLines].filter(Boolean)
}

const buildPracticeItems = (score: RecitationScore | null) => {
  if (!score) {
    return []
  }

  return [...score.missingItems, ...score.partialItems]
}

export const MemoryAssistPanel = ({
  parsedReference,
  score,
}: MemoryAssistPanelProps) => {
  const hasTrainingText = parsedReference.flatItems.length > 0
  const firstCharacterHint = buildFirstCharacterHint(parsedReference.items)
  const clozeLines = parsedReference.items.flatMap(buildClozeLines)
  const skeletonLines = parsedReference.items.flatMap(buildSkeletonLines)
  const practiceItems = buildPracticeItems(score)

  return (
    <Panel title="记忆辅助区" eyebrow="基于结构化考点">
      {!hasTrainingText ? (
        <p className="empty-state">请先粘贴原文并选择训练对象。</p>
      ) : (
        <div className="assist-grid">
          <div className="assist-block">
            <h3>首字提示</h3>
            <p className="preline-text">{firstCharacterHint || '当前训练对象没有可用考点。'}</p>
          </div>

          <div className="assist-block">
            <h3>关键词挖空</h3>
            {clozeLines.length > 0 ? (
              <div className="skeleton-list">
                {clozeLines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            ) : (
              <p>当前训练对象没有识别到可挖空内容。</p>
            )}
          </div>

          <div className="assist-block">
            <h3>段落骨架</h3>
            {skeletonLines.length > 0 ? (
              <div className="skeleton-list">
                {skeletonLines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            ) : (
              <p>当前训练对象没有可展示的骨架。</p>
            )}
          </div>

          <div className="assist-block">
            <h3>错句重练</h3>
            {score ? (
              practiceItems.length > 0 ? (
                <div className="skeleton-list">
                  {practiceItems.map((item) => (
                    <p key={item.itemId}>
                      {[item.marker, item.content].filter(Boolean).join(' ')}
                    </p>
                  ))}
                </div>
              ) : (
                <p>本次评分没有定位到需要重练的考点。</p>
              )
            ) : (
              <p>完成本地评分后，这里会列出漏背和部分正确考点。</p>
            )}
          </div>
        </div>
      )}
    </Panel>
  )
}
