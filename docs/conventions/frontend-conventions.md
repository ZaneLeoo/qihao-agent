# 前端编码规范（React 18 + TypeScript + Vite）

## 这份规范怎么来的

1. **团队以前是 Vue，React 是新栈** —— 所以规则要**具体到写法**，减少"每个人按自己习惯写"。新栈最容易出现的就是同一个功能五种写法。
2. **能用工具管的就不写成人规则** —— 缩进、引号、分号、import 顺序交给 Prettier + ESLint。本文只写工具管不了的。
3. **数据获取统一用一种方式**（TanStack Query）—— 这是新栈里分歧最大的地方，必须在规范里定死。
4. **类型从后端 OpenAPI 生成** —— 前后端字段不会漂。

---

## 一、工具与人的边界

| 事项 | 谁负责 |
|---|---|
| 缩进、引号、分号、行宽、import 顺序 | **Prettier** |
| 未使用变量、hook 依赖、`any`、react-hooks 规则 | **ESLint + tsc** |
| 目录结构、命名、数据流、错误处理、组件拆分 | **本文 + code review** |

命令：

```sh
npm run format     # 格式化
npm run lint       # 静态检查
npm run typecheck  # tsc --noEmit
npm run check      # 三个一起跑（提交前钩子调这个）
```

**提交前钩子会拦住不合格的提交**，不靠自觉。

---

## 二、目录与命名

```
src/
  api/         接口定义，按后端模块分文件（agent.ts、grant.ts）
  pages/       路由级页面组件
  components/  可复用组件
  hooks/       自定义 hook
  stores/      Zustand store
  router/      路由配置
  types/       类型定义（含从 OpenAPI 生成的 api.d.ts）
  utils/       工具函数
  styles/      全局样式与设计 token
```

| 对象 | 规则 | 例 |
|---|---|---|
| 组件文件 | PascalCase | `AgentEditor.tsx` |
| hook | `use` 开头 | `useAgentList.ts` |
| 工具函数 | camelCase | `formatDate.ts` |
| 常量 | 全大写下划线 | `MAX_PAGE_SIZE` |
| 类型 | PascalCase | `AgentDefinition` |

- 一个文件只导出**一个**主要组件（可附带相关类型）
- **不用 `index.ts` 做桶文件导出**——会造成循环依赖，也会让跳转变麻烦

---

## 三、组件写法

- 一律**函数组件 + hooks**，不写 class
- 组件文件内顺序：类型定义 → 组件 → 子组件 → 样式引用
- props 用 `interface` 显式声明，不用 `React.FC`
- 组件超过 200 行就拆
- 只在顶层调用 hook，不在条件/循环里调用

```tsx
interface AgentEditorProps {
  agentId: string
  onSaved: () => void
}

export function AgentEditor({ agentId, onSaved }: AgentEditorProps) {
  // ...
}
```

---

## 四、数据获取（新栈里最容易乱的一节）

**服务端数据一律用 TanStack Query。禁止在组件里用 `useEffect` 手工拉取和缓存。**

```tsx
// ✅
const { data, isLoading, error } = useQuery({
  queryKey: ['agents', orgId],
  queryFn: () => agentApi.list({ orgId }),
})

// ❌ 不要这样
useEffect(() => { fetch('/api/agents').then(...).then(setAgents) }, [])
```

### queryKey 规范

`[资源名, ...查询参数]`，例如：

```ts
['agents']                      // 全部
['agents', orgId]               // 某组织下
['agents', orgId, { page: 2 }]  // 带分页
```

失效时按前缀失效：`queryClient.invalidateQueries({ queryKey: ['agents'] })`

### 写操作

用 `useMutation`，成功后失效相关 query，**不要手工改缓存**（除非有明确性能理由）：

```tsx
const save = useMutation({
  mutationFn: agentApi.save,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['agents'] })
    onSaved()
  },
})
```

---

## 五、状态管理

**三种状态，三个去处，不要混：**

| 状态类型 | 放哪 |
|---|---|
| 服务端数据（列表、详情、配置） | **TanStack Query** |
| 跨组件的 UI 状态（侧栏开合、当前选中项、草稿） | **Zustand** |
| 只在本组件用的状态 | `useState` |

**硬规则**

- ❌ **禁止把服务端数据复制进 Zustand**——会产生两份真相，必然不同步
- ❌ 禁止把 props 复制进 state（除非明确是要"冻结初值"）
- Zustand store 按领域拆，不要一个全局大 store

---

## 六、请求层与类型

**所有请求走 `api/` 层，组件里不直接 import axios。**

```ts
// src/api/agent.ts
import type { components } from '@/types/api'
import { http } from './http'

export type AgentDefinition = components['schemas']['AgentDefinition']

export const agentApi = {
  list: (params: { orgId?: string }) =>
    http.get<AgentDefinition[]>('/api/v1/agents', { params }),
  save: (body: AgentDefinition) =>
    http.post<AgentDefinition>('/api/v1/agents', body),
}
```

### 类型从后端生成

