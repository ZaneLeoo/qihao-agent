/**
 * 演示用假数据。
 *
 * <p>M0/M1 阶段管理后台还没有后端数据源，这里集中放一份，
 * 目的是先评审信息架构与交互形态。M2 起逐个替换为真实接口。
 */

export interface AgentRow {
  id: string
  name: string
  description: string
  skills: number
  tools: number
  status: 'PUBLISHED' | 'DRAFT'
  updatedAt: string
}

export const AGENTS: AgentRow[] = [
  {
    id: 'a1',
    name: '生产日报助手',
    description: '按产线汇总产量、异常与停机，生成班组日报',
    skills: 3,
    tools: 5,
    status: 'PUBLISHED',
    updatedAt: '2026-09-18T09:12:00+08:00',
  },
  {
    id: 'a2',
    name: '工单查询助手',
    description: '按车间/产线查询工单进度与在制品',
    skills: 2,
    tools: 4,
    status: 'PUBLISHED',
    updatedAt: '2026-09-17T16:40:00+08:00',
  },
  {
    id: 'a3',
    name: '设备点检助手',
    description: '按设备台账引导点检，异常自动生成报修单',
    skills: 4,
    tools: 6,
    status: 'DRAFT',
    updatedAt: '2026-09-15T11:05:00+08:00',
  },
  {
    id: 'a4',
    name: '采购比价助手',
    description: '汇总供应商报价并给出比价建议',
    skills: 1,
    tools: 3,
    status: 'DRAFT',
    updatedAt: '2026-09-12T14:22:00+08:00',
  },
]

export interface SkillRow {
  id: string
  name: string
  source: '内置' | '自定义'
  version: string
  usedBy: number
  enabled: boolean
}

export const SKILLS: SkillRow[] = [
  { id: 's1', name: 'MES 操作手册', source: '内置', version: 'v1.4', usedBy: 3, enabled: true },
  { id: 's2', name: '设备点检规范', source: '内置', version: 'v2.0', usedBy: 1, enabled: true },
  { id: 's3', name: '工单字段说明', source: '自定义', version: 'v1.0', usedBy: 2, enabled: true },
  { id: 's4', name: '安全操作规程', source: '自定义', version: 'v1.1', usedBy: 0, enabled: false },
]

export interface PromptRow {
  id: string
  name: string
  variables: string[]
  usedBy: number
  updatedAt: string
}

export const PROMPTS: PromptRow[] = [
  {
    id: 'p1',
    name: '生产日报模板',
    variables: ['用户名', '组织', '日期'],
    usedBy: 1,
    updatedAt: '2026-09-18T09:00:00+08:00',
  },
  {
    id: 'p2',
    name: '工单查询模板',
    variables: ['组织', '账套'],
    usedBy: 1,
    updatedAt: '2026-09-10T15:30:00+08:00',
  },
  {
    id: 'p3',
    name: '通用助手模板',
    variables: ['用户名'],
    usedBy: 2,
    updatedAt: '2026-09-02T10:10:00+08:00',
  },
]

export interface ToolRow {
  id: string
  name: string
  description: string
  level: 'READ' | 'WRITE' | 'DANGEROUS'
  granted: boolean
}

export const TOOLS: ToolRow[] = [
  {
    id: 't1',
    name: 'mcp__mom__query_workorder',
    description: '按车间查询工单',
    level: 'READ',
    granted: true,
  },
  {
    id: 't2',
    name: 'mcp__mom__query_inventory',
    description: '查询库存主数据',
    level: 'READ',
    granted: true,
  },
  {
    id: 't3',
    name: 'mcp__mom__report_production',
    description: '上报产量（写操作，需审批）',
    level: 'WRITE',
    granted: false,
  },
  {
    id: 't4',
    name: 'mcp__mom__create_purchase_order',
    description: '创建采购订单（写操作，需审批）',
    level: 'WRITE',
    granted: false,
  },
  {
    id: 't5',
    name: 'mcp__mom__delete_inventory',
    description: '删除库存记录',
    level: 'DANGEROUS',
    granted: false,
  },
]

export const LEVEL_LABEL: Record<ToolRow['level'], string> = {
  READ: '只读',
  WRITE: '写操作',
  DANGEROUS: '危险',
}

export const LEVEL_COLOR: Record<ToolRow['level'], string> = {
  READ: 'teal',
  WRITE: 'orange',
  DANGEROUS: 'red',
}

/** 组织树节点。字段名对齐 Mantine Tree 的 TreeNodeData，避免在页面里再做一层映射。 */
export interface OrgNode {
  value: string
  label: string
  children?: OrgNode[]
}

export const ORG_TREE: OrgNode[] = [
  {
    value: 'o1',
    label: '奥力亚制造',
    children: [
      {
        value: 'o11',
        label: '生产部',
        children: [
          { value: 'o111', label: '一号线' },
          { value: 'o112', label: '二号线' },
        ],
      },
      { value: 'o12', label: '采购部' },
      { value: 'o13', label: '质量部' },
      { value: 'o14', label: '设备部' },
    ],
  },
]

