import type { Agent, SessionEvent, HostContext } from "../ports.ts";
import {
  CHANGE_LABEL,
  CONFIRM_LABEL,
  REVIEW_QUESTION_ID,
  isConfirmation,
  isRecord,
  isSourcePage,
  type Decision,
  type ReviewData,
  type SourceLink,
  type SourcePage,
} from "../shared/contracts.ts";
import { recordedResults, sourceMessage } from "./session-results.ts";

export interface ReviewArgs {
  validationId: string;
  sourceSetId?: string;
  sourceLinks?: SourceLink[];
}
export interface ReviewResult {
  decision: Decision;
  validationId: string;
  requestId: string;
  review: ReviewData;
}
/** 只接受本会话最新的真实校验结果；不能用旧票据绕过后续修正。 */
export function loadReview(
  events: readonly SessionEvent[],
  args: ReviewArgs,
): ReviewData {
  const results = recordedResults(events, "mcp__mom__validate_bom_import_v2");
  const last = results.at(-1);
  if (
    last === undefined ||
    last.value.validationId !== args.validationId ||
    last.value.valid !== true ||
    last.value.code !== 200 ||
    !isConfirmation(last.value.confirmationData) ||
    typeof last.value.expiresAt !== "string" ||
    !Number.isFinite(Date.parse(last.value.expiresAt))
  ) {
    throw new Error("找不到本会话最新的有效 BOM 校验结果，请重新校验。");
  }
  const latestCall = events.findLast(
    (event) =>
      event.type === "tool/call" &&
      event.data.name === "mcp__mom__validate_bom_import_v2",
  );
  if (latestCall !== undefined && latestCall.seq > last.seq) {
    throw new Error("最新校验尚未成功返回，请重新校验。");
  }
  const confirmationData = last.value.confirmationData;
  if (
    recordedResults(events, "review_bom_import").some(
      (result) =>
        result.seq > last.seq &&
        result.value.validationId === args.validationId,
    )
  ) {
    throw new Error(
      "这张票据已完成用户确认或返回修改，请按原结果继续，修改后重新校验。",
    );
  }
  const laterCalls = events.filter(
    (event) =>
      event.seq > last.seq &&
      event.type === "tool/call" &&
      event.data.name === "mcp__mom__create_bom_import_v2",
  );
  if (
    laterCalls.some((call) => {
      try {
        return (
          JSON.parse(String(call.data.arguments)).validationId ===
          args.validationId
        );
      } catch {
        return false;
      }
    })
  ) {
    throw new Error("这张票据已经尝试创建，请先按 requestId 查询结果。");
  }
  const beforeValidation = events.filter((event) => event.seq < last.seq);
  const source = sourceMessage(beforeValidation, args.sourceSetId);
  const pages = recordedResults(
    beforeValidation,
    "read_bom_drawing_pages",
  ).filter((result) => result.value.sourceSetId === source.sourceSetId);
  const catalog = pages.at(-1)?.value.sources;
  if (
    catalog !== undefined &&
    (!Array.isArray(catalog) || !catalog.every(isSourcePage))
  ) {
    throw new Error("来源目录不完整，请重新读取图纸页面。");
  }
  const sources: SourcePage[] = Array.isArray(catalog)
    ? catalog.map((value) => ({ ...value }) as SourcePage)
    : source.sources
        .filter((item) => item.kind === "image")
        .map((item, index) => ({
          sourcePage: index + 1,
          pageNo: 1,
          fileName: item.ref.name ?? "图片",
          image: item.ref as import("../shared/contracts.ts").ImageRef,
        }));
  if (
    source.sources.some((item) => item.kind === "file") &&
    !Array.isArray(catalog)
  ) {
    throw new Error("请先读取 PDF 图纸页面，核对全部页面后再确认。");
  }
  for (const result of pages) {
    if (!Array.isArray(result.value.pages)) {
      continue;
    }
    for (const page of result.value.pages) {
      if (!isRecord(page) || !isRecord(page.image) || page.cropped === true) {
        continue;
      }
      const entry = sources.find(
        (entry) => entry.sourcePage === page.sourcePage,
      );
      if (entry !== undefined) {
        entry.image =
          page.image as unknown as import("../shared/contracts.ts").ImageRef;
      }
    }
  }
  // 普通图片从真实附件补齐，PDF 只展示已读取的页面，不伪造预览。
  const links = args.sourceLinks ?? [];
  if (
    !Array.isArray(links) ||
    links.some(
      (link) =>
        !isRecord(link) ||
        !Number.isInteger(link.bomIndex) ||
        link.bomIndex < 1 ||
        link.bomIndex > confirmationData.boms.length ||
        !sources.some((page) => page.sourcePage === link.sourcePage) ||
        (link.componentIndex !== undefined &&
          (!Number.isInteger(link.componentIndex) ||
            link.componentIndex < 1 ||
            link.componentIndex >
              confirmationData.boms[link.bomIndex - 1].components.length)),
    )
  ) {
    throw new Error("图纸来源关联不正确，请核对 BOM 序号、子件序号及来源页。");
  }
  const referenced = [
    ...confirmationData.boms
      .map((bom) => bom.sourcePage)
      .filter((page) => page !== undefined),
    ...links.map((link) => link.sourcePage),
  ];
  if (
    referenced.some(
      (page) =>
        !sources.some(
          (source) => source.sourcePage === page && source.image !== undefined,
        ),
    )
  ) {
    throw new Error(
      "BOM 关联的来源页尚未完整读取，请先读取这些页面，再打开确认。",
    );
  }
  const data: ReviewData = {
    kind: "qihao-bom-review",
    version: 1,
    validationId: args.validationId,
    expiresAt: last.value.expiresAt,
    confirmationData,
    warnings: Array.isArray(last.value.warnings) ? last.value.warnings : [],
    sources,
    sourceLinks: links,
  };
  return structuredClone(data);
}
export async function reviewBom(
  ctx: HostContext,
  agent: Agent,
  args: ReviewArgs,
  signal: AbortSignal,
): Promise<ReviewResult> {
  const review = loadReview(agent.session.snapshotEvents(), args);
  const base = {
    validationId: review.validationId,
    requestId: review.confirmationData.requestId,
    review,
  };
  if (Date.parse(review.expiresAt) <= Date.now()) {
    return { ...base, decision: "EXPIRED" };
  }
  const answer = await ctx.userQuestions.ask({
    agent,
    signal,
    questions: [
      {
        id: REVIEW_QUESTION_ID,
        question: "请核对整批 BOM，确认后将创建草稿版本。",
        detail: JSON.stringify(review),
        options: [{ label: CONFIRM_LABEL }, { label: CHANGE_LABEL }],
      },
    ],
  });
  signal.throwIfAborted();
  if (Date.parse(review.expiresAt) <= Date.now()) {
    return { ...base, decision: "EXPIRED" };
  }
  // 等待期间有新的校验或创建时，旧界面的确认不能继续使用。
  loadReview(agent.session.snapshotEvents(), args);
  const item = answer.answers.find((item) => item.id === REVIEW_QUESTION_ID);
  return {
    ...base,
    decision:
      item?.selected.length === 1 &&
      item.selected[0] === CONFIRM_LABEL &&
      !item.custom
        ? "CONFIRMED"
        : "CHANGE_REQUESTED",
  };
}
