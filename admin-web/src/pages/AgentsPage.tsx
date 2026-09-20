import {
  Badge,
  Button,
  Card,
  Group,
  Modal,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { useState } from 'react'

interface AgentRow {
  id: string
  name: string
  description: string
  status: 'PUBLISHED' | 'DRAFT'
}

/** 演示用的假数据；M2 起改为从 /api/v1/agents 拉取。 */
const MOCK: AgentRow[] = [
  { id: 'a1', name: '生产日报助手', description: '按产线汇总产量与异常', status: 'PUBLISHED' },
  { id: 'a2', name: '工单查询助手', description: '按车间查询工单进度', status: 'PUBLISHED' },
  { id: 'a3', name: '采购比价助手', description: '供应商报价比对（未发布）', status: 'DRAFT' },
]

export function AgentsPage() {
  const [opened, { open, close }] = useDisclosure(false)
  const [keyword, setKeyword] = useState('')

  const rows = MOCK.filter((row) => row.name.includes(keyword) || keyword === '')

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <div>
          <Title order={3}>智能体</Title>
          <Text size="sm" c="dimmed">
            这里定义智能体的名称、提示词、技能与可用的业务工具。
          </Text>
        </div>
        <Button onClick={open}>新建智能体</Button>
      </Group>

      <Card withBorder padding={0} radius="md">
        <Group p="md" justify="space-between">
          <TextInput
            placeholder="搜索名称"
            value={keyword}
            onChange={(event) => setKeyword(event.currentTarget.value)}
            w={240}
          />
          <Text size="sm" c="dimmed">
            共 {rows.length} 条
          </Text>
        </Group>

        <Table highlightOnHover verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>名称</Table.Th>
              <Table.Th>说明</Table.Th>
              <Table.Th w={120}>状态</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((row) => (
              <Table.Tr key={row.id}>
                <Table.Td>{row.name}</Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {row.description}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Badge variant="light" color={row.status === 'PUBLISHED' ? 'teal' : 'gray'}>
                    {row.status === 'PUBLISHED' ? '已发布' : '草稿'}
                  </Badge>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>

      <Modal opened={opened} onClose={close} title="新建智能体" centered>
        <Stack>
          <TextInput label="名称" placeholder="例如：生产日报助手" required />
          <TextInput label="说明" placeholder="一句话描述它能做什么" />
          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={close}>
              取消
            </Button>
            <Button onClick={close}>保存</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  )
}
