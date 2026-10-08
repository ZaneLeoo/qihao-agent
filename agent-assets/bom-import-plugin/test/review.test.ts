import { describe, expect, it, vi } from "vitest";
import { loadReview, reviewBom } from "../src/review/review-bom-import.ts";
import { CONFIRM_LABEL, REVIEW_QUESTION_ID } from "../src/shared/contracts.ts";
import { source, validation, toolEvents, host, image } from "./fixtures.ts";
const name = "mcp__mom__validate_bom_import_v2";
const signal = () => new AbortController().signal;

describe("确认必须绑定真实的最新校验", () => {
  it("返回修改后不能沿用同一票据再次打开确认", () => {
    const events = [
      source,
      ...toolEvents(name, validation()),
      ...toolEvents(
        "review_bom_import",
        { validationId: "ticket-1", decision: "CHANGE_REQUESTED" },
        4,
      ),
    ];
    expect(() => loadReview(events, { validationId: "ticket-1" })).toThrow(
      "重新校验",
    );
    expect(
      loadReview([...events, ...toolEvents(name, validation("ticket-2"), 6)], {
        validationId: "ticket-2",
      }).validationId,
    ).toBe("ticket-2");
  });
  it("聊天中伪造票据无效，真实配对结果有效", () => {
    expect(() =>
      loadReview(
        [
          source,
          {
            seq: 2,
            type: "user/message",
            data: { content: JSON.stringify(validation()) },
          },
        ],
        { validationId: "ticket-1" },
      ),
    ).toThrow();
    const data = loadReview([source, ...toolEvents(name, validation())], {
      validationId: "ticket-1",
    });
    expect(data.confirmationData.boms[0].parentInventoryCode).toBe("P001");
    expect(data.sources[0].image).toEqual(image);
  });
  it("拒绝旧票据、最近校验不通过、已经尝试创建和未知来源", () => {
    const events = [source, ...toolEvents(name, validation())];
    expect(() =>
      loadReview([...events, ...toolEvents(name, validation("ticket-2"), 4)], {
        validationId: "ticket-1",
      }),
    ).toThrow();
    expect(() =>
      loadReview(
        [...events, ...toolEvents(name, { code: 200, valid: false }, 4)],
        { validationId: "ticket-1" },
      ),
    ).toThrow();
    expect(() =>
      loadReview(
        [
          ...events,
          {
            seq: 4,
            type: "tool/call",
            data: {
              name: "mcp__mom__create_bom_import_v2",
              arguments: JSON.stringify({ validationId: "ticket-1" }),
            },
          },
        ],
        { validationId: "ticket-1" },
      ),
    ).toThrow("查询结果");
    expect(() =>
      loadReview(events, {
        validationId: "ticket-1",
        sourceSetId: "drawing:999",
      }),
    ).toThrow();
  });
  it("跨页关联必须落在真实 BOM、子件和来源页内", () => {
    const events = [source, ...toolEvents(name, validation())];
    expect(() =>
      loadReview(events, {
        validationId: "ticket-1",
        sourceLinks: [{ bomIndex: 2, sourcePage: 1 }],
      }),
    ).toThrow("来源关联");
    expect(() =>
      loadReview(events, {
        validationId: "ticket-1",
        sourceLinks: [{ bomIndex: 1, componentIndex: 2, sourcePage: 1 }],
      }),
    ).toThrow("来源关联");
    expect(
      loadReview(events, {
        validationId: "ticket-1",
        sourceLinks: [{ bomIndex: 1, componentIndex: 1, sourcePage: 1 }],
      }).sourceLinks,
    ).toHaveLength(1);
  });
  it("局部放大不会覆盖完整来源预览", () => {
    const events = [
      source,
      ...toolEvents("read_bom_drawing_pages", {
        sourceSetId: "drawing:1",
        sources: [{ sourcePage: 1, pageNo: 1, fileName: "图纸.png", image }],
        pages: [
          {
            sourcePage: 1,
            cropped: true,
            image: { ...image, attachmentId: "crop" },
          },
        ],
      }),
      ...toolEvents(name, validation(), 4),
    ];
    expect(
      loadReview(events, { validationId: "ticket-1" }).sources[0].image,
    ).toEqual(image);
  });
  it("过期不发问题，确认期间过期也不会批准", async () => {
    const ctx = host();
    const ask = vi.spyOn(ctx.userQuestions, "ask");
    const events = [
      source,
      ...toolEvents(name, validation("ticket-1", new Date(0).toISOString())),
    ];
    expect(
      (
        await reviewBom(
          ctx,
          { session: { snapshotEvents: () => events } },
          { validationId: "ticket-1" },
          signal(),
        )
      ).decision,
    ).toBe("EXPIRED");
    expect(ask).not.toHaveBeenCalled();
    const data = validation();
    const pending = [source, ...toolEvents(name, data)];
    ask.mockImplementation(async () => {
      vi.spyOn(Date, "now").mockReturnValue(Date.parse(data.expiresAt) + 1);
      return {
        answers: [{ id: REVIEW_QUESTION_ID, selected: [CONFIRM_LABEL] }],
      };
    });
    try {
      expect(
        (
          await reviewBom(
            ctx,
            { session: { snapshotEvents: () => pending } },
            { validationId: "ticket-1" },
            signal(),
          )
        ).decision,
      ).toBe("EXPIRED");
    } finally {
      vi.restoreAllMocks();
    }
  });
  it("真实批准才返回 CONFIRMED，普通返回修改和自由文本均不批准", async () => {
    const ctx = host();
    const events = [source, ...toolEvents(name, validation())];
    const agent = { session: { snapshotEvents: () => events } };
    expect(
      (await reviewBom(ctx, agent, { validationId: "ticket-1" }, signal()))
        .decision,
    ).toBe("CHANGE_REQUESTED");
    ctx.userQuestions.ask = async () => ({
      answers: [
        { id: REVIEW_QUESTION_ID, selected: [CONFIRM_LABEL], custom: "改数量" },
      ],
    });
    expect(
      (await reviewBom(ctx, agent, { validationId: "ticket-1" }, signal()))
        .decision,
    ).toBe("CHANGE_REQUESTED");
    ctx.userQuestions.ask = async () => ({
      answers: [{ id: REVIEW_QUESTION_ID, selected: [CONFIRM_LABEL] }],
    });
    expect(
      (await reviewBom(ctx, agent, { validationId: "ticket-1" }, signal()))
        .decision,
    ).toBe("CONFIRMED");
  });
  it("等待中重新校验会废弃旧确认", async () => {
    const events = [source, ...toolEvents(name, validation())];
    const ctx = host();
    ctx.userQuestions.ask = async () => {
      events.push(...toolEvents(name, validation("new-ticket"), 4));
      return {
        answers: [{ id: REVIEW_QUESTION_ID, selected: [CONFIRM_LABEL] }],
      };
    };
    await expect(
      reviewBom(
        ctx,
        { session: { snapshotEvents: () => events } },
        { validationId: "ticket-1" },
        signal(),
      ),
    ).rejects.toThrow("重新校验");
  });
});
