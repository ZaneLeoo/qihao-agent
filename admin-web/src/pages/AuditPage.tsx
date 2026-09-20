import { Badge, Card, Stack, Table, Text } from '@mantine/core'

import { PageHeader } from '@/components/PageHeader'
import { AUDITS } from '@/mock/data'
import type { AuditRow } from '@/mock/data'
import { formatDateTime } from '@/utils/datetime'

const RESULT_LABEL: Record<AuditRow['result'], string> = {
  OK: '成功',
  DENIED: '被拒绝',
  PENDING: '待审批',
}

const RESULT_COLOR: Record<AuditRow['result'], string> = {
  OK: 'teal',
  DENIED: 'red',
  PENDING: 'orange',
}

export function AuditPage() {
  return (
    <Stack gap="lg">
      <PageHeader
        title="审计"
        description="每一次业务工具调用都留痕：谁、什么时候、调了什么、结果如何。"
      />

      <Card withBorder padding={0} radius="md">
        <Table highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
          <Table.Thead>
            <Table.Tr>
              <Table.Th w={190}>时间</Table.Th>
              <Table.Th w={100}>用户</Table.Th>
              <Table.Th>工具</Table.Th>
              <Table.Th>参数摘要</Table.Th>
              <Table.Th w={110}>结果</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {AUDITS.map((row) => (
              <Table.Tr key={row.id}>
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {formatDateTime(row.time)}
                  </Text>
                </Table.Td>
                <Table.Td>{row.user}</Table.Td>
                <Table.Td>
                  <Text size="sm" ff="monospace">
                    {row.tool}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {row.summary}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Badge variant="light" color={RESULT_COLOR[row.result]}>
                    {RESULT_LABEL[row.result]}
                  </Badge>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>

      <Card withBorder padding="lg" radius="md">
        <Text size="sm" c="dimmed">
          <b>为什么审计要两侧拼</b>：DSH 自身没有审计身份（官方文档明确写着它假设
          "调用方是可信的"）。所以"谁调用了什么"必须由<b>运行时编排</b>和<b>业务工具层</b>
          各自记录，再按会话 ID 关联起来。
        </Text>
      </Card>
    </Stack>
  )
}