```sh
npm run gen:api   # 从后端 /v3/api-docs 生成 src/types/api.d.ts
```

后端改了字段 → 跑一次生成 → **`npm run typecheck` 直接报错**，不会等到联调才发现。

**不要手写接口类型**，也不要为了绕过类型错误写 `as any`。

### 时间处理

- 统一用 **dayjs**
- 接口给的是带时区的 ISO 8601，`dayjs(iso)` 直接解析，安全
- ❌ **不要** `new Date('2026-03-01 10:00:00')`——Safari 会得到 `Invalid Date`
- 展示统一走一个工具函数（`formatDateTime()` → `2026-03-01 10:00:00`），不要各页面各写各的
- 提交给后端时用 `dayjs(x).toISOString()` 或直接传 ISO 字符串

### 拦截器

`http.ts` 里统一处理：加令牌、统一错误提示、401 跳登录、超时。

---

## 七、错误处理与加载态

### 后端错误约定（与后端规范配套）

后端**不套信封**，失败时返回 HTTP 错误状态 + RFC 9457 Problem Details：

```jsonc
{
  "type": "https://errors.agent-platform/agent-not-found",
  "title": "智能体不存在",
  "status": 404,
  "detail": "id=abc 的智能体未找到"
}
```

因此前端：

- **按 HTTP 状态码判断成败**，不要写 `if (res.data.code === 200)`
- 需要区分具体业务错误时用 `problem.type` 做分支，**不要解析 `detail` 里的文案**（文案会改）
- 字段级校验错误在 `errors` 扩展成员里，直接映射回表单

```ts
// src/api/http.ts
http.interceptors.response.use(
  (res) => res,
  (error) => {
    const problem = error.response?.data as ProblemDetail | undefined
    return Promise.reject(new ApiError(problem, error.response?.status))
  },
)
```

### 界面上的三态

- **每个查询必须处理三态**：loading / empty / error（用统一的组件，不要各写各的）
- 错误提示统一走一个组件，不各自弹 `message.error`
- 表单校验用 AntD 的 `Form` rules，不手写 `if`；后端返回的字段错误映射回表单
- 提交按钮在 `isPending` 时禁用，防重复提交

---

## 八、样式

- 用 **CSS Modules**（`Xxx.module.css`），不用全局样式（`styles/` 只放 reset 与设计 token）
- 颜色、间距、圆角一律用 **CSS 变量**（设计 token），不写死色值
- 定制 AntD 走 `ConfigProvider` 的 theme token，**不要覆盖 AntD 内部 class 名**（升级会碎）
- 不用内联 `style`（动态计算的值除外）

---

## 九、注释规范

**总原则同后端：注释写代码表达不了的东西。代码能表达的，一律不写。**

### 该写什么

| 类型 | 例子 |
|---|---|
| **props / 类型的语义** | 用 JSDoc 写在类型上，而不是散在组件里 |
| **业务规则** | "必须传 orgId，否则后端按全组织返回" |
| **非显然的取舍** | "这里故意不用 useMemo：依赖每次渲染都变，缓存反而更慢" |
| **外部库的坑** | "AntD 的 Form 放在 Modal 里必须传 forceRender，否则初始值丢失" |

### 不该写什么

```tsx
// ❌ 复述结构
{/* 标题 */}
<h1>智能体管理</h1>

// ❌ 过程旁白
// 先请求列表，然后设置 loading

// ❌ 变更历史
// 2026-03-01 改成用 query 了

// ❌ 注释掉的代码（删掉，git 里有）
```

### 写在类型上，比写在组件里有用的多

```ts
interface AgentEditorProps {
  /** 智能体 id；新建时传 undefined */
  agentId?: string
  /** 保存成功后的回调，由父组件负责刷新列表 */
  onSaved: () => void
}
```

这些注释在 IDE 里悬停就能看到，写一次多处受益。

### 检验标准

**删掉这条注释，维护者会不会踩坑？** 会 → 留着；不会 → 删掉。

---

## 十、反模式清单（review 直接打回）

- ❌ `useEffect` 里拉服务端数据
- ❌ 服务端数据进 Zustand
- ❌ 把 props 复制进 state
- ❌ `any` / `as any`（实在需要时写明原因并注释）
- ❌ 组件超过 200 行不拆
- ❌ 直接修改 state 对象（必须不可变更新）
- ❌ 一个文件导出多个不相关组件
- ❌ 组件里直接 import axios
- ❌ 手写接口类型（应该从 OpenAPI 生成）
- ❌ 覆盖 AntD 内部 class 名做定制

---

## 十一、测试

- 工具函数、hook、复杂组件必须有测试（Vitest + React Testing Library）
- 测试**行为**，不断言实现细节（不断言 class 名、不数渲染次数）
- 查询优先用 `getByRole` / `getByLabelText`，不滥用 `data-testid`

---

## 十二、提交规范

同后端（Conventional Commits）：

```
feat: 智能体授权页支持按组织树勾选
fix: 修复切换组织后列表不刷新
chore: 升级 antd 到 5.21
```

- 一次提交只做一件事
- `main` 分支保持可运行
