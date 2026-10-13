import z from "@deepseek-ai/schemastery";
import { defineTool } from "@deepseek-ai/dsh-tools";
import type { Execution, HostContext, RuntimeConfig } from "./ports.ts";
import {
  readDrawingPages,
  type DrawingResult,
  type ReadArgs,
} from "./drawing/read-drawing-pages.ts";
import {
  reviewBom,
  type ReviewArgs,
  type ReviewResult,
} from "./review/review-bom-import.ts";

export const name = "qihao-bom-import";
export const inject = ["tools", "attachments", "userQuestions"];
export const Config = z.object({
  maxPagesPerCall: z.number().step(1).min(1).max(20).default(8),
  imageMaxEdge: z.number().step(1).min(512).max(4000).default(2000),
  maxFileBytes: z.number().step(1).min(1).default(33554432),
  maxSourceBytes: z.number().step(1).min(1).default(134217728),
  maxSourcePages: z.number().step(1).min(1).max(10000).default(200),
});
const imageSchema = { type: "object", additionalProperties: true } as const;
export function apply(ctx: HostContext, config: RuntimeConfig) {
  // 业务文档与 BOM 图纸共用附件读取和 PDF 渲染；工具名称决定用途说明。
  function pageReader(toolName: string, description: string) {
    return defineTool({
      name: toolName,
      description,
      parameters: {
        sourceSetId: { type: "string" },
        pages: { type: "array", items: { type: "integer" } },
        region: {
          type: "object",
          additionalProperties: false,
          properties: {
            x: { type: "number", required: true },
            y: { type: "number", required: true },
            width: { type: "number", required: true },
            height: { type: "number", required: true },
          },
        },
      },
      output: {
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            sourceSetId: { type: "string", required: true },
            totalPages: { type: "integer", required: true },
            sources: { type: "array", items: imageSchema, required: true },
            pages: { type: "array", items: imageSchema, required: true },
            remainingPages: {
              type: "array",
              items: { type: "integer" },
              required: true,
            },
          },
        },
        render: (_args: ReadArgs, value: DrawingResult) => [
          { type: "text", text: JSON.stringify(value) },
          ...value.pages.map((page) => ({
            type: "image",
            attachment: page.image,
          })),
        ],
      },
      async execute(args: ReadArgs, exec: Execution) {
        if (exec.agent === undefined) {
          throw new Error("没有当前会话，无法读取附件页面。");
        }
        return readDrawingPages(
          exec.agent.session.snapshotEvents(),
          ctx.attachments,
          args,
          config,
          exec.signal,
        );
      },
    });
  }
  const read = pageReader(
    "read_bom_drawing_pages",
    "读取本会话最近上传的一批 BOM 图片/PDF。省略参数时返回本批来源目录和前几页真实图片；后续必须使用返回的 sourceSetId 固定同批资料，并按 remainingPages 分批读取。sourcePage 是全批统一编号，fileName/pageNo 为原文件和原页码。只允许会话附件，不接受路径、URL、Base64。region 用于单页局部放大。需要支持图片输入的视觉模型。",
  );
  const readBusiness = pageReader(
    "read_business_document_pages",
    "读取本会话的业务图片及 PDF（含扫描件），返回来源目录和真实页面图片，由视觉模型识别，不执行 OCR、不创建业务单据。省略参数读取最近一批附件的前几页；后续传返回的 sourceSetId 和 pages 分批读取，remainingPages 为本次未返回页码。sourcePage 为全批页码，fileName/pageNo 为原文件与原页码。region 用于单页局部放大。只接受会话附件，不接受路径、URL、Base64。",
  );
  const review = defineTool({
    name: "review_bom_import",
    description:
      "展示本会话最新 BOM 校验结果并等待用户确认。只传 validationId 和来源映射，不传 confirmationData 或业务字段。CONFIRMED 才能继续创建；CHANGE_REQUESTED 返回对话修改并重新校验；EXPIRED 必须重新校验并再次确认。sourceLinks 的 bomIndex/componentIndex 从 1 开始。",
    parameters: {
      validationId: { type: "string", required: true },
      sourceSetId: { type: "string" },
      sourceLinks: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            bomIndex: { type: "integer", required: true },
            componentIndex: { type: "integer" },
            sourcePage: { type: "integer", required: true },
          },
        },
      },
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          decision: {
            type: "string",
            enum: ["CONFIRMED", "CHANGE_REQUESTED", "EXPIRED"],
            required: true,
          },
          validationId: { type: "string", required: true },
          requestId: { type: "string", required: true },
          review: { ...imageSchema, required: true },
        },
      },
      render: (_args: ReviewArgs, value: ReviewResult) => [
        {
          type: "text",
          text: JSON.stringify({
            decision: value.decision,
            validationId: value.validationId,
            requestId: value.requestId,
          }),
        },
      ],
      presentationMeta: (_args: ReviewArgs, value: ReviewResult) => value,
    },
    async execute(args: ReviewArgs, exec: Execution) {
      if (exec.agent === undefined) {
        throw new Error("没有当前会话，无法确认 BOM。");
      }
      return reviewBom(ctx, exec.agent, args, exec.signal);
    },
  });
  ctx.effect(() => ctx.tools.register(read), "qihao-bom: drawing tool");
  ctx.effect(
    () => ctx.tools.register(readBusiness),
    "qihao: business document pages",
  );
  ctx.effect(() => ctx.tools.register(review), "qihao-bom: review tool");
}
