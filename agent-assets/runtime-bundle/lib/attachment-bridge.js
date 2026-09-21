import z from '@deepseek-ai/schemastery'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { uploadCurrentMessageImage } from './attachment-bridge-core.js'

/** Cordis plugin name for the model-facing controlled image bridge. */
export const name = 'qihao-attachment-bridge'

/** Required DSH services. */
export const inject = ['tools', 'attachments']

/** Deployment-specific image upload settings. */
export const Config = z.object({
  uploadUrl: z.string().required(),
  toolKey: z.string().role('credential-ref').required(),
  contextId: z.string().role('credential-ref').required(),
  timeoutMs: z.number().step(1).min(1).max(120000).default(30000),
})

/** Register the bridge tool in the preset scope. */
export function apply(ctx, config) {
  if (config.toolKey.trim() === '' || config.contextId.trim() === '') {
    throw new Error('qihao-attachment-bridge: AGENT_MCP_TOOL_KEY 和 AGENT_MCP_CONTEXT_ID 必须配置。')
  }
  const tool = defineTool({
    name: 'upload_agent_image',
    description: 'Upload exactly one image from the current user message to the business image service and return its short-lived imageId. Use only before mcp__mom__decode_image_code when a QR code or barcode needs exact decoding. imageIndex starts at 1 and never accepts paths, URLs, or attachment ids.',
    parameters: {
      imageIndex: { type: 'integer', required: true, description: '1-based image position in the current user message.' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          imageId: { type: 'string', required: true },
          expiresAt: { type: 'string', required: true },
        },
      },
      render: (_args, value) => [{
        type: 'text',
        text: value.expiresAt === ''
          ? `图片已上传，可用 imageId ${value.imageId} 调用二维码或条码解码工具。`
          : `图片已上传，可在 ${value.expiresAt} 前用 imageId ${value.imageId} 调用二维码或条码解码工具。`,
      }],
    },
    timeoutMs: config.timeoutMs,
    async execute(args, exec) {
      if (exec.agent === undefined) throw new Error('当前调用没有会话，无法选择本轮上传的图片。')
      return uploadCurrentMessageImage({
        session: exec.agent.session,
        attachments: ctx.attachments,
        imageIndex: args.imageIndex,
        uploadUrl: config.uploadUrl,
        toolKey: config.toolKey,
        contextId: config.contextId,
        fetchImpl: fetch,
        signal: exec.signal,
      })
    },
    presentCall(args) {
      return { card: 'generic', title: `上传第 ${args.imageIndex} 张图片`, kind: 'read' }
    },
  })
  ctx.effect(() => ctx.tools.register(tool), 'qihao-attachment-bridge: tool registration')
}
