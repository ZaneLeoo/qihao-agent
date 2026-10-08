import { isRecord } from "./contracts.ts";

export interface InventoryCandidate {
  id?: string;
  code: string;
  name?: string;
  specification?: string;
  unit?: string;
}

export type InventoryStatus = "found" | "missing" | "ambiguous" | "unknown";

export interface InventoryResolutionRow {
  code: string;
  status: InventoryStatus;
  inventory?: InventoryCandidate;
  candidates: InventoryCandidate[];
}

export interface InventoryResolution {
  message?: string;
  traceId?: string;
  rows: InventoryResolutionRow[];
}

interface ResolutionPayload {
  code: number;
  msg?: string;
  traceId?: string;
  found: unknown[];
  missing: unknown[];
  ambiguous: unknown[];
}

/** 把 MCP 原始文本或结构化结果转换成可展示的存货核对数据。 */
export function parseInventoryResolution(
  value: unknown,
): ResolutionPayload | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const data = isRecord(value.structuredContent)
    ? value.structuredContent
    : value;
  if (
    !isRecord(data) ||
    data.code !== 200 ||
    !Array.isArray(data.found) ||
    !Array.isArray(data.missing) ||
    !Array.isArray(data.ambiguous)
  ) {
    return undefined;
  }
  return {
    code: 200,
    msg: typeof data.msg === "string" ? data.msg : undefined,
    traceId: typeof data.traceId === "string" ? data.traceId : undefined,
    found: data.found,
    missing: data.missing,
    ambiguous: data.ambiguous,
  };
}

/** 按工具调用原始编码顺序合并命中、缺失和重复档案。 */
export function inventoryResolutionRows(
  payload: ResolutionPayload,
  requestedCodes: readonly string[] = [],
): InventoryResolutionRow[] {
  const found = new Map<string, InventoryCandidate>();
  const missing = new Set<string>();
  const ambiguous = new Map<string, InventoryCandidate[]>();

  for (const value of payload.found) {
    const record = inventoryCandidate(value);
    if (record) {
      found.set(record.code, record);
    }
  }
  for (const value of payload.missing) {
    const code = typeof value === "string" ? value : recordCode(value);
    if (code) {
      missing.add(code);
    }
  }
  for (const value of payload.ambiguous) {
    if (!isRecord(value) || typeof value.code !== "string") {
      continue;
    }
    const candidates = Array.isArray(value.candidates)
      ? value.candidates
          .map((candidate) =>
            inventoryCandidate(candidate, value.code as string),
          )
          .filter(
            (candidate): candidate is InventoryCandidate =>
              candidate !== undefined,
          )
      : [];
    ambiguous.set(value.code, candidates);
  }

  const codes = uniqueCodes(requestedCodes);
  if (codes.length === 0) {
    codes.push(...found.keys(), ...missing, ...ambiguous.keys());
  }
  return codes.map((code) => {
    const candidates = ambiguous.get(code);
    if (candidates !== undefined) {
      return { code, status: "ambiguous", candidates };
    }
    const inventory = found.get(code);
    if (inventory !== undefined) {
      return { code, status: "found", inventory, candidates: [] };
    }
    if (missing.has(code)) {
      return { code, status: "missing", candidates: [] };
    }
    return { code, status: "unknown", candidates: [] };
  });
}

/** 从工具调用参数中读取编码，保留首次出现的顺序。 */
export function requestedInventoryCodes(argsRaw: string | undefined): string[] {
  if (!argsRaw) {
    return [];
  }
  try {
    const value: unknown = JSON.parse(argsRaw);
    if (!isRecord(value) || !Array.isArray(value.codes)) {
      return [];
    }
    return uniqueCodes(
      value.codes.filter((code): code is string => typeof code === "string"),
    );
  } catch {
    return [];
  }
}

/** 从 MCP 工具卡片中读取后端提供的结构化结果或其文本投影。 */
export function resolutionFromToolBlock(
  block: unknown,
): InventoryResolution | undefined {
  if (!isRecord(block) || block.isError === true) {
    return undefined;
  }
  const values: unknown[] = [block.meta];
  if (Array.isArray(block.content)) {
    for (const item of block.content) {
      if (
        isRecord(item) &&
        item.type === "text" &&
        typeof item.text === "string"
      ) {
        values.push(...parseResultText(item.text));
      }
    }
  }
  for (const value of values) {
    const payload = parseInventoryResolution(value);
    if (payload) {
      return {
        message: payload.msg,
        traceId: payload.traceId,
        rows: inventoryResolutionRows(
          payload,
          requestedInventoryCodes(
            isRecord(block.call) && typeof block.call.argsRaw === "string"
              ? block.call.argsRaw
              : undefined,
          ),
        ),
      };
    }
  }
  return undefined;
}

/** 抽取 MCP Client 在文本结果中附带的 structuredContent。 */
function parseResultText(text: string): unknown[] {
  const marker = "MCP structuredContent:";
  const markerIndex = text.lastIndexOf(marker);
  const content =
    markerIndex >= 0
      ? text.slice(markerIndex + marker.length).trim()
      : text.trim();
  try {
    const parsed: unknown = JSON.parse(content);
    if (isRecord(parsed) && isRecord(parsed.structuredContent)) {
      return [parsed.structuredContent, parsed];
    }
    return [parsed];
  } catch {
    return [];
  }
}

function inventoryCandidate(
  value: unknown,
  fallbackCode?: string,
): InventoryCandidate | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const code = typeof value.code === "string" ? value.code : fallbackCode;
  if (!code) {
    return undefined;
  }
  return {
    code,
    id: typeof value.id === "string" ? value.id : undefined,
    name: typeof value.name === "string" ? value.name : undefined,
    specification:
      typeof value.specification === "string" ? value.specification : undefined,
    unit: typeof value.unit === "string" ? value.unit : undefined,
  };
}

function recordCode(value: unknown): string | undefined {
  return isRecord(value) && typeof value.code === "string"
    ? value.code
    : undefined;
}

function uniqueCodes(codes: readonly string[]): string[] {
  return [...new Set(codes.map((code) => code.trim()).filter(Boolean))];
}
