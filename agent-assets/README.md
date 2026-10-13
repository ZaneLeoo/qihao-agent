# Agent 运行时资产

这个目录是**随产品交付的智能体资产**：智能体定义、技能、业务工具接线。

## 为什么单独放一个目录

资产源码独立于 DSH 运行时，通过公开插件接口接入。升级 DSH 后仍需验证插件接口和用户流程，接口变化时适配资产；安装副本放在 profile 内，源码继续由本仓库管理。

| 层次 | 状态 | 说明 |
|---|---|---|
| 位置独立 | 做到 | 预设根指向本目录；`includeShippedRoot: false` 关掉内核自带预设，`includeUserRoot: false` 关掉 `$DSH_HOME/.agent-presets` |
| 格式独立 | 有条件 | `agent.cordis.yml` 里写的是内核的插件名与 config 字段。DSH 是 pre-stable，上游改名或改字段就会失效——所以每次升级按下面三步验证，不兼容都会指名到行与字段 |
| 产品插件独立 | 有条件 | 品牌、附件桥这类自有插件跟随客户端插件 API 走，是真正的耦合点。原则是把数量压到最少 |

## 目录

```
agent-assets/
├── cordis.patch.yml                    覆盖内核装配：预设根指向本目录
├── .env.example
├── runtime-bundle/                     受控附件桥与只读文档解析的可安装 bundle
├── brand-plugin/                       原图 QH Logo 与企好AI侧栏名称
├── camera-plugin/                      摄像头设备选择、预览与拍照
├── bom-import-plugin/                  图纸分页读取、BOM 确认表单与本批依赖树
├── scripts/                            企好启动脚本及测试
└── agent-presets/
    └── assistant/                      一个智能体 = 一个预设目录，目录名就是 id
        ├── preset.yml                  展示信息（名称 / 描述 / 排序），只给人看
        ├── agent.cordis.yml            能力组合：人格、技能、业务工具、上下文
        └── skills/
            └── purchase-in-stock-create/SKILL.md
```

技能放在**智能体目录内**，随预设整体分发，全仓库只有一份。MVP 的授权模型是"技能随智能体授权"，所以这个位置是对的；等技能需要独立授权时，再由编排服务从技能库里挑选、组装进每个用户的预设目录。

`preset.yml` 里**不能**写 id 或 trust——id 就是目录名，trust 来自根目录。

## 安装业务运行时能力

首次部署或更换 `DSH_HOME` 后，在 `runtime-bundle/` 目录执行 `scripts/install.ps1`。它把 `@qihao/dsh-runtime-bundle` 安装到目标 profile；bundle 固定 `dsh-files` 的审计提交，提供 `upload_agent_image` 和只读 `read_document`，不增加通用文件系统、Shell 或写入能力。

品牌由 `brand-plugin/` 独立提供，先在该目录执行 `npm ci --legacy-peer-deps`、`npm test`，安装脚本会一起安装。侧栏显示原始 QH Logo 和“企好AI”。首屏标题“企好AI智能助手”、隐藏预览徽标和移除首次进入的内测声明保留为 DSH 源码改动，升级时须保留；浏览器元信息使用 DSH 默认值。

摄像头由 `camera-plugin/` 提供，先执行 `npm ci --legacy-peer-deps`、`npm run check`，安装脚本会一起安装。DSH 仅保留 `conversation.input.camera` 插槽、禁用状态和附件回调，摄像头组件、样式、文案和设备处理逻辑均在本仓库。输入栏权限按钮恢复 DSH 默认位置。

BOM 插件需先在 `bom-import-plugin/` 执行 `npm ci --legacy-peer-deps`、`npm run check`；上面的安装脚本会一起镜像并安装它。Linux 的 BOM 插件安装入口为 `node scripts/install.mjs`，详见 [插件说明](bom-import-plugin/README.md)。安装后才可挂载新增的 `bom-import` 行；不要把源码目录直接 link 到 profile 外。

`bom-drawing-import` 负责“页面识别 → 主数据核对 → 整批校验 → 只读确认 → 草稿创建”。表格、依赖树与原图预览使用真实 `confirmationData`；返回修改后须重新校验。PDF 默认单次 8 页，由 `agent.cordis.yml` 的 `maxPagesPerCall` 控制，不是 PDF 总页数限制。MCP 接入需指向 `/api/v1/agent/mcp2`，沿用 `mom` 命名空间。

`quality-inventory-test-create` 负责产品实验单的图片/文档识别、三级记录整理、校验、确认和创建。产品及方案按资料原文记录，不强制匹配档案；同一产品的多次实验各有自己的检测孙表。扫描PDF使用 `read_business_document_pages`，复用BOM插件的受控页面渲染。后端需提供 `validate_quality_inventory_test_create_v2`、`create_quality_inventory_test_v2`、`query_quality_inventory_test_write_result_v2`。字段规则和确认流程见 [产品实验单 Skill](agent-presets/assistant/skills/quality-inventory-test-create/SKILL.md)。

```powershell
.\agent-assets\runtime-bundle\scripts\install.ps1 -Profile web -DshRoot C:\Work\Code\AI\deepseek-harness
```

二维码/条码桥只会读取当前用户消息中的 PNG/JPEG 图片。图片上传和后续 `decode_image_code` 都绑定 `AGENT_MCP_CONTEXT_ID`，不能跨业务上下文复用。

## 本地跑起来

```powershell
# 1. 将本目录的 .env.example 复制为 deepseek-harness 根目录的 .env，填写工具密钥和有效的临时上下文 ID。
Copy-Item .\agent-assets\.env.example .\.env

# 2. 从 deepseek-harness 根目录启动构建产物。
pnpm web qihao-agent
```

