import { Badge, Button, Card, Group, Stack, Table, Text } from '@mantine/core'

import { PageHeader } from '@/components/PageHeader'
import { RUNTIMES } from '@/mock/data'
import type { RuntimeRow } from '@/mock/data'
import { formatDateTime } from '@/utils/datetime'

const STATE_LABEL: Record<RuntimeRow['state'], string> = {
  RUNNING: '运行中',
  IDLE: '空闲',
  STOPPED: '已回收',
}

const STATE_COLOR: Record<RuntimeRow['state'], string> = {
  RUNNING: 'teal',
  IDLE: 'yellow',
  STOPPED: 'gray',
}

export function RuntimePage() {
  const totalMemory = RUNTIMES.reduce((sum, row) => sum + row.memoryMb, 0)

  return (
    <Stack gap="lg">
      <PageHeader
        title="运行时"
        description="每个用户一个独立的 dsh 实例：独立的配置目录、独立的会话日志、独立的监听端口。"
        actions={
          <Group>
            <Badge variant="light">{RUNTIMES.length} 个实例</Badge>
            <Badge variant="light" color="grape">
              合计 {totalMemory} MB
            </Badge>
          </Group>
        }
      />

      <Card withBorder padding={0} radius="md">
        <Table highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>用户</Table.Th>
              <Table.Th w={100}>端口</Table.Th>
              <Table.Th w={100}>PID</Table.Th>
              <Table.Th w={110}>内存</Table.Th>
              <Table.Th w={190}>最后活跃</Table.Th>
              <Table.Th w={100}>状态</Table.Th>
              <Table.Th w={140}>操作</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {RUNTIMES.map((row) => (
              <Table.Tr key={row.id}>
                <Table.Td fw={500}>{row.user}</Table.Td>
                <Table.Td>
                  <Text size="sm" ff="monospace">
                    {row.port}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" ff="monospace">
                    {row.pid}
                  </Text>
                </Table.Td>
                <Table.Td>{row.memoryMb} MB</Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {formatDateTime(row.lastActive)}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Badge variant="light" color={STATE_COLOR[row.state]}>
                    {STATE_LABEL[row.state]}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <Button size="compact-sm" variant="default">
                      重启
                    </Button>
                    <Button size="compact-sm" variant="subtle" color="red">
                      回收
                    </Button>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>

      <Card withBorder padding="lg" radius="md">
        <Text size="sm" c="dimmed">
          <b>为什么一个用户一个实例</b>：DSH 的会话列表与智能体清单都是<b>进程级</b>的。
          一个进程里，任何连上的人都能看到该进程的全部会话——共用实例等于让同事之间互相看得见聊天记录。
          另外，"停止生成"在 DSH 里就是<b>结束该进程</b>（协议没有取消接口），会话已落盘，可恢复。
        </Text>
      </Card>
    </Stack>
  )
}
