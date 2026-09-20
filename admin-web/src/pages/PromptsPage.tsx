import {
  Badge,
  Button,
  Card,
  Code,
  Group,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core'

import { PageHeader } from '@/components/PageHeader'
import { PROMPTS } from '@/mock/data'
import { formatDateTime } from '@/utils/datetime'

export function PromptsPage() {
  return (
    <Stack gap="lg">
      <PageHeader
        title="提示词模板"
        description="模板是智能体系统提示词的来源。变量在会话创建时由运行时替换成真实值。"
        actions={<Button>新建模板</Button>}
      />

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
        <Card withBorder padding={0} radius="md">
          <Table highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>名称</Table.Th>
                <Table.Th>变量</Table.Th>
                <Table.Th w={80}>引用</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {PROMPTS.map((prompt) => (
                <Table.Tr key={prompt.id}>
                  <Table.Td>
                    <Text fw={500}>{prompt.name}</Text>
                    <Text size="xs" c="dimmed">
                      {formatDateTime(prompt.updatedAt)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4}>
                      {prompt.variables.map((variable) => (
                        <Badge key={variable} size="sm" variant="light">
                          {variable}
                        </Badge>
                      ))}
                    </Group>
                  </Table.Td>
                  <Table.Td>{prompt.usedBy}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>

        <Card withBorder padding="lg" radius="md">
          <Title order={5} mb="xs">
            编辑与预览
          </Title>
          <Stack>
            <TextInput label="模板名称" defaultValue="生产日报模板" />
            <Textarea
              label="模板内容"
              autosize
              minRows={6}
              defaultValue={
                '你是奥力亚制造的{{组织}}生产助手。\n当前用户：{{用户名}}，日期：{{日期}}。\n回答时先确认数据来源，涉及产量与工单时必须引用具体单号。'
              }
            />
            <div>
              <Text size="xs" c="dimmed" mb={4}>
                渲染结果（变量已替换）
              </Text>
              <Card withBorder padding="sm" radius="sm" bg="var(--mantine-color-gray-0)">
                <Code block style={{ background: 'transparent' }}>
                  你是奥力亚制造的生产部生产助手。 当前用户：张三，日期：2026-09-20。
                  回答时先确认数据来源，涉及产量与工单时必须引用具体单号。
                </Code>
              </Card>
            </div>
          </Stack>
        </Card>
      </SimpleGrid>

      <Card withBorder padding="lg" radius="md">
        <Title order={5} mb="xs">
          为什么不做成"用户可在线编辑"
        </Title>
        <Text size="sm" c="dimmed">
          DSH 没有面向终端用户的提示词编辑接口，系统提示词是部署期配置。这里的编辑动作，实际是
          <b>修改模板 → 重新物化到该用户实例的 preset</b>，改动在下次会话生效。这样也保证了
          提示词前缀稳定，不会破坏模型的缓存命中。
        </Text>
      </Card>
    </Stack>
  )
}