`AGENT_MCP_CONTEXT_ID` 是 MOM 后端签发的短期值，联调时可以写在 `.env`；它过期后换一个值再重启即可。上线后由登录会话自动注入，不能把不同用户共用的固定值作为正式方案。

启动实现位于 `scripts/web-profile.mjs`。DSH 的 `package.json` 仅保留一行快捷命令；从其他目录或 Linux 启动的方法见 [启动说明](scripts/README.md)。升级 DSH 时须检查首屏定制、内测声明移除、摄像头插槽与这行命令，其余企好插件由本仓库管理。

首次用一个新的 `DSH_HOME` 时，profile 会在第一次启动时初始化（要联网装依赖），会比较久。控制台出现任何 `did not activate` 都要当成配置错误处理，别忽略。

### 开发期不要用 `pnpm dsh`（源码直启）

`pnpm dsh` 走 `node --import tsx/esm apps/cli/src/bin.ts`，实测**一调用工具就崩**：

```
本轮运行失败  Cannot read properties of undefined (reading 'prepare')
```

原因是模块图被切成两份。`TOOL_RUNTIME_SCHEDULER` 是模块级 `unique symbol`（`packages/core/tools/src/index.ts:463`），`ctx.tools[TOOL_RUNTIME_SCHEDULER].prepare(...)` 靠对象同一性取调度器；而源码直启下，tsx 按 `tsconfig.base.json:484` 的 paths 把静态 import 解析到 `src`，Loader 按包名解析插件行却落到 `lib`，同一个包被加载两次，symbol 不相等——取值 `undefined`，`.prepare` 就炸。

对照验证过：同一个 patch、同一个预设，`node apps/cli/lib/bin.js` 起的实例工具调用正常，`pnpm dsh` 起的必崩。**这是 DSH 源码直启的问题，与本目录的资产无关**，也不影响交付（交付跑的就是构建产物）。

`_runtime/` 是运行时数据（会话、设置、凭据、附件），已经在 `.gitignore` 里，不算资产。

## 升级 DSH 内核时

**资产不动。** 验证分三步，强度递增，各自能查出不同的东西：

**1. patch 语法与叠加顺序**

```powershell
dsh --profile web --dump-config --patch <本目录>\cordis.patch.yml
```

只验证 patch 文件本身能解析、能叠到 profile 上。注意它**不执行 `!!js` 表达式、不解析插件名、不校验 config 字段**——输出里那些表达式是原文打印，不是求值结果。别把它当成兼容性检查。

**2. 真实启动**

```powershell
dsh --profile web --patch <本目录>\cordis.patch.yml --port 3099
```

`!!js` 在这一步才执行，每一行按各自的 Config schema 校验。预设根不存在会立刻打印一条指名到行的错误：

```
dsh: warning: 1 entry did not activate
agent-presets (@deepseek-ai/dsh-agent-presets): Error: agent-assets: preset root not found: ...
```

注意它的强度：**是启动瞬间的显式报错，不是启动失败**——这一行不激活，服务照起，预设不可用。

**3. 预设组合（只在建会话时发生）**

`agent.cordis.yml` 要等会话挂载预设才加载。界面上新建会话、选「企好Agent」即可。插件名解析不到时会指名到行：

```
row "persona" names a plugin that cannot be resolved: @deepseek-ai/dsh-personaa
```

这是"内核可以直接拉取"的兑现方式：不兼容不会静默——第 2 步报在控制台，第 3 步报在会话上，都指到具体的行和字段。

## 待办

**凭据口径**：现在是全局静态密钥加每会话上下文。目标是每用户短期令牌，由编排服务拉起实例时注入。后端的行级数据权限目前对 MCP 工具完全没生效，这一条要先在后端补。

## 写技能时的检查清单

技能的核心不是"表单有哪些字段"，而是**划清责任边界**——也就是服务端管不了的那部分行为约束。写每一条规则前先问：

> **这条如果不在技能里写，服务端能不能强制？**
> - 能强制 → 写进后端，技能里的字段越少越好
> - 不能强制 → 必须写进技能。这就是技能的全部价值

按这条判据，技能里真正不可替代的是四块：

1. **路由** —— 什么时候用、什么时候不用（写在 `description` 里）
2. **顺序与闸门** —— 先做什么后做什么、什么条件下**不许**做。尤其"用户确认"这一层：服务端根本看不见用户点没点头，**只能靠技能约束**
3. **语义映射** —— 把问题码翻译成人话。服务端只知道码，不知道用户是谁；主数据类问题还要说明**去哪儿补**
4. **能力边界的如实声明** —— 做不到就直说，否则模型会编

**"什么不用问"比"什么必须问"更重要**：多问一轮体验差，模型自己填则是编造数据。所以"必要信息"那一节的正确写法，是把**可省略字段逐个列出来并写明由服务端补**——这是在告诉模型"这几件事不归你管，别问、别猜"。

两个现成例子：[purchase-in-stock-create](agent-presets/assistant/skills/purchase-in-stock-create/SKILL.md)、[production-order-create](agent-presets/assistant/skills/production-order-create/SKILL.md)。

## 维护约定

- 改 `agent.cordis.yml` 就是改"这个智能体能做什么"，改完跑一次上面的 `--dump-config`。
- 一行一个能力，**每一行都要有理由**。不要从内核的 `standard` 预设整份拷贝——那份是编码 agent，带着 bash、文件读写、子代理、工作流，面向业务用户是事故面。
- 技能名写在 `SKILL.md` 的 frontmatter 里，与目录名无关；但目录名保持同名，便于人找。
- `description` 是**模型看的**路由文本，要写清"什么时候用、什么时候不用"；`whenToUse` 是**人看的**，不进模型目录。
