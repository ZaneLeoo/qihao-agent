import { Card, Group, Progress, SimpleGrid, Stack, Table, Text } from '@mantine/core'

import { PageHeader } from '@/components/PageHeader'
import { USAGE_BY_AGENT, USERS } from '@/mock/data'

const TOTAL = USAGE_BY_AGENT.reduce((sum, row) => sum + row.tokens, 0)

export function UsagePage() {
  return (
    <Stack gap="lg">
      <PageHeader
        title="用量"
        description="Token 用量以模型出口的记录为准——所有模型调用都从那里过，因此数据可信。"
      />

      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        <Stat label="本月 Token" value={`${(TOTAL / 1_000_000).toFixed(2)}M`} />
        <Stat label="本月会话" value="287" />
        <Stat label="平均每会话" value="8.4K" />
      </SimpleGrid>

      <Card withBorder padding="lg" radius="md">
        <Text fw={600} mb="sm">
          按智能体
        </Text>
        <Stack gap="sm">
          {USAGE_BY_AGENT.map((row) => (
            <div key={row.agent}>
              <Group justify="space-between" mb={4}>
                <Text size="sm">{row.agent}</Text>
                <Text size="sm" c="dimmed">
                  {(row.tokens / 1_000_000).toFixed(2)}M · {row.share}%
                </Text>
              </Group>
              <Progress value={row.share} size="md" radius="xl" />
            </div>
          ))}
        </Stack>
      </Card>

      <Card withBorder padding={0} radius="md">
        <Group p="md">
          <Text fw={600}>按用户</Text>
        </Group>
        <Table highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>用户</Table.Th>
              <Table.Th>组织</Table.Th>
              <Table.Th w={140}>Token</Table.Th>
              <Table.Th w={160}>配额使用</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {USERS.slice(0, 3).map((user, index) => {
              const percent = [62, 41, 18][index] ?? 0
              return (
                <Table.Tr key={user.id}>
                  <Table.Td fw={500}>{user.name}</Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {user.org}
                    </Text>
                  </Table.Td>
                  <Table.Td>{(320_000 - index * 90_000).toLocaleString('zh-CN')}</Table.Td>
                  <Table.Td>
                    <Group gap="xs" wrap="nowrap">
                      <Progress value={percent} size="sm" style={{ flex: 1 }} />
                      <Text size="xs" c="dimmed">
                        {percent}%
                      </Text>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              )
            })}
          </Table.Tbody>
        </Table>
      </Card>

      <Card withBorder padding="lg" radius="md">
        <Text size="sm" c="dimmed">
          <b>口径说明</b>：DSH 自带的 token 估算（4 字符 ≈ 1 token）对中文严重低估，
          只能用于上下文占用显示，<b>不能用于计费</b>。计费口径一律取 provider 上报的 usage。 MVP
          阶段只统计不拦截。
        </Text>
      </Card>
    </Stack>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card withBorder padding="lg" radius="md">
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text fw={700} fz={22} mt={4}>
        {value}
      </Text>
    </Card>
  )
}
