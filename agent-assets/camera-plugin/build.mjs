import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';

await build({ entryPoints: ['src/index.ts'], outfile: 'lib/index.js', platform: 'node', format: 'esm' });
const client = await build({
  entryPoints: ['src/client.ts'], outfile: 'lib/client.js', write: false,
  bundle: true, platform: 'browser', format: 'cjs', target: 'es2022', jsx: 'automatic',
  external: ['react', 'react/*', '@deepseek-ai/*'],
  plugins: [{
    name: 'qihao-camera-css',
    setup(builder) {
      builder.onLoad({ filter: /\.module\.css$/ }, async ({ path }) => {
        const css = await readFile(path, 'utf8');
        const classes = Object.fromEntries([...css.matchAll(/\.([a-zA-Z][\w-]*)/g)]
          .map(([_, name]) => [name, `qh-camera-${name}`]));
        const scoped = css.replace(/\.([a-zA-Z][\w-]*)/g, (_, name) => `.${classes[name]}`);
        return { contents: `export const text=${JSON.stringify(scoped)}; export default ${JSON.stringify(classes)};`, loader: 'js' };
      });
    },
  }],
});
await writeFile('lib/client.js',
  `window.__ModuleLoader__.load({id:"@qihao/dsh-camera",factory:(require)=>{\nconst module={exports:{}}; const exports=module.exports;\n${client.outputFiles[0].text}\nreturn module.exports;\n}});\n`);
