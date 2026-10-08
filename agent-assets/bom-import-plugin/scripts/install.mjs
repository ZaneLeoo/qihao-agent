import { cp, mkdir, access } from "node:fs/promises";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { spawnSync } from "node:child_process";

// Linux 单插件安装入口；不会启动 DSH 或调用业务 MCP。Windows 使用现有 install.ps1。
if (process.platform === "win32") {
  throw new Error("Windows 请使用 runtime-bundle/scripts/install.ps1。");
}
const options = new Map();
for (let i = 2; i < process.argv.length; i += 2) {
  if (
    !["--profile", "--dsh-home", "--dsh-root"].includes(process.argv[i]) ||
    !process.argv[i + 1]
  ) {
    throw new Error(
      "用法：node scripts/install.mjs [--profile web] [--dsh-home 目录] [--dsh-root DSH源码目录]",
    );
  }
  options.set(process.argv[i], process.argv[i + 1]);
}
const profile = options.get("--profile") ?? "web";
if (!/^[A-Za-z0-9_-]+$/.test(profile)) {
  throw new Error("profile 名称无效。");
}
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const profileDir = resolve(
  options.get("--dsh-home") ?? process.env.DSH_HOME ?? join(homedir(), ".dsh"),
  "profiles",
  profile,
);
const stage = join(profileDir, "vendor", "qihao-bom-import");
await access(join(root, "lib", "index.js"));
await access(join(root, "lib", "tools.js"));
await access(join(root, "lib", "client.js"));
await mkdir(stage, { recursive: true });
for (const file of ["package.json", "package-lock.json", "README.md", "lib"]) {
  await cp(join(root, file), join(stage, file), {
    recursive: true,
    force: true,
  });
}
function run(command, args, cwd = stage) {
  const result = spawnSync(command, args, { cwd, stdio: "inherit" });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${command} 执行失败。`);
  }
}
// peer 服务必须来自宿主；平台 Canvas 二进制则必须安装在镜像包内。
run("npm", ["ci", "--omit=dev", "--legacy-peer-deps"]);
const dshRoot = options.get("--dsh-root");
const command = dshRoot ? process.execPath : "dsh";
const prefix = dshRoot
  ? [join(resolve(dshRoot), "apps", "cli", "lib", "bin.js")]
  : [];
run(
  command,
  [
    ...prefix,
    "plugin",
    "--profile",
    profile,
    "config",
    "set",
    "auto-install-peers",
    "false",
    "--location",
    "project",
  ],
  profileDir,
);
run(
  command,
  [...prefix, "plugin", "--profile", profile, "add", `link:${stage}`],
  profileDir,
);
console.log(`已安装 BOM 插件到 ${stage}。请重启 DSH，再测试企好 preset。`);
