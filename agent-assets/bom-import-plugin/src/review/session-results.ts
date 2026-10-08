import { isRecord, type ImageRef } from "../shared/contracts.ts";
import type { FileRef, SessionEvent } from "../ports.ts";

export interface DrawingSource {
  kind: "image" | "file";
  ref: ImageRef | FileRef;
}
export function sourceMessage(
  events: readonly SessionEvent[],
  sourceSetId?: string,
) {
  const candidates = [...events]
    .reverse()
    .filter(
      (event) =>
        event.type === "user/message" &&
        isRecord(event.data.source) &&
        event.data.source.kind === "user",
    );
  for (const event of candidates) {
    if (sourceSetId !== undefined && sourceSetId !== `drawing:${event.seq}`) {
      continue;
    }
    const content = Array.isArray(event.data.content) ? event.data.content : [];
    const sources: DrawingSource[] = [];
    for (const block of content) {
      if (!isRecord(block) || !isRecord(block.attachment)) {
        continue;
      }
      const ref = block.attachment;
      if (
        typeof ref.attachmentId !== "string" ||
        typeof ref.bytes !== "number"
      ) {
        continue;
      }
      if (block.type === "image" && typeof ref.mediaType === "string") {
        sources.push({ kind: "image", ref: ref as unknown as ImageRef });
      } else if (
        block.type === "file" &&
        typeof ref.name === "string" &&
        /\.pdf$/i.test(ref.name)
      ) {
        sources.push({ kind: "file", ref: ref as unknown as FileRef });
      }
    }
    if (sources.length > 0) {
      return { sourceSetId: `drawing:${event.seq}`, seq: event.seq, sources };
    }
  }
  throw new Error("本会话没有这批图纸，请上传图片或 PDF 后再读取。");
}
/** 工具结果必须通过 callId 与真实调用配对，不能从普通聊天文字取票据。 */
export function recordedResults(
  events: readonly SessionEvent[],
  toolName: string,
) {
  const callIds = new Set(
    events
      .filter(
        (event) => event.type === "tool/call" && event.data.name === toolName,
      )
      .map((event) => event.data.callId),
  );
  const results: { seq: number; value: Record<string, unknown> }[] = [];
  for (const event of events) {
    if (event.type !== "tool/result" || !isRecord(event.data.message)) {
      continue;
    }
    const blocks = event.data.message.content;
    if (!Array.isArray(blocks)) {
      continue;
    }
    for (const block of blocks) {
      if (
        !isRecord(block) ||
        block.type !== "tool-result" ||
        block.isError === true ||
        !callIds.has(block.toolCallId) ||
        !Array.isArray(block.content)
      ) {
        continue;
      }
      for (const text of block.content) {
        if (
          !isRecord(text) ||
          text.type !== "text" ||
          typeof text.text !== "string"
        ) {
          continue;
        }
        try {
          const parsed: unknown = JSON.parse(text.text);
          if (isRecord(parsed)) {
            const value = isRecord(parsed.structuredContent)
              ? parsed.structuredContent
              : parsed;
            results.push({ seq: event.seq, value });
          }
        } catch {
          /* 说明文字不是业务 JSON。 */
        }
      }
    }
  }
  return results;
}
