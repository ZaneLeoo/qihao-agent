import { useRef, useState, type PointerEvent } from "react";
import { show, type Bom, type Component } from "../shared/contracts.ts";
import css from "./BomReview.module.css";
interface Props {
  boms: Bom[];
  selected: number;
}
/** 左到右显示本批逻辑依赖，逐节点展开；不修改真实版本引用。 */
export function BomDependencyTree({ boms, selected }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    const keys = new Set<string>();
    boms[selected].components.forEach((_, index) =>
      keys.add(`${boms[selected].parentInventoryCode}/${index}`),
    );
    return keys;
  });
  const [zoom, setZoom] = useState(100);
  const canvas = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    pointerId: number;
    x: number;
    y: number;
    left: number;
    top: number;
  }>();
  const [dragging, setDragging] = useState(false);
  /** 拖拽仅平移视图，不改动母子关系；节点按钮仍可独立操作。 */
  function startPan(event: PointerEvent<HTMLDivElement>) {
    if (
      event.button !== 0 ||
      (event.target as HTMLElement).closest("button, a, input, select")
    ) {
      return;
    }
    const element = event.currentTarget;
    drag.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      left: element.scrollLeft,
      top: element.scrollTop,
    };
    element.setPointerCapture(event.pointerId);
  }
  function movePan(event: PointerEvent<HTMLDivElement>) {
    const start = drag.current;
    if (!start || start.pointerId !== event.pointerId) {
      return;
    }
    const x = event.clientX - start.x;
    const y = event.clientY - start.y;
    if (Math.abs(x) + Math.abs(y) < 4) {
      return;
    }
    setDragging(true);
    event.currentTarget.scrollLeft = start.left - x;
    event.currentTarget.scrollTop = start.top - y;
  }
  function stopPan(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.pointerId !== event.pointerId) {
      return;
    }
    drag.current = undefined;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }
  const byCode = new Map(boms.map((bom) => [bom.parentInventoryCode, bom]));
  const root = boms[selected];
  function toggle(key: string) {
    setCollapsed((previous) => {
      const next = new Set(previous);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }
  function node(
    bom: Bom | undefined,
    row: Component | undefined,
    key: string,
    path: Set<string>,
  ) {
    const code = row?.inventoryCode ?? bom!.parentInventoryCode;
    const cycle = path.has(code);
    const expandable = Boolean(bom?.components.length) && !cycle;
    const open = expandable && !collapsed.has(key);
    const children = open ? bom!.components : [];
    return (
      <li className={css.treeBranch} key={key}>
        <div className={`${css.treeNode} ${!row ? css.rootNode : ""}`}>
          <div className={css.nodeHeading}>
            <span className={css.badge}>
              {bom ? "本批 BOM" : row ? "子件" : "本批 BOM"}
            </span>
            {expandable && (
              <button
                aria-label={`${open ? "收起" : "展开"} ${code}`}
                aria-expanded={open}
                onClick={() => toggle(key)}
              >
                {open ? "−" : "+"}
              </button>
            )}
          </div>
          <strong>
            {show(row?.inventoryName ?? bom?.parentInventoryName)}
          </strong>
          <small>{code}</small>
          <div className={css.nodeMeta}>
            <span>
              {row
                ? `用量 ${row.quantity} ${show(row.inventoryUnit)}`
                : `基准 ${show(bom?.baseQty)} ${show(bom?.parentInventoryUnit)}`}
            </span>
            {cycle && <span>循环引用</span>}
          </div>
        </div>
        {children.length > 0 && (
          <ul className={css.treeChildren}>
            {children.map((child, index) =>
              node(
                child.selectedVersionId
                  ? undefined
                  : byCode.get(child.inventoryCode),
                child,
                `${key}/${index}`,
                new Set([...path, code]),
              ),
            )}
          </ul>
        )}
      </li>
    );
  }
  return (
    <section aria-label="BOM 依赖树">
      <div className={css.treeToolbar}>
        <div>
          <h3>本批依赖关系</h3>
          <p>拖拽画布平移，点击 + / − 展开收起；用量相对直属母件。</p>
        </div>
        <button onClick={() => setCollapsed(new Set())}>展开全部</button>
        <button
          onClick={() => setCollapsed(new Set([root.parentInventoryCode]))}
        >
          收起全部
        </button>
      </div>
      <p className={css.notice}>本批导入关系预览：不自动绑定本批新建版本。</p>
      <div className={css.treeZoom}>
        <button
          aria-label="缩小依赖树"
          onClick={() => setZoom(Math.max(40, zoom - 20))}
        >
          −
        </button>
        <span>{zoom}%</span>
        <button
          aria-label="放大依赖树"
          onClick={() => setZoom(Math.min(160, zoom + 20))}
        >
          +
        </button>
        <button
          onClick={() => {
            setZoom(100);
            canvas.current?.scrollTo({ top: 0, left: 0 });
          }}
        >
          重置视图
        </button>
      </div>
      <div
        ref={canvas}
        className={`${css.treeCanvas} ${dragging ? css.dragging : ""}`}
        role="region"
        aria-label="可拖拽的依赖树画布"
        tabIndex={0}
        onPointerDown={startPan}
        onPointerMove={movePan}
        onPointerUp={stopPan}
        onPointerCancel={stopPan}
        onLostPointerCapture={() => {
          drag.current = undefined;
          setDragging(false);
        }}
      >
        <ul className={css.treeRoot} style={{ zoom: zoom / 100 }}>
          {node(root, undefined, root.parentInventoryCode, new Set())}
        </ul>
      </div>
    </section>
  );
}
