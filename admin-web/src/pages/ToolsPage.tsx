import { Badge, Button, Card, Group, Stack, Table, Text, Title } from '@mantine/core'

import { PageHeader } from '@/components/PageHeader'
import { LEVEL_COLOR, LEVEL_LABEL, TOOLS } from '@/mock/data'
import type { ToolRow } from '@/mock/data'

export function ToolsPage() {
  const byLevel = (level: ToolRow['level']) => TOOLS.filter((tool) => tool.level === level).length

  return (
    <Stack gap="lg">
      <PageHeader
        title="业务工具"
        description="从业务系统 MCP 服务发现并自动同步的工具清单。这里只做分级与授权，不实现工具本身。"
        actions={<Button variant="default">重新同步</Button>}
      />

      <Group gap="md">
        <Badge size="lg" variant="light" color="teal">
          只读 {byLevel('READ')}
        </Badge>
        <Badge size="lg" variant="light" color="orange">
          写操作 {byLevel('WRITE')}
        </Badge>
        <Badge size="lg" variant="light" color="red">
          危险 {byLevel('DANGEROUS')}
        </Badge>
        <Text size="sm" c="dimmed">
          共 {TOOLS.length} 个工具
        </Text>
      </Group>

      <Card withBorder padding={0} radius="md">
        <Table highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>工具名</Table.Th>
              <Table.Th>说明</Table.Th>
              <Table.Th w={110}>分级</Table.Th>
              <Table.Th w={110}>是否授权</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {TOOLS.map((tool) => (
              <Table.Tr key={tool.id}>
                <Table.Td>
                  <Text size="sm" ff="monospace">
                    {tool.name}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {tool.description}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Badge variant="light" color={LEVEL_COLOR[tool.level]}>
                    {LEVEL_LABEL[tool.level]}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Badge variant="dot" color={tool.granted ? 'teal' : 'gray'}>
                    {tool.granted ? '已授权' : '未授权'}
                  </Badge>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>

      <Card withBorder padding="lg" radius="md">
        <Title order={5} mb="xs">
          分级的含义
        </Title>
        <Stack gap={6}>
          <Text size="sm" c="dimmed">
            <b>只读</b>：直通，不过审批，凭用户令牌做数据权限过滤。
          </Text>
          <Text size="sm" c="dimmed">
            <b>写操作</b>：业务侧生成待审批单，人工确认后幂等执行，agent 只看到"已提交待审批"。
          </Text>
          <Text size="sm" c="dimmed">
            <b>危险</b>：默认不挂给任何智能体，需要人工显式开启。
          </Text>
        </Stack>
      </Card>
    </Stack>
  )
}
