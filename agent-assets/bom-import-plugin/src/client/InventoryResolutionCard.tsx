import { useEffect, useId, useMemo, useState } from "react";
import {
  resolutionFromToolBlock,
  type InventoryCandidate,
  type InventoryResolutionRow,
  type InventoryStatus,
} from "../shared/inventory-resolution.ts";
import { show } from "../shared/contracts.ts";
import css from "./BomReview.module.css";

interface Props {
  block: unknown;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50];
const MISSING_PREVIEW_LIMIT = 5;

/** 仅在存在缺失存货时提示，并按需展开完整核对结果。 */
export function InventoryResolutionCard({ block }: Props) {
  const detailsId = useId();
  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const resolution = useMemo(() => resolutionFromToolBlock(block), [block]);
  const rows = resolution?.rows ?? [];
  const missingRows = useMemo(
    () => rows.filter((row) => row.status === "missing"),
    [rows],
  );
  const counts = useMemo(() => countStatuses(rows), [rows]);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(pageNo, pageCount);
  const pageRows = rows.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const hiddenMissingCount = Math.max(
    0,
    missingRows.length - MISSING_PREVIEW_LIMIT,
  );

  useEffect(() => {
    setPageNo(1);
    setDetailsExpanded(false);
  }, [resolution]);

  if (!resolution || missingRows.length === 0) {
    return null;
  }

  return (
    <section className={css.resolutionCard} aria-label="缺失存货提示">
      <div className={css.missingNotice}>
        <span className={css.missingIcon} aria-hidden="true">
          !
        </span>
        <div className={css.missingContent}>
          <div className={css.missingHeading}>
            <strong>发现 {missingRows.length} 个存货编码未找到</strong>
            <span className={css.missingPill}>需要核对</span>
          </div>
          <p>请确认编码，或补齐存货档案后继续 BOM 导入。</p>
          <ul className={css.missingCodes} aria-label="未找到的存货编码">
            {missingRows.slice(0, MISSING_PREVIEW_LIMIT).map((row) => (
              <li key={row.code}>{row.code}</li>
            ))}
          </ul>
          {hiddenMissingCount > 0 && (
            <span className={css.missingMore}>另有 {hiddenMissingCount} 项</span>
          )}
        </div>
      </div>

      <button
        type="button"
        className={css.resolutionDetailsButton}
        aria-expanded={detailsExpanded}
        aria-controls={detailsExpanded ? detailsId : undefined}
        onClick={() => setDetailsExpanded((expanded) => !expanded)}
      >
        {detailsExpanded
          ? "收起核对详情"
          : `查看全部 ${rows.length} 项核对结果`}
        <span aria-hidden="true">{detailsExpanded ? "−" : "+"}</span>
      </button>

      {detailsExpanded && (
        <div id={detailsId} className={css.resolutionDetails}>
          <div className={css.resolutionStats} aria-label="核对统计">
            <span data-status="found">已存在 {counts.found}</span>
            <span data-status="missing">未找到 {counts.missing}</span>
            {counts.ambiguous > 0 && (
              <span data-status="ambiguous">多条候选 {counts.ambiguous}</span>
            )}
            {counts.unknown > 0 && (
              <span data-status="unknown">未返回 {counts.unknown}</span>
            )}
            {resolution.traceId && (
              <span className={css.resolutionTrace}>追踪号：{resolution.traceId}</span>
            )}
          </div>
          <div className={css.resolutionTableWrap}>
            <table>
              <thead>
                <tr>
                  <th>存货编码</th>
                  <th>存货名称</th>
                  <th>规格型号</th>
                  <th>单位</th>
                  <th>档案状态</th>
                  <th>候选档案</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => (
                  <ResolutionRow key={row.code} row={row} />
                ))}
              </tbody>
            </table>
          </div>
          <nav className={css.resolutionPagination} aria-label="物料列表分页">
            <label>
              每页
              <select
                aria-label="每页显示条数"
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPageNo(1);
                }}
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option value={size} key={size}>
                    {size}
                  </option>
                ))}
              </select>
              项
            </label>
            <span>
              {(currentPage - 1) * pageSize + 1}–
              {Math.min(currentPage * pageSize, rows.length)} / {rows.length}
            </span>
            <button
              type="button"
              aria-label="上一页物料"
              disabled={currentPage <= 1}
              onClick={() => setPageNo(currentPage - 1)}
            >
              上一页
            </button>
            <span aria-live="polite">
              {currentPage} / {pageCount}
            </span>
            <button
              type="button"
              aria-label="下一页物料"
              disabled={currentPage >= pageCount}
              onClick={() => setPageNo(currentPage + 1)}
            >
              下一页
            </button>
          </nav>
        </div>
      )}
    </section>
  );
}

function ResolutionRow({ row }: { row: InventoryResolutionRow }) {
  const inventory = row.inventory;
  return (
    <tr>
      <td className={css.resolutionCode}>{row.code}</td>
      <td>{show(inventory?.name)}</td>
      <td>{show(inventory?.specification)}</td>
      <td>{show(inventory?.unit)}</td>
      <td>
        <span className={css.resolutionStatus} data-status={row.status}>
          {statusLabel(row.status)}
        </span>
      </td>
      <td>
        {row.status === "ambiguous" ? (
          <CandidateList candidates={row.candidates} />
        ) : inventory ? (
          <CandidateList candidates={[inventory]} />
        ) : (
          "—"
        )}
      </td>
    </tr>
  );
}

function CandidateList({ candidates }: { candidates: InventoryCandidate[] }) {
  if (candidates.length === 0) {
    return <span>档案详情未返回</span>;
  }
  return (
    <ul className={css.resolutionCandidates}>
      {candidates.map((candidate, index) => (
        <li key={`${candidate.id ?? candidate.code}-${index}`}>
          <strong>{show(candidate.name)}</strong>
          <small>
            {candidate.code} · {show(candidate.specification)} ·{" "}
            {show(candidate.unit)}
          </small>
        </li>
      ))}
    </ul>
  );
}

function countStatuses(rows: InventoryResolutionRow[]) {
  return rows.reduce(
    (counts, row) => {
      counts[row.status] += 1;
      return counts;
    },
    { found: 0, missing: 0, ambiguous: 0, unknown: 0 },
  );
}

function statusLabel(status: InventoryStatus): string {
  switch (status) {
    case "found":
      return "已存在";
    case "missing":
      return "未找到";
    case "ambiguous":
      return "多条候选";
    case "unknown":
      return "未返回";
  }
}
