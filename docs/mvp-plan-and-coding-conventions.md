# MVP 计划与编码规范

> 目标读者：本项目全体开发。
> 形态范围：**只做服务端形态**（门户 + 每用户 dsh 实例 + 控制面 + 业务工具 + 知识库暂缓）。桌面端、移动端、多租户一律不在本期。

---

## 一、范围

### 本期做

| 能力 | 说明 |
|---|---|
| 登录与组织 | 本地账号 + 组织树 + 角色（暂不与 MOM 平台同步，表结构预留） |
| 智能体管理 | 智能体定义：名称、提示词模板、挂哪些技能、能用哪些业务工具、默认模型 |
| 权限 | 组织/角色/用户 → 可用的智能体；技能与提示词随智能体授权 |
| 门户 | 登录、每用户实例路由、HTTP + WebSocket 反向代理、空闲回收 |
| 运行时物化 | 按授权生成该用户的能力目录，拉起专属 dsh 实例 |
| 业务工具 | 1–2 个只读工具，接入现有 MCP server，改成"按用户令牌鉴权" |
| 会话入库 | tail 会话日志 → 消息/工具调用/用量落库 |
| 用量 | 按用户 / 智能体 / 模型统计 token |
| 管理后台 | 组织人员页、智能体编辑页、授权页、用量看板 |

### 本期不做（明确排期之外）

- 桌面端打包（客户机本地运行）
- 移动端
- RAG 知识库（先用"把 FAQ/制度文档做成技能"顶上）
- 写操作与人工审批（只读先上）
- 多租户（表结构预留 `tenant_id`，逻辑不实现）
- 配额硬拦截（先只统计不拦，避免误伤）
- 文档级权限
- 自定义 DSH 客户端 UI（用原生 GUI）

### MVP 成功的标准

> 一个真实用户在浏览器登录 → 只看到他有权用的智能体 → 对话 → 调到一个真实业务工具查到真实数据 → 流式返回 → 聊天记录落库 → 管理员在后台看到用量。

---

## 二、里程碑

每个里程碑都有**可验证的验收标准**；验收不过不进入下一个。

### M0 工程底座（3–5 天）

**交付物**

- 仓库与目录结构
- 前后端骨架各能独立跑起来（后端一个 `/healthz`，前端一个空管理页）
- 格式化 + 静态检查 + 提交前钩子全部生效
- README：怎么起服务、怎么跑检查

**验收标准**

- 新人 clone 下来，照 README 三条命令能跑起来
- 故意提交一段格式错误的代码，`git commit` 被钩子拦下
- `mvn verify` 与前端 `npm run check` 均通过

### M1 门户链路跑通（1–2 周）★ 技术风险最高，先做

**交付物**

- 简易登录（用户名即可，不做密码校验）
- 每用户按需拉起 `dsh web` 实例：分配端口、抓启动 token、换取并持有 cookie
- HTTP 反向代理（含流式响应）
- WebSocket 反向代理（`/api/remote.mux`）
- 空闲回收 + 进程树清理
- 预置工作区：拉起前建目录，配套 DSH 插件在 boot 时注册

**验收标准**

- 用户 A 与用户 B 同时登录，**各自只看到自己的会话**（这是隔离的硬指标）
- 用户 A 能正常对话，流式输出逐字出现
- 杀掉用户 A 的实例后，A 再次操作能自动恢复，会话不丢
- 空闲超时后进程确实退出（任务管理器/`ps` 确认无残留）

### M2 控制面与权限（2–3 周）

**交付物**

- 表：组织、人员、角色、用户角色、智能体定义、技能、提示词模板、授权
- 组织/人员/角色/智能体的增删改查 API
- 授权 API + **授权快照**计算
- 物化：快照 → 该用户的能力目录（预设 + 技能 + 提示词）
- 策略插件：会话创建时按快照限制工具白名单
- 管理后台：组织人员页、智能体编辑页、授权页

**验收标准**

- 给"生产部"授权智能体 A、B，"采购部"授权智能体 C
- 生产部用户登录后**界面上只能看到 A、B**；采购部用户只能看到 C
- 在智能体 A 里让模型尝试调用未授权的工具 → **模型根本看不到该工具**（不是调用被拒，是工具列表里没有）
- 改动授权后，该用户重新进入即生效（新实例/重载配置）

### M3 业务工具接入（1–2 周）

**交付物**

- 业务工具服务层身份改造：`X-Agent-Tool-Key`（每 agent 一个密钥）→ 每用户短期令牌
- 令牌解析后接入现有安全上下文，让行级数据权限生效
- 首批 1–2 个只读工具端到端打通
- 工具清单导出为"可授权单元"，供控制面勾选

**验收标准**

