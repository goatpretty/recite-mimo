# MiMo 背书训练

纯前端临时会话式背书训练器，使用 Vite + React + TypeScript。

## 第一阶段范围

- 清理 Vite 默认页面。
- 建立 `components`、`hooks`、`services`、`types`、`utils`、`data` 目录结构。
- 实现 API 设置区、文本输入区、训练区、识别结果区、纠错区、记忆辅助区。
- API Key 默认写入 `sessionStorage`，勾选“本浏览器记住”后才写入 `localStorage`。
- MiMo API 只保留 service adapter TODO，不假设 endpoint 或请求格式。
- 不实现后端、登录、文本管理、云端保存、文本库或历史记录。

## 本地运行

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```
