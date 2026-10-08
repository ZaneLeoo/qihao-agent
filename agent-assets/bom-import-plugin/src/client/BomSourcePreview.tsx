import { useEffect, useState } from "react";
import type { ImageRef, SourcePage } from "../shared/contracts.ts";
import css from "./BomReview.module.css";

interface Props {
  sources: SourcePage[];
  selectedPage?: number;
  sourceLocation?: { page: number; line?: number; inventoryCode: string };
  loadImage: (ref: ImageRef) => Promise<string>;
}
export function BomSourcePreview({
  sources,
  selectedPage,
  sourceLocation,
  loadImage,
}: Props) {
  const [selected, setSelected] = useState(
    selectedPage ?? sources[0]?.sourcePage,
  );
  const [zoom, setZoom] = useState(100);
  const [image, setImage] = useState<{
    id: string;
    url?: string;
    error?: string;
  }>();
  const page =
    sources.find((page) => page.sourcePage === selected) ?? sources[0];
  useEffect(() => {
    if (selectedPage !== undefined) {
      setSelected(selectedPage);
    }
  }, [selectedPage]);
  useEffect(() => {
    if (!page?.image) {
      return;
    }
    let active = true;
    const id = page.image.attachmentId;
    void loadImage(page.image).then(
      (url) => {
        if (active) {
          setImage({ id, url });
        }
      },
      () => {
        if (active) {
          setImage({ id, error: "来源图片读取失败" });
        }
      },
    );
    return () => {
      active = false;
    };
  }, [page?.image, loadImage]);
  return (
    <aside className={css.preview} aria-label="来源图纸预览">
      <h3>来源图纸</h3>
      <select
        aria-label="来源页面"
        value={page?.sourcePage ?? ""}
        onChange={(event) => setSelected(Number(event.target.value))}
      >
        {sources.map((page) => (
          <option key={page.sourcePage} value={page.sourcePage}>
            {page.fileName} · 第 {page.pageNo} 页
          </option>
        ))}
      </select>
      {sourceLocation?.page === page?.sourcePage && (
        <p role="status">
          已定位：{sourceLocation.inventoryCode}
          {sourceLocation.line ? ` · 图纸明细第 ${sourceLocation.line} 行` : ""}
        </p>
      )}
      <div className={css.zoom}>
        <button onClick={() => setZoom(Math.max(50, zoom - 25))}>缩小</button>
        <span>{zoom}%</span>
        <button onClick={() => setZoom(Math.min(300, zoom + 25))}>放大</button>
      </div>
      {!page?.image ? (
        <p>此页尚未读取，无法预览</p>
      ) : image?.id !== page.image.attachmentId ? (
        <p>正在读取来源图片…</p>
      ) : image.error ? (
        <p role="alert">{image.error}</p>
      ) : (
        <div className={css.imageScroll}>
          <img
            src={image.url}
            alt={`${page.fileName} 第 ${page.pageNo} 页`}
            style={{ width: `${zoom}%`, maxWidth: "none" }}
          />
        </div>
      )}
    </aside>
  );
}
