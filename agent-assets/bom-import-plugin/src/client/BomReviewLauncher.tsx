import { useEffect, useRef, useState } from "react";
import { BomReviewPanel } from "./BomReviewPanel.tsx";
import type { Decision, ImageRef, ReviewData } from "../shared/contracts.ts";
import css from "./BomReview.module.css";
interface Props {
  review: ReviewData;
  loadImage: (ref: ImageRef) => Promise<string>;
  onDecision?: (decision: Decision) => Promise<void>;
  history?: Decision;
}
/** 聊天内只展示摘要；原生弹窗放在顶层，避免输入区裁剪和层叠干扰。 */
export function BomReviewLauncher(props: Props) {
  const [maximized, setMaximized] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const boms = props.review.confirmationData.boms;
  const status = props.history
    ? props.history === "CONFIRMED"
      ? "已确认"
      : props.history === "EXPIRED"
        ? "已过期"
        : "返回修改"
    : "待确认";
  useEffect(() => {
    const element = dialog.current;
    if (expanded && element && !element.open) {
      element.showModal();
    }
    return () => {
      element?.close();
    };
  }, [expanded]);
  return (
    <>
      <section className={css.launcher} aria-label="BOM 确认摘要">
        <div className={css.launcherIcon} aria-hidden="true">
          ▤
        </div>
        <div className={css.launcherInfo}>
          <strong>{props.history ? "BOM 用户确认" : "BOM 导入确认"}</strong>
          <span className={css.badge}>{status}</span>
          <p>
            {boms.length} 张 BOM ·{" "}
            {boms.reduce((total, bom) => total + bom.components.length, 0)}{" "}
            条直属子件 · 草稿版本
          </p>
        </div>
        <button className={css.primary} onClick={() => setExpanded(true)}>
          {props.history ? "查看明细" : "核对 BOM"}
        </button>
      </section>
      {expanded && (
        <dialog
          ref={dialog}
          className={`${css.dialog} ${maximized ? css.maximized : ""}`}
          aria-label="核对 BOM 导入"
          onCancel={() => setExpanded(false)}
          onClose={() => setExpanded(false)}
        >
          <BomReviewPanel
            {...props}
            maximized={maximized}
            onToggleMaximize={() => setMaximized(!maximized)}
            onClose={() => setExpanded(false)}
          />
        </dialog>
      )}
    </>
  );
}
