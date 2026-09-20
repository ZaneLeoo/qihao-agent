# 后端编码规范（Spring Boot 3.3 / Java 17）

## 这份规范怎么来的

1. **按行业通行做法**，不沿袭现有 MOM 项目的分层。现有那套（顶层平铺 controller/service/mapper + 全信封返回）是十年前的写法，业界主流已经变了。
2. **能工具管的就不写成人规则**：缩进、换行、import 顺序、行宽交给 Spotless + Checkstyle。本文只写工具管不了的。
3. **唯一一处向团队现状妥协**：持久层用 MyBatis-Plus 而不是 Spring Data JPA（团队熟悉度是真实成本）。但把它**关在 infrastructure 层内部**，将来换 JPA / jOOQ 只动那一层。

---

## 一、工具与人的边界

| 事项 | 谁负责 |
|---|---|
| 缩进、换行、import 顺序、行宽、括号风格 | **Spotless**（palantir-java-format） |
| 命名规范、魔法值、吞异常、空 catch | **Checkstyle** |
| 模块边界、依赖方向、事务、契约、日志内容 | **本文 + ArchUnit 测试 + review** |

```sh
mvn spotless:apply     # 一键格式化
mvn verify             # 构建时校验格式、检查项、模块边界
```

---

## 二、模块划分：按功能分包，不按层分包

**顶层不出现 `controller/`、`service/`、`mapper/` 这种按技术分层的包。** 按业务能力切模块，每个模块自己内部再分层。

```
com.hgsoft.agent.platform
├── AgentPlatformApplication
├── shared/                     通用：Problem Details 扩展、分页模型、工具类
├── identity/                   组织、人员、角色、认证
├── agentcatalog/               智能体定义、技能、提示词模板、授权
├── runtime/                    实例编排、能力物化、进程管理、门户代理
├── conversation/               会话镜像、消息、工具调用
├── usage/                      用量与统计
└── integration/                对外适配：MCP 客户端、模型出口客户端
```

**为什么按功能分**：

- 改一个需求只动一个目录，而不是在四个顶层包之间来回跳
- 模块边界清楚，将来要拆服务时切面是现成的
- 新人对"这个功能在哪"有直觉

**模块之间怎么调用**：只能调用对方模块 `api` 包里的东西。跨模块直接引对方的 `domain` 或 `infrastructure` 属于违规，由 ArchUnit 测试拦住。

---

## 三、模块内部分层与依赖方向

每个模块内部统一四层：

```
<module>/
├── api/            HTTP 层：Controller、Request/Response DTO、参数校验
│                   可以依赖：application
├── application/    应用层：用例编排、事务边界、DTO ↔ 领域对象转换
│                   可以依赖：本模块 domain、其他模块的 api
├── domain/         领域层：实体、值对象、领域规则、仓储接口
│                   不依赖 Spring Web、不依赖其他模块
└── infrastructure/ 基础设施层：仓储实现（MyBatis Mapper）、外部系统适配
                    实现 domain 定义的接口
```

**依赖方向单向**：

```
api ──► application ──► domain ◄── infrastructure
```

### 硬规则

| 规则 | 后果 |
|---|---|
| Controller 里出现业务条件判断 | 挪到 application |
| application 里出现 `HttpServletRequest` / `ResponseEntity` | 挪到 api（业务逻辑要能脱离 Web 层测试） |
| domain 里 import `org.springframework.web.*` | 违规，ArchUnit 拦 |
| 跨模块直接引对方 `infrastructure` | 违规，ArchUnit 拦 |
| 实体（entity）作为接口返回值 | **禁止**，防止内部字段泄漏 |
| Controller 直接调 Mapper | **禁止**，绕过事务与业务规则 |

### 关于实体与持久化注解

**承认这是一处务实妥协**：领域实体直接带 MyBatis-Plus 注解（`@TableName` 等），不再单独建一套持久化模型。好处是少一层映射、少一半代码；代价是领域对象带了框架依赖，将来换 ORM 要动实体。

对一个 1 人 + AI 的 MVP，这个取舍划算。等模块复杂到需要真正的领域模型时再拆。

---

## 四、命名

| 对象 | 规则 | 例 |
|---|---|---|
| 模块包 | 全小写，业务名词 | `agentcatalog` / `runtime` |
| 类 | 大驼峰 + 后缀表明角色 | `AgentDefinitionController` / `CreateAgentUseCase` |
| 用例类 | 动词短语 + `UseCase` 或 `Service` | `PublishAgentService` |
| 方法 | 动词开头 | `createGrant` / `listVisibleAgents` |
| 布尔方法 | `is` / `has` / `can` 开头 | `hasPermission` |
| 表 | 小写下划线，模块名作前缀 | `agent_def` / `agent_grant` / `runtime_instance` |
| 字段/列 | 小驼峰 / 小写下划线 | `agentDefinitionId` / `agent_definition_id` |
| 常量 | 全大写下划线 | `DEFAULT_PAGE_SIZE` |

