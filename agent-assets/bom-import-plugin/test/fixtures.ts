import { PDFDocument } from "pdf-lib";
import { createCanvas } from "@napi-rs/canvas";
import type {
  Attachments,
  HostContext,
  RuntimeConfig,
  SessionEvent,
} from "../src/ports.ts";
import {
  REVIEW_QUESTION_ID,
  CHANGE_LABEL,
  type ReviewData,
} from "../src/shared/contracts.ts";

export const config: RuntimeConfig = {
  maxPagesPerCall: 8,
  imageMaxEdge: 512,
  maxFileBytes: 32 * 1024 * 1024,
  maxSourceBytes: 128 * 1024 * 1024,
  maxSourcePages: 200,
};
export const image = {
  attachmentId: "original-image",
  mediaType: "image/png",
  bytes: 200,
  width: 100,
  height: 80,
  name: "装配图.png",
};
export const source: SessionEvent = {
  seq: 1,
  type: "user/message",
  data: {
    source: { kind: "user" },
    content: [{ type: "image", attachment: image }],
  },
};
export function toolEvents(
  name: string,
  value: unknown,
  seq = 2,
): SessionEvent[] {
  return [
    {
      seq,
      type: "tool/call",
      data: { name, callId: `call-${seq}`, arguments: "{}" },
    },
    {
      seq: seq + 1,
      type: "tool/result",
      data: {
        message: {
          content: [
            {
              type: "tool-result",
              toolCallId: `call-${seq}`,
              content: [{ type: "text", text: JSON.stringify(value) }],
            },
          ],
        },
      },
    },
  ];
}
export function validation(
  id = "ticket-1",
  expiresAt = new Date(Date.now() + 600000).toISOString(),
) {
  return {
    code: 200,
    valid: true,
    validationId: id,
    expiresAt,
    warnings: [],
    confirmationData: {
      requestId: "request-1",
      organizationId: "org-1",
      organizationName: "BOM测试组织",
      boms: [
        {
          parentInventoryCode: "P001",
          parentInventoryName: "台灯",
          versionCode: "V001",
          baseQty: 1,
          sourcePage: 1,
          components: [
            {
              inventoryCode: "C001",
              inventoryName: "灯座",
              inventoryUnit: "个",
              quantity: 2,
              sourceLineNo: 1,
            },
          ],
        },
      ],
    },
  };
}
export function review(): ReviewData {
  const data = validation();
  return {
    kind: "qihao-bom-review",
    version: 1,
    validationId: data.validationId,
    expiresAt: data.expiresAt,
    confirmationData: data.confirmationData,
    warnings: [],
    sources: [{ sourcePage: 1, fileName: "装配图.png", pageNo: 1, image }],
    sourceLinks: [{ bomIndex: 1, componentIndex: 1, sourcePage: 1 }],
  };
}
export function host(): HostContext {
  return {
    tools: { register: () => () => {} },
    attachments: memoryAttachments(),
    effect: (callback) => {
      callback();
    },
    userQuestions: {
      ask: async () => ({
        answers: [{ id: REVIEW_QUESTION_ID, selected: [CHANGE_LABEL] }],
      }),
    },
  };
}
export function memoryAttachments(
  pdf: Uint8Array = new Uint8Array(),
): Attachments {
  const canvas = createCanvas(100, 80);
  canvas.getContext("2d").fillRect(10, 10, 50, 30);
  const png = canvas.toBuffer("image/png");
  let next = 0;
  return {
    async *readFileStream() {
      yield pdf;
    },
    readImage: async (ref) => ({ ref, data: png }),
    saveImage: async (input) => ({
      ...image,
      attachmentId: `render-${++next}`,
      name: input.name,
      bytes: input.data.length,
    }),
  };
}
/** 使用扫描式 PDF（每页只有图片）验证渲染路径，不依赖客户机上的测试文件。 */
export async function scannedPdf(pages: number) {
  const document = await PDFDocument.create();
  const canvas = createCanvas(100, 80);
  canvas.getContext("2d").fillRect(5, 5, 70, 50);
  const png = await document.embedPng(canvas.toBuffer("image/png"));
  for (let i = 0; i < pages; i += 1) {
    document
      .addPage([200, 160])
      .drawImage(png, { x: 0, y: 0, width: 200, height: 160 });
  }
  return document.save();
}
