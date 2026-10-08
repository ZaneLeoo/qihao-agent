// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { BomReviewPanel } from "../src/client/BomReviewPanel.tsx";
import { BomDependencyTree } from "../src/client/BomDependencyTree.tsx";
import { BomReviewLauncher } from "../src/client/BomReviewLauncher.tsx";
import { BomReviewCard } from "../src/client/BomReviewCard.tsx";
import { InventoryResolutionCard } from "../src/client/InventoryResolutionCard.tsx";
import { review } from "./fixtures.ts";
beforeEach(() => {
  HTMLElement.prototype.scrollTo = vi.fn();
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
const loadImage = async () => "data:image/png;base64,AA==";

describe("BOM 只读确认组件", () => {
  it("展示表格、来源，切换依赖树；双击只确认一次", async () => {
    const data = review();
    const decision = vi.fn(() => new Promise<void>(() => {}));
    render(
      <BomReviewPanel
        review={data}
        loadImage={loadImage}
        onDecision={decision}
      />,
    );
    expect(screen.getByText("直属子件 · 1 条")).toBeTruthy();
    expect(screen.getByText("灯座")).toBeTruthy();
    expect(screen.getByText("BOM测试组织")).toBeTruthy();
    expect(screen.getByText("版本编码")).toBeTruthy();
    expect(screen.getByText("V001")).toBeTruthy();
    expect(screen.queryByText("版本设置与备注")).toBeNull();
    expect(screen.queryByRole("columnheader", { name: "下级版本" })).toBeNull();
    expect(
      screen.queryByRole("columnheader", { name: "备注 / 来源行" }),
    ).toBeNull();
    expect(screen.queryByText("AI测试")).toBeNull();
    expect(screen.queryByRole("columnheader", { name: "固定损耗" })).toBeNull();
    expect(
      screen.queryByRole("columnheader", { name: "变动损耗率" }),
    ).toBeNull();
    expect(
      screen.queryByRole("columnheader", { name: "虚拟件 / MRP展开" }),
    ).toBeNull();
    await waitFor(() =>
      expect(screen.getByAltText("装配图.png 第 1 页")).toBeTruthy(),
    );
    fireEvent.click(screen.getByText("定位图纸"));
    expect(screen.getByRole("status").textContent).toContain(
      "已定位：C001 · 图纸明细第 1 行",
    );
    fireEvent.click(screen.getByText("本批依赖树"));
    expect(
      screen.getByText("本批导入关系预览：不自动绑定本批新建版本。"),
    ).toBeTruthy();
    const button = screen.getByText("确认创建草稿");
    fireEvent.click(button);
    fireEvent.click(button);
    expect(decision).toHaveBeenCalledTimes(1);
    expect(decision).toHaveBeenCalledWith("CONFIRMED");
    expect(document.querySelector("input")).toBeNull();
  });
  it("返回修改不会确认，历史卡片不能再次提交", () => {
    const data = review();
    const decision = vi.fn(async () => {});
    render(
      <BomReviewPanel
        review={data}
        loadImage={loadImage}
        onDecision={decision}
      />,
    );
    fireEvent.click(screen.getByText("返回对话修改"));
    expect(decision).toHaveBeenCalledWith("CHANGE_REQUESTED");
    cleanup();
    render(
      <BomReviewCard
        meta={{ decision: "CONFIRMED", review: data }}
        loadImage={loadImage}
      />,
    );
    fireEvent.click(screen.getByText("查看明细"));
    expect(screen.queryByText("确认创建草稿")).toBeNull();
  });
  it("过期只能返回重新校验，提交失败可以重试", async () => {
    const data = review();
    data.expiresAt = new Date(0).toISOString();
    const decision = vi.fn(async () => {
      throw new Error("network");
    });
    render(
      <BomReviewPanel
        review={data}
        loadImage={loadImage}
        onDecision={decision}
      />,
    );
    fireEvent.click(screen.getByText("返回重新校验"));
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain("提交确认失败"),
    );
    expect(decision).toHaveBeenCalledWith("EXPIRED");
    fireEvent.click(screen.getByText("返回重新校验"));
    expect(decision).toHaveBeenCalledTimes(2);
  });
});

describe("BOM 首轮存货核对组件", () => {
  it("只在有缺失存货时显示紧凑提示，完整核对表按需展开并分页", () => {
    const found = Array.from({ length: 10 }, (_, index) => ({
      id: `id-${index}`,
      code: `C${String(index + 1).padStart(3, "0")}`,
      name: `物料${index + 1}`,
      specification: `规格${index + 1}`,
      unit: "个",
      organizationId: "org-1",
    }));
    const result = {
      code: 200,
      msg: "存货编码核对完成",
      traceId: "trace-1",
      found,
      missing: ["MISSING-1"],
      ambiguous: [
        {
          code: "DUP-1",
          candidates: [
            {
              id: "dup-1",
              code: "DUP-1",
              name: "重复物料甲",
              specification: "甲规格",
              unit: "套",
            },
            {
              id: "dup-2",
              code: "DUP-1",
              name: "重复物料乙",
              specification: "乙规格",
              unit: "件",
            },
          ],
        },
      ],
    };
    const codes = [...found.map((item) => item.code), "MISSING-1", "DUP-1"];
    const block = {
      kind: "tool-result",
      isError: false,
      call: {
        name: "mcp__mom__resolve_bom_materials_v2",
        argsRaw: JSON.stringify({ codes }),
      },
      content: [
        {
          type: "text",
          text: `核对完成\n\nMCP structuredContent:\n${JSON.stringify(result, null, 2)}`,
        },
      ],
    };
    render(<InventoryResolutionCard block={block} />);

    expect(screen.getByText("发现 1 个存货编码未找到")).toBeTruthy();
    expect(screen.getByText("MISSING-1")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.queryByText("物料1")).toBeNull();

    fireEvent.click(
      screen.getByRole("button", { name: "查看全部 12 项核对结果" }),
    );
    expect(screen.getByText("已存在 10")).toBeTruthy();
    expect(screen.getByText("未找到 1")).toBeTruthy();
    expect(screen.getByText("多条候选 1")).toBeTruthy();
    expect(screen.getAllByText("物料1")).toHaveLength(2);
    expect(screen.queryByRole("row", { name: /MISSING-1/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "下一页物料" }));
    expect(screen.getAllByText("MISSING-1")).toHaveLength(2);
    expect(screen.getByText("未找到")).toBeTruthy();
    expect(screen.getByText("多条候选")).toBeTruthy();
    expect(screen.getByText("重复物料甲")).toBeTruthy();
    expect(screen.getByText("重复物料乙")).toBeTruthy();
    expect(screen.getByText("2 / 2")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("每页显示条数"), {
      target: { value: "20" },
    });
    expect(screen.getAllByText("MISSING-1")).toHaveLength(2);
    expect(screen.getByText("重复物料乙")).toBeTruthy();
    expect(screen.getByText("1 / 1")).toBeTruthy();
  });

  it("没有缺失存货时不显示卡片，包括结果不完整的情况", () => {
    const block = {
      kind: "tool-result",
      isError: false,
      call: { argsRaw: JSON.stringify({ codes: ["A", "B"] }) },
      content: [
        {
          type: "text",
          text: JSON.stringify({
            code: 200,
            found: [{ code: "A", name: "已有档案" }],
            missing: [],
            ambiguous: [],
          }),
        },
      ],
    };
    render(<InventoryResolutionCard block={block} />);
    expect(screen.queryByRole("region", { name: "缺失存货提示" })).toBeNull();
  });

  it("核对工具失败时不显示存货缺失卡片", () => {
    render(
      <InventoryResolutionCard
        block={{
          kind: "tool-result",
          isError: true,
          content: [{ type: "text", text: "用户上下文已失效" }],
        }}
      />,
    );
    expect(screen.queryByRole("region", { name: "缺失存货提示" })).toBeNull();
  });
});

describe("BOM 展开与交互", () => {
  it("默认仅摘要；展开弹窗、关闭或 Escape 不提交决策", () => {
    const decision = vi.fn(async () => {});
    render(
      <BomReviewLauncher
        review={review()}
        loadImage={loadImage}
        onDecision={decision}
      />,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByRole("table")).toBeNull();
    fireEvent.click(screen.getByText("核对 BOM"));
    expect(screen.getByRole("dialog").getAttribute("open")).not.toBeNull();
    expect(screen.getByRole("table")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("最大化弹窗"));
    expect(screen.getByRole("dialog").className).toContain("maximized");
    fireEvent.click(screen.getByLabelText("还原弹窗"));
    expect(screen.getByRole("dialog").className).not.toContain("maximized");
    expect(decision).not.toHaveBeenCalled();
    fireEvent.click(screen.getByLabelText("收起 BOM 详情"));
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByText("核对 BOM"));
    fireEvent(
      screen.getByRole("dialog"),
      new Event("cancel", { bubbles: true }),
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(decision).not.toHaveBeenCalled();
  });
  it("节点展开收起、整树收起和显式版本不展开本批依赖", () => {
    const boms = review().confirmationData.boms;
    boms.push({
      parentInventoryCode: "C001",
      parentInventoryName: "灯座",
      versionCode: "V001",
      components: [
        { inventoryCode: "L001", inventoryName: "底板", quantity: 3 },
      ],
    });
    render(<BomDependencyTree boms={boms} selected={0} />);
    expect(screen.queryByText("底板")).toBeNull();
    fireEvent.click(screen.getByLabelText("展开 C001"));
    expect(screen.getByText("底板")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("收起 C001"));
    expect(screen.queryByText("底板")).toBeNull();
    fireEvent.click(screen.getByLabelText("展开 C001"));
    expect(screen.getByText("底板")).toBeTruthy();
    fireEvent.click(screen.getByText("收起全部"));
    expect(screen.queryByText("灯座")).toBeNull();
    fireEvent.click(screen.getByText("展开全部"));
    expect(screen.getByText("底板")).toBeTruthy();
    cleanup();
    boms[0].components[0].selectedVersionId = "existing-v1";
    render(<BomDependencyTree boms={boms} selected={0} />);
    expect(screen.queryByText("底板")).toBeNull();
    expect(screen.queryByLabelText("收起 C001")).toBeNull();
    expect(screen.queryByText("指定版本")).toBeNull();
    expect(screen.queryByText("按所选版本")).toBeNull();
  });
  it("循环依赖终止且没有可无限展开的按钮", () => {
    const boms = review().confirmationData.boms;
    boms[0].components = [{ inventoryCode: "P001", quantity: 1 }];
    render(<BomDependencyTree boms={boms} selected={0} />);
    expect(screen.getByText("循环引用")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "收起 P001" })).toHaveLength(
      1,
    );
  });
});

