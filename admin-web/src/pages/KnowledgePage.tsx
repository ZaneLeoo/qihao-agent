import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core'
import { IconInfoCircle } from '@tabler/icons-react'

import { PageHeader } from '@/components/PageHeader'

const DOCS = [
  { id: 'd1', name: '设备点检规范 v2.0.pdf', size: '2.4 MB', chunks: 186, status: '已索引' },
  { id: 'd2', name: 'MES 操作手册.docx', size: '8.1 MB', chunks: 542, status: '已索引' },
  { id: 'd3', name: '安全操作规程.pdf', size: '1.1 MB', chunks: 74, status: '索引中' },
  { id: 'd4', name: '工艺卡片汇总.xlsx', size: '3.7 MB', chunks: 0, status: '待处理' },
]

export function KnowledgePage() {
  return (
    <Stack gap="lg">
      <PageHeader
        title="知识库"
        description="自建 RAG：文档解析 → 切分 → 向量化 → 混合检索 → 按权限过滤后返回带引用的片段。"
        actions={<Button>上传文档</Button>}
      />

      <Alert variant="light" color="orange" icon={<IconInfoCircle size={16} />} title="本页排在 P2">
        <Text size="sm">
          MVP 阶段不建知识库。先用"把 FAQ 与制度文档做成技能"顶住最常见的问答需求， P2
          再上真正的检索。这一页先把要做的形态占位。
        </Text>
      </Alert>

      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        <Stat label="文档数" value="4" />
        <Stat label="切片数" value="802" />
        <Stat label="最近更新" value="2026-09-19" />
      </SimpleGrid>

      <Card withBorder padding={0} radius="md">
        <Table highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>文档</Table.Th>
              <Table.Th w={110}>大小</Table.Th>
              <Table.Th w={110}>切片</Table.Th>
              <Table.Th w={110}>状态</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {DOCS.map((doc) => (
              <Table.Tr key={doc.id}>
                <Table.Td>{doc.name}</Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {doc.size}
                  </Text>
                </Table.Td>
                <Table.Td>{doc.chunks}</Table.Td>
                <Table.Td>
                  <Badge
                    variant="light"
                    color={
                      doc.status === '已索引' ? 'teal' : doc.status === '索引中' ? 'blue' : 'gray'
                    }
                  >
                    {doc.status}
                  </Badge>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>

      <Card withBorder padding="lg" radius="md">
        <Title order={5} mb="xs">
          三个已经定下来的设计点
        </Title>
        <Stack gap={6}>
          <Text size="sm" c="dimmed">
            ① <b>权限在检索时过滤，不是检索后过滤</b>——否则 topK 被污染，召回直接崩。 身份来自 MCP
            请求头里的用户令牌。
          </Text>
          <Text size="sm" c="dimmed">
            ② <b>切分按标题层级</b>，制度与工艺文件都有层级结构，定长切会把上下文切碎。
          </Text>
          <Text size="sm" c="dimmed">
            ③ <b>返回必须带引用</b>（文档 + 节/页），界面上才能"点引用跳原文"。
          </Text>
        </Stack>
      </Card>
    </Stack>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card withBorder padding="lg" radius="md">
      <Group justify="space-between">
        <Text size="xs" c="dimmed">
          {label}
        </Text>
      </Group>
      <Text fw={700} fz={22} mt={4}>
        {value}
      </Text>
    </Card>
  )
}