- 用户问"查一下 1 号线的工单" → 返回真实数据
- 换一个只有 2 号线权限的用户问同样的问题 → **查不到 1 号线的数据**（数据权限生效，不是提示词约束）
- 工具调用写入审计表

### M4 会话入库与用量（1–2 周）

**交付物**

- 会话日志 tail 管道 → 消息表、工具调用表
- 用量汇总：按用户 / 智能体 / 模型 / 天
- 管理后台：会话查询页、用量看板

**验收标准**

- 一次完整对话后，管理后台能查到这条会话和它的消息、工具调用
- 用量数字与模型返回的 token 数一致
- 用量按智能体和模型能分别汇总

### M5 打磨与交付（1 周）

**交付物**

- 统一异常与错误提示
- 结构化日志 + 关键路径日志
- 部署脚本 / Docker Compose（后端 + MySQL + DSH 运行时）
- 运维手册：怎么起停、怎么看日志、怎么升级 DSH 版本

**验收标准**

- 全新机器上按手册能部署起来并跑通 MVP 成功标准

---

## 三、编码规范

### 3.1 通用约定

**提交信息**（Conventional Commits）

```
feat: 支持按组织授权智能体
fix: 修复空闲回收时进程树未清理
docs: 补充部署手册
refactor: 抽出授权快照计算
test: 补充物化逻辑单测
chore: 升级 Spring Boot 到 3.3.6
```

**分支**

- `main` 保持可运行
- 功能分支 `feat/xxx`，修复分支 `fix/xxx`
- 合并前必须过全部检查

**提交前必须通过**（由钩子强制，不靠自觉）

1. 代码格式化
2. 静态检查（lint）
3. 编译/构建
4. 单元测试

**铁律**

- **密钥绝不入库**。数据库密码、模型 API Key 走环境变量或配置中心，配置文件里只放占位
- **不在日志里打印密钥、令牌、用户敏感数据**
- **接口先定契约再写实现**（见 3.4）
- **不为不可能发生的输入写防御代码**（内部调用之间不做重复校验），但**外部输入必须校验**：HTTP 入参、模型/工具返回的 JSON、数据库读出的脏数据

### 3.2 后端规范

**技术栈**

| 项 | 选型 |
|---|---|
| 语言/框架 | Java 17 + Spring Boot 3.3.x |
| 构建 | Maven |
| 持久层 | MyBatis-Plus |
| 数据库 | MySQL 8 |
| 校验 | Jakarta Validation（`@Valid` + 注解） |
| 接口文档 | springdoc-openapi v2（Swagger UI） |
| 测试 | JUnit 5 + Mockito + Spring Boot Test |

**格式化与检查**

| 项 | 工具 | 说明 |
|---|---|---|
| 代码格式化 | **Spotless + palantir-java-format** | `mvn spotless:apply` 一键格式化；构建时校验 |
| 静态检查 | Checkstyle（P3C 风格规则集） | 命名、魔法值、异常处理 |
| 空值与缺陷 | SpotBugs（可选，接得进就接） | 先不阻断构建，只报告 |

**分层与命名**（沿用你们现有项目的习惯，降低上手成本）

```
controller/    HTTP 入参出参、参数校验，不写业务逻辑
service/       业务逻辑，接口 + impl
mapper/        数据库访问（MyBatis-Plus）
entity/        与表一一对应的实体
dto/           request/response 分开，不直接把 entity 当返回值
config/        配置类
support/       工具类、常量
```

- 类名：`AgentDefinitionController` / `AgentDefinitionService` / `AgentDefinitionServiceImpl`
- 表名：小写下划线 + 前缀（如 `ap_agent_def`，`ap_` = agent platform，避免与 MOM 的 `sysr_` 撞）
- 每个类必须有 Javadoc 说明职责；每个 public 方法说明参数与返回

**统一返回体**（沿用你们现有的 `ResultBean` 风格）

```java
public record ApiResult<T>(int code, String message, T data) {
    public static <T> ApiResult<T> ok(T data) { ... }
    public static <T> ApiResult<T> error(int code, String message) { ... }
}
```

**异常**

- 业务异常 `BizException(code, message)`；全局处理器统一转成 `ApiResult`
- 未知异常一律记日志（含堆栈）后返回通用错误，**不把堆栈返回给前端**

**日志**

- SLF4J，禁止 `System.out`
- 关键路径必须记：实例拉起/回收、授权变更、工具调用、模型调用失败
- 用占位符 `log.info("拉起实例 user={} port={}", userId, port)`，不要字符串拼接

**测试**

- service 层业务逻辑必须有单测
- 关键路径（物化、授权计算、代理路由）必须有测试
- 不追求覆盖率数字，追求"改坏了会被测出来"

### 3.3 前端规范

**技术栈**

