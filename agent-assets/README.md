# Agent 运行时资产

这个目录是**随产品交付的智能体资产**：智能体定义、技能、业务工具接线。

## 为什么单独放一个目录

资产必须**独立于 DSH 运行时**：内核升级时直接拉取新版本，资产一行不改。要做到这一点，资产只使用内核的稳定接口，并且不出现在 `$DSH_HOME` 下。

| 层次 | 状态 | 说明 |
|---|---|---|
| 位置独立 | 做到 | 预设根指向本目录；`includeShippedRoot: false` 关掉内核自带预设，`includeUserRoot: false` 关掉 `$DSH_HOME/.agent-presets` |
| 格式独立 | 有条件 | `agent.cordis.yml` 里写的是内核的插件名与 config 字段。DSH 是 pre-stable，上游改名或改字段就会失效——所以每次升级跑一次兼容性检查（见下），失败是立即且指名的 |
| 产品插件独立 | 有条件 | 品牌、附件桥这类自有插件跟随客户端插件 API 走，是真正的耦合点。原则是把数量压到最少 |

## 目录

```
agent-assets/
├── cordis.patch.yml                    覆盖内核装配：预设根指向本目录
├── .env.example
└── agent-presets/
    └── assistant/                      一个智能体 = 一个预设目录，目录名就是 id
        ├── preset.yml                  展示信息（名称 / 描述 / 排序），只给人看
        ├── agent.cordis.yml            能力组合：人格、技能、业务工具、上下文
        └── skills/
            └── purchase-in-stock-create/SKILL.md
```

技能放在**智能体目录内**，随预设整体分发，全仓库只有一份。MVP 的授权模型是"技能随智能体授权"，所以这个位置是对的；等技能需要独立授权时，再由编排服务从技能库里挑选、组装进每个用户的预设目录。

`preset.yml` 里**不能**写 id 或 trust——id 就是目录名，trust 来自根目录。

## 本地跑起来

```powershell
# 1. 环境变量。DSH_HOME 必须在启动进程前设置，不能写进 .env。
$env:DSH_HOME = "$PWD\_runtime\dsh-home"
$env:AGENT_ASSETS_ROOT = "$PWD\agent-assets\agent-presets"
$env:AGENT_MCP_URL = "http://localhost:8090/api/v1/agent/mcp"
$env:AGENT_MCP_TOOL_KEY = "<向后端要>"
$env:AGENT_MCP_CONTEXT_ID = "<本次会话的上下文标识>"

# 2. 先验证装配能不能起来。这一步同时就是内核兼容性检查。
dsh --profile web --dump-config --patch "$PWD\agent-assets\cordis.patch.yml"

# 3. 起服务
dsh web --patch "$PWD\agent-assets\cordis.patch.yml"
```

`_runtime/` 是运行时数据（会话、设置、凭据、附件），已经在 `.gitignore` 里，不算资产。

## 升级 DSH 内核时

**资产不动。** 跑一次：

```powershell
dsh --profile web --dump-config --patch <本目录>\cordis.patch.yml
```

它会在启动前解析每个插件的包名、按各插件的 Config schema 校验字段、解析预设根目录并确认 `default` 指向的预设存在。任何一项不满足都**直接失败并指名**，不会静默降级。照着报错改一处即可。

这是"内核可以直接拉取"这句话的兑现方式：不是"应该没事"，是"不兼容就起不来"。

## 待办

1. **二维码 / 条码通路**：技能里目前没有，请用户直接给编码原文。补齐需要把 `qihao-attachment-bridge` 重做成独立插件包（提供 `upload_agent_image`，把 DSH 附件上传成短期 imageId，再由 MCP 的 `decode_image_code` 解码），约 120 行。**插件怎么随产品分发**（profile 依赖走私有 registry，还是 `file:` 链接）也还没定。
2. **文档输入通路**：用户上传 `.xlsx` / `.docx` 时，当前没有把文档正文交给模型的通路。三条可选路线：① 挂回 `tool-fs`（但会连 write / edit 一起挂上，没有只读开关）；② 门户侧提取正文再注入本轮上下文；③ 用 DSH 的 office 技能。**未定。**
3. **凭据口径**：现在是全局静态密钥加每会话上下文。目标是每用户短期令牌，由编排服务拉起实例时注入。后端的行级数据权限目前对 MCP 工具完全没生效，这一条要先在后端补。

## 维护约定

- 改 `agent.cordis.yml` 就是改"这个智能体能做什么"，改完跑一次上面的 `--dump-config`。
- 一行一个能力，**每一行都要有理由**。不要从内核的 `standard` 预设整份拷贝——那份是编码 agent，带着 bash、文件读写、子代理、工作流，面向业务用户是事故面。
- 技能名写在 `SKILL.md` 的 frontmatter 里，与目录名无关；但目录名保持同名，便于人找。
- `description` 是**模型看的**路由文本，要写清"什么时候用、什么时候不用"；`whenToUse` 是**人看的**，不进模型目录。
