import type { RecorderState } from '../hooks/useMediaRecorder'
import { Panel } from './Panel'

interface TrainingPanelProps {
  hasApiKey: boolean
  hasTrainingText: boolean
  targetLabel: string
  recorder: RecorderState
}

export const TrainingPanel = ({ hasApiKey, hasTrainingText, targetLabel, recorder }: TrainingPanelProps) => {
  const handleRestartRecording = async () => {
    recorder.resetRecording()
    await recorder.startRecording()
  }

  return (
    <Panel title="训练区" eyebrow="当前训练对象">
      <div className="training-target">
        <strong>{hasTrainingText ? targetLabel : '暂无训练对象'}</strong>
      </div>

      <div className="control-row">
        <button type="button" className="button" disabled>
          TTS 朗读（未接入）
        </button>
        <button
          type="button"
          className="button button--strong"
          disabled={!hasTrainingText || recorder.isRecording}
          onClick={() => void recorder.startRecording()}
        >
          开始录音
        </button>
        <button
          type="button"
          className="button button--danger"
          disabled={!recorder.isRecording}
          onClick={recorder.stopRecording}
        >
          停止录音
        </button>
        <button
          type="button"
          className="button button--secondary"
          disabled={!hasTrainingText}
          onClick={() => void handleRestartRecording()}
        >
          重新录音
        </button>
      </div>

      <div className="recorder-strip">
        <div>
          <span className={recorder.isRecording ? 'dot dot--live' : 'dot'} />
          {recorder.isRecording ? '正在录音' : '录音待命'}
        </div>
        <div>{recorder.audioBlob ? `${Math.ceil(recorder.audioBlob.size / 1024)} KB` : '暂无音频'}</div>
      </div>

      {recorder.audioUrl ? (
        <audio className="audio-player" src={recorder.audioUrl} controls preload="metadata">
          当前浏览器不支持音频播放。
        </audio>
      ) : null}

      {recorder.errorMessage ? <p className="error-text">{recorder.errorMessage}</p> : null}

      <div className="control-row">
        <button type="button" className="button" disabled={!hasApiKey || !recorder.audioBlob}>
          ASR 转文字（未接入）
        </button>
        <button type="button" className="button" disabled>
          AI 解析增强（预留）
        </button>
      </div>

      {!hasTrainingText ? <p className="hint">请先粘贴原文，并选择全文、某一组或某个考点。</p> : null}
      {!hasApiKey ? <p className="hint">当前版本不接入 MiMo API；录音、手动输入和本地评分仍可用。</p> : null}
    </Panel>
  )
}
