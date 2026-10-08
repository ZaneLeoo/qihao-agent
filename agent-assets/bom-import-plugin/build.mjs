import { build } from "esbuild";
import { readFile, writeFile } from "node:fs/promises";

await build({
  entryPoints: { index: "src/ui-host.ts", tools: "src/index.ts" },
  outdir: "lib",
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  target: "node22",
});
// DSH 的浏览器模块表提供 React 和客户端服务，不能打入另一份运行时。
const client = await build({
  entryPoints: ["src/client/index.tsx"],
  outfile: "lib/client.js",
  write: false,
  bundle: true,
  platform: "browser",
  format: "cjs",
  target: "es2022",
  jsx: "automatic",
  external: ["react", "react/*", "@deepseek-ai/*"],
  plugins: [
    {
      name: "qihao-css",
      setup(build) {
        build.onLoad({ filter: /\.module\.css$/ }, async ({ path }) => {
          const css = await readFile(path, "utf8");
          const names = [...css.matchAll(/\.([a-zA-Z][\w-]*)/g)].map(
            (match) => match[1],
          );
          const classes = Object.fromEntries(
            names.map((name) => [name, `qh-bom-${name}`]),
          );
          const scoped = css.replace(
            /\.([a-zA-Z][\w-]*)/g,
            (_, name) => `.${classes[name]}`,
          );
          return {
            contents: `export const text = ${JSON.stringify(scoped)}; export default ${JSON.stringify(classes)};`,
            loader: "js",
          };
        });
      },
    },
  ],
});
// DSH 加载的是模块工厂脚本，不能直接在浏览器顶层执行 CommonJS。
await writeFile(
  "lib/client.js",
  `window.__ModuleLoader__.load({id:"@qihao/dsh-bom-import",factory:(require)=>{\nconst module={exports:{}}; const exports=module.exports;\n${client.outputFiles[0].text}\nreturn module.exports;\n}});\n`,
);
