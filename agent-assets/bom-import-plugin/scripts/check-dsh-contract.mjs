import assert from "node:assert/strict";
import { createRequire, registerHooks } from "node:module";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";

// 只导入当前 DSH 的公共 API，不启动 Loader、Web 服务、模型或业务 MCP。
const dshRoot = process.argv[2];
if (!dshRoot) {
  throw new Error("用法：node scripts/check-dsh-contract.mjs <DSH目录>");
}
const requireDsh = createRequire(join(resolve(dshRoot), "apps/cli/lib/bin.js"));
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith("@deepseek-ai/")) {
      try {
        return next(specifier, context);
      } catch {
        return {
          url: pathToFileURL(requireDsh.resolve(specifier)).href,
          shortCircuit: true,
        };
      }
    }
    return next(specifier, context);
  },
});
const uiHost = await import("../lib/index.js");
assert.equal(uiHost.inject, undefined);
assert.equal(uiHost.apply(), undefined);
const { apply, Config } = await import("../lib/tools.js");
const { validateJsonSchemaValue } = await import("@deepseek-ai/dsh-tools");
const definitions = [];
assert.equal(Config({}).maxPagesPerCall, 8);
assert.throws(() => Config({ maxPagesPerCall: 21 }));
const image = {
  attachmentId: "test-image",
  mediaType: "image/png",
  bytes: 10,
  width: 100,
  height: 100,
  name: "测试.png",
};
const validation = {
  code: 200,
  valid: true,
  validationId: "ticket",
  expiresAt: new Date(Date.now() + 600000).toISOString(),
  warnings: [],
  confirmationData: {
    requestId: "request",
    boms: [
      {
        parentInventoryCode: "P001",
        components: [{ inventoryCode: "C001", quantity: 1 }],
      },
    ],
  },
};
const events = [
  {
    seq: 0,
    type: "user/message",
    data: {
      source: { kind: "user" },
      content: [{ type: "image", attachment: image }],
    },
  },
  {
    seq: 1,
    type: "tool/call",
    data: {
      name: "mcp__mom__validate_bom_import_v2",
      callId: "validate",
      arguments: "{}",
    },
  },
  {
    seq: 2,
    type: "tool/result",
    data: {
      message: {
        content: [
          {
            type: "tool-result",
            toolCallId: "validate",
            content: [{ type: "text", text: JSON.stringify(validation) }],
          },
        ],
      },
    },
  },
];
apply(
  {
    effect(callback) {
      callback();
    },
    tools: {
      register(tool) {
        definitions.push(tool);
        return () => {};
      },
    },
    attachments: {
      async readImage(ref) {
        return { ref, data: new Uint8Array() };
      },
    },
    userQuestions: {
      async ask(request) {
        return {
          answers: [
            { id: request.questions[0].id, selected: ["确认创建草稿"] },
          ],
        };
      },
    },
  },
  Config({}),
);
assert.equal(definitions.length, 3);
assert.ok(
  definitions.some((tool) => tool.name === "read_business_document_pages"),
);
const execution = {
  signal: new AbortController().signal,
  agent: { session: { snapshotEvents: () => events } },
};
for (const tool of definitions) {
  const args =
    tool.name === "review_bom_import" ? { validationId: "ticket" } : {};
  const value = await tool.execute(args, execution);
  assert.deepEqual(validateJsonSchemaValue(tool.output.schema, value, ""), []);
  assert.ok(
    tool.output.render(args, value).some((block) => block.type === "text"),
  );
  if (tool.name !== "review_bom_import") {
    assert.ok(
      tool.output
        .render(args, value)
        .some(
          (block) =>
            block.type === "image" &&
            block.attachment.attachmentId === image.attachmentId,
        ),
    );
    await assert.rejects(tool.execute({ pages: ["1"] }, execution));
  } else {
    assert.equal(value.decision, "CONFIRMED");
    assert.equal(
      tool.output.presentationMeta(args, value).review.confirmationData
        .requestId,
      "request",
    );
    await assert.rejects(tool.execute({}, execution));
  }
}
const browser = await readFile(
  new URL("../lib/client.js", import.meta.url),
  "utf8",
);
assert.doesNotMatch(
  browser,
  /require\(["'](?:node:|url["']|fs["']|pdfjs-dist|@napi-rs)/,
);
// 浏览器编译产物的 slot 注册及服务端静态渲染；不打开浏览器或连接 DSH。
const { JSDOM } = await import("jsdom");
const { createElement } = await import("react");
const { renderToStaticMarkup } = await import("react-dom/server");
const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>");
globalThis.document = dom.window.document;
try {
  const entries = [];
  let client;
  // 使用浏览器模块工厂契约运行，不提供 Node 的 module/exports 全局。
  runInNewContext(browser, {
    window: {
      __ModuleLoader__: {
        load(entry) {
          assert.equal(entry.id, "@qihao/dsh-bom-import");
          client = entry.factory(createRequire(import.meta.url));
        },
      },
    },
    document,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
  });
  assert.equal(typeof client.apply, "function");
  client.apply({
    effect(callback) {
      callback();
    },
    slots: {
      inject(_name, callback) {
        callback();
      },
      register(definition, component) {
        entries.push({ definition, component });
        return () => {};
      },
    },
    uiConversation: {
      async imageUrl() {
        return "test-preview-url";
      },
    },
  });
  assert.ok(document.head.textContent.includes(".qh-bom-panel"));
  const composer = entries.find(
    (entry) => entry.definition.name === "conversation.composer",
  );
  const matched = {
    kind: "question",
    key: "question:1",
    sessionId: "session:1",
    questions: [
      {
        id: "qihao-bom-review-v1",
        detail: JSON.stringify({
          kind: "qihao-bom-review",
          version: 1,
          validationId: "ticket",
          expiresAt: validation.expiresAt,
          confirmationData: validation.confirmationData,
          warnings: [],
          sources: [{ sourcePage: 1, fileName: "图纸.png", pageNo: 1, image }],
          sourceLinks: [],
        }),
      },
    ],
    async answer() {},
  };
  assert.equal(
    composer.definition.select({ pendingInteraction: matched }),
    matched,
  );
  assert.equal(
    composer.definition.select({
      pendingInteraction: {
        ...matched,
        questions: [{ id: "another-question" }],
      },
    }),
    null,
  );
  assert.match(
    renderToStaticMarkup(createElement(composer.component, { matched })),
    /核对 BOM/,
  );
  assert.ok(
    entries.some((entry) => entry.definition.key === "review_bom_import"),
  );
} finally {
  delete globalThis.document;
  dom.window.close();
}
console.log(
  "DSH 公共 API / 工具 Schema / 图片结果 / 用户确认结果 / 浏览器依赖检查通过。未启动 DSH 或调用业务服务。",
);
