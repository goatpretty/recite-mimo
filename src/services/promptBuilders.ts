import type {
  KeywordExtractionResult,
  TrainingTarget,
} from '../types/learning'
import type { ParsedReference, ReciteItem } from '../utils/referenceParser'
import {
  buildNormalizedSpeechItems,
  normalizeForSpeechReview,
  speechReviewNotes,
} from '../utils/normalizeForSpeechReview'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface PromptContext {
  parsedReference: ParsedReference
  selectedTarget: TrainingTarget
  selectedItems: ReciteItem[]
}

interface ReviewPromptContext extends PromptContext {
  keywordExtraction: KeywordExtractionResult | null
  recognizedText: string
  originalText: string
}

const buildReferencePayload = ({
  parsedReference,
  selectedTarget,
  selectedItems,
}: PromptContext) => ({
  rawText: parsedReference.rawText,
  selectedTarget: {
    id: selectedTarget.id,
    label: selectedTarget.label,
    summary: selectedTarget.summary,
  },
  flatItems: parsedReference.flatItems.map(toPromptItem),
  items: selectedItems.map(toPromptItem),
})

const toPromptItem = (item: ReciteItem) => ({
  itemId: item.id,
  marker: item.marker,
  content: item.content,
})

export const buildReferenceAnalysisPrompt = (context: PromptContext): ChatMessage[] => {
  const payloadJson = JSON.stringify(buildReferencePayload(context), null, 2)

  return [
    {
      role: 'system',
      content:
        '你是一个严格的背诵辅助分析器，任务是帮助用户理解并背诵给定原文。你不是改写器，不是扩写器，不是知识百科。你必须严格依据用户提供的原文和结构化考点进行分析。\n\n规则：\n1. 不得添加原文没有的新考点。\n2. 不得替换原文中的政治术语、历史术语、定义术语。\n3. 不得把原文改写成另一套表述。\n4. 必须逐条对应 itemId。\n5. 解释每一点“在说什么”以及“怎么帮助背诵”。\n6. 对思政、历史、政治理论、定义类文本，必须强调原文关键词。\n7. 只返回 JSON，不返回 Markdown，不返回解释性前后缀。',
    },
    {
      role: 'user',
      content:
        `请分析以下背诵材料。你会收到 JSON 数据，其中 items 是用户当前选择的背诵范围。请严格逐条分析，不得新增考点。\n\n输出必须符合这个 JSON 结构：\n{\n  "summary": "总体概括，不超过120字",\n  "itemExplanations": [\n    {\n      "itemId": "原 itemId",\n      "marker": "原 marker",\n      "content": "原 content，必须原样保留",\n      "meaning": "这一点在说什么",\n      "memoryHint": "如何辅助记忆，尽量短",\n      "commonMistake": "常见误背、漏背或混淆点"\n    }\n  ],\n  "memoryPath": ["按背诵顺序给出的记忆路径"],\n  "confusionWarnings": ["容易混淆的表达"],\n  "recitationAdvice": "下一步背诵建议"\n}\n\n输入 JSON：\n${payloadJson}`,
    },
  ]
}

export const buildKeywordExtractionPrompt = (context: PromptContext): ChatMessage[] => {
  const payloadJson = JSON.stringify(buildReferencePayload(context), null, 2)

  return [
    {
      role: 'system',
      content:
        '你是一个严格的背诵关键词抽取器。你只能从原文中抽取关键词，不得创造、改写、概括出原文没有的词。你的目标是帮助用户背诵原文，而不是总结文章。\n\n规则：\n1. 关键词必须是原文中连续出现的词组或短语。\n2. 不得抽取编号，例如（1）、①、1.、一、。\n3. 不得抽取无意义虚词。\n4. 优先抽取政治术语、历史术语、概念名词、限定词、关键动词、判断性表述。\n5. 如果省略某个词会导致表述不严谨，应标记 mustRecite: true。\n6. 对思政、历史、定义类材料，宁可严格，不要随意同义替换。\n7. 每个考点建议抽取 2 到 5 个关键词，短句可以少于 2 个。\n8. 只返回 JSON，不返回 Markdown。',
    },
    {
      role: 'user',
      content:
        `请从以下结构化背诵材料中抽取关键词。必须逐条对应 itemId。关键词必须来自 content 原文，不能创造新词，不能改写。\n\n输出必须符合：\n{\n  "items": [\n    {\n      "itemId": "原 itemId",\n      "marker": "原 marker",\n      "content": "原 content，必须原样保留",\n      "keywords": [\n        {\n          "text": "原文中连续出现的关键词",\n          "importance": "core | important | supporting",\n          "reason": "为什么这是背诵重点",\n          "mustRecite": true\n        }\n      ]\n    }\n  ]\n}\n\n输入 JSON：\n${payloadJson}`,
    },
  ]
}

