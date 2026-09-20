import { AppShell, Badge, Box, Group, NavLink, ScrollArea, Stack, Text } from '@mantine/core'
import {
  IconActivity,
  IconBook,
  IconBuilding,
  IconChartBar,
  IconDatabase,
  IconFileSearch,
  IconLayoutDashboard,
  IconMessages,
  IconPlugConnected,
  IconPrompt,
  IconRobot,
  IconServer,
  IconShieldLock,
} from '@tabler/icons-react'
import type { Icon } from '@tabler/icons-react'
import { Link, Outlet, useLocation } from 'react-router-dom'

import styles from './AppLayout.module.css'

interface NavItem {
  to: string
  label: string
  icon: Icon
}

interface NavSection {
  label: string | null
  items: NavItem[]
}

/** 信息架构：按"配置 → 权限 → 知识 → 运营 → 系统"分组。 */
const NAV: NavSection[] = [
  {
    label: null,
    items: [{ to: '/', label: '概览', icon: IconLayoutDashboard }],
  },
  {
    label: '智能体配置',
    items: [
      { to: '/agents', label: '智能体', icon: IconRobot },
      { to: '/skills', label: '技能', icon: IconBook },
      { to: '/prompts', label: '提示词模板', icon: IconPrompt },
      { to: '/tools', label: '业务工具', icon: IconPlugConnected },
    ],
  },
  {
    label: '权限',
    items: [
      { to: '/grants', label: '授权', icon: IconShieldLock },
      { to: '/org', label: '组织与人员', icon: IconBuilding },
    ],
  },
  {
    label: '知识',
    items: [{ to: '/knowledge', label: '知识库', icon: IconDatabase }],
  },
  {
    label: '运营',
    items: [
      { to: '/conversations', label: '会话', icon: IconMessages },
      { to: '/usage', label: '用量', icon: IconChartBar },
      { to: '/audit', label: '审计', icon: IconFileSearch },
    ],
  },
  {
    label: '系统',
    items: [
      { to: '/runtime', label: '运行时', icon: IconServer },
      { to: '/models', label: '模型出口', icon: IconActivity },
    ],
  },
]

export function AppLayout() {
  const { pathname } = useLocation()

  return (
    <AppShell header={{ height: 56 }} navbar={{ width: 236, breakpoint: 'sm' }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="xs">
            <Text fw={700} className={styles.brand}>
              企业 Agent 平台
            </Text>
            <Badge variant="light" size="sm">
              原型
            </Badge>
          </Group>
          <Text size="sm" c="dimmed">
            管理员 · 林志豪
          </Text>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="xs">
        <ScrollArea type="hover" style={{ flex: 1 }}>
          <Stack gap={2}>
            {NAV.map((section, index) => (
              <Box key={section.label ?? `section-${String(index)}`}>
                {section.label !== null && (
                  <Text size="xs" c="dimmed" fw={600} px="sm" pt="md" pb={4}>
                    {section.label}
                  </Text>
                )}
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    component={Link}
                    to={item.to}
                    label={item.label}
                    leftSection={<item.icon size={16} stroke={1.6} />}
                    active={pathname === item.to}
                    className={styles.navLink}
                  />
                ))}
              </Box>
            ))}
          </Stack>
        </ScrollArea>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  )
}