/** 组织节点的展示名，供授权页标题等处使用。 */
export const ORG_LABEL: Record<string, string> = {
  o1: '奥力亚制造',
  o11: '生产部',
  o111: '一号线',
  o112: '二号线',
  o12: '采购部',
  o13: '质量部',
  o14: '设备部',
}

export interface UserRow {
  id: string
  name: string
  account: string
  org: string
  roles: string[]
  status: 'ACTIVE' | 'DISABLED'
}

export const USERS: UserRow[] = [
  {
    id: 'u1',
    name: '张三',
    account: 'zhangsan',
    org: '生产部 / 一号线',
    roles: ['班组长'],
    status: 'ACTIVE',
  },
  {
    id: 'u2',
    name: '李四',
    account: 'lisi',
    org: '生产部 / 二号线',
    roles: ['班组长'],
    status: 'ACTIVE',
  },
  { id: 'u3', name: '王五', account: 'wangwu', org: '采购部', roles: ['采购员'], status: 'ACTIVE' },
  {
    id: 'u4',
    name: '赵六',
    account: 'zhaoliu',
    org: '设备部',
    roles: ['设备工程师'],
    status: 'DISABLED',
  },
]

export interface ConversationRow {
  id: string
  user: string
  agent: string
  startedAt: string
  messages: number
  tokens: number
}

export const CONVERSATIONS: ConversationRow[] = [
  {
    id: 'c1',
    user: '张三',
    agent: '生产日报助手',
    startedAt: '2026-09-20T08:31:00+08:00',
    messages: 12,
    tokens: 18420,
  },
  {
    id: 'c2',
    user: '李四',
    agent: '工单查询助手',
    startedAt: '2026-09-20T09:05:00+08:00',
    messages: 6,
    tokens: 6210,
  },
  {
    id: 'c3',
    user: '王五',
    agent: '采购比价助手',
    startedAt: '2026-09-19T16:44:00+08:00',
    messages: 21,
    tokens: 41230,
  },
  {
    id: 'c4',
    user: '张三',
    agent: '设备点检助手',
    startedAt: '2026-09-19T14:02:00+08:00',
    messages: 9,
    tokens: 11800,
  },
]

export interface UsageByAgent {
  agent: string
  sessions: number
  tokens: number
  share: number
}

export const USAGE_BY_AGENT: UsageByAgent[] = [
  { agent: '生产日报助手', sessions: 128, tokens: 1_240_000, share: 42 },
  { agent: '工单查询助手', sessions: 96, tokens: 780_000, share: 26 },
  { agent: '采购比价助手', sessions: 41, tokens: 520_000, share: 18 },
  { agent: '设备点检助手', sessions: 22, tokens: 410_000, share: 14 },
]

export interface AuditRow {
  id: string
  time: string
  user: string
  tool: string
  summary: string
  result: 'OK' | 'DENIED' | 'PENDING'
}

export const AUDITS: AuditRow[] = [
  {
    id: 'g1',
    time: '2026-09-20T09:12:31+08:00',
    user: '张三',
    tool: 'mcp__mom__query_workorder',
    summary: '线号=1, 状态=进行中',
    result: 'OK',
  },
  {
    id: 'g2',
    time: '2026-09-20T09:14:02+08:00',
    user: '张三',
    tool: 'mcp__mom__report_production',
    summary: '产量=1200, 线号=1',
    result: 'PENDING',
  },
  {
    id: 'g3',
    time: '2026-09-20T09:15:44+08:00',
    user: '李四',
    tool: 'mcp__mom__query_workorder',
    summary: '线号=1（越权）',
    result: 'DENIED',
  },
  {
    id: 'g4',
    time: '2026-09-19T16:50:10+08:00',
    user: '王五',
    tool: 'mcp__mom__query_inventory',
    summary: '物料=钢材',
    result: 'OK',
  },
]

export interface RuntimeRow {
  id: string
  user: string
  port: number
  pid: number
  memoryMb: number
  lastActive: string
  state: 'RUNNING' | 'IDLE' | 'STOPPED'
}

export const RUNTIMES: RuntimeRow[] = [
  {
    id: 'r1',
    user: '张三',
    port: 19301,
    pid: 28104,
    memoryMb: 286,
    lastActive: '2026-09-20T09:15:02+08:00',
    state: 'RUNNING',
  },
  {
    id: 'r2',
    user: '李四',
    port: 19302,
    pid: 28220,
    memoryMb: 271,
    lastActive: '2026-09-20T09:16:40+08:00',
    state: 'RUNNING',
  },
  {
    id: 'r3',
    user: '王五',
    port: 19303,
    pid: 27988,
    memoryMb: 268,
    lastActive: '2026-09-20T08:40:11+08:00',
    state: 'IDLE',
  },
]
