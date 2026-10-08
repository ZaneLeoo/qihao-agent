import { useCallback } from "react";
import type { PendingQuestion } from "@deepseek-ai/dsh-client-ui-user-questions/client";
import { BomReviewLauncher } from "./BomReviewLauncher.tsx";
import { BomReviewCard } from "./BomReviewCard.tsx";
import { InventoryResolutionCard } from "./InventoryResolutionCard.tsx";
import {
  CHANGE_LABEL,
  CONFIRM_LABEL,
  REVIEW_QUESTION_ID,
  isRecord,
  parseReview,
  type Decision,
  type ImageRef,
} from "../shared/contracts.ts";
import { text } from "./BomReview.module.css";

interface ClientContext {
  effect(callback: () => unknown, label?: string): void;
  slots: {
    inject(name: string, callback: () => unknown): void;
    register(definition: unknown, component: unknown): () => void;
  };
  uiConversation: {
    imageUrl(sessionId: string, ref: ImageRef): Promise<string>;
  };
}
interface PendingProps {
  matched: PendingQuestion;
}
// DSH 只公开 carrier 类型；按公开行为面判断，不导入内核的私有运行时类。
function isBomQuestion(value: unknown): value is PendingQuestion {
  return (
    isRecord(value) &&
    value.kind === "question" &&
    typeof value.key === "string" &&
    typeof value.sessionId === "string" &&
    typeof value.answer === "function" &&
    Array.isArray(value.questions) &&
    value.questions.length === 1 &&
    isRecord(value.questions[0]) &&
    value.questions[0].id === REVIEW_QUESTION_ID
  );
}
export const inject = ["slots", "uiConversation"];
export function apply(ctx: ClientContext) {
  ctx.effect(() => {
    const style = document.createElement("style");
    style.dataset.plugin = "qihao-bom-import";
    style.textContent = text;
    document.head.appendChild(style);
    return () => style.remove();
  }, "qihao-bom: styles");
  function ReviewComposer({ matched }: PendingProps) {
    const review = parseReview(matched.questions[0]?.detail);
    const loadImage = useCallback(
      (ref: ImageRef) => ctx.uiConversation.imageUrl(matched.sessionId, ref),
      [matched.sessionId],
    );
    if (!review) {
      return <p role="alert">BOM 确认数据不完整，请停止本轮并重新校验。</p>;
    }
    async function onDecision(decision: Decision) {
      await matched.answer({
        answers: [
          {
            id: REVIEW_QUESTION_ID,
            selected: [decision === "CONFIRMED" ? CONFIRM_LABEL : CHANGE_LABEL],
          },
        ],
      });
    }
    return (
      <BomReviewLauncher
        key={matched.key}
        review={review}
        loadImage={loadImage}
        onDecision={onDecision}
      />
    );
  }
  ctx.slots.inject("conversation.composer", () =>
    ctx.slots.register(
      {
        name: "conversation.composer",
        priority: -10,
        select: ({ pendingInteraction }: { pendingInteraction?: unknown }) =>
          isBomQuestion(pendingInteraction) ? pendingInteraction : null,
      },
      ReviewComposer,
    ),
  );
  ctx.slots.inject("tool.call.toolview", () =>
    ctx.slots.register(
      { name: "tool.call.toolview", key: "review_bom_import" },
      ({
        block,
        loadImage,
      }: {
        block: { kind?: string; meta?: unknown };
        loadImage: (ref: ImageRef) => Promise<string>;
      }) =>
        block.kind === "tool-result" ? (
          <BomReviewCard meta={block.meta} loadImage={loadImage} />
        ) : (
          <p>等待用户核对 BOM…</p>
        ),
    ),
  );
  ctx.slots.inject("tool.call.toolview", () =>
    ctx.slots.register(
      {
        name: "tool.call.toolview",
        key: "mcp__mom__resolve_bom_materials_v2",
      },
      ({ block }: { block: unknown }) => (
        <InventoryResolutionCard block={block} />
      ),
    ),
  );
}
