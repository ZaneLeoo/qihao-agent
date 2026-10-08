import { BomReviewLauncher } from "./BomReviewLauncher.tsx";
import {
  parseReview,
  type Decision,
  type ImageRef,
} from "../shared/contracts.ts";
interface Props {
  meta: unknown;
  loadImage: (ref: ImageRef) => Promise<string>;
}
/** 历史卡片只读；确认不代表业务创建成功。 */
export function BomReviewCard({ meta, loadImage }: Props) {
  const value =
    typeof meta === "object" && meta !== null
      ? (meta as Record<string, unknown>)
      : undefined;
  const review = parseReview(JSON.stringify(value?.review));
  const decision = value?.decision;
  if (
    !review ||
    !["CONFIRMED", "CHANGE_REQUESTED", "EXPIRED"].includes(String(decision))
  ) {
    return <p>BOM 确认记录不可展示，请查看原始工具结果。</p>;
  }
  return (
    <BomReviewLauncher
      review={review}
      history={decision as Decision}
      loadImage={loadImage}
    />
  );
}
