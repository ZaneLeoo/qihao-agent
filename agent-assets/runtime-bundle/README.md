# 企好运行时 Bundle

这个 bundle 为企好业务智能体增加两项受控能力：从本轮图片上传后取得短期 `imageId`，以及只读解析 XLSX、DOCX、文本型 PDF 和文本文件。

`dsh-files` 固定到 [dsh-files.pinned.json](dsh-files.pinned.json) 中的上游提交 `a814c7b89b0800870d3404d7b51362e9914a8092`。它只注册 `read_document`；本 bundle 不提供通用文件系统、Shell 或写文件工具。附件桥在 `assistant` preset 内注册，因为只有该 agent scope 提供附件存储服务。

在 DSH 已安装并可执行的机器上，从本目录运行：

```powershell
.\scripts\install.ps1 -Profile web -DshCommand dsh
```

该脚本将固定提交的 `dsh-files` 作为 profile 顶层依赖安装，再从本目录安装当前 bundle。DSH 的供应链策略禁止 Git 子依赖，因此两个包必须都是顶层依赖；运行时不依赖资产目录内的 `node_modules`。重启 DSH 后生效。部署必须设置 `AGENT_MCP_TOOL_KEY`、`AGENT_MCP_CONTEXT_ID`，可选 `AGENT_IMAGE_UPLOAD_URL`。

包体的**真实路径必须落在 profile 目录内**：DSH 的 profile 解析只为位于 profile 目录内的模块转发裸包名，本 bundle 依赖的 `@deepseek-ai/schemastery`、`@deepseek-ai/dsh-tools` 都由宿主从安装锚点转发，指向本目录的 `link:`、`file:` 或 junction 会让真实路径解析到 profile 之外，import 阶段直接失败 —— 表现为 preset 挂载报 `qihao-attachment-bridge ... never started`、新建会话报错。

安装脚本因此先把包体镜像到 `<profile>/vendor/dsh-runtime-bundle`，再 `link:` 这个 profile 内的镜像；真实路径留在 profile 内，之后任何 `dsh plugin add <包>` 重新链接都仍然成立。装完还会校验实际落点，落在 profile 外就替换成实体副本。

二维码/条码桥只接受当前用户消息中的 PNG 或 JPEG 图片。它返回的 `imageId` 只可在同一业务上下文中被 `mcp__mom__decode_image_code` 使用。
