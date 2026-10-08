// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import type { CameraProps } from '../src/types.ts'
import { CameraCapture } from '../src/CameraCapture.tsx'

const labels: Record<string, string> = {
  'camera.open': '拍照',
  'camera.dialogTitle': '摄像头拍照',
  'camera.close': '关闭摄像头',
  'camera.device': '摄像头',
  'camera.deviceFallback': '摄像头 {number}',
  'camera.loading': '正在打开摄像头…',
  'camera.preview': '摄像头实时预览',
  'camera.capture': '拍照',
  'camera.cancel': '取消',
  'camera.retry': '重试',
  'camera.permissionDenied': '无法访问摄像头，请在浏览器地址栏允许摄像头权限',
}

const t = ((key: string, params?: Readonly<Record<string, unknown>>) => {
  if (key === 'camera.deviceFallback') {
    const number = params?.number
    return `摄像头 ${typeof number === 'number' ? number : ''}`
  }
  return labels[key] ?? key
}) as CameraProps['t']

function fakeStream(deviceId: string) {
  const stop = vi.fn()
  const track = { stop, getSettings: () => ({ deviceId }) }
  return {
    stream: {
      getTracks: () => [track],
      getVideoTracks: () => [track],
    } as unknown as MediaStream,
    stop,
  }
}

function props(onAddFiles = vi.fn()): CameraProps {
  return { disabled: false, onAddFiles, t } as unknown as CameraProps
}

beforeEach(() => {
  localStorage.clear()
  Object.defineProperty(HTMLMediaElement.prototype, 'srcObject', { configurable: true, writable: true, value: null })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('CameraCapture', () => {
  it('opens the preferred USB camera and lets the user select another device', async () => {
    const initial = fakeStream('default-camera')
    const usb = fakeStream('usb-camera')
    const alternate = fakeStream('alternate-camera')
    const getUserMedia = vi.fn()
      .mockResolvedValueOnce(initial.stream)
      .mockResolvedValueOnce(usb.stream)
      .mockResolvedValueOnce(alternate.stream)
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia,
        enumerateDevices: vi.fn().mockResolvedValue([
          { kind: 'videoinput', deviceId: 'default-camera', label: 'Integrated Camera' },
          { kind: 'videoinput', deviceId: 'usb-camera', label: 'USB Camera' },
          { kind: 'videoinput', deviceId: 'alternate-camera', label: 'Document Camera' },
        ]),
      },
    })
    const view = render(<CameraCapture {...props()} />)

    fireEvent.click(view.getByRole('button', { name: '拍照' }))
    await waitFor(() => { expect(getUserMedia).toHaveBeenCalledTimes(2) })
    expect(initial.stop).toHaveBeenCalledOnce()
    expect(localStorage.getItem('dsh.camera.deviceId')).toBe('usb-camera')

    fireEvent.change(view.getByRole('combobox', { name: '摄像头' }), { target: { value: 'alternate-camera' } })
    await waitFor(() => { expect(getUserMedia).toHaveBeenCalledTimes(3) })
    expect(usb.stop).toHaveBeenCalledOnce()
    expect(localStorage.getItem('dsh.camera.deviceId')).toBe('alternate-camera')
  })

  it('captures the live frame as a JPEG attachment and releases the camera', async () => {
    const active = fakeStream('usb-camera')
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue(active.stream),
        enumerateDevices: vi.fn().mockResolvedValue([
          { kind: 'videoinput', deviceId: 'usb-camera', label: 'USB Camera' },
        ]),
      },
    })
    const drawImage = vi.fn()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D)
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => {
      callback(new Blob([Uint8Array.of(1, 2, 3)], { type: 'image/jpeg' }))
    })
    const onAddFiles = vi.fn()
    const view = render(<CameraCapture {...props(onAddFiles)} />)
    fireEvent.click(view.getByRole('button', { name: '拍照' }))
    const video = await view.findByLabelText('摄像头实时预览')
    Object.defineProperty(video, 'videoWidth', { configurable: true, value: 1280 })
    Object.defineProperty(video, 'videoHeight', { configurable: true, value: 720 })
    fireEvent.loadedMetadata(video)

    fireEvent.click(view.getAllByRole('button', { name: '拍照' })[1]!)
    await waitFor(() => { expect(onAddFiles).toHaveBeenCalledOnce() })
    const files = onAddFiles.mock.calls[0]![0] as File[]
    expect(files).toHaveLength(1)
    expect(files[0]).toMatchObject({ type: 'image/jpeg' })
    expect(files[0]!.name).toMatch(/^camera-\d{8}-\d{6}\.jpg$/)
    expect(drawImage).toHaveBeenCalledWith(video, 0, 0, 1280, 720)
    expect(active.stop).toHaveBeenCalledOnce()
    expect(view.queryByRole('dialog')).toBeNull()
  })

  it('explains a denied permission and retries', async () => {
    const getUserMedia = vi.fn().mockRejectedValue(new DOMException('denied', 'NotAllowedError'))
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia, enumerateDevices: vi.fn() },
    })
    const view = render(<CameraCapture {...props()} />)
    fireEvent.click(view.getByRole('button', { name: '拍照' }))
    expect((await view.findByRole('alert')).textContent).toContain('无法访问摄像头')
    fireEvent.click(view.getByRole('button', { name: '重试' }))
    await waitFor(() => { expect(getUserMedia).toHaveBeenCalledTimes(2) })
  })

  it('stops a stream that arrives after the dialog was closed', async () => {
    const active = fakeStream('usb-camera')
    let resolveStream!: (stream: MediaStream) => void
    const pending = new Promise<MediaStream>(resolve => { resolveStream = resolve })
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn().mockReturnValue(pending), enumerateDevices: vi.fn() },
    })
    const onAddFiles = vi.fn()
    const view = render(<CameraCapture {...props(onAddFiles)} />)
    fireEvent.click(view.getByRole('button', { name: '拍照' }))
    fireEvent.click(view.getByRole('button', { name: '取消' }))
    resolveStream(active.stream)
    await waitFor(() => { expect(active.stop).toHaveBeenCalledOnce() })
    expect(onAddFiles).not.toHaveBeenCalled()
    expect(view.queryByRole('dialog')).toBeNull()
  })

  it('releases the camera when the plugin component unmounts', async () => {
    const active = fakeStream('usb-camera')
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue(active.stream),
        enumerateDevices: vi.fn().mockResolvedValue([]),
      },
    })
    const view = render(<CameraCapture {...props()} />)
    fireEvent.click(view.getByRole('button', { name: '拍照' }))
    await waitFor(() => { expect(localStorage.getItem('dsh.camera.deviceId')).toBe('usb-camera') })
    view.unmount()
    expect(active.stop).toHaveBeenCalledOnce()
  })
})
