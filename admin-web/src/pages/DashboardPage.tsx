import {
  Alert,
  Badge,
  Card,
  Group,
  Loader,
  Progress,
  SimpleGrid,
  Stack,
  Table,
  Text,
} from '@mantine/core'
import { useQuery } from '@tanstack/react-query'

import { systemApi } from '@/api/system'
import { PageHeader } from '@/components/PageHeader'
import { CONVERSATIONS, RUNTIMES, USAGE_BY_AGENT } from '@/mock/data'
import { formatDateTime } from '@/utils/datetime'

const TOTAL_TOKENS = USAGE_BY_AGENT.reduce((sum, row) => sum + row.tokens, 0)

export function DashboardPage() {
  const { data, isPending, error } = useQuery({
    queryKey: ['system', 'status'],
    queryFn: systemApi.status,
  })

  return (
    <Stack gap="lg">
      <PageHeader
        title="概览"
        description="当前为 M0 原型，数据为占位。M2 起接入真实后端。"
        actions={
          isPending ? (
            <Loader size="xs" />
          ) : error ? (
            <Badge color="red" variant="light">
              后端未连接
            </Badge>
          ) : (
            <Badge color="teal" variant="light">
              后端已连接 · {data?.version}
            </Badge>
          )
        }
      />

      {error && (
        <Alert color="red" variant="light" title="后端未响应">
          确认后端已在 8090 端口启动：<code>cd backend &amp;&amp; mvn spring-boot:run</code>
        </Alert>
      )}

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        <StatCard label="活跃用户" value="12" hint="近 15 分钟有会话" />
        <StatCard label="今日会话" value="287" hint="较昨日 +18%" />
        <StatCard label="今日 Token" value={formatTokens(TOTAL_TOKENS)} hint="全部模型合计" />
        <StatCard label="在线实例" value={String(RUNTIMES.length)} hint="每个用户一个 dsh 进程" />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
        <Card withBorder padding="lg" radius="md">
          <Text fw={600} mb="sm">
            按智能体用量（本月）
          </Text>
          <Stack gap="sm">
            {USAGE_BY_AGENT.map((row) => (
              <div key={row.agent}>
                <Group justify="space-between" mb={4}>
                  <Text size="sm">{row.agent}</Text>
                  <Text size="sm" c="dimmed">
                    {formatTokens(row.tokens)} · {row.sessions} 会话
                  </Text>
                </Group>
                <Progress value={row.share} size="sm" radius="xl" />
              </div>
            ))}
          </Stack>
        </Card>

        <Card withBorder padding="lg" radius="md">
          <Text fw={600} mb="sm">
            最近会话
          </Text>
          <Table verticalSpacing="xs" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>用户</Table.Th>
                <Table.Th>智能体</Table.Th>
                <Table.Th>开始时间</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {CONVERSATIONS.slice(0, 4).map((row) => (
                <Table.Tr key={row.id}>
                  <Table.Td>{row.user}</Table.Td>
                  <Table.Td>{row.agent}</Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {formatDateTime(row.startedAt)}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      </SimpleGrid>

      <Card withBorder padding="lg" radius="md">
        <Text fw={600} mb={4}>
          后端状态
        </Text>
        {data ? (
          <Text size="sm" c="dimmed">
            {data.name} · {data.version} · 服务器时间 {formatDateTime(data.time)}
          </Text>
        ) : (
          <Text size="sm" c="dimmed">
            等待后端响应……
          </Text>
        )}
      </Card>
    </Stack>
  )
}

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card withBorder padding="lg" radius="md">
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text fw={700} fz={26} mt={6}>
        {value}
      </Text>
      <Text size="xs" c="dimmed" mt={4}>
        {hint}
      </Text>
    </Card>
  )
}

function formatTokens(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`
  }
  return String(value)
}
