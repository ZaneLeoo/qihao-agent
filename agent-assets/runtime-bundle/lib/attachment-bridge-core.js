/** Return image references from the newest durable user message only. */
export function currentMessageImages(events) {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index]
    if (event?.type !== 'user/message' || event.data?.source?.kind !== 'user') continue
    return event.data.content.filter(block => block?.type === 'image' && block.attachment !== undefined)
      .map(block => block.attachment)
  }
  return []
}

/** Read and upload one current-message image without accepting any caller-supplied path or attachment id. */
export async function uploadCurrentMessageImage({ session, attachments, imageIndex, uploadUrl, toolKey, contextId, fetchImpl, signal }) {
  const images = currentMessageImages(session.snapshotEvents())
  if (!Number.isInteger(imageIndex) || imageIndex < 1) {
    throw new Error('imageIndex 必须是从 1 开始的图片序号。')
  }
  const ref = images[imageIndex - 1]
  if (ref === undefined) {
    throw new Error(images.length === 0
      ? '本轮消息没有可上传的图片。请重新上传 PNG 或 JPEG 图片后再试。'
      : `本轮消息只有 ${images.length} 张图片。请提供 1 到 ${images.length} 之间的 imageIndex。`)
  }
  if (ref.mediaType !== 'image/png' && ref.mediaType !== 'image/jpeg') {
    throw new Error('二维码和条码解码目前只支持 PNG 或 JPEG 图片。请重新上传该格式的原图。')
  }
  if (signal.aborted) throw signal.reason

  const stored = await attachments.readImage(ref, signal)
  if (signal.aborted) throw signal.reason
  const extension = stored.ref.mediaType === 'image/png' ? 'png' : 'jpg'
  const fileName = `current-image-${imageIndex}.${extension}`
  const body = new FormData()
  body.set('file', new Blob([stored.data], { type: stored.ref.mediaType }), fileName)
  const response = await fetchImpl(uploadUrl, {
    method: 'POST',
    headers: {
      'X-Agent-Tool-Key': toolKey,
      'X-Agent-Context-Id': contextId,
    },
    body,
    signal,
  })
  if (!response.ok) {
    throw new Error('图片上传失败，请稍后重试。')
  }
  const payload = await response.json()
  const data = payload?.data
  if (payload?.success !== true || typeof data?.imageId !== 'string' || data.imageId.length === 0) {
    throw new Error('图片上传失败，请稍后重试。')
  }
  return {
    imageId: data.imageId,
    expiresAt: typeof data.expiresAt === 'string' ? data.expiresAt : '',
  }
}
