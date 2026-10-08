import {
  getDocument,
  type PDFDocumentProxy,
} from "pdfjs-dist/legacy/build/pdf.mjs";
import { createCanvas, loadImage } from "@napi-rs/canvas";

export interface Region {
  x: number;
  y: number;
  width: number;
  height: number;
}
export function checkRegion(region?: Region) {
  if (region === undefined) {
    return;
  }
  if (
    ![region.x, region.y, region.width, region.height].every(Number.isFinite) ||
    region.x < 0 ||
    region.y < 0 ||
    region.width <= 0 ||
    region.height <= 0 ||
    region.x + region.width > 1 ||
    region.y + region.height > 1
  ) {
    throw new Error("region 必须是页面范围内的相对坐标，取值为 0 到 1。");
  }
}
/** 字节来自已授权附件；复制缓冲区，避免 PDF.js 转移调用方的原始 buffer。 */
export async function withPdf<T>(
  data: Uint8Array,
  signal: AbortSignal,
  action: (document: PDFDocumentProxy) => Promise<T>,
): Promise<T> {
  signal.throwIfAborted();
  const task = getDocument({
    data: new Uint8Array(data),
    isEvalSupported: false,
    useSystemFonts: true,
  });
  const abort = () => {
    void task.destroy().catch(() => undefined);
  };
  signal.addEventListener("abort", abort, { once: true });
  try {
    const document = await task.promise;
    signal.throwIfAborted();
    return await action(document);
  } finally {
    signal.removeEventListener("abort", abort);
    await task.destroy();
  }
}
export async function renderPdfPage(
  document: PDFDocumentProxy,
  pageNo: number,
  maxEdge: number,
  signal: AbortSignal,
  region?: Region,
) {
  checkRegion(region);
  const page = await document.getPage(pageNo);
  const area = region ?? { x: 0, y: 0, width: 1, height: 1 };
  try {
    signal.throwIfAborted();
    const base = page.getViewport({ scale: 1 });
    const scale =
      maxEdge / Math.max(base.width * area.width, base.height * area.height);
    const viewport = page.getViewport({ scale });
    const canvas = createCanvas(
      Math.max(1, Math.ceil(viewport.width * area.width)),
      Math.max(1, Math.ceil(viewport.height * area.height)),
    );
    const context = canvas.getContext("2d");
    const task = page.render({
      canvasContext: context as unknown as CanvasRenderingContext2D,
      viewport,
      transform: [
        1,
        0,
        0,
        1,
        -viewport.width * area.x,
        -viewport.height * area.y,
      ],
    });
    const abort = () => task.cancel();
    signal.addEventListener("abort", abort, { once: true });
    try {
      await task.promise;
      signal.throwIfAborted();
      return canvas.toBuffer("image/png");
    } finally {
      signal.removeEventListener("abort", abort);
    }
  } finally {
    page.cleanup();
  }
}
export async function cropImage(
  data: Uint8Array,
  maxEdge: number,
  signal: AbortSignal,
  region: Region,
) {
  checkRegion(region);
  signal.throwIfAborted();
  const image = await loadImage(Buffer.from(data));
  signal.throwIfAborted();
  const width = image.width * region.width;
  const height = image.height * region.height;
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  const canvas = createCanvas(
    Math.max(1, Math.ceil(width * scale)),
    Math.max(1, Math.ceil(height * scale)),
  );
  canvas
    .getContext("2d")
    .drawImage(
      image,
      image.width * region.x,
      image.height * region.y,
      width,
      height,
      0,
      0,
      canvas.width,
      canvas.height,
    );
  return canvas.toBuffer("image/png");
}