---

## 五、HTTP 契约

### 5.1 成功响应直接返回资源，不套信封

```jsonc
// GET /api/v1/agents/abc   → 200
{ "id": "abc", "name": "生产日报助手", "status": "PUBLISHED" }

// POST /api/v1/agents      → 201 + Location
// DELETE /api/v1/agents/abc → 204 无响应体
```

**不要**返回 `{ "code": 200, "message": "success", "data": {...} }`。理由：

- HTTP 状态码本来就表达结果，再套一层是重复
- 前端生成类型会变成 `ApiResult<Agent>`，处处多一层解包
- 任何标准工具（OpenAPI 生成器、监控、网关）都读不懂自定义 code

### 5.2 分页

```jsonc
// GET /api/v1/agents?page=1&size=20   （page 从 1 开始，size 上限 100）
{
  "content": [ /* ... */ ],
  "page": 1,
  "size": 20,
  "totalElements": 137,
  "totalPages": 7
}
```

`size` 超过上限直接拒绝（400），不静默截断。

### 5.3 错误统一用 RFC 9457 Problem Details

Spring Boot 3 原生支持，打开即可：

```yaml
spring:
  mvc:
    problemdetails:
      enabled: true
```

```jsonc
// 404
{
  "type": "https://errors.agent-platform/agent-not-found",
  "title": "智能体不存在",
  "status": 404,
  "detail": "id=abc 的智能体未找到",
  "instance": "/api/v1/agents/abc"
}
```

- `type` 是**稳定的业务错误标识**（一个 URI，不要求可访问），前端按它做分支
- `status` 复用 HTTP 状态码，不发明数字分段
- `title` 给人看，`detail` 给排查用
- 需要额外字段时加扩展成员（如 `"errors": [{ "field": "name", "message": "不能为空" }]`）

**不要**发明 `code: 40001` 这类自定义错误码体系。真正需要跨系统约定的少数错误，用 `type` 的 URI 表达。

### 5.4 时间与时区

**先分清两件事：接口传输的格式 ≠ 界面显示的格式。**

| 环节 | 格式 | 说明 |
|---|---|---|
| 接口传输 | `2026-03-01T10:00:00+08:00` | ISO 8601 带偏移，无歧义，浏览器原生可解析 |
| 数据库存储 | `DATETIME(3)`，存 +08:00 本地时间 | 运维直接查库看到的就是中国时间 |
| 界面显示 | `2026-03-01 10:00:00` | 前端用 dayjs 统一格式化 |

**用户看到的永远可以是 `2026-03-01 10:00:00`**——它是在前端一层统一做的，不是靠接口迁就。

**为什么不直接用 `2026-03-01 10:00:00` 传输：**

1. **JS 解析它不可靠**：`new Date('2026-03-01 10:00:00')` 在 Chrome 按本地时区解析、在 Safari 直接返回 `Invalid Date`。这不是风格问题，是会导致页面报错的兼容问题。
2. **没有时区就没有绝对时刻**：同一串字符，在 UTC 服务器和 +8 服务器上是两个不同的时刻。
3. **私有化部署必然踩**：Linux 服务器默认时区通常是 **UTC**，JVM 读系统时区，`LocalDateTime.now()` 出来就是 UTC，存库和显示全差 8 小时。带上偏移量，这类问题一眼可见。

**Java 类型怎么选**

| 类型 | 用途 |
|---|---|
| `OffsetDateTime` | **接口输入输出用它**，序列化成 `+08:00` |
| `Instant` | 需要绝对时刻的内部计算（耗时统计等） |
| `LocalDate` | 只有日期没有时间（如"统计日"） |
| `LocalDateTime` | ❌ **不要出现在接口上**（没有时区） |

**时区必须显式固定，不能依赖系统默认**（这条比格式更重要）：

```
JVM:    -Duser.timezone=Asia/Shanghai
MySQL:  time_zone = '+08:00'（或连接串 serverTimezone=Asia/Shanghai）
容器:    TZ=Asia/Shanghai
```

### 5.5 金额

`BigDecimal` 或以"分"为单位的整数，**不用浮点**。

### 5.6 认证与授权

