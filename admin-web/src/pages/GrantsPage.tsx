import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Divider,
  Group,
  ScrollArea,
  SimpleGrid,
  Stack,
  Text,
  Title,
  Tree,
  useTree,
} from '@mantine/core'
import { IconInfoCircle } from '@tabler/icons-react'
import { useState } from 'react'

import { PageHeader } from '@/components/PageHeader'
import {
  AGENTS,
  LEVEL_COLOR,
  LEVEL_LABEL,
  ORG_LABEL,
  ORG_TREE,
  PROMPTS,
  SKILLS,
  TOOLS,
} from '@/mock/data'

/** 组织 → 资源的授权页：左侧选组织，右侧勾选它能用的资源。 */
export function GrantsPage() {
  const tree = useTree()
  const [selected, setSelected] = useState('o11')

  return (
    <Stack gap="lg">
      <PageHeader
        title="授权"
        description="决定某个组织、角色或具体用户可以使用哪些智能体——技能与提示词随智能体一并授权。"
        actions={<Button>保存授权</Button>}
      />

      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
        <Card withBorder padding="md" radius="md">
          <Title order={6} mb="sm">
            选择主体
          </Title>
          <ScrollArea h={420} type="hover">
            <Tree
              data={ORG_TREE}
              tree={tree}
              renderNode={({ node, expanded, hasChildren, elementProps }) => (
                <Group
                  gap={6}
                  {...elementProps}
                  onClick={() => setSelected(node.value)}
                  style={{
                    cursor: 'pointer',
                    padding: '4px 8px',
                    borderRadius: 6,
                    background:
                      selected === node.value ? 'var(--mantine-color-indigo-light)' : undefined,
                  }}
                >
                  <Text size="sm" fw={selected === node.value ? 600 : 400}>
                    {node.label}
                  </Text>
                  {hasChildren && (
                    <Text size="xs" c="dimmed">
                      {expanded ? '−' : '+'}
                    </Text>
                  )}
                </Group>
              )}
            />
          </ScrollArea>
          <Divider my="sm" />
          <Text size="xs" c="dimmed">
            也可以按<b>角色</b>或<b>具体人员</b>授权。三者同时命中时，拒绝优先。
          </Text>
        </Card>

        <Card withBorder padding="md" radius="md" style={{ gridColumn: 'span 2' }}>
          <Group justify="space-between" mb="sm">
            <Title order={6}>「{ORG_LABEL[selected] ?? selected}」可用的资源</Title>
            <Badge variant="light">继承自上级组织</Badge>
          </Group>

          <ScrollArea h={420} type="hover">
            <Stack gap="lg">
              <Section title="智能体">
                {AGENTS.filter((agent) => agent.status === 'PUBLISHED').map((agent) => (
                  <Checkbox
                    key={agent.id}
                    defaultChecked={selected === '生产部' || agent.id === 'a1'}
                    label={
                      <Group gap="xs">
                        <Text size="sm">{agent.name}</Text>
                        <Text size="xs" c="dimmed">
                          {agent.description}
                        </Text>
                      </Group>
                    }
                  />
                ))}
              </Section>

              <Section title="技能" note="随智能体一并生效；这里只做提示，不单独授权">
                {SKILLS.map((skill) => (
                  <Checkbox
                    key={skill.id}
                    disabled
                    defaultChecked={skill.usedBy > 0}
                    label={`${skill.name}（${skill.version}）`}
                  />
                ))}
              </Section>

              <Section title="提示词模板" note="同上，随智能体生效">
                {PROMPTS.map((prompt) => (
                  <Checkbox
                    key={prompt.id}
                    disabled
                    defaultChecked={prompt.usedBy > 0}
                    label={prompt.name}
                  />
                ))}
              </Section>

              <Section title="业务工具" note="同一个人在不同智能体下可用的工具可以不同">
                {TOOLS.map((tool) => (
                  <Checkbox
                    key={tool.id}
                    disabled={tool.level === 'DANGEROUS'}
                    defaultChecked={tool.granted}
                    label={
                      <Group gap="xs">
                        <Text size="sm" ff="monospace">
                          {tool.name}
                        </Text>
                        <Badge size="xs" variant="light" color={LEVEL_COLOR[tool.level]}>
                          {LEVEL_LABEL[tool.level]}
                        </Badge>
                      </Group>
                    }
                  />
                ))}
              </Section>
            </Stack>
          </ScrollArea>
        </Card>
      </SimpleGrid>

      <Alert
        variant="light"
        color="blue"
        icon={<IconInfoCircle size={16} />}
        title="授权是怎么生效的"
      >
        <Stack gap={4}>
          <Text size="sm">
            ① <b>物化</b>：保存后，系统按这份授权为该组织的用户生成专属配置目录—— 目录里<b>只有</b>
            被勾选的智能体，没勾的根本不存在。
          </Text>
          <Text size="sm">
            ② <b>白名单</b>
            ：智能体启动时，工具清单被锁定在勾选范围内，模型看不见也调不到未授权的工具。
          </Text>
          <Text size="sm">
            ③ <b>业务侧</b>：真正查数据时，请求带着该用户的令牌，由业务系统的行级权限做最终裁决。
          </Text>
        </Stack>
      </Alert>
    </Stack>
  )
}

function Section({
  title,
  note,
  children,
}: {
  title: string
  note?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <Group gap="xs" mb={6}>
        <Text fw={600} size="sm">
          {title}
        </Text>
        {note !== undefined && (
          <Text size="xs" c="dimmed">
            {note}
          </Text>
        )}
      </Group>
      <Stack gap={6}>{children}</Stack>
    </div>
  )
}
