import { createElement } from "react";
import logo from "./logo.png";

export const inject = ["slots", "locale"];

/** Keep the supplied image intact and respect each host's requested height. */
export function BrandMark({ size, className }) {
  return createElement("img", {
    src: logo,
    alt: "",
    "aria-hidden": true,
    className,
    width: Math.round(size * 240 / 156),
    height: size,
    style: { display: "block", objectFit: "contain", marginRight: 10 },
  });
}

function BrandName({ t }) {
  return createElement("span", { style: { whiteSpace: "nowrap", fontWeight: 600 } }, t("name"));
}

/** Use only the sidebar and hero mark slots already shipped by DSH. */
export function apply(ctx) {
  ctx.effect(() => ctx.locale.register("qihaoBrand", {
    zh: { name: "企好AI" }, en: { name: "企好AI" },
  }), "qihao-brand: locale");
  ctx.slots.inject("sidebar.brand.mark", () =>
    ctx.slots.inject("sidebar.brand.name", () =>
      ctx.slots.inject("conversation.hero.brand.mark", function* () {
        yield ctx.slots.register({ name: "sidebar.brand.mark" }, BrandMark);
        yield ctx.slots.register({ name: "sidebar.brand.name", locale: "qihaoBrand" }, BrandName);
        yield ctx.slots.register({ name: "conversation.hero.brand.mark" }, BrandMark);
      })));
}