框架用 **Sa-Token**。两种场景用两种机制，不要混：

| 场景 | 机制 | 原因 |
|---|---|---|
| 浏览器（管理后台、门户） | **Sa-Token 会话 + HttpOnly Cookie** | 可立即失效（停用账号立刻生效）、可强制下线、JS 读不到 Cookie；WebSocket 握手也会自动带 Cookie |
| 服务间（门户 → dsh 实例 → MCP） | **短期 JWT** | 没有浏览器与 Cookie，令牌经进程环境变量注入 |

**硬规则**

- 浏览器登录态**不许放 localStorage**：XSS 一旦发生令牌就被偷走
- Sa-Token 的 token 是服务端存储的会话（不是无状态 JWT），"踢人下线、强制注销、同端互斥"因此天然可用——不要为了"无状态"把它改成自签 JWT
- 单实例用内存存储即可；多实例时把存储换成 Redis
- **授权分两层，不要混进注解**：
  - **接口级**（能不能调这个接口）：用 Sa-Token 的权限字符串，如 `@SaCheckPermission("agent:create")`
  - **资源级**（能用哪些智能体/技能/提示词、能看哪些数据）：这是**业务数据**，在 application 层用授权服务判断，写进注解会变成散落各处的字符串

### 5.7 路径

- 统一前缀 `/api/v1/`，模块名复数：`/api/v1/agents`、`/api/v1/grants`
- 动词只用于无法映射到资源的操作，且用子资源表达优先（`POST /agents/{id}/publish` 优于 `POST /publishAgent`）

---

## 六、校验边界（最容易走偏的一节）

| 位置 | 校验吗 |
|---|---|
| HTTP 入参 | ✅ 必须（`@Valid` + Bean Validation 注解） |
| 数据库读出的数据 | ✅ 必须（可能被人工改坏） |
| 模型 / 工具返回的 JSON | ✅ 必须 |
| 配置文件字段 | ✅ 必须，失败就拒绝启动 |
| 模块内部方法之间 | ❌ **不要**重复校验 |
| 内部 DTO 传递 | ❌ **不要** |

**不要为不可能发生的输入写防御代码。** 那样代码里 80% 是 if，真正该防的地方反而被淹没。

---

## 七、事务

- 事务边界在 **application 层**，不在 api，也不在 infrastructure
- `@Transactional` 只加在 public 方法上
- **事务里禁止网络调用**（调模型、调 MCP、发通知）——agent 调用动辄几十秒，会把连接池占死
- "先落库再调外部"的场景用**状态机 + 补偿**，不要用大事务包住
- 只读查询显式标 `@Transactional(readOnly = true)`

---

## 八、日志

```java
log.info("拉起实例 user={} port={}", userId, port);      // ✅ 占位符
log.info("拉起实例 user=" + userId + " port=" + port);   // ❌ 拼接
```

**必须记**：实例拉起/回收、授权变更、工具调用、外部调用失败、慢查询（>1s）
**禁止记**：密钥、令牌、密码、完整手机号/身份证号

| 级别 | 用途 |
|---|---|
| `ERROR` | 需要人介入（外部服务挂了、数据不一致） |
| `WARN` | 可自愈但值得关注（重试成功、降级） |
| `INFO` | 状态变化（启动、实例拉起、授权变更） |
| `DEBUG` | 排查细节，生产默认关闭 |

日志用 JSON 结构化输出（便于采集），本地开发可用文本。

---

## 九、注释与文档

**一条总原则：注释写代码表达不了的东西。代码能表达的，一律不写。**

### 该写什么

| 类型 | 例子 |
|---|---|
| **契约** | 前置条件、副作用、抛什么异常、是否幂等、是否线程安全 |
| **为什么** | 非显然的取舍、绕过的坑、刻意的反直觉写法 |
| **外部系统的怪癖** | "对方接口高峰期会返回 500，所以这里重试三次" |
| **不变量** | "该字段写入后不再变更，权限计算依赖它" |
| **单位与边界** | "单位：毫秒"、"上限 100，超出直接拒绝" |
| **安全相关** | "输入来自模型，必须校验" |

### 不该写什么

```java
// ❌ 复述代码
// 设置名称为 agentName
this.name = agentName;

// ❌ 过程旁白
// 先查用户，再查角色，然后合并权限

// ❌ 变更历史（git 有）
// 2026-03-01 张三：加了 orgId 参数

// ❌ 注释掉的代码（删掉，git 里有）

// ❌ 空话
/** 这是智能体服务类 */
public class AgentService {
```

### 类与方法

