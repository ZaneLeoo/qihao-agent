import {
  Badge,
  Button,
  Card,
  Checkbox,
  Drawer,
  Group,
  Select,
  Stack,
  Table,
  Tabs,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { useState } from 'react'

import { PageHeader } from '@/components/PageHeader'
import { AGENTS, LEVEL_COLOR, LEVEL_LABEL, PROMPTS, SKILLS, TOOLS } from '@/mock/data'
import type { AgentRow } from '@/mock/data'
import { formatDateTime } from '@/utils/datetime'

export function AgentsPage() {
  const [opened, { open, close }] = useDisclosure(false)
  const [editing, setEditing] = useState<AgentRow | null>(null)

  const openEditor = (row: AgentRow | null) => {
    setEditing(row)
    open()
  }

  return (
    <Stack gap="lg">
      <PageHeader
        title="智能体"
        description="一个智能体 = 一段提示词 + 一组技能 + 一组业务工具 + 默认模型。它对应 DSH 的一个 preset。"
        actions={<Button onClick={() => openEditor(null)}>新建智能体</Button>}
      />

      <Card withBorder padding={0} radius="md">
        <Table highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>名称</Table.Th>
              <Table.Th>说明</Table.Th>
              <Table.Th w={90}>技能</Table.Th>
              <Table.Th w={90}>工具</Table.Th>
              <Table.Th w={100}>状态</Table.Th>
              <Table.Th w={170}>更新时间</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {AGENTS.map((row) => (
              <Table.Tr key={row.id} style={{ cursor: 'pointer' }} onClick={() => openEditor(row)}>
                <Table.Td fw={500}>{row.name}</Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {row.description}
                  </Text>
                </Table.Td>
                <Table.Td>{row.skills}</Table.Td>
                <Table.Td>{row.tools}</Table.Td>
                <Table.Td>
                  <Badge variant="light" color={row.status === 'PUBLISHED' ? 'teal' : 'gray'}>
                    {row.status === 'PUBLISHED' ? '已发布' : '草稿'}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {formatDateTime(row.updatedAt)}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>

      <Drawer
        opened={opened}
        onClose={close}
        position="right"
        size="xl"
        title={editing === null ? '新建智能体' : `编辑：${editing.name}`}
      >
        <Tabs defaultValue="basic">
          <Tabs.List mb="md">
            <Tabs.Tab value="basic">基本信息</Tabs.Tab>
            <Tabs.Tab value="prompt">提示词</Tabs.Tab>
            <Tabs.Tab value="skills">技能</Tabs.Tab>
            <Tabs.Tab value="tools">业务工具</Tabs.Tab>
            <Tabs.Tab value="model">模型</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="basic">
            <Stack>
              <TextInput
                label="名称"
                defaultValue={editing?.name}
                placeholder="例如：生产日报助手"
              />
              <Textarea
                label="说明"
                defaultValue={editing?.description}
                placeholder="一句话描述它能做什么"
                autosize
                minRows={2}
              />
              <Text size="xs" c="dimmed">
                说明会展示给用户，帮他们选对智能体——模型不读它。
              </Text>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="prompt">
            <Stack>
              <Select
                label="提示词模板"
                placeholder="选择一个模板"
                data={PROMPTS.map((p) => ({ value: p.id, label: p.name }))}
                defaultValue={PROMPTS[0]?.id}
              />
              <Card withBorder padding="sm" radius="sm">
                <Text size="xs" c="dimmed" mb={4}>
                  模板预览（变量会在会话创建时替换）
                </Text>
                <Text size="sm" ff="monospace">
                  你是奥力亚制造的{'{'}组织{'}'}助手。当前用户：{'{'}用户名{'}'}。
                  <br />
                  回答时先确认数据来源，涉及产量与工单时必须引用具体单号。
                </Text>
              </Card>
              <Text size="xs" c="dimmed">
                用户不可在线编辑系统提示词——模板在部署期物化进 preset，改动下次会话生效。
              </Text>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="skills">
            <Stack gap="xs">
              {SKILLS.map((skill) => (
                <Checkbox
                  key={skill.id}
                  label={`${skill.name}（${skill.source} ${skill.version}）`}
                  defaultChecked={skill.enabled && skill.usedBy > 0}
                />
              ))}
              <Text size="xs" c="dimmed" mt="sm">
                勾选的技能会进这个智能体的技能目录；未勾选的模型根本看不到。
              </Text>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="tools">
            <Stack gap="xs">
              {TOOLS.map((tool) => (
                <Checkbox
                  key={tool.id}
                  disabled={tool.level === 'DANGEROUS'}
                  defaultChecked={tool.granted}
                  label={
                    <Group gap="xs">
                      <Text size="sm">{tool.name}</Text>
                      <Badge size="xs" variant="light" color={LEVEL_COLOR[tool.level]}>
                        {LEVEL_LABEL[tool.level]}
                      </Badge>
                    </Group>
                  }
                  description={tool.description}
                />
              ))}
              <Text size="xs" c="dimmed" mt="sm">
                危险级工具默认不挂给任何智能体。写操作工具会在业务侧走人工审批。
              </Text>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="model">
            <Stack>
              <Select
                label="默认模型"
                data={[
                  { value: 'deepseek-v4-flash', label: 'deepseek-v4-flash（快）' },
                  { value: 'deepseek-v4-pro', label: 'deepseek-v4-pro（强）' },
                  { value: 'qwen-internal', label: '客户内网模型' },
                ]}
                defaultValue="deepseek-v4-flash"
              />
              <Text size="xs" c="dimmed">
                模型由服务端出口代理，密钥不下发到客户端；用量以出口的记录为准。
              </Text>
            </Stack>
          </Tabs.Panel>
        </Tabs>

        <Group justify="flex-end" mt="xl">
          <Button variant="default" onClick={close}>
            取消
          </Button>
          <Button onClick={close}>保存</Button>
        </Group>
      </Drawer>
    </Stack>
  )
}
