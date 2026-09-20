import { Card, Group, Stack, Table, Text, TextInput } from '@mantine/core'
import { useState } from 'react'

import { PageHeader } from '@/components/PageHeader'
import { CONVERSATIONS } from '@/mock/data'
import { formatDateTime } from '@/utils/datetime'

export function ConversationsPage() {
  const [keyword, setKeyword] = useState('')
  const rows = CONVERSATIONS.filter(
    (row) => keyword === '' || row.user.includes(keyword) || row.agent.includes(keyword),
  )

  return (
    <Stack gap="lg">
      <PageHeader
        title="会话"
        description="会话来自运行时日志的镜像。DSH 的日志是运行时的真相，这里是供检索与统计的副本。"
      />

      <Card withBorder padding={0} radius="md">
        <Group p="md" justify="space-between">
          <TextInput
            placeholder="搜索用户或智能体"
            value={keyword}
            onChange={(event) => setKeyword(event.currentTarget.value)}
            w={260}
          />
          <Text size="sm" c="dimmed">
            共 {rows.length} 条
          </Text>
        </Group>

        <Table highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>用户</Table.Th>
              <Table.Th>智能体</Table.Th>
              <Table.Th w={190}>开始时间</Table.Th>
              <Table.Th w={90}>消息数</Table.Th>
              <Table.Th w={110}>Token</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((row) => (
              <Table.Tr key={row.id} style={{ cursor: 'pointer' }}>
                <Table.Td fw={500}>{row.user}</Table.Td>
                <Table.Td>{row.agent}</Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {formatDateTime(row.startedAt)}
                  </Text>
                </Table.Td>
                <Table.Td>{row.messages}</Table.Td>
                <Table.Td>{row.tokens.toLocaleString('zh-CN')}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>

      <Card withBorder padding="lg" radius="md">
        <Text size="sm" c="dimmed">
          <b>铁律</b>：业务库里的会话是<b>只读镜像</b>，永远不要拿它去"喂"模型。 模型的历史只能由
          DSH 自己的日志投影出来，这是它"模型可见 ⟺ 已落日志" 不变量的前提。
        </Text>
      </Card>
    </Stack>
  )
}
