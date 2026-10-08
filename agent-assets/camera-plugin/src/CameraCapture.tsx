import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import type { CameraProps } from './types.ts'
import { Button, Modal, Tooltip } from '@deepseek-ai/dsh-client-ui-primitives'
import css from './CameraCapture.module.css'

const DEVICE_STORAGE_KEY = 'dsh.camera.deviceId'

interface CameraDevice {
  id: string
  label: string
}

type CameraError = 'unsupported' | 'permissionDenied' | 'notFound' | 'openFailed' | 'switchFailed' | 'captureFailed'

function stopStream(stream: MediaStream | null): void {
  for (const track of stream?.getTracks() ?? []) track.stop()
}

function errorKind(error: unknown, fallback: CameraError): CameraError {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError' || error.name === 'SecurityError') return 'permissionDenied'
    if (error.name === 'NotFoundError' || error.name === 'OverconstrainedError') return 'notFound'
  }
  return fallback
}

function imageName(now = new Date()): string {
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    '-',
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ].join('')
  return `camera-${stamp}.jpg`
}

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => { canvas.toBlob(resolve, 'image/jpeg', 0.92) })
}

/** Browser-camera trigger, device picker, preview, and JPEG capture flow. */
export function CameraCapture({ disabled, onAddFiles, t }: CameraProps) {
  const [open, setOpen] = useState(false)
  const [devices, setDevices] = useState<CameraDevice[]>([])
  const [deviceId, setDeviceId] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<CameraError | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const operationRef = useRef(0)

  const release = useCallback(() => {
    operationRef.current += 1
    stopStream(streamRef.current)
    streamRef.current = null
    if (videoRef.current !== null) videoRef.current.srcObject = null
    setReady(false)
  }, [])

  const close = useCallback(() => {
    release()
    setOpen(false)
    setLoading(false)
    setError(null)
  }, [release])

  const attachStream = useCallback(async (requestedDeviceId?: string, switching = false) => {
    const mediaDevices = Reflect.get(navigator, 'mediaDevices') as MediaDevices | undefined
    if (mediaDevices === undefined || typeof mediaDevices.getUserMedia !== 'function') {
      setError('unsupported')
      setLoading(false)
      return
    }
    const operation = operationRef.current + 1
    operationRef.current = operation
    setLoading(true)
    setReady(false)
    setError(null)
    stopStream(streamRef.current)
    streamRef.current = null
    try {
      const stream = await mediaDevices.getUserMedia({
        audio: false,
        video: requestedDeviceId === undefined || requestedDeviceId === ''
          ? { width: { ideal: 1920 }, height: { ideal: 1080 } }
          : { deviceId: { exact: requestedDeviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      })
      if (operationRef.current !== operation) {
        stopStream(stream)
        return
      }
      streamRef.current = stream
      if (videoRef.current !== null) videoRef.current.srcObject = stream
      const enumerated = await mediaDevices.enumerateDevices()
      if (operationRef.current !== operation) return
      const cameras = enumerated
        .filter(candidate => candidate.kind === 'videoinput')
        .map((candidate, index) => ({
          id: candidate.deviceId,
          label: candidate.label || t('camera.deviceFallback', { number: index + 1 }),
        }))
      setDevices(cameras)
      const activeId = stream.getVideoTracks()[0]?.getSettings().deviceId ?? requestedDeviceId ?? ''
      setDeviceId(activeId)

      if (requestedDeviceId === undefined) {
        const remembered = localStorage.getItem(DEVICE_STORAGE_KEY)
        const preferred = cameras.find(camera => camera.id === remembered)
          ?? cameras.find(camera => /(?:usb|external)/i.test(camera.label))
        if (preferred !== undefined && preferred.id !== activeId) {
          await attachStream(preferred.id, true)
          return
        }
      }
      if (activeId !== '') localStorage.setItem(DEVICE_STORAGE_KEY, activeId)
      setLoading(false)
    } catch (cause) {
      if (operationRef.current !== operation) return
      stopStream(streamRef.current)
      streamRef.current = null
      if (videoRef.current !== null) videoRef.current.srcObject = null
      setLoading(false)
      setError(errorKind(cause, switching ? 'switchFailed' : 'openFailed'))
    }
  }, [t])

  useEffect(() => () => { release() }, [release])

  const begin = useCallback(() => {
    setOpen(true)
    setDevices([])
    setDeviceId('')
    void attachStream()
  }, [attachStream])

  const chooseDevice = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    const next = event.target.value
    setDeviceId(next)
    localStorage.setItem(DEVICE_STORAGE_KEY, next)
    void attachStream(next, true)
  }, [attachStream])

  const capture = useCallback(async () => {
    const video = videoRef.current
    if (video === null || video.videoWidth <= 0 || video.videoHeight <= 0) {
      setError('captureFailed')
      return
    }
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const context = canvas.getContext('2d')
    if (context === null) {
      setError('captureFailed')
      return
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    let blob: Blob | null = null
    try {
      blob = await canvasBlob(canvas)
    } catch {
      setError('captureFailed')
      return
    }
    if (blob === null) {
      setError('captureFailed')
      return
    }
    onAddFiles([new File([blob], imageName(), { type: 'image/jpeg', lastModified: Date.now() })])
    close()
  }, [close, onAddFiles])

  return (
    <>
      <Tooltip label={t('camera.open')} side="top" delayMs={500}>
        <button type="button" className={css.trigger} aria-label={t('camera.open')} disabled={disabled} onClick={begin}>
          <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
            <path d="M8.2 6.5 9.4 4.8h5.2l1.2 1.7H19A2 2 0 0 1 21 8.5v8A2 2 0 0 1 19 18.5H5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h3.2ZM12 8.2a4.1 4.1 0 1 0 0 8.2 4.1 4.1 0 0 0 0-8.2Zm0 1.8a2.3 2.3 0 1 1 0 4.6 2.3 2.3 0 0 1 0-4.6Z" fill="currentColor" />
          </svg>
        </button>
      </Tooltip>
      <Modal
        open={open}
        onClose={close}
        title={t('camera.dialogTitle')}
        closeLabel={t('camera.close')}
        className={css.dialog ?? ''}
        footer={(
          <>
            <Button variant="outline" onClick={close}>{t('camera.cancel')}</Button>
            {error !== null
              ? <Button variant="primary" onClick={() => { void attachStream() }}>{t('camera.retry')}</Button>
              : <Button variant="primary" disabled={!ready || loading} onClick={() => { void capture() }}>{t('camera.capture')}</Button>}
          </>
        )}
      >
        <div className={css.body}>
          {devices.length > 1 && (
            <label className={css.deviceRow}>
              <span>{t('camera.device')}</span>
              <select value={deviceId} disabled={loading} onChange={chooseDevice}>
                {devices.map(device => <option key={device.id} value={device.id}>{device.label}</option>)}
              </select>
            </label>
          )}
          <div className={css.preview}>
            <video
              ref={videoRef}
              className={css.video}
              autoPlay
              playsInline
              muted
              aria-label={t('camera.preview')}
              onLoadedMetadata={() => { setReady(true); setLoading(false) }}
            />
            {loading && <div className={css.status} role="status">{t('camera.loading')}</div>}
            {error !== null && <div className={css.status} role="alert">{t(`camera.${error}`)}</div>}
          </div>
        </div>
      </Modal>
    </>
  )
}
