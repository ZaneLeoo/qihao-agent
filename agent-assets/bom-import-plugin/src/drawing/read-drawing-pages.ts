import type {
  Attachments,
  FileRef,
  RuntimeConfig,
  SessionEvent,
} from "../ports.ts";
import type { SourcePage } from "../shared/contracts.ts";
import { sourceMessage } from "../review/session-results.ts";
import {
  checkRegion,
  cropImage,
  renderPdfPage,
  withPdf,
  type Region,
} from "./pdf-renderer.ts";

export interface ReadArgs {
  sourceSetId?: string;
  pages?: number[];
  region?: Region;
}
export interface DrawingResult {
  sourceSetId: string;
  totalPages: number;
  sources: SourcePage[];
  pages: SourcePage[];
  remainingPages: number[];
}
async function readFile(
  attachments: Attachments,
  ref: FileRef,
  signal: AbortSignal,
  limit: number,
) {
  if (ref.bytes > limit) {
    throw new Error("PDF 超过当前图纸文件大小限制。");
  }
  const chunks: Uint8Array[] = [];
  let size = 0;
  for await (const chunk of attachments.readFileStream(ref, signal)) {
    signal.throwIfAborted();
    size += chunk.byteLength;
    if (size > limit) {
      throw new Error("PDF 超过当前图纸文件大小限制。");
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
/** 所有来源都从会话附件解析；全批统一页码用于跨文件定位，图片以持久引用返回。 */
export async function readDrawingPages(
  events: readonly SessionEvent[],
  attachments: Attachments,
  args: ReadArgs,
  config: RuntimeConfig,
  signal: AbortSignal,
): Promise<DrawingResult> {
  const source = sourceMessage(events, args.sourceSetId);
  const totalBytes = source.sources.reduce(
    (sum, item) => sum + item.ref.bytes,
    0,
  );
  if (totalBytes > config.maxSourceBytes) {
    throw new Error("本批图纸过大，请拆分上传。");
  }
  checkRegion(args.region);
  if (
    args.pages !== undefined &&
    (!Array.isArray(args.pages) ||
      args.pages.length === 0 ||
      args.pages.length > config.maxPagesPerCall ||
      new Set(args.pages).size !== args.pages.length ||
      args.pages.some((page) => !Number.isSafeInteger(page) || page < 1))
  ) {
    throw new Error(
      `pages 必须是不重复的正整数，每次最多读取 ${config.maxPagesPerCall} 页。`,
    );
  }
  const catalog: SourcePage[] = [];
  const offsets: number[] = [];
  // 只保留目录，不把整批 PDF 缓存在内存中。
  for (const item of source.sources) {
    signal.throwIfAborted();
    offsets.push(catalog.length);
    const count =
      item.kind === "image"
        ? 1
        : await withPdf(
            await readFile(
              attachments,
              item.ref as FileRef,
              signal,
              config.maxFileBytes,
            ),
            signal,
            async (document) => document.numPages,
          );
    if (catalog.length + count > config.maxSourcePages) {
      throw new Error("本批图纸页数超限，请拆分上传。");
    }
    for (let pageNo = 1; pageNo <= count; pageNo += 1) {
      catalog.push({
        sourcePage: catalog.length + 1,
        fileName: item.ref.name ?? "图片",
        pageNo,
        ...(item.kind === "image"
          ? { image: item.ref as import("../shared/contracts.ts").ImageRef }
          : {}),
      });
    }
  }
  const selected =
    args.pages ??
    catalog.slice(0, config.maxPagesPerCall).map((page) => page.sourcePage);
  if (selected.some((page) => page > catalog.length)) {
    throw new Error(`本批图纸只有 ${catalog.length} 页。`);
  }
  if (args.region !== undefined && selected.length !== 1) {
    throw new Error("局部放大每次只能指定一页。");
  }
  const images = new Map<number, SourcePage>();
  for (let index = 0; index < source.sources.length; index += 1) {
    const item = source.sources[index];
    const start = offsets[index];
    const pages = selected.filter(
      (page) => page > start && page <= (offsets[index + 1] ?? catalog.length),
    );
    if (pages.length === 0) {
      continue;
    }
    if (item.kind === "image") {
      let image = (
        await attachments.readImage(
          item.ref as import("../shared/contracts.ts").ImageRef,
          signal,
        )
      ).ref;
      if (args.region !== undefined) {
        const stored = await attachments.readImage(image, signal);
        image = await attachments.saveImage({
          data: await cropImage(
            stored.data,
            config.imageMaxEdge,
            signal,
            args.region,
          ),
          mediaType: "image/png",
          name: `图纸-${pages[0]}-局部.png`,
        });
      }
      images.set(pages[0], {
        ...catalog[pages[0] - 1],
        image,
        cropped: args.region !== undefined,
      });
    } else {
      await withPdf(
        await readFile(
          attachments,
          item.ref as FileRef,
          signal,
          config.maxFileBytes,
        ),
        signal,
        async (document) => {
          for (const sourcePage of pages) {
            const entry = catalog[sourcePage - 1];
            const data = await renderPdfPage(
              document,
              entry.pageNo,
              config.imageMaxEdge,
              signal,
              args.region,
            );
            const image = await attachments.saveImage({
              data,
              mediaType: "image/png",
              name: `${entry.fileName}-第${entry.pageNo}页.png`,
            });
            signal.throwIfAborted();
            images.set(sourcePage, {
              ...entry,
              image,
              cropped: args.region !== undefined,
            });
          }
        },
      );
    }
  }
  return {
    sourceSetId: source.sourceSetId,
    totalPages: catalog.length,
    sources: catalog,
    pages: selected.map((page) => images.get(page)!),
    remainingPages: catalog
      .filter((page) => !selected.includes(page.sourcePage))
      .map((page) => page.sourcePage),
  };
}
