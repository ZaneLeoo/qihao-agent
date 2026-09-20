import {
  Badge,
  Button,
  Card,
  Group,
  NumberInput,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
} from '@mantine/core'

import { PageHeader } from '@/components/PageHeader'

export function ModelsPage() {
  return (
    <Stack gap="lg">
      <PageHeader
        title="模型出口"
        description="所有模型调用的唯一出口：密钥、路由、限流、配额拦截都在这里，客户端拿不到密钥。"
        actions={<Button>保存配置</Button>}
      />

      <Card withBorder padding={0} radius="md">
        <Group p="md" justify="space-between">
          <Text fw={600}>路由</Text>
          <Button size="compact-sm" variant="default">
            新增路由
          </Button>
        </Group>
        <Table highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>路由名</Table.Th>
              <Table.Th>类型</Table.Th>
              <Table.Th>模型</Table.Th>
              <Table.Th w={110}>状态</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            <Table.Tr>
              <Table.Td>deepseek-official</Table.Td>
              <Table.Td>
                <Badge variant="light">官方 API</Badge>
              </Table.Td>
              <Table.Td>
                <Text size="sm" ff="monospace">
                  deepseek-v4-flash
                </Text>
              </Table.Td>
              <Table.Td>
                <Switch defaultChecked size="sm" />
              </Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td>customer-vllm</Table.Td>
              <Table.Td>
                <Badge variant="light" color="grape">
                  内网兼容端点
                </Badge>
              </Table.Td>
              <Table.Td>
                <Text size="sm" ff="monospace">
                  qwen-internal
                </Text>
              </Table.Td>
              <Table.Td>
                <Switch size="sm" />
              </Table.Td>
            </Table.Tr>
          </Table.Tbody>
        </Table>
      </Card>

      <Card withBorder padding="lg" radius="md">
        <Text fw={600} mb="sm">
          默认配额
        </Text>
        <Group grow align="flex-start">
          <NumberInput
            label="每用户每月 Token 上限"
            description="超出后拦截；MVP 阶段先只统计不拦"
            defaultValue={5_000_000}
            thousandSeparator=","
          />
          <NumberInput label="单次请求最大输出 Token" defaultValue={8192} thousandSeparator="," />
          <TextInput label="限流" description="每用户每分钟请求数" defaultValue="60" />
        </Group>
      </Card>

      <Card withBorder padding="lg" radius="md">
        <Text size="sm" c="dimmed">
          <b>为什么模型调用必须走服务端出口</b>：① 密钥不下发到客户端或用户配置目录； ②{' '}
          <b>用量天然可信</b>——桌面端/浏览器端的统计不可信，而出口的记录是服务端自己产生的； ③
          配额拦截只有一个地方要做，不会漏。
        </Text>
      </Card>
    </Stack>
  )
}