describe("依赖树拖拽", () => {
  it("画布可平移，结束拖拽后不继续移动，按钮不会开始拖拽", () => {
    const original = window.PointerEvent;
    window.PointerEvent = MouseEvent as typeof PointerEvent;
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.hasPointerCapture = vi.fn(() => true);
    HTMLElement.prototype.releasePointerCapture = vi.fn();
    try {
      render(
        <BomDependencyTree
          boms={review().confirmationData.boms}
          selected={0}
        />,
      );
      const canvas = screen.getByRole("region", { name: "可拖拽的依赖树画布" });
      canvas.scrollLeft = 100;
      canvas.scrollTop = 100;
      fireEvent.pointerDown(canvas, { button: 0, clientX: 200, clientY: 200 });
      fireEvent.pointerMove(canvas, { clientX: 160, clientY: 150 });
      expect(canvas.scrollLeft).toBe(140);
      expect(canvas.scrollTop).toBe(150);
      fireEvent.pointerUp(canvas);
      fireEvent.pointerMove(canvas, { clientX: 100, clientY: 100 });
      expect(canvas.scrollLeft).toBe(140);
      fireEvent.pointerDown(screen.getByLabelText("收起 P001"), {
        button: 0,
        clientX: 200,
        clientY: 200,
      });
      fireEvent.pointerMove(canvas, { clientX: 100, clientY: 100 });
      expect(canvas.scrollLeft).toBe(140);
      fireEvent.click(screen.getByText("重置视图"));
      expect(HTMLElement.prototype.scrollTo).toHaveBeenCalledWith({
        top: 0,
        left: 0,
      });
    } finally {
      window.PointerEvent = original;
    }
  });
});
