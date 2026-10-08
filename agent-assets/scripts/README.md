# 企好启动脚本

`web-profile.mjs` 读取当前工作目录下的 `.env`，再通过已构建的 DSH CLI 启动 `web` profile 和企好 patch，不改变 DSH 的启动协议。启动脚本在本仓库维护。

现有目录布局中，从 `C:\Work\Code\AI\deepseek-harness` 执行 `pnpm web qihao-agent` 即可；DSH 的 `package.json` 仅保留一行 `web` 命令指向本脚本。仓库目录关系变化时需调整这一行路径。

不想修改 DSH 的 `package.json` 时，可从 DSH 目录直接运行：

```powershell
node C:\Work\Code\Agent\agent-new\agent-assets\scripts\web-profile.mjs qihao-agent --no-open
```

从其他工作目录启动时，在该目录的 `.env` 中设置 `AGENT_DSH_ROOT` 指向已构建的 DSH 目录，并配置 `AGENT_ASSETS_ROOT`、工具密钥及用户上下文。Linux 同样使用此 Node 脚本，将路径改成实际部署路径。`DSH_HOME` 仍在启动进程前设置，不放进 `.env`。

运行 `node --test agent-assets/scripts/test/*.test.mjs` 检查外部目录启动、`.env`、参数透传和缺少上下文时的拒绝行为。测试使用临时 CLI，不启动实际业务服务。
