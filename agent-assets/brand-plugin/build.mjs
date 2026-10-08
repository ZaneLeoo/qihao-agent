import { build } from "esbuild";
import { writeFile } from "node:fs/promises";

await build({ entryPoints: ["src/index.js"], outfile: "lib/index.js", platform: "node", format: "esm" });
const browser = await build({
  entryPoints: ["src/client.js"], outfile: "lib/client.js", write: false,
  bundle: true, platform: "browser", format: "cjs", target: "es2022",
  external: ["react"], loader: { ".png": "dataurl" },
});
await writeFile("lib/client.js",
  `window.__ModuleLoader__.load({id:"@qihao/dsh-brand",factory:(require)=>{\nconst module={exports:{}}; const exports=module.exports;\n${browser.outputFiles[0].text}\nreturn module.exports;\n}});\n`);
