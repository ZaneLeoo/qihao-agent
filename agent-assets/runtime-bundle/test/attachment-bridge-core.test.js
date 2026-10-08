import assert from 'node:assert/strict'
import test from 'node:test'
import { currentMessageImages, uploadCurrentMessageImage } from '../lib/attachment-bridge-core.js'

const first = { attachmentId: 'first', mediaType: 'image/png', name: 'first' }
const second = { attachmentId: 'second', mediaType: 'image/jpeg', name: 'second' }

function session(events) {
  return { snapshotEvents: () => events }
}

function attachments() {
  return { readImage: async ref => ({ ref, data: Uint8Array.of(1, 2, 3) }) }
}

function response(body, ok = true) {
  return { ok, json: async () => body }
}

test('uses only images in the newest user message', () => {
  const images = currentMessageImages([
    { type: 'user/message', data: { source: { kind: 'user' }, content: [{ type: 'image', attachment: first }] } },
    { type: 'assistant/message', data: { content: [] } },
    { type: 'user/message', data: { source: { kind: 'user' }, content: [{ type: 'image', attachment: second }] } },
  ])
  assert.deepEqual(images, [second])
})

test('uploads the selected current-message image with the business context', async () => {
  let request
  const result = await uploadCurrentMessageImage({
    session: session([{ type: 'user/message', data: { source: { kind: 'user' }, content: [{ type: 'image', attachment: first }, { type: 'image', attachment: second }] } }]),
    attachments: attachments(), imageIndex: 2, uploadUrl: 'http://example.test/upload', toolKey: 'key', contextId: 'context', signal: new AbortController().signal,
    fetchImpl: async (...args) => { request = args; return response({ success: true, data: { imageId: 'image-id', expiresAt: '2030-01-01 00:00:00' } }) },
  })
  assert.deepEqual(result, { imageId: 'image-id', expiresAt: '2030-01-01 00:00:00' })
  assert.equal(request[1].headers['X-Agent-Context-Id'], 'context')
  assert.equal(request[1].headers['X-Agent-Tool-Key'], 'key')
})

test('rejects absent, historical, unsupported, and failed uploads', async () => {
  const base = { attachments: attachments(), imageIndex: 1, uploadUrl: 'http://example.test/upload', toolKey: 'key', contextId: 'context', signal: new AbortController().signal, fetchImpl: async () => response({}, false) }
  await assert.rejects(() => uploadCurrentMessageImage({ ...base, session: session([]) }), /没有可上传的图片/)
  await assert.rejects(() => uploadCurrentMessageImage({ ...base, session: session([{ type: 'user/message', data: { source: { kind: 'user' }, content: [{ type: 'image', attachment: { ...first, mediaType: 'image/webp' } }] } }]) }), /PNG 或 JPEG/)
  await assert.rejects(() => uploadCurrentMessageImage({ ...base, session: session([{ type: 'user/message', data: { source: { kind: 'user' }, content: [{ type: 'image', attachment: first }] } }]) }), /上传失败/)
})
