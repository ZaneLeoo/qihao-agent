import { useEffect, useRef, useState } from "react";
import {
  show,
  type Decision,
  type ImageRef,
  type ReviewData,
} from "../shared/contracts.ts";
import { BomDependencyTree } from "./BomDependencyTree.tsx";
import { BomSourcePreview } from "./BomSourcePreview.tsx";
import css from "./BomReview.module.css";

interface Props {
  review: ReviewData;
  loadImage: (ref: ImageRef) => Promise<string>;
  onDecision?: (decision: Decision) => Promise<void>;
  history?: Decision;
  onClose?: () => void;
  maximized?: boolean;
  onToggleMaximize?: () => void;
}
export function BomReviewPanel({
  review,
  loadImage,
  onDecision,
  history,
  onClose,
  maximized,
  onToggleMaximize,
}: Props) {
  const contentRef = useRef<HTMLElement>(null);
  const [selected, setSelected] = useState(0);
  const [tab, setTab] = useState<"form" | "tree">("form");
  const [now, setNow] = useState(Date.now());
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [error, setError] = useState("");
  const [focusedPage, setFocusedPage] = useState<number>();
  const [sourceLocation, setSourceLocation] = useState<{
    page: number;
    line?: number;
    inventoryCode: string;
  }>();
  const bom = review.confirmationData.boms[selected];
  const remaining = Math.max(
    0,
    Math.floor((Date.parse(review.expiresAt) - now) / 1000),
  );
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, left: 0 });
  }, [selected, tab]);
  async function decide(decision: Decision) {
    if (submittingRef.current || !onDecision) {
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    setError("");
    try {
      await onDecision(decision);
    } catch {
      submittingRef.current = false;
      setError("提交确认失败，请重试");
      setSubmitting(false);
    }
  }
  function locateSource(index: number, inventoryCode: string, line?: number) {
    const link = review.sourceLinks.find(
      (item) =>
        item.bomIndex === selected + 1 && item.componentIndex === index + 1,
    );
    if (!link) {
      return;
    }
    setFocusedPage(link.sourcePage);
    setSourceLocation({
      page: link.sourcePage,
      line,
      inventoryCode,
    });
  }
  const sourcePage =
    review.sourceLinks.find(
      (link) =>
        link.bomIndex === selected + 1 && link.componentIndex === undefined,
    )?.sourcePage ?? bom.sourcePage;
  return (
    <section className={css.panel} aria-label="BOM 导入确认">
      <header>
        <div className={css.headerActions}>
          {onToggleMaximize && (
            <button
              aria-label={maximized ? "还原弹窗" : "最大化弹窗"}
              title={maximized ? "还原" : "最大化"}
              onClick={onToggleMaximize}
            >
              {maximized ? "❐" : "□"}
            </button>
          )}
          {onClose && (
            <button aria-label="收起 BOM 详情" title="关闭" onClick={onClose}>
              ×
            </button>
          )}
        </div>
        <h2>BOM 导入确认</h2>
        <span className={css.badge}>
          {history
            ? `历史确认：${history === "CONFIRMED" ? "已确认" : history === "EXPIRED" ? "已过期" : "返回修改"}`
            : "校验通过 · 待确认"}
        </span>
        <p>
          {review.confirmationData.boms.length} 张 BOM ·
          仅创建草稿，不审核、不设为默认版本
        </p>
      </header>
      {review.sources.some((page) => !page.image) && (
        <p className={css.notice}>
          部分来源页面尚未读取；请核对本次导入范围，未读取的页面不会自动加入
          BOM。
        </p>
      )}
      {review.warnings.length > 0 && (
        <details className={css.notice}>
          <summary>{review.warnings.length} 项提示</summary>
          {review.warnings.map((warning, index) => (
            <p key={index}>
              {typeof warning === "object" &&
              warning !== null &&
              "message" in warning
                ? show(warning.message)
                : show(warning)}
            </p>
          ))}
        </details>
      )}
      <div className={css.tabs}>
        <button aria-pressed={tab === "form"} onClick={() => setTab("form")}>
          明细表格
        </button>
        <button aria-pressed={tab === "tree"} onClick={() => setTab("tree")}>
          本批依赖树
        </button>
      </div>
      <div className={css.layout}>
        <nav className={css.list} aria-label="BOM 列表">
          {review.confirmationData.boms.map((bom, index) => (
            <button
              key={index}
              aria-pressed={index === selected}
              onClick={() => {
                setSelected(index);
                setFocusedPage(undefined);
                setSourceLocation(undefined);
              }}
            >
              {show(bom.parentInventoryName)}
              <small>{bom.parentInventoryCode}</small>
            </button>
          ))}
        </nav>
        <main ref={contentRef} className={css.content}>
          {tab === "tree" ? (
            <BomDependencyTree
              key={selected}
              boms={review.confirmationData.boms}
              selected={selected}
            />
          ) : (
            <>
              <h3>母件与版本</h3>
              <dl className={css.fields}>
                <div>
                  <dt>母件</dt>
                  <dd>
                    {show(bom.parentInventoryName)} · {bom.parentInventoryCode}
                  </dd>
                </div>
                <div>
                  <dt>规格</dt>
                  <dd>{show(bom.parentInventorySpecification)}</dd>
                </div>
                <div>
                  <dt>组织</dt>
                  <dd>
                    {show(review.confirmationData.organizationName) === "—"
                      ? "组织名称未返回"
                      : show(review.confirmationData.organizationName)}
                  </dd>
                </div>
                <div>
                  <dt>版本编码</dt>
                  <dd>{show(bom.versionCode)}</dd>
                </div>
                <div>
                  <dt>基准数量</dt>
                  <dd>
                    {show(bom.baseQty)} {show(bom.parentInventoryUnit)}
                  </dd>
                </div>
                <div>
                  <dt>状态</dt>
                  <dd>草稿 · 待审核 · 非默认版本</dd>
                </div>
              </dl>
              <details className={css.advanced}>
                <summary>版本设置</summary>
                <dl className={css.fields}>
                  {[
                    "bomCode",
                    "bomType",
                    "usageType",
                    "versionName",
                    "versionDesc",
                    "effectiveDate",
                    "expireDate",
                  ].map((key) => (
                    <div key={key}>
                      <dt>
                        {
                          (
                            {
                              bomCode: "BOM编码",
                              bomType: "BOM类型",
                              usageType: "用途",
                              versionName: "版本名称",
                              versionDesc: "版本说明",
                              effectiveDate: "生效日期",
                              expireDate: "失效日期",
                            } as Record<string, string>
                          )[key]
                        }
                      </dt>
                      <dd>
                        {key === "bomType" && bom[key] === "MANUFACTURING"
                          ? "制造 BOM"
                          : key === "usageType" && bom[key] === "GENERAL"
                            ? "通用"
                            : show(bom[key])}
                      </dd>
                    </div>
                  ))}
                </dl>
              </details>
              <h3>直属子件 · {bom.components.length} 条</h3>
              <div className={css.tableScroll}>
                <table>
                  <thead>
                    <tr>
                      {[
                        "编码",
                        "名称 / 规格",
                        "用量 / 单位",
                        "供应方式",
                        "图纸位置",
                      ].map((label) => (
                        <th key={label}>{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bom.components.map((row, index) => (
                      <tr key={index}>
                        <td>{row.inventoryCode}</td>
                        <td>
                          {show(row.inventoryName)}
                          <small>{show(row.inventorySpecification)}</small>
                        </td>
                        <td>
                          {row.quantity} {show(row.inventoryUnit)}
                        </td>
                        {/* 损耗、虚拟件和 MRP 控制项暂不展示，保留服务端校验数据。 */}
                        <td>
                          {row.supplyType === "PUSH"
                            ? "推式供料"
                            : show(row.supplyType)}
                        </td>
                        <td>
                          <small>
                            {row.sourceLineNo
                              ? `来源行 ${row.sourceLineNo}`
                              : "来源待核对"}
                          </small>
                          {review.sourceLinks.some(
                            (link) =>
                              link.bomIndex === selected + 1 &&
                              link.componentIndex === index + 1,
                          ) && (
                            <button
                              onClick={() =>
                                locateSource(
                                  index,
                                  row.inventoryCode,
                                  row.sourceLineNo,
                                )
                              }
                            >
                              定位图纸
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p>修改资料请返回对话并重新校验。</p>
            </>
          )}
        </main>
        <BomSourcePreview
          sources={review.sources}
          selectedPage={focusedPage ?? sourcePage}
          sourceLocation={sourceLocation}
          loadImage={loadImage}
        />
      </div>
      <footer>
        {!history && (
          <span>
            {remaining > 0
              ? `确认有效期剩余 ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`
              : "校验票据已过期，请重新校验"}
          </span>
        )}
        {error && <span role="alert">{error}</span>}
        {onDecision && !history && (
          <>
            <button
              disabled={submitting}
              onClick={() => void decide("CHANGE_REQUESTED")}
            >
              返回对话修改
            </button>
            <button
              className={css.primary}
              disabled={submitting}
              onClick={() =>
                void decide(remaining > 0 ? "CONFIRMED" : "EXPIRED")
              }
            >
              {remaining > 0 ? "确认创建草稿" : "返回重新校验"}
            </button>
          </>
        )}
      </footer>
    </section>
  );
}
