import { fullTrainingTargetId, type TrainingTarget } from '../types/learning'
import {
  createParsedReferenceFromItem,
  findReciteItemById,
  type ParsedReference,
  type ReciteItem,
} from './referenceParser'

export const countLeafItems = (item: ReciteItem): number => {
  const childCount = (item.children ?? []).reduce((total, child) => total + countLeafItems(child), 0)
  return childCount || (item.content ? 1 : 0)
}

export const getParsedReferenceStats = (parsedReference: ParsedReference | null) => {
  if (!parsedReference) {
    return {
      groupCount: 0,
      itemCount: 0,
    }
  }

  return {
    groupCount: parsedReference.items.length,
    itemCount: parsedReference.flatItems.length,
  }
}

export const getTargetReference = (
  parsedReference: ParsedReference | null,
  selectedTargetId: string,
) => {
  if (!parsedReference) {
    return null
  }

  if (selectedTargetId === fullTrainingTargetId) {
    return parsedReference
  }

  return createParsedReferenceFromItem(parsedReference, selectedTargetId)
}

export const getTrainingTarget = (
  parsedReference: ParsedReference | null,
  selectedTargetId: string,
): TrainingTarget | null => {
  if (!parsedReference) {
    return null
  }

  if (selectedTargetId === fullTrainingTargetId) {
    const stats = getParsedReferenceStats(parsedReference)

    return {
      id: fullTrainingTargetId,
      label: '全文',
      summary: `全文：共 ${stats.groupCount} 组，${stats.itemCount} 个考点`,
      items: parsedReference.flatItems,
    }
  }

  const item = findReciteItemById(parsedReference.items, selectedTargetId)

  if (!item) {
    return null
  }

  const scopedReference = createParsedReferenceFromItem(parsedReference, selectedTargetId)
  const label = [item.marker, item.content || '当前组'].filter(Boolean).join(' ')
  const summary = item.children?.length
    ? `${item.marker || '当前组'}：${countLeafItems(item)} 个考点`
    : label

  return {
    id: item.id,
    label,
    summary,
    items: scopedReference.flatItems,
  }
}
