import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

test("built browser plugin uses official slots, the supplied logo and Qihao name", async () => {
  let plugin;
  runInNewContext(await readFile(new URL("../lib/client.js", import.meta.url), "utf8"), {
    window: { __ModuleLoader__: { load(entry) {
      assert.equal(entry.id, "@qihao/dsh-brand");
      plugin = entry.factory((name) => { assert.equal(name, "react"); return React; });
    } } },
  });
  const entries = new Map();
  const disposers = [];
  let dictionaries;
  const ctx = {
    locale: { register(_name, value) { dictionaries = value; return () => { dictionaries = undefined; }; } },
    effect(callback) { disposers.push(callback()); },
    slots: {
      inject(_name, callback) {
        const result = callback();
        if (result?.next) { for (const dispose of result) { disposers.push(dispose); } }
      },
      register({ name }, component) { entries.set(name, component); return () => entries.delete(name); },
    },
  };
  plugin.apply(ctx);
  assert.deepEqual([...entries.keys()], ["sidebar.brand.mark", "sidebar.brand.name", "conversation.hero.brand.mark"]);
  const logo = await readFile(new URL("../src/logo.png", import.meta.url));
  const html = renderToStaticMarkup(React.createElement(entries.get("sidebar.brand.mark"), { size: 26 }));
  assert.ok(html.includes(`data:image/png;base64,${logo.toString("base64")}`));
  assert.ok(html.includes('height="26"'));
  assert.equal(renderToStaticMarkup(React.createElement(entries.get("sidebar.brand.name"), {
    t: (key) => dictionaries.zh[key],
  })), '<span style="white-space:nowrap;font-weight:600">企好AI</span>');
  for (const dispose of disposers.reverse()) { dispose(); }
  assert.equal(entries.size, 0);
  assert.equal(dictionaries, undefined);
});
