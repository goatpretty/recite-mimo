import { Panel } from './Panel'

interface RecognitionPanelProps {
  recognizedText: string
  canScore: boolean
  hasTrainingText: boolean
  onRecognizedTextChange: (value: string) => void
  onLocalScore: () => void
}

export const RecognitionPanel = ({
  recognizedText,
  canScore,
  hasTrainingText,
  onRecognizedTextChange,
  onLocalScore,
}: RecognitionPanelProps) => (
  <Panel title="识别结果区" eyebrow="手动输入可评分">
    <label className="field">
      <span>识别文本</span>
      <textarea
        className="textarea"
        value={recognizedText}
        placeholder="当前不接 MiMo ASR。可以手动输入或粘贴识别文本，然后点击本地评分。"
        onChange={(event) => onRecognizedTextChange(event.target.value)}
      />
    </label>

    <div className="inline-tools">
      <button type="button" className="button button--strong" disabled={!canScore} onClick={onLocalScore}>
        本地评分
      </button>
    </div>

    {!hasTrainingText ? (
      <p className="hint">没有原文或未选择段落，暂不能评分。</p>
    ) : !recognizedText.trim() ? (
      <p className="hint">请输入识别文本后再评分。</p>
    ) : (
      <p className="hint">本地评分不依赖 API Key，会按当前训练段落进行比较。</p>
    )}
  </Panel>
)