- **类**：一句话说明职责；如果是有状态的服务或单例，说明线程安全性
- **方法**：`@param` 说明**语义**（不是复述参数名）、`@return` 说明返回值语义、`@throws` 说明什么时候抛
- **不写** `@author` / `@version` / `@date`——`git blame` 有

```java
/**
 * 按用户计算可用智能体集合。
 *
 * <p>结果依赖该用户所属组织的授权与用户级例外；不做缓存，调用方自行决定是否缓存。
 *
 * @param userId 用户标识，必须已通过认证
 * @return 可用智能体列表；无授权时返回空列表而非 null
 * @throws NotFoundException 用户不存在
 */
public List<AgentDefinition> listVisibleAgents(String userId) { ... }
```

### TODO 规范

必须带责任人和日期，否则不算 TODO：

```java
// TODO(张三, 2026-03-15): 支持按组织层级继承授权
```

### 检验标准

**删掉这条注释，维护者会不会踩坑？** 会 → 留着；不会 → 删掉。

### 过期注释比没有注释更有害

改代码必须同步改注释。review 时把"注释和代码不一致"和 bug 同等对待。

### 关于 AI 写的代码

AI 生成的注释有两个典型毛病，必须人工过一遍：

- **话太多**：它会解释自己"做了什么"（过程旁白），这类**全删**
- **缺"为什么"**：它不会解释取舍，而取舍恰恰是注释最有价值的部分，需要人工补

---

## 十、DTO 转换

- Request / Response DTO 与领域实体**分开**，不共用
- 转换用 **MapStruct** 生成实现（你们现有项目已经在用），不手写 getter/setter 搬运
- 转换放在 application 层

---

## 十一、用测试守住架构

用 **ArchUnit** 写几条架构测试，把前面几节的"硬规则"变成可执行断言：

```java
@ArchTest
static final ArchRule 模块内部依赖单向 =
    layeredArchitecture().consideringOnlyDependenciesInLayers()
        .layer("Api").definedBy("..api..")
        .layer("Application").definedBy("..application..")
        .layer("Domain").definedBy("..domain..")
        .layer("Infrastructure").definedBy("..infrastructure..")
        .whereLayer("Api").mayNotBeAccessedByAnyLayer()
        .whereLayer("Application").mayOnlyBeAccessedByLayers("Api")
        .whereLayer("Infrastructure").mayOnlyBeAccessedByLayers("Application");

@ArchTest
static final ArchRule 领域层不依赖框架 =
    noClasses().that().resideInAPackage("..domain..")
        .should().dependOnClassesThat().resideInAnyPackage("org.springframework.web..");
```

这几条测试比文档管用——文档没人看，测试红了必须改。

---

## 十二、反模式清单（review 直接打回）

- ❌ 顶层按 controller/service/mapper 分包
- ❌ 跨模块直接引对方 domain / infrastructure
- ❌ 统一返回信封 `{code,message,data}`
- ❌ 自定义数字错误码体系（用 HTTP 状态码 + Problem Details 的 `type`）
- ❌ Controller 里写业务逻辑
- ❌ 实体作为接口返回值
- ❌ 空 catch：`catch (Exception e) {}`
- ❌ 事务方法里调外部 HTTP / 模型
- ❌ 字符串拼接 SQL
- ❌ 循环里查数据库（N+1）
- ❌ `System.out.println`
- ❌ 魔法数字（`if (status == 3)`）
- ❌ 单个方法超过 50 行还不拆
- ❌ 用 `null` 表达业务语义（用 Optional 或明确的空对象）

---

## 十三、测试

| 类型 | 范围 | 工具 |
|---|---|---|
| 单元测试 | domain 与 application 的业务规则 | JUnit 5 + Mockito |
| 架构测试 | 模块边界、依赖方向 | ArchUnit |
| 集成测试 | 仓储、外部适配、事务 | `@SpringBootTest` + Testcontainers |
| 接口测试 | Controller 契约 | MockMvc |

- 关键路径必须有测试：**授权计算、能力物化、代理路由**
- 测试方法名描述行为：`shouldRejectWhenUserHasNoGrant()`
- 不追覆盖率数字，追"改坏了会被测出来"

---

## 十四、提交规范

```
feat: 支持按组织授权智能体
fix: 修复空闲回收时进程树未清理
docs: 补充部署手册
refactor: 抽出授权快照计算
test: 补充物化逻辑单测
chore: 升级 Spring Boot 到 3.3.6
```

- 一次提交只做一件事
- 提交信息写**为什么**，不写"改了 xxx 文件"
- `main` 分支保持可运行