| 项 | 选型 |
|---|---|
| 框架 | React 18 + TypeScript + Vite |
| UI | Ant Design 5 |
| 服务端状态 | TanStack Query（请求缓存、重试、失效） |
| 客户端状态 | Zustand（只放跨组件的 UI 状态） |
| 路由 | React Router 6 |
| 请求 | Axios（统一封装在 `api/` 层） |
| 测试 | Vitest + React Testing Library |

**格式化与检查**

| 项 | 工具 |
|---|---|
| 格式化 | Prettier |
| 静态检查 | ESLint（flat config）+ `typescript-eslint` + `eslint-plugin-react-hooks` |
| 类型检查 | `tsc --noEmit` |
| 提交前 | husky + lint-staged |

**目录结构**

```
src/
  api/         接口定义，按后端模块分文件
  pages/       页面（路由级组件）
  components/  可复用组件
  hooks/       自定义 hook
  stores/      Zustand store
  router/      路由
  types/       类型定义（含从 OpenAPI 生成的 api.d.ts）
  utils/       工具函数
```

**约定**

- 组件文件 PascalCase（`AgentEditor.tsx`），hook 用 `useXxx.ts`
- 页面放 `pages/`，可复用组件放 `components/`
- **不在组件里直接写 axios**，一律走 `api/` 层
- **服务端数据一律走 TanStack Query**，不要用 `useEffect` 手工拉取和缓存
- 统一请求拦截器处理：加令牌、统一错误提示、401 跳登录
- 不写 `any`；实在需要时写明原因
- **不用 `index.tsx` 做桶文件导出**，按需直接引用，避免循环依赖

### 3.4 接口契约（这条能省掉大量返工）

**后端用 springdoc 生成 OpenAPI，前端用 `openapi-typescript` 生成 TS 类型。**

好处：后端改了字段，前端 `npm run gen:api` 之后**类型检查就会报错**，不会等到联调才发现。

流程：

1. 后端写完接口 → 启动服务 → 访问 `/v3/api-docs`
2. 前端执行 `npm run gen:api` → 生成 `src/types/api.d.ts`
3. 前端基于生成的类型写 `api/` 层

**约定**：字段名用 camelCase，两边一致；时间统一用 ISO 8601 字符串；金额不用浮点。

---

## 四、脚手架要包含的东西（M0 的验收内容）

**后端**

- [ ] `pom.xml`：依赖 + Spotless + Checkstyle 插件
- [ ] `.editorconfig`（统一缩进、换行、编码）
- [ ] `checkstyle.xml`
- [ ] 目录骨架 + 一个 `/healthz` 接口
- [ ] 统一返回体与全局异常处理器
- [ ] `README.md`：怎么跑、怎么格式化、怎么测试

**前端**

- [ ] `package.json`：Vue 3 + TS + Vite + Element Plus + Pinia + ESLint + Prettier
- [ ] `.editorconfig`、`.prettierrc`、`eslint.config.js`
- [ ] 目录骨架 + 登录页 + 一个空管理页
- [ ] Axios 封装 + 路由守卫
- [ ] `README.md`

**仓库**

- [ ] `.gitignore`（Java + Node + IDE）
- [ ] `.gitattributes`（统一换行符，避免 Windows/Linux 差异）
- [ ] `CONTRIBUTING.md`（就是本文档的第三、四节）
- [ ] 提交前钩子（后端可用 git hook 或 Maven 插件；前端 husky）

---

## 五、需要你们确认的选择

| # | 问题 | 建议 | 影响 |
|---|---|---|---|
| 1 | 管理后台用 Vue 3 还是 React + TS？ | **Vue 3**（团队熟、有 Element 系积累） | 将来要定制 DSH GUI 才需要 React，那是另一件事 |
| 2 | Spring Boot 3.3.x 还是 4.x？ | **3.3.x**（生态稳、资料多） | 你本地仓库里有 4.x，如果 MOM 那边已在用 4，统一到 4 也合理 |
| 3 | 用不用 Lombok？ | **用，但限制**：`@Slf4j`/`@RequiredArgsConstructor` 可以；实体类不用 `@Data`（equals/hashCode 有坑） | 影响所有人日常写法 |
| 4 | 项目名与位置 | `C:\Work\Code\Agent\agent-platform`，后端 `backend/`、前端 `admin-web/` | 定了就不改 |
| 5 | 仓库放哪 | 本地 `git init`，remote 推你们自建 Git | 不影响开发 |
| 6 | 投入几个人、全职还是兼职？ | — | 决定上面工期是"周"还是"月" |
| 7 | MVP 里技能/提示词的授权，先做成"随智能体授权"可以吗？ | **可以**（先一个授权维度，产品语义不变） | 能让 M2 少做一半 |

---

## 六、下一步

你确认第五节的选择后，我按 M0 把脚手架搭起来（只搭骨架和检查工具，不写业务代码），跑通"格式化 + 检查 + 提交钩子"这条链路，再进入 M1。
