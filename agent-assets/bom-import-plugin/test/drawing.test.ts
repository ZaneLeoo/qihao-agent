import { describe, expect, it, vi } from "vitest";
import { readDrawingPages } from "../src/drawing/read-drawing-pages.ts";
import {
  config,
  memoryAttachments,
  scannedPdf,
  source,
  image,
} from "./fixtures.ts";
import type { SessionEvent } from "../src/ports.ts";

const signal = () => new AbortController().signal;
describe("受控图纸读取", () => {
  it("混合附件按全批页码读取 8 页，允许后续读取第 9 页", async () => {
    const pdf = await scannedPdf(8);
    const event: SessionEvent = {
      ...source,
      data: {
        ...source.data,
        content: [
          { type: "image", attachment: image },
          {
            type: "file",
            attachment: {
              attachmentId: "pdf-1",
              name: "图纸.pdf",
              bytes: pdf.length,
            },
          },
        ],
      },
    };
    const attachments = memoryAttachments(pdf);
    const first = await readDrawingPages(
      [event],
      attachments,
      {},
      config,
      signal(),
    );
    expect(first.totalPages).toBe(9);
    expect(first.pages).toHaveLength(8);
    expect(first.remainingPages).toEqual([9]);
    expect(first.pages[1]).toMatchObject({
      sourcePage: 2,
      fileName: "图纸.pdf",
      pageNo: 1,
    });
    const next = await readDrawingPages(
      [event],
      attachments,
      { sourceSetId: first.sourceSetId, pages: [9] },
      config,
      signal(),
    );
    expect(next.pages[0]).toMatchObject({ sourcePage: 9, pageNo: 8 });
    expect(next.pages[0].image?.attachmentId).toContain("render-");
  });
  it("多张图片直接返回原始持久引用，不重新上传", async () => {
    const attachments = memoryAttachments();
    const save = vi.spyOn(attachments, "saveImage");
    const result = await readDrawingPages(
      [source],
      attachments,
      {},
      config,
      signal(),
    );
    expect(result.pages[0].image).toEqual(image);
    expect(save).not.toHaveBeenCalled();
  });
  it("局部图像有明确裁剪标记，原来源引用保留", async () => {
    const result = await readDrawingPages(
      [source],
      memoryAttachments(),
      { pages: [1], region: { x: 0.1, y: 0.1, width: 0.5, height: 0.5 } },
      config,
      signal(),
    );
    expect(result.pages[0].cropped).toBe(true);
    expect(result.sources[0].image).toEqual(image);
  });
  it("不允许跨会话借用来源号、超过分页限制或非法裁剪", async () => {
    const attachments = memoryAttachments();
    for (const args of [
      { sourceSetId: "drawing:999" },
      { pages: [1, 1] },
      { pages: Array.from({ length: 9 }, (_, i) => i + 1) },
      { pages: [2] },
      { region: { x: 0.8, y: 0, width: 0.5, height: 1 } },
    ]) {
      await expect(
        readDrawingPages([source], attachments, args, config, signal()),
      ).rejects.toThrow();
    }
  });
  it("损坏 PDF、文件超限、批次超限和已取消请求均拒绝", async () => {
    const event: SessionEvent = {
      ...source,
      data: {
        ...source.data,
        content: [
          {
            type: "file",
            attachment: {
              attachmentId: "broken",
              name: "损坏.pdf",
              bytes: 100,
            },
          },
        ],
      },
    };
    await expect(
      readDrawingPages(
        [event],
        memoryAttachments(new Uint8Array([1, 2])),
        {},
        config,
        signal(),
      ),
    ).rejects.toThrow();
    await expect(
      readDrawingPages(
        [event],
        memoryAttachments(),
        {},
        { ...config, maxFileBytes: 10 },
        signal(),
      ),
    ).rejects.toThrow("大小");
    await expect(
      readDrawingPages(
        [source],
        memoryAttachments(),
        {},
        { ...config, maxSourceBytes: 10 },
        signal(),
      ),
    ).rejects.toThrow("过大");
    const aborted = new AbortController();
    aborted.abort();
    await expect(
      readDrawingPages(
        [source],
        memoryAttachments(),
        {},
        config,
        aborted.signal,
      ),
    ).rejects.toThrow();
  });
});
