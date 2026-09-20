import { Badge, Button, Card, Group, Stack, Switch, Table, Text, Title } from '@mantine/core'

import { PageHeader } from '@/components/PageHeader'
import { SKILLS } from '@/mock/data'

export function SkillsPage() {
  return (
    <Stack gap="lg">
      <PageHeader
        title="技能"
        description="技能是给模型的 Markdown 指令集，模型按需加载。内置技能随产品发布，自定义技能由实施人员上传。"
        actions={
          <Group>
            <Button variant="default">上传技能</Button>
            <Button>新建技能</Button>
          </Group>
        }
      />

      <Card withBorder padding={0} radius="md">
        <Table highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>名称</Table.Th>
              <Table.Th w={110}>来源</Table.Th>
              <Table.Th w={90}>版本</Table.Th>
              <Table.Th w={140}>被引用</Table.Th>
              <Table.Th w={100}>启用</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {SKILLS.map((skill) => (
              <Table.Tr key={skill.id}>
                <Table.Td fw={500}>{skill.name}</Table.Td>
                <Table.Td>
                  <Badge variant="light" color={skill.source === '内置' ? 'blue' : 'grape'}>
                    {skill.source}
                  </Badge>
                </Table.Td>
                <Table.Td>{skill.version}</Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {skill.usedBy === 0 ? '未被引用' : `${String(skill.usedBy)} 个智能体`}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Switch defaultChecked={skill.enabled} size="sm" />
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>

      <Card withBorder padding="lg" radius="md">
        <Title order={5} mb="xs">
          两条产品约束
        </Title>
        <Stack gap={6}>
          <Text size="sm" c="dimmed">
            ① <b>内置技能随产品升级更新</b>，客户改不了；自定义技能归客户，升级不动。
          </Text>
          <Text size="sm" c="dimmed">
            ② 技能不能"隐藏"，只能不挂给某个智能体。所以"谁能用哪个技能"是通过
            <b>智能体</b>间接授权的。
          </Text>
        </Stack>
      </Card>
    </Stack>
  )
}
