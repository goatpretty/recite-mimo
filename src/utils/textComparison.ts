import type { ComparisonIssue, ComparisonResult } from '../types/mimo'
import {
  defaultNormalizeTextOptions,
  toComparableUnits,
  type NormalizeTextOptions,
} from './normalizeText'

type DiffOperation =
  | { type: 'equal'; source: string; recognized: string }
  | { type: 'delete'; source: string; recognized: '' }
  | { type: 'insert'; source: ''; recognized: string }

const buildDiffOperations = (sourceUnits: string[], recognizedUnits: string[]): DiffOperation[] => {
  const rows = sourceUnits.length
  const columns = recognizedUnits.length
  const dp: number[][] = Array.from({ length: rows + 1 }, () => Array(columns + 1).fill(0))

  for (let row = rows - 1; row >= 0; row -= 1) {
    for (let column = columns - 1; column >= 0; column -= 1) {
      dp[row][column] =
        sourceUnits[row] === recognizedUnits[column]
          ? dp[row + 1][column + 1] + 1
          : Math.max(dp[row + 1][column], dp[row][column + 1])
    }
  }

  const operations: DiffOperation[] = []
  let row = 0
  let column = 0

  while (row < rows && column < columns) {
    if (sourceUnits[row] === recognizedUnits[column]) {
      operations.push({ type: 'equal', source: sourceUnits[row], recognized: recognizedUnits[column] })
      row += 1
      column += 1
    } else if (dp[row + 1][column] >= dp[row][column + 1]) {
      operations.push({ type: 'delete', source: sourceUnits[row], recognized: '' })
      row += 1
    } else {
      operations.push({ type: 'insert', source: '', recognized: recognizedUnits[column] })
      column += 1
    }
  }

  while (row < rows) {
    operations.push({ type: 'delete', source: sourceUnits[row], recognized: '' })
    row += 1
  }

  while (column < columns) {
    operations.push({ type: 'insert', source: '', recognized: recognizedUnits[column] })
    column += 1
  }

  return operations
}

const compactOperationsToIssues = (operations: DiffOperation[]): ComparisonIssue[] => {
  const issues: ComparisonIssue[] = []
  let index = 0
  let issueIndex = 0

  while (index < operations.length) {
    const operation = operations[index]

    if (operation.type === 'equal') {
      index += 1
      continue
    }

    const deleted: string[] = []
    const inserted: string[] = []

    while (index < operations.length && operations[index].type !== 'equal') {
      const current = operations[index]

      if (current.type === 'delete') {
        deleted.push(current.source)
      }

      if (current.type === 'insert') {
        inserted.push(current.recognized)
      }

      index += 1
    }

    const sourceText = deleted.join('')
    const recognizedText = inserted.join('')
    const type: ComparisonIssue['type'] =
      sourceText && recognizedText ? 'wrong' : sourceText ? 'missing' : 'extra'

    issues.push({
      id: `${type}-${issueIndex}`,
      type,
      sourceText,
      recognizedText,
      suggestion:
        type === 'wrong'
          ? '对照原文重背这一处。'
          : type === 'missing'
            ? '补背遗漏内容。'
            : '检查是否多背或手动输入有误。',
    })

    issueIndex += 1
  }

  return issues
}

export const compareRecitationText = (
  sourceText: string,
  recognizedText: string,
  options: NormalizeTextOptions = defaultNormalizeTextOptions,
): ComparisonResult => {
  const sourceUnits = toComparableUnits(sourceText, options)
  const recognizedUnits = toComparableUnits(recognizedText, options)
  const operations = buildDiffOperations(sourceUnits, recognizedUnits)
  const issues = compactOperationsToIssues(operations)
  const matchedUnits = operations.filter((operation) => operation.type === 'equal').length
  const wrongUnits = issues
    .filter((issue) => issue.type === 'wrong')
    .reduce((total, issue) => total + Math.max(issue.sourceText.length, issue.recognizedText.length), 0)
  const missingUnits = issues
    .filter((issue) => issue.type === 'missing')
    .reduce((total, issue) => total + issue.sourceText.length, 0)
  const extraUnits = issues
    .filter((issue) => issue.type === 'extra')
    .reduce((total, issue) => total + issue.recognizedText.length, 0)
  const sourceCount = sourceUnits.length
  const recognizedCount = recognizedUnits.length
  const accuracyRate =
    recognizedCount === 0 ? 0 : Math.max(0, Math.round((matchedUnits / recognizedCount) * 100))
  const completenessRate =
    sourceCount === 0 ? 0 : Math.max(0, Math.round((matchedUnits / sourceCount) * 100))
  const extraPenalty = sourceCount === 0 ? extraUnits * 5 : (extraUnits / sourceCount) * 20
  const overallScore = Math.max(
    0,
    Math.round(accuracyRate * 0.45 + completenessRate * 0.55 - extraPenalty),
  )

  return {
    stats: {
      sourceUnits: sourceCount,
      recognizedUnits: recognizedCount,
      matchedUnits,
      wrongUnits,
      missingUnits,
      extraUnits,
      accuracyRate,
      completenessRate,
      overallScore,
    },
    issues,
  }
}
