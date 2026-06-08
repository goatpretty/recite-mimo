import { useEffect, useRef, useState } from 'react'

export interface RecorderState {
  audioBlob: Blob | null
  audioUrl: string
  errorMessage: string
  isRecording: boolean
  startRecording: () => Promise<void>
  stopRecording: () => void
  resetRecording: () => void
}

export const useMediaRecorder = (): RecorderState => {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isRecording, setIsRecording] = useState(false)

  const releaseStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }

  const clearAudioUrl = () => {
    setAudioUrl((currentUrl) => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl)
      }

      return ''
    })
  }

  const startRecording = async () => {
    try {
      if (!('MediaRecorder' in window)) {
        setErrorMessage('当前浏览器不支持 MediaRecorder，无法录音。')
        return
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setErrorMessage('当前浏览器不支持麦克风录音接口。')
        return
      }

      releaseStream()
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      streamRef.current = stream
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      recorder.onstop = () => {
        const nextBlob = new Blob(chunksRef.current, { type: recorder.mimeType })
        setAudioBlob(nextBlob)
        setAudioUrl((currentUrl) => {
          if (currentUrl) {
            URL.revokeObjectURL(currentUrl)
          }

          return URL.createObjectURL(nextBlob)
        })
        setIsRecording(false)
        releaseStream()
      }

      recorder.start()
      setAudioBlob(null)
      clearAudioUrl()
      setErrorMessage('')
      setIsRecording(true)
    } catch {
      setErrorMessage('无法访问麦克风，请检查浏览器权限。')
      setIsRecording(false)
      releaseStream()
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
      return
    }

    releaseStream()
  }

  const resetRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }

    chunksRef.current = []
    setAudioBlob(null)
    clearAudioUrl()
    setErrorMessage('')
    releaseStream()
  }

  useEffect(
    () => () => {
      releaseStream()
      clearAudioUrl()
    },
    [],
  )

  return {
    audioBlob,
    audioUrl,
    errorMessage,
    isRecording,
    startRecording,
    stopRecording,
    resetRecording,
  }
}
