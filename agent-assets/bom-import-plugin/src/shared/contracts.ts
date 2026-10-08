export interface ImageRef {
  attachmentId: string;
  mediaType: string;
  bytes: number;
  width: number;
  height: number;
  name?: string;
}
export interface SourcePage {
  sourcePage: number;
  fileName: string;
  pageNo: number;
  image?: ImageRef;
  cropped?: boolean;
}
export interface Component extends Record<string, unknown> {
  inventoryCode: string;
  inventoryName?: string;
  inventorySpecification?: string;
  inventoryUnit?: string;
  quantity: number;
  selectedVersionId?: string;
  sourceLineNo?: number;
}
export interface Bom extends Record<string, unknown> {
  parentInventoryCode: string;
  parentInventoryName?: string;
  parentInventorySpecification?: string;
  versionCode?: string;
  baseQty?: number;
  sourcePage?: number;
  components: Component[];
}
export interface ConfirmationData {
  requestId: string;
  organizationId?: string;
  organizationName?: string;
  boms: Bom[];
}
export interface SourceLink {
  bomIndex: number;
  componentIndex?: number;
  sourcePage: number;
}
export interface ReviewData {
  kind: "qihao-bom-review";
  version: 1;
  validationId: string;
  expiresAt: string;
  confirmationData: ConfirmationData;
  warnings: unknown[];
  sources: SourcePage[];
  sourceLinks: SourceLink[];
}
export type Decision = "CONFIRMED" | "CHANGE_REQUESTED" | "EXPIRED";
export const REVIEW_QUESTION_ID = "qihao-bom-review-v1";
export const CONFIRM_LABEL = "确认创建草稿";
export const CHANGE_LABEL = "返回对话修改";
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
export function isSourcePage(value: unknown): value is SourcePage {
  return (
    isRecord(value) &&
    Number.isSafeInteger(value.sourcePage) &&
    Number(value.sourcePage) > 0 &&
    typeof value.fileName === "string" &&
    Number.isSafeInteger(value.pageNo) &&
    Number(value.pageNo) > 0 &&
    (value.image === undefined ||
      (isRecord(value.image) &&
        typeof value.image.attachmentId === "string" &&
        typeof value.image.mediaType === "string" &&
        typeof value.image.bytes === "number" &&
        typeof value.image.width === "number" &&
        typeof value.image.height === "number"))
  );
}
/** 仅检查确认面板实际使用的字段，不代替后端业务校验。 */
export function isConfirmation(value: unknown): value is ConfirmationData {
  return (
    isRecord(value) &&
    typeof value.requestId === "string" &&
    Array.isArray(value.boms) &&
    value.boms.length > 0 &&
    value.boms.every(
      (bom) =>
        isRecord(bom) &&
        typeof bom.parentInventoryCode === "string" &&
        Array.isArray(bom.components) &&
        bom.components.every(
          (row) =>
            isRecord(row) &&
            typeof row.inventoryCode === "string" &&
            typeof row.quantity === "number" &&
            Number.isFinite(row.quantity),
        ),
    )
  );
}
export function parseReview(
  detail: string | undefined,
): ReviewData | undefined {
  try {
    const value: unknown = JSON.parse(detail ?? "");
    if (
      !isRecord(value) ||
      value.kind !== "qihao-bom-review" ||
      value.version !== 1 ||
      typeof value.validationId !== "string" ||
      typeof value.expiresAt !== "string" ||
      !Number.isFinite(Date.parse(value.expiresAt)) ||
      !isConfirmation(value.confirmationData) ||
      !Array.isArray(value.sources) ||
      !value.sources.every(isSourcePage) ||
      !Array.isArray(value.sourceLinks) ||
      !value.sourceLinks.every(
        (link) =>
          isRecord(link) &&
          Number.isInteger(link.bomIndex) &&
          Number.isInteger(link.sourcePage) &&
          (link.componentIndex === undefined ||
            Number.isInteger(link.componentIndex)),
      ) ||
      !Array.isArray(value.warnings)
    ) {
      return undefined;
    }
    return value as unknown as ReviewData;
  } catch {
    return undefined;
  }
}
export function show(value: unknown): string {
  return value === undefined || value === null || value === ""
    ? "—"
    : String(value);
}
