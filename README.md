# MiMo 背书训练

纯前端、无后端的背书训练工具，基于小米 MiMo 大模型 API，帮助用户高效记忆结构化文本材料（政治理论、历史资料、概念定义等）。

## 功能概览

**六步式训练流程**

| 步骤 | 名称 | 说明 |
|------|------|------|
| 1 | 粘贴原文 | 粘贴背诵材料，自动统计字数 |
| 2 | 结构解析 | 本地识别 `(1)`、`①`、`一、` 等层级编号，生成考点树，可选择训练范围 |
| 3 | AI 解析 | MiMo 逐条分析含义、记忆技巧、常见错误，输出记忆路径和易混提醒 |
| 4 | 关键词抽取 | AI 从原文中抽取关键词，标注核心/重要/辅助等级和必背标记 |
| 5 | 记忆提示 | 三种模式切换：显示原文、仅显示关键词、首字提示 |
| 6 | 语音背诵 | 录音 → ASR 转写 → AI 评分，输出分数、等级、逐条批改和改进建议 |

**核心能力**

- 智能文本结构解析 — 支持多种中文学术文本编号格式，自动构建层级关系
- AI 深度分析 — 含义解读、记忆技巧、易混点警告、背诵建议
- 关键词提取 — 从原文精确截取关键词，校验为原文连续子串
- 三种记忆模式 — 原文 / 关键词 / 首字提示，逐步提升难度
- 浏览器录音 — 基于 MediaRecorder API，无需安装插件
- ASR 语音转写 — 调用 MiMo ASR 模型将录音转为文本
- TTS 语音朗读 — 调用 MiMo TTS 模型生成参考朗读音频
- AI 智能评分 — 总分、等级、关键词错误、遗漏知识点、表述不准确、多余内容、逐条状态
- 数字容错 — 中文数字与阿拉伯数字（如"二十一"与"21"）差异不计入错误

## 技术栈

- **React 19** + **TypeScript 6**
- **Vite 8** 构建
- 零第三方 UI/状态/HTTP 依赖，API 调用全部使用原生 `fetch`
- ESLint + typescript-eslint 代码规范

## 项目结构

```
src/
  main.tsx                        # 入口
  App.tsx                         # 根组件，状态管理与步骤编排
  App.css / index.css             # 样式
  components/
    AppHeader.tsx                 # 顶部标题栏
    Stepper.tsx                   # 步骤导航条
    SettingsModal.tsx             # API 设置弹窗
    ApiSettingsPanel.tsx          # API Key、模型、语音配置
    steps/
      SourceInputStep.tsx         # 步骤 1：粘贴原文
      StructureParseStep.tsx      # 步骤 2：结构解析与范围选择
      AiAnalysisStep.tsx          # 步骤 3：AI 解析
      KeywordExtractStep.tsx      # 步骤 4：关键词抽取
      MemorizePromptStep.tsx      # 步骤 5：记忆提示
      VoiceRecitationStep.tsx     # 步骤 6：语音背诵与评分
  hooks/
    useApiKeyStorage.ts           # API Key 持久化（sessionStorage / localStorage）
    useMediaRecorder.ts           # 浏览器录音封装
  services/
    mimoClient.ts                 # MiMo API 调用层（Chat、ASR、TTS）
    promptBuilders.ts             # AI 提示词构建
  types/
    learning.ts                   # 学习流程类型定义
    mimo.ts                       # API 与数据结构类型
  utils/
    referenceParser.ts            # 文本结构解析器
    trainingTarget.ts             # 训练范围计算
    aiValidators.ts               # AI 响应 JSON 校验
    safeJson.ts                   # AI 响应 JSON 提取
    normalizeForSpeechReview.ts   # 中文数字归一化
    textComparison.ts             # LCS 文本对比算法
  data/
    modelOptions.ts               # 模型与语音选项配置
```

## 模型配置

| 用途 | 默认模型 | 备选 |
|------|----------|------|
| 文本分析 / 关键词 / 评分 | `mimo-v2.5` | `mimo-v2.5-pro` |
| ASR 语音转写 | `mimo-v2.5-asr` | — |
| TTS 语音朗读 | `mimo-v2.5-tts` | — |

TTS 可选语音：`mimo_default`、`冰糖`、`茉莉`、`苏打`、`白桦`、`Mia`、`Chloe`、`Milo`、`Dean`

## API Key 说明

- 首次打开时自动弹出设置面板，要求输入 MiMo API Key
- 默认存储在 `sessionStorage`，关闭标签页即失效
- 勾选"本浏览器记住"后写入 `localStorage`，长期保留
- 无后端、无登录、无云端存储

## 本地开发

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

构建产物输出到 `dist/` 目录，纯静态文件，可直接部署到任意静态托管服务。

## 设计约束

- 纯前端实现，不依赖后端服务
- 不实现用户登录、文本库、历史记录或云端同步
- AI 调用直连 MiMo API（OpenAI 兼容格式），浏览器端可能存在 CORS 限制
- 所有 AI 响应均经过 JSON 结构校验，确保输出符合预期格式