export const buildRecitationReviewPrompt = (context: ReviewPromptContext): ChatMessage[] => {
  const payloadJson = JSON.stringify(
    {
      ...buildReferencePayload(context),
      originalText: context.originalText,
      keywordExtraction: context.keywordExtraction,
      recognizedText: context.recognizedText,
      speechReviewNotes,
      normalizedItems: buildNormalizedSpeechItems(context.selectedItems),
      normalizedRecognizedText: normalizeForSpeechReview(context.recognizedText),
    },
    null,
    2,
  )

  return [
    {
      role: 'system',
      content:
        '你是一个严格的背诵评分器。你要根据“原文考点”“关键词”“用户背诵识别文本”判断用户是否背对。你的任务不是鼓励性聊天，而是指出具体问题。\n\n你正在评分的是语音背诵识别文本。识别文本可能存在 ASR 表记差异。以下差异默认不作为错误：\n1. 阿拉伯数字与汉字数字的等价差异，例如“21世纪”和“二十一世纪”。\n2. 年份、数量、序号的等价书写差异，例如“2024年”和“二零二四年”。\n3. 百分数、倍数、编号的等价读法差异。\n4. 标点、空格、换行、全角半角差异。\n5. 英文大小写差异。\n6. 明显不影响含义的语气词、停顿词、重复词。\n\n但是以下情况必须指出：\n1. 关键词缺失，例如漏掉“中国具体实际”。\n2. 关键词不完整，例如“中华优秀传统文化”说成“中华传统文化”，漏掉“优秀”。\n3. 术语替换，例如“中国具体实际”说成“中国现实情况”，应提示原文术语更规范。\n4. 概念颠倒，例如“科学社会主义”说成“社会主义科学”。\n5. 原文限定词丢失导致表述不严谨。\n6. 漏背整个考点。\n7. 多背无关内容，且影响原文结构判断。\n\n非常重要：\n* 如果只是 ASR 表记差异，不要列入 keywordErrors 或 inaccurateExpressions。\n* 不要为了凑错误而硬挑问题。\n* 如果某个考点没有实质错误，应标记为 correct。\n* 如果用户表达与原文核心术语一致，只是数字形式、标点、空格、语气停顿不同，不扣分。\n* 只有当替代表达造成政治术语、历史术语、定义术语不规范或含义改变时，才作为问题指出。\n\n评分原则：\n1. 编号如（1）、①、②不要求用户背出，默认忽略。\n2. 标点不要求完全一致。\n3. 普通语序轻微变化可以接受。\n4. 政治术语、历史术语、概念名词、限定词、判断性表述必须严格。\n5. 如果用户用近义词替换了关键术语，要说明为什么不建议替换。\n6. 必须指出漏背知识点。\n7. 必须逐条检查每个 itemId。\n8. 不得添加原文没有的评分标准。\n9. 不得只给泛泛评价。\n10. 只返回 JSON，不返回 Markdown。\n\n评分等级：\n* 90-100：熟练\n* 80-89：基本掌握\n* 60-79：需要复习\n* 0-59：建议重背',
    },
    {
      role: 'user',
      content:
        `请根据以下数据对用户背诵进行评分。编号和标点可以忽略，但原文关键词和核心表述必须严格检查。\n\n注意：recognizedText 来自语音识别，不是用户手写文本。请先区分“ASR 书写形式差异”和“真实背诵错误”。例如“21世纪”与“二十一世纪”应视为等价；“2024年”与“二零二四年”应视为等价。不要因为数字形式不同、标点不同、空格不同而判错。\n\n输出必须符合：\n{\n  "totalScore": 86,\n  "level": "基本掌握",\n  "keywordErrors": [\n    {\n      "keyword": "原关键词",\n      "userExpression": "用户说法",\n      "correctExpression": "正确原文表达",\n      "reason": "为什么用户说法不合适",\n      "relatedItemId": "对应 itemId"\n    }\n  ],\n  "missingKnowledgePoints": [\n    {\n      "marker": "原 marker",\n      "content": "漏背的原文考点",\n      "explanation": "这一点是什么",\n      "importance": "为什么不能漏"\n    }\n  ],\n  "inaccurateExpressions": [\n    {\n      "userExpression": "用户说法",\n      "correctExpression": "原文说法",\n      "reason": "不准确原因"\n    }\n  ],\n  "extraOrIrrelevantContent": [\n    {\n      "text": "多背或无关内容",\n      "reason": "为什么无关或不必要"\n    }\n  ],\n  "itemReviews": [\n    {\n      "itemId": "原 itemId",\n      "marker": "原 marker",\n      "status": "correct | partial | missing | wrong",\n      "comment": "逐条评价"\n    }\n  ],\n  "overallComment": "总体评价",\n  "nextPracticeAdvice": ["下一轮练习建议"]\n}\n\n输入 JSON：\n${payloadJson}`,
    },
  ]
}
