import {
  Badge,
  Button,
  Card,
  Divider,
  Group,
  ScrollArea,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core'

import { PageHeader } from '@/components/PageHeader'
import { USERS } from '@/mock/data'

export function OrgPage() {
  return (
    <Stack gap="lg">
      <PageHeader
        title="组织与人员"
        description="组织树是权限的主体来源。MVP 阶段本地维护，后续从 MOM 平台同步。"
        actions={
          <Group>
            <Button variant="default">同步组织</Button>
            <Button>新增人员</Button>
          </Group>
        }
      />

      <SimpleGrid cols={{ base: 1, md: 4 }} spacing="md">
        <Card withBorder padding="md" radius="md">
          <Title order={6} mb="sm">
            组织树
          </Title>
          <ScrollArea h={420} type="hover">
            <Stack gap={2}>
              <OrgLine label="奥力亚制造" depth={0} bold />
              <OrgLine label="生产部" depth={1} />
              <OrgLine label="一号线" depth={2} active />
              <OrgLine label="二号线" depth={2} />
              <OrgLine label="采购部" depth={1} />
              <OrgLine label="质量部" depth={1} />
              <OrgLine label="设备部" depth={1} />
            </Stack>
          </ScrollArea>
          <Divider my="sm" />
          <Text size="xs" c="dimmed">
            组织层级可以无限嵌套；授权默认向下继承。
          </Text>
        </Card>

        <Card withBorder padding={0} radius="md" style={{ gridColumn: 'span 3' }}>
          <Group p="md" justify="space-between">
            <Text fw={600}>人员</Text>
            <Text size="sm" c="dimmed">
              共 {USERS.length} 人
            </Text>
          </Group>
          <Table highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>姓名</Table.Th>
                <Table.Th>账号</Table.Th>
                <Table.Th>所属组织</Table.Th>
                <Table.Th>角色</Table.Th>
                <Table.Th w={100}>状态</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {USERS.map((user) => (
                <Table.Tr key={user.id}>
                  <Table.Td fw={500}>{user.name}</Table.Td>
                  <Table.Td>
                    <Text size="sm" ff="monospace">
                      {user.account}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {user.org}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4}>
                      {user.roles.map((role) => (
                        <Badge key={role} size="sm" variant="light">
                          {role}
                        </Badge>
                      ))}
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="dot" color={user.status === 'ACTIVE' ? 'teal' : 'gray'}>
                      {user.status === 'ACTIVE' ? '启用' : '停用'}
                    </Badge>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      </SimpleGrid>

      <Card withBorder padding="lg" radius="md">
        <Title order={5} mb="xs">
          为什么 MVP 先自建账号
        </Title>
        <Text size="sm" c="dimmed">
          你们现有 MOM 平台的账号体系（<code>sysr_*</code>）可以复用，但为了不被老系统的 Spring Boot
          2.1 / Shiro 技术栈拖住，MVP 阶段先在新平台自建组织与人员，
          <b>表结构预留同步字段</b>，后续再做单向同步或 SSO 对接。
        </Text>
      </Card>
    </Stack>
  )
}

function OrgLine({
  label,
  depth,
  active,
  bold,
}: {
  label: string
  depth: number
  active?: boolean
  bold?: boolean
}) {
  return (
    <Text
      size="sm"
      fw={bold === true || active === true ? 600 : 400}
      style={{
        paddingLeft: 8 + depth * 16,
        paddingTop: 4,
        paddingBottom: 4,
        borderRadius: 6,
        cursor: 'pointer',
        background: active === true ? 'var(--mantine-color-indigo-light)' : undefined,
      }}
    >
      {label}
    </Text>
  )
}
