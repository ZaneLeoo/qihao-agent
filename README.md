# 企业 Agent 平台

基于 [DeepSeek Harness](https://github.com/deepseek-ai) 作为 Agent 运行时的企业级智能体平台。
本项目是**平台侧**（门户 + 控制面 + 运行时编排），DSH 作为执行内核被复用，不修改其仓库。

面向的部署形态：**私有化交付**（每个客户一套，部署在客户内网）。

---

## 技术栈

### 后端

| 项 | 选型 | 版本 | 说明 |
|---|---|---|---|
| 语言 | Java | **17** | 需要 17+，注意本机 `JAVA_HOME` 默认指向 JDK 8 |
| 框架 | Spring Boot | **3.3.5** | |
| 构建 | Maven | 3.9.x | |
| Web | Spring MVC（Servlet） | — | |
| 校验 | Jakarta Bean Validation | — | |
| 接口文档 | springdoc-openapi | **2.6.0** | 生成 OpenAPI，前端据此生成类型 |
| 对象映射 | MapStruct | **1.6.3** | DTO ↔ 领域对象，不手写搬运 |
| 样板代码 | Lombok | 随 Boot | 限用：`@Slf4j`、`@RequiredArgsConstructor`；实体不用 `@Data` |
| 持久层 | MyBatis-Plus | M2 接入 | 关在 `infrastructure` 层内 |
| 数据库 | MySQL | 8 | M2 接入 |
| 鉴权 | **Sa-Token** | 1.46.x | 浏览器用会话 + HttpOnly Cookie；服务间用短期 JWT（见后端规范 5.6） |
| 格式化 | Spotless + palantir-java-format | 2.43.0 | `mvn spotless:apply` |
| 静态检查 | Checkstyle | 插件 3.6.0 | 只管工具管不了的 |
| 架构守护 | ArchUnit | **1.3.0** | 把分层约定变成可执行断言 |
| 测试 | JUnit 5 + Mockito + MockMvc | 随 Boot | Testcontainers 在 M2 接入 |

### 前端

| 项 | 选型 | 版本 | 说明 |
|---|---|---|---|
| 框架 | React | **19.3** | Mantine 9 要求 React ≥ 19.2 |
| 语言 | TypeScript | **5.9.3** | ⚠️ **刻意不用 latest（7.0.2）**：typescript-eslint 目前只支持 `<6.1.0` |
| 构建 | Vite | **8.3** | |
| UI 库 | **Mantine** | **9.6.1** | |
| 样式 | CSS Modules + CSS 变量 | — | Mantine 底层也是这套，天然一致 |
| 服务端状态 | TanStack Query | **5.103** | 唯一的数据获取方式 |
| 客户端状态 | Zustand | **5.0** | 只放跨组件 UI 状态 |
| 路由 | React Router | **7.18** | |
| HTTP | Axios | **1.20** | 统一封装在 `src/api/` |
| 时间 | dayjs | 1.11 | 统一走 `utils/datetime.ts` |
| 静态检查 | ESLint 10 + Prettier 3 + tsc | — | |
| 提交钩子 | husky + lint-staged | — | |
| 测试 | Vitest + React Testing Library | M2 接入 | |

### 周边组件

| 项 | 选型 | 说明 |
|---|---|---|
| Agent 运行时 | DeepSeek Harness（`dsh`） | 按 profile + `--patch` 组合，不改其源码 |
| 模型 | DeepSeek 官方 API 优先 | 预留 OpenAI 兼容路由（客户内网 vLLM） |
| 业务工具 | 现有 MOM 后端的 MCP server | `api/v1/agent/mcp`，需改造为按用户令牌鉴权 |
| 向量库 | 待定（Qdrant / pgvector） | P2 接入 RAG 时定 |

---

## 目录结构

```
agent-new/
├── backend/            Spring Boot 后端（门户 + 控制面 + 运行时编排 + 业务工具接入）
├── admin-web/          React 管理后台
├── docs/               设计文档
│   ├── dsh-enterprise-agent-architecture.md    架构评估（DSH 能力边界与分层设计）
│   ├── mvp-plan-and-coding-conventions.md      MVP 里程碑与验收标准
│   └── conventions/
│       ├── backend-conventions.md              后端编码规范
│       └── frontend-conventions.md             前端编码规范
├── .editorconfig       编辑器统一配置
├── .gitattributes      换行符统一
└── README.md
```

---

## 环境要求

| 组件 | 版本 | 本机现状 |
|---|---|---|
| JDK | 17+ | `C:\App\Dev\Env\Java\temurin-17\jdk-17.0.20+8`（`JAVA_HOME` 目前指向 JDK 8，需临时覆盖） |
| Maven | 3.9+ | 3.9.16 ✓ |
| Node.js | 22+ | v22.23.1 ✓ |
| MySQL | 8 | M2 起需要 |

---

## 怎么跑

### 后端

```powershell
cd backend

# 本机 JAVA_HOME 指向 JDK 8，先临时切到 17
$env:JAVA_HOME = 'C:\App\Dev\Env\Java\temurin-17\jdk-17.0.20+8'
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"

mvn spotless:apply         # 先格式化（第一次）
mvn spring-boot:run        # 启动，默认 8090
```

验证：

- 接口：<http://localhost:8090/api/v1/system/status>
- 接口文档：<http://localhost:8090/swagger-ui.html>
- 健康检查：<http://localhost:8090/actuator/health>

### 前端

```powershell
cd admin-web
npm install
npm run dev                # 默认 5173，/api 已代理到 8090
```

打开 <http://localhost:5173>，「概览」页会显示后端返回的应用名、版本与服务器时间——
**能显示出来就说明前后端链路通了。**

---

## 提交前必须通过

```powershell
# 后端
mvn verify                        # 格式校验 + Checkstyle + 编译 + 测试（含架构测试）

# 前端
npm run check                     # Prettier + ESLint + tsc
```

前端已配置 husky + lint-staged，提交时自动跑。后端在 M1 接入 git hook。

---

## 开发约定

**动手前先读这两份**：

- [后端编码规范](docs/conventions/backend-conventions.md)
- [前端编码规范](docs/conventions/frontend-conventions.md)

几条最容易踩的：

1. **后端按功能模块分包**，不按 `controller/service/mapper` 平铺；模块内四层 `api → application → domain ← infrastructure`
2. **接口不套 `{code,message,data}` 信封**：成功直接返回资源，失败用 RFC 9457 Problem Details
3. **前端服务端数据只走 TanStack Query**，禁止 `useEffect` 手工拉取；禁止把服务端数据放进 Zustand
4. **时间**：接口传带时区的 ISO 8601，展示统一走 `formatDateTime()`
5. **注释写"为什么"，不写"做了什么"**；AI 生成的过程旁白注释全删

---

## 当前进度

**M0 工程底座**（进行中）——只搭骨架与检查工具，不含业务代码。

- [x] 仓库结构、`.editorconfig`、`.gitattributes`、`.gitignore`
- [x] 后端：Spring Boot 骨架、Spotless、Checkstyle、ArchUnit、`/api/v1/system/status`
- [x] 前端：Vite + React + Mantine 骨架、ESLint/Prettier、概览页与智能体页
- [ ] 提交钩子（后端侧）
- [ ] 全部检查绿灯

后续里程碑与验收标准见 [MVP 计划](docs/mvp-plan-and-coding-conventions.md)。
